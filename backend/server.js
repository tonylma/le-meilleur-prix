import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.join(__dirname, 'db.json');
const MAX_PRICE = 1_000_000_000;

function cleanText(value, field, { required = true, max = 80 } = {}) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null || value === '')) return '';
    throw Object.assign(new Error(`${field} doit être du texte.`), { status: 400 });
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (required && !text) throw Object.assign(new Error(`${field} est obligatoire.`), { status: 400 });
  if (text.length > max) throw Object.assign(new Error(`${field} ne peut pas dépasser ${max} caractères.`), { status: 400 });
  return text;
}

export function validatePrice(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Données de prix invalides.'), { status: 400 });
  }
  const price = typeof input.price === 'number' ? input.price : Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
    throw Object.assign(new Error('Le prix doit être un nombre positif valide.'), { status: 400 });
  }
  const store = input.store && typeof input.store === 'object' ? input.store : {};
  const location = input.location && typeof input.location === 'object' ? input.location : {};
  return {
    productName: cleanText(input.productName, 'Le nom du produit', { max: 80 }),
    price: Math.round(price * 100) / 100,
    unit: cleanText(input.unit, 'L’unité', { max: 20 }),
    store: {
      type: cleanText(store.type, 'Le type de commerce', { max: 40 }),
      name: cleanText(store.name, 'Le nom du commerce', { max: 100 }),
    },
    location: {
      city: cleanText(location.city, 'La ville', { max: 80 }),
      neighborhood: cleanText(location.neighborhood, 'Le quartier', { required: false, max: 80 }),
    },
    pseudo: cleanText(input.pseudo, 'Le pseudonyme', { required: false, max: 40 }) || 'Anonyme',
  };
}

function createRateLimiter({ limit, windowMs }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = clients.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Trop de requêtes. Réessayez dans un instant.' });
    }
    // Keep the map bounded if the service receives many distinct client IPs.
    if (clients.size > 10_000) {
      for (const [client, value] of clients) if (value.resetAt <= now) clients.delete(client);
    }
    next();
  };
}

export function createApp({ dbPath = DEFAULT_DB_PATH, frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist') } = {}) {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(origin => origin.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Origine non autorisée.'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '10kb', strict: true }));
  app.use('/api', createRateLimiter({ limit: 120, windowMs: 60_000 }));

  let writeQueue = Promise.resolve();
  async function readDatabase() {
    try {
      const data = JSON.parse(await fs.readFile(dbPath, 'utf8'));
      return { prices: Array.isArray(data.prices) ? data.prices : [], reports: Array.isArray(data.reports) ? data.reports : [] };
    } catch (error) {
      if (error.code === 'ENOENT') return { prices: [], reports: [] };
      throw error;
    }
  }
  function writeDatabase(data) {
    writeQueue = writeQueue.then(async () => {
      const temporaryPath = `${dbPath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temporaryPath, dbPath);
    });
    return writeQueue;
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/prices', async (req, res, next) => {
    try {
      const data = await readDatabase();
      const product = typeof req.query.product === 'string' ? req.query.product.trim().slice(0, 80).toLocaleLowerCase('fr') : '';
      const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 80).toLocaleLowerCase('fr') : '';
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query._limit, 10) || 100));
      const prices = data.prices
        .filter(item => (!product || String(item.productName || '').toLocaleLowerCase('fr').includes(product))
          && (!city || String(item.location?.city || '').toLocaleLowerCase('fr').includes(city)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      res.setHeader('Cache-Control', 'no-store');
      res.json(prices);
    } catch (error) { next(error); }
  });
  app.post('/api/prices', createRateLimiter({ limit: 15, windowMs: 60_000 }), async (req, res, next) => {
    try {
      const price = validatePrice(req.body);
      const data = await readDatabase();
      const nextId = data.prices.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
      const created = { id: nextId, ...price, date: new Date().toISOString() };
      data.prices.push(created);
      await writeDatabase(data);
      res.status(201).json(created);
    } catch (error) { next(error); }
  });
  app.get('/api/stats/:productName', async (req, res, next) => {
    try {
      const product = decodeURIComponent(req.params.productName).trim().slice(0, 80).toLocaleLowerCase('fr');
      const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 80).toLocaleLowerCase('fr') : '';
      const data = await readDatabase();
      const grouped = new Map();
      for (const item of data.prices) {
        if (String(item.productName || '').toLocaleLowerCase('fr') !== product) continue;
        if (city && String(item.location?.city || '').toLocaleLowerCase('fr') !== city) continue;
        const day = new Date(item.date).toISOString().slice(0, 10);
        const values = grouped.get(day) || [];
        values.push(Number(item.price));
        grouped.set(day, values);
      }
      const entries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
      res.json({ labels: entries.map(([day]) => day), data: entries.map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length) });
    } catch (error) { next(error); }
  });

  app.use('/api', (req, res) => res.status(404).json({ message: 'Route API introuvable.' }));
  app.use(express.static(frontendDistPath, { dotfiles: 'deny', index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'), error => { if (error) next(); });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('Erreur serveur:', error.message);
    res.status(status).json({ message: status >= 500 ? 'Une erreur serveur est survenue.' : error.message });
  });
  return app;
}

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
}
