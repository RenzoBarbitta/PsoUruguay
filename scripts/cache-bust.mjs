/*
 * Build de cache-busting automático para Cloudflare Pages.
 *
 * Qué hace:
 *  1. Genera la carpeta dist/ con los archivos estáticos del sitio.
 *  2. Reescribe index.html agregando ?v=<sha1 del contenido> a cada
 *     asset local (js/css) que referencia. Si el archivo cambia, cambia
 *     su URL -> el navegador y el CDN bajan la versión nueva. Si no
 *     cambia, conserva la URL -> aprovecha la caché existente.
 *  3. Escribe dist/_headers con la política de caché correcta:
 *       - index.html: no-cache (siempre revalida contra el ETag)
 *       - assets versionados: immutable por 1 año
 *
 * Cero dependencias: solo Node (node:crypto, node:fs, node:path).
 * Funciona igual en los builds de Cloudflare Pages (git deploy) y
 * en deploy local con wrangler.
 */

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');

/* Solo se copia el sitio "público". Nunca .git, functions, scripts,
   data, README, config de wrangler, sql, ni keys. */
const DIRS = ['css', 'js'];

/* referencias locales a js/css: "js/foo.js" o "./css/bar.css", con o sin ?v=? */
const htmlRe = /(src|href)="(?:\.\/)?((?:js|css)\/[^"?]+)(\?[^"]*)?"/g;

function shortSha(buf) {
  return createHash('sha1').update(buf).digest('hex').slice(0, 10);
}

async function main() {
  const html = await readFile(join(ROOT, 'index.html'), 'utf8');

  /* 1. Versiona las referencias locales con el hash del contenido. */
  const matches = [...html.matchAll(htmlRe)];
  const out = [];
  let last = 0;
  for (const m of matches) {
    out.push(html.slice(last, m.index));
    const attr = m[1];
    const path = m[2];
    const abs = resolve(ROOT, path);
    try {
      const buf = await readFile(abs);
      out.push(`${attr}="${path}?v=${shortSha(buf)}"`);
    } catch {
      console.warn(`[cache-bust] no se pudo leer "${abs}"; se deja la referencia original`);
      out.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  out.push(html.slice(last));
  const newHtml = out.join('');

  if (!matches.length) {
    console.warn('[cache-bust] no se encontraron referencias locales js/css en index.html');
  }

  /* 2. Copia el sitio estático a dist/. */
  await rm(OUT, { recursive: true, force: true }).catch(() => {});
  await mkdir(OUT, { recursive: true });

  for (const d of DIRS) {
    await cp(join(ROOT, d), join(OUT, d), { recursive: true });
  }
  for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name === 'index.html') continue;
    if (entry.name.endsWith('.html') || entry.name.endsWith('.webp')) {
      await cp(join(ROOT, entry.name), join(OUT, entry.name));
    }
  }

  await writeFile(join(OUT, 'index.html'), newHtml, 'utf8');

  console.log('[cache-bust] assets versionados:');
  for (const m of newHtml.matchAll(htmlRe)) {
    console.log('  ' + m[0]);
  }

  /* 3. Política de caché en _headers. */
  const headers = [
    '# index.html siempre revalida contra el ETag: un deploy nuevo se ve solo.',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
    '# Assets versionados por contenido: el HTML apunta a la URL nueva cuando cambian.',
    '/js/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/css/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/logo.webp',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/google*.html',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
  await writeFile(join(OUT, '_headers'), headers, 'utf8');

  console.log('[cache-bust] build listo en dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});