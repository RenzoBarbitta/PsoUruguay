/* ======================================================================
   PSO URUGUAY - TRIVIA FUTBOLERA
   Requiere cuenta de usuario. El ranking es online y se actualiza solo:
   - Con servidor: se guarda en el backend y se refresca cada 5 segundos.
   - Sin servidor: respaldo local en esta computadora.
   ====================================================================== */

const TriviaState = {
  jugando: false,
  preguntaActual: null,
  indicesUsados: [],
  racha: 0,
  mejorRachaSesion: 0,
  respondida: false,
  /* Partida validada en el server (anti-trampa): la racha la cuenta el server */
  serverMode: false,
  sessionToken: null,
  serverScore: 0,
  serverError: false
};

let triviaRankingTimer = null;

function stopTriviaRankingAutoRefresh() {
  if (triviaRankingTimer) {
    clearInterval(triviaRankingTimer);
    triviaRankingTimer = null;
  }
}

function localQ(q) {
  if (I18N.lang === 'pt' && q.pt) {
    return { ...q, q: q.pt, options: q.optPt || q.options };
  }
  return q;
}

function elegirSiguientePregunta() {
  const disponibles = TRIVIA_QUESTIONS
    .map((q, i) => i)
    .filter(i => !TriviaState.indicesUsados.includes(i));

  if (!disponibles.length) {
    // Se acabaron las preguntas: reiniciar el pool pero mantener la racha
    TriviaState.indicesUsados = [];
    return elegirSiguientePregunta();
  }
  const idx = disponibles[Math.floor(Math.random() * disponibles.length)];
  TriviaState.indicesUsados.push(idx);
  return { ...localQ(TRIVIA_QUESTIONS[idx]), _index: idx };
}

/* Pregunta por índice (el server reparte los índices en modo validado) */
function preguntaPorIndice(i) {
  return { ...localQ(TRIVIA_QUESTIONS[i]), _index: i };
}

function viewTrivia() {
  if (!AuthState.user) return viewTriviaLoginRequerido();
  if (!TriviaState.jugando) return viewTriviaInicio();
  return viewTriviaJuego();
}

function viewTriviaLoginRequerido() {
  return `<div class="view active">
    <div class="section-head"><h2 class="section-title">${tr('trivia_title')}</h2></div>
    <div class="card" style="padding:2.5rem 1.5rem; text-align:center; max-width:460px; margin:0 auto;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🧠</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.2rem; margin-bottom:0.5rem;">${tr('trivia_need_account_title')}</h3>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.5rem;">${tr('trivia_need_account_desc')}</p>
      <div style="display:flex; gap:0.6rem;">
        <button class="btn btn-primary btn-block" id="trivia-go-login"><i class="ti ti-login"></i> ${tr('btn_ingresar')}</button>
        <button class="btn btn-gold btn-block" id="trivia-go-signup"><i class="ti ti-user-plus"></i> ${tr('btn_crear_cuenta')}</button>
      </div>
      <span class="auth-link">${tr('trivia_online_note')}</span>
    </div>
  </div>`;
}

