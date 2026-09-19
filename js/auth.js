/* ======================================================================
   PSO URUGUAY - CUENTAS DE USUARIO Y AUTENTICACIÓN
   - Cuentas de usuario para el ranking (online o modo local)
   - Login del administrador (mantiene el comportamiento original)
   ====================================================================== */

const AuthState = {
  token: localStorage.getItem('pso_token') || null,
  user: (() => {
    try { return JSON.parse(localStorage.getItem('pso_user') || 'null'); }
    catch (e) { return null; }
  })()
};

function saveAuth(user, token) {
  AuthState.user = user;
  AuthState.token = token;
  if (token) localStorage.setItem('pso_token', token); else localStorage.removeItem('pso_token');
  if (user) localStorage.setItem('pso_user', JSON.stringify(user)); else localStorage.removeItem('pso_user');
}

function refreshShellAfterAuth() {
  renderShell();
  renderMainContent();
}

/* ---------------- Modo local (sin servidor) ---------------- */

function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem('pso_local_users') || '[]'); }
  catch (e) { return []; }
}

function saveLocalUsers(arr) {
  localStorage.setItem('pso_local_users', JSON.stringify(arr));
}

function localFindUser(username) {
  const name = String(username || '').trim().toLowerCase();
  return getLocalUsers().find(u => u.username === name);
}

function localUserSignup(username, password, displayName) {
  const name = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    throw new Error(tr('err_username_format'));
  }
  if (!password || String(password).length < 4) {
    throw new Error(tr('err_password_short'));
  }
  const users = getLocalUsers();
  if (users.some(u => u.username === name)) {
    throw new Error(tr('err_username_taken'));
  }
  const user = {
    id: uid('u'),
    username: name,
    displayName: String(displayName || '').trim() || name,
    bestStreak: 0,
    bestPenalStreak: 0,
    createdAt: Date.now()
  };
  users.push(user);
  saveLocalUsers(users);
  localStorage.setItem('pso_local_pass_' + name, String(password));
  saveAuth(user, 'local_' + user.id);
  return user;
}

function localUserLogin(username, password) {
  const user = localFindUser(username);
  if (!user) throw new Error(tr('err_bad_credentials'));
  if (localStorage.getItem('pso_local_pass_' + user.username) !== String(password)) {
    throw new Error(tr('err_bad_credentials'));
  }
  saveAuth(user, 'local_' + user.id);
  return user;
}

/* ---------------- Registro / Login (online o local) ---------------- */

async function doSignup(username, password, displayName) {
  let user;
  if (online) {
    const data = await apiRequest('/api/auth/signup', { method: 'POST', body: { username, password, displayName } });
    user = data.user;
    saveAuth(user, data.token);
  } else {
    user = localUserSignup(username, password, displayName);
  }
  refreshShellAfterAuth();
  toast(tr('toast_signup', { name: (user.displayName || user.username) }));
  return user;
}

async function doLoginUser(username, password) {
  let user;
  if (online) {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: { username, password } });
    user = data.user;
    saveAuth(user, data.token);
  } else {
    user = localUserLogin(username, password);
  }
  refreshShellAfterAuth();
  toast(tr('toast_login', { name: (user.displayName || user.username) }));
  return user;
}

function logoutUser() {
  saveAuth(null, null);
}

/* ---------------- Modal de cuenta (Ingresar / Crear cuenta) ---------------- */

