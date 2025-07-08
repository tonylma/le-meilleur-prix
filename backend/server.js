import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// Middlewares
app.use(cors());
app.use(express.json());

// Ces lignes sont à ajouter dans backend/server.js

// On indique à Express où se trouvent les fichiers statiques du frontend "buildé"
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Helper pour lire la DB
const readDb = async () => JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));

// Helper pour écrire dans la DB
const writeDb = async (data) => fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

// --- API Routes ---

// GET /api/prices - Rechercher des prix avec filtres
app.get('/api/prices', async (req, res) => {
  try {
    const { product, city } = req.query;
    const db = await readDb();
    
    let filteredPrices = db.prices;

    if (product) {
      filteredPrices = filteredPrices.filter(p => 
        p.productName.toLowerCase().includes(product.toLowerCase())
      );
    }
    if (city) {
      filteredPrices = filteredPrices.filter(p => 
        p.location.city.toLowerCase() === city.toLowerCase()
      );
    }
    
    // Trier du plus récent au plus ancien
    filteredPrices.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(filteredPrices);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur", error });
  }
});

// POST /api/prices - Partager un nouveau prix
app.post('/api/prices', async (req, res) => {
  try {
    const { productName, price, unit, store, location, pseudo } = req.body;

    // Validation simple
    if (!productName || !price || !unit || !store || !location) {
      return res.status(400).json({ message: "Tous les champs obligatoires ne sont pas remplis." });
    }
    
    // Détection d'anomalie basique (ex: prix > 100 000)
    if (parseFloat(price) > 100000) {
        return res.status(400).json({ message: "Le prix semble anormalement élevé." });
    }

    const db = await readDb();
    const newPrice = {
      id: db.prices.length > 0 ? Math.max(...db.prices.map(p => p.id)) + 1 : 1,
      productName,
      price: parseFloat(price),
      unit,
      store,
      location,
      pseudo: pseudo || "Anonyme",
      date: new Date().toISOString(),
    };

    db.prices.push(newPrice);
    await writeDb(db);
    
    res.status(201).json(newPrice);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur", error });
  }
});

// GET /api/stats/:productName - Obtenir des statistiques pour un produit
app.get('/api/stats/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        const { city } = req.query;
        const db = await readDb();

        let productPrices = db.prices.filter(p => p.productName.toLowerCase() === productName.toLowerCase());

        if (city) {
            productPrices = productPrices.filter(p => p.location.city.toLowerCase() === city.toLowerCase());
        }

        if (productPrices.length === 0) {
            return res.status(404).json({ message: "Aucun prix trouvé pour ce produit." });
        }

        // Grouper par date (jour) pour l'historique
        const history = productPrices.reduce((acc, p) => {
            const date = p.date.split('T')[0]; // Format YYYY-MM-DD
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(p.price);
            return acc;
        }, {});

        const chartData = {
            labels: Object.keys(history).sort(),
            data: Object.keys(history).sort().map(date => {
                const pricesOnDate = history[date];
                const avg = pricesOnDate.reduce((a, b) => a + b, 0) / pricesOnDate.length;
                return avg;
            })
        };

        res.json(chartData);
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur" });
    }
});

// Ces lignes sont à ajouter à la fin du fichier, avant app.listen

// Pour toutes les autres requêtes, on renvoie le fichier index.html du frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎉 Serveur API "Le Meilleur Prix" démarré sur http://localhost:${PORT}`);
});