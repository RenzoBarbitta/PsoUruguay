/* Genera functions/lib/trivia-answers.json a partir de js/trivia-data.js.
   El server necesita saber el índice correcto de cada pregunta para validar
   las partidas de trivia sin confiar en el cliente. Uso:
     node scripts/gen-trivia-answers.mjs
   (correrlo cada vez que se agreguen preguntas a js/trivia-data.js) */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(root, 'js', 'trivia-data.js'), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(code + '\n;this.__Q = TRIVIA_QUESTIONS;', ctx);
const qs = ctx.__Q;
if (!Array.isArray(qs) || !qs.length) {
  console.error('ERROR: no se pudo leer TRIVIA_QUESTIONS de js/trivia-data.js');
  process.exit(1);
}
const data = qs.map(q => ({ c: q.correct, n: (q.options || []).length }));
fs.mkdirSync(path.join(root, 'functions', 'lib'), { recursive: true });
/* Módulo .mjs en vez de .json: es compatible con Node y con el bundler de
   wrangler sin atributos de import. */
const out = '/* AUTO-GENERADO por scripts/gen-trivia-answers.mjs — no editar a mano */\n'
  + 'export const TRIVIA_ANSWERS = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(root, 'functions', 'lib', 'trivia-answers.mjs'), out);
console.log('OK: ' + data.length + ' preguntas → functions/lib/trivia-answers.mjs');
