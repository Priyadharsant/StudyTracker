import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100),
  description: z.string().max(500).optional().default(''),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color').optional().default('#3B82F6'),
  icon: z.string().optional().default('BookOpen')
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).optional(),
  icon: z.string().optional()
});

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required').max(150),
  description: z.string().max(1000).optional().default('')
});

export const updateUnitSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional()
});

export const createTopicSchema = z.object({
  title: z.string().min(1, 'Topic title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  deadline: z.string().datetime().nullable().optional(),
  materialUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  materialTitle: z.string().max(150).optional().default('')
});

export const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional()
});

export const createMaterialUrlSchema = z.object({
  title: z.string().min(1, 'Material title is required').max(150),
  description: z.string().max(500).optional().default(''),
  url: z.string().url('Must be a valid URL')
});

export const updateMaterialSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional()
});

export const updateNoteSchema = z.object({
  content: z.string().default('')
});

export const reorderSchema = z.object({
  type: z.enum(['subject', 'unit', 'topic']),
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      unitId: z.string().optional() // if moving topic between units
    })
  )
});
