import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { LoginModal } from '../admin/AuthModal.jsx'

/* ======================================================================
   NÚCLEO DE LA APP REACT
   Puente entre la capa legacy (window.psoBus, State, AuthState, online,
   tr, initDB, handleAuthRedirect...) y React. Vive aquí:
     - estado de pestaña (tab)
     - versión de datos reactiva (v)
     - autenticación / admin
     - sistema de modales declarativos
     - sistema de toasts
     - boot de la app (initDB + validación de sesión + splash)
   ====================================================================== */

const AppCtx = createContext(null)

export const useApp = () => useContext(AppCtx)

/* Acceso a globals legacy. Los identificadores son globals del navegador
   definidos por scripts clásicos (public/js/*); no los bundleá Vite. */
const getTab = () => (typeof State !== 'undefined' ? State.currentTab : 'inicio')

export function AppProvider({ children }) {
  const [tab, setTab] = useState(getTab())
  const [v, setV] = useState(0)
  const [ready, setReady] = useState(false)
  const [modals, setModals] = useState([])
  const [toasts, setToasts] = useState([])
  const modalRef = useRef(modals)
  modalRef.current = modals

  const bump = useCallback(() => setV(x => x + 1), [])

  const showToast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, msg, type }])
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  const closeModal = useCallback(() => setModals(s => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setModals([]), [])
  const openModal = useCallback(el => {
    setModals(s => (s.length >= 5 ? s : [...s, { key: Math.random().toString(36).slice(2), el }]))
  }, [])

  /* ---------- Bus legacy -> React ---------- */
  useEffect(() => {
    const bus = window.psoBus
    if (!bus) return
    const offs = [
      bus.on('toast', ({ msg, type }) => showToast(msg, type)),
      bus.on('data-updated', () => bump()),
      bus.on('shell-updated', () => { bump() }),
      bus.on('content-updated', () => bump()),
      bus.on('switch-tab', ({ tab: t }) => {
        if (typeof State !== 'undefined') State.currentTab = t
        setTab(t)
        bump()
      })
    ]
    return () => offs.forEach(fn => fn())
  }, [bump, showToast])

  /* ---------- Boot ---------- */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try { if (typeof saveTheme === 'function') saveTheme() } catch (e) {}
      try {
        const img = document.getElementById('splash-logo')
        if (img && window.PSO_LOGO_URL) img.src = window.PSO_LOGO_URL
      } catch (e) {}
      try { if (typeof syncLangUI === 'function') syncLangUI() } catch (e) {}
      try { if (typeof initDB === 'function') await initDB() } catch (e) {}
      try { if (typeof handleAuthRedirect === 'function') await handleAuthRedirect() } catch (e) {}
      try {
        if (online && typeof authToken === 'function' && authToken()) {
          const data = await apiRequest('/api/me', { auth: true })
          if (data && data.user) {
            AuthState.user = data.user
            localStorage.setItem('pso_user', JSON.stringify(data.user))
          }
        }
      } catch (e) { /* token inválido o servidor caído: se conserva la sesión local */ }
      if (mounted) {
        setReady(true)
        bump()
        window.setTimeout(() => {
          const s = document.getElementById('splash')
          if (s) s.classList.add('closing', 'hide')
        }, 1600)
      }
    })()
    return () => { mounted = false }
  }, [bump])

  /* ---------- Auto-refresco de datos (25s) como en el main.js legacy ---------- */
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (!online) return
      if (modalRef.current.length) return
      if (typeof State === 'undefined' || State.isAdmin) return
      const g = window.PSO_GAMES || {}
      if (g.trivia.jugando || g.pasapalabra.jugando || g.penales.jugando) return
      try { if (typeof refreshFromStorage === 'function') await refreshFromStorage() } catch (e) {}
    }, 25000)
    return () => window.clearInterval(id)
  }, [])

  /* ---------- Acciones ---------- */
  const switchTab = useCallback(t => {
    if (t === 'admin' && !State.isAdmin && !window.adminToken()) {
      openModal(<LoginModal />)
      return
    }
    State.currentTab = t
    setTab(t)
    bump()
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [bump, openModal])

  const toggleTheme = useCallback(() => {
    State.theme = State.theme === 'dark' ? 'light' : 'dark'
    if (typeof saveTheme === 'function') saveTheme()
    bump()
  }, [bump])

  const changeLang = useCallback(lang => {
    /* El global `setLang` lo define i18n.js (persiste y dispara renderAll). */
    if (typeof setLang === 'function') setLang(lang)
  }, [])

  const doLogout = useCallback(() => {
    const g = window.PSO_GAMES || {}
    ;['trivia', 'pasapalabra', 'penales'].forEach(k => { try { if (g[k] && g[k].stop) g[k].stop() } catch (e) {} })
    if (State.isAdmin) {
      State.isAdmin = false
      try { sessionStorage.removeItem('pso_admin') } catch (e) {}
      try { sessionStorage.removeItem('pso_admin_token') } catch (e) {}
    }
    if (AuthState.user && typeof logoutUser === 'function') logoutUser()
    if (g.trivia) { g.trivia.jugando = false; g.trivia.preguntaActual = null }
    if (g.penales) { g.penales.jugando = false; g.penales.respondida = false }
    State.currentTab = 'inicio'
    State.currentAdminTab = 'equipos'
    setTab('inicio')
    bump()
    showToast(tr ? tr('toast_logout') : 'Sesión cerrada')
  }, [bump, showToast])

  const value = {
    tab, v, ready, modals, toasts,
    openModal, closeModal, closeAll,
    showToast,
    switchTab, toggleTheme, changeLang, doLogout
  }

  return (
    <AppCtx.Provider value={value}>
      {children}
      <ToastHost />
      <ModalHost />
    </AppCtx.Provider>
  )
}

/* ======================================================================
   TOASTS
   ====================================================================== */
function ToastHost() {
  const { toasts } = useApp()
  const icons = { success: '✔', error: '✖', warning: '!' }
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            className={`toast ${t.type}`}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22 }}
          >
            <span className="toast-icon">{icons[t.type] || icons.success}</span>
            <span>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ======================================================================
   MODALES
   ====================================================================== */
function ModalHost() {
  const { modals, closeModal } = useApp()
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeModal])
  if (!modals.length) return null
  return (
    <div className="modal-layer">
      <AnimatePresence>
        {modals.map((m, i) => (
          <motion.div
            key={m.key}
            className="modal-overlay show"
            onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal-box"
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <button className="modal-close" onClick={closeModal} aria-label="Cerrar"><X size={18} /></button>
              {m.el}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* Modal confirm utilitario */
export function ConfirmModal({ title, body, confirmLabel, cancelLabel = 'cancel', tone = 'danger', onConfirm }) {
  const { closeModal, showToast } = useApp()
  return (
    <div className="modal-pad">
      <div className="modal-title-text">{title}</div>
      <div className="modal-body-text">{body}</div>
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{c(cancelLabel)}</button>
        <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-gold'}`}
          onClick={() => { closeModal(); onConfirm() }}>{c(confirmLabel)}</button>
      </div>
    </div>
  )
}

/* Helper de traducción corto */
export const c = key => (typeof tr === 'function' ? tr(key) : key)