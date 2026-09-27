import React from 'react'
import { motion } from 'motion/react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useApp } from './app.jsx'

/* ======================================================================
   HELPERS DE UI COMPARTIDOS
   ====================================================================== */

/* Reacciona a cambios de datos/auth desde el bus legacy. */
export function useData() {
  const { v } = useApp()
  void v
  const data = typeof State !== 'undefined' ? State.data : { teams: [], matches: [], competitions: [], palmares: [], settings: {} }
  return { data, version: v }
}

export function useAuth() {
  const { v } = useApp()
  void v
  return {
    user: typeof AuthState !== 'undefined' ? AuthState.user : null,
    isAdmin: typeof State !== 'undefined' ? !!State.isAdmin : false,
    online: typeof online !== 'undefined' ? online : false,
    version: v
  }
}

/* Traducción corta (envuelve el global tr de i18n.js). */
export const t = (key, vars) => (typeof tr === 'function' ? tr(key, vars) : key)

export const initialsOf = name =>
  String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export function TeamDot({ team, className = '', size }) {
  const style = size ? { width: size, height: size, fontSize: size * 0.36 } : undefined
  if (!team) return <div className={`team-dot ${className}`} style={style}>?</div>
  if (team.logo) return <div className={`team-dot ${className}`} style={{ ...style, overflow: 'hidden' }}><img src={team.logo} alt="" /></div>
  return <div className={`team-dot ${className}`} style={style}>{initialsOf(team.name)}</div>
}

export function EmptyState({ icon, text }) {
  return (
    <div className="card empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <p>{text}</p>
    </div>
  )
}

/* Estado del ranking: distingue "cargando", "vacio de verdad" y "el server
   no respondio". Antes un fallo de red se mostraba como "nadie fallo
   todavia", que hacia pensar que el ranking estaba vacio para siempre.

   Importante: si HAY datos (del fallback local) se muestran igual, con un
   aviso chico arriba. El mensaje grande es solo para cuando no hay nada
   que mostrar, porque tapar el ranking con un error es peor que mostrar
   datos potencialmente viejos. */
export function RankBody({ cargando, degraded, vacio, cargandoText, vacioText, motivo, children }) {
  if (cargando) {
    return (
      <div className="card empty-state">
        <span className="empty-icon"><RefreshCw size={26} className="spin" /></span>
        <p>{cargandoText || 'Cargando...'}</p>
      </div>
    )
  }
  /* El motivo real (503 not_configured, 403, 404...) se muestra: el ranking
     casi siempre falla por configuracion del server, no por red, y sin el
     codigo no hay forma de saber que corregir. */
  const detalle = motivo ? <code className="rank-motivo">{motivo}</code> : null
  if (vacio) {
    return degraded
      ? (
        <div className="card empty-state rank-offline">
          <span className="empty-icon">📡</span>
          <p>{t('ranking_sin_conexion')}</p>
          {detalle}
        </div>
      )
      : <EmptyState icon="🏆" text={vacioText || ''} />
  }
  return (
    <>
      {degraded && (
        <div className="rank-notice" role="status">
          <WifiOff size={14} /> {t('ranking_datos_locales')} {detalle}
        </div>
      )}
      {children}
    </>
  )
}

export function SectionHead({ title, sub, right }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub ? <span className="section-sub">{sub}</span> : null}
      </div>
      {right ? <div className="section-head-right">{right}</div> : null}
    </div>
  )
}

/* Presets de animación reutilizables */
export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const spring = { type: 'spring', stiffness: 280, damping: 30 }

export const View = ({ children, ...rest }) => (
  <motion.div
    className="view active"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.12, ease: 'easeOut' }}
    {...rest}
  >
    {children}
  </motion.div>
)

/* Item genérico de ranking (para listas con avatar + nombre + valor) */
export function RankItem({ entry, index, value, emoji, highlight, sub }) {
  return (
    <motion.div
      className={`rank-item ${highlight ? 'is-you' : ''}`}
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.3 }}
    >
      <div className="rank-pos">{index + 1}</div>
      <div className="rank-avatar">
        {entry.avatar ? <img src={entry.avatar} alt="" className="rank-avatar-img" /> : initialsOf(entry.nombre)}
      </div>
      <div className="rank-info">
        <div className="rank-name">{entry.nombre}</div>
        {sub ? <div className="rank-team">{sub}</div> : null}
      </div>
      <div className="rank-value-wrap">
        {emoji ? <span className="rank-emoji">{emoji}</span> : null}
        <div className="rank-value">{value}</div>
      </div>
    </motion.div>
  )
}