/* ======================================================================
   PSO URUGUAY - PENALES ONLINE
   Tanda de penales contra un arquero que se tira al azar.
   - Requiere cuenta de usuario. El ranking es online y se actualiza solo.
   - Cada gol sube el nivel: el tiempo de reaccion para rematar baja.
   - El arquero elige un palo random (izquierda, centro o derecha).
   - Si adivina tu palo o se te acaba el tiempo: termina la tanda.
   ====================================================================== */

const PenalesState = {
  jugando: false,
  nivel: 1,          // nivel de dificultad de la tanda actual
  goles: 0,          // goles convertidos seguidos (racha de la tanda)
  restante: 3500,    // ms restantes para rematar el penal en curso
  respondida: false, // ya se ejecuto el penal en curso
  zona: null,        // zona elegida por el jugador ('izq' | 'cen' | 'der')
  arqueroZona: null, // zona del arquero
  resultado: null,   // 'gol' | 'atajada' | 'sin_tiempo'
  _nuevoRecord: false,
  /* Partida validada en el server (anti-trampa) */
  serverMode: false,
  sessionToken: null,
  serverScore: 0,
  serverError: false
};

const PENALES_ZONAS = ['izq', 'cen', 'der'];
const PENALES_TIEMPO_BASE = 3500; // ms para el nivel 1
const PENALES_TIEMPO_MIN = 1000;  // piso de tiempo (no baja de 1s)
const PENALES_DECREMENTO = 150;   // ms que se pierden por cada gol
const PENALES_RECORD_KEY = 'pso_penales_record';

let penalTimer = null;
let penalRankingTimer = null;

function stopPenalesTimer() {
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null; }
}

function stopPenalesRankingAutoRefresh() {
  if (penalRankingTimer) { clearInterval(penalRankingTimer); penalRankingTimer = null; }
}

function tiempoLimitePenales(nivel) {
  return Math.max(PENALES_TIEMPO_MIN, PENALES_TIEMPO_BASE - (nivel - 1) * PENALES_DECREMENTO);
}

function penalZonaLabel(z) {
  const t = tr('penales_zona_' + z);
  return z === 'izq' ? '⬅️ ' + t : z === 'der' ? t + ' ➡️' : t;
}

function penalZonaCorto(z) {
  return tr('penales_zona_' + z);
}

/* ---------------- Ranking y records ---------------- */

function penalRecordLocal() {
  try { return Number(localStorage.getItem(PENALES_RECORD_KEY)) || 0; } catch (e) { return 0; }
}

function penalGuardarRecordLocal(n) {
  let nuevo = false;
  try {
    if (n > penalRecordLocal()) {
      localStorage.setItem(PENALES_RECORD_KEY, String(n));
      nuevo = true;
    }
  } catch (e) {}
  return nuevo;
}

async function cargarRankingPenales() {
  /* El ranking SIEMPRE se lee del server si hay red: es la fuente de la verdad.
     La bandera `online` del heartbeat puede quedar vieja y hacía clavar la
     vista en los datos del navegador aunque la DB tuviera otros valores. */
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/penales');
      return (data.ranking || []).map(u => ({
        id: u.id,
        nombre: u.displayName || u.username,
        racha: u.bestPenalStreak || 0,
        fecha: u.createdAt
      })).filter(e => e.racha > 0);
    } catch (e) { /* sin red → caemos a los locales */ }
  }
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, racha: u.bestPenalStreak || 0, fecha: u.createdAt }))
    .filter(e => e.racha > 0);
}

