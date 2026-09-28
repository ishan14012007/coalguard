import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import complianceRoutes from './routes/compliance.js';
import inspectionsRoutes from './routes/inspections.js';
import violationsRoutes from './routes/violations.js';
import analyticsRoutes from './routes/analytics.js';
import fieldReportsRoutes from './routes/fieldReports.js';
import assistantRoutes from './routes/assistant.js';
import gisRoutes from './routes/gis.js';
import contractorsRoutes from './routes/contractors.js';
import workflowRoutes, { runDailyEscalationJob } from './routes/workflow.js';
import auditTrailRoutes from './routes/auditTrail.js';
import grievancesRoutes from './routes/grievances.js';
import attendanceRoutes from './routes/attendance.js';
import emergencyRoutes from './routes/emergency.js';
import mlModelsRoutes from './routes/mlModels.js';
import minesignRoutes from './routes/minesign.js';
import communicationRoutes from './routes/communication.js';
import operationalLogRoutes from './routes/operationalLog.js';
import incidentsRoutes from './routes/incidents.js';

// Database & pool initialization
import './db/pool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');
const hasClientDist = fs.existsSync(clientDistPath);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve compiled client static assets if available
if (hasClientDist) {
  app.use(express.static(clientDistPath));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'CoalGuard Smart Governance & Statutory Compliance Platform',
    version: '1.0.0-SIH2026',
    timestamp: new Date().toISOString()
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/field-reports', fieldReportsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/gis', gisRoutes);
app.use('/api/contractors', contractorsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/audit', auditTrailRoutes);
app.use('/api/grievances', grievancesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/models', mlModelsRoutes);
app.use('/api/minesign', minesignRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/operational-log', operationalLogRoutes);
app.use('/api/incidents', incidentsRoutes);


// SPA Fallback & Development Gateway Routing
if (hasClientDist) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Development gateway when frontend runs separately on Vite dev server (port 3000)
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CoalGuard API Gateway & Web Portal</title>
          <meta http-equiv="refresh" content="1; url=http://localhost:3000" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9; color: #1e293b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; border: 2px solid #213d77; padding: 32px; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 480px; }
            .title { color: #0f2942; font-size: 20px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; }
            .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            .btn { display: inline-block; background: #fb792b; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
            .btn:hover { background: #e06518; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">CoalGuard Portal Gateway</div>
            <div class="subtitle">Government of India • Ministry of Coal & DGMS</div>
            <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 24px;">
              The backend API server is running on <strong>Port ${PORT}</strong>. In development mode, the Web Portal runs on <strong>http://localhost:3000</strong>.
            </p>
            <a href="http://localhost:3000" class="btn">Launch CoalGuard Portal (Port 3000)</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Scheduled Cron Job: Run daily statutory compliance escalation sweep at midnight (0 0 * * *)
// Set to every hour in development for demo reactivity
cron.schedule('0 * * * *', () => {
  console.log('⏰ [Cron] Running automated statutory compliance & violation escalation scan...');
  const escalations = runDailyEscalationJob();
  console.log(`✅ [Cron] Escalation check completed. ${escalations.length} items escalated.`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`
  ======================================================
  🚀 CoalGuard Backend Server Started Successfully!
  📡 Port: http://localhost:${PORT}
  🛡️ Environment: ${process.env.NODE_ENV || 'development'}
  ======================================================
  `);
});
