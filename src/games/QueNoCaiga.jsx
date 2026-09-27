import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw, Trophy, Zap, ArrowLeft, Target, MousePointer, Smartphone } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const STORAGE_KEY = 'pso_quenocaiga_best'

function getBest() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) } catch { return 0 }
}
function setBest(v) {
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
}

const GRAVITY = 0.35
const LIFT_BASE = -12
const MAX_TILT = 25

export default function QueNoCaiga() {
  const { v, switchTab } = useApp()
  void v
  const [playing, setPlaying] = useState(false)
  const [count, setCount] = useState(0)
  const [best, setBestCount] = useState(getBest())
  const [y, setY] = useState(0)
  const [vy, setVy] = useState(0)
  const [spin, setSpin] = useState(0)
  const [tilt, setTilt] = useState(0)
  const [particles, setParticles] = useState([])
  const [combo, setCombo] = useState(0)
  const [showTrick, setShowTrick] = useState(null)
  const [footX, setFootX] = useState(0)
  const [footY, setFootY] = useState(0)
  const [showTarget, setShowTarget] = useState(false)
  const [targetX, setTargetX] = useState(0)
  const pressStartRef = useRef(0)
  const gestureRef = useRef([])
  const playingRef = useRef(false)
  const countRef = useRef(0)
  const bestRef = useRef(0)
  const showTargetRef = useRef(false)
  const targetXRef = useRef(0)
  const footXRef = useRef(0)
  const footYRef = useRef(0)
  const touchIdRef = useRef(null)
  const yRef = useRef(0)
  const vyRef = useRef(0)

  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { countRef.current = count }, [count])
  useEffect(() => { bestRef.current = best }, [best])
  useEffect(() => { showTargetRef.current = showTarget }, [showTarget])
  useEffect(() => { targetXRef.current = targetX }, [targetX])
  useEffect(() => { footXRef.current = footX }, [footX])
  useEffect(() => { footYRef.current = footY }, [footY])
  const raf = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)

  const BASE_Y = 360
  const FOOT_Y = BASE_Y + 70

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctxRef.current = ctx
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const spawnParticles = (x, y, color, count = 10) => {
    const newP = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: Math.random() * -5 - 1,
      life: 1,
      decay: 0.012 + Math.random() * 0.015,
      size: 3 + Math.random() * 5,
      color
    }))
    setParticles(p => [...p, ...newP])
  }

  const triggerTrick = (name, emoji) => {
    setShowTrick({ name, emoji })
    setTimeout(() => setShowTrick(null), 1200)
    setCombo(c => c + 1)
  }

  const detectGesture = (points) => {
    const gesture = points || gestureRef.current || []
    if (gesture.length < 3) return
    const points2 = gesture
    const dx = points2[points2.length - 1].x - points2[0].x
    const dy = points2[points2.length - 1].y - points2[0].y
    const dist = Math.hypot(dx, dy)
    const duration = points2[points2.length - 1].t - points2[0].t

    if (dist < 35 && duration > 300) {
      const cx = points2.reduce((s, p) => s + p.x, 0) / points2.length
      const cy = points2.reduce((s, p) => s + p.y, 0) / points2.length
      let isCircle = true
      for (const p of points2) {
        if (Math.abs(Math.hypot(p.x - cx, p.y - cy) - dist / 2) > 28) { isCircle = false; break }
      }
      if (isCircle) return triggerTrick('quenocaiga_trick_arw', '🌪️')
    }

    const startY = points2[0].y
    const minY = Math.min(...points2.map(p => p.y))
    const maxY = Math.max(...points2.map(p => p.y))
    if (startY - minY > 70 && maxY - minY < 35 && duration < 450) {
      return triggerTrick('quenocaiga_trick_stall', '🧘')
    }

    const upDown = points2.filter((p, i) => i > 1 && Math.sign(p.y - points2[i - 1].y) !== Math.sign(points2[i - 1].y - points2[i - 2].y)).length
    if (upDown >= 2 && duration < 700) return triggerTrick('quenocaiga_trick_knee', '🦵')
  }

  const loop = (ts) => {
    if (!playingRef.current) return
    const curVy = vyRef.current + GRAVITY
    vyRef.current = curVy
    const ny = yRef.current + curVy
    if (ny >= BASE_Y) {
      playingRef.current = false
      setPlaying(false)
      vyRef.current = 0
      setVy(0)
      yRef.current = BASE_Y
      setY(BASE_Y)
      showTargetRef.current = false
      setShowTarget(false)
      if (countRef.current > bestRef.current) { setBestCount(countRef.current); setBest(countRef.current) }
      spawnParticles(footXRef.current, FOOT_Y, '#ef4444', 30)
    } else {
      yRef.current = ny
      setY(ny)
    }

    setParticles(p => p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.18, life: pt.life - pt.decay })).filter(pt => pt.life > 0))

    raf.current = requestAnimationFrame(loop)
  }

  const canvasW = () => {
    try {
      const w = canvasRef.current ? canvasRef.current.getBoundingClientRect().width : 0
      return w > 40 ? w : 320
    } catch { return 320 }
  }

  const start = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    const cx = canvasW() / 2
    playingRef.current = true
    countRef.current = 0
    setPlaying(true)
    setCount(0)
    setSpin(0)
    setTilt(0)
    yRef.current = BASE_Y - 15
    vyRef.current = LIFT_BASE
    setY(BASE_Y - 15)
    setVy(LIFT_BASE)
    footXRef.current = cx
    footYRef.current = FOOT_Y
    targetXRef.current = cx
    setFootX(cx)
    setFootY(FOOT_Y)
    setCombo(0)
    gestureRef.current = []
    showTargetRef.current = false
    setShowTarget(false)
    raf.current = requestAnimationFrame(loop)
  }

  const handlePointerDown = (e) => {
    if (playingRef.current) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (e.touches) touchIdRef.current = e.touches[0].identifier
    footXRef.current = x
    footYRef.current = y
    pressStartRef.current = Date.now()
    gestureRef.current = [{ x, y, t: Date.now() }]
    showTargetRef.current = true
    targetXRef.current = x
    setShowTarget(true)
    setTargetX(x)
  }

  const handlePointerMove = (e) => {
    if (!playingRef.current && pressStartRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      let clientX, clientY
      if (e.touches) {
        const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current) || e.touches[0]
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      const x = clientX - rect.left
      const y = clientY - rect.top
      footXRef.current = x
      footYRef.current = y
      targetXRef.current = x
      gestureRef.current = [...gestureRef.current.slice(-25), { x, y, t: Date.now() }]
      setFootX(x)
      setFootY(y)
      setTargetX(x)
    }
  }

  const handlePointerUp = (e) => {
    if (e && e.type === 'pointercancel') { pressStartRef.current = 0; gestureRef.current = []; return }
    if (!playingRef.current && pressStartRef.current) {
      const duration = Date.now() - pressStartRef.current
      pressStartRef.current = 0
      const gesture = gestureRef.current.slice()
      gestureRef.current = []
      touchIdRef.current = null
      showTargetRef.current = false
      setShowTarget(false)
      if (duration < 1000) start()
      else detectGesture(gesture)
    } else if (playingRef.current) {
      let clientX
      if (e && e.changedTouches && e.changedTouches.length) {
        clientX = e.changedTouches[0].clientX
      } else if (e && typeof e.clientX === 'number') {
        clientX = e.clientX
      } else {
        return
      }
      const rect = canvasRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const relX = (x - footXRef.current) / 70
      const clamped = Math.max(-1, Math.min(1, relX))
      setSpin(s => clamped * 10)
      setTilt(clamped * MAX_TILT)
      const liftMult = 0.85 + Math.abs(clamped) * 0.35
      vyRef.current = LIFT_BASE * liftMult
      setVy(vyRef.current)
      countRef.current += 1
      setCount(countRef.current)
      footXRef.current = x
      setFootX(x)
      const c = countRef.current
      const color = c > 100 ? '#fbbf24' : c > 50 ? '#34d399' : c > 20 ? '#60a5fa' : '#a78bfa'
      spawnParticles(x, FOOT_Y - 25, color, 10)
      if (c > 0 && c % 25 === 0) {
        triggerTrick('quenocaiga_milestone', '✨')
      }
      showTargetRef.current = true
      targetXRef.current = x
      setShowTarget(true)
      setTargetX(x)
    }
  }

  const draw = () => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const w = canvas.width
    const h = canvas.height
    const scale = window.devicePixelRatio
    const cx = w / 2 / scale
    const cy = h / 2 / scale

    ctx.clearRect(0, 0, w, h)

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0a1128')
    grad.addColorStop(0.4, '#1a3a6e')
    grad.addColorStop(0.7, '#2d1b4e')
    grad.addColorStop(1, '#1a1a2e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx * scale, cy * scale)

    particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x * scale, (BASE_Y - y + p.y - FOOT_Y) * scale, p.size * scale, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    if (showTarget && !playing) {
      const tx = (targetX - cx) * scale
      const ty = (FOOT_Y - cy) * scale - 40 * scale
      const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85
      ctx.strokeStyle = `rgba(251,191,36,${0.6 * pulse})`
      ctx.lineWidth = 3 * scale
      ctx.setLineDash([10 * scale, 8 * scale])
      ctx.lineDashOffset = Date.now() / 30
      ctx.beginPath()
      ctx.arc(tx, ty, 35 * scale * pulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = `rgba(251,191,36,${0.3 * pulse})`
      ctx.beginPath()
      ctx.arc(tx, ty, 28 * scale * pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = `bold ${14 * scale}px var(--font-display)`
      ctx.fillStyle = '#fbbf24'
      ctx.textAlign = 'center'
      ctx.fillText(t('quenocaiga_toca'), tx, ty - 50 * scale)
    }

    const ballY = (BASE_Y - y) * scale
    const ballR = 24 * scale

    ctx.save()
    ctx.translate(0, ballY)
    ctx.rotate(spin * 0.025)

    const ballGrad = ctx.createRadialGradient(-ballR * 0.3, -ballR * 0.3, 0, 0, 0, ballR)
    ballGrad.addColorStop(0, '#ffffff')
    ballGrad.addColorStop(0.35, '#f0f0f0')
    ballGrad.addColorStop(0.7, '#d0d0d0')
    ballGrad.addColorStop(1, '#a0a0a0')
    ctx.fillStyle = ballGrad
    ctx.beginPath()
    ctx.arc(0, 0, ballR, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#999'
    ctx.lineWidth = 2.5 * scale
    ctx.beginPath()
    ctx.moveTo(-ballR * 0.75, 0)
    ctx.bezierCurveTo(-ballR * 0.4, -ballR * 0.55, ballR * 0.4, -ballR * 0.55, ballR * 0.75, 0)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -ballR * 0.75)
    ctx.bezierCurveTo(0, -ballR * 0.4, 0, ballR * 0.4, 0, ballR * 0.75)
    ctx.stroke()

    for (let i = 0; i < 3; i++) {
      const angle = (spin * 0.025 + i * 2.1) % (Math.PI * 2)
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * ballR * 0.3, Math.sin(angle) * ballR * 0.3)
      ctx.lineTo(Math.cos(angle) * ballR * 0.85, Math.sin(angle) * ballR * 0.85)
      ctx.strokeStyle = 'rgba(150,150,150,0.4)'
      ctx.lineWidth = 1.5 * scale
      ctx.stroke()
    }
    ctx.restore()

    const footR = 38 * scale
    ctx.save()
    ctx.translate((footX - cx) * scale, (FOOT_Y - cy) * scale)
    ctx.rotate(tilt * Math.PI / 180)

    const footGrad = ctx.createLinearGradient(-footR, footR, footR, -footR)
    footGrad.addColorStop(0, '#1e2a4a')
    footGrad.addColorStop(0.4, '#2d3f6a')
    footGrad.addColorStop(0.7, '#3d5a8a')
    footGrad.addColorStop(1, '#1a2a4a')
    ctx.fillStyle = footGrad
    ctx.beginPath()
    ctx.ellipse(0, 0, footR, footR * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#3a4f7a'
    ctx.beginPath()
    ctx.ellipse(0, -footR * 0.12, footR * 0.72, footR * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(251,191,36,0.15)'
    ctx.beginPath()
    ctx.ellipse(0, footR * 0.35, footR * 0.5, footR * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    ctx.restore()
  }

  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    let id = null
    const tick = () => { id = requestAnimationFrame(tick); if (drawRef.current) drawRef.current() }
    id = requestAnimationFrame(tick)
    return () => { if (id) cancelAnimationFrame(id) }
  }, [])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  return (
    <>
      <div className="game-topbar">
        <div className="streak">
          <Zap size={22} className="flame" style={{ color: count > best ? '#fbbf24' : 'var(--gold)' }} />
          <span className="streak-num" style={{ color: count > best ? '#fbbf24' : 'inherit' }}>{count}</span>
          <span className="streak-label">{t('quenocaiga_toques')}</span>
        </div>
        <div className="best-badge">
          <Trophy size={16} /> {t('quenocaiga_mejor')} <strong>{best}</strong>
        </div>
        {combo > 0 && <div className="combo-badge"><Target size={14} /> {combo}x {t('quenocaiga_combo')}</div>}
        <button className="btn btn-sm" onClick={() => switchTab('juegos')}>
          <ArrowLeft size={16} /> {t('quenocaiga_volver')}
        </button>
      </div>

      <motion.div className="card quenocaiga-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="quenocaiga-title">{t('quenocaiga_title')}</h3>
        <p className="quenocaiga-sub">{t('quenocaiga_sub')}</p>

        <div
          className="quenocaiga-canvas-wrap"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="quenocaiga-canvas" style={{ touchAction: 'none' }} />
          {playing && <div className="tap-hint">{t('quenocaiga_toca')}</div>}
          {!playing && count === 0 && <div className="start-hint"><MousePointer size={28} /><Smartphone size={28} /> {t('quenocaiga_inicio')}</div>}
          {!playing && count > 0 && <div className="restart-hint"><RotateCcw size={22} /> {t('quenocaiga_reintentar')}</div>}
        </div>

        {showTrick && (
          <motion.div className="trick-popup" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            <span className="trick-emoji">{showTrick.emoji}</span>
            <span className="trick-name">{t(showTrick.name)}</span>
          </motion.div>
        )}

        <div className="trick-hints">
          <span className="hint"><kbd>○</kbd> {t('quenocaiga_trick_arw')}</span>
          <span className="hint"><kbd>□</kbd> {t('quenocaiga_trick_stall')}</span>
          <span className="hint"><kbd>↑↓</kbd> {t('quenocaiga_trick_knee')}</span>
        </div>

        <div className="stats-row">
          <div className="stat-mini">
            <span className="stat-val">{count}</span>
            <span className="stat-lbl">{t('quenocaiga_actual')}</span>
          </div>
          <div className="stat-mini best">
            <span className="stat-val">{best}</span>
            <span className="stat-lbl">{t('quenocaiga_record')}</span>
          </div>
          <div className="stat-mini">
            <span className="stat-val">{combo}</span>
            <span className="stat-lbl">{t('quenocaiga_racha_trucos')}</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-block quenocaiga-reset"
          onClick={() => {
            if (raf.current) cancelAnimationFrame(raf.current)
            playingRef.current = false
            countRef.current = 0
            yRef.current = BASE_Y
            vyRef.current = 0
            gestureRef.current = []
            pressStartRef.current = 0
            showTargetRef.current = false
            setPlaying(false)
            setCount(0)
            setSpin(0)
            setTilt(0)
            setY(BASE_Y)
            setVy(0)
            setCombo(0)
            setParticles([])
            setShowTarget(false)
          }}
        >
          <RotateCcw size={16} /> {t('quenocaiga_reset')}
        </button>
      </motion.div>
    </>
  )
}