async function cargarYRenderizarRankingPenales() {
  const container = document.getElementById('penales-ranking-container');
  if (!container) return;
  const ranking = await cargarRankingPenales();
  ranking.sort((a, b) => b.racha - a.racha || a.fecha - b.fecha);
  const top = ranking.slice(0, 10);

  if (!top.length) {
    container.innerHTML = emptyState('ti-trophy-off', tr('penales_no_players'));
    return;
  }

  container.innerHTML = `<div class="rank-list">
    ${top.map((e, i) => {
      const vos = AuthState.user && e.id === AuthState.user.id;
      return `<div class="rank-item" style="${vos ? 'border-color: rgba(91,155,213,0.5); background: rgba(91,155,213,0.06);' : ''}">
        <div class="rank-pos">${i + 1}</div>
        <div class="rank-avatar">${e.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(e.nombre)} ${vos ? '<span style="color:var(--accent-dark); font-weight:600; font-size:0.75rem;">' + tr('penales_vos') + '</span>' : ''}</div>
          <div class="rank-team">${tr('penales_mejor_racha')}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:1.1rem;">⚽</span>
          <div class="rank-value">${e.racha}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

async function guardarRecordPenales(racha, prevBest) {
  if (!AuthState.user) return { saved: false, record: false };
  const base = prevBest !== undefined ? prevBest : (AuthState.user.bestPenalStreak || 0);
  const esRecord = racha > base;

  /* Siempre intentar el server primero (aunque el heartbeat diga offline):
     si hay red, el puntaje llega a la DB que es la única fuente del ranking. */
  try {
    const data = await rankingApi('/api/ranking/penales', { bestPenalStreak: racha });
    if (data.user) {
      AuthState.user = data.user;
      localStorage.setItem('pso_user', JSON.stringify(data.user));
    }
    return { saved: true, record: esRecord };
  } catch (e) {
    /* Sin red: guardado local (legacy) para no perder el récord. */
    const users = getLocalUsers();
    const me = users.find(u => u.id === AuthState.user.id);
    if (me && racha > (me.bestPenalStreak || 0)) {
      me.bestPenalStreak = racha;
      saveLocalUsers(users);
    }
    return { saved: false, record: esRecord };
  }
}

/* Actualiza la tarjeta "Mejor racha" con el valor REAL del ranking online.
   El récord guardado en pso_penales_record es solo del navegador y quedaba
   clavado en un máximo viejo aunque el ranking mostrara otro. Cuando hay
   conexión, también refresca AuthState.user.bestPenalStreak para que los
   "¿es récord?" de la tanda se comparen contra el valor de la DB. */
async function sincronizarMejorRachaPenales() {
  const val = document.getElementById('penales-mejor-racha-val');
  if (!val) return;
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/penales');
      const yo = (data.ranking || []).find(u => u.id === AuthState.user.id);
      const racha = yo ? yo.bestPenalStreak : 0;
      if (yo) {
        AuthState.user.bestPenalStreak = racha;
        localStorage.setItem('pso_user', JSON.stringify(AuthState.user));
      }
      val.innerHTML = racha > 0 ? racha + ' ⚽ ' + tr('penales_goles').toLowerCase() : tr('penales_no_players');
      return;
    } catch (e) { /* cae al récord local */ }
  }
  const record = penalRecordLocal();
  val.innerHTML = record > 0 ? record + ' ⚽ ' + tr('penales_goles').toLowerCase() : tr('penales_no_players');
}

/* ---------------- Timer de reaccion ---------------- */

function actualizarBarraPenal(limite) {
  const bar = document.getElementById('penal-timer-bar');
  if (!bar) return;
  const pct = Math.max(0, Math.min(100, (PenalesState.restante / limite) * 100));
  bar.style.width = pct + '%';
  bar.classList.toggle('warn', pct < 25);
}

function iniciarPenalTimer() {
  stopPenalesTimer();
  penalTimer = setInterval(() => {
    if (State.currentTab !== 'penales' || document.getElementById('active-modal')) return;
    if (!PenalesState.jugando || PenalesState.respondida) return;
    PenalesState.restante -= 50;
    if (PenalesState.restante <= 0) {
      PenalesState.restante = 0;
      stopPenalesTimer();
      ejecutarTiroPenales(null); // se acabo el tiempo: sin remate
      return;
    }
    actualizarBarraPenal(tiempoLimitePenales(PenalesState.nivel));
  }, 50);
}

/* ---------------- Acciones ---------------- */

async function iniciarPenales() {
  stopPenalesTimer();
  PenalesState.jugando = true;
  PenalesState.nivel = 1;
  PenalesState.goles = 0;
  PenalesState.restante = tiempoLimitePenales(1);
  PenalesState.respondida = false;
  PenalesState.zona = null;
  PenalesState.arqueroZona = null;
  PenalesState.resultado = null;
  PenalesState._nuevoRecord = false;
  PenalesState.serverMode = false;
  PenalesState.sessionToken = null;
  PenalesState.serverScore = 0;
  PenalesState.serverError = false;
  PenalesState.finalizando = false;
  renderMainContent();

  /* Online: cada tiro lo valida el server (piso de tiempo anti-autoplay).
     Si el server no está configurado (not_configured) → flujo clásico. */
  if (online) {
    try {
      const data = await gameApi('/api/game/start', { game: 'penales' });
      PenalesState.sessionToken = data.token;
      PenalesState.serverMode = true;
    } catch (e) { /* cae al flujo legacy */ }
  }

  /* El "¿es récord?" se decide contra el mejor valor REAL de la DB (el del
     login arranca en 0 y hacía que siempre marcara "nuevo récord"). */
  PenalesState.prevBest = await obtenerMejorRachaPenalesServer();
}

