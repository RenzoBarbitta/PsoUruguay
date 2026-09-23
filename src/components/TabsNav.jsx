import React from 'react'
import { motion } from 'motion/react'
import { Home, CalendarDays, Table2, BarChart3, Users, Trophy, Flag, Gamepad2, Settings, Brain, Sigma, CircleDashed } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

export function isGameTab(tab) {
  return tab === 'trivia' || tab === 'pasapalabra' || tab === 'penales'
}

/* Del texto activo: saltito (arriba-abajo) + tambaleo suave al entrar */
const labelAnim = {
  idle: { y: 0, scale: 1, rotate: 0 },
  active: {
    y: [0, -5, 0],
    scale: [1, 1.06, 1],
    rotate: [0, -2, 2, -1, 0],
    transition: { duration: 0.55, ease: 'easeOut' }
  }
}

export default function TabsNav() {
  const { tab, v, switchTab } = useApp()
  void v
  const isAdmin = typeof State !== 'undefined' ? !!State.isAdmin : false
  const showTabla = typeof hasActiveLigas === 'function' ? hasActiveLigas() : true
  const gamesActive = isGameTab(tab) || tab === 'juegos'

  const items = [
    { id: 'inicio', label: t('tab_inicio'), icon: <Home size={17} /> },
    { id: 'fixture', label: t('tab_fixture'), icon: <CalendarDays size={17} /> },
    ...(showTabla ? [{ id: 'tabla', label: t('tab_tabla'), icon: <Table2 size={17} /> }] : []),
    { id: 'estadisticas', label: t('tab_estadisticas'), icon: <BarChart3 size={17} /> },
    { id: 'planteles', label: t('tab_planteles'), icon: <Users size={17} /> },
    { id: 'palmares', label: t('tab_palmares'), icon: <Trophy size={17} /> },
    { id: 'seleccion', label: t('tab_seleccion'), icon: <Flag size={17} /> },
    { id: 'juegos', label: t('tab_juegos'), icon: <Gamepad2 size={17} /> },
    ...(isAdmin ? [{ id: 'admin', label: t('tab_admin'), icon: <Settings size={17} /> }] : [])
  ]

  return (
    <nav className="tabs-nav">
      <div className="tabs-nav-inner">
        {items.map(it => {
          const active = it.id === 'juegos' ? gamesActive : tab === it.id
          return (
            <motion.button
              key={it.id}
              className={`tab-btn ${active ? 'active' : ''}`}
              onClick={() => switchTab(it.id)}
              whileTap={{ scale: 0.94 }}
            >
              {active ? (
                <motion.span
                  layoutId="tab-active-glow"
                  className="tab-active-glow"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              ) : null}
              <motion.span
                className="tab-label"
                initial={false}
                animate={active ? 'active' : 'idle'}
                variants={labelAnim}
                whileHover={{
                  y: [0, -3, 1, 0],
                  rotate: [0, -2.5, 2, -1, 0],
                  scale: [1, 1.04, 1],
                  transition: { duration: 0.4 }
                }}
              >
                {it.icon}{it.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

/* Íconos alternativos (exportados por si alguna vista los usa) */
export const GameIcons = { Brain, Sigma, CircleDashed }