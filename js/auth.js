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

/* En modo local el jugador puede entrar con su nombre de usuario o con su email. */
function localFindUser(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  return getLocalUsers().find(u => u.username === id || (u.email && u.email === id));
}

function localUserSignup(username, password, displayName, email) {
  const name = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    throw new Error(tr('err_username_format'));
  }
  if (!password || String(password).length < 6) {
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
    email: String(email || '').trim().toLowerCase(),
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

function localUserLogin(identifier, password) {
  const user = localFindUser(identifier);
  if (!user) throw new Error(tr('err_bad_credentials'));
  if (localStorage.getItem('pso_local_pass_' + user.username) !== String(password)) {
    throw new Error(tr('err_bad_credentials'));
  }
  saveAuth(user, 'local_' + user.id);
  return user;
}

/* ---------------- Registro / Login (online o local) ---------------- */

/* Devuelve {pendingConfirmation:true, email} cuando la cuenta se creó pero
   Supabase está esperando que el jugador confirme el email (todavía sin sesión). */
async function doSignup(email, username, password, displayName) {
  let user;
  if (online) {
    const data = await apiRequest('/api/auth/signup', { method: 'POST', body: { email, username, password, displayName } });
    if (data && data.pendingConfirmation) return { pendingConfirmation: true, email: data.email };
    user = data.user;
    saveAuth(user, data.token);
  } else {
    user = localUserSignup(username, password, displayName, email);
  }
  refreshShellAfterAuth();
  toast(tr('toast_signup', { name: (user.displayName || user.username) }));
  return user;
}

async function doLoginUser(email, password) {
  let user;
  if (online) {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
    user = data.user;
    saveAuth(user, data.token);
  } else {
    user = localUserLogin(email, password);
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
      <div id="auth-ok" style="display:none; margin-bottom:0.9rem; padding:0.6rem 0.75rem; border-radius:8px; font-size:0.82rem; line-height:1.4; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.45); color:#4ade80;"></div>

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
          <label>${tr('label_email')}</label>
          <input type="email" id="auth-email" autocomplete="email" placeholder="${tr('ph_email')}" required>
        </div>
        <div class="field">
          <label>${tr('label_password')} <span style="color:var(--text-muted); font-weight:400;">${tr('label_password_min')}</span></label>
          <input type="password" id="auth-password" autocomplete="new-password" placeholder="${tr('ph_password')}" minlength="6" required>
        </div>
        <div class="field">
          <label>${tr('label_password2')}</label>
          <input type="password" id="auth-password2" autocomplete="new-password" placeholder="${tr('ph_password')}" minlength="6" required>
        </div>
        <p style="color:var(--text-muted); font-size:0.78rem; line-height:1.4; margin:0.15rem 0 0.9rem; padding:0.55rem 0.7rem; border-radius:8px; background:rgba(59,130,246,0.10); border:1px solid rgba(59,130,246,0.35);">
          <i class="ti ti-mail"></i> ${tr('note_email_confirm')}
        </p>
        <button class="btn btn-primary btn-block" id="auth-submit"><i class="ti ti-user-plus"></i> ${tr('btn_crear_mi_cuenta')}</button>
      ` : `
        <div class="field">
          <label>${tr('label_email')}</label>
          <input type="email" id="auth-email" autocomplete="email" placeholder="${tr('ph_email')}" required>
        </div>
        <div class="field" style="margin-bottom:0.25rem;">
          <label>${tr('label_password')}</label>
          <input type="password" id="auth-password" autocomplete="current-password" placeholder="••••••••" required>
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

    const email = body.querySelector('#auth-email');
    const password = body.querySelector('#auth-password');
    const username = body.querySelector('#auth-username');    // solo existe en el tab de registro
    const password2 = body.querySelector('#auth-password2');  // solo existe en el tab de registro

    const submit = async () => {
      const errorEl = body.querySelector('#auth-error');
      const okEl = body.querySelector('#auth-ok');
      errorEl.style.display = 'none';
      okEl.style.display = 'none';
      try {
        const mail = email.value.trim();
        const p = password.value;
        if (!mail || !p) { errorEl.textContent = tr('err_login_incomplete'); errorEl.style.display = 'block'; return; }
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)) { errorEl.textContent = tr('err_email_format'); errorEl.style.display = 'block'; return; }

        if (currentTab === 'register') {
          const u = username.value.trim();
          /* Validamos ANTES de llamar al server: Supabase exige contraseña de
             6+ y usuario de 3-20 (letras/números/_). Si no, responde 422. */
          if (String(p).length < 6) { errorEl.textContent = tr('err_password_short'); errorEl.style.display = 'block'; return; }
          if (p !== password2.value) { errorEl.textContent = tr('err_pass_mismatch'); errorEl.style.display = 'block'; return; }
          if (!/^[a-z0-9_]{3,20}$/.test(u.toLowerCase())) { errorEl.textContent = tr('err_username_format'); errorEl.style.display = 'block'; return; }
          if (!online && !confirm(tr('confirm_local_account'))) return;
          const displayName = body.querySelector('#auth-displayname') ? body.querySelector('#auth-displayname').value : '';
          const res = await doSignup(mail, u, p, displayName);
          if (res && res.pendingConfirmation) {
            /* La cuenta se creó, pero Supabase está esperando que el jugador
               confirme el email: todavía no hay sesión, así que le avisamos
               y dejamos el modal abierto. */
            okEl.textContent = tr('err_signup_confirm_email', { email: res.email });
            okEl.style.display = 'block';
            return;
          }
        } else {
          await doLoginUser(mail, p);
        }
        closeModal();
        switchTab('trivia');
      } catch (e) {
        errorEl.textContent = e.message || tr('err_generic');
        errorEl.style.display = 'block';
      }
    };

    body.querySelector('#auth-submit').onclick = submit;
    [email, password, username, password2].forEach(inp => {
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
    setTimeout(() => (currentTab === 'register' && username ? username : email).focus(), 100);
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