/* Mejor racha actual del jugador en la DB. Sin red → lo que tenga la sesión. */
async function obtenerMejorRachaPenalesServer() {
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/penales');
      const yo = (data.ranking || []).find(u => u.id === AuthState.user.id);
      if (yo) return yo.bestPenalStreak;
    } catch (e) { /* sin red → sesión */ }
  }
  return AuthState.user ? Number(AuthState.user.bestPenalStreak || 0) : 0;
}

function elegirArquero() {
  return PENALES_ZONAS[Math.floor(Math.random() * PENALES_ZONAS.length)];
}

function ejecutarTiroPenales(zona) {
  stopPenalesTimer();
  if (!PenalesState.jugando || PenalesState.respondida) return;
  PenalesState.respondida = true;

  const arquero = elegirArquero();
  PenalesState.arqueroZona = arquero;
  PenalesState.zona = zona;

  const esGol = zona !== null && zona !== arquero;
  PenalesState.resultado = esGol ? 'gol' : (zona === null ? 'sin_tiempo' : 'atajada');
  if (esGol) {
    PenalesState.goles++;
    PenalesState.nivel = PenalesState.goles + 1;
  }

  /* Modo server: cada tiro lo valida el backend (piso de tiempo anti-autoplay).
     La racha oficial la cuenta el server, el cliente solo la informa. */
  if (PenalesState.serverMode && PenalesState.sessionToken) {
    gameApi('/api/game/kick', { token: PenalesState.sessionToken, result: PenalesState.resultado }).then(res => {
      PenalesState.sessionToken = res.token;
      PenalesState.serverScore = res.s;
      /* too_fast: el server descartó este gol (ritmo) → realineamos el conteo
         local con el del server para que no quede un gol fantasma. */
      if (res.reason === 'too_fast') PenalesState.goles = res.s;
    }).catch(() => { PenalesState.serverError = true; });
  }

  document.querySelectorAll('.penal-zona').forEach(b => { b.disabled = true; });

  const keeper = document.getElementById('penal-keeper');
  if (keeper) keeper.className = 'penal-keeper dive-' + arquero;

  const ball = document.getElementById('penal-ball');
  if (ball) {
    ball.className = 'penal-ball ' + (esGol ? 'ball-gol-' + zona : 'ball-save-' + arquero);
  }

  const feedback = document.getElementById('penal-feedback');
  if (feedback) {
    if (esGol) {
      feedback.innerHTML = `<span style="color:var(--win);">${tr('penales_gol')}</span>`;
    } else if (zona === null) {
      feedback.innerHTML = `<span style="color:var(--loss);">${tr('penales_sin_tiempo')}</span>`;
    } else {
      feedback.innerHTML = `<span style="color:var(--loss);">${tr('penales_atajada', { zona: penalZonaCorto(arquero) })}</span>`;
    }
  }

  if (esGol) {
    setTimeout(() => {
      /* Límite de tanda: a los 100 penales convertidos se corta la partida. */
      if (PenalesState.goles >= 100) return finalizarPenales();
      const sig = document.getElementById('penales-siguiente');
      if (sig) sig.style.display = 'inline-flex';
    }, 900);
  } else {
    setTimeout(() => finalizarPenales(), 1700);
  }
}

function siguientePenal() {
  if (!PenalesState.jugando) return;
  PenalesState.respondida = false;
  PenalesState.restante = tiempoLimitePenales(PenalesState.nivel);
  renderMainContent();
}

async function finalizarPenales() {
  if (PenalesState.finalizando) return;
  PenalesState.finalizando = true;
  stopPenalesTimer();
  let racha = PenalesState.goles;
  const prevBest = (PenalesState.prevBest !== undefined ? PenalesState.prevBest : (AuthState.user ? Number(AuthState.user.bestPenalStreak || 0) : 0));
  let esRecordOnline = false;

  if (PenalesState.serverMode && PenalesState.sessionToken && !PenalesState.serverError) {
    try {
      const res = await gameApi('/api/game/finish', { token: PenalesState.sessionToken });
      /* La racha oficial es la que contó el server */
      if (typeof res.score === 'number') racha = res.score;
      if (res.user) {
        AuthState.user = res.user;
        localStorage.setItem('pso_user', JSON.stringify(res.user));
      }
      PenalesState.sessionToken = null;
      esRecordOnline = racha > prevBest && racha > 0;
    } catch (e) {
      /* Si el finish falló por lo que sea, igual intentamos guardar el
         puntaje directo en el ranking: el score no se tiene que perder. */
      const r = await guardarRecordPenales(racha, prevBest);
      if (e.code !== 'not_configured' && !r.saved) toast(tr('penales_save_error'), 'error');
    }
  } else {
    esRecordOnline = (await guardarRecordPenales(racha, prevBest)).record;
  }

  const esRecordLocal = penalGuardarRecordLocal(racha);
  PenalesState.jugando = false;
  PenalesState.respondida = false;
  PenalesState._nuevoRecord = (esRecordOnline || esRecordLocal) && racha > 0;

  if (State.currentTab === 'penales') {
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = viewPenalesResultado();
    attachResultadoPenalesEvents();
  }
}

