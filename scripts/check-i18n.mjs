import fs from 'node:fs'
import vm from 'node:vm'

/* Valida que cada clave i18n usada en el codigo exista en el diccionario.
   Regresion: un script de limpieza borro claves y dejo el archivo con un
   error de sintaxis, asi que toda clave que se use debe existir. */
const src = fs.readFileSync('public/js/i18n.js', 'utf8')
const m = src.match(/const I18N = (\{[\s\S]*?\n\};)/)
const ctx = { console, localStorage: { getItem: () => null, setItem() {} } }
vm.createContext(ctx)
const I18N = vm.runInContext('(' + m[1].replace(/;\s*$/, '') + ')', ctx)
const dic = I18N.dic

const archivos = []
const raiz = 'src'
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name
    if (e.isDirectory()) walk(p)
    else if (/\.(jsx?|mjs)$/.test(e.name)) archivos.push(p)
  }
})(raiz)

/* Las claves con prefijo son construidas en runtime: t('pos_' + code),
   t('penales_zona_' + z). No se pueden verificar de forma estatica, asi
   que solo se exige que exista al menos una clave con ese prefijo. */
const prefijosDinamicos = ['pos_', 'penales_zona_', 'admin_pos_']

const faltan = new Map()
for (const f of archivos) {
  const s = fs.readFileSync(f, 'utf8')
  for (const mt of s.matchAll(/\bt\(\s*'([a-z0-9_]+)'/g)) {
    const k = mt[1]
    if (k in dic) continue
    if (prefijosDinamicos.some(p => k.startsWith(p))) {
      const pre = prefijosDinamicos.find(p => k.startsWith(p))
      if (Object.keys(dic).some(d => d.startsWith(pre))) continue
    }
    if (!faltan.has(k)) faltan.set(k, [])
    faltan.get(k).push(f)
  }
}

console.log('archivos analizados:', archivos.length)
console.log('claves en dic:', Object.keys(dic).length)
if (faltan.size === 0) {
  console.log('OK: todas las claves t(...) existen')
} else {
  console.log('FALTAN ' + faltan.size + ' claves:')
  for (const [k, fs_] of faltan) console.log('  ' + k.padEnd(34) + fs_.join(', '))
  process.exitCode = 1
}