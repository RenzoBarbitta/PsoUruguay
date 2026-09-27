import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Trophy, RefreshCw, Play, RotateCcw, ArrowLeft, LogIn, UserPlus, Target } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { LoginModal } from '../admin/AuthModal.jsx'
import { t, EmptyState } from '../core/ui.jsx'

const S = (window.PSO_GAMES = window.PSO_GAMES || {}).predicciones = window.PSO_GAMES.predicciones || { preds: {} }

let rankingTimer = null

function getUpcomingMatches() {
  const matches = (State.data.matches || []).filter(m => !m.played && !m.isBye)
  matches.sort((a, b) => (a.round || 0) - (b.round || 0) || (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
  return matches
}

function getTeamById(id) {
  return State.data.teams.find(t => t.id === id)
}

function getUserPreds() {
  if (!AuthState.user) return {}
  return S.preds[AuthState.user.id] || {}
}

function saveUserPreds(preds) {
  if (!AuthState.user) return
  S.preds[AuthState.user.id] = preds
  if (typeof saveLocalFallback === 'function') saveLocalFallback()
}

async function cargarRankingPredicciones() {
  if (!AuthState.user) return []
  try {
    const data = await rankingApi('/api/ranking/predicciones')
    return (data.ranking || [])
      .map(u => ({ id: u.id, nombre: u.displayName || u.username, puntos: u.prediccionesPoints || 0, fecha: u.createdAt }))
      .filter(e => e.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || a.fecha - b.fecha)
  } catch (e) {
    return getLocalPrediccionesRanking()
  }
}

function getLocalPrediccionesRanking() {
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, puntos: u.prediccionesPoints || 0, fecha: u.createdAt }))
    .filter(e => e.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.fecha - b.fecha)
}

function computePrediccionesPoints() {
  const preds = getUserPreds()
  let total = 0
  State.data.matches.filter(m => m.played).forEach(m => {
    const p = preds[m.id]
    if (!p) return
    if (p.home === m.homeScore && p.away === m.awayScore) total += 3
    else if ((p.home > p.away && m.homeScore > m.awayScore) ||
             (p.home < p.away && m.homeScore < m.awayScore) ||
             (p.home === p.away && m.homeScore === m.awayScore)) total += 1
  })
  return total
}

export function stopPredicciones() {
  if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null }
}

