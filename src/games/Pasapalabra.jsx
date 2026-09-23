import React, { useEffect, useReducer, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { StopCircle, ChevronsRight, Play, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'
import { ConfirmGameModal } from './Trivia.jsx'
import { useModalRef } from '../core/modalRef.jsx'

/* ======================================================================
   PASAPALABRA (réplica React de js/legacy/pasapalabra.js)
   Rosca diaria con semilla según la fecha (la misma para todos), 120s,
   acierto=verde / fallo=rojo / salto=segunda vuelta. Persiste en
   localStorage (pso_rosco) y en window.PSO_GAMES.pasapalabra.
   ====================================================================== */

const ABC = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
const TIEMPO = 120
const ROSCO_KEY = 'pso_rosco'
const RECORD_KEY = 'pso_rosco_record'

const S = (window.PSO_GAMES = window.PSO_GAMES || {}).pasapalabra = window.PSO_GAMES.pasapalabra || { jugando: false }
S.fecha = S.fecha ?? null
S.cola = S.cola ?? []
S.segunda = S.segunda ?? []
S.primeraVuelta = S.primeraVuelta ?? true
S.estado = S.estado ?? {}
S.perg = S.perg ?? {}
S.pergLang = S.pergLang ?? null
S.aciertos = S.aciertos ?? 0
S.fallas = S.fallas ?? 0
S.pasadas = S.pasadas ?? 0
S.respondida = S.respondida ?? false
S.tiempo = S.tiempo ?? TIEMPO
S.terminada = S.terminada ?? false
S.terminadaPorTiempo = S.terminadaPorTiempo ?? false
S.mostrarResultado = S.mostrarResultado ?? false
S.fecha = S.fecha ?? null

let pasapalabraTimer = null

export function stopPasapalabra() {
  if (pasapalabraTimer) { clearInterval(pasapalabraTimer); pasapalabraTimer = null }
}

const hoy = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const hash = s => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const seedIndex = letra => {
  const banco = PASAPALABRA_QUESTIONS[I18N.lang][letra]
  return hash(hoy() + letra) % banco.length
}

const normLetra = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

const opcionesDe = (q, letra) => {
  const pool = (PASAPALABRA_OPTS[I18N.lang] && PASAPALABRA_OPTS[I18N.lang][letra]) || []
  const elegibles = pool.filter(w => normLetra(w) !== normLetra(q.w))
  const rot = hash(hoy() + letra + '·') % Math.max(elegibles.length, 1)
  const base = [q.w]
  const vistos = new Set([normLetra(q.w)])
  for (let i = 0; i < elegibles.length && base.length < 4; i++) {
    const key = normLetra(elegibles[(rot + i) % elegibles.length])
    if (vistos.has(key)) continue
    vistos.add(key)
    base.push(elegibles[(rot + i) % elegibles.length])
  }
  for (const w of q.opts) {
    if (base.length >= 4) break
    const key = normLetra(w)
    if (vistos.has(key)) continue
    vistos.add(key)
    base.push(w)
  }
  return base
}

const rotarOpciones = (q, letra) => {
  const base = opcionesDe(q, letra)
  const n = base.length
  const offset = hash(hoy() + letra + '°') % n
  const opts = []
  for (let i = 0; i < n; i++) opts.push(base[(i + offset) % n])
  return { ...q, opts, c: (n - offset) % n }
}

const buildPerg = () => {
  const perg = {}
  for (const letra of ABC) perg[letra] = rotarOpciones(PASAPALABRA_QUESTIONS[I18N.lang][letra][seedIndex(letra)], letra)
  return perg
}

const countBanco = () => ABC.reduce((tot, l) => tot + (PASAPALABRA_QUESTIONS[I18N.lang][l] || []).length, 0)

const guardar = () => {
  try {
    localStorage.setItem(ROSCO_KEY, JSON.stringify({
      fecha: S.fecha, cola: S.cola, segunda: S.segunda, primeraVuelta: S.primeraVuelta,
      estado: S.estado, aciertos: S.aciertos, fallas: S.fallas, pasadas: S.pasadas,
      tiempo: S.tiempo, terminada: S.terminada, terminadaPorTiempo: S.terminadaPorTiempo
    }))
  } catch (e) {}
}

const cargar = () => {
  try { const raw = localStorage.getItem(ROSCO_KEY); return raw ? JSON.parse(raw) : null } catch (e) { return null }
}

const record = () => {
  try { const raw = localStorage.getItem(RECORD_KEY); return raw ? JSON.parse(raw) : null } catch (e) { return null }
}

const guardarRecord = () => {
  const old = record()
  if (!old || S.aciertos > old.aciertos) {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify({ aciertos: S.aciertos, fecha: S.fecha })) } catch (e) {}
  }
}

