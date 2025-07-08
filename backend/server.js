import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Important pour l'hébergeur
const DB_PATH = path.join(__dirname, 'db.json');

// --- 1. Middlewares Généraux (au début) ---
app.use(cors());
app.use(express.json());

// --- 2. Middleware pour servir les fichiers statiques du Frontend (TRÈS IMPORTANT) ---
// Ce bloc indique à Express de servir les fichiers du dossier 'dist' du frontend
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// --- 3. Vos Routes d'API (au milieu) ---
// GET /api/prices
app.get('/api/prices', async (req, res) => {
  // ... votre code pour l'API ...
});

// POST /api/prices
app.post('/api/prices', async (req, res) => {
  // ... votre code pour l'API ...
});

// GET /api/stats/:productName
app.get('/api/stats/:productName', async (req, res) => {
    // ... votre code pour l'API ...
});

// --- 4. Route "Attrape-Tout" ou Wildcard (À LA FIN, JUSTE AVANT LISTEN) ---
// Cette route doit être la DERNIÈRE. Elle renvoie l'app React pour n'importe quelle URL
// ce qui permet au routage de React de fonctionner.
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// --- 5. Démarrage du serveur (tout à la fin) ---
app.listen(PORT, () => {
  console.log(`🎉 Serveur démarré sur le port ${PORT}`);
});
