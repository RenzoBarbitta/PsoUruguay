import React, { useEffect, useReducer, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw, ArrowLeft, RefreshCw, Timer, Flame } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { LoginModal } from '../admin/AuthModal.jsx'
import { t, EmptyState } from '../core/ui.jsx'
import { ConfirmGameModal, RankRow } from './Trivia.jsx'
import { useModalRef } from '../core/modalRef.jsx'

/* ======================================================================
   PENALES ONLINE (réplica React de js/legacy/penales.js)
   Misma lógica + mismo protocolo anti-trampa del server (piso de tiempo
   anti-autoplay: cada tiro se valida en /api/game/kick).
   Estado en window.PSO_GAMES.penales (persiste entre tabs).
   ====================================================================== */

const ZONAS = ['izq', 'cen', 'der']
const TIEMPO_BASE = 3500
const TIEMPO_MIN = 1000
const DECREMENTO = 150
const RECORD_KEY = 'pso_penales_record'

const S = (window.PSO_GAMES = window.PSO_GAMES || {}).penales = window.PSO_GAMES.penales || { jugando: false }
S.nivel = S.nivel ?? 1
S.goles = S.goles ?? 0
S.restante = S.restante ?? TIEMPO_BASE
S.respondida = S.respondida ?? false
S.zona = S.zona ?? null
S.arqueroZona = S.arqueroZona ?? null
S.resultado = S.resultado ?? null
S._nuevoRecord = S._nuevoRecord ?? false
S.serverMode = S.serverMode ?? false
S.sessionToken = S.sessionToken ?? null
S.serverScore = S.serverScore ?? 0
S.serverError = S.serverError ?? false
S.finalizando = S.finalizando ?? false
S.mostrarSiguiente = S.mostrarSiguiente ?? false
S.mostrarResultado = S.mostrarResultado ?? false
S.prevBest = S.prevBest ?? undefined

let penalTimer = null
let rankingTimer = null

export function stopPenales() {
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null }
  if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null }
  S.jugando = false
  S.respondida = false
  S.mostrarResultado = false
  S.mostrarSiguiente = false
  S.zona = null
  S.arqueroZona = null
  S.resultado = null
}

function volverHome() {
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null }
  S.jugando = false
  S.respondida = false
  S.mostrarResultado = false
  S.mostrarSiguiente = false
  S.zona = null
  S.arqueroZona = null
  S.resultado = null
  S.finalizando = false
  forceRender()
}

const tiempoLimite = nivel => Math.max(TIEMPO_MIN, TIEMPO_BASE - (nivel - 1) * DECREMENTO)
const penalRecordLocal = () => { try { return Number(localStorage.getItem(RECORD_KEY)) || 0 } catch (e) { return 0 } }
const penalGuardarRecordLocal = n => {
  let nuevo = false
  try { if (n > penalRecordLocal()) { localStorage.setItem(RECORD_KEY, String(n)); nuevo = true } } catch (e) {}
  return nuevo
}

function penalZonaLabel(z) {
  const txt = t('penales_zona_' + z)
  return z === 'izq' ? '⬅️ ' + txt : z === 'der' ? txt + ' ➡️' : txt
}

async function cargarRanking() {
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/penales')
      return (data.ranking || [])
        .map(u => ({ id: u.id, nombre: u.displayName || u.username, racha: u.bestPenalStreak || 0, fecha: u.createdAt }))
        .filter(e => e.racha > 0)
    } catch (e) { /* → locales */ }
  }
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, racha: u.bestPenalStreak || 0, fecha: u.createdAt }))
    .filter(e => e.racha > 0)
}

async function sincronizarMejorRacha() {
  if (!AuthState.user) return penalRecordLocal()
  try {
    const data = await rankingApi('/api/ranking/penales')
    const yo = (data.ranking || []).find(u => u.id === AuthState.user.id)
    if (yo) {
      AuthState.user.bestPenalStreak = yo.bestPenalStreak
      localStorage.setItem('pso_user', JSON.stringify(AuthState.user))
      return yo.bestPenalStreak
    }
    return 0
  } catch (e) {
    return penalRecordLocal()
  }
}