const formatearTiempo = seg => {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return m + ':' + String(s).padStart(2, '0')
}

const verLetras = () => {
  for (const letra of ABC) if (!(letra in S.estado)) S.estado[letra] = 'pendiente'
}

function avanzar() {
  if (S.cola.length) return
  if (!S.primeraVuelta || !S.segunda.length) { finalizar(); return }
  S.primeraVuelta = false
  S.cola = S.segunda
  S.segunda = []
}

function responder(idx) {
  if (S.respondida || !S.jugando) return
  S.respondida = true
  const letra = S.cola[0]
  const q = S.perg[letra]
  const esCorrecta = idx === q.c
  S.estado[letra] = esCorrecta ? 'acierta' : 'falla'
  if (esCorrecta) S.aciertos++
  else S.fallas++
  S.cola.shift()
  guardar()
  setTimeout(() => {
    S.respondida = false
    avanzar()
    forceRender()
  }, esCorrecta ? 900 : 1500)
}

function saltar() {
  if (S.respondida || !S.jugando) return
  const letra = S.cola[0]
  S.cola.shift()
  if (S.primeraVuelta) S.segunda.push(letra)
  S.estado[letra] = 'pasada'
  S.pasadas++
  guardar()
  avanzar()
  forceRender()
}

function finalizar() {
  stopPasapalabra()
  S.jugando = false
  S.terminada = true
  S.cola = []
  verLetras()
  guardar()
  guardarRecord()
  S.mostrarResultado = true
  forceRender()
}

function iniciar() {
  stopPasapalabra()
  S.jugando = true
  S.mostrarResultado = false
  S.fecha = hoy()
  S.cola = ABC.slice()
  S.segunda = []
  S.primeraVuelta = true
  S.estado = {}
  S.perg = buildPerg()
  S.pergLang = I18N.lang
  S.aciertos = 0
  S.fallas = 0
  S.pasadas = 0
  S.respondida = false
  S.tiempo = TIEMPO
  S.terminada = false
  S.terminadaPorTiempo = false
  guardar()
  forceRender()
}

let forceRender = () => {}
window.PSO_GAMES.pasapalabra.stop = stopPasapalabra

const medalla = n => (n >= 23 ? '🏆' : n >= 17 ? '🥇' : n >= 11 ? '🥈' : n >= 5 ? '🥉' : '⚽')

/* ---------------- Componente ---------------- */

export default function Pasapalabra() {
  const { v, modals, openModal } = useApp()
  void v
  const [, force] = useReducer(x => x + 1, 0)
  forceRender = force
  const modalsOpen = useModalRef(modals)
  const tiempoRef = useRef(null)

  const openTerminar = () => openModal(
    <ConfirmGameModal
      title={t('pasap_terminar_modal_t')}
      desc={t('pasap_terminar_modal_p', { n: S.aciertos })}
      keepLabel={t('pasap_seguir_jugando')}
      leaveLabel={t('pasap_confirmar_terminar')}
      onLeave={() => finalizar()}
    />
  )

  /* Reanudar partida guardada del día */
  useEffect(() => {
    const saved = cargar()
    if (!S.jugando && saved && saved.fecha === hoy() && !saved.terminada) {
      S.jugando = true
      S.fecha = saved.fecha
      S.cola = saved.cola || []
      S.segunda = saved.segunda || []
      S.primeraVuelta = saved.primeraVuelta !== false
      S.estado = saved.estado || {}
      S.aciertos = saved.aciertos || 0
      S.fallas = saved.fallas || 0
      S.pasadas = saved.pasadas || 0
      S.respondida = false
      S.tiempo = saved.tiempo != null ? saved.tiempo : TIEMPO
      S.terminada = false
      S.terminadaPorTiempo = false
      S.perg = buildPerg()
      S.pergLang = I18N.lang
      force()
    }
  }, [])

  /* Estado final cuando la cola se vacía (terminó la jugada) */
  useEffect(() => {
    if (S.jugando && !S.cola.length && !S.mostrarResultado) { finalizar(); force() }
  }, [S.jugando, S.cola.length, S.mostrarResultado])

  /* Rosca completa y pergamino al idioma actual */
  useEffect(() => {
    if (!S.jugando || !S.cola.length) return
    verLetras()
    if (S.pergLang !== I18N.lang) {
      S.perg = buildPerg()
      S.pergLang = I18N.lang
    }
  }, [S.jugando, S.cola.length, S.pergLang])

  /* Timer global de juego */
  useEffect(() => {
    if (!S.jugando || S.mostrarResultado) return
    if (pasapalabraTimer) clearInterval(pasapalabraTimer)
    pasapalabraTimer = setInterval(() => {
      if (State.currentTab !== 'pasapalabra' || modalsOpen.current) return
      S.tiempo--
      const el = tiempoRef.current
      if (el) {
        el.textContent = '⏱ ' + formatearTiempo(S.tiempo)
        el.classList.toggle('warn', S.tiempo <= 20)
      }
      if (S.tiempo <= 0) {
        S.terminadaPorTiempo = true
        finalizar()
        force()
      }
    }, 1000)
    return () => { if (pasapalabraTimer) { clearInterval(pasapalabraTimer); pasapalabraTimer = null } }
  }, [S.jugando, S.mostrarResultado])

  const saved = cargar()

  if (S.mostrarResultado) return <Resultado />
  if (S.jugando && S.cola.length) return <Juego tiempoRef={tiempoRef} onTerminar={openTerminar} />
  if (S.jugando) return null // cola recién vacía → el effect finalizará y mostrará Resultado

  if (saved && saved.fecha === hoy() && saved.terminada) return <Hecho hoy={saved} />

  return <Home count={countBanco()} record={record()} onStart={() => { iniciar(); force() }} />
}

