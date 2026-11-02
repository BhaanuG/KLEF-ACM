import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './apiRouter.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount API Router under /api
app.use('/api', createApiRouter());


// Serve Static Frontend if built (in production)
const distPath = path.join(__dirname, '..', 'dist');
// Old links: /KLEF-ACM-SC/... -> /...
app.use(/^\/klef-acm-sc(\/.*)?$/i, (req, res) => res.redirect(301, req.params[0] || '/'));
app.use(express.static(distPath));

// SPA Fallback
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  KLEF ACM Chapter CMS Backend Server Running`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  API Base: http://localhost:${PORT}/api`);
  console.log(`======================================================\n`);
});
