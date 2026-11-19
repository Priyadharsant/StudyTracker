import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