function openAuthModal(tab = 'login') {
  const overlay = openModal(tr('auth_title'), '', `
    <button class="btn" id="auth-cancel">${tr('btn_close')}</button>
  `);

  let currentTab = tab;

  function renderBody() {
    const body = overlay.querySelector('.modal-body');
    body.innerHTML = `
      <div style="text-align:center; margin-bottom:1.1rem;">
        <img src="${window.PSO_LOGO_URL}" style="width:56px;height:56px;border-radius:50%;margin:0 auto 0.5rem;">
        <p style="color:var(--text-muted); font-size:0.85rem;">${tr('auth_need_account')}</p>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab ${currentTab === 'login' ? 'active' : ''}" data-auth-tab="login"><i class="ti ti-login"></i> ${tr('btn_ingresar')}</button>
        <button class="auth-tab ${currentTab === 'register' ? 'active' : ''}" data-auth-tab="register"><i class="ti ti-user-plus"></i> ${tr('btn_crear_cuenta')}</button>
      </div>
      <div class="field-error" id="auth-error" style="display:none;"></div>

      ${currentTab === 'register' ? `
        <div class="field">
          <label>${tr('label_username')}</label>
          <input type="text" id="auth-username" autocomplete="username" placeholder="${tr('ph_username')}" maxlength="20">
        </div>
        <div class="field">
          <label>${tr('label_display_name')}</label>
          <input type="text" id="auth-displayname" autocomplete="nickname" placeholder="${tr('ph_display_name')}" maxlength="24">
        </div>
        <div class="field">
          <label>${tr('label_password')}</label>
          <input type="password" id="auth-password" autocomplete="new-password" placeholder="${tr('ph_password')}">
        </div>
        <div class="field" style="margin-bottom:0.25rem;">
          <label>${tr('label_password2')}</label>
          <input type="password" id="auth-password2" autocomplete="new-password" placeholder="••••••••">
        </div>
        <button class="btn btn-primary btn-block" id="auth-submit"><i class="ti ti-user-plus"></i> ${tr('btn_crear_mi_cuenta')}</button>
      ` : `
        <div class="field">
          <label>${tr('label_user')}</label>
          <input type="text" id="auth-username" autocomplete="username" placeholder="${tr('ph_user')}">
        </div>
        <div class="field" style="margin-bottom:0.25rem;">
          <label>${tr('label_password')}</label>
          <input type="password" id="auth-password" autocomplete="current-password" placeholder="••••••••">
        </div>
        <button class="btn btn-primary btn-block" id="auth-submit"><i class="ti ti-login"></i> ${tr('btn_ingresar')}</button>
      `}

      <span class="auth-link">${tr('auth_admin_link')} <button id="go-admin-login">${tr('auth_admin_link_btn')}</button></span>
    `;

    body.querySelectorAll('.auth-tab').forEach(btn => {
      btn.onclick = () => { currentTab = btn.dataset.authTab; renderBody(); };
    });

    const goAdmin = body.querySelector('#go-admin-login');
    if (goAdmin) goAdmin.onclick = () => { closeModal(); openLoginModal(); };

    const username = body.querySelector('#auth-username');
    const password = body.querySelector('#auth-password');

    const submit = async () => {
      const errorEl = body.querySelector('#auth-error');
      errorEl.style.display = 'none';
      try {
        const u = username.value.trim();
        const p = password.value;
        if (!u || !p) { errorEl.textContent = tr('err_login_incomplete'); errorEl.style.display = 'block'; return; }
        if (currentTab === 'register') {
          const p2 = body.querySelector('#auth-password2').value;
          if (p !== p2) { errorEl.textContent = tr('err_pass_mismatch'); errorEl.style.display = 'block'; return; }
          if (!online && !confirm(tr('confirm_local_account'))) return;
          await doSignup(u, p, body.querySelector('#auth-displayname') ? body.querySelector('#auth-displayname').value : '');
        } else {
          await doLoginUser(u, p);
        }
        closeModal();
        switchTab('trivia');
      } catch (e) {
        errorEl.textContent = e.message || tr('err_generic');
        errorEl.style.display = 'block';
      }
    };

    body.querySelector('#auth-submit').onclick = submit;
    [username, password, body.querySelector('#auth-password2')].forEach(inp => {
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
    setTimeout(() => username.focus(), 100);
  }

  renderBody();
  document.getElementById('auth-cancel').onclick = closeModal;
}

/* ---------------- LOGIN ADMINISTRADOR ---------------- */

function openLoginModal() {
  const overlay = openModal(tr('login_modal_title'), `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <img src="${window.PSO_LOGO_URL}" style="width:56px;height:56px;border-radius:50%;margin:0 auto 0.5rem;">
      <p style="color:var(--text-muted); font-size:0.85rem;">${tr('login_modal_desc')}</p>
    </div>
    <div class="field">
      <label>${tr('label_user')}</label>
      <input type="text" id="login-user" autocomplete="username" placeholder="admin">
    </div>
    <div class="field" style="margin-bottom:0.25rem;">
      <label>${tr('label_password')}</label>
      <input type="password" id="login-pass" autocomplete="current-password" placeholder="••••••••">
    </div>
    <div class="field-error" id="login-error" style="display:none;">${tr('err_bad_credentials')}</div>
  `, `
    <button class="btn" id="login-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="login-submit">🔓 ${tr('btn_ingresar')}</button>
  `);

  const submit = () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    if (u === PSO_CONFIG.ADMIN_USER && p === PSO_CONFIG.ADMIN_PASS) {
      State.isAdmin = true;
      sessionStorage.setItem('pso_admin', '1');
      closeModal();
      renderShell();
      switchTab('admin');
      toast(tr('toast_admin_welcome'));
    } else {
      document.getElementById('login-error').style.display = 'block';
    }
  };

  document.getElementById('login-cancel').onclick = closeModal;
  document.getElementById('login-submit').onclick = submit;
  overlay.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
  setTimeout(() => document.getElementById('login-user').focus(), 100);
}