export default function Predicciones() {
  const { v, openModal } = useApp()
  void v
  const [, force] = useState(0)
  const [ranking, setRanking] = useState([])
  const [userPreds, setUserPreds] = useState({})

  const refresh = () => { force(x => x + 1); setUserPreds(getUserPreds()) }

  useEffect(() => {
    if (!AuthState.user) return
    let alive = true
    const run = async () => {
      if (!alive || State.currentTab !== 'predicciones') return
      const list = await cargarRankingPredicciones()
      if (!alive) return
      setRanking(list.slice(0, 10))
    }
    run()
    rankingTimer = setInterval(run, 10000)
    return () => { alive = false; if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null } }
  }, [])

  useEffect(() => {
    if (AuthState.user) setUserPreds(getUserPreds())
  }, [AuthState.user, v])

  if (!AuthState.user) return <LoginRequired openModal={openModal} />

  const upcoming = getUpcomingMatches()
  const myPoints = computePrediccionesPoints()
  const myRank = ranking.findIndex(r => r.id === AuthState.user.id) + 1

  const handleSave = async (matchId, home, away) => {
    const match = State.data.matches.find(m => m.id === matchId)
    if (match?.played) { toast(t('predicciones_toast_ya_jugado'), 'error'); return }
    const newPreds = { ...userPreds, [matchId]: { home, away } }
    setUserPreds(newPreds)
    saveUserPreds(newPreds)
    toast(t('predicciones_toast_guardado'))
    refresh()
  }

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('predicciones_title')}</h2>
        <span className="section-sub">{t('predicciones_jugando_como', { name: AuthState.user.displayName || AuthState.user.username })}</span>
      </div>

      <motion.div className="card game-hero game-hero--predicciones" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="game-hero-emoji">🔮</div>
        <h3>{t('predicciones_desc')}</h3>
        <div className="predicciones-score">
          <span>🏆 {myPoints} pts</span>
          {myRank ? <span>#{myRank}</span> : null}
        </div>
      </motion.div>

      {upcoming.length === 0 ? (
        <EmptyState icon="📅" text={t('predicciones_no_matches')} />
      ) : (
        <div className="predicciones-list">
          {upcoming.map(m => {
            const home = getTeamById(m.homeId)
            const away = getTeamById(m.awayId)
            if (!home || !away) return null
            const pred = userPreds[m.id] || { home: '', away: '' }
            const [hVal, setHVal] = useState(pred.home)
            const [aVal, setAVal] = useState(pred.away)
            return (
              <motion.div key={m.id} className="prediccion-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="prediccion-header">
                  <span className="prediccion-round">{t('admin_round', { n: m.round })}</span>
                  {m.scheduledDate && <span className="prediccion-date">{m.scheduledDate}{m.scheduledTime ? ' ' + m.scheduledTime : ''}</span>}
                </div>
                <div className="prediccion-teams">
                  <div className="prediccion-team">
                    <div className="prediccion-team-name">{home.name}</div>
                    <input type="number" min="0" max="20" className="prediccion-input" value={hVal} onChange={e => setHVal(e.target.value)} placeholder="?" />
                  </div>
                  <span className="prediccion-vs">VS</span>
                  <div className="prediccion-team">
                    <div className="prediccion-team-name">{away.name}</div>
                    <input type="number" min="0" max="20" className="prediccion-input" value={aVal} onChange={e => setAVal(e.target.value)} placeholder="?" />
                  </div>
                </div>
                <button className="btn btn-sm btn-primary prediccion-btn" onClick={() => handleSave(m.id, Number(hVal) || 0, Number(aVal) || 0)} disabled={hVal === '' || aVal === ''}>
                  <Target size={14} /> {t('predicciones_btn_guardar')}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="section-head">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>{t('predicciones_ranking')}</h3>
        <span className="section-sub rank-refresh"><RefreshCw size={13} /> {t('trivia_autorefresh')}</span>
      </div>
      {ranking.length
        ? <div className="rank-list">{ranking.map((e, i) => <PrediccionRankRow key={e.id} e={e} i={i} mark={t('trivia_vos')} icon="🔮" />)}</div>
        : <EmptyState icon="🏆" text={t('trivia_no_players')} />}
    </>
  )
}

function LoginRequired({ openModal }) {
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('predicciones_title')}</h2></div>
      <motion.div className="card game-cta-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-cta-emoji">🔮</div>
        <h3>{t('trivia_need_account_title')}</h3>
        <p>{t('trivia_need_account_desc')}</p>
        <div className="btn-row-block">
          <button className="btn btn-primary btn-block" onClick={() => openModal(<LoginModal />)}><LogIn size={16} /> {t('btn_ingresar')}</button>
          <button className="btn btn-gold btn-block" onClick={() => openModal(<LoginModal initialTab="register" />)}><UserPlus size={16} /> {t('btn_crear_cuenta')}</button>
        </div>
        <span className="auth-link">{t('trivia_online_note')}</span>
      </motion.div>
    </>
  )
}

function PrediccionRankRow({ e, i, mark, icon }) {
  const esVos = AuthState.user && e.id === AuthState.user.id
  return (
    <div className={`rank-item ${esVos ? 'is-you' : ''}`}>
      <div className="rank-pos">{i + 1}</div>
      <div className="rank-avatar">{e.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div className="rank-info">
        <div className="rank-name">{e.nombre} {esVos ? <span className="rank-you-mark">{mark}</span> : null}</div>
        <div className="rank-team">{t('predicciones_pts_exacto', { n: 3 })} · {t('predicciones_pts_ganador', { n: 1 })}</div>
      </div>
      <div className="rank-value-wrap"><span className="rank-emoji">{icon}</span><div className="rank-value">{e.puntos}</div></div>
    </div>
  )
}