function Home({ count, record, onStart }) {
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('pasap_title')}</h2>
        <span className="section-sub">{t('pasap_desc')}</span>
      </div>

      <motion.div className="card game-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="game-hero-emoji">🔠</div>
        <h3>{t('pasap_hoy')} · {hoy()}</h3>
        <p>{t('pasap_banco', { n: count })} · ⏱ {t('pasap_tiempo')}: {TIEMPO}s</p>
        <button className="btn btn-gold btn-lg" onClick={onStart}><Play size={18} /> {t('pasap_jugar')}</button>
      </motion.div>

      <div className="card best-card">
        <div className="best-emoji">🏅</div>
        <div className="best-info">
          <div className="best-t">{t('pasap_tu_record')}</div>
          <div className="best-val">{record ? `${record.aciertos} ${t('pasap_de')} 26` : t('pasap_sin_record')}</div>
        </div>
      </div>
    </>
  )
}

function Hecho({ hoy }) {
  const [verDetalle, setVerDetalle] = useState(false)
  const recordActual = record()
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('pasap_title')}</h2></div>

      <motion.div className="card game-result-card done-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-result-emoji">{medalla(hoy.aciertos)}</div>
        <h3>{t('pasap_ya_jugada_t')}</h3>
        <div className="game-result-score">{hoy.aciertos} {t('pasap_de')} 26</div>
        <button className="btn btn-link-small" onClick={() => setVerDetalle(v => !v)}>
          {verDetalle ? <><EyeOff size={15} /> {t('pasap_ocultar_respuestas')}</> : <><Eye size={15} /> {t('pasap_ver_detalle')}</>}
        </button>
      </motion.div>

      <div className="card best-card">
        <div className="best-emoji">🏅</div>
        <div className="best-info">
          <div className="best-t">{t('pasap_tu_record')}</div>
          <div className="best-val">{recordActual ? `${recordActual.aciertos} ${t('pasap_de')} 26` : '—'}</div>
        </div>
      </div>

      {verDetalle ? (
        <div className="pasap-respuestas-hoy">
          <div className="section-head"><h3 className="section-title" style={{ fontSize: '1.1rem' }}>{t('pasap_respuestas')}</h3></div>
          <RespuestasGrid />
        </div>
      ) : null}

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('pasap_vuelve')}</div>
    </>
  )
}

