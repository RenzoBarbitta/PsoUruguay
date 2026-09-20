// Smoke test: carga todos los JS en el mismo orden que index.html con stubs de DOM
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const order = [
  'js/logo.js', 'js/config.js', 'js/i18n.js', 'js/competencias.js',
  'js/trivia-data.js', 'js/pasapalabra-data.js', 'js/state.js', 'js/compute.js',
  'js/auth.js', 'js/ui.js', 'js/views.js', 'js/trivia.js', 'js/pasapalabra.js',
  'js/penales.js', 'js/admin.js', 'js/main.js'
];

const root = path.resolve(__dirname, '..');

// Stub mínimo de DOM
function makeEl() {
  const el = {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild() { return makeEl(); }, removeChild() {}, remove() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    getElementById() { return makeEl(); },
    closest() { return makeEl(); }, contains() { return false; },
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false, focus() {}, blur() {},
    insertAdjacentHTML() {}, scrollIntoView() {},
    set onclick(fn) { void fn; }, get onclick() { return null; },
  };
  return el;
}

const documentStub = {
  getElementById() { return makeEl(); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  addEventListener() {}, removeEventListener() {},
  documentElement: makeEl(), body: makeEl(), head: makeEl(),
  title: '', dispatchEvent() { return true; },
};

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  document: documentStub,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  navigator: { userAgent: 'test', language: 'es' },
  location: { href: 'https://test.local/', origin: 'https://test.local', pathname: '/', search: '', hash: '' },
  history: { pushState() {}, replaceState() {} },
  window: null, alert() {}, confirm() { return true; },
  requestAnimationFrame(fn) { fn(); },
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return { getPropertyValue: () => '' }; },
  URLSearchParams, URL, Date, Math, JSON, Promise, Object, Array, String, Number, Boolean, Map, Set, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);

let failed = false;
for (const f of order) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { console.log('FALTA ARCHIVO: ' + f); failed = true; continue; }
  const code = fs.readFileSync(p, 'utf8');
  try {
    vm.runInContext(code, ctx, { filename: f });
    console.log('CARGA OK: ' + f);
  } catch (e) {
    console.log('ERROR EN RUNTIME AL CARGAR ' + f + ': ' + e.message);
    failed = true;
  }
}

// Sanity: verificar funciones clave expuestas
const checks = ['tr', 'renderShell', 'renderMainContent', 'adminPanelCompetencias', 'openCompetitionFormModal', 'openSortearCompetitionModal', 'attachCompetenciasEvents', 'getCompetitionById', 'viewFixture', 'viewTabla'];
for (const fn of checks) {
  try {
    const val = vm.runInContext('typeof ' + fn, ctx);
    console.log((val === 'function' ? 'FUNCIÓN OK' : 'FALTA/FALLO') + ': ' + fn + ' → ' + val);
    if (val !== 'function') failed = true;
  } catch (e) {
    console.log('ERROR chequeando ' + fn + ': ' + e.message);
    failed = true;
  }
}

console.log(failed ? '\n❌ HAY PROBLEMAS' : '\n✅ TODOS LOS ARCHIVOS CARGAN CORRECTAMENTE');
process.exit(failed ? 1 : 0);
