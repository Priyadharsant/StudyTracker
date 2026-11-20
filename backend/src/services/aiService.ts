import { Groq } from 'groq-sdk';
import { config } from '../config/env';
import {
  fullSubjectImportSchema,
  singleUnitImportSchema
} from '../validators/importValidators';
import { z } from 'zod';

// Initialize Groq client lazily
let groqClientInstance: Groq | null = null;
function getGroqClient(): Groq {
  const apiKey = config.groqApiKey;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment variables.');
  }
  if (!groqClientInstance) {
    groqClientInstance = new Groq({ apiKey });
  }
  return groqClientInstance;
}

export interface GenerateChecklistParams {
  mode: 'subject' | 'unit';
  content: string;
  subjectName?: string;
  unitName?: string;
}

// In-memory simple cache for deduplicating repeated identical requests
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getCacheKey(params: GenerateChecklistParams): string {
  return `${params.mode}:${params.subjectName || ''}:${params.unitName || ''}:${params.content.trim()}`;
}

// In-memory rate limiting map per user
interface RateLimitTracker {
  count: number;
  resetAt: number;
}
const userLimits = new Map<string, RateLimitTracker>();
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per 15 minutes per user
const WINDOW_MS = 15 * 60 * 1000;

export function checkUserRateLimit(userId: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  let tracker = userLimits.get(userId);

  if (!tracker || now > tracker.resetAt) {
    tracker = { count: 0, resetAt: now + WINDOW_MS };
    userLimits.set(userId, tracker);
  }

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - tracker.count);
  const resetInSec = Math.ceil((tracker.resetAt - now) / 1000);

  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSec };
  }

  tracker.count++;
  return { allowed: true, remaining: remaining - 1, resetInSec };
}