function terminarTandaModal() {
  openModal(
    tr('penales_terminar_modal_t'),
    `<p style="font-size:0.9rem;">${tr('penales_terminar_modal_p', { n: PenalesState.goles })}</p>`,
    `
    <button class="btn" id="penales-seguir">${tr('penales_seguir_jugando')}</button>
    <button class="btn btn-danger" id="penales-confirmar">${tr('penales_confirmar_terminar')}</button>
  `);
  document.getElementById('penales-seguir').onclick = closeModal;
  document.getElementById('penales-confirmar').onclick = () => {
    closeModal();
    finalizarPenales();
  };
}

/* ---------------- Vistas ---------------- */

function penalZonaHtml(z) {
  return `<button class="penal-zona" data-zona="${z}">${penalZonaLabel(z)}</button>`;
}

function viewPenales() {
  if (!AuthState.user) return viewPenalesLoginRequerido();
  if (!PenalesState.jugando) return viewPenalesInicio();
  return viewPenalesJuego();
}

function viewPenalesLoginRequerido() {
  return `<div class="view active">
    <div class="section-head"><h2 class="section-title">${tr('penales_title')}</h2></div>
    <div class="card" style="padding:2.5rem 1.5rem; text-align:center; max-width:460px; margin:0 auto;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🥅</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.2rem; margin-bottom:0.5rem;">${tr('penales_need_account_title')}</h3>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.5rem;">${tr('penales_need_account_desc')}</p>
      <div style="display:flex; gap:0.6rem;">
        <button class="btn btn-primary btn-block" id="penales-go-login"><i class="ti ti-login"></i> ${tr('btn_ingresar')}</button>
        <button class="btn btn-gold btn-block" id="penales-go-signup"><i class="ti ti-user-plus"></i> ${tr('btn_crear_cuenta')}</button>
      </div>
      <span class="auth-link">${tr('penales_online_note')}</span>
    </div>
  </div>`;
}

