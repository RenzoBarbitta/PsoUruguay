import React, { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Filter, Table, Trophy, BarChart3, CircleDot, Target, Hand, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, EmptyState } from '../core/ui.jsx'

function rankRows(list, key, emoji) {
  return list.map((s, i) => (
    <div className="rank-item" key={s.playerId + '-' + s.teamId}>
      <div className="rank-pos">{i + 1}</div>
      <div className="rank-avatar">
        {s.avatar ? <img src={s.avatar} alt="" className="rank-avatar-img" /> : s.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="rank-info">
        <div className="rank-name">{s.name}</div>
        <div className="rank-team">{s.teamName}</div>
      </div>
      <div className="rank-value emoji">{emoji} {s[key]}</div>
    </div>
  ))
}

function renderStatsSubtab(sub, filtro) {
  if (sub === 'goleadores') {
    const scorers = computeTopScorers(filtro)
    return scorers.length
      ? <div className="rank-list">{rankRows(scorers, 'goals', '⚽')}</div>
      : <EmptyState icon="🥅" text={t('stats_empty_goles')} />
  }
  if (sub === 'asistencias') {
    const assists = computeTopAssists(filtro)
    return assists.length
      ? <div className="rank-list">{rankRows(assists, 'assists', '🎯')}</div>
      : <EmptyState icon="🎯" text={t('stats_empty_asist')} />
  }
  if (sub === 'atajadas') {
    const saves = computeTopSaves(filtro)
    return saves.length
      ? <div className="rank-list">{rankRows(saves, 'saves', '🧤')}</div>
      : <EmptyState icon="🧤" text={t('stats_empty_atajadas')} />
  }
  const players = computeAllPlayerStats(filtro)
  if (!players.length) return <EmptyState icon="📊" text={t('stats_empty_general')} />
  return (
    <div className="card table-wrap">
      <table className="pso-table">
        <thead>
          <tr>
            <th>{t('th_jugador')}</th><th>{t('th_equipo')}</th><th>{t('th_pj')}</th>
            <th>{t('th_goles')}</th><th>{t('th_asist')}</th><th>{t('th_atajadas')}</th><th>{t('th_ta')}</th><th>{t('th_tr')}</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.playerId}>
              <td style={{ textAlign: 'left', fontWeight: 600 }}>{p.name}</td>
              <td style={{ textAlign: 'left', color: 'var(--text-muted)' }}>{p.teamName}</td>
              <td>{p.pj}</td>
              <td style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>{p.goals}</td>
              <td>{p.assists}</td>
              <td style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>{p.saves}</td>
              <td>{p.yellow ? <><span className="card-chip" style={{ background: '#e3b93a' }} /> {p.yellow}</> : '0'}</td>
              <td>{p.red ? <><span className="card-chip" style={{ background: '#d3455b' }} /> {p.red}</> : '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SUBS = [
  { id: 'general', label: 'stats_general', icon: <BarChart3 size={16} /> },
  { id: 'goleadores', label: 'stats_goleadores', icon: <CircleDot size={16} /> },
  { id: 'asistencias', label: 'stats_asistencias', icon: <Target size={16} /> },
  { id: 'atajadas', label: 'stats_atajadas', icon: <Hand size={16} /> }
]

function CompetitionFilterBtns({ filtro, pickFiltro, competitions, openGroups }) {
  const ligas = competitions.filter(c => c.type === 'liga')
  const copas = competitions.filter(c => c.type === 'copa')
  
  const hasPlayedMatches = (compId) => {
    return State.data.matches.some(m => m.played && m.competitionId === compId)
  }

  return (
    <div className="filter-btns">
      <button className={`btn btn-sm ${filtro === 'todas' ? 'btn-primary' : ''}`} onClick={() => pickFiltro('todas')}>{t('stats_todas')}</button>
      
      {(ligas.length || copas.length) && <span className="filter-divider" />}
      
      {ligas.length > 0 && (
        <FilterGroup
          title={t('stats_liga')}
          icon={<Table size={12} />}
          open={openGroups.ligas}
          onToggle={() => pickFiltro('liga')} // dummy, handled by group toggle
          items={ligas.filter(hasPlayedMatches).map(c => ({
            id: c.id,
            name: c.name,
            active: filtro === c.id,
            onClick: () => pickFiltro(c.id)
          }))}
          onGroupClick={() => pickFiltro('liga')}
        />
      )}
      
      {copas.length > 0 && (
        <FilterGroup
          title={t('stats_copa')}
          icon={<Trophy size={12} />}
          open={openGroups.copas}
          onToggle={() => pickFiltro('copa')}
          items={copas.filter(hasPlayedMatches).map(c => ({
            id: c.id,
            name: c.name,
            active: filtro === c.id,
            onClick: () => pickFiltro(c.id)
          }))}
          onGroupClick={() => pickFiltro('copa')}
        />
      )}
    </div>
  )
}

function FilterGroup({ title, icon, open, items, onGroupClick, onToggle }) {
  const [isOpen, setIsOpen] = React.useState(open)
  
  return (
    <div className="filter-group">
      <button 
        className={`btn btn-sm filter-group-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        {icon} 
        <span>{title}</span>
        <span className="filter-count">{items.length}</span>
        {items.length > 0 && (
          <ChevronDown size={12} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && items.length > 0 && (
          <motion.div 
            className="filter-group-items"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {items.map(item => (
              <button
                key={item.id}
                className={`btn btn-sm filter-item ${item.active ? 'btn-primary' : ''}`}
                onClick={item.onClick}
                style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.75rem' }}
              >
                {item.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Estadisticas() {
  const { v } = useApp()
  void v
  const [sub, setSub] = useState(() => State.currentStatsTab || 'general')
  const [filtro, setFiltro] = useState(() => State.currentStatsCompetition || 'todas')
  const [openGroups, setOpenGroups] = useState({ ligas: true, copas: true })

  const pickSub = id => {
    State.currentStatsTab = id
    setSub(id)
  }
  const pickFiltro = f => {
    State.currentStatsCompetition = f
    setFiltro(f)
  }

  const competitions = useMemo(() => State.data.competitions || [], [v])

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('stats_title')}</h2>
      </div>

      <div className="card stats-filter-row">
        <span className="stats-showing"><Filter size={14} /> {t('stats_mostrando')}</span>
        <CompetitionFilterBtns 
          filtro={filtro} 
          pickFiltro={pickFiltro} 
          competitions={competitions}
          openGroups={openGroups}
        />
      </div>

      <div className="admin-subtabs">
        {SUBS.map(s => (
          <button key={s.id} className={`subtab-btn ${sub === s.id ? 'active' : ''}`} onClick={() => pickSub(s.id)}>
            {s.icon} {t(s.label)}
          </button>
        ))}
      </div>

      <AnimatedKeyOuter id={sub + filtro}>{renderStatsSubtab(sub, filtro)}</AnimatedKeyOuter>
    </>
  )
}

function AnimatedKeyOuter({ id, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}