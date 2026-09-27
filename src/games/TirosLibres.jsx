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
S.rachaFinal = S.rachaFinal ?? 0
S.vidas = S.vidas ?? 3
S.tiros = S.tiros ?? 0
S.aciertos = S.aciertos ?? 0
S.rachaGol = S.rachaGol ?? 0
S.mejorRachaGol = S.mejorRachaGol ?? 0
S.keeperX = S.keeperX ?? 50

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
  S.vidas = 3
  S.tiros = 0
  S.aciertos = 0
  S.rachaGol = 0
  S.mejorRachaGol = 0
  S.keeperX = 50

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
  angulo: { min: -40, max: 40, step: 2, label: 'tiroslibres_angulo' },
  efecto: { options: ['recto', 'in', 'out'], labels: { recto: 'tiroslibres_efecto_recto', in: 'tiroslibres_efecto_in', out: 'tiroslibres_efecto_out' } },
  potencia: { min: 30, max: 100, step: 2, label: 'tiroslibres_potencia' }
}

/* Geometría del arco (en %, relativo al goal-frame). Todo el tiro se resuelve
   con estos números: sin azar. El arquero tiene velocidad de reacción y hay
   una ventana de "lectura" según la potencia: un tiro fuerte y centrado es
   difícil de atajar, uno lento y abierto es imposible de defender. */
const ARCO = { postIzq: 28, postDer: 72, alto: 22, linea: 76, spread: 40 }

function getWallPosition() {
  /* La barrera da contexto visual de que hay algo entre la pelota y el arco.
     Ya no decide el resultado: eso lo hace la geometria del tiro. */
  const base = [34, 40, 46, 50, 54, 60, 66]
  return Array.from({ length: 5 }, () => base[Math.floor(Math.random() * base.length)])
}

/* Resuelve el tiro de forma DETERMINISTA respecto de la configuracion: el
   mismo angulo + potencia + efecto siempre da el mismo resultado, asi que
   el jugador aprende la parabola en vez de rezar. No hay dados. */
