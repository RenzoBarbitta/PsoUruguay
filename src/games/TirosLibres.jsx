import React, { useEffect, useReducer, useState } from 'react'
import { motion } from 'motion/react'
import { Flame, RefreshCw, Trophy, Play, RotateCcw, ArrowLeft, LogIn, UserPlus, Target } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { LoginModal } from '../admin/AuthModal.jsx'
import { t, EmptyState } from '../core/ui.jsx'

const S = (window.PSO_GAMES = window.PSO_GAMES || {}).tiroslibres = window.PSO_GAMES.tiroslibres || { jugando: false }
S.racha = S.racha ?? 0
S.respondida = S.respondida ?? false
S.serverMode = S.serverMode ?? false
S.sessionToken = S.sessionToken ?? null
S.serverScore = S.serverScore ?? 0
S.serverError = S.serverError ?? false
S.mostrarResultado = S.mostrarResultado ?? false

let rankingTimer = null

export function stopTirosLibres() {
  if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null }
  S.jugando = false
  S.racha = 0
  S.mostrarResultado = false
  S.respondida = false
}

window.PSO_GAMES.tiroslibres.stop = stopTirosLibres

async function iniciarPartida() {
  S.mostrarResultado = false
  S.jugando = true
  S.racha = 0
  S.respondida = false
  S.serverMode = false
  S.sessionToken = null
  S.serverScore = 0
  S.serverError = false

  if (online) {
    try {
      const data = await gameApi('/api/game/start', { game: 'tiroslibres' })
      S.sessionToken = data.token
      S.serverMode = true
      return
    } catch (e) { /* cae al flujo legacy */ }
  }
}

async function avanzarTrasTiro(result) {
  if (S.serverMode && S.sessionToken) {
    try {
      const res = await gameApi('/api/game/answer', { token: S.sessionToken, a: result.points, meta: result })
      S.sessionToken = res.token
      S.serverScore = res.s
      if (res.over) return finalizarPartida()
      S.respondida = false
      return
    } catch (e) {
      S.jugando = false
      S.respondida = false
      toast(tr('tiroslibres_save_error'), 'error')
      return
    }
  }
  S.respondida = false
}

async function guardarPuntaje(puntaje, gameToken) {
  if (!AuthState.user) return { saved: false, record: false }
  try {
    const data = await rankingApi('/api/ranking/tiroslibres', { token: gameToken })
    if (data.user) {
      AuthState.user = data.user
      localStorage.setItem('pso_user', JSON.stringify(data.user))
    }
    return { saved: true, record: puntaje > 0 }
  } catch (e) {
    const users = getLocalUsers()
    const me = users.find(u => u.id === AuthState.user.id)
    if (me && puntaje > (me.bestPenalStreak || 0)) {
      me.bestPenalStreak = puntaje
      saveLocalUsers(users)
    }
    return { saved: false, record: puntaje > 0 }
  }
}

async function finalizarPartida() {
  let puntajeFinal = S.racha
  S.jugando = false

  if (S.serverMode && S.sessionToken) {
    try {
      const res = await gameApi('/api/game/finish', { token: S.sessionToken })
      if (typeof res.score === 'number') puntajeFinal = res.score
      if (res.user) {
        AuthState.user = res.user
        localStorage.setItem('pso_user', JSON.stringify(res.user))
      }
      S.sessionToken = null
    } catch (e) {
      const r = await guardarPuntaje(puntajeFinal, S.sessionToken)
      if (e.code !== 'not_configured' && !r.saved) toast(tr('tiroslibres_save_error'), 'error')
    }
  } else {
    await guardarPuntaje(puntajeFinal)
  }

  S.rachaFinal = puntajeFinal
  S.mostrarResultado = true
}

async function cargarRankingTirosLibres() {
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/tiroslibres')
      return (data.ranking || [])
        .map(u => ({ id: u.id, nombre: u.displayName || u.username, mejorPuntaje: u.bestPenalStreak || 0, fecha: u.createdAt }))
        .filter(e => e.mejorPuntaje > 0)
        .sort((a, b) => b.mejorPuntaje - a.mejorPuntaje || a.fecha - b.fecha)
    } catch (e) { /* sin red → locales */ }
  }
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, mejorPuntaje: u.bestPenalStreak || 0, fecha: u.createdAt }))
    .filter(e => e.mejorPuntaje > 0)
    .sort((a, b) => b.mejorPuntaje - a.mejorPuntaje || a.fecha - b.fecha)
}

