/* ======================================================================
   PSO URUGUAY - SERVIDOR EXPRESS
   Sirve el sitio estático + la API que hace el ranking online y dinámico.

   Para correrlo:
     npm install
     node server.js
   Y abrir http://localhost:3000

   Los datos se guardan en archivos JSON dentro de la carpeta data/:
     - data/users.json : cuentas de jugadores y mejores rachas
     - data/kv.json    : equipos, partidos y configuración de la liga
   ====================================================================== */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = 'users.json';
const KV_FILE = 'kv.json';

function ensureDataDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

ensureDataDir();
let users = readJson(USERS_FILE, []);
let kv = readJson(KV_FILE, {});
const sessions = new Map(); // token -> userId (en memoria; se reingresa tras reiniciar el server)

function saveUsers() { writeJson(USERS_FILE, users); }
function saveKv() { writeJson(KV_FILE, kv); }

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.displayName, bestStreak: u.bestStreak || 0, bestPenalStreak: u.bestPenalStreak || 0, createdAt: u.createdAt };
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, userId);
  return token;
}

function authToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function authMiddleware(req, res, next) {
  const token = authToken(req);
  const userId = token && sessions.get(token);
  if (!userId) return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  req.userId = userId;
  next();
}

const app = express();
app.use(express.json({ limit: '50mb' })); // los logos se suben en base64
app.use(express.static(__dirname)); // sirve index.html, css/js

app.get('/api/health', (req, res) => res.json({ ok: true }));

/* ---------------- Cuentas de usuario ---------------- */

app.post('/api/auth/signup', (req, res) => {
  const { username, password, displayName } = req.body || {};
  const name = String(username || '').trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    return res.status(400).json({ error: 'El usuario debe tener entre 3 y 20 caracteres (letras, números o _).' });
  }
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }
  if (users.some(u => u.username === name)) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: 'u_' + crypto.randomBytes(8).toString('hex'),
    username: name,
    displayName: String(displayName || '').trim() || name,
    passwordHash: hashPassword(password, salt),
    salt,
    bestStreak: 0,
    bestPenalStreak: 0,
    createdAt: Date.now()
  };
  users.push(user);
  saveUsers();

  res.json({ token: createSession(user.id), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '').trim().toLowerCase();
  const user = users.find(u => u.username === name);

  if (!user || !password) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  res.json({ token: createSession(user.id), user: publicUser(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const u = users.find(x => x.id === req.userId);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ user: publicUser(u) });
});

/* ---------------- Ranking de trivia ---------------- */

app.get('/api/ranking', (req, res) => {
  const ranking = users
    .map(publicUser)
    .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0) || a.createdAt - b.createdAt);
  res.json({ ranking });
});

app.post('/api/ranking', authMiddleware, (req, res) => {
  const bestStreak = Math.max(0, Math.floor(Number((req.body || {}).bestStreak) || 0));
  const u = users.find(x => x.id === req.userId);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (bestStreak > (u.bestStreak || 0)) {
    u.bestStreak = bestStreak;
    saveUsers();
  }

  const ranking = users
    .map(publicUser)
    .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0) || a.createdAt - b.createdAt);
  res.json({ user: publicUser(u), ranking });
});

/* ---------------- Ranking de penales ---------------- */

app.get('/api/ranking/penales', (req, res) => {
  const ranking = users
    .map(publicUser)
    .sort((a, b) => (b.bestPenalStreak || 0) - (a.bestPenalStreak || 0) || a.createdAt - b.createdAt);
  res.json({ ranking });
});

app.post('/api/ranking/penales', authMiddleware, (req, res) => {
  const bestPenalStreak = Math.max(0, Math.floor(Number((req.body || {}).bestPenalStreak) || 0));
  const u = users.find(x => x.id === req.userId);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (bestPenalStreak > (u.bestPenalStreak || 0)) {
    u.bestPenalStreak = bestPenalStreak;
    saveUsers();
  }

  const ranking = users
    .map(publicUser)
    .sort((a, b) => (b.bestPenalStreak || 0) - (a.bestPenalStreak || 0) || a.createdAt - b.createdAt);
  res.json({ user: publicUser(u), ranking });
});

/* ---------------- Datos de la liga (clave-valor) ---------------- */

app.get('/api/data', (req, res) => {
  const { key, prefix } = req.query;
  if (prefix) {
    return res.json({ keys: Object.keys(kv).filter(k => k.startsWith(prefix)) });
  }
  if (key) {
    return res.json({ key, value: kv[key] != null ? kv[key] : null });
  }
  res.json({ keys: Object.keys(kv) });
});

app.put('/api/data', (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Falta la key.' });
  kv[key] = value;
  saveKv();
  res.json({ ok: true, key });
});

app.delete('/api/data', (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Falta la key.' });
  delete kv[key];
  saveKv();
  res.json({ ok: true });
});

/* ---------------- Arranque ---------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('⚽ PSO Uruguay corriendo en http://localhost:' + PORT);
  console.log('   Ranking online en http://localhost:' + PORT + '/api/ranking');
  console.log('   Ranking penales en http://localhost:' + PORT + '/api/ranking/penales');
});