// EduStream Pro - Backend API Server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── STEP 1: CORS must be FIRST — before everything else ─────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    /https:\/\/.*\.vercel\.app$/
  ],
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));

app.options('*', cors());

// ─── STEP 2: Body parsers ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── STEP 3: Supabase client ──────────────────────────────────────────────────
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── STEP 4: Request logger ───────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ─── STEP 5: Health check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EduStream Pro API'
  });
});

// ─── STEP 6: Import routes ────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import classRoutes from './routes/classes.js';
import subjectRoutes from './routes/subjects.js';
import resultRoutes from './routes/results.js';
import parentRoutes from './routes/parents.js';
import sessionRoutes from './routes/sessions.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import traitRoutes from './routes/traits.js';

// ─── STEP 7: Mount routes — each path only ONCE ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/sessions', sessionRoutes);   // ← only once, using sessionRoutes
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/traits', traitRoutes);

// ─── STEP 8: 404 handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// ─── STEP 9: Global error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── STEP 10: Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 EduStream Pro API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
