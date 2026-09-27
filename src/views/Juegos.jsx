import React from 'react'
import { motion } from 'motion/react'
import { Brain, Play, Sigma, CircleDashed, Zap, Zap as ZapIcon, Footprints, Circle } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const CARDS = [
  {
    tab: 'trivia', icon: <Brain size={26} />, art: '🧠',
    titleKey: 'tab_trivia', descKey: 'juegos_desc_trivia', tagKey: 'juegos_tag_trivia',
    grad: 'linear-gradient(150deg,#16265c 0%,#0a1128 55%,#1a3a6e 100%)', glow: 'rgba(91,155,213,0.5)'
  },
  {
    tab: 'pasapalabra', icon: <Sigma size={26} />, art: '🔠',
    titleKey: 'tab_pasapalabra', descKey: 'juegos_desc_pasapalabra', tagKey: 'juegos_tag_pasapalabra',
    grad: 'linear-gradient(150deg,#4c1d95 0%,#2e1065 55%,#7c3aed 130%)', glow: 'rgba(167,139,250,0.5)'
  },
  {
    tab: 'penales', icon: <CircleDashed size={26} />, art: '⚽',
    titleKey: 'tab_penales', descKey: 'juegos_desc_penales', tagKey: 'juegos_tag_penales',
    grad: 'linear-gradient(150deg,#14532d 0%,#07130c 55%,#15803d 130%)', glow: 'rgba(74,222,128,0.45)'
  },
  {
    tab: 'tiroslibres', icon: <Zap size={26} />, art: '⚽',
    titleKey: 'tab_tiroslibres', descKey: 'tiroslibres_desc', tagKey: 'juegos_tag_tiroslibres',
    grad: 'linear-gradient(150deg,#7c2d12 0%,#2e0f06 55%,#ea580c 130%)', glow: 'rgba(234,88,12,0.5)'
  },
  {
    tab: 'quenocaiga', icon: <Footprints size={26} />, art: '🦵',
    titleKey: 'quenocaiga_title', descKey: 'quenocaiga_desc', tagKey: 'quenocaiga_tag',
    grad: 'linear-gradient(150deg,#854d0e 0%,#2e1a06 55%,#f59e0b 130%)', glow: 'rgba(245,158,11,0.5)'
  },
  {
    tab: 'encara', icon: <Circle size={26} />, art: '🏃',
    titleKey: 'encara_title', descKey: 'encara_desc', tagKey: 'encara_tag',
    grad: 'linear-gradient(150deg,#1e3a5f 0%,#0c1a2e 55%,#3b82f6 130%)', glow: 'rgba(59,130,246,0.5)'
  }
]

export default function Juegos() {
  const { switchTab } = useApp()
  return (
    <>
      <motion.div
        className="juegos-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="juegos-hero-glow" aria-hidden="true" />
        <div className="juegos-hero-inner">
          <span className="juegos-hero-badge">🎮 ARCADE PSO</span>
          <h2 className="juegos-hero-title">{t('tab_juegos')}</h2>
          <p className="juegos-hero-sub">{t('juegos_hub_sub')}</p>
        </div>
      </motion.div>
      <div className="juegos-grid">
        {CARDS.map((c, i) => (
          <motion.button
            key={c.tab}
            className="juegos-card"
            style={{ '--jc-bg': c.grad, '--jc-glow': c.glow }}
            onClick={() => switchTab(c.tab)}
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            whileHover={{ y: -6 }}
          >
            <span className="juegos-card-art" aria-hidden="true">{c.art}</span>
            <span className="juegos-card-tag">{t(c.tagKey)}</span>
            <span className="juegos-card-icon">{c.icon}</span>
            <span className="juegos-card-title">{t(c.titleKey)}</span>
            <span className="juegos-card-desc">{t(c.descKey)}</span>
            <span className="juegos-card-play"><Play size={16} /> {t('juegos_play')}</span>
          </motion.button>
        ))}
      </div>
    </>
  )
}