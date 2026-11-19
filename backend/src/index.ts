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

// Dynamic CORS configuration (supports localhost + any Vercel preview/production domain)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const allowed = [
        config.frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000'
      ];

      // Allow any vercel.app preview or production deployment
      if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(null, true); // Permissive for API consumers
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate limiting (compatible with Vercel serverless / proxies)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Serverless DB connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please ensure MongoDB Atlas IP whitelist allows 0.0.0.0/0.'
    });
  }
});

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check & root landing
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'StudyTrack API', timestamp: new Date() });
});

app.get('/api', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'StudyTrack API', timestamp: new Date() });
});

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

// Standalone listener for local development (not invoked inside Vercel serverless)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`[StudyTrack Server] running on http://localhost:${config.port}`);
  });
}

export default app;
