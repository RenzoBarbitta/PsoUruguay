import React from 'react'
import { motion } from 'motion/react'
import { Shield, Swords } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, TeamDot } from '../core/ui.jsx'
import { MatchCard } from '../components/MatchCard.jsx'

function StatCard({ icon, value, label, index = 0 }) {
  return (
    <motion.div
      className="card stat-card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <span className="stat-card-icon">{icon}</span>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </motion.div>
  )
}

function MiniStandingRow({ t_, i }) {
  return (
    <div className="mini-row">
      <span className="mini-pos">{i + 1}</span>
      <TeamDot team={getTeamById(t_.id)} />
      <span className="mini-name">{t_.name}</span>
      <span className="mini-pts">{t_.pts} pts</span>
    </div>
  )
}

function MiniRankItem({ s, i, value }) {
  return (
    <motion.div
      className="rank-item"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(i * 0.05, 0.35), duration: 0.3 }}
    >
      <div className="rank-pos">{i + 1}</div>
      <div className="rank-avatar">{s.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div className="rank-info">
        <div className="rank-name">{s.name}</div>
        <div className="rank-team">{s.teamName}</div>
      </div>
      <div className="rank-value emoji">{value}</div>
    </motion.div>
  )
}

export default function Inicio() {
  useApp()
  const showTop = typeof hasActiveLigas === 'function' ? hasActiveLigas() : true
  const standings = showTop ? computeStandings() : []
  const top3 = standings.slice(0, 3)
  const scorers = computeTopScorers().slice(0, 3)
  const upcoming = State.data.matches.filter(m => !m.played).slice(0, 3)
  const totalGoals = State.data.matches.filter(m => m.played).reduce((s, m) => s + (Number(m.homeScore) || 0) + (Number(m.awayScore) || 0), 0)
  const playedCount = State.data.matches.filter(m => m.played).length

  return (
    <>
      <motion.div
        className="hero"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <img src={window.PSO_LOGO_URL} className="hero-logo" alt="" />
          <div>
            <div className="hero-title">{State.data.settings.leagueName}</div>
            <div className="hero-sub">{t('home_season_line', { season: State.data.settings.season, teams: State.data.teams.length, played: playedCount })}</div>
          </div>
        </div>
      </motion.div>

      <div className="stats-grid">
        <StatCard icon={<Shield size={22} />} value={State.data.teams.length} label={t('stat_equipos')} index={0} />
        <StatCard icon={<Swords size={22} />} value={totalGoals} label={t('stat_goles_totales')} index={1} />
      </div>

      <div className="inicio-grid">
        <div>
          <div className="section-head"><h2 className="section-title">{t('home_proximos')}</h2></div>
          {upcoming.length
            ? <div className="match-grid">{upcoming.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}</div>
            : <div className="card empty-state"><p>{t('home_no_matches')}</p></div>}
        </div>

        <div>
          {showTop ? (
            <>
              <div className="section-head"><h2 className="section-title">{t('home_top')}</h2></div>
              {top3.length
                ? <div className="card mini-list">{top3.map((tm, i) => <MiniStandingRow key={tm.id} t_={tm} i={i} />)}</div>
                : <div className="card empty-state"><p>{t('home_no_results')}</p></div>}
            </>
          ) : null}

          <div className="section-head" style={{ marginTop: '1.5rem' }}><h2 className="section-title">{t('home_goleadores')}</h2></div>
          {scorers.length
            ? <div className="rank-list">{scorers.map((s, i) => <MiniRankItem key={s.playerId} s={s} i={i} value={s.goals} />)}</div>
            : <div className="card empty-state"><p>{t('home_no_goals')}</p></div>}
        </div>
      </div>
    </>
  )
}