const TIRO_CONFIG = {
  angulo: { min: -35, max: 35, step: 5, label: 'tiroslibres_angulo' },
  efecto: { options: ['recto', 'in', 'out'], labels: { recto: 'tiroslibres_efecto_recto', in: 'tiroslibres_efecto_in', out: 'tiroslibres_efecto_out' } },
  potencia: { min: 30, max: 100, step: 10, label: 'tiroslibres_potencia' }
}

function getWallPosition() {
  const basePositions = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%']
  return Array.from({ length: 5 }, () => basePositions[Math.floor(Math.random() * basePositions.length)])
}

function calcularResultado(config) {
  const { angulo, efecto, potencia } = config
  const anguloAbs = Math.abs(angulo)
  let points = 0
  let result = 'fuera'
  let emoji = '😔'
  let text = t('tiroslibres_fuera')

  const barreraProb = 0.15 + (potencia / 100) * 0.1
  const arqueroProb = 0.25 + (anguloAbs / 35) * 0.3

  if (Math.random() < barreraProb) {
    result = 'barrera'; emoji = '🧱'; text = t('tiroslibres_barrera'); points = 0
  } else if (Math.random() < arqueroProb) {
    result = 'atajada'; emoji = '🧤'; text = t('tiroslibres_atajada'); points = 0
  } else if (anguloAbs <= 8 && potencia >= 70 && potencia <= 90) {
    result = 'gol'; emoji = '⚽'; text = t('tiroslibres_gol'); points = 100 + (90 - potencia) + (8 - anguloAbs) * 5
  } else if (anguloAbs <= 15 && potencia >= 60) {
    result = 'gol'; emoji = '⚽'; text = t('tiroslibres_gol'); points = 60 + (80 - potencia) + (15 - anguloAbs) * 3
  } else if (anguloAbs <= 25 && potencia >= 50) {
    if (Math.random() < 0.3) { result = 'palo'; emoji = '😱'; text = t('tiroslibres_palo'); points = 20 }
    else { result = 'gol'; emoji = '⚽'; text = t('tiroslibres_gol'); points = 30 }
  } else {
    result = 'fuera'; emoji = '😔'; text = t('tiroslibres_fuera'); points = 0
  }

  if (efecto === 'in' && angulo < 0) points = Math.round(points * 1.1)
  if (efecto === 'out' && angulo > 0) points = Math.round(points * 1.1)
  if (efecto === 'in' && angulo > 0) points = Math.round(points * 0.8)
  if (efecto === 'out' && angulo < 0) points = Math.round(points * 0.8)

  return { points: Math.max(0, points), result, emoji, text, config }
}