function Juego({ tiempoRef, onTerminar }) {
  const letra = S.cola[0]
  const q = S.perg[letra]
  if (!q) return <div className="empty-state-text">{t('trivia_error_pregunta')}</div>
  const esActual = l => S.cola[0] === l
  const [answered, setAnswered] = useState(null)

  // Al avanzar de letra, limpiar el estado visual de la respuesta anterior
  useEffect(() => { setAnswered(null) }, [letra])

  return (
    <>
      <div className="rosco-topbar">
        <div className="vuelta">
          <span className="vuelta-num">{t('pasap_contador', { n: S.primeraVuelta ? 1 : 2 })}</span>
          <span className={`rosco-pill ${S.primeraVuelta ? 'estado-tipo-a' : 'estado-tipo-b'}`}>
            {S.primeraVuelta ? t('pasap_primera') : t('pasap_segunda')}
          </span>
        </div>
        <div className="rosco-tiempo" ref={tiempoRef}>⏱ {formatearTiempo(S.tiempo)}</div>
      </div>

      <div className="rosco-board">
        {ABC.map((letraB, i) => {
          const est = S.estado[letraB] || (letraB === letra ? 'pendiente' : (S.estado[letraB] || 'pendiente'))
          const actual = esActual(letraB)
          const angle = (360 / ABC.length) * i - 90
          return (
            <button
              key={letraB}
              className={`rosco-chip estado-${est} ${actual ? 'actual' : ''}`}
              style={{ '--i': i, transform: `rotate(${angle}deg) translateY(-var(--rosco-size)) rotate(${-angle}deg)` }}
              aria-label={letraB}
            >
              <span>{letraB}</span>
            </button>
          )
        })}
      </div>

      <div className="card rosco-panel">
        <div className="rosco-q-head">
          <div className="rosco-letra-badge">{letra}</div>
          <div className="rosco-q-meta">
            {t('pasap_empieza_con', { letra })} · {S.aciertos} {t('pasap_aciertos').toLowerCase()}
          </div>
        </div>
        <h3 className="trivia-question">{q.q}</h3>
        <div className="trivia-opciones">
          {q.opts.map((op, i) => {
            let cls = 'trivia-opcion-btn'
            if (answered) {
              if (i === answered.correctIndex) cls += ' trivia-correcta'
              else if (i === answered.i && !answered.correcta) cls += ' trivia-incorrecta'
            }
            return (
              <motion.button
                key={i}
                className={cls}
                disabled={!!answered}
                onClick={() => {
                  if (S.respondida) return
                  const esCorrecta = i === q.c
                  setAnswered({ i, correcta: esCorrecta, correctIndex: q.c })
                  responder(i)
                }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.28 }}
              >
                {op}
              </motion.button>
            )
          })}
        </div>
        <div className="game-feedback">
          {answered ? (
            answered.correcta
              ? <span style={{ color: 'var(--win)' }}>{t('pasap_correcto')}</span>
              : <span style={{ color: 'var(--loss)' }}>{t('pasap_incorrecto', { palabra: q.w })}</span>
          ) : null}
        </div>
        <div className="btn-row-split">
          <button className="btn" onClick={() => saltar()}><ChevronsRight size={16} /> {t('pasap_salto')}</button>
          <button className="btn" onClick={onTerminar}><StopCircle size={16} /> {t('pasap_terminar')}</button>
        </div>
      </div>
    </>
  )
}

function Resultado() {
  const a = S.aciertos
  const title = S.terminadaPorTiempo ? t('pasap_se_acabo') : t('pasap_res_title')
  verLetras()
  const [verResp, setVerResp] = useState(false)
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('pasap_title')}</h2></div>

      <motion.div className="card game-result-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <div className="game-result-emoji">{medalla(a)}</div>
        <h3>{title}</h3>
        <p>{t('pasap_res_sub')}</p>
        <div className="game-result-score">{a} {t('pasap_de')} 26</div>
        <div className="rosco-stats">
          <div className="rosco-stat stat-ok">{t('pasap_aciertos')}<b>{a}</b></div>
          <div className="rosco-stat stat-bad">{t('pasap_fallas')}<b>{S.fallas}</b></div>
          <div className="rosco-stat stat-dim">{t('pasap_pasadas')}<b>{S.pasadas}</b></div>
        </div>
        <button className="btn btn-primary" onClick={() => setVerResp(v => !v)}>
          {verResp ? <><EyeOff size={15} /> {t('pasap_ocultar_respuestas')}</> : <><Eye size={15} /> {t('pasap_ver_respuestas')}</>}
        </button>
      </motion.div>

      {verResp ? (
        <>
          <div className="section-head"><h3 className="section-title" style={{ fontSize: '1.1rem' }}>{t('pasap_respuestas')}</h3></div>
          <RespuestasGrid />
        </>
      ) : null}
    </>
  )
}

function RespuestasGrid() {
  return (
    <div className="rosco-answers">
      {ABC.map(letra => {
        const q = S.perg[letra]
        const est = S.estado[letra] || 'pendiente'
        return (
          <div key={letra} className={`rosco-answer estado-${est}`}>
            <span className="ra-letra">{letra}</span>
            <span className="ra-word">{q ? q.w : '?'}</span>
          </div>
        )
      })}
    </div>
  )
}