import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, TeamDot, EmptyState } from '../core/ui.jsx'

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

/* Extrae 2 colores dominantes del escudo (logo) para pintar el nombre/card.
   Si no hay logo o falla, devuelve null y se usa el fallback del CSS. */
function useEscudoColors(logo) {
  const [cs, setCs] = useState(null)
  useEffect(() => {
    if (!logo) { setCs(null); return }
    let alive = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const SIZE = 20
        const cv = document.createElement('canvas')
        cv.width = SIZE; cv.height = SIZE
        const ctx = cv.getContext('2d')
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const px = ctx.getImageData(0, 0, SIZE, SIZE).data
        const counts = new Map()
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3]
          if (a < 128) continue
          if (0.299 * r + 0.587 * g + 0.114 * b > 248) continue
          const k = (r >> 3) + ',' + (g >> 3) + ',' + (b >> 3)
          const hit = counts.get(k)
          if (hit) { hit.r = (hit.r * hit.n + r) / (hit.n + 1); hit.g = (hit.g * hit.n + g) / (hit.n + 1); hit.b = (hit.b * hit.n + b) / (hit.n + 1); hit.n++ }
          else counts.set(k, { r, g, b, n: 1 })
        }
        const top = [...counts.values()].sort((a, b) => b.n - a.n)
        const c1 = top[0]
        if (!c1) { if (alive) setCs(null); return }
        const c2 = top.find(c => Math.hypot(c.r - c1.r, c.g - c1.g, c.b - c1.b) > 55) || top[1] || c1
        if (alive) setCs([hex(c1), hex(c2)])
      } catch (e) { if (alive) setCs(null) }
    }
    img.onerror = () => { if (alive) setCs(null) }
    img.src = logo
    return () => { alive = false }
  }, [logo])
  return cs
}

function PlantelCard({ team, onOpen, index }) {
  const cs = useEscudoColors(team.logo)
  const pc = cs ? cs[0] : 'var(--accent-dark)'
  const pc2 = cs ? cs[1] : 'var(--gold)'
  const rX = useMotionValue(0)
  const rY = useMotionValue(0)
  const tiltX = useSpring(rX, { stiffness: 220, damping: 18 })
  const tiltY = useSpring(rY, { stiffness: 220, damping: 18 })
  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    rY.set(px * 18)
    rX.set(-py * 14)
  }
  const handleLeave = () => { rX.set(0); rY.set(0) }
  return (
    <motion.button
      key={team.id}
      className="plant-card"
      style={{ '--pc': pc, '--pc2': pc2, rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
      onClick={() => onOpen(team.id)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.97 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.3 }}
    >
      <span className="plant-card-crest"><TeamDot team={team} /></span>
      <span className="plant-card-name">
        {String(team.name || '').split('').map((ch, i) => (
          <motion.span
            key={i}
            className="pl-letter"
            style={{ '--i': i }}
            initial={{ opacity: 0, y: 7, rotate: -6 }}
            whileInView="wave"
            viewport={{ once: true, margin: '-20px' }}
            variants={{
              wave: {
                opacity: 1, y: 0, rotate: 0,
                transition: { type: 'spring', stiffness: 480, damping: 16, delay: 0.04 + i * 0.035 }
              }
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </span>
    </motion.button>
  )
}

function plantelPlayerRow({ name, s }) {
  const st = s || { pj: 0, goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 }
  const pills = [
    <span className="plantel-pill" key="pj"><em>{t('th_pj')}</em><strong>{st.pj}</strong></span>,
    <span className="plantel-pill hl" key="goals"><em>{t('th_goles')}</em><strong>{st.goals}</strong></span>,
    <span className="plantel-pill" key="as"><em>{t('th_asist')}</em><strong>{st.assists}</strong></span>
  ]
  if (st.saves > 0) pills.push(<span className="plantel-pill" key="saves"><em>{t('th_atajadas')}</em><strong>{st.saves}</strong></span>)
  if (st.yellow > 0) pills.push(<span className="plantel-pill card-ta" key="yellow"><em>{t('th_ta')}</em><strong>{st.yellow}</strong></span>)
  if (st.red > 0) pills.push(<span className="plantel-pill card-tr" key="red"><em>{t('th_tr')}</em><strong>{st.red}</strong></span>)
  return (
    <div className="plantel-player" key={name}>
      <span className="plantel-player-name">{name}</span>
      <span className="plantel-player-stats">{pills}</span>
    </div>
  )
}

function Detail({ teamId, goBack }) {
  const team = getTeamById(teamId)
  if (!team) { State.currentPlantel = null; return <Grid goBack={goBack} /> }
  const cs = useEscudoColors(team.logo)
  const color = cs ? cs[0] : (team.color || 'var(--accent-dark)')
  const statsByPlayer = {}
  computeAllPlayerStats('todas').forEach(s => { statsByPlayer[s.playerId] = s })
  const players = (team.players || []).map(p => ({ name: p.name, s: statsByPlayer[p.id] }))

  return (
    <>
      <button className="btn btn-sm" onClick={goBack} style={{ marginBottom: '1rem' }}>
        <ChevronLeft size={16} /> {t('planteles_volver')}
      </button>
      <motion.div className="plantel-head" style={{ '--pc': color }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="plantel-head-crest"><TeamDot team={{ logo: team.logo, name: team.name }} /></div>
        <div className="plantel-head-info">
          <div className="plantel-head-name">{team.name}</div>
          <div className="plantel-head-meta">{(team.players || []).length} {t('planteles_jugadores')}{team.short ? ` · ${team.short.toUpperCase()}` : ''}</div>
        </div>
      </motion.div>
      <div className="card plantel-squad" style={{ '--pc': color }}>
        {players.length ? players.map(plantelPlayerRow) : <p className="no-players">{t('sin_jugadores')}</p>}
      </div>
    </>
  )
}

function Grid({ goOpen }) {
  const teams = State.data.teams
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('planteles_title')}</h2>
        <span className="section-sub">{t('planteles_sub')}</span>
      </div>
      {teams.length
        ? <div className="plant-grid">{teams.map((tm, i) => <PlantelCard key={tm.id} team={tm} onOpen={goOpen} index={i} />)}</div>
        : <EmptyState icon="🛡️" text={t('planteles_empty')} />}
    </>
  )
}

export default function Planteles() {
  const { v } = useApp()
  void v
  const [sel, setSel] = useState(() => (State.currentPlantel && getTeamById(State.currentPlantel) ? State.currentPlantel : null))
  const openDetail = id => { State.currentPlantel = id; setSel(id) }
  const goBack = () => { State.currentPlantel = null; setSel(null) }
  return sel ? <Detail teamId={sel} goBack={goBack} /> : <Grid goOpen={openDetail} />
}