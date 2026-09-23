/* ======================================================================
   PSO URUGUAY - PASAPALABRA
   Jonca diaria tipo "palabra": una rosca de letras A-Z. Cada letra trae
   una definición con 4 opciones. Sin cuenta necesaria.
   - La rosca es la misma para todos cada día (semilla según la fecha).
   - 120 segundos de tiempo total.
   - Acierto = verde, fallo = rojo, salto = vuelve en la segunda vuelta.
   - Se guarda el progreso y el resultado del día en localStorage.
   ====================================================================== */

const PasapalabraState = {
  jugando: false,
  fecha: null,
  cola: [],          // letras pendientes de la vuelta actual
  segunda: [],       // letras saltadas en la primera vuelta
  primeraVuelta: true,
  estado: {},        // letra -> 'acierta' | 'falla' | 'pasada'
  perg: {},          // letra -> pregunta {w, q, opts, c}
  pergLang: null,
  aciertos: 0,
  fallas: 0,
  pasadas: 0,
  respondida: false,
  tiempo: 120,
  terminada: false,
  terminadaPorTiempo: false
};

const PASAPALABRA_ABC = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const PASAPALABRA_TIEMPO = 120;
const ROSCO_KEY = 'pso_rosco';
const ROSCO_RECORD_KEY = 'pso_rosco_record';
let pasapalabraTimer = null;

function pasapalabraFecha() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function pasapalabraHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pasapalabraSeedIndex(letra) {
  const banco = PASAPALABRA_QUESTIONS[I18N.lang][letra];
  return pasapalabraHash(pasapalabraFecha() + letra) % banco.length;
}

// Reordena las opciones de la pregunta según la fecha: la correcta cambia
// de posición cada día, así no se aprende «la primera es siempre la buena».
function rotarOpciones(q, letra) {
  const n = q.opts.length;
  const offset = pasapalabraHash(pasapalabraFecha() + letra + '°') % n;
  const opts = [];
  for (let i = 0; i < n; i++) opts.push(q.opts[(i + offset) % n]);
  return { ...q, opts, c: (q.c - offset + n) % n };
}

function pasapalabraCountBanco() {
  let total = 0;
  for (const letra of PASAPALABRA_ABC) {
    total += (PASAPALABRA_QUESTIONS[I18N.lang][letra] || []).length;
  }
  return total;
}

function buildPerg() {
  const perg = {};
  for (const letra of PASAPALABRA_ABC) {
    const banco = PASAPALABRA_QUESTIONS[I18N.lang][letra];
    perg[letra] = rotarOpciones(banco[pasapalabraSeedIndex(letra)], letra);
  }
  return perg;
}

/* ---------------- Persistencia ---------------- */

function pasapalabraGuardar() {
  try {
    localStorage.setItem(ROSCO_KEY, JSON.stringify({
      fecha: PasapalabraState.fecha,
      cola: PasapalabraState.cola,
      segunda: PasapalabraState.segunda,
      primeraVuelta: PasapalabraState.primeraVuelta,
      estado: PasapalabraState.estado,
      aciertos: PasapalabraState.aciertos,
      fallas: PasapalabraState.fallas,
      pasadas: PasapalabraState.pasadas,
      tiempo: PasapalabraState.tiempo,
      terminada: PasapalabraState.terminada,
      terminadaPorTiempo: PasapalabraState.terminadaPorTiempo
    }));
  } catch (e) {}
}

