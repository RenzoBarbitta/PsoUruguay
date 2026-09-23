import React, { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Shirt, Users, Hand, Shield, Footprints, Star, ArrowRight } from 'lucide-react'
import DiscordIcon from '../components/DiscordIcon.jsx'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const SELECCION_UY = [
  { pos: 'arqueros', icon: <Hand size={18} />, players: [{ name: 'Molleja', num: 99 }, { name: 'Benji Price', num: 1 }] },
  { pos: 'defensas', icon: <Shield size={18} />, players: [{ name: 'Qevale', num: 47 }, { name: 'Sebasuarezz', num: 80 }, { name: 'Unfav', num: 4 }, { name: 'Taro Misaki', num: 24 }, { name: 'K1ng', num: 6 }] },
  { pos: 'medios', icon: <Footprints size={18} />, players: [{ name: 'Caseros', num: 64 }, { name: 'Agstn', num: 16 }, { name: 'Marabola', num: 7 }, { name: 'Best666', num: 10 }] },
  { pos: 'delanteros', icon: <Star size={18} />, players: [{ name: 'Fran', num: 69 }, { name: 'Popa', num: 14 }, { name: 'Parling', num: 17 }, { name: 'Chepas', num: 21 }, { name: 'Lnfermo', num: 9 }, { name: 'Alan Velasco', num: 15 }, { name: 'El Rkt', num: 30 }, { name: 'Nachodeldanu', num: 11 }, { name: 'Perssa', num: 5 }] },
]

function seleccionPosKey(pos) {
  if (pos === 'arqueros') return 'sel_pos_arqueros'
  if (pos === 'defensas') return 'sel_pos_defensas'
  if (pos === 'medios') return 'sel_pos_medios'
  return 'sel_pos_delanteros'
}

