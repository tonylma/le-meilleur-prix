import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.join(__dirname, 'db.json');
const MAX_PRICE = 1_000_000_000;
const SESSION_COOKIE = 'lmp_session';

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
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Données de prix invalides.'), { status: 400 });
  const price = typeof input.price === 'number' ? input.price : Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) throw Object.assign(new Error('Le prix doit être un nombre positif valide.'), { status: 400 });
  const store = input.store && typeof input.store === 'object' ? input.store : {};
  const location = input.location && typeof input.location === 'object' ? input.location : {};
  return {
    productName: cleanText(input.productName, 'Le nom du produit', { max: 80 }), price: Math.round(price * 100) / 100,
    unit: cleanText(input.unit, 'L’unité', { max: 20 }),
    store: { type: cleanText(store.type, 'Le type de commerce', { max: 40 }), name: cleanText(store.name, 'Le nom du commerce', { max: 100 }) },
    location: { city: cleanText(location.city, 'La ville', { max: 80 }), neighborhood: cleanText(location.neighborhood, 'Le quartier', { required: false, max: 80 }) },
    pseudo: cleanText(input.pseudo, 'Le pseudonyme', { required: false, max: 40 }) || 'Anonyme',
  };
}

function createRateLimiter({ limit, windowMs }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now(); const key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = clients.get(key);
    if (!entry || entry.resetAt <= now) { entry = { count: 0, resetAt: now + windowMs }; clients.set(key, entry); }
    entry.count += 1; res.setHeader('RateLimit-Limit', limit); res.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    if (entry.count > limit) { res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000)); return res.status(429).json({ message: 'Trop de requêtes. Réessayez dans un instant.' }); }
    if (clients.size > 10_000) for (const [client, value] of clients) if (value.resetAt <= now) clients.delete(client);
    next();
  };
}

const normalizeUser = user => user && ({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at || user.createdAt });
const safeEqual = (a, b) => { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && crypto.timingSafeEqual(aa, bb); };
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ sub: String(user.id), email: user.email, role: user.role, exp: Date.now() + 7 * 86400_000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'development-secret-change-me').update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'development-secret-change-me').update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch { return null; }
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(`${salt}:${key.toString('hex')}`)));
}
async function verifyPassword(password, stored) {
  const [salt, digest] = String(stored || '').split(':'); if (!salt || !digest) return false;
  const actual = await hashPassword(password, salt); return safeEqual(actual.split(':')[1], digest);
}