export async function generateChecklistWithGroq(params: GenerateChecklistParams): Promise<any> {
  const { mode, content, subjectName, unitName } = params;

  // Check cache
  const cacheKey = getCacheKey(params);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const groq = getGroqClient();

  // Primary model and fallback cascade (3 fallback models when rate limits/quotas or issues occur)
  const primaryModel = config.groqModel || 'openai/gpt-oss-120b';
  const fallbackModels = config.groqFallbackModels && config.groqFallbackModels.length > 0
    ? config.groqFallbackModels
    : ['openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'qwen/qwen3.8-27b'];

  const modelQueue = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];

  let systemPrompt = '';
  let userPrompt = '';

  if (mode === 'subject') {
    systemPrompt = `You are an expert curriculum and syllabus parser for StudyTrack.
Your job is to parse the user's syllabus, lecture notes, or rough chat messages into a structured JSON checklist.
You must return ONLY a single valid JSON object, without markdown formatting or code fences.

JSON Schema to follow:
{
  "type": "subject",
  "subject": {
    "name": "Subject Name",
    "description": "Concise subject overview",
    "color": "#3B82F6",
    "icon": "BookOpen"
  },
  "units": [
    {
      "name": "Unit 1: Unit Name",
      "topics": [
        {
          "title": "Topic Title",
          "description": "Concise summary or learning goals",
          "materials": []
        }
      ]
    }
  ]
}

STRICT INSTRUCTIONS FOR UNIT MERGING & CHAT CLEANING:
1. "type" MUST be exactly "subject".
2. Subject detection: Auto-detect or use the subject title override.
3. Chat noise removal: Clean out timestamps (e.g. "[11/18, 10:21 PM]"), usernames/sender tags (e.g. "Manoj Mama:", "Pon Samuel:").
4. CRITICAL DUPLICATE & FRAGMENTED UNIT MERGING:
   - In informal chats or notes, the same unit may appear in multiple messages with overlapping or newly added topics (e.g., message 1 mentions "Unit 2: HDLC, Sliding window, Problems" and message 2 also mentions "Unit 2: Point to point, Sliding window").
   - You MUST merge all occurrences of the same unit number into ONE single consolidated unit.
   - Combine all unique topics and questions belonging to that unit under that single unit. Do NOT create duplicate unit objects for the same unit number!
   - Remove verbatim duplicate topics within the merged unit, but retain all distinct topics and sub-questions.
5. Unit ordering: Ensure units are arranged in clean numerical order (Unit 1, Unit 2, Unit 3, Unit 4, Unit 5...) regardless of which order they appeared in the pasted text.
6. "materials": MUST ALWAYS BE AN EMPTY ARRAY [] FOR EVERY TOPIC.
7. Return strictly pure JSON without markdown codeblocks or commentary.`;

    userPrompt = `Please parse and merge the following syllabus/chat notes into the StudyTrack subject checklist schema in JSON format:
${subjectName ? `Subject Title Override: ${subjectName}\n` : ''}
--- SYLLABUS CONTENT ---
${content}`;
  } else {
    // Mode: unit
    systemPrompt = `You are a curriculum and syllabus parser for StudyTrack.
Your job is to parse unit syllabus, questions, or notes into a structured single-unit JSON checklist.
You must return ONLY a single valid JSON object, without markdown formatting or code fences.

JSON Schema to follow:
{
  "type": "unit",
  "unit": {
    "name": "Unit Name",
    "topics": [
      {
        "title": "Topic Title",
        "description": "Concise summary or learning goals",
        "materials": []
      }
    ]
  }
}

STRICT INSTRUCTIONS:
1. "type" MUST be exactly "unit".
2. "unit.name": Use the target unit name provided or extract the unit title from the text.
3. Clean out timestamps and chat sender names.
4. If multiple fragments of this unit appear in the text, merge all unique topics into this single unit without duplicate topics.
5. "materials": MUST ALWAYS BE AN EMPTY ARRAY [] FOR EVERY TOPIC.
6. Return strictly pure JSON without markdown codeblocks or commentary.`;

    userPrompt = `Please parse the following content into a single unit checklist in JSON format:
${subjectName ? `Subject Name: ${subjectName}\n` : ''}
${unitName ? `Target Unit Name: ${unitName}\n` : ''}
--- UNIT CONTENT ---
${content}`;
  }

  let completionText = '';
  let lastError: any = null;
  let successfulModel = '';

  // Attempt generation with primary model, cascading to fallback models if rate limits / errors occur
  for (let idx = 0; idx < modelQueue.length; idx++) {
    const currentModel = modelQueue[idx];
    try {
      console.log(`[AI Generation] Attempting generation with model: ${currentModel} (attempt ${idx + 1}/${modelQueue.length})`);
      const response = await groq.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      completionText = response.choices[0]?.message?.content || '';
      if (completionText.trim()) {
        successfulModel = currentModel;
        console.log(`[AI Generation] Success with model: ${currentModel}`);
        break; // Successfully got a response
      }
    } catch (apiErr: any) {
      lastError = apiErr;
      const isRateOrLimit =
        apiErr?.status === 429 ||
        apiErr?.message?.includes('rate limit') ||
        apiErr?.message?.includes('quota') ||
        apiErr?.status === 403 ||
        apiErr?.message?.includes('blocked at the project level') ||
        apiErr?.status === 503 ||
        apiErr?.status === 500;

      console.warn(`[AI Generation] Model ${currentModel} failed (${apiErr?.status || 'unknown'}): ${apiErr?.message}. Checking fallback options...`);

      // If we have fallback models left and the error is rate limit, quota, server error or model unavailable, try next fallback
      if (idx < modelQueue.length - 1 && isRateOrLimit) {
        console.log(`[AI Generation] Falling back to model: ${modelQueue[idx + 1]}`);
        continue;
      } else if (!isRateOrLimit) {
        // Break early if client error like invalid API key
        break;
      }
    }
  }

  if (!completionText.trim()) {
    console.error('All models failed. Last error:', lastError?.message || lastError);
    if (lastError?.status === 429 || lastError?.message?.includes('rate limit') || lastError?.message?.includes('quota')) {
      const error = new Error('Groq AI rate limit or free-plan quota exceeded across models. Please wait a moment and try again.');
      (error as any).statusCode = 429;
      throw error;
    }
    if (lastError?.status === 403 || lastError?.message?.includes('blocked at the project level')) {
      const error = new Error(`The requested models are restricted in your Groq project. Please enable them in your Groq dashboard at https://console.groq.com/settings/project/limits.`);
      (error as any).statusCode = 403;
      throw error;
    }
    if (lastError?.status === 401 || lastError?.message?.includes('API key')) {
      const error = new Error('Invalid or unconfigured Groq API key.');
      (error as any).statusCode = 500;
      throw error;
    }
    const error = new Error(lastError?.message || 'Failed to generate checklist with Groq AI service.');
    (error as any).statusCode = lastError?.status || 502;
    throw error;
  }

  // Parse JSON safely
  let rawJson: any;
  try {
    const cleaned = completionText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    rawJson = JSON.parse(cleaned);
  } catch (parseErr) {
    const error = new Error('AI returned non-JSON or malformed output. Please try regenerating.');
    (error as any).statusCode = 502;
    throw error;
  }

  // Force materials to be empty array on every topic per user requirement
  // and defensively consolidate any duplicate unit names/numbers in the array
  if (rawJson && Array.isArray(rawJson.units)) {
    const consolidatedUnitsMap = new Map<string, any>();

    rawJson.units.forEach((u: any) => {
      if (!u || !u.name) return;
      // Extract normalized unit key: e.g. "Unit 2" from "Unit 2: Data Link Layer"
      const match = u.name.match(/Unit\s*[-–—:]*\s*(\d+)/i);
      const unitKey = match ? `unit_${match[1]}` : u.name.toLowerCase().trim();

      if (!consolidatedUnitsMap.has(unitKey)) {
        consolidatedUnitsMap.set(unitKey, {
          name: u.name,
          topics: []
        });
      }

      const existingUnit = consolidatedUnitsMap.get(unitKey);
      if (Array.isArray(u.topics)) {
        u.topics.forEach((t: any) => {
          if (!t || !t.title) return;
          // Avoid duplicate topic titles within the same unit
          const exists = existingUnit.topics.some(
            (et: any) => et.title.toLowerCase().trim() === t.title.toLowerCase().trim()
          );
          if (!exists) {
            existingUnit.topics.push({
              title: t.title.trim(),
              description: t.description || '',
              materials: []
            });
          }
        });
      }
    });

    rawJson.units = Array.from(consolidatedUnitsMap.values());
  } else if (rawJson && rawJson.unit && Array.isArray(rawJson.unit.topics)) {
    const uniqueTopics: any[] = [];
    rawJson.unit.topics.forEach((t: any) => {
      if (!t || !t.title) return;
      const exists = uniqueTopics.some(
        (ut) => ut.title.toLowerCase().trim() === t.title.toLowerCase().trim()
      );
      if (!exists) {
        uniqueTopics.push({
          title: t.title.trim(),
          description: t.description || '',
          materials: []
        });
      }
    });
    rawJson.unit.topics = uniqueTopics;
  }

  // Validate with Zod based on mode
  if (mode === 'subject') {
    const validation = fullSubjectImportSchema.safeParse(rawJson);
    if (!validation.success) {
      console.warn('AI validation issues:', validation.error.issues);
      if (rawJson.subject && rawJson.units && rawJson.type !== 'subject') {
        rawJson.type = 'subject';
      }
      const retryValidation = fullSubjectImportSchema.safeParse(rawJson);
      if (!retryValidation.success) {
        const error = new Error('AI generated content does not match the required Subject schema: ' + retryValidation.error.issues.map(i => i.message).join(', '));
        (error as any).statusCode = 422;
        (error as any).validationErrors = retryValidation.error.issues;
        throw error;
      }
      rawJson = retryValidation.data;
    } else {
      rawJson = validation.data;
    }
  } else {
    // Mode: unit
    const validation = singleUnitImportSchema.safeParse(rawJson);
    if (!validation.success) {
      console.warn('AI unit validation issues:', validation.error.issues);
      if (rawJson.unit && rawJson.type !== 'unit') {
        rawJson.type = 'unit';
      }
      const retryValidation = singleUnitImportSchema.safeParse(rawJson);
      if (!retryValidation.success) {
        const error = new Error('AI generated content does not match the required Unit schema: ' + retryValidation.error.issues.map(i => i.message).join(', '));
        (error as any).statusCode = 422;
        (error as any).validationErrors = retryValidation.error.issues;
        throw error;
      }
      rawJson = retryValidation.data;
    } else {
      rawJson = validation.data;
    }
  }

  // Cache successful result
  cache.set(cacheKey, { data: rawJson, timestamp: Date.now() });

  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  return rawJson;
}