function viewTriviaInicio() {
  const nombre = AuthState.user.displayName || AuthState.user.username;
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('trivia_title')}</h2>
      <span class="section-sub">${tr('trivia_jugando_como', { name: escapeHtml(nombre) })}</span>
    </div>

    <div class="card" style="padding:2rem 1.5rem; text-align:center; margin-bottom:1.5rem; background: linear-gradient(135deg, var(--uy-navy), var(--uy-blue)); color:#fff;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🏆</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.4rem; margin-bottom:0.4rem;">${tr('trivia_modo_racha')}</h3>
      <p style="color:var(--uy-sky-light); font-size:0.88rem; margin-bottom:1.5rem;">${tr('trivia_modo_racha_desc')}</p>
      <button class="btn btn-gold" id="trivia-empezar" style="font-size:1rem; padding:0.75rem 2rem;">${tr('trivia_jugar_ahora')}</button>
    </div>

    <div class="section-head">
      <h3 class="section-title" style="font-size:1.15rem;">${tr('trivia_ranking')}</h3>
      <span class="section-sub" style="display:flex; align-items:center; gap:0.3rem;"><i class="ti ti-refresh"></i> ${tr('trivia_autorefresh')}</span>
    </div>
    <div id="trivia-ranking-container">${loadingSpinnerHtml()}</div>
  </div>`;
}

function loadingSpinnerHtml() {
  return `<div class="card" style="padding:2rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">${tr('trivia_cargando')}</div>`;
}

async function cargarRankingTrivia() {
  if (online) {
    try {
      const data = await rankingApi('/api/ranking');
      return (data.ranking || []).map(u => ({
        id: u.id,
        nombre: u.displayName || u.username,
        mejorRacha: u.bestStreak || 0,
        fecha: u.createdAt
      })).filter(e => e.mejorRacha > 0);
    } catch (e) {
      return [];
    }
  }
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, mejorRacha: u.bestStreak || 0, fecha: u.createdAt }))
    .filter(e => e.mejorRacha > 0);
}

async function cargarYRenderizarRankingTrivia() {
  const container = document.getElementById('trivia-ranking-container');
  if (!container) return;
  const ranking = await cargarRankingTrivia();
  ranking.sort((a, b) => b.mejorRacha - a.mejorRacha || a.fecha - b.fecha);
  const top = ranking.slice(0, 10);

  if (!top.length) {
    container.innerHTML = emptyState('ti-trophy-off', tr('trivia_no_players'));
    return;
  }

  container.innerHTML = `<div class="rank-list">
    ${top.map((entry, i) => {
      const esVos = AuthState.user && entry.id === AuthState.user.id;
      return `<div class="rank-item" style="${esVos ? 'border-color: rgba(91,155,213,0.5); background: rgba(91,155,213,0.06);' : ''}">
        <div class="rank-pos">${i + 1}</div>
        <div class="rank-avatar">${entry.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(entry.nombre)} ${esVos ? '<span style="color:var(--accent-dark); font-weight:600; font-size:0.75rem;">' + tr('trivia_vos') + '</span>' : ''}</div>
          <div class="rank-team">${tr('trivia_mejor_racha')}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:1.1rem;">🔥</span>
          <div class="rank-value">${entry.mejorRacha}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function viewTriviaJuego() {
  const q = TriviaState.preguntaActual;
  if (!q) return `<div class="view active">${emptyState('ti-alert-circle', tr('trivia_error_pregunta'))}</div>`;

  const dificultadColor = { facil: 'var(--win)', media: 'var(--gold)', dificil: 'var(--loss)' };
  const dificultadLabel = { facil: tr('trivia_dif_facil'), media: tr('trivia_dif_media'), dificil: tr('trivia_dif_dificil') };

  return `<div class="view active">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:1.3rem;">🔥</span>
        <span style="font-family:var(--font-display); font-weight:700; font-size:1.4rem;">${TriviaState.racha}</span>
        <span style="color:var(--text-muted); font-size:0.8rem;">${tr('trivia_racha_actual')}</span>
      </div>
      <button class="btn btn-sm" id="trivia-abandonar">${tr('trivia_terminar')}</button>
    </div>

    <div class="card" style="padding:1.5rem;">
      <div style="display:flex; justify-content:center; margin-bottom:1rem;">
        <span style="font-size:0.68rem; font-weight:700; color:${dificultadColor[q.dificultad]}; background:${dificultadColor[q.dificultad]}22; padding:0.25rem 0.7rem; border-radius:20px; letter-spacing:0.05em;">${dificultadLabel[q.dificultad]}</span>
      </div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.15rem; text-align:center; margin-bottom:1.5rem; line-height:1.4;">${escapeHtml(q.q)}</h3>
      <div id="trivia-opciones" style="display:flex; flex-direction:column; gap:0.6rem;">
        ${q.options.map((op, i) => `
          <button class="trivia-opcion-btn" data-idx="${i}">${escapeHtml(op)}</button>
        `).join('')}
      </div>
      <div id="trivia-feedback" style="margin-top:1rem; text-align:center; font-weight:600; font-size:0.92rem; min-height:1.4rem;"></div>
    </div>
  </div>`;
}

function attachTriviaEvents() {
  stopTriviaRankingAutoRefresh();

  if (!AuthState.user) {
    const goLogin = document.getElementById('trivia-go-login');
    const goSignup = document.getElementById('trivia-go-signup');
    if (goLogin) goLogin.onclick = () => openAuthModal('login');
    if (goSignup) goSignup.onclick = () => openAuthModal('register');
    return;
  }

  if (!TriviaState.jugando) {
    const empezar = document.getElementById('trivia-empezar');
    if (empezar) empezar.onclick = iniciarPartidaTrivia;
    cargarYRenderizarRankingTrivia();

    // Auto-refresco dinámico del ranking online
    triviaRankingTimer = setInterval(() => {
      if (document.getElementById('trivia-ranking-container')) {
        cargarYRenderizarRankingTrivia();
      } else {
        stopTriviaRankingAutoRefresh();
      }
    }, 5000);
    return;
  }

  // Juego en curso
  document.querySelectorAll('.trivia-opcion-btn').forEach(btn => {
    btn.onclick = () => seleccionarRespuestaTrivia(Number(btn.dataset.idx));
  });
  const abandonar = document.getElementById('trivia-abandonar');
  if (abandonar) abandonar.onclick = terminarPartidaTrivia;
}

async function iniciarPartidaTrivia() {
  TriviaState.jugando = true;
  TriviaState.racha = 0;
  TriviaState.indicesUsados = [];
  TriviaState.respondida = false;
  TriviaState.serverMode = false;
  TriviaState.sessionToken = null;
  TriviaState.serverScore = 0;
  TriviaState.serverError = false;
  TriviaState.preguntaActual = null;
  renderMainContent();

  /* Online: el server reparte las preguntas y valida cada respuesta.
     Si el server no está configurado (not_configured) → flujo clásico. */
  if (online) {
    try {
      const data = await gameApi('/api/game/start', { game: 'trivia' });
      TriviaState.sessionToken = data.token;
      TriviaState.serverMode = true;
      TriviaState.preguntaActual = preguntaPorIndice(data.q);
      renderMainContent();
      return;
    } catch (e) { /* cae al flujo legacy */ }
  }

  TriviaState.preguntaActual = elegirSiguientePregunta();
  renderMainContent();
}

function seleccionarRespuestaTrivia(idx) {
  if (TriviaState.respondida) return;
  TriviaState.respondida = true;

  const q = TriviaState.preguntaActual;
  const esCorrecta = idx === q.correct;
  const botones = document.querySelectorAll('.trivia-opcion-btn');
  botones.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('trivia-correcta');
    else if (i === idx && !esCorrecta) btn.classList.add('trivia-incorrecta');
  });

  const feedback = document.getElementById('trivia-feedback');

  if (esCorrecta) {
    TriviaState.racha++;
    feedback.innerHTML = `<span style="color:var(--win);">${tr('trivia_correcto', { n: TriviaState.racha })}</span>`;
    setTimeout(() => avanzarTrasRespuestaTrivia(idx), 1200);
  } else {
    feedback.innerHTML = `<span style="color:var(--loss);">${tr('trivia_incorrecto', { n: TriviaState.racha })}</span>`;
    setTimeout(() => finalizarPartidaTrivia(), 1600);
  }
}

/* Continúa la partida tras responder. En modo server la próxima pregunta la
   reparte el server y la racha la cuenta él: el cliente no declara aciertos. */
async function avanzarTrasRespuestaTrivia(idx) {
  if (TriviaState.serverMode && TriviaState.sessionToken) {
    try {
      const res = await gameApi('/api/game/answer', { token: TriviaState.sessionToken, a: idx });
      TriviaState.sessionToken = res.token;
      TriviaState.serverScore = res.s;
      if (res.over) return finalizarPartidaTrivia();
      TriviaState.respondida = false;
      TriviaState.preguntaActual = preguntaPorIndice(res.next);
      renderMainContent();
      return;
    } catch (e) {
      /* Falló la red con sesión validada: no se puede guardar de forma
         verificable, así que no se guarda (el record local sí queda). */
      TriviaState.jugando = false;
      TriviaState.respondida = false;
      toast(tr('trivia_save_error'), 'error');
      renderMainContent();
      return;
    }
  }
  TriviaState.respondida = false;
  TriviaState.preguntaActual = elegirSiguientePregunta();
  renderMainContent();
}

async function guardarPuntajeTrivia(racha) {
  if (!AuthState.user) return { saved: false, record: false };

  if (online) {
    try {
      const data = await rankingApi('/api/ranking', { bestStreak: racha });
      if (data.user) {
        AuthState.user = data.user;
        localStorage.setItem('pso_user', JSON.stringify(data.user));
      }
      return { saved: true, record: racha > 0 };
    } catch (e) {
      return { saved: false, record: false };
    }
  }

  // Modo local
  const users = getLocalUsers();
  const me = users.find(u => u.id === AuthState.user.id);
  if (me && racha > (me.bestStreak || 0)) {
    me.bestStreak = racha;
    saveLocalUsers(users);
  }
  return { saved: true, record: racha > 0 };
}

async function finalizarPartidaTrivia() {
  let rachaFinal = TriviaState.racha;
  TriviaState.jugando = false;
  TriviaState.preguntaActual = null;

  if (online && TriviaState.serverMode && TriviaState.sessionToken) {
    try {
      const res = await gameApi('/api/game/finish', { token: TriviaState.sessionToken });
      /* La racha oficial es la que contó el server */
      if (typeof res.score === 'number') rachaFinal = res.score;
      if (res.user) {
        AuthState.user = res.user;
        localStorage.setItem('pso_user', JSON.stringify(res.user));
      }
      TriviaState.sessionToken = null;
    } catch (e) {
      /* Si el finish falló por lo que sea, igual intentamos guardar el
         puntaje directo en el ranking: el score no se tiene que perder. */
      const r = await guardarPuntajeTrivia(rachaFinal);
      if (e.code !== 'not_configured' && !r.saved) toast(tr('trivia_save_error'), 'error');
    }
  } else {
    await guardarPuntajeTrivia(rachaFinal);
  }

  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view active">
    <div class="card" style="padding:2.5rem 1.5rem; text-align:center; max-width:420px; margin:0 auto;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">${rachaFinal >= 10 ? '🏆' : rachaFinal >= 5 ? '🎉' : '⚽'}</div>
      <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin-bottom:0.3rem;">${tr('trivia_partida_terminada')}</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">${tr('trivia_tu_racha')}</p>
      <div style="font-family:var(--font-display); font-weight:800; font-size:3rem; color:var(--accent-dark); margin-bottom:1.5rem;">${rachaFinal} 🔥</div>
      <div style="display:flex; gap:0.6rem; justify-content:center;">
        <button class="btn" id="trivia-volver">${tr('trivia_ver_ranking')}</button>
        <button class="btn btn-primary" id="trivia-jugar-de-nuevo">🔁 ${tr('trivia_jugar_de_nuevo')}</button>
      </div>
    </div>
  </div>`;

  document.getElementById('trivia-volver').onclick = () => renderMainContent();
  document.getElementById('trivia-jugar-de-nuevo').onclick = () => iniciarPartidaTrivia();
}

function terminarPartidaTrivia() {
  openModal(tr('trivia_terminar_modal_title'), `<p style="font-size:0.9rem;">${tr('trivia_terminar_modal_desc', { n: TriviaState.racha })}</p>`, `
    <button class="btn" id="trivia-seguir-jugando">${tr('trivia_seguir_jugando')}</button>
    <button class="btn btn-danger" id="trivia-confirmar-salir">${tr('trivia_confirmar_salir')}</button>
  `);
  document.getElementById('trivia-seguir-jugando').onclick = closeModal;
  document.getElementById('trivia-confirmar-salir').onclick = () => {
    closeModal();
    finalizarPartidaTrivia();
  };
}