async function obtenerMejorRachaServer() {
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking/penales')
      const yo = (data.ranking || []).find(u => u.id === AuthState.user.id)
      if (yo) return yo.bestPenalStreak
    } catch (e) { /* → sesión */ }
  }
  return AuthState.user ? Number(AuthState.user.bestPenalStreak || 0) : 0
}

async function guardarRecord(racha, prevBest, gameToken) {
  if (!AuthState.user) return { saved: false, record: false }
  const base = prevBest !== undefined ? prevBest : (AuthState.user.bestPenalStreak || 0)
  const esRecord = racha > base
  try {
    const data = await rankingApi('/api/ranking/penales', { token: gameToken })
    if (data.user) {
      AuthState.user = data.user
      localStorage.setItem('pso_user', JSON.stringify(data.user))
    }
    return { saved: true, record: esRecord }
  } catch (e) {
    const users = getLocalUsers()
    const me = users.find(u => u.id === AuthState.user.id)
    if (me && racha > (me.bestPenalStreak || 0)) {
      me.bestPenalStreak = racha
      saveLocalUsers(users)
    }
    return { saved: false, record: esRecord }
  }
}

/* ---------------- Partida ---------------- */

async function iniciarPenales() {
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null }
  S.mostrarResultado = false
  S.mostrarSiguiente = false
  S.jugando = true
  S.nivel = 1
  S.goles = 0
  S.restante = tiempoLimite(1)
  S.respondida = false
  S.zona = null
  S.arqueroZona = null
  S.resultado = null
  S._nuevoRecord = false
  S.serverMode = false
  S.sessionToken = null
  S.serverScore = 0
  S.serverError = false
  S.finalizando = false

  if (online) {
    try {
      const data = await gameApi('/api/game/start', { game: 'penales' })
      S.sessionToken = data.token
      S.serverMode = true
    } catch (e) { /* → flujo legacy */ }
  }
  S.prevBest = await obtenerMejorRachaServer()
}

const elegirArquero = () => ZONAS[Math.floor(Math.random() * ZONAS.length)]

let pendGolTimeout = null
let pendFailTimeout = null

async function ejecutarTiro(zona) {
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null }
  if (!S.jugando || S.respondida) return
  S.respondida = true
  S.finalizando = false

  const arquero = elegirArquero()
  S.arqueroZona = arquero
  S.zona = zona

  const esGol = zona !== null && zona !== arquero
  S.resultado = esGol ? 'gol' : (zona === null ? 'sin_tiempo' : 'atajada')
  if (esGol) {
    S.goles++
    S.nivel = S.goles + 1
  }

  if (S.serverMode && S.sessionToken) {
    gameApi('/api/game/kick', { token: S.sessionToken, result: S.resultado })
      .then(res => {
        S.sessionToken = res.token
        S.serverScore = res.s
        if (res.reason === 'too_fast') S.goles = res.s
      })
      .catch(() => { S.serverError = true })
  }

  if (pendGolTimeout) clearTimeout(pendGolTimeout)
  if (pendFailTimeout) clearTimeout(pendFailTimeout)

  if (esGol) {
    pendGolTimeout = setTimeout(async () => {
      if (S.goles >= 100) return finalizarPenales()
      S.mostrarSiguiente = true
      forceRender()
    }, 900)
  } else {
    pendFailTimeout = setTimeout(() => finalizarPenales(), 1700)
  }
}

function nextPenal() {
  if (!S.jugando) return
  S.respondida = false
  S.restante = tiempoLimite(S.nivel)
  S.mostrarSiguiente = false
  S.zona = null
  S.arqueroZona = null
  S.resultado = null
  forceRender()
}