export interface SmartSearchParams {
  query: string;
  items: Array<{
    id: string;
    type: 'topic' | 'subject' | 'unit' | 'note';
    title: string;
    description?: string;
    subjectName?: string;
    unitName?: string;
    completed?: boolean;
  }>;
}

export async function generateNotesWithGroq(params: {
  topicTitle: string;
  preset: '16-mark' | '8-mark' | '2-mark' | 'custom';
  specification?: string;
  sourceText?: string;
}): Promise<{ htmlContent: string; summary: string }> {
  const { topicTitle, preset, specification, sourceText } = params;

  const groq = getGroqClient();
  const primaryModel = config.groqModel || 'openai/gpt-oss-120b';
  const fallbackModels = config.groqFallbackModels && config.groqFallbackModels.length > 0
    ? config.groqFallbackModels
    : ['openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'qwen/qwen3.8-27b'];
  const modelQueue = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];

  const systemPrompt = `You are an elite academic professor, exam evaluator, and note synthesizer for college engineering and university exams.
Your task is to take a topic title, exam format specifications, and optional raw unformatted text (which may contain messy ChatGPT conversations, web clippings, or student drafts), and generate PERFECT, high-scoring exam revision notes.

CRITICAL RULES:
1. OUTPUT FORMAT: Return clean, semantic HTML suitable for direct insertion into a TipTap rich-text editor (use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <pre>). Do NOT wrap in <html>, <body>, or markdown codeblocks like \`\`\`html.
2. CLEAN ALL NOISE: If source text is provided, strip away all conversational fluff, introductions (e.g., "Sure! Here is...", "As an AI..."), disclaimers, or chat artifacts. Extract only the factual, technical core.
3. PRESET GUIDELINES:
   - "16-mark": Must be comprehensive, deeply structured with clear exam-oriented subheadings:
     * <h2>Introduction & Definition</h2> (crisp high-scoring formal definition)
     * <h2>Core Architecture / Working Principle</h2> (detailed mechanism; describe diagram workflows clearly using structured steps or ASCII block flow)
     * <h2>Key Subtopics & Technical Concepts</h2> (exhaustively explain every relevant subtopic)
     * <h2>Algorithms / Mathematical Formulations / Code / Protocols</h2> (step-by-step mathematical derivation, formula definitions with parameter explanations, or clean code/protocol flow if applicable)
     * <h2>Key Advantages & Disadvantages / Comparisons</h2> (tabular or bulleted comparative breakdown)
     * <h2>University Exam Key Takeaways / Common Pitfalls</h2>
   - "8-mark": Focused, structured, balanced. Crisp definitions, working mechanism, core bullet points, and key formulas/protocols.
   - "2-mark": Crisp, high-yield answer. Exactly 1-2 sentence formal definition, key formula/rule, and 2-3 essential keywords or examples needed to score full 2 marks.
   - "custom": Follow whatever specific guidelines the user supplied in their specification prompt.
4. INCORPORATE SPECIFICATIONS: If the user provides additional specifications (e.g. "include specific subtopics X, Y, Z", "highlight formulas", "explain for Anna University"), strictly address every requested subtopic in clear designated sections.
5. NO HALLUCINATION OF IRRELEVANT FILLER: Maintain high academic rigor and technical depth.`;

  const userPrompt = `TOPIC: "${topicTitle}"
PRESET: ${preset}
${specification ? `USER CUSTOM SPECIFICATION: "${specification}"` : ''}
${sourceText && sourceText.trim() ? `RAW SOURCE TEXT / NOTES (Clean the noise and restructure):
"""
${sourceText.trim().slice(0, 30000)}
"""` : 'No raw text provided. Generate comprehensive, authoritative revision notes from scratch based on the topic and specifications.'}

Now generate the complete, pristine exam revision notes in semantic HTML.`;

  let htmlContent = '';
  for (let idx = 0; idx < modelQueue.length; idx++) {
    const currentModel = modelQueue[idx];
    try {
      const response = await groq.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4096
      });
      const raw = response.choices[0]?.message?.content || '';
      if (raw.trim()) {
        htmlContent = raw.trim()
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '');
        break;
      }
    } catch (err: any) {
      console.warn(`[AI Notes] Model ${currentModel} failed: ${err.message}. Trying next fallback...`);
    }
  }

  if (!htmlContent.trim()) {
    throw new Error('Failed to generate revision notes using all available AI models. Please try again.');
  }

  return {
    htmlContent,
    summary: `Generated ${preset} exam notes for "${topicTitle}".`
  };
}

