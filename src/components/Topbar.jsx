import React from 'react'
import { Moon, Sun, LogOut, User, Lock } from 'lucide-react'
import DiscordIcon from './DiscordIcon.jsx'
import { useApp } from '../core/app.jsx'
import { LoginModal, AdminLoginView } from '../admin/AuthModal.jsx'
import { t, initialsOf } from '../core/ui.jsx'

function Flag({ lang }) {
  if (lang === 'pt') {
    return (
      <svg viewBox="0 0 70 50" width="20" height="14" aria-hidden="true">
        <rect width="70" height="50" fill="#009B3A" />
        <polygon points="35,4 62,25 35,46 8,25" fill="#FEDF00" />
        <circle cx="35" cy="25" r="11" fill="#002776" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 75 50" width="20" height="13" aria-hidden="true">
      <rect width="75" height="50" fill="#C60B1E" />
      <rect y="12.5" width="75" height="25" fill="#FFC400" />
    </svg>
  )
}

export default function Topbar() {
  const { v, changeLang, toggleTheme, doLogout, openModal, switchTab } = useApp()
  void v
  const lang = typeof I18N !== 'undefined' ? I18N.lang : 'es'
  const user = typeof AuthState !== 'undefined' ? AuthState.user : null
  const isAdmin = typeof State !== 'undefined' ? !!State.isAdmin : false

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="brand" onClick={() => switchTab('inicio')} title={t('tab_inicio')} aria-label={t('tab_inicio')}>
          <img src={window.PSO_LOGO_URL} alt="logo" />
          <div className="brand-text">
            PSO Uruguay
            <span>PRO SOCCER ONLINE</span>
          </div>
        </button>

        <div className="topbar-spacer" />

        <div className="lang-switch" role="group" aria-label="Idioma">
          <button className={`lang-btn ${lang === 'es' ? 'active' : ''}`} onClick={() => changeLang('es')} title={t('lang_es_title')} aria-label={t('lang_es_title')}><Flag lang="es" /></button>
          <button className={`lang-btn ${lang === 'pt' ? 'active' : ''}`} onClick={() => changeLang('pt')} title={t('lang_pt_title')} aria-label={t('lang_pt_title')}><Flag lang="pt" /></button>
        </div>

        <a className="icon-btn discord-btn" href="https://discord.gg/J3Geb4EjDa" target="_blank" rel="noopener" aria-label={t('aria_discord')} title="Discord">
          <DiscordIcon size={20} />
        </a>

        <button className="icon-btn" onClick={toggleTheme} aria-label={t('aria_theme')} title={t('aria_theme')}>
          {typeof State !== 'undefined' && State.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {user ? (
          <>
            <div className="user-chip" title={t('title_playing_as', { name: user.username })}>
              <span className="user-avatar">{initialsOf(user.displayName || user.username)}</span>
              <span className="user-chip-name">{user.displayName || user.username}</span>
            </div>
            <button className="icon-btn" onClick={doLogout} aria-label={t('aria_logout')} title={t('aria_logout')}>
              <LogOut size={19} />
            </button>
          </>
        ) : (
          <button className="icon-btn" onClick={() => openModal(<LoginModal />)} aria-label={t('aria_auth')} title={t('aria_auth')}>
            <User size={19} />
          </button>
        )}

        {isAdmin
          ? <button className="admin-pill" onClick={() => switchTab('admin')}><ShieldIcon /> {t('admin_pill')}</button>
          : <button className="icon-btn" onClick={() => openModal(<AdminLoginView />)} aria-label={t('aria_admin_login')} title={t('aria_admin_login')}><Lock size={18} /></button>}
      </div>
    </header>
  )
}

function ShieldIcon() {
  return <span aria-hidden="true">🛡️</span>
}