export default function TirosLibres() {
  const { v, openModal } = useApp()
  void v
  const [, force] = useReducer(x => x + 1, 0)
  const [ranking, setRanking] = useState([])
  const [config, setConfig] = useState({ angulo: 0, efecto: 'recto', potencia: 70 })
  const [lastResult, setLastResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [wallPositions, setWallPositions] = useState(getWallPosition())

  const refresh = () => force()

  const newWallPositions = () => setWallPositions(getWallPosition())

  useEffect(() => {
    if (S.jugando || S.mostrarResultado || !AuthState.user) return
    let alive = true
    const run = async () => {
      if (!alive || State.currentTab !== 'tiroslibres') return
      const list = await cargarRankingTirosLibres()
      if (!alive) return
      setRanking(list.slice(0, 10))
    }
    run()
    rankingTimer = setInterval(run, 5000)
    return () => { alive = false; if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null } }
  }, [])

  if (!AuthState.user) return <LoginRequired openModal={openModal} />

  if (!S.jugando && S.mostrarResultado) {
    return <Result puntaje={S.rachaFinal} onVolver={refresh} onNuevo={async () => { await iniciarPartida(); setLastResult(null); setShowResult(false); refresh() }} />
  }

  if (!S.jugando) {
    return (
      <TirosLibresHome ranking={ranking} user={AuthState.user} onStart={async () => { await iniciarPartida(); setLastResult(null); setShowResult(false); refresh() }} />
    )
  }

  const handleTiro = async () => {
    if (S.respondida) return
    S.respondida = true
    newWallPositions()
    refresh()
    const result = calcularResultado(config)
    S.racha += result.points
    setLastResult(result)
    setShowResult(true)
    refresh()
    setTimeout(async () => {
      await avanzarTrasTiro(result)
      setShowResult(false)
      setLastResult(null)
      refresh()
    }, 2500)
  }

  const handleAbandonar = () => openTirosLibresAbandonar(openModal, refresh)

  return (
    <>
      <div className="game-topbar">
        <div className="streak">
          <Flame size={22} className="flame" />
          <span className="streak-num">{S.racha}</span>
          <span className="streak-label">{t('tiroslibres_racha_actual')}</span>
        </div>
        <button className="btn btn-sm" onClick={handleAbandonar}>{t('tiroslibres_terminar')}</button>
      </div>

      <motion.div className="card tiroslibres-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h3 className="tiroslibres-title">{t('tiroslibres_apuntar')}</h3>

        <div className="tiroslibres-controls">
          <div className="control-group">
            <label>{t('tiroslibres_angulo')}</label>
            <div className="slider-row">
              <input type="range" min={TIRO_CONFIG.angulo.min} max={TIRO_CONFIG.angulo.max} step={TIRO_CONFIG.angulo.step} value={config.angulo} onChange={e => setConfig(c => ({ ...c, angulo: Number(e.target.value) }))} />
              <span className="slider-value">{config.angulo > 0 ? '+' : ''}{config.angulo}°</span>
            </div>
          </div>

          <div className="control-group">
            <label>{t('tiroslibres_efecto')}</label>
            <div className="efecto-btns">
              {TIRO_CONFIG.efecto.options.map(opt => (
                <button key={opt} className={`efecto-btn ${config.efecto === opt ? 'active' : ''}`} onClick={() => setConfig(c => ({ ...c, efecto: opt }))}>
                  {t(TIRO_CONFIG.efecto.labels[opt])}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>{t('tiroslibres_potencia')}</label>
            <div className="slider-row">
              <input type="range" min={TIRO_CONFIG.potencia.min} max={TIRO_CONFIG.potencia.max} step={TIRO_CONFIG.potencia.step} value={config.potencia} onChange={e => setConfig(c => ({ ...c, potencia: Number(e.target.value) }))} />
              <span className="slider-value">{config.potencia}%</span>
            </div>
          </div>
        </div>

        <div className="tiroslibres-preview">
          <div className="goal-frame">
            <div className="goal-post left" />
            <div className="goal-post right" />
            <div className="goal-crossbar" />
            <div className="goal-net" />
            <div className={`wall ${showResult && lastResult?.result === 'barrera' ? 'animate-jump' : ''}`}>
              {wallPositions.map((pos, i) => (
                <div key={i} className="wall-player" style={{ left: pos }} />
              ))}
            </div>
            <div className={`keeper ${showResult ? (lastResult?.result === 'atajada' ? (config.angulo < 0 ? 'animate-save animate-save-left' : config.angulo > 0 ? 'animate-save animate-save-right' : 'animate-save animate-save-center') : '') : ''}`}>
              <div className="keeper-body" />
              <div className="keeper-head" />
              <div className="keeper-gloves" />
            </div>
            <div className={`ball ${showResult ? 'animate-' + lastResult?.result : ''}`} 
                 style={{ 
                   left: `calc(50% + ${config.angulo}%)`,
                   '--gol-x': `${50 + config.angulo}%`
                 }} />
            {showResult && lastResult && (
              <motion.div className="ball-trajectory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
                <div className="trajectory-path" style={{ 
                  '--angle': config.angulo, 
                  '--power': config.potencia,
                  '--result': lastResult.result 
                }} />
              </motion.div>
            )}
          </div>
        </div>

        {showResult && lastResult && (
          <motion.div className="tiroslibres-result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <div className="result-emoji">{lastResult.emoji}</div>
            <div className="result-text">{lastResult.text}</div>
            {lastResult.points > 0 && <div className="result-points">+{lastResult.points} {t('tiroslibres_puntos')}</div>}
          </motion.div>
        )}

        <button className="btn btn-primary btn-lg tiroslibres-btn" onClick={handleTiro} disabled={S.respondida}>
          {S.respondida ? '⏳' : t('tiroslibres_jugar')}
        </button>
      </motion.div>
    </>
  )
}

function LoginRequired({ openModal }) {
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('tiroslibres_title')}</h2></div>
      <motion.div className="card game-cta-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-cta-emoji">⚽</div>
        <h3>{t('penales_need_account_title')}</h3>
        <p>{t('penales_need_account_desc')}</p>
        <div className="btn-row-block">
          <button className="btn btn-primary btn-block" onClick={() => openModal(<LoginModal />)}><LogIn size={16} /> {t('btn_ingresar')}</button>
          <button className="btn btn-gold btn-block" onClick={() => openModal(<LoginModal initialTab="register" />)}><UserPlus size={16} /> {t('btn_crear_cuenta')}</button>
        </div>
        <span className="auth-link">{t('penales_online_note')}</span>
      </motion.div>
    </>
  )
}

function TirosLibresHome({ ranking, user, onStart }) {
  const nombre = user.displayName || user.username
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('tiroslibres_title')}</h2>
        <span className="section-sub">{t('tiroslibres_jugando_como', { name: nombre })}</span>
      </div>

      <motion.div className="card game-hero game-hero--tiroslibres" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="game-hero-emoji">⚽</div>
        <h3>{t('tiroslibres_desc')}</h3>
        <button className="btn btn-gold btn-lg" onClick={onStart}><Play size={18} /> {t('tiroslibres_jugar')}</button>
      </motion.div>

      <div className="section-head">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>{t('tiroslibres_ranking')}</h3>
        <span className="section-sub rank-refresh"><RefreshCw size={13} /> {t('penales_autorefresh')}</span>
      </div>
      {ranking.length
        ? <div className="rank-list">{ranking.map((e, i) => <TirosLibresRankRow key={e.id} e={e} i={i} mark={t('trivia_vos')} icon="⚽" />)}</div>
        : <EmptyState icon="🥅" text={t('tiroslibres_no_players')} />}
    </>
  )
}