async function finalizarPenales() {
  if (S.finalizando) return
  S.finalizando = true
  if (penalTimer) { clearInterval(penalTimer); penalTimer = null }
  let racha = S.goles
  const prevBest = (S.prevBest !== undefined ? S.prevBest : (AuthState.user ? Number(AuthState.user.bestPenalStreak || 0) : 0))
  let esRecordOnline = false

  if (S.serverMode && S.sessionToken && !S.serverError) {
    try {
      const res = await gameApi('/api/game/finish', { token: S.sessionToken })
      if (typeof res.score === 'number') racha = res.score
      if (res.user) {
        AuthState.user = res.user
        localStorage.setItem('pso_user', JSON.stringify(res.user))
      }
      S.sessionToken = null
      esRecordOnline = racha > prevBest && racha > 0
    } catch (e) {
      const r = await guardarRecord(racha, prevBest, S.sessionToken)
      if (e.code !== 'not_configured' && !r.saved) toast(tr('penales_save_error'), 'error')
    }
  } else {
    esRecordOnline = (await guardarRecord(racha, prevBest)).record
  }

  const esRecordLocal = penalGuardarRecordLocal(racha)
  S.jugando = false
  S.respondida = false
  S.mostrarSiguiente = false
  S.finalizando = false
  S._nuevoRecord = (esRecordOnline || esRecordLocal) && racha > 0
  S.rachaFinal = racha
  S.mostrarResultado = true
  forceRender()
}

let forceRender = () => {}

window.PSO_GAMES.penales.stop = stopPenales

/* ---------------- Componente ---------------- */

export default function Penales() {
  const { v, openModal, modals } = useApp()
  void v
  const [, force] = useReducer(x => x + 1, 0)
  forceRender = force
  const modalsOpen = useModalRef(modals)
  const barRef = useRef(null)
  const [shoot, setShoot] = useState(null) // {zona, arquero, gol, t:Date.now()}

  /* Timer de reacción: actualiza la barra por DOM, sin recargar React. */
  useEffect(() => {
    if (!S.jugando || S.respondida) return
    const updateBar = () => {
      const bar = barRef.current
      if (!bar) return
      const limite = tiempoLimite(S.nivel)
      const pct = Math.max(0, Math.min(100, (S.restante / limite) * 100))
      bar.style.width = pct + '%'
      bar.classList.toggle('warn', pct < 25)
    }
    const tick = () => {
      if (State.currentTab !== 'penales' || modalsOpen.current) return
      if (!S.jugando || S.respondida) return
      S.restante -= 50
      if (S.restante <= 0) {
        S.restante = 0
        clearInterval(penalTimer)
        penalTimer = null
        ejecutarTiro(null)
        return
      }
      updateBar()
    }
    updateBar()
    if (penalTimer) clearInterval(penalTimer)
    penalTimer = setInterval(tick, 50)
    return () => { if (penalTimer) { clearInterval(penalTimer); penalTimer = null } }
  }, [S.jugando, S.respondida, S.nivel])

  /* Auto-refresco del ranking en la home */
  useEffect(() => {
    if (S.jugando || S.mostrarResultado || !AuthState.user) return
    let alive = true
    const run = async () => {
      if (!alive || State.currentTab !== 'penales') return
      const list = await cargarRanking()
      if (!alive) return
      list.sort((a, b) => b.racha - a.racha || a.fecha - b.fecha)
      setRanking(list.slice(0, 10))
      setMejorRacha(await sincronizarMejorRacha())
    }
    run()
    rankingTimer = setInterval(run, 5000)
    return () => { alive = false; if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null } }
  }, [])

  const [ranking, setRanking] = useState([])
  const [mejorRacha, setMejorRacha] = useState(() => penalRecordLocal())

  if (!AuthState.user) return <LoginRequired openModal={openModal} />

  if (!S.jugando && S.mostrarResultado) {
    return (
      <Result
        racha={S.rachaFinal}
        nuevoRecord={S._nuevoRecord}
        onVolver={volverHome}
        onNuevo={async () => { await iniciarPenales(); setShoot(null); force() }}
      />
    )
  }

  if (!S.jugando) {
    return <Home ranking={ranking} mejorRacha={mejorRacha} onStart={async () => { await iniciarPenales(); setShoot(null); force() }} />
  }

  return (
    <Game
      shoot={shoot}
      onZone={z => {
        if (S.respondida || !S.jugando) return
        ejecutarTiro(z)
        setShoot({ zona: z, arquero: S.arqueroZona, gol: z !== S.arqueroZona, t: Date.now() })
      }}
      onNext={() => { nextPenal(); setShoot(null) }}
      onTerminar={() => openModal(
        <ConfirmGameModal
          title={t('penales_terminar_modal_t')}
          desc={t('penales_terminar_modal_p', { n: S.goles })}
          keepLabel={t('penales_seguir_jugando')}
          leaveLabel={t('penales_confirmar_terminar')}
          onLeave={() => finalizarPenales()}
        />
      )}
      barRef={barRef}
    />
  )
}

