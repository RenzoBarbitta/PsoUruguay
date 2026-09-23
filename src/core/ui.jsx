import React from 'react'
import { motion } from 'motion/react'
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
      <div className="rank-avatar">{initialsOf(entry.nombre)}</div>
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