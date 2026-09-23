import React, { useEffect, useState } from 'react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

/* ======================================================================
   MODAL DE CUENTA (Ingresar / Crear cuenta) + LOGIN ADMIN
   Réplica React del modal de auth.js siguiendo el MISMO protocolo:
   - Supabase via doSignup / doLoginUser (apiRequest) si online
   - cuentas locales (pso_local_users) si offline
   - login admin = cuenta Supabase real con app_metadata.is_admin === true
   ====================================================================== */

export function LoginModal({ initialTab = 'login' }) {
  const { closeModal, switchTab, showToast, openModal } = useApp()
  const [tab, setTab] = useState(initialTab)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const onlineNow = typeof online !== 'undefined' ? online : false

  const commonValidation = (mail, p) => {
    if (!mail || !p) { setError(t('err_login_incomplete')); return null }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)) { setError(t('err_email_format')); return null }
    return { mail, p }
  }

  const submit = async vals => {
    setError('')
    setOk('')
    if (tab === 'register') {
      const v = commonValidation(vals.email, vals.password)
      if (!v) return
      const u = String(vals.username || '').trim()
      if (!u || !/^[a-z0-9_]{3,20}$/.test(u.toLowerCase())) { setError(t('err_username_format')); return }
      if (String(v.p).length < 6) { setError(t('err_password_short')); return }
      if (v.p !== String(vals.password2 || '')) { setError(t('err_pass_mismatch')); return }
      if (!onlineNow && !window.confirm(t('confirm_local_account'))) return
      setBusy(true)
      try {
        const res = await doSignup(v.mail, u.toLowerCase(), v.p, String(vals.displayName || '').trim())
        if (res && res.pendingConfirmation) {
          setOk(t('err_signup_confirm_email', { email: res.email }))
          return
        }
        closeModal()
        switchTab('trivia')
        showToast(t('toast_signup', { name: (res?.displayName || res?.username) }))
      } catch (e) {
        setError(e.message || t('err_generic'))
      } finally {
        setBusy(false)
      }
    } else {
      const v = commonValidation(vals.email, vals.password)
      if (!v) return
      setBusy(true)
      try {
        const user = await doLoginUser(v.mail, v.p)
        closeModal()
        switchTab('trivia')
        showToast(t('toast_login', { name: (user?.displayName || user?.username) }))
      } catch (e) {
        setError(e.message || t('err_generic'))
      } finally {
        setBusy(false)
      }
    }
  }

  const openAdmin = () => { closeModal(); openModal(<AdminLoginView />) }

  return (
    <div className="modal-pad auth-modal">
      <div className="auth-head">
        <img src={window.PSO_LOGO_URL} alt="" className="auth-logo" />
        <p className="auth-desc">{t('auth_need_account')}</p>
      </div>

      <div className="auth-tabs">
        <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setOk('') }}>{t('btn_ingresar')}</button>
        <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setOk('') }}>{t('btn_crear_cuenta')}</button>
      </div>

      {error ? <div className="field-error show">{error}</div> : null}
      {ok ? <div className="auth-ok">{ok}</div> : null}

      {tab === 'register'
        ? <RegisterForm busy={busy} onSubmit={submit} />
        : <LoginForm busy={busy} onSubmit={submit} />}

      <span className="auth-link">
        {t('auth_admin_link')}
        <button type="button" className="auth-link-btn" onClick={openAdmin}>{t('auth_admin_link_btn')}</button>
      </span>
    </div>
  )
}

function LoginForm({ busy, onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const go = () => onSubmit({ email, password })
  return (
    <form onSubmit={e => { e.preventDefault(); go() }}>
      <div className="field">
        <label>{t('label_email')}</label>
        <input type="email" autoFocus value={email} autoComplete="email" placeholder={t('ph_email')} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>{t('label_password')}</label>
        <input type="password" value={password} autoComplete="current-password" placeholder="••••••••" onChange={e => setPassword(e.target.value)} required />
      </div>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '…' : t('btn_ingresar')}</button>
    </form>
  )
}

function RegisterForm({ busy, onSubmit }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const go = () => onSubmit({ email, username, displayName, password, password2 })
  return (
    <form onSubmit={e => { e.preventDefault(); go() }}>
      <div className="field">
        <label>{t('label_username')}</label>
        <input type="text" value={username} autoComplete="username" placeholder={t('ph_username')} maxLength={20} onChange={e => setUsername(e.target.value)} required />
      </div>
      <div className="field">
        <label>{t('label_display_name')}</label>
        <input type="text" value={displayName} autoComplete="nickname" placeholder={t('ph_display_name')} maxLength={24} onChange={e => setDisplayName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('label_email')}</label>
        <input type="email" value={email} autoComplete="email" placeholder={t('ph_email')} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>{t('label_password')} <span className="field-min">{t('label_password_min')}</span></label>
        <input type="password" value={password} autoComplete="new-password" placeholder={t('ph_password')} minLength={6} onChange={e => setPassword(e.target.value)} required />
      </div>
      <div className="field">
        <label>{t('label_password2')}</label>
        <input type="password" value={password2} autoComplete="new-password" placeholder={t('ph_password')} minLength={6} onChange={e => setPassword2(e.target.value)} required />
      </div>
      <p className="auth-note">{t('note_email_confirm')}</p>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '…' : t('btn_crear_mi_cuenta')}</button>
    </form>
  )
}

/* Login admin: réplica de openLoginModal() de auth.js con Supabase real. */
export function AdminLoginView() {
  const { closeModal, switchTab, showToast } = useApp()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    const u = email.trim()
    const p = password
    if (!u || !p) { setError(t('err_bad_credentials')); return }
    setBusy(true)
    try {
      const data = await supaFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email: normalizeEmail(u), password: p }
      })
      const isAdmin = !!(data && data.user && data.user.app_metadata && data.user.app_metadata.is_admin === true)
      if (!data || !data.access_token || !isAdmin) {
        setBusy(false)
        setError(t('err_bad_credentials'))
        return
      }
      State.isAdmin = true
      sessionStorage.setItem('pso_admin', '1')
      sessionStorage.setItem('pso_admin_token', data.access_token)
      closeModal()
      switchTab('admin')
      showToast(t('toast_admin_welcome'))
    } catch (err) {
      setBusy(false)
      setError(t('err_bad_credentials'))
    }
  }

  return (
    <div className="modal-pad auth-modal">
      <div className="auth-head">
        <img src={window.PSO_LOGO_URL} alt="" className="auth-logo" />
        <p className="auth-desc">{t('login_modal_desc')}</p>
      </div>
      {error ? <div className="field-error show">{error}</div> : null}
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('label_email')}</label>
          <input type="email" autoFocus value={email} autoComplete="email" placeholder={t('ph_email')} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('label_password')}</label>
          <input type="password" value={password} autoComplete="current-password" placeholder="••••••••" onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '…' : t('btn_ingresar')}</button>
      </form>
    </div>
  )
}