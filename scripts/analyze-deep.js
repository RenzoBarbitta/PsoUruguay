// Análisis profundo: duplicados, claves i18n faltantes y balance CSS
const fs = require('fs');

const dups = [];
for (const f of fs.readdirSync('js').filter(x => x.endsWith('.js'))) {
  const c = fs.readFileSync('js/' + f, 'utf8');
  const names = {};
  for (const m of c.matchAll(/^(?:async )?function (\w+)/gm)) {
    if (names[m[1]]) dups.push(f + ': function ' + m[1]);
    names[m[1]] = 1;
  }
  const consts = {};
  for (const m of c.matchAll(/^const (\w+)/gm)) {
    if (consts[m[1]]) dups.push(f + ': const ' + m[1]);
    consts[m[1]] = 1;
  }
}
console.log('DUPS:', dups.length ? dups.join(' | ') : 'ninguno');

let all = '';
for (const f of fs.readdirSync('js').filter(x => x.endsWith('.js'))) all += fs.readFileSync('js/' + f, 'utf8');
const defined = new Set();
for (const m of all.matchAll(/^\s*(\w+):\s*\{\s*es:/gm)) defined.add(m[1]);
const used = new Set();
for (const m of all.matchAll(/tr\('(\w+)'/g)) used.add(m[1]);
const missing = [...used].filter(k => !defined.has(k));
console.log('I18N FALTANTES:', missing.length ? missing.join(' | ') : 'ninguno');

const css = fs.readFileSync('css/styles.css', 'utf8');
let bal = 0, line = 1, problems = [];
for (const ch of css) {
  if (ch === '\n') line++;
  if (ch === '{') bal++;
  if (ch === '}') { bal--; if (bal < 0) { problems.push('extra } linea ' + line); bal = 0; } }
}
console.log('CSS balance:', bal === 0 ? 'OK' : 'descuadre de ' + bal, problems.join(', '));