function pasapalabraCargar() {
  try {
    const raw = localStorage.getItem(ROSCO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function pasapalabraRecord() {
  try {
    const raw = localStorage.getItem(ROSCO_RECORD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function pasapalabraGuardarRecord() {
  const old = pasapalabraRecord();
  if (!old || PasapalabraState.aciertos > old.aciertos) {
    try {
      localStorage.setItem(ROSCO_RECORD_KEY, JSON.stringify({ aciertos: PasapalabraState.aciertos, fecha: PasapalabraState.fecha }));
    } catch (e) {}
  }
}

function stopPasapalabraTimer() {
  if (pasapalabraTimer) {
    clearInterval(pasapalabraTimer);
    pasapalabraTimer = null;
  }
}

function formatearTiempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function iniciarPasapalabra() {
  stopPasapalabraTimer();
  PasapalabraState.jugando = true;
  PasapalabraState.fecha = pasapalabraFecha();
  PasapalabraState.cola = PASAPALABRA_ABC.slice();
  PasapalabraState.segunda = [];
  PasapalabraState.primeraVuelta = true;
  PasapalabraState.estado = {};
  PasapalabraState.perg = buildPerg();
  PasapalabraState.pergLang = I18N.lang;
  PasapalabraState.aciertos = 0;
  PasapalabraState.fallas = 0;
  PasapalabraState.pasadas = 0;
  PasapalabraState.respondida = false;
  PasapalabraState.tiempo = PASAPALABRA_TIEMPO;
  PasapalabraState.terminada = false;
  PasapalabraState.terminadaPorTiempo = false;
  pasapalabraGuardar();
  renderMainContent();
}

function verLetrasRosca() {
  for (const letra of PASAPALABRA_ABC) {
    if (!(letra in PasapalabraState.estado)) PasapalabraState.estado[letra] = 'pendiente';
  }
}

/* ---------------- Vistas ---------------- */

function viewPasapalabra() {
  const saved = pasapalabraCargar();
  const hoy = pasapalabraFecha();

  if (!PasapalabraState.jugando && saved && saved.fecha === hoy && !saved.terminada) {
    // Reanudar la rosca de hoy a medio juego
    PasapalabraState.jugando = true;
    PasapalabraState.fecha = saved.fecha;
    PasapalabraState.cola = saved.cola || [];
    PasapalabraState.segunda = saved.segunda || [];
    PasapalabraState.primeraVuelta = saved.primeraVuelta !== false;
    PasapalabraState.estado = saved.estado || {};
    PasapalabraState.aciertos = saved.aciertos || 0;
    PasapalabraState.fallas = saved.fallas || 0;
    PasapalabraState.pasadas = saved.pasadas || 0;
    PasapalabraState.respondida = false;
    PasapalabraState.tiempo = saved.tiempo != null ? saved.tiempo : PASAPALABRA_TIEMPO;
    PasapalabraState.terminada = false;
    PasapalabraState.terminadaPorTiempo = false;
    PasapalabraState.perg = buildPerg();
    PasapalabraState.pergLang = I18N.lang;
  }

  if (PasapalabraState.jugando && PasapalabraState.cola.length) {
    return viewPasapalabraJuego();
  }

  if (PasapalabraState.jugando) {
    // La cola quedo vacia: cerrar la rosca
    finalizarPasapalabra();
    return viewPasapalabraResultado();
  }

  if (saved && saved.fecha === hoy && saved.terminada) {
    return viewPasapalabraHecho(saved);
  }

  return viewPasapalabraHome();
}

function viewPasapalabraHome() {
  const record = pasapalabraRecord();
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('pasap_title')}</h2>
      <span class="section-sub">${tr('pasap_desc')}</span>
    </div>

    <div class="card" style="padding:2rem 1.5rem; text-align:center; margin-bottom:1.5rem; background: linear-gradient(135deg, var(--uy-navy), var(--uy-blue)); color:#fff;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🔠</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.4rem; margin-bottom:0.3rem;">${tr('pasap_hoy')} · ${escapeHtml(pasapalabraFecha())}</h3>
      <p style="color:var(--uy-sky-light); font-size:0.88rem; margin-bottom:1.5rem;">${tr('pasap_banco', { n: pasapalabraCountBanco() })} · ⏱ ${tr('pasap_tiempo')}: ${PASAPALABRA_TIEMPO}s</p>
      <button class="btn btn-gold" id="pasap-empezar" style="font-size:1rem; padding:0.75rem 2rem;">${tr('pasap_jugar')}</button>
    </div>

    <div class="card" style="display:flex; align-items:center; gap:1rem; padding:1rem 1.25rem;">
      <div style="font-size:2rem;">🏅</div>
      <div style="flex:1;">
        <div style="font-weight:700; font-family:var(--font-display); font-size:1.05rem;">${tr('pasap_tu_record')}</div>
        <div style="color:var(--text-muted); font-size:0.82rem;">${record ? record.aciertos + ' ' + tr('pasap_de') + ' 26' : tr('pasap_sin_record')}</div>
      </div>
    </div>
  </div>`;
}

function viewPasapalabraHecho(saved) {
  const record = pasapalabraRecord();
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('pasap_title')}</h2>
    </div>

    <div class="card" style="padding:2rem 1.5rem; text-align:center; max-width:440px; margin-bottom:1.2rem;">
      <div style="font-size:2.6rem; margin-bottom:0.5rem;">${medallaPasapalabra(saved.aciertos)}</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:0.3rem;">${tr('pasap_ya_jugada_t')}</h3>
      <div style="font-family:var(--font-display); font-weight:800; font-size:2.6rem; color:var(--accent-dark);">${saved.aciertos} ${tr('pasap_de')} 26</div>
      <button class="btn btn-link-small" id="pasap-ver-resultado" style="margin-top:0.8rem;">${tr('pasap_ver_detalle')}</button>
    </div>

    <div class="card" style="display:flex; align-items:center; gap:1rem; padding:1rem 1.25rem; margin-bottom:1.2rem;">
      <div style="font-size:2rem;">🏅</div>
      <div style="flex:1;">
        <div style="font-weight:700; font-family:var(--font-display); font-size:1.05rem;">${tr('pasap_tu_record')}</div>
        <div style="color:var(--text-muted); font-size:0.82rem;">${record ? record.aciertos + ' ' + tr('pasap_de') + ' 26' : '—'}</div>
      </div>
    </div>

    <div style="text-align:center; color:var(--text-muted); font-size:0.85rem;">${tr('pasap_vuelve')}</div>
  </div>`;
}

function medallaPasapalabra(n) {
  if (n >= 23) return '🏆';
  if (n >= 17) return '🥇';
  if (n >= 11) return '🥈';
  if (n >= 5) return '🥉';
  return '⚽';
}

function roscoBoardHtml() {
  return `<div class="rosco-board">
    ${PASAPALABRA_ABC.map((letra, i) => {
      const est = PasapalabraState.estado[letra] || 'pendiente';
      const esActual = PasapalabraState.cola[0] === letra;
      return `<button class="rosco-chip estado-${est} ${esActual ? 'actual' : ''}" data-letra="${letra}" style="--i:${i}" aria-label="${letra}"><span>${letra}</span></button>`;
    }).join('')}
  </div>`;
}

function viewPasapalabraJuego() {
  const letra = PasapalabraState.cola[0];
  const q = PasapalabraState.perg[letra];
  if (!q) return `<div class="view active">${emptyState('ti-alert-circle', tr('trivia_error_pregunta'))}</div>`;

  verLetrasRosca();
  if (PasapalabraState.pergLang !== I18N.lang) {
    PasapalabraState.perg = buildPerg();
    PasapalabraState.pergLang = I18N.lang;
  }

  return `<div class="view active">
    <div class="rosco-topbar">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-family:var(--font-display); font-weight:700; font-size:1.05rem;">${tr('pasap_contador', { n: PasapalabraState.primeraVuelta ? 1 : 2 })}</span>
        <span class="rosco-pill estado-tipo-${PasapalabraState.primeraVuelta ? 'a' : 'b'}">${PasapalabraState.primeraVuelta ? tr('pasap_primera') : tr('pasap_segunda')}</span>
      </div>
      <div class="rosco-tiempo" id="rosco-tiempo">⏱ ${formatearTiempo(PasapalabraState.tiempo)}</div>
    </div>

    ${roscoBoardHtml()}

    <div class="card rosco-panel">
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.1rem;">
        <div class="rosco-letra-badge">${letra}</div>
        <div style="flex:1; font-size:0.82rem; color:var(--text-muted);">
          ${tr('pasap_empieza_con', { letra })} · ${PasapalabraState.aciertos} ${tr('pasap_aciertos').toLowerCase()}
        </div>
      </div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.12rem; text-align:center; margin-bottom:1.25rem; line-height:1.45;">${escapeHtml(q.q)}</h3>
      <div id="pasap-opciones" style="display:flex; flex-direction:column; gap:0.6rem;">
        ${q.opts.map((op, i) => `
          <button class="trivia-opcion-btn" data-idx="${i}">${escapeHtml(op)}</button>
        `).join('')}
      </div>
      <div id="pasap-feedback" style="margin-top:1rem; text-align:center; font-weight:600; font-size:0.92rem; min-height:1.4rem;"></div>
      <div style="display:flex; gap:0.6rem; margin-top:1rem;">
        <button class="btn" id="pasap-saltar" style="flex:1;">${tr('pasap_salto')}</button>
        <button class="btn" id="pasap-terminar">${tr('pasap_terminar')}</button>
      </div>
    </div>
  </div>`;
}

function viewPasapalabraResultado() {
  const a = PasapalabraState.aciertos;
  const title = PasapalabraState.terminadaPorTiempo ? tr('pasap_se_acabo') : tr('pasap_res_title');
  verLetrasRosca();

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('pasap_title')}</h2>
    </div>

    <div class="card" style="padding:2.2rem 1.5rem; text-align:center; max-width:460px; margin:0 auto 1.2rem;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">${medallaPasapalabra(a)}</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin-bottom:0.3rem;">${title}</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.2rem;">${tr('pasap_res_sub')}</p>
      <div style="font-family:var(--font-display); font-weight:800; font-size:3rem; color:var(--accent-dark);">${a} ${tr('pasap_de')} 26</div>
      <div class="rosco-stats">
        <div class="rosco-stat stat-ok">${tr('pasap_aciertos')}<b>${a}</b></div>
        <div class="rosco-stat stat-bad">${tr('pasap_fallas')}<b>${PasapalabraState.fallas}</b></div>
        <div class="rosco-stat stat-dim">${tr('pasap_pasadas')}<b>${PasapalabraState.pasadas}</b></div>
      </div>
      <div style="margin-top:1.3rem;">
        <button class="btn btn-primary" id="pasap-respuestas-btn">${tr('pasap_ver_respuestas')}</button>
      </div>
    </div>

    <div id="pasap-respuestas" style="display:none;">
      <div class="section-head">
        <h3 class="section-title" style="font-size:1.1rem;">${tr('pasap_respuestas')}</h3>
      </div>
      <div class="rosco-answers">
        ${PASAPALABRA_ABC.map(letra => {
          const q = PasapalabraState.perg[letra];
          const est = PasapalabraState.estado[letra] || 'pendiente';
          return `<div class="rosco-answer estado-${est}">
            <span class="ra-letra">${letra}</span>
            <span class="ra-word">${escapeHtml(q ? q.w : '?')}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

/* ---------------- Acciones ---------------- */

function avanzarPasapalabra() {
  if (PasapalabraState.cola.length) {
    if (State.currentTab === 'pasapalabra') renderMainContent();
    return;
  }
  if (!PasapalabraState.primeraVuelta || !PasapalabraState.segunda.length) {
    finalizarPasapalabra();
    return;
  }
  PasapalabraState.primeraVuelta = false;
  PasapalabraState.cola = PasapalabraState.segunda;
  PasapalabraState.segunda = [];
  if (State.currentTab === 'pasapalabra') renderMainContent();
}

function responderPasapalabra(idx) {
  if (PasapalabraState.respondida || !PasapalabraState.jugando) return;
  PasapalabraState.respondida = true;

  const letra = PasapalabraState.cola[0];
  const q = PasapalabraState.perg[letra];
  const esCorrecta = idx === q.c;

  PasapalabraState.estado[letra] = esCorrecta ? 'acierta' : 'falla';
  if (esCorrecta) PasapalabraState.aciertos++;
  else PasapalabraState.fallas++;
  PasapalabraState.cola.shift();
  pasapalabraGuardar();

  const botones = document.querySelectorAll('#pasap-opciones .trivia-opcion-btn');
  botones.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.c) btn.classList.add('trivia-correcta');
    else if (i === idx && !esCorrecta) btn.classList.add('trivia-incorrecta');
  });

  const feedback = document.getElementById('pasap-feedback');
  feedback.innerHTML = esCorrecta
    ? `<span style="color:var(--win);">${tr('pasap_correcto')}</span>`
    : `<span style="color:var(--loss);">${tr('pasap_incorrecto', { palabra: escapeHtml(q.w) })}</span>`;

  setTimeout(() => {
    PasapalabraState.respondida = false;
    avanzarPasapalabra();
  }, esCorrecta ? 900 : 1500);
}

function saltarPasapalabra() {
  if (PasapalabraState.respondida || !PasapalabraState.jugando) return;
  const letra = PasapalabraState.cola[0];
  PasapalabraState.cola.shift();
  if (PasapalabraState.primeraVuelta) PasapalabraState.segunda.push(letra);
  PasapalabraState.estado[letra] = 'pasada';
  PasapalabraState.pasadas++;
  pasapalabraGuardar();
  avanzarPasapalabra();
}

function finalizarPasapalabra() {
  stopPasapalabraTimer();
  PasapalabraState.jugando = false;
  PasapalabraState.terminada = true;
  PasapalabraState.cola = [];
  verLetrasRosca();
  pasapalabraGuardar();
  pasapalabraGuardarRecord();
  if (State.currentTab === 'pasapalabra') {
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = viewPasapalabraResultado();
    attachResultadoPasapalabraEvents();
  }
}

function terminarPasapalabraModal() {
  openModal(
    tr('pasap_terminar_modal_t'),
    `<p style="font-size:0.9rem;">${tr('pasap_terminar_modal_p', { n: PasapalabraState.aciertos })}</p>`,
    `
    <button class="btn" id="pasap-seguir">${tr('pasap_seguir_jugando')}</button>
    <button class="btn btn-danger" id="pasap-confirmar">${tr('pasap_confirmar_terminar')}</button>
  `);
  document.getElementById('pasap-seguir').onclick = closeModal;
  document.getElementById('pasap-confirmar').onclick = () => {
    closeModal();
    finalizarPasapalabra();
  };
}

/* ---------------- Eventos ---------------- */

function attachPasapalabraEvents() {
  attachResultadoPasapalabraEvents();

  if (!PasapalabraState.jugando) {
    const empezar = document.getElementById('pasap-empezar');
    if (empezar) empezar.onclick = iniciarPasapalabra;
    const verDetalle = document.getElementById('pasap-ver-resultado');
    if (verDetalle) verDetalle.onclick = mostrarResultadoHoy;
    return;
  }

  document.querySelectorAll('#pasap-opciones .trivia-opcion-btn').forEach(btn => {
    btn.onclick = () => responderPasapalabra(Number(btn.dataset.idx));
  });
  const saltar = document.getElementById('pasap-saltar');
  if (saltar) saltar.onclick = saltarPasapalabra;
  const terminar = document.getElementById('pasap-terminar');
  if (terminar) terminar.onclick = terminarPasapalabraModal;

  if (!pasapalabraTimer) {
    pasapalabraTimer = setInterval(() => {
      if (State.currentTab !== 'pasapalabra' || document.getElementById('active-modal')) return;
      PasapalabraState.tiempo--;
      const el = document.getElementById('rosco-tiempo');
      if (el) {
        el.textContent = '⏱ ' + formatearTiempo(PasapalabraState.tiempo);
        el.classList.toggle('warn', PasapalabraState.tiempo <= 20);
      }
      if (PasapalabraState.tiempo <= 0) {
        PasapalabraState.terminadaPorTiempo = true;
        finalizarPasapalabra();
      }
    }, 1000);
  }
}

function attachResultadoPasapalabraEvents() {
  const btn = document.getElementById('pasap-respuestas-btn');
  if (btn) {
    btn.onclick = () => {
      const cont = document.getElementById('pasap-respuestas');
      const visible = cont.style.display !== 'none';
      cont.style.display = visible ? 'none' : 'block';
      btn.textContent = visible ? tr('pasap_ver_respuestas') : tr('pasap_ocultar_respuestas');
    };
  }
}

function mostrarResultadoHoy() {
  const saved = pasapalabraCargar();
  if (!saved) return;
  const main = document.getElementById('main-content');
  main.innerHTML = viewPasapalabraHecho(saved);
  attachPasapalabraEvents();
}