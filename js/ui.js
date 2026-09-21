/* ======================================================================
   PSO URUGUAY - INTERFAZ BASE
   shell, tabs, modal, toast y helpers compartidos
   ====================================================================== */

function saveTheme() {
  localStorage.setItem('pso_theme', State.theme);
  document.documentElement.setAttribute('data-theme', State.theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = State.theme === 'dark' ? '☀️' : '🌙';
}

function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type === 'success' ? 'ti-circle-check' : type === 'error' ? 'ti-alert-circle' : 'ti-info-circle';
  el.innerHTML = `<i class="ti ${icon}"></i><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function emptyState(icon, text) {
  return `<div class="card empty-state"><i class="ti ${icon}"></i><p>${text}</p></div>`;
}

function teamInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function teamDotHtml(team, extraClass) {
  if (!team) return `<div class="team-dot ${extraClass || ''}">?</div>`;
  if (team.logo) return `<div class="team-dot ${extraClass || ''}"><img src="${team.logo}" alt=""></div>`;
  return `<div class="team-dot ${extraClass || ''}">${teamInitials(team.name)}</div>`;
}

function initialsOf(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ---------------- APP SHELL ---------------- */

function renderShell() {
  const app = document.getElementById('app');
  const user = AuthState.user;

  app.innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <img src="${window.PSO_LOGO_URL}" alt="logo">
          <div class="brand-text">PSO Uruguay<span>PRO SOCCER ONLINE</span></div>
        </div>
        <div class="topbar-spacer"></div>
        ${langSwitchHtml()}
        <button class="icon-btn" id="theme-toggle" aria-label="${tr('aria_theme')}">
          <span id="theme-icon" style="font-size:1.1rem;">${State.theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
        ${user ? `
          <div class="user-chip" title="${tr('title_playing_as', { name: user.username })}">
            <span class="user-avatar">${initialsOf(user.displayName || user.username)}</span>
            <span class="user-chip-name">${escapeHtml(user.displayName || user.username)}</span>
          </div>
          <button class="icon-btn" id="logout-btn" aria-label="${tr('aria_logout')}" style="font-size:1.1rem;">🚪</button>
        ` : `
          <button class="icon-btn" id="auth-btn" aria-label="${tr('aria_auth')}" style="font-size:1.15rem;">👤</button>
        `}
        ${State.isAdmin ? `
          <button class="admin-pill" id="go-admin-btn">🛡️ ${tr('admin_pill')}</button>
        ` : `
          <button class="icon-btn" id="login-btn" aria-label="${tr('aria_admin_login')}" style="font-size:1.15rem;">🔒</button>
        `}
      </div>
      <nav class="tabs-nav">
        <div class="tabs-nav-inner" id="tabs-nav-inner">
          ${tabButton('inicio', 'ti-home', tr('tab_inicio'))}
          ${tabButton('fixture', 'ti-calendar-event', tr('tab_fixture'))}
          ${hasActiveLigas() ? tabButton('tabla', 'ti-table', tr('tab_tabla')) : ''}
          ${tabButton('estadisticas', 'ti-chart-bar', tr('tab_estadisticas'))}
          ${tabButton('palmares', 'ti-trophy', tr('tab_palmares'))}
          ${tabButton('trivia', 'ti-brain', tr('tab_trivia'))}
          ${tabButton('pasapalabra', 'ti-alphabet-latin', tr('tab_pasapalabra'))}
          ${tabButton('penales', 'ti-ball-football', tr('tab_penales'))}
          ${State.isAdmin ? tabButton('admin', 'ti-settings', tr('tab_admin')) : ''}
        </div>
      </nav>
    </div>
    <main id="main-content"></main>
  `;

  document.getElementById('theme-toggle').onclick = () => {
    State.theme = State.theme === 'dark' ? 'light' : 'dark';
    saveTheme();
  };

  if (user) {
    document.getElementById('logout-btn').onclick = doLogout;
  } else {
    document.getElementById('auth-btn').onclick = openAuthModal;
  }

  if (State.isAdmin) {
    document.getElementById('go-admin-btn').onclick = () => switchTab('admin');
  } else {
    document.getElementById('login-btn').onclick = openLoginModal;
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  initLangButtons();
}

function tabButton(id, icon, label) {
  return `<button class="tab-btn ${State.currentTab === id ? 'active' : ''}" data-tab="${id}"><i class="ti ${icon}"></i>${label}</button>`;
}

function switchTab(tab) {
  if (tab === 'admin' && !State.isAdmin) { openLoginModal(); return; }
  State.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderMainContent();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function doLogout() {
  stopTriviaRankingAutoRefresh();
  stopPenalesRankingAutoRefresh();
  stopPenalesTimer();
  if (State.isAdmin) {
    State.isAdmin = false;
    sessionStorage.removeItem('pso_admin');
    sessionStorage.removeItem('pso_admin_token');
  }
  if (AuthState.user) {
    logoutUser();
  }
  TriviaState.jugando = false;
  TriviaState.preguntaActual = null;
  PenalesState.jugando = false;
  PenalesState.respondida = false;
  State.currentTab = 'inicio';
  renderShell();
  renderMainContent();
  toast(tr('toast_logout'));
}

/* ---------------- ROUTER ---------------- */

function renderMainContent() {
  const main = document.getElementById('main-content');
  if (!main) return;
  switch (State.currentTab) {
    case 'inicio': main.innerHTML = viewInicio(); break;
    case 'fixture': main.innerHTML = viewFixture(); attachFixtureEvents(); break;
    case 'tabla': main.innerHTML = viewTabla(); attachTablaEvents(); break;
    case 'estadisticas': main.innerHTML = viewEstadisticas(); attachEstadisticasEvents(); break;
    case 'palmares': main.innerHTML = viewPalmares(); break;
    case 'trivia': main.innerHTML = viewTrivia(); attachTriviaEvents(); break;
    case 'pasapalabra': main.innerHTML = viewPasapalabra(); attachPasapalabraEvents(); break;
    case 'penales': main.innerHTML = viewPenales(); attachPenalesEvents(); break;
    case 'admin': main.innerHTML = viewAdmin(); attachAdminEvents(); break;
    default: main.innerHTML = viewInicio();
  }
}

function renderAll() {
  if (!document.getElementById('app').classList.contains('show')) return;
  renderMainContent();
}

/* ---------------- MODAL SYSTEM ---------------- */

function openModal(title, bodyHtml, footerHtml) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" id="modal-close-btn"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-close-btn').onclick = closeModal;
  return overlay;
}

function closeModal() {
  const existing = document.getElementById('active-modal');
  if (existing) {
    existing.classList.remove('show');
    setTimeout(() => existing.remove(), 200);
  }
}