/* Sol de Uruguay como "shine" decorativo sobre las franjas */
function SolUY() {
  return (
    <svg className="sel-sol" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="16" fill="#f7b731" />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 16
        const long = i % 2 === 0
        const r1 = long ? 44 : 34
        const r2 = long ? 58 : 46
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * r1}
            y1={60 + Math.sin(a) * r1}
            x2={60 + Math.cos(a) * r2}
            y2={60 + Math.sin(a) * r2}
            stroke="#f7b731"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

/* Bandera de Uruguay: 9 franjas (blanca y azul alternadas, empieza/termina
   en blanco) + canton blanco con el Sol de Mayo. */
function BanderaUY() {
  const stripes = []
  for (let i = 0; i < 9; i++) {
    const y = (20 / 9) * i
    stripes.push(<rect key={i} x="0" y={y} width="30" height={20 / 9} fill={i % 2 === 0 ? '#fff' : '#56A0D3'} />)
  }
  const rays = []
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16
    const r1 = 2.4
    const r2 = i % 2 === 0 ? 4.4 : 3.5
    rays.push(
      <line key={i} x1={5 + Math.cos(a) * r1} y1={5 + Math.sin(a) * r1} x2={5 + Math.cos(a) * r2} y2={5 + Math.sin(a) * r2} stroke="#FFD100" strokeWidth="0.8" strokeLinecap="round" />
    )
  }
  return (
    <svg className="sel-flag" viewBox="0 0 30 20" role="img" aria-label="Bandera de Uruguay">
      <rect width="30" height="20" fill="#fff" />
      {stripes}
      <rect x="0" y="0" width="10" height="10" fill="#fff" />
      <circle cx="5" cy="5" r="2.2" fill="#FFD100" />
      {rays}
      <circle cx="4.4" cy="5" r="0.26" fill="#B07900" />
      <circle cx="5.6" cy="5" r="0.26" fill="#B07900" />
      <path d="M4.5 5.7 Q5 6.15 5.5 5.7" stroke="#B07900" strokeWidth="0.3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function Seleccion() {
  useApp()
  const reduce = useReducedMotion()
  const heroRef = useRef(null)
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 90])

  const onMouseMove = useCallback(e => {
    const r = heroRef.current
    if (!r) return
    const x = (e.clientX - r.offsetLeft) / r.offsetWidth - 0.5
    const y = (e.clientY - r.offsetTop) / r.offsetHeight - 0.5
    setMx(x)
    setMy(y)
  }, [])

  const used = new Set()
  SELECCION_UY.forEach(g => g.players.forEach(p => { if (p && typeof p === 'object' && p.num != null) used.add(p.num) }))
  let nextFree = 1
  const nextNumber = () => { while (used.has(nextFree)) nextFree += 1; used.add(nextFree); return nextFree }
  const total = SELECCION_UY.reduce((s, g) => s + g.players.length, 0)

  const stripes = reduce ? null : (
    <motion.div
      className="sel-hero-stripes"
      aria-hidden="true"
      animate={{ x: mx * -22, y: my * -14 }}
      transition={{ type: 'spring', stiffness: 60, damping: 18 }}
    />
  )

  return (
    <>
      <motion.div
        ref={heroRef}
        className="sel-hero"
        onMouseMove={reduce ? undefined : onMouseMove}
        onMouseLeave={reduce ? undefined : () => { setMx(0); setMy(0) }}
      >
        <div className="sel-hero-fondone" aria-hidden="true">
          <SolUY />
        </div>
        <motion.div
          className="sel-flag-wrap"
          initial={{ opacity: 0, x: 36, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 2 }}
          transition={{ delay: 0.55, duration: 0.6, type: 'spring', stiffness: 120, damping: 16 }}
        >
          <BanderaUY />
        </motion.div>
        <motion.div className="sel-hero-glow" aria-hidden="true" style={reduce ? undefined : { y: parallaxY }} />
        {stripes}

        <div className="sel-hero-inner">
          <motion.span
            className="sel-badge"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {t('sel_badge')}
          </motion.span>
          <h2 className="sel-title">
            {'LA CELESTE'.split('').map((ch, i) => (
              <motion.span
                key={i}
                className={ch === ' ' ? 'sel-title-space' : 'sel-title-l'}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.045, type: 'spring', stiffness: 240, damping: 22 }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </h2>
          <motion.p
            className="sel-sub"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            {t('sel_sub')}
          </motion.p>
          <motion.div
            className="sel-meta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <span className="sel-meta-chip"><Shirt size={15} />{t('sel_squad_label')}</span>
            <span className="sel-meta-chip gold"><Users size={15} />{t('sel_count', { n: total })}</span>
          </motion.div>
        </div>
      </motion.div>

      {SELECCION_UY.map(g => {
        const cards = g.players.map(p => {
          const dorsal = (p && typeof p === 'object' && p.num != null) ? p.num : nextNumber()
          const nombre = (p && typeof p === 'object') ? p.name : p
          return (
            <motion.div
              className="sel-player"
              key={nombre}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4 }}
              whileHover={reduce ? undefined : { y: -4, boxShadow: '0 12px 28px -10px var(--shadow-strong, rgba(0,0,0,0.35))' }}
            >
              <div className="sel-player-avatar">{dorsal}</div>
              <div className="sel-player-info">
                <div className="sel-player-name">{nombre}</div>
              </div>
              <Star className="sel-player-star" size={15} fill="currentColor" />
            </motion.div>
          )
        })
        return (
          <motion.section
            className={`sel-group sel-group-${g.pos}`}
            key={g.pos}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="sel-group-head">
              <span className="sel-group-icon">{g.icon}</span>
              <h3>{t(seleccionPosKey(g.pos))}</h3>
              <span className="sel-group-count">{g.players.length}</span>
            </div>
            <div className="sel-grid">{cards}</div>
          </motion.section>
        )
      })}

      <motion.a
        className="sel-cta"
        href="https://discord.gg/3HymNM8XB3"
        target="_blank"
        rel="noopener"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <DiscordIcon size={22} />
        <span>
          <strong>{t('sel_cta_join')}</strong>
          <small>{t('sel_cta_join_sub')}</small>
        </span>
        <ArrowRight size={18} />
      </motion.a>
    </>
  )
}