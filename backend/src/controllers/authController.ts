import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../types';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators';
import { deleteFileFromStorage } from '../services/storageService';

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const { name, email, password } = parseResult.data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    name,
    email,
    passwordHash
  });

  const signOptions: SignOptions = { expiresIn: config.jwtExpiresIn as any };
  const token = jwt.sign(
    { userId: newUser._id.toString(), email: newUser.email },
    config.jwtSecret,
    signOptions
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email
    }
  });
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const { email, password } = parseResult.data;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const signOptions: SignOptions = { expiresIn: config.jwtExpiresIn as any };
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    config.jwtSecret,
    signOptions
  );

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.userId).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  });
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const { currentPassword, newPassword } = parseResult.data;
  const user = await User.findById(req.user?.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({ success: false, message: 'Incorrect current password' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated successfully' });
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const fileMaterials = await Material.find({ ownerId: userId, type: 'FILE' });
  for (const m of fileMaterials) {
    if (m.storagePath) {
      await deleteFileFromStorage(m.storagePath).catch(err => console.error('Account delete file error:', err));
    }
  }

  await Material.deleteMany({ ownerId: userId });
  await Note.deleteMany({ ownerId: userId });
  await Topic.deleteMany({ ownerId: userId });
  await Unit.deleteMany({ ownerId: userId });
  await Subject.deleteMany({ ownerId: userId });
  await User.findByIdAndDelete(userId);

  res.status(200).json({ success: true, message: 'Account and all associated data deleted successfully' });
};