function LoginRequired({ openModal }) {
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('penales_title')}</h2></div>
      <motion.div className="card game-cta-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-cta-emoji">🥅</div>
        <h3>{t('penales_need_account_title')}</h3>
        <p>{t('penales_need_account_desc')}</p>
        <div className="btn-row-block">
          <button className="btn btn-primary btn-block" onClick={() => openModal(<LoginModal />)}>{t('btn_ingresar')}</button>
          <button className="btn btn-gold btn-block" onClick={() => openModal(<LoginModal initialTab="register" />)}>{t('btn_crear_cuenta')}</button>
        </div>
        <span className="auth-link">{t('penales_online_note')}</span>
      </motion.div>
    </>
  )
}

function Home({ ranking, mejorRacha, onStart }) {
  const nombre = AuthState.user.displayName || AuthState.user.username
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('penales_title')}</h2>
        <span className="section-sub">{t('penales_jugando_como', { name: nombre })}</span>
      </div>

      <motion.div className="card game-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="game-hero-emoji">🥅</div>
        <h3>{t('penales_title')}</h3>
        <p>{t('penales_desc')}</p>
        <button className="btn btn-gold btn-lg" onClick={onStart}>{t('penales_jugar')}</button>
        <details className="penal-como">
          <summary>{t('penales_como_funciona_t')}</summary>
          <p>{t('penales_como_funciona_p')}</p>
        </details>
      </motion.div>

      <div className="card best-card">
        <div className="best-emoji">🎯</div>
        <div className="best-info">
          <div className="best-t">{t('penales_mejor_racha')}</div>
          <div className="best-val">{mejorRacha > 0 ? <>{mejorRacha} ⚽ {t('penales_goles').toLowerCase()}</> : t('penales_no_players')}</div>
        </div>
      </div>

      <div className="section-head">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>{t('penales_ranking')}</h3>
        <span className="section-sub rank-refresh"><RefreshCw size={13} /> {t('penales_autorefresh')}</span>
      </div>
      {ranking.length
        ? <div className="rank-list">{ranking.map((e, i) => <RankRow key={e.id} e={e} i={i} label={t('penales_mejor_racha')} mark={t('penales_vos')} icon="⚽" />)}</div>
        : <EmptyState icon="🏆" text={t('penales_no_players')} />}
    </>
  )
}

