import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw, Trophy, Zap, ArrowLeft } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const STORAGE_KEY = 'pso_quenocaiga_best'

function getBest() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) } catch { return 0 }
}
function setBest(v) {
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
}

const GRAVITY = 0.38
const LIFT = -11.5
const SPIN_FACTOR = 0.18
const MAX_TILT = 22

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
  const [pressStart, setPressStart] = useState(0)
  const [gesture, setGesture] = useState([])
  const raf = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)

  const BASE_Y = 320
  const FOOT_Y = BASE_Y + 60

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

  const spawnParticles = (x, y, color, count = 8) => {
    const newP = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * -4 - 1,
      life: 1,
      decay: 0.015 + Math.random() * 0.015,
      size: 3 + Math.random() * 4,
      color
    }))
    setParticles(p => [...p, ...newP])
  }

  const triggerTrick = (name, emoji) => {
    setShowTrick({ name, emoji })
    setTimeout(() => setShowTrick(null), 1200)
    setCombo(c => c + 1)
  }

  const detectGesture = () => {
    if (gesture.length < 3) return
    const points = gesture
    const dx = points[points.length - 1].x - points[0].x
    const dy = points[points.length - 1].y - points[0].y
    const dist = Math.hypot(dx, dy)
    const duration = points[points.length - 1].t - points[0].t

    if (dist < 30 && duration > 300) {
      const cx = points.reduce((s, p) => s + p.x, 0) / points.length
      const cy = points.reduce((s, p) => s + p.y, 0) / points.length
      let isCircle = true
      for (const p of points) {
        if (Math.abs(Math.hypot(p.x - cx, p.y - cy) - dist / 2) > 25) { isCircle = false; break }
      }
      if (isCircle) return triggerTrick('t.arw', '🌪️')
    }

    const startY = points[0].y
    const minY = Math.min(...points.map(p => p.y))
    const maxY = Math.max(...points.map(p => p.y))
    if (startY - minY > 60 && maxY - minY < 30 && duration < 400) {
      return triggerTrick('t.stall', '🧘')
    }

    const upDown = points.filter((p, i) => i > 0 && Math.sign(p.y - points[i - 1].y) !== Math.sign(points[i - 1].y - points[i - 2].y)).length
    if (upDown >= 2 && duration < 600) return triggerTrick('t.knee', '🦵')
  }

  const loop = (ts) => {
    if (!playing) return
    setVy(v => v + GRAVITY)
    setY(y => {
      const ny = y + vy
      if (ny >= BASE_Y) {
        setPlaying(false)
        setVy(0)
        setY(BASE_Y)
        if (count > best) { setBestCount(count); setBest(count) }
        spawnParticles(footX, FOOT_Y, '#ef4444', 20)
        return BASE_Y
      }
      return ny
    })

    setParticles(p => p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.15, life: pt.life - pt.decay })).filter(pt => pt.life > 0))

    raf.current = requestAnimationFrame(loop)
  }

  const start = () => {
    setPlaying(true)
    setCount(0)
    setSpin(0)
    setTilt(0)
    setY(BASE_Y - 10)
    setVy(LIFT)
    setFootX(window.innerWidth / 2)
    setCombo(0)
    setGesture([])
    raf.current = requestAnimationFrame(loop)
  }

  const handlePointerDown = (e) => {
    if (playing) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setFootX(x)
    setFootY(y)
    setPressStart(Date.now())
    setGesture([{ x, y, t: Date.now() }])
  }

  const handlePointerMove = (e) => {
    if (!playing && pressStart) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setFootX(x)
      setFootY(y)
      setGesture(g => [...g.slice(-20), { x, y, t: Date.now() }])
    }
  }

  const handlePointerUp = (e) => {
    if (!playing && pressStart) {
      const duration = Date.now() - pressStart
      if (duration < 800) {
        detectGesture()
        start()
      }
      setPressStart(0)
      setGesture([])
    } else if (playing) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const relX = (x - footX) / 60
      const clamped = Math.max(-1, Math.min(1, relX))
      setSpin(s => clamped * 8)
      setTilt(clamped * MAX_TILT)
      setVy(LIFT * (0.85 + Math.abs(clamped) * 0.3))
      setCount(c => c + 1)
      setFootX(x)
      spawnParticles(x, FOOT_Y - 20, count > 50 ? '#fbbf24' : count > 20 ? '#34d399' : '#60a5fa', 6)
      if (count > 0 && count % 50 === 0) {
        triggerTrick('t.milestone', '✨')
      }
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
    grad.addColorStop(0.5, '#1a3a6e')
    grad.addColorStop(1, '#0f1b3d')
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

    const ballY = (BASE_Y - y) * scale
    const ballR = 22 * scale

    ctx.save()
    ctx.translate(0, ballY)
    ctx.rotate(spin * 0.02)

    const ballGrad = ctx.createRadialGradient(-ballR * 0.3, -ballR * 0.3, 0, 0, 0, ballR)
    ballGrad.addColorStop(0, '#ffffff')
    ballGrad.addColorStop(0.4, '#e8e8e8')
    ballGrad.addColorStop(1, '#b0b0b0')
    ctx.fillStyle = ballGrad
    ctx.beginPath()
    ctx.arc(0, 0, ballR, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#888'
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.moveTo(-ballR * 0.8, 0)
    ctx.bezierCurveTo(-ballR * 0.4, -ballR * 0.6, ballR * 0.4, -ballR * 0.6, ballR * 0.8, 0)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -ballR * 0.8)
    ctx.bezierCurveTo(0, -ballR * 0.4, 0, ballR * 0.4, 0, ballR * 0.8)
    ctx.stroke()
    ctx.restore()

    const footR = 36 * scale
    ctx.save()
    ctx.translate((footX - cx) * scale, (FOOT_Y - cy) * scale)
    ctx.rotate(tilt * Math.PI / 180)

    const footGrad = ctx.createLinearGradient(-footR, footR, footR, -footR)
    footGrad.addColorStop(0, '#2d3a5a')
    footGrad.addColorStop(0.5, '#3d4f7a')
    footGrad.addColorStop(1, '#1a2a4a')
    ctx.fillStyle = footGrad
    ctx.beginPath()
    ctx.ellipse(0, 0, footR, footR * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#4a5a8a'
    ctx.beginPath()
    ctx.ellipse(0, -footR * 0.15, footR * 0.7, footR * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    ctx.restore()

    requestAnimationFrame(draw)
  }

  useEffect(() => { draw() }, [y, spin, tilt, footX, particles, count])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [playing])

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
        <button className="btn btn-sm" onClick={() => switchTab('juegos')}>
          <ArrowLeft size={16} /> {t('quenocaiga_volver')}
        </button>
      </div>

      <motion.div className="card quenocaiga-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="quenocaiga-title">{t('quenocaiga_title')}</h3>
        <p className="quenocaiga-sub">{t('quenocaiga_sub')}</p>

        <div className="quenocaiga-canvas-wrap" onPointerDown={handlePointerDown}>
          <canvas ref={canvasRef} className="quenocaiga-canvas" />
          {playing && <div className="tap-hint">{t('quenocaiga_toca')}</div>}
          {!playing && count === 0 && <div className="start-hint">{t('quenocaiga_inicio')}</div>}
          {!playing && count > 0 && <div className="restart-hint">{t('quenocaiga_reintentar')}</div>}
        </div>

        {combo > 2 && <div className="combo-display">{combo}x {t('quenocaiga_combo')}</div>}

        {showTrick && (
          <motion.div className="trick-popup" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            <span className="trick-emoji">{showTrick.emoji}</span>
            <span className="trick-name">{t(showTrick.name)}</span>
          </motion.div>
        )}

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

        <button className="btn btn-primary btn-block quenocaiga-reset" onClick={() => { setPlaying(false); setCount(0); setSpin(0); setTilt(0); setY(BASE_Y); setCombo(0); }}>
          <RotateCcw size={16} /> {t('quenocaiga_reset')}
        </button>
      </motion.div>
    </>
  )
}