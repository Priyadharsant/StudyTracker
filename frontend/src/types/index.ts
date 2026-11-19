export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Subject {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order: number;
  isPublic?: boolean;
  shareCode?: string;
  totalTopics: number;
  completedTopics: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  _id: string;
  ownerId: string;
  subjectId: string;
  name: string;
  description?: string;
  order: number;
  topics: Topic[];
  totalTopics: number;
  completedTopics: number;
  progressPercentage: number;
  materialCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  _id: string;
  ownerId: string;
  subjectId: string | { _id: string; name: string; color: string };
  unitId: string | { _id: string; name: string };
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  deadline?: string | null;
  order: number;
  materialCount?: number;
  hasNotes?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  _id: string;
  ownerId: string;
  subjectId: string | { _id: string; name: string };
  unitId: string | { _id: string; name: string };
  topicId: string | { _id: string; title: string };
  type: 'URL' | 'FILE';
  title: string;
  description?: string;
  url?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  _id: string;
  ownerId: string;
  subjectId: string | { _id: string; name: string; color: string };
  unitId: string | { _id: string; name: string };
  topicId: string | { _id: string; title: string; completed?: boolean };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSubjects: number;
  totalUnits: number;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  overallPercentage: number;
}