function Game({ shoot, onZone, onNext, onTerminar, barRef }) {
  const limite = tiempoLimite(S.nivel)
  const barReset = S.respondida ? 0 : 100
  const k = shoot && shoot.arquero
  const gol = !!(k && shoot.gol)
  const dir = z => (z === 'izq' ? -1 : z === 'der' ? 1 : 0)

  const ballAnim = k
    ? gol
      ? {
          x: [0, dir(shoot.zona) * 60, dir(shoot.zona) * 98],
          y: [0, -170, -152],
          rotate: [0, 420, 560],
          transition: { duration: 0.85, times: [0, 0.55, 1], ease: 'easeOut' }
        }
      : {
          x: [0, dir(shoot.arquero) * 70, dir(shoot.arquero) * 46],
          y: [0, -150, -78],
          rotate: [0, 280, 170],
          scale: [1, 1, 0.6],
          opacity: [1, 1, 0.7],
          transition: { duration: 0.9, times: [0, 0.6, 1], ease: 'easeOut' }
        }
    : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }

  const keeperAnim = k
    ? shoot.arquero === 'cen'
      ? { y: -16, scaleY: 1.12, rotate: 0 }
      : { x: dir(shoot.arquero) * 54, y: -8, rotate: dir(shoot.arquero) * 36 }
    : { x: 0, y: 0, rotate: 0, scaleY: 1 }

  return (
    <>
      <div className="penal-topbar">
        <div className="penal-level">
          <span className="penal-nivel">{t('penales_nivel', { n: S.nivel })}</span>
          <span className="penal-sublevel">· {t('penales_time_reaction')} {t('penales_seg', { t: (limite / 1000).toFixed(1).replace('.', ',') })}</span>
        </div>
        <div className="penal-goals"><span>{t('penales_goles')}</span><b>{S.goles}</b></div>
        <button className="btn btn-sm" onClick={onTerminar}>{t('penales_terminar')}</button>
      </div>

      <div className="card penal-card">
        <div className="penal-pitch">
          <div className="penal-goal">
            <span className="penal-net" aria-hidden="true" />
            <motion.div
              className="penal-keeper"
              initial={false}
              animate={keeperAnim}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            >
              <span className="kp-arm kp-arm-l" />
              <span className="kp-arm kp-arm-r" />
              <span className="kp-body" />
              <span className="kp-head" />
            </motion.div>
          </div>
          <div className="penal-spot" />
          <div className="penal-ball-shadow" aria-hidden="true" />
          <motion.div
            className="penal-ball"
            initial={false}
            animate={ballAnim}
            transition={k ? undefined : { duration: 0.18 }}
          />
        </div>
        <div className="penal-feedback">
          {!shoot ? (
            t('penales_remata')
          ) : S.resultado === 'gol' ? (
            <span style={{ color: 'var(--win)' }}>{t('penales_gol')}</span>
          ) : S.zona === null ? (
            <span style={{ color: 'var(--loss)' }}>{t('penales_sin_tiempo')}</span>
          ) : (
            <span style={{ color: 'var(--loss)' }}>{t('penales_atajada', { zona: penalZonaLabel(S.arqueroZona).replace(/[⬅️➡️]/g, '').trim() })}</span>
          )}
        </div>
        <div className="penal-timer">
          <div className="penal-timer-bar" ref={barRef} style={{ width: S.respondida ? '0%' : barReset + '%' }} />
        </div>
        <div className="penal-acciones">
          {ZONAS.map(z => (
            <motion.button key={z} className="penal-zona" disabled={S.respondida} onClick={() => onZone(z)} whileTap={{ scale: 0.95 }}>
              {penalZonaLabel(z)}
            </motion.button>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          {S.mostrarSiguiente ? (
            <button className="btn btn-primary" onClick={onNext}><Timer size={16} /> {t('penales_siguiente')}</button>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Result({ racha, nuevoRecord, onVolver, onNuevo }) {
  const emoji = racha >= 10 ? '🏆' : racha >= 5 ? '🎉' : '🥅'
  return (
    <motion.div className="game-result-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <div className="game-result-emoji">{emoji}</div>
      <h3>{t('penales_fin')}</h3>
      <p>{t('penales_tu_racha', { n: racha })}</p>
      <div className="game-result-score">{racha} ⚽</div>
      {nuevoRecord ? <div className="new-record">{t('penales_nuevo_record')}</div> : null}
      <div className="btn-row-center">
        <button className="btn" onClick={onVolver}><ArrowLeft size={16} /> {t('penales_ver_ranking')}</button>
        <button className="btn btn-primary" onClick={onNuevo}><RotateCcw size={16} /> {t('penales_jugar_de_nuevo')}</button>
      </div>
    </motion.div>
  )
}