function viewPenalesInicio() {
  const nombre = AuthState.user.displayName || AuthState.user.username;
  const record = penalRecordLocal();
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('penales_title')}</h2>
      <span class="section-sub">${tr('penales_jugando_como', { name: escapeHtml(nombre) })}</span>
    </div>

    <div class="card" style="padding:2rem 1.5rem; text-align:center; margin-bottom:1.5rem; background: linear-gradient(135deg, var(--uy-navy), var(--uy-blue)); color:#fff;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🥅</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.4rem; margin-bottom:0.4rem;">${tr('penales_title')}</h3>
      <p style="color:var(--uy-sky-light); font-size:0.88rem; margin-bottom:1.5rem;">${tr('penales_desc')}</p>
      <button class="btn btn-gold" id="penales-empezar" style="font-size:1rem; padding:0.75rem 2rem;">${tr('penales_jugar')}</button>
      <details class="penal-como">
        <summary>${tr('penales_como_funciona_t')}</summary>
        <p>${tr('penales_como_funciona_p')}</p>
      </details>
    </div>

    <div class="card" style="display:flex; align-items:center; gap:1rem; padding:1rem 1.25rem; margin-bottom:1.5rem;">
      <div style="font-size:2rem;">🎯</div>
      <div style="flex:1;">
        <div style="font-weight:700; font-family:var(--font-display); font-size:1.05rem;">${tr('penales_mejor_racha')}</div>
        <div id="penales-mejor-racha-val" style="color:var(--text-muted); font-size:0.82rem;">${record > 0 ? record + ' ⚽ ' + tr('penales_goles').toLowerCase() : tr('penales_no_players')}</div>
      </div>
    </div>

    <div class="section-head">
      <h3 class="section-title" style="font-size:1.15rem;">${tr('penales_ranking')}</h3>
      <span class="section-sub" style="display:flex; align-items:center; gap:0.3rem;"><i class="ti ti-refresh"></i> ${tr('penales_autorefresh')}</span>
    </div>
    <div id="penales-ranking-container">${loadingSpinnerHtml()}</div>
  </div>`;
}

function viewPenalesJuego() {
  const nivel = PenalesState.nivel;
  const limite = tiempoLimitePenales(nivel);
  return `<div class="view active">
    <div class="penal-topbar">
      <div class="penal-level">
        <span class="penal-nivel">${tr('penales_nivel', { n: nivel })}</span>
        <span class="penal-sublevel">· ${tr('penales_time_reaction')} ${tr('penales_seg', { t: (limite / 1000).toFixed(1).replace('.', ',') })}</span>
      </div>
      <div class="penal-goals"><span>${tr('penales_goles')}</span><b id="penal-goles">${PenalesState.goles}</b></div>
      <button class="btn btn-sm" id="penales-terminar">${tr('penales_terminar')}</button>
    </div>

    <div class="card penal-card">
      <div class="penal-pitch">
        <div class="penal-goal">
          <div class="penal-keeper" id="penal-keeper"><span class="keeper-gloves">🧤</span></div>
        </div>
        <div class="penal-spot"></div>
        <div class="penal-ball spotbob" id="penal-ball"></div>
      </div>
      <div class="penal-feedback" id="penal-feedback">${tr('penales_remata')}</div>
      <div class="penal-timer"><div class="penal-timer-bar" id="penal-timer-bar"></div></div>
      <div class="penal-acciones" id="penal-acciones">
        ${PENALES_ZONAS.map(penalZonaHtml).join('')}
      </div>
      <div style="text-align:center; margin-top:1rem;">
        <button class="btn btn-primary" id="penales-siguiente" style="display:none;">${tr('penales_siguiente')}</button>
      </div>
    </div>
  </div>`;
}

function viewPenalesResultado() {
  const racha = PenalesState.goles;
  return `<div class="view active">
    <div class="card" style="padding:2.5rem 1.5rem; text-align:center; max-width:460px; margin:0 auto;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">${racha >= 10 ? '🏆' : racha >= 5 ? '🎉' : '🥅'}</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin-bottom:0.3rem;">${tr('penales_fin')}</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.2rem;">${tr('penales_tu_racha', { n: racha })}</p>
      <div style="font-family:var(--font-display); font-weight:800; font-size:3rem; color:var(--accent-dark); margin-bottom:1.5rem;">${racha} ⚽</div>
      ${PenalesState._nuevoRecord ? `<div style="font-weight:700; color:var(--gold); margin-bottom:1.2rem;">${tr('penales_nuevo_record')}</div>` : ''}
      <div style="display:flex; gap:0.6rem; justify-content:center;">
        <button class="btn" id="penales-volver">${tr('penales_ver_ranking')}</button>
        <button class="btn btn-primary" id="penales-jugar-de-nuevo">🔁 ${tr('penales_jugar_de_nuevo')}</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- Eventos ---------------- */

function attachResultadoPenalesEvents() {
  const volver = document.getElementById('penales-volver');
  if (volver) volver.onclick = () => {
    /* Al volver a la home el ranking se recarga al toque para reflejar
       el récord recién guardado (además del auto-refresh de 5s). */
    renderMainContent();
  };
  const deNuevo = document.getElementById('penales-jugar-de-nuevo');
  if (deNuevo) deNuevo.onclick = iniciarPenales;
}

function attachPenalesEvents() {
  attachResultadoPenalesEvents();
  stopPenalesRankingAutoRefresh();

  if (!AuthState.user) {
    const goLogin = document.getElementById('penales-go-login');
    const goSignup = document.getElementById('penales-go-signup');
    if (goLogin) goLogin.onclick = () => openAuthModal('login');
    if (goSignup) goSignup.onclick = () => openAuthModal('register');
    return;
  }

  if (!PenalesState.jugando) {
    const empezar = document.getElementById('penales-empezar');
    if (empezar) empezar.onclick = iniciarPenales;
    cargarYRenderizarRankingPenales();
    sincronizarMejorRachaPenales();
    penalRankingTimer = setInterval(() => {
      if (document.getElementById('penales-ranking-container')) {
        cargarYRenderizarRankingPenales();
        sincronizarMejorRachaPenales();
      } else {
        stopPenalesRankingAutoRefresh();
      }
    }, 5000);
    return;
  }

  document.querySelectorAll('.penal-zona').forEach(btn => {
    btn.onclick = () => ejecutarTiroPenales(btn.dataset.zona);
  });
  const siguiente = document.getElementById('penales-siguiente');
  if (siguiente) siguiente.onclick = siguientePenal;
  const terminar = document.getElementById('penales-terminar');
  if (terminar) terminar.onclick = terminarTandaModal;

  iniciarPenalTimer();
  actualizarBarraPenal(tiempoLimitePenales(PenalesState.nivel));
}