function calcularResultado(config, estado = {}) {
  const { angulo, efecto, potencia } = config
  const racha = estado.racha || 0
  const arqueroBase = estado.keeperX ?? 50

  const rad = (angulo * Math.PI) / 180
  const pot = (potencia - 30) / 70

  /* Potencia alta = mas velocidad = la bola llega antes. Menos potencia =
     mas elevacion (tiro por encima, se pasa o pega en el travesano). */
  const altura = 92 - pot * 32
  const curva = efecto === 'in' ? -6 : efecto === 'out' ? 6 : 0
  const destinoX = 50 + Math.sin(rad) * ARCO.spread + curva * (0.4 + pot * 0.6)
  const destinoY = ARCO.alto + Math.cos(rad) * (altura - ARCO.alto) * 0.8

  /* --- Geometria del arco --- */
  const sobrePalo = destinoY <= ARCO.alto + 2
  const pasado = destinoY >= ARCO.linea
  const rozIzq = destinoX <= ARCO.postIzq && destinoX > ARCO.postIzq - 7
  const rozDer = destinoX >= ARCO.postDer && destinoX < ARCO.postDer + 7
  const dentro = destinoX > ARCO.postIzq && destinoX < ARCO.postDer

  /* --- Arquero: no adivina, se planta. Cubre un radio limitado alrededor
     de su posicion, asi que las esquinas son su punto debil. La potencia
     alta reduce su radio de accion (llega menos tiempo a moverse) y la
     racha alta lo entrena: mejor posicion y mas alcance. --- */
  const alcance = 8 - pot * 3.5 + Math.min(3.5, racha * 0.35)
  const desplazamiento = Math.sign(destinoX - arqueroBase) * Math.min(Math.abs(destinoX - arqueroBase) * 0.35, 5 - pot * 3.2)
  const posicionLectura = arqueroBase + desplazamiento
  const tapado = dentro && !sobrePalo && !pasado &&
    Math.abs(posicionLectura - destinoX) < alcance

  /* Margen a los postes: gol de esquina vale mas. */
  const margen = Math.min(destinoX - ARCO.postIzq, ARCO.postDer - destinoX)

  let result, emoji, text, points
  if (sobrePalo || rozIzq || rozDer) {
    result = 'palo'; emoji = '\u{1F631}'; text = t('tiroslibres_palo'); points = 15
  } else if (!dentro || pasado) {
    result = 'fuera'; emoji = '\u{1F614}'; text = t('tiroslibres_fuera'); points = 0
  } else if (tapado) {
    result = 'atajada'; emoji = '\u{1F9D7}'; text = t('tiroslibres_atajada'); points = 0
  } else if (margen < 6) {
    result = 'gol'; emoji = '\u{1F3AF}'; text = t('tiroslibres_gol'); points = 150
  } else {
    result = 'gol'; emoji = '\u{26BD}'; text = t('tiroslibres_gol'); points = 90
  }

  if (result === 'gol') {
    if ((efecto === 'in' && angulo > 0) || (efecto === 'out' && angulo < 0)) points = Math.round(points * 1.15)
    if ((efecto === 'in' && angulo < 0) || (efecto === 'out' && angulo > 0)) points = Math.round(points * 0.85)
    points += Math.min(60, Math.floor(racha / 2) * 10)
  }

  return {
    points: Math.max(0, Math.round(points)),
    result, emoji, text, config,
    destinoX: Math.max(-10, Math.min(110, destinoX)),
    destinoY: Math.max(-5, Math.min(105, destinoY)),
    atajado: result === 'atajada',
    esquina: result === 'gol' && margen < 6
  }
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
    S.tiros += 1
    /* El arquero se reposiciona con algo de lectura del tiro anterior:
       con racha alta adivina mejor, así que el juego escala solo. */
    S.keeperX = Math.max(28, Math.min(72, S.keeperX + (Math.random() - 0.5) * 18))
    newWallPositions()
    refresh()

    const result = calcularResultado(config, { racha: S.rachaGol, keeperX: S.keeperX })
    S.racha += result.points
    if (result.result === 'gol') {
      S.aciertos += 1
      S.rachaGol += 1
      S.mejorRachaGol = Math.max(S.mejorRachaGol, S.rachaGol)
    } else if (result.result !== 'palo') {
      S.rachaGol = 0
    }
    setLastResult(result)
    setShowResult(true)
    refresh()

    /* Si se acaban los vidas la tanda termina sola. Antes la partida no
       tenía final posible: se podía fallar indefinidamente. */
    if (result.result === 'atajada' || result.result === 'fuera') {
      S.vidas = Math.max(0, S.vidas - 1)
    }
    refresh()

    setTimeout(async () => {
      if (S.vidas <= 0) {
        await finalizarPartida()
        return
      }
      await avanzarTrasTiro(result)
      setShowResult(false)
      setLastResult(null)
      refresh()
    }, 1900)
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
        <div className="best-badge">
          <Target size={16} /> {t('tiroslibres_racha_gol')} <strong>{S.rachaGol}</strong>
        </div>
        <div className="vidas-dots" aria-label={t('tiroslibres_vidas')}>
          {[0, 1, 2].map(i => <span key={i} className={`vida-dot ${i < S.vidas ? 'on' : 'off'}`} />)}
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
            <div className="wall">
              {wallPositions.map((pos, i) => (
                <div key={i} className="wall-player" style={{ left: pos }} />
              ))}
            </div>
            <div
              className={`keeper ${showResult && lastResult?.result === 'atajada' ? (config.angulo < 0 ? 'animate-save animate-save-left' : config.angulo > 0 ? 'animate-save animate-save-right' : 'animate-save animate-save-center') : ''}`}
              style={{ left: S.keeperX + '%' }}
            >
              <div className="keeper-body" />
              <div className="keeper-head" />
              <div className="keeper-gloves" />
            </div>
            <div className="shot-indicator">
              <div className="arrow" style={{ 
                transform: `rotate(${config.angulo}deg)`,
                '--power': config.potencia
              }}>
                <div className="arrow-head" />
                <div className="arrow-shaft" />
              </div>
              <div className="arrow-power" style={{ width: `${config.potencia}%` }} />
            </div>
            {showResult && lastResult && (
              <motion.div
                className={'shot-marker ' + lastResult.result}
                style={{ left: lastResult.destinoX + '%', top: lastResult.destinoY + '%' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                {lastResult.emoji}
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
      <div className="tiroslibres-stats">
        <span>{S.aciertos}/{S.tiros} {t('tiroslibres_goles')}</span>
        <span>{t('tiroslibres_mejor_racha_gol')}: {S.mejorRachaGol}</span>
      </div>
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