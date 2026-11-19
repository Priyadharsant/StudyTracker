const axios = require('axios');
const API = 'http://localhost:5000/api';

async function testNewFeatures() {
  console.log('=== Testing Google Drive Storage, Add-Topic-Material & AI JSON Importer ===');

  // 1. Auth setup
  const email = `test_importer_${Date.now()}@university.edu`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Importer Tester',
    email,
    password: 'securePassword123'
  });
  const token = regRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✔ [1/6] Registered test user:', email);

  // 2. Create base subject & unit
  const subRes = await axios.post(`${API}/subjects`, {
    name: 'Operating Systems & Kernels',
    description: 'Processes, threads, synchronization, memory management',
    color: '#10B981',
    icon: 'Cpu'
  }, { headers: authHeaders });
  const subjectId = subRes.data.subject._id;

  const unitRes = await axios.post(`${API}/subjects/${subjectId}/units`, {
    name: 'Unit 1: Concurrency and Mutexes',
    description: 'Race conditions and critical sections'
  }, { headers: authHeaders });
  const unitId = unitRes.data.unit._id;
  console.log('✔ [2/6] Base Subject & Unit created:', subjectId, unitId);

  // 3. Test Feature: Add Topic with material URL & Title in single action
  const topicWithMaterialRes = await axios.post(`${API}/units/${unitId}/topics`, {
    title: 'Dekker and Peterson Algorithms',
    description: 'Mutual exclusion without hardware primitives',
    priority: 'high',
    materialUrl: 'https://en.wikipedia.org/wiki/Peterson%27s_algorithm',
    materialTitle: 'Wikipedia Peterson Algorithm Reference'
  }, { headers: authHeaders });

  console.log('✔ [3/6] Topic with attached material created:', topicWithMaterialRes.data.topic.title, 'Material Count:', topicWithMaterialRes.data.topic.materialCount);
  if (topicWithMaterialRes.data.topic.materialCount !== 1) {
    throw new Error('Expected topic materialCount to be 1');
  }

  // Check material was created in database
  const materialsRes = await axios.get(`${API}/topics/${topicWithMaterialRes.data.topic._id}/materials`, { headers: authHeaders });
  console.log('✔ [3/6] Attached material verified in DB:', materialsRes.data.materials[0].title, materialsRes.data.materials[0].url);

  // 4. Test Feature: JSON Importer Validation Endpoint
  const fullSubjectPayload = {
    type: 'subject',
    subject: {
      name: 'Compiler Design & Automata',
      description: 'Lexical analysis, LR/LL parsers, syntax-directed translation',
      color: '#8B5CF6',
      icon: 'Code'
    },
    units: [
      {
        name: 'Unit 1: Lexical Analysis',
        topics: [
          {
            title: 'Finite Automata & Regular Expressions',
            description: 'DFA, NFA and Thompson Construction',
            materials: [
              {
                type: 'url',
                title: 'Lex & Flex Tutorial',
                url: 'https://westes.github.io/flex/manual/'
              }
            ]
          }
        ]
      }
    ]
  };

  const validateSubjectRes = await axios.post(`${API}/import/validate`, fullSubjectPayload, { headers: authHeaders });
  console.log('✔ [4/6] Import Validate Endpoint OK:', validateSubjectRes.data.valid, 'Total Units:', validateSubjectRes.data.summary.totalUnits);

  // 5. Test Feature: Import Full Subject
  const importSubjectRes = await axios.post(`${API}/import/subject`, fullSubjectPayload, { headers: authHeaders });
  const importedSubId = importSubjectRes.data.subject._id;
  console.log('✔ [5/6] Full Subject Imported via JSON:', importSubjectRes.data.subject.name, 'ID:', importedSubId);

  // Verify units & topics under imported subject
  const importedUnitsRes = await axios.get(`${API}/subjects/${importedSubId}/units`, { headers: authHeaders });
  console.log('✔ [5/6] Imported Units Count:', importedUnitsRes.data.units.length, 'Topic title:', importedUnitsRes.data.units[0].topics[0].title);

  // 6. Test Feature: Import Single Unit to Existing Subject
  const singleUnitPayload = {
    type: 'unit',
    destinationSubjectId: subjectId,
    unit: {
      name: 'Unit 2: Virtual Memory & Page Replacement',
      topics: [
        {
          title: 'LRU & Clock Page Replacement Algorithms',
          description: 'Belady anomaly and thrashing mitigation',
          materials: [
            {
              type: 'url',
              title: 'Virtual Memory Lecture Notes',
              url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf'
            }
          ]
        }
      ]
    }
  };

  const importUnitRes = await axios.post(`${API}/import/unit`, singleUnitPayload, { headers: authHeaders });
  console.log('✔ [6/6] Single Unit Imported via JSON:', importUnitRes.data.unit.name);

  // Verify updated units list
  const updatedUnitsRes = await axios.get(`${API}/subjects/${subjectId}/units`, { headers: authHeaders });
  console.log('✔ [6/6] Subject now has units count:', updatedUnitsRes.data.units.length);

  console.log('\n🌟 ALL NEW FEATURES TESTED AND PASSED SUCCESSFULLY! 🌟');
}

testNewFeatures().catch(err => {
  console.error('Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