export function createApp({ dbPath = DEFAULT_DB_PATH, frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist'), pool: suppliedPool } = {}) {
  const app = express();
  const pool = suppliedPool || (process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined, max: 10 }) : null);
  const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim()).filter(Boolean);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site'); res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    next();
  });
  app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(Object.assign(new Error('Origine non autorisée.'), { status: 403 })); }, credentials: true, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
  app.use(express.json({ limit: '10kb', strict: true }));
  app.use('/api', createRateLimiter({ limit: 120, windowMs: 60_000 }));

  let writeQueue = Promise.resolve();
  async function readDatabase() {
    try { const data = JSON.parse(await fs.readFile(dbPath, 'utf8')); return { prices: Array.isArray(data.prices) ? data.prices : [], reports: Array.isArray(data.reports) ? data.reports : [], users: Array.isArray(data.users) ? data.users : [], messages: Array.isArray(data.messages) ? data.messages : [] }; }
    catch (error) { if (error.code === 'ENOENT') return { prices: [], reports: [], users: [], messages: [] }; throw error; }
  }
  function writeDatabase(data) {
    writeQueue = writeQueue.then(async () => { const temporaryPath = `${dbPath}.${process.pid}.tmp`; await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 }); await fs.rename(temporaryPath, dbPath); });
    return writeQueue;
  }
  const execute = async (text, values = []) => { if (!pool) throw new Error('PostgreSQL non configuré.'); return pool.query(text, values); };
  async function currentUser(req) {
    const header = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    const token = header || (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    const claims = verifyToken(token); if (!claims) return null;
    if (pool) { const result = await execute('SELECT id,email,name,role,created_at FROM users WHERE id=$1 AND status=\'active\'', [claims.sub]); return normalizeUser(result.rows[0]); }
    const data = await readDatabase(); return normalizeUser(data.users.find(user => String(user.id) === claims.sub && user.status !== 'suspended'));
  }
  const requireAuth = async (req, res, next) => { try { req.user = await currentUser(req); if (!req.user) return res.status(401).json({ message: 'Connectez-vous pour continuer.' }); next(); } catch (error) { next(error); } };
  const requireAdmin = (req, res, next) => { if (!['admin', 'moderator'].includes(req.user?.role)) return res.status(403).json({ message: 'Accès réservé à la modération.' }); next(); };
  async function findUser(email) {
    if (pool) return (await execute('SELECT * FROM users WHERE email=$1', [email])).rows[0];
    return (await readDatabase()).users.find(user => user.email === email);
  }
  async function saveUser(user) {
    if (pool) return (await execute('INSERT INTO users(email,name,password_hash,role,status) VALUES($1,$2,$3,\'user\',\'active\') RETURNING id,email,name,role,created_at', [user.email, user.name, user.password_hash])).rows[0];
    const data = await readDatabase(); user.id = data.users.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1; user.role = 'user'; user.status = 'active'; user.createdAt = new Date().toISOString(); data.users.push(user); await writeDatabase(data); return user;
  }

  app.get('/api/health', async (req, res, next) => { try { if (pool) await execute('SELECT 1'); res.json({ status: 'ok', database: pool ? 'postgresql' : 'json-demo' }); } catch (error) { next(error); } });
  app.post('/api/auth/signup', createRateLimiter({ limit: 8, windowMs: 60_000 }), async (req, res, next) => {
    try {
      const email = cleanText(req.body?.email, 'L’adresse e-mail', { max: 254 }).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Adresse e-mail invalide.'), { status: 400 });
      const password = req.body?.password; if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw Object.assign(new Error('Le mot de passe doit contenir au moins 10 caractères.'), { status: 400 });
      const name = cleanText(req.body?.name, 'Le nom', { max: 60 }); if (await findUser(email)) return res.status(409).json({ message: 'Cette adresse e-mail est déjà utilisée.' });
      const user = await saveUser({ email, name, password_hash: await hashPassword(password) }); const token = makeToken(user);
      res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 86400_000, path: '/' }); res.status(201).json({ user: normalizeUser(user) });
    } catch (error) { if (error.code === '23505') return res.status(409).json({ message: 'Cette adresse e-mail est déjà utilisée.' }); next(error); }
  });
  app.post('/api/auth/signin', createRateLimiter({ limit: 10, windowMs: 60_000 }), async (req, res, next) => {
    try { const email = cleanText(req.body?.email, 'L’adresse e-mail', { max: 254 }).toLowerCase(); const user = await findUser(email); if (!user || user.status === 'suspended' || !(await verifyPassword(req.body?.password, user.password_hash))) return res.status(401).json({ message: 'Adresse e-mail ou mot de passe incorrect.' });
      const token = makeToken(user); res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 86400_000, path: '/' }); res.json({ user: normalizeUser(user) });
    } catch (error) { next(error); }
  });
  app.post('/api/auth/signout', (req, res) => { res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }); res.status(204).end(); });
  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.get('/api/prices', async (req, res, next) => {
    try {
      const product = typeof req.query.product === 'string' ? req.query.product.trim().slice(0, 80) : '';
      const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 80) : '';
      const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim().slice(0, 80) : '';
      const storeType = typeof req.query.storeType === 'string' ? req.query.storeType.trim().slice(0, 40) : '';
      const minPrice = Number(req.query.minPrice) || 0; const maxPrice = Number(req.query.maxPrice) || MAX_PRICE;
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query._limit, 10) || 100));
      let prices;
      if (pool) {
        const result = await execute(`SELECT id,product_name AS "productName",price,unit,store_type AS "storeType",store_name AS "storeName",city,neighborhood,pseudo,created_at AS date,user_id AS "userId",status FROM prices WHERE status='approved' AND ($1='' OR product_name ILIKE '%'||$1||'%') AND ($2='' OR city ILIKE '%'||$2||'%') AND ($3='' OR neighborhood ILIKE '%'||$3||'%') AND ($4='' OR store_type=$4) AND price >= $5 AND price <= $6 AND ($7::timestamptz IS NULL OR created_at >= $7) AND ($8::timestamptz IS NULL OR created_at <= $8) ORDER BY created_at DESC LIMIT $9`, [product, city, neighborhood, storeType, minPrice, maxPrice, req.query.from || null, req.query.to || null, limit]);
        prices = result.rows.map(row => ({ ...row, store: { type: row.storeType, name: row.storeName }, location: { city: row.city, neighborhood: row.neighborhood } }));
      } else {
        const data = await readDatabase(); prices = data.prices.filter(item => (item.status || 'approved') === 'approved' && (!product || String(item.productName || '').toLocaleLowerCase('fr').includes(product.toLocaleLowerCase('fr'))) && (!city || String(item.location?.city || '').toLocaleLowerCase('fr').includes(city.toLocaleLowerCase('fr'))) && (!neighborhood || String(item.location?.neighborhood || '').toLowerCase().includes(neighborhood.toLowerCase())) && (!storeType || item.store?.type === storeType) && Number(item.price) >= minPrice && Number(item.price) <= maxPrice && (!req.query.from || new Date(item.date) >= new Date(req.query.from)) && (!req.query.to || new Date(item.date) <= new Date(req.query.to))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
      }
      res.setHeader('Cache-Control', 'no-store'); res.json(prices);
    } catch (error) { next(error); }
  });
  app.post('/api/prices', createRateLimiter({ limit: 15, windowMs: 60_000 }), async (req, res, next) => {
    try {
      const price = validatePrice(req.body); const user = await currentUser(req); const status = user ? 'pending' : 'approved';
      let created;
      if (pool) { const result = await execute('INSERT INTO prices(product_name,price,unit,store_type,store_name,city,neighborhood,pseudo,user_id,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,created_at', [price.productName, price.price, price.unit, price.store.type, price.store.name, price.location.city, price.location.neighborhood, price.pseudo, user?.id || null, status]); created = { id: result.rows[0].id, ...price, date: result.rows[0].created_at, status }; }
      else { const data = await readDatabase(); const nextId = data.prices.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1; created = { id: nextId, ...price, date: new Date().toISOString(), status, userId: user?.id || null }; data.prices.push(created); await writeDatabase(data); }
      res.status(201).json(created);
    } catch (error) { next(error); }
  });
  app.get('/api/stats/:productName', async (req, res, next) => {
    try {
      const product = decodeURIComponent(req.params.productName).trim().slice(0, 80); const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 80) : ''; const period = req.query.period === 'month' ? 'month' : req.query.period === 'week' ? 'week' : 'day';
      let items;
      if (pool) { const trunc = period === 'month' ? 'month' : period === 'week' ? 'week' : 'day'; const rows = await execute(`SELECT date_trunc('${trunc}',created_at)::date AS day, AVG(price)::float AS average, MIN(price)::float AS minimum, MAX(price)::float AS maximum, COUNT(*)::int AS count FROM prices WHERE status='approved' AND product_name ILIKE $1 AND ($2='' OR city ILIKE $2) GROUP BY 1 ORDER BY 1`, [product, city]); const entries = rows.rows; return res.json({ labels: entries.map(row => row.day.toISOString().slice(0, 10)), data: entries.map(row => row.average), minimum: entries.map(row => row.minimum), maximum: entries.map(row => row.maximum), counts: entries.map(row => row.count) }); }
      items = (await readDatabase()).prices.filter(item => (item.status || 'approved') === 'approved' && String(item.productName || '').toLocaleLowerCase('fr') === product.toLocaleLowerCase('fr') && (!city || String(item.location?.city || '').toLocaleLowerCase('fr') === city.toLocaleLowerCase('fr')));
      const grouped = new Map(); for (const item of items) { const date = new Date(item.date); const key = period === 'month' ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01` : period === 'week' ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - date.getUTCDay())).toISOString().slice(0, 10) : date.toISOString().slice(0, 10); const values = grouped.get(key) || []; values.push(Number(item.price)); grouped.set(key, values); }
      const entries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)); res.json({ labels: entries.map(([day]) => day), data: entries.map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length), minimum: entries.map(([, values]) => Math.min(...values)), maximum: entries.map(([, values]) => Math.max(...values)), counts: entries.map(([, values]) => values.length) });
    } catch (error) { next(error); }
  });

  app.post('/api/reports', createRateLimiter({ limit: 10, windowMs: 60_000 }), async (req, res, next) => {
    try { const priceId = Number(req.body?.priceId); if (!Number.isSafeInteger(priceId) || priceId < 1) throw Object.assign(new Error('Prix à signaler invalide.'), { status: 400 }); const reason = cleanText(req.body?.reason, 'Le motif', { max: 500 }); const user = await currentUser(req);
      if (pool) { const result = await execute('INSERT INTO reports(price_id,user_id,reason) VALUES($1,$2,$3) RETURNING id,created_at', [priceId, user?.id || null, reason]); return res.status(201).json({ id: result.rows[0].id, status: 'open' }); }
      const data = await readDatabase(); const report = { id: data.reports.length + 1, priceId, userId: user?.id || null, reason, status: 'open', createdAt: new Date().toISOString() }; data.reports.push(report); await writeDatabase(data); res.status(201).json(report);
    } catch (error) { next(error); }
  });
  app.post('/api/contact', createRateLimiter({ limit: 5, windowMs: 60_000 }), async (req, res, next) => {
    try { const name = cleanText(req.body?.name, 'Le nom', { max: 80 }); const email = cleanText(req.body?.email, 'L’adresse e-mail', { max: 254 }).toLowerCase(); const message = cleanText(req.body?.message, 'Le message', { max: 2000 }); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Adresse e-mail invalide.'), { status: 400 });
      if (pool) await execute('INSERT INTO contact_messages(name,email,message) VALUES($1,$2,$3)', [name, email, message]); else { const data = await readDatabase(); data.messages.push({ name, email, message, createdAt: new Date().toISOString() }); await writeDatabase(data); } res.status(202).json({ message: 'Votre message a bien été envoyé.' });
    } catch (error) { next(error); }
  });
  app.get('/api/dashboard', requireAuth, async (req, res, next) => {
    try {
      if (pool) { const [prices, stats] = await Promise.all([execute('SELECT id,product_name AS "productName",price,unit,city,created_at AS date,status FROM prices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]), execute('SELECT COUNT(*)::int AS contributions, COALESCE(AVG(price),0)::float AS average FROM prices WHERE user_id=$1', [req.user.id])]); return res.json({ user: req.user, prices: prices.rows, stats: stats.rows[0] }); }
      const data = await readDatabase(); const prices = data.prices.filter(item => String(item.userId) === String(req.user.id)); res.json({ user: req.user, prices, stats: { contributions: prices.length, average: prices.length ? prices.reduce((sum, item) => sum + Number(item.price), 0) / prices.length : 0 } });
    } catch (error) { next(error); }
  });
  app.get('/api/admin/queue', requireAuth, requireAdmin, async (req, res, next) => {
    try { if (pool) { const [prices, reports] = await Promise.all([execute("SELECT id,product_name AS \"productName\",price,unit,city,created_at AS date,status FROM prices WHERE status='pending' ORDER BY created_at ASC LIMIT 100"), execute("SELECT id,price_id AS \"priceId\",reason,status,created_at AS \"createdAt\" FROM reports WHERE status='open' ORDER BY created_at ASC LIMIT 100")]); return res.json({ prices: prices.rows, reports: reports.rows }); } const data = await readDatabase(); res.json({ prices: data.prices.filter(item => item.status === 'pending'), reports: data.reports.filter(item => item.status === 'open') }); }
    catch (error) { next(error); }
  });
  app.patch('/api/admin/prices/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try { const status = req.body?.status; if (!['approved', 'rejected'].includes(status)) throw Object.assign(new Error('Statut invalide.'), { status: 400 }); if (pool) { const result = await execute('UPDATE prices SET status=$1,moderated_by=$2,moderated_at=NOW() WHERE id=$3 RETURNING id,status', [status, req.user.id, req.params.id]); if (!result.rowCount) return res.status(404).json({ message: 'Prix introuvable.' }); return res.json(result.rows[0]); } const data = await readDatabase(); const item = data.prices.find(price => String(price.id) === req.params.id); if (!item) return res.status(404).json({ message: 'Prix introuvable.' }); item.status = status; await writeDatabase(data); res.json({ id: item.id, status }); }
    catch (error) { next(error); }
  });
  app.patch('/api/admin/reports/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try { const status = req.body?.status; if (!['resolved', 'dismissed'].includes(status)) throw Object.assign(new Error('Statut invalide.'), { status: 400 }); if (pool) { await execute('UPDATE reports SET status=$1,reviewed_by=$2 WHERE id=$3', [status, req.user.id, req.params.id]); return res.json({ status }); } const data = await readDatabase(); const report = data.reports.find(item => String(item.id) === req.params.id); if (!report) return res.status(404).json({ message: 'Signalement introuvable.' }); report.status = status; await writeDatabase(data); res.json({ status }); }
    catch (error) { next(error); }
  });

  app.use('/api', (req, res) => res.status(404).json({ message: 'Route API introuvable.' }));
  app.use(express.static(frontendDistPath, { dotfiles: 'deny', index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); res.sendFile(path.join(frontendDistPath, 'index.html'), error => { if (error) next(); }); });
  app.use((error, req, res, next) => { if (res.headersSent) return next(error); const status = error.status || (error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500); if (status >= 500) console.error('Erreur serveur:', error.message); res.status(status).json({ message: status >= 500 ? 'Une erreur serveur est survenue.' : error.message }); });
  return app;
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET doit être défini en production.');
const app = createApp();
const PORT = Number(process.env.PORT) || 3001;
if (process.env.NODE_ENV !== 'test') app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
