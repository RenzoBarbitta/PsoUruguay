import React, { useEffect, useReducer, useState } from 'react'
import { motion } from 'motion/react'
import { Flame, RefreshCw, Trophy, Play, RotateCcw, ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { LoginModal } from '../admin/AuthModal.jsx'
import { t, EmptyState } from '../core/ui.jsx'

/* ======================================================================
   TRIVIA FUTBOLERA (réplica React de js/legacy/trivia.js)
   Misma lógica y MISMO protocolo anti-trampa: en modo online el server
   reparte índices de pregunta y valida cada respuesta (tokén firmado);
   si no hay red, flujo clásico + resguardo local.
   El estado vive en window.PSO_GAMES.trivia (persiste entre tabs).
   ====================================================================== */

const S = (window.PSO_GAMES = window.PSO_GAMES || {}).trivia = window.PSO_GAMES.trivia || { jugando: false }
S.preguntaActual = S.preguntaActual ?? null
S.indicesUsados = S.indicesUsados ?? []
S.racha = S.racha ?? 0
S.respondida = S.respondida ?? false
S.serverMode = S.serverMode ?? false
S.sessionToken = S.sessionToken ?? null
S.serverScore = S.serverScore ?? 0
S.serverError = S.serverError ?? false
S.mostrarResultado = S.mostrarResultado ?? false

let rankingTimer = null

export function stopTrivia() {
  if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null }
  S.jugando = false
  S.preguntaActual = null
  S.mostrarResultado = false
  S.respondida = false
}

const localQ = q => (I18N.lang === 'pt' && q.pt ? { ...q, q: q.pt, options: q.optPt || q.options } : q)

window.PSO_GAMES.trivia.stop = stopTrivia

function elegirSiguientePregunta() {
  let disponibles = TRIVIA_QUESTIONS.map((q, i) => i).filter(i => !S.indicesUsados.includes(i))
  if (!disponibles.length) {
    S.indicesUsados = []
    disponibles = TRIVIA_QUESTIONS.map((q, i) => i)
  }
  const idx = disponibles[Math.floor(Math.random() * disponibles.length)]
  S.indicesUsados.push(idx)
  return { ...localQ(TRIVIA_QUESTIONS[idx]), _index: idx }
}

const preguntaPorIndice = i => ({ ...localQ(TRIVIA_QUESTIONS[i]), _index: i })

async function cargarRanking() {
  if (AuthState.user) {
    try {
      const data = await rankingApi('/api/ranking')
      return (data.ranking || [])
        .map(u => ({ id: u.id, nombre: u.displayName || u.username, mejorRacha: u.bestStreak || 0, fecha: u.createdAt }))
        .filter(e => e.mejorRacha > 0)
    } catch (e) { /* sin red → locales */ }
  }
  return getLocalUsers()
    .map(u => ({ id: u.id, nombre: u.displayName || u.username, mejorRacha: u.bestStreak || 0, fecha: u.createdAt }))
    .filter(e => e.mejorRacha > 0)
}

/* ---------------- Partida ---------------- */

async function iniciarPartida() {
  S.mostrarResultado = false
  S.jugando = true
  S.racha = 0
  S.indicesUsados = []
  S.respondida = false
  S.serverMode = false
  S.sessionToken = null
  S.serverScore = 0
  S.serverError = false
  S.preguntaActual = null

  if (online) {
    try {
      const data = await gameApi('/api/game/start', { game: 'trivia' })
      S.sessionToken = data.token
      S.serverMode = true
      S.preguntaActual = preguntaPorIndice(data.q)
      return
    } catch (e) { /* cae al flujo legacy */ }
  }
  S.preguntaActual = elegirSiguientePregunta()
}

async function avanzarTrasRespuesta(idx) {
  if (S.serverMode && S.sessionToken) {
    try {
      const res = await gameApi('/api/game/answer', { token: S.sessionToken, a: idx })
      S.sessionToken = res.token
      S.serverScore = res.s
      if (res.over) return finalizarPartida()
      S.respondida = false
      S.preguntaActual = preguntaPorIndice(res.next)
      return
    } catch (e) {
      S.jugando = false
      S.respondida = false
      toast(tr('trivia_save_error'), 'error')
      return
    }
  }
  S.respondida = false
  S.preguntaActual = elegirSiguientePregunta()
}

