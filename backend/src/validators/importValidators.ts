import { z } from 'zod';

export const materialImportSchema = z.object({
  type: z.literal('url').or(z.literal('URL')),
  title: z.string().min(1, 'Material title is required').max(150),
  url: z.string().url('Must be a valid HTTP or HTTPS URL')
});

export const topicImportSchema = z.object({
  title: z.string().min(1, 'Topic title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  materials: z.array(materialImportSchema).max(50, 'Maximum 50 materials per topic').optional().default([])
});

export const unitItemImportSchema = z.object({
  name: z.string().min(1, 'Unit name is required').max(150),
  topics: z.array(topicImportSchema).max(100, 'Maximum 100 topics per unit').min(1, 'Each unit must contain at least 1 topic')
});

export const fullSubjectImportSchema = z.object({
  type: z.literal('subject'),
  subject: z.object({
    name: z.string().min(1, 'Subject name is required').max(100),
    description: z.string().max(500).optional().default(''),
    color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color').optional().default('#3B82F6'),
    icon: z.string().optional().default('BookOpen')
  }),
  units: z.array(unitItemImportSchema).max(30, 'Maximum 30 units per subject').min(1, 'Subject must contain at least 1 unit')
});

export const singleUnitImportSchema = z.object({
  type: z.literal('unit'),
  unit: z.object({
    name: z.string().min(1, 'Unit name is required').max(150),
    topics: z.array(topicImportSchema).max(100, 'Maximum 100 topics per unit').min(1, 'Unit must contain at least 1 topic')
  })
});
