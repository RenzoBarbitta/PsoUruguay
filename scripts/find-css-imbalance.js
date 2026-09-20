// Localiza el descuadre de llaves CSS reportando balance acumulado por línea
const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');
const lines = css.split('\n');
let bal = 0;
lines.forEach((l, i) => {
  for (const ch of l) {
    if (ch === '{') bal++;
    if (ch === '}') bal--;
  }
  if (l.includes('{') || l.includes('}')) {
    // solo mostrar cambios relevantes cerca del final o rarezas
  }
});
console.log('Balance final:', bal);

// Repasar: mostrar balance acumulado en bloques @media y al final de cada regla
let b2 = 0;
const snapshot = [];
lines.forEach((l, i) => {
  const before = b2;
  for (const ch of l) {
    if (ch === '{') b2++;
    if (ch === '}') b2--;
  }
  if (b2 !== before && (b2 > 1 || (before > 0 && b2 < before))) {
    snapshot.push((i + 1) + ': [' + before + '→' + b2 + '] ' + l.trim().slice(0, 80));
  }
});
// Mostrar solo donde el balance queda >0 prolongadamente: imprimir últimas 30 líneas con balance
let b3 = 0;
const track = [];
lines.forEach((l, i) => {
  for (const ch of l) {
    if (ch === '{') b3++;
    if (ch === '}') b3--;
  }
  track.push(b3);
});
// Encontrar la última línea donde balance volvio a 0
let lastZero = 0;
track.forEach((v, i) => { if (v === 0) lastZero = i + 1; });
console.log('Ultima linea con balance 0:', lastZero);
console.log('Total lineas:', lines.length);
console.log('\n--- Desde la linea ' + (lastZero + 1) + ' en adelante ---');
for (let i = lastZero; i < Math.min(lines.length, lastZero + 200); i++) {
  console.log((i + 1) + ': [' + track[i] + '] ' + lines[i].slice(0, 100));
}