async function guardarPuntaje(racha, gameToken) {
  if (!AuthState.user) return { saved: false, record: false }
  try {
    const data = await rankingApi('/api/ranking', { token: gameToken })
    if (data.user) {
      AuthState.user = data.user
      localStorage.setItem('pso_user', JSON.stringify(data.user))
    }
    return { saved: true, record: racha > 0 }
  } catch (e) {
    const users = getLocalUsers()
    const me = users.find(u => u.id === AuthState.user.id)
    if (me && racha > (me.bestStreak || 0)) {
      me.bestStreak = racha
      saveLocalUsers(users)
    }
    return { saved: false, record: racha > 0 }
  }
}

async function finalizarPartida() {
  let rachaFinal = S.racha
  S.jugando = false
  S.preguntaActual = null

  if (S.serverMode && S.sessionToken) {
    try {
      const res = await gameApi('/api/game/finish', { token: S.sessionToken })
      if (typeof res.score === 'number') rachaFinal = res.score
      if (res.user) {
        AuthState.user = res.user
        localStorage.setItem('pso_user', JSON.stringify(res.user))
      }
      S.sessionToken = null
    } catch (e) {
      const r = await guardarPuntaje(rachaFinal, S.sessionToken)
      if (e.code !== 'not_configured' && !r.saved) toast(tr('trivia_save_error'), 'error')
    }
  } else {
    await guardarPuntaje(rachaFinal)
  }

  S.rachaFinal = rachaFinal
  S.mostrarResultado = true
}

/* ---------------- Componente ---------------- */

export default function Trivia() {
  const { v, openModal } = useApp()
  void v
  const [, force] = useReducer(x => x + 1, 0)
  const [ranking, setRanking] = useState([])
  const [answered, setAnswered] = useState(null) // {i, correcta}

  const refresh = () => force()

  /* Auto-refresco del ranking en la home */
  useEffect(() => {
    if (S.jugando || S.mostrarResultado || !AuthState.user) return
    let alive = true
    const run = async () => {
      if (!alive || State.currentTab !== 'trivia') return
      const list = await cargarRanking()
      if (!alive) return
      list.sort((a, b) => b.mejorRacha - a.mejorRacha || a.fecha - b.fecha)
      setRanking(list.slice(0, 10))
    }
    run()
    rankingTimer = setInterval(run, 5000)
    return () => { alive = false; if (rankingTimer) { clearInterval(rankingTimer); rankingTimer = null } }
  }, [])

  if (!AuthState.user) return <LoginRequired openModal={openModal} />

  if (!S.jugando && S.mostrarResultado) {
    return <Result racha={S.rachaFinal} onVolver={refresh} onNuevo={async () => { await iniciarPartida(); setAnswered(null); refresh() }} />
  }

  if (!S.jugando) {
    return (
      <TriviaHome ranking={ranking} user={AuthState.user} onStart={async () => { await iniciarPartida(); setAnswered(null); refresh() }} />
    )
  }

  return (
    <Game
      answered={answered}
      onAnswer={async idx => {
        if (S.respondida) return
        S.respondida = true
        const q = S.preguntaActual
        const esCorrecta = idx === q.correct
        setAnswered({ i: idx, correcta: esCorrecta, correctIndex: q.correct })
        if (esCorrecta) {
          S.racha++
        }
        refresh()
        setTimeout(async () => {
          if (esCorrecta) {
            setAnswered(null)
            await avanzarTrasRespuesta(idx)
            refresh()
          } else {
            setAnswered(null)
            await finalizarPartida()
            refresh()
          }
        }, esCorrecta ? 1200 : 1600)
      }}
      onAbandonar={() => openTriviaAbandonar(openModal, refresh)}
    />
  )
}

function LoginRequired({ openModal }) {
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('trivia_title')}</h2></div>
      <motion.div className="card game-cta-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-cta-emoji">🧠</div>
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

function TriviaHome({ ranking, user, onStart }) {
  const nombre = user.displayName || user.username
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('trivia_title')}</h2>
        <span className="section-sub">{t('trivia_jugando_como', { name: nombre })}</span>
      </div>

      <motion.div className="card game-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="game-hero-emoji">🏆</div>
        <h3>{t('trivia_modo_racha')}</h3>
        <p>{t('trivia_modo_racha_desc')}</p>
        <button className="btn btn-gold btn-lg" onClick={onStart}><Play size={18} /> {t('trivia_jugar_ahora')}</button>
      </motion.div>

      <div className="section-head">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>{t('trivia_ranking')}</h3>
        <span className="section-sub rank-refresh"><RefreshCw size={13} /> {t('trivia_autorefresh')}</span>
      </div>
      {ranking.length
        ? <div className="rank-list">{ranking.map((e, i) => <RankRow key={e.id} e={e} i={i} label={t('trivia_mejor_racha')} mark={t('trivia_vos')} icon="🔥" />)}</div>
        : <EmptyState icon="🏆" text={t('trivia_no_players')} />}
    </>
  )
}

