import React from 'react'
import { motion } from 'motion/react'
import { TeamDot, t } from '../core/ui.jsx'

/* Fecha/hora programada: texto "12/10 · 21:30" o "" si no hay. */
export function matchScheduledLabel(m) {
  const d = String(m.scheduledDate || '').trim()
  const h = String(m.scheduledTime || '').trim()
  if (!d && !h) return ''
  let datePart = d
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (iso) datePart = `${iso[3]}/${iso[2]}/${iso[1].slice(2)}`
  return '📅 ' + [datePart, h].filter(Boolean).join(' · ')
}

export function MatchCard({ m, index = 0 }) {
  const home = getTeamById(m.homeId)
  const away = getTeamById(m.awayId)
  if (!home || !away) return null
  const sched = matchScheduledLabel(m)
  return (
    <motion.div
      className="match-card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(index * 0.06, 0.35), duration: 0.3 }}
    >
      <div className="match-teams">
        <div className="match-team">
          <TeamDot team={home} />
          <span className="match-team-name">{home.name}</span>
        </div>
        <div className={`match-score ${m.played ? '' : 'pending'}`}>
          {m.played ? `${m.homeScore} - ${m.awayScore}` : 'vs'}
        </div>
        <div className="match-team right">
          <TeamDot team={away} />
          <span className="match-team-name">{away.name}</span>
        </div>
      </div>
      <div className="match-meta">
        {m.played ? t('match_finalizado') : t('match_por_jugar')}{m.date ? ' · ' + m.date : ''}
      </div>
      {sched ? <div className="match-sched">{sched}</div> : null}
    </motion.div>
  )
}

export function BracketMatchCard({ m, index = 0, rc = 'var(--accent-dark)', placeholder = false }) {
  if (placeholder) {
    return (
      <motion.div
        className="match-card bracket-card bracket-placeholder"
        style={{ padding: '0.5rem 0.7rem', '--rc': rc }}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.3 }}
      >
        <div className="bracket-row-team">
          <span className="bracket-team">{t('por_definir')}</span>
        </div>
        <div className="bracket-divider" />
        <div className="bracket-row-team">
          <span className="bracket-team">{t('por_definir')}</span>
        </div>
      </motion.div>
    )
  }
  const home = m.homeId ? getTeamById(m.homeId) : null
  const away = m.awayId ? getTeamById(m.awayId) : null
  const homeWon = m.played && home && away && Number(m.homeScore) > Number(m.awayScore)
  const awayWon = m.played && home && away && Number(m.awayScore) > Number(m.homeScore)
  const sched = matchScheduledLabel(m)
  return (
    <motion.div
      className={`match-card bracket-card ${m.played ? 'played' : ''}`}
      style={{ padding: '0.5rem 0.7rem', '--rc': rc }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.3 }}
    >
      <div className={`bracket-row-team ${homeWon ? 'winner' : ''}`}>
        <span className="bracket-team">
          {home ? <TeamDot team={home} /> : null}
          {home ? home.name : (m.isBye ? '—' : t('por_definir'))}
        </span>
        <span className="bracket-score">{m.played ? m.homeScore : ''}</span>
      </div>
      <div className="bracket-divider" />
      <div className={`bracket-row-team ${awayWon ? 'winner' : ''}`}>
        <span className="bracket-team">
          {away ? <TeamDot team={away} /> : null}
          {away ? away.name : (m.isBye ? '—' : t('por_definir'))}
        </span>
        <span className="bracket-score">{m.played ? m.awayScore : ''}</span>
      </div>
      {sched ? <div className="match-sched bracket-sched">{sched}</div> : null}
    </motion.div>
  )
}

/* Nombre de ronda de llaves: final / semifinal / cuartos / octavos */
export function bracketRoundName(roundNum, totalRounds) {
  const remaining = totalRounds - roundNum + 1
  if (remaining === 1) return t('bracket_final')
  if (remaining === 2) return t('bracket_semifinal')
  if (remaining === 3) return t('bracket_cuartos')
  if (remaining === 4) return t('bracket_octavos')
  return t('bracket_ronda', { n: roundNum })
}