import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Route imports
import authRoutes from './routes/authRoutes';
import subjectRoutes from './routes/subjectRoutes';
import unitRoutes from './routes/unitRoutes';
import topicRoutes from './routes/topicRoutes';
import materialRoutes from './routes/materialRoutes';
import noteRoutes from './routes/noteRoutes';
import importRoutes from './routes/importRoutes';
import {
  getDashboardStats,
  searchAll,
  reorderItems,
  resetTopicProgress,
  resetUnitProgress,
  resetSubjectProgress,
  resetAllProgress
} from './controllers/miscController';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'StudyTrack API', timestamp: new Date() });
});

// Main routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/import', importRoutes);

// Other global & reset endpoints
app.get('/api/dashboard', authenticateToken, getDashboardStats);
app.get('/api/search', authenticateToken, searchAll);
app.patch('/api/reorder', authenticateToken, reorderItems);
app.post('/api/reset/topic/:id', authenticateToken, resetTopicProgress);
app.post('/api/reset/unit/:id', authenticateToken, resetUnitProgress);
app.post('/api/reset/subject/:id', authenticateToken, resetSubjectProgress);
app.post('/api/reset/all', authenticateToken, resetAllProgress);

// Error handler middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[StudyTrack Server] running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
  });
};

startServer();

export default app;