export function RankRow({ e, i, label, mark, icon }) {
  const esVos = AuthState.user && e.id === AuthState.user.id
  return (
    <div className={`rank-item ${esVos ? 'is-you' : ''}`}>
      <div className="rank-pos">{i + 1}</div>
      <div className="rank-avatar">{e.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div className="rank-info">
        <div className="rank-name">{e.nombre} {esVos ? <span className="rank-you-mark">{mark}</span> : null}</div>
        <div className="rank-team">{label}</div>
      </div>
      <div className="rank-value-wrap"><span className="rank-emoji">{icon}</span><div className="rank-value">{e.mejorRacha ?? e.racha ?? e.value}</div></div>
    </div>
  )
}

function Game({ answered, onAnswer, onAbandonar }) {
  const q = S.preguntaActual
  if (!q) return <div className="view active"><EmptyState icon="⚠" text={t('trivia_error_pregunta')} /></div>
  const colorMap = { facil: 'var(--win)', media: 'var(--gold)', dificil: 'var(--loss)' }
  const labelMap = { facil: t('trivia_dif_facil'), media: t('trivia_dif_media'), dificil: t('trivia_dif_dificil') }
  const c = colorMap[q.dificultad] || 'var(--accent-dark)'

  return (
    <>
      <div className="game-topbar">
        <div className="streak">
          <Flame size={22} className="flame" />
          <span className="streak-num">{S.racha}</span>
          <span className="streak-label">{t('trivia_racha_actual')}</span>
        </div>
        <button className="btn btn-sm" onClick={onAbandonar}>{t('trivia_terminar')}</button>
      </div>

      <motion.div className="card trivia-q-card" key={q._index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="dif-chip" style={{ color: c, background: c + '22' }}>{labelMap[q.dificultad]}</div>
        <h3 className="trivia-question">{q.q}</h3>
        <div className="trivia-opciones">
          {q.options.map((op, i) => {
            let cls = 'trivia-opcion-btn'
            if (answered) {
              if (i === answered.correctIndex) cls += ' trivia-correcta'
              else if (i === answered.i && !answered.correcta) cls += ' trivia-incorrecta'
            }
            const delay = i * 0.05
            return (
              <motion.button
                key={i}
                className={cls}
                disabled={!!answered}
                onClick={() => onAnswer(i)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay, duration: 0.28 }}
              >
                {op}
              </motion.button>
            )
          })}
        </div>
        <div className="game-feedback">
          {answered ? (
            answered.correcta
              ? <span style={{ color: 'var(--win)' }}>{t('trivia_correcto', { n: S.racha })}</span>
              : <span style={{ color: 'var(--loss)' }}>{t('trivia_incorrecto', { n: S.racha })}</span>
          ) : null}
        </div>
      </motion.div>
    </>
  )
}

function Result({ racha, onVolver, onNuevo }) {
  const emoji = racha >= 10 ? '🏆' : racha >= 5 ? '🎉' : '⚽'
  return (
    <motion.div className="game-result-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <div className="game-result-emoji">{emoji}</div>
      <h3>{t('trivia_partida_terminada')}</h3>
      <p>{t('trivia_tu_racha')}</p>
      <div className="game-result-score">{racha} <Flame size={26} className="flame" /></div>
      <div className="btn-row-center">
        <button className="btn" onClick={onVolver}><ArrowLeft size={16} /> {t('trivia_ver_ranking')}</button>
        <button className="btn btn-primary" onClick={onNuevo}><RotateCcw size={16} /> {t('trivia_jugar_de_nuevo')}</button>
      </div>
    </motion.div>
  )
}

/* Modal para terminar la partida */
function openTriviaAbandonar(openModal, refresh) {
  openModal(
    <ConfirmGameModal
      title={t('trivia_terminar_modal_title')}
      desc={t('trivia_terminar_modal_desc', { n: S.racha })}
      keepLabel={t('trivia_seguir_jugando')}
      leaveLabel={t('trivia_confirmar_salir')}
      onLeave={async () => {
        await finalizarPartida()
        refresh()
      }}
    />
  )
}

export function ConfirmGameModal({ title, desc, keepLabel, leaveLabel, onLeave }) {
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

export { Trophy }