function TirosLibresRankRow({ e, i, mark, icon }) {
  const esVos = AuthState.user && e.id === AuthState.user.id
  return (
    <div className={`rank-item ${esVos ? 'is-you' : ''}`}>
      <div className="rank-pos">{i + 1}</div>
      <div className="rank-avatar">
        {e.avatar ? <img src={e.avatar} alt="" className="rank-avatar-img" /> : e.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="rank-info">
        <div className="rank-name">{e.nombre} {esVos ? <span className="rank-you-mark">{mark}</span> : null}</div>
        <div className="rank-team">{t('tiroslibres_mejor_puntaje')}</div>
      </div>
      <div className="rank-value-wrap"><span className="rank-emoji">{icon}</span><div className="rank-value">{e.mejorPuntaje}</div></div>
    </div>
  )
}

function Result({ puntaje, onVolver, onNuevo }) {
  const emoji = puntaje >= 300 ? '🏆' : puntaje >= 150 ? '🎉' : '⚽'
  return (
    <motion.div className="game-result-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <div className="game-result-emoji">{emoji}</div>
      <h3>{t('tiroslibres_fin')}</h3>
      <p>{t('tiroslibres_tu_puntaje', { n: puntaje })}</p>
      <div className="game-result-score">{puntaje} <Target size={26} /></div>
      <div className="btn-row-center">
        <button className="btn" onClick={onVolver}><ArrowLeft size={16} /> {t('tiroslibres_ver_ranking')}</button>
        <button className="btn btn-primary" onClick={onNuevo}><RotateCcw size={16} /> {t('tiroslibres_jugar_de_nuevo')}</button>
      </div>
    </motion.div>
  )
}

function openTirosLibresAbandonar(openModal, refresh) {
  openModal(
    <ConfirmGameModal
      title={t('tiroslibres_terminar_modal_t')}
      desc={t('tiroslibres_terminar_modal_p', { n: S.racha })}
      keepLabel={t('tiroslibres_seguir_jugando')}
      leaveLabel={t('tiroslibres_confirmar_terminar')}
      onLeave={async () => { await finalizarPartida(); refresh() }}
    />
  )
}

function ConfirmGameModal({ title, desc, keepLabel, leaveLabel, onLeave }) {
  const { closeModal } = useApp()
  return (
    <div className="modal-pad">
      <div className="modal-title-text">{title}</div>
      <div className="modal-body-text">{desc}</div>
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{keepLabel}</button>
        <button className="btn btn-danger" onClick={() => { closeModal(); onLeave() }}>{leaveLabel}</button>
      </div>
    </div>
  )
}