export async function smartSearchWithGroq(params: SmartSearchParams): Promise<{
  aiSummary: string;
  relevantItemIds: string[];
  suggestedAction?: string;
}> {
  const { query, items } = params;
  if (!items || items.length === 0) {
    return {
      aiSummary: `No matching study items found for "${query}". Try searching for other concepts or topics.`,
      relevantItemIds: []
    };
  }

  const groq = getGroqClient();
  const primaryModel = config.groqModel || 'openai/gpt-oss-120b';
  const fallbackModels = config.groqFallbackModels && config.groqFallbackModels.length > 0
    ? config.groqFallbackModels
    : ['openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'qwen/qwen3.8-27b'];
  const modelQueue = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];

  const contextItems = items.slice(0, 40).map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    context: `${item.subjectName ? `Subject: ${item.subjectName}` : ''}${item.unitName ? `, Unit: ${item.unitName}` : ''}${item.description ? ` - ${item.description.slice(0, 150)}` : ''}`,
    status: item.completed ? 'completed' : 'pending'
  }));

  const systemPrompt = `You are a smart semantic search assistant for StudyTrack.
Analyze the user's natural query and rank the most semantically relevant items from their syllabus, topics, and revision notes.
Return ONLY valid JSON matching this schema:
{
  "aiSummary": "1-2 sentence direct insight answering the user's question or connecting the search query to their study materials",
  "relevantItemIds": ["id1", "id2"],
  "suggestedAction": "brief tip on what topic to study or revise next"
}
Only choose IDs that exist in the provided candidates list. Order relevantItemIds by highest semantic relevance.`;

  const userPrompt = `User Search Query: "${query}"

Available Study Materials Candidates (JSON):
${JSON.stringify(contextItems, null, 2)}`;

  let completionText = '';
  for (let idx = 0; idx < modelQueue.length; idx++) {
    const currentModel = modelQueue[idx];
    try {
      const response = await groq.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
      completionText = response.choices[0]?.message?.content || '';
      if (completionText.trim()) break;
    } catch (err: any) {
      console.warn(`[Smart Search] Model ${currentModel} failed: ${err.message}. Trying next fallback...`);
    }
  }

  if (!completionText.trim()) {
    return {
      aiSummary: `Showing direct keyword matches for "${query}".`,
      relevantItemIds: items.slice(0, 10).map(i => i.id)
    };
  }

  try {
    const cleaned = completionText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      aiSummary: parsed.aiSummary || `Search analysis for "${query}"`,
      relevantItemIds: Array.isArray(parsed.relevantItemIds) ? parsed.relevantItemIds : items.map(i => i.id),
      suggestedAction: parsed.suggestedAction || undefined
    };
  } catch {
    return {
      aiSummary: `Showing matches for "${query}".`,
      relevantItemIds: items.slice(0, 10).map(i => i.id)
    };
  }
}

