import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { RotateCcw, ArrowLeft, Zap, Flag, Sparkles, Keyboard, MousePointer } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const STORAGE_KEY = 'pso_encara_best'

function getBest() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) } catch { return 0 }
}
function setBest(v) {
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
}

const LANES = [-1, 0, 1]
const LANE_WIDTH = 100
const PLAYER_RADIUS = 14
const ENEMY_RADIUS = 16
const BASE_SPEED = 4.5
const MAX_SPEED = 10
const ACCELERATION = 0.0008
const JUMP_DURATION = 450
const SLIDE_DURATION = 400

const ENEMY_TYPES = [
  { id: 'static', name: 'encara_static', color: '#ef4444', h: 36, w: 28, behavior: 'static' },
  { id: 'mover', name: 'encara_mover', color: '#f97316', h: 32, w: 28, behavior: 'mover', speed: 2.5 },
  { id: 'jumper', name: 'encara_jumper', color: '#22c55e', h: 30, w: 26, behavior: 'jumper', jumpInterval: 1800 },
  { id: 'slider', name: 'encara_slider', color: '#3b82f6', h: 22, w: 36, behavior: 'slider' },
  { id: 'giant', name: 'encara_giant', color: '#a855f7', h: 48, w: 40, behavior: 'static' },
]

const POWERUPS = [
  { id: 'shield', name: 'encara_shield', color: '#fbbf24', icon: '🛡️', duration: 5000 },
  { id: 'magnet', name: 'encara_magnet', color: '#60a5fa', icon: '🧲', duration: 5000 },
  { id: 'slowmo', name: 'encara_slowmo', color: '#a78bfa', icon: '⏱️', duration: 4000 },
  { id: 'double', name: 'encara_double', color: '#f472b6', icon: '2️⃣', duration: 5000 },
]

export default function Encara() {
  const { v, switchTab } = useApp()
  void v
  const [playing, setPlaying] = useState(false)
  const [dead, setDead] = useState(false)
  const [distance, setDistance] = useState(0)
  const [best, setBestDist] = useState(getBest())
  const [lane, setLane] = useState(1)
  const [targetLane, setTargetLane] = useState(1)
  const [isJumping, setIsJumping] = useState(false)
  const [jumpProgress, setJumpProgress] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const [slideProgress, setSlideProgress] = useState(0)
  const [playerX, setPlayerX] = useState(0)
  const [enemies, setEnemies] = useState([])
  const [powerups, setPowerups] = useState([])
  const [particles, setParticles] = useState([])
  const [trail, setTrail] = useState([])
  const [ghostTrail, setGhostTrail] = useState([])
  const [showGhost, setShowGhost] = useState(false)
  const [activePowerup, setActivePowerup] = useState(null)
  const [powerupTimer, setPowerupTimer] = useState(0)
  const [combo, setCombo] = useState(0)
  const [nearMisses, setNearMisses] = useState(0)
  const [spawnTimer, setSpawnTimer] = useState(0)
  useEffect(() => { laneRef.current = lane }, [lane])
  useEffect(() => { isJumpingRef.current = isJumping }, [isJumping])
  useEffect(() => { isSlidingRef.current = isSliding }, [isSliding])
  const [nextEnemyType, setNextEnemyType] = useState(0)
  const [speed, setSpeed] = useState(BASE_SPEED)
  const [score, setScore] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const raf = useRef(null)
  const lastTime = useRef(0)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const ghostData = useRef(null)
  const laneRef = useRef(1)
  const isJumpingRef = useRef(false)
  const isSlidingRef = useRef(false)
  const keysPressed = useRef(new Set())
  const swipeStart = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('pso_encara_ghost')
    if (saved) {
      try { ghostData.current = JSON.parse(saved); setShowGhost(true) } catch {}
    }
  }, [])

  const saveGhost = useCallback((trailData) => {
    if (trailData.length > 100) {
      const simplified = trailData.filter((_, i) => i % 3 === 0).slice(-500)
      ghostData.current = simplified
      try { localStorage.setItem('pso_encara_ghost', JSON.stringify(simplified)) } catch {}
      setShowGhost(true)
    }
  }, [])

  const spawnEnemy = useCallback(() => {
    const typeIdx = Math.min(Math.floor(nextEnemyType / 2), ENEMY_TYPES.length - 1)
    const type = ENEMY_TYPES[typeIdx]
    const enemyLane = LANES[Math.floor(Math.random() * 3)]
    const enemy = {
      id: Date.now() + Math.random(),
      type: type.id,
      lane: enemyLane,
      y: -60,
      angle: 0,
      jumpPhase: 0,
      slidePhase: 0,
      moveDir: Math.random() > 0.5 ? 1 : -1,
      hue: Math.random() * 360,
    }
    setEnemies(e => [...e, enemy])
    setNextEnemyType(n => Math.min(n + 0.3, ENEMY_TYPES.length * 2 - 1))
  }, [nextEnemyType])

  const spawnPowerup = useCallback(() => {
    if (Math.random() > 0.08) return
    const type = POWERUPS[Math.floor(Math.random() * POWERUPS.length)]
    const pw = {
      id: Date.now(),
      type: type.id,
      lane: LANES[Math.floor(Math.random() * 3)],
      y: -40,
      rotation: 0,
    }
    setPowerups(p => [...p, pw])
  }, [])

  const addParticles = useCallback((x, y, color, count, speed = 4) => {
    const newP = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed - 2,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color
    }))
    setParticles(p => [...p, ...newP])
  }, [])

  const checkCollision = useCallback((px, py, pl, ex, ey, el, eh, ew) => {
    const px_abs = px + pl * LANE_WIDTH
    const ex_abs = ex + el * LANE_WIDTH
    const dx = px_abs - ex_abs
    const dy = py - ey
    const pr = PLAYER_RADIUS * (isSliding ? 0.6 : 1)
    const er = (ew || ENEMY_RADIUS)
    return dx * dx + dy * dy < (pr + er) ** 2
  }, [isSliding])

  const activatePowerup = useCallback((type) => {
    const pu = POWERUPS.find(p => p.id === type)
    if (!pu) return
    setActivePowerup(type)
    setPowerupTimer(pu.duration)
    if (type === 'slowmo') setSpeed(s => s * 0.5)
    if (type === 'double') setMultiplier(2)
  }, [])

  const gameLoop = useCallback((timestamp) => {
    if (!playing) return
    const dt = Math.min(32, timestamp - lastTime.current)
    lastTime.current = timestamp

    const effectiveSpeed = activePowerup === 'slowmo' ? speed * 0.5 : speed
    setDistance(d => d + effectiveSpeed * 0.12 * dt)
    setScore(s => s + Math.floor(effectiveSpeed * multiplier * 0.02 * dt))

    const currentLaneX = LANES[laneRef.current] * LANE_WIDTH
    setPlayerX(p => p + (currentLaneX - p) * 0.15)

    if (isJumping) {
      setJumpProgress(p => {
        const np = p + dt / JUMP_DURATION
        if (np >= 1) { setIsJumping(false); return 0 }
        return np
      })
    }
    if (isSliding) {
      setSlideProgress(p => {
        const np = p + dt / SLIDE_DURATION
        if (np >= 1) { setIsSliding(false); return 0 }
        return np
      })
    }

    setEnemies(e => {
      const newEnemies = []
      for (const enemy of e) {
        const type = ENEMY_TYPES.find(t => t.id === enemy.type)
        let ny = enemy.y + effectiveSpeed * 0.6 * dt
        let nAngle = enemy.angle

        if (type?.id === 'mover') {
          const moveSpeed = (type.speed || 2.5) * dt * 0.02
          const laneEdges = [-LANE_WIDTH, 0, LANE_WIDTH]
          const currentX = LANES[enemy.lane] * LANE_WIDTH
          const targetX = laneEdges[enemy.lane + 1 + (enemy.moveDir > 0 ? 1 : -1)]
          if (targetX === undefined) { enemy.moveDir *= -1 }
          else {
            const nx = currentX + enemy.moveDir * moveSpeed * 100
            if ((enemy.moveDir > 0 && nx >= targetX) || (enemy.moveDir < 0 && nx <= targetX)) {
              enemy.moveDir *= -1
            }
          }
        } else if (type?.id === 'jumper') {
          enemy.jumpPhase = (enemy.jumpPhase + dt / (type.jumpInterval || 1800)) % 1
          if (enemy.jumpPhase < 0.02 && enemy.jumpPhase + dt / (type.jumpInterval || 1800) >= 0.02) {
            nAngle = -0.3
          }
        } else if (type?.id === 'slider') {
          enemy.slidePhase = (enemy.slidePhase + dt / 1200) % 1
        }

        if (ny < 400) {
          newEnemies.push({ ...enemy, y: ny, angle: nAngle })
        }
      }
      return newEnemies
    })

    setPowerups(p => {
      return p.map(pw => ({ ...pw, y: pw.y + effectiveSpeed * 0.6 * dt, rotation: pw.rotation + dt * 0.003 }))
        .filter(pw => pw.y < 400)
    })

    setParticles(p => p.map(pt => ({
      ...pt, x: pt.x + pt.vx * dt, y: pt.y + pt.vy * dt,
      vy: pt.vy + 0.08 * dt, life: pt.life - pt.decay * dt
    })).filter(pt => pt.life > 0))

    setTrail(t => {
      const py = 180 - (isJumping ? Math.sin(jumpProgress * Math.PI) * 60 : 0) - (isSliding ? 15 : 0)
      const nt = [{ x: playerX.current || LANES[lane] * LANE_WIDTH, y: py, t: timestamp, speed: effectiveSpeed, lane }, ...t.slice(0, 150)]
      return nt
    })

    setSpawnTimer(s => {
      const rate = Math.max(500, 1600 - distance * 0.3)
      if (s + dt >= rate) {
        spawnEnemy()
        spawnPowerup()
        return 0
      }
      return s + dt
    })

    setSpeed(s => Math.min(MAX_SPEED, s + ACCELERATION * dt))

    let hit = false
    let closeCall = false
    const py = 180 - (isJumping ? Math.sin(jumpProgress * Math.PI) * 60 : 0) - (isSliding ? 15 : 0)
    const pl = lane

    if (activePowerup !== 'shield') {
      for (const enemy of enemies) {
        const type = ENEMY_TYPES.find(t => t.id === enemy.type)
        const eh = type?.h || 36
        const ew = type?.w || 28
        if (checkCollision(currentLaneX, py, pl, 0, enemy.y, enemy.lane, eh, ew)) {
          hit = true
          break
        }
        const dist = Math.abs(currentLaneX - (enemy.lane * LANE_WIDTH))
        if (dist < 50 && Math.abs(py - enemy.y) < 50) closeCall = true
      }
    }

    for (const pw of powerups) {
      if (lane === pw.lane && Math.abs(py - pw.y) < 30) {
        activatePowerup(pw.type)
        addParticles(currentLaneX, py, pw.color, 20, 6)
        setPowerups(p => p.filter(x => x.id !== pw.id))
        break
      }
    }

    if (closeCall) {
      setNearMisses(n => n + 1)
      setCombo(c => Math.min(c + 1, 99))
      addParticles(currentLaneX, py, '#fbbf24', 4, 3)
    } else if (!hit) {
      setCombo(c => Math.max(c - 0.05, 0))
    }

    if (powerupTimer > 0) {
      setPowerupTimer(t => {
        const nt = t - dt
        if (nt <= 0) {
          if (activePowerup === 'slowmo') setSpeed(s => s * 2)
          if (activePowerup === 'double') setMultiplier(1)
          setActivePowerup(null)
        }
        return nt
      })
    }

    if (hit) {
      setPlaying(false)
      setDead(true)
      const finalDist = Math.floor(distance + effectiveSpeed * 0.12 * dt)
      setDistance(finalDist)
      if (finalDist > best) { setBestDist(finalDist); setBest(finalDist) }
      saveGhost(trail)
      addParticles(currentLaneX, py, '#ef4444', 40, 10)
      return
    }

    raf.current = requestAnimationFrame(gameLoop)
  }, [playing, lane, distance, speed, enemies, powerups, activePowerup, powerupTimer, isJumping, jumpProgress, isSliding, slideProgress, trail, multiplier, combo, nearMisses, best, nextEnemyType, isJumping, isSliding])

  const start = useCallback(() => {
    try { if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus() } catch {}
    setPlaying(true)
    setDead(false)
    setDistance(0)
    setScore(0)
    setLane(1)
    setTargetLane(1)
    setIsJumping(false)
    setJumpProgress(0)
    setIsSliding(false)
    setSlideProgress(0)
    setPlayerX(0)
    setEnemies([])
    setPowerups([])
    setParticles([])
    setTrail([])
    setCombo(0)
    setNearMisses(0)
    setSpawnTimer(0)
    setNextEnemyType(0)
    setSpeed(BASE_SPEED)
    setActivePowerup(null)
    setPowerupTimer(0)
    setMultiplier(1)
    lastTime.current = performance.now()
    raf.current = requestAnimationFrame(gameLoop)
  }, [gameLoop])

  const handleKeyDown = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) { try { e.preventDefault() } catch {} }
    if (!playing || dead) return
    keysPressed.current.add(e.code)
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); setLane(l => Math.max(0, l - 1)); setCombo(c => Math.max(c - 2, 0)) }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setLane(l => Math.min(2, l + 1)); setCombo(c => Math.max(c - 2, 0)) }
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !isJumpingRef.current && !isSlidingRef.current) { e.preventDefault(); setIsJumping(true); setJumpProgress(0); addParticles(LANES[laneRef.current] * LANE_WIDTH, 180, '#60a5fa', 8, 4) }
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !isSlidingRef.current && !isJumpingRef.current) { e.preventDefault(); setIsSliding(true); setSlideProgress(0); addParticles(LANES[laneRef.current] * LANE_WIDTH, 180, '#fbbf24', 6, 2) }
  }, [playing, dead, lane, isJumping, isSliding, addParticles])

  const handleKeyUp = useCallback((e) => {
    keysPressed.current.delete(e.code)
  }, [])

  const handleTouchStart = useCallback((e) => {
    if (dead) { start(); return }
    if (!playing) { start(); return }
    const touch = e.touches[0]
    swipeStart.current = { x: touch.clientX, y: touch.clientY, t: Date.now() }
  }, [dead, playing, start])

  const handleTouchEnd = useCallback((e) => {
    if (!playing || dead || !swipeStart.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - swipeStart.current.x
    const dy = touch.clientY - swipeStart.current.y
    const dt = Date.now() - swipeStart.current.t
    swipeStart.current = null
    if (dt > 300) return
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 40) { setLane(l => Math.min(2, l + 1)); setCombo(c => Math.max(c - 2, 0)) }
      else if (dx < -40) { setLane(l => Math.max(0, l - 1)); setCombo(c => Math.max(c - 2, 0)) }
    } else {
      if (dy < -40 && !isJumping && !isSliding) { setIsJumping(true); setJumpProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#60a5fa', 8, 4) }
      else if (dy > 40 && !isSliding && !isJumping) { setIsSliding(true); setSlideProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#fbbf24', 6, 2) }
    }
  }, [playing, dead, lane, isJumping, isSliding, addParticles])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleTouchStart = (e) => {
      if (dead) { start(); return }
      if (!playing) { start(); return }
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }
    const handleTouchEnd = (e) => {
      if (!playing || dead || !swipeStart.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - swipeStart.current.x
      const dy = touch.clientY - swipeStart.current.y
      const dt = Date.now() - swipeStart.current.t
      swipeStart.current = null
      if (dt > 300) return
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) { setLane(l => Math.min(2, l + 1)); setCombo(c => Math.max(c - 2, 0)) }
        else if (dx < -40) { setLane(l => Math.max(0, l - 1)); setCombo(c => Math.max(c - 2, 0)) }
      } else {
        if (dy < -40 && !isJumping && !isSliding) { setIsJumping(true); setJumpProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#60a5fa', 8, 4) }
        else if (dy > 40 && !isSliding && !isJumping) { setIsSliding(true); setSlideProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#fbbf24', 6, 2) }
      }
    }
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd)
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [playing, dead, lane, isJumping, isSliding, addParticles])

  const draw = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const w = canvas.width
    const h = canvas.height
    const scale = window.devicePixelRatio
    const cx = w / 2
    const cy = h / 2

    ctx.clearRect(0, 0, w, h)

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0a0f1a')
    grad.addColorStop(0.3, '#1a2a4a')
    grad.addColorStop(1, '#0f1b3d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(59,130,246,0.08)'
    ctx.lineWidth = 1 * scale
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * LANE_WIDTH * scale, 0)
      ctx.lineTo(cx + i * LANE_WIDTH * scale, h)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(cx, cy)

    if (showGhost && ghostData.current) {
      ctx.strokeStyle = 'rgba(168,85,247,0.12)'
      ctx.lineWidth = 3 * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      let first = true
      for (const pt of ghostData.current) {
        if (first) { ctx.moveTo(pt.x * scale, (180 - pt.y) * scale); first = false }
        else ctx.lineTo(pt.x * scale, (180 - pt.y) * scale)
      }
      ctx.stroke()
    }

    powerups.forEach(pw => {
      const alpha = 0.9 + Math.sin(pw.rotation * 2) * 0.1
      ctx.globalAlpha = alpha
      ctx.save()
      ctx.translate(pw.lane * LANE_WIDTH * scale, (180 - pw.y) * scale)
      ctx.rotate(pw.rotation)
      ctx.font = `${28 * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pw.icon, 0, 0)
      ctx.restore()
    })
    ctx.globalAlpha = 1

    particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x * scale, (180 - p.y) * scale, p.size * scale, 0, Math.PI * 2)
      ctx.fill()
    })

    trail.forEach((pt, i) => {
      const alpha = (1 - i / trail.length) * 0.12 * Math.min(1, pt.speed / 8)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = pt.speed > 7 ? '#fbbf24' : activePowerup === 'slowmo' ? '#a78bfa' : '#60a5fa'
      ctx.lineWidth = (2 + pt.speed * 0.4) * scale
      ctx.lineCap = 'round'
      if (i < trail.length - 1) {
        const npt = trail[i + 1]
        ctx.beginPath()
        ctx.moveTo(pt.x * scale, (180 - pt.y) * scale)
        ctx.lineTo(npt.x * scale, (180 - npt.y) * scale)
        ctx.stroke()
      }
    })
    ctx.globalAlpha = 1

    enemies.forEach(enemy => {
      const type = ENEMY_TYPES.find(t => t.id === enemy.type)
      const clr = type?.color || '#ef4444'
      const eh = type?.h || 36
      const ew = type?.w || 28
      const ex = enemy.lane * LANE_WIDTH * scale
      const ey = (180 - enemy.y) * scale

      ctx.save()
      ctx.translate(ex, ey)

      if (type?.id === 'jumper' && enemy.jumpPhase < 0.3) {
        const jumpH = Math.sin(enemy.jumpPhase / 0.3 * Math.PI) * 25
        ctx.translate(0, -jumpH * scale)
      }
      if (type?.id === 'slider' && enemy.slidePhase < 0.5) {
        const slideW = Math.sin(enemy.slidePhase / 0.5 * Math.PI) * 1.5
        ctx.scale(slideW, 1)
      }

      ctx.fillStyle = clr
      ctx.beginPath()
      if (type?.id === 'giant') {
        ctx.roundRect(-ew/2 * scale, -eh * scale, ew * scale, eh * scale, 8 * scale)
      } else if (type?.id === 'slider') {
        ctx.roundRect(-ew/2 * scale, -eh * scale, ew * scale, eh * scale, 4 * scale)
      } else {
        ctx.roundRect(-ew/2 * scale, -eh * scale, ew * scale, eh * scale, 6 * scale)
      }
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.arc(-ew/4 * scale, -eh * 0.7 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ew/4 * scale, -eh * 0.7 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.fill()

      if (type?.id === 'mover') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 2 * scale
        ctx.setLineDash([6 * scale, 4 * scale])
        ctx.beginPath()
        ctx.moveTo(-ew/2 * scale, 0)
        ctx.lineTo(ew/2 * scale, 0)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    const py = 180 - (isJumping ? Math.sin(jumpProgress * Math.PI) * 60 : 0) - (isSliding ? 15 : 0)
    const px = (playerX.current || LANES[lane] * LANE_WIDTH) * scale
    const playerY = (180 - py) * scale
    const boost = speed > MAX_SPEED * 0.7 || activePowerup === 'double'

    if (activePowerup === 'shield') {
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 25 * scale
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3 * scale
      ctx.beginPath()
      ctx.arc(px, playerY, (PLAYER_RADIUS + 8) * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    ctx.shadowColor = boost ? '#fbbf24' : (activePowerup === 'slowmo' ? '#a78bfa' : 'rgba(59,130,246,0.6)')
    ctx.shadowBlur = boost ? 22 * scale : 14 * scale

    const playerGrad = ctx.createRadialGradient(-5 * scale, -5 * scale, 0, 0, 0, PLAYER_RADIUS * scale)
    if (activePowerup === 'slowmo') {
      playerGrad.addColorStop(0, '#f3e8ff')
      playerGrad.addColorStop(0.5, '#c084fc')
      playerGrad.addColorStop(1, '#a855f7')
    } else if (activePowerup === 'magnet') {
      playerGrad.addColorStop(0, '#dbeafe')
      playerGrad.addColorStop(0.5, '#60a5fa')
      playerGrad.addColorStop(1, '#3b82f6')
    } else if (activePowerup === 'double') {
      playerGrad.addColorStop(0, '#fdf2f8')
      playerGrad.addColorStop(0.5, '#f472b6')
      playerGrad.addColorStop(1, '#ec4899')
    } else {
      playerGrad.addColorStop(0, boost ? '#fffbeb' : '#fff')
      playerGrad.addColorStop(0.5, boost ? '#fde68a' : '#93c5fd')
      playerGrad.addColorStop(1, boost ? '#fbbf24' : '#3b82f6')
    }
    ctx.fillStyle = playerGrad
    ctx.beginPath()
    const pr = PLAYER_RADIUS * (isSliding ? 0.6 : 1)
    ctx.roundRect(px - pr * scale, playerY - pr * scale, pr * 2 * scale, pr * 2 * scale, 6 * scale)
    ctx.fill()

    if (isSliding) {
      ctx.fillStyle = 'rgba(251,191,36,0.5)'
      ctx.beginPath()
      ctx.arc(px, playerY + 5 * scale, 4 * scale, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(px - 3 * scale, playerY - 5 * scale, 4 * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    requestAnimationFrame(draw)
  }, [playerX, lane, enemies, powerups, particles, trail, activePowerup, isJumping, jumpProgress, isSliding, slideProgress, speed, showGhost, distance])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleTouchStart = (e) => {
      if (dead) { start(); return }
      if (!playing) { start(); return }
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }
    const handleTouchEnd = (e) => {
      if (!playing || dead || !swipeStart.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - swipeStart.current.x
      const dy = touch.clientY - swipeStart.current.y
      const dt = Date.now() - swipeStart.current.t
      swipeStart.current = null
      if (dt > 300) return
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) { setLane(l => Math.min(2, l + 1)); setCombo(c => Math.max(c - 2, 0)) }
        else if (dx < -40) { setLane(l => Math.max(0, l - 1)); setCombo(c => Math.max(c - 2, 0)) }
      } else {
        if (dy < -40 && !isJumping && !isSliding) { setIsJumping(true); setJumpProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#60a5fa', 8, 4) }
        else if (dy > 40 && !isSliding && !isJumping) { setIsSliding(true); setSlideProgress(0); addParticles(LANES[lane] * LANE_WIDTH, 180, '#fbbf24', 6, 2) }
      }
    }
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd)
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [playing, dead, lane, isJumping, isSliding, addParticles])

  const finalDist = Math.floor(distance)

  return (
    <>
      <div className="game-topbar">
        <div className="streak">
          <Zap size={22} className="flame" style={{ color: finalDist > best ? '#fbbf24' : 'var(--gold)' }} />
          <span className="streak-num" style={{ color: finalDist > best ? '#fbbf24' : 'inherit' }}>{finalDist}m</span>
          <span className="streak-label">{t('encara_distancia')}</span>
        </div>
        <div className="score-display">
          <Sparkles size={16} /> <span>{score.toLocaleString()}</span>
          {multiplier > 1 && <span className="multiplier">x{multiplier}</span>}
        </div>
        <div className="best-badge">
          <Flag size={16} /> {t('encara_mejor')} <strong>{best}m</strong>
        </div>
        <button className="btn btn-sm" onClick={() => switchTab('juegos')}>
          <ArrowLeft size={16} /> {t('encara_volver')}
        </button>
      </div>

      <motion.div className="card encara-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="encara-title">{t('encara_title')}</h3>
        <p className="encara-sub">{t('encara_sub')}</p>

        <div className="encara-controls-hint">
          <kbd>←</kbd><kbd>→</kbd> {t('encara_mover')} | <kbd>↑</kbd><kbd>Space</kbd> {t('encara_saltar')} | <kbd>↓</kbd> {t('encara_deslizar')}
          <span className="mobile-hint">{t('encara_swipe')}</span>
        </div>

        <div className="encara-canvas-wrap" onTouchStart={(e) => { if (dead) start(); else if (!playing) start(); }} onTouchEnd={(e) => {}}>
          <canvas ref={canvasRef} className="encara-canvas" tabIndex={0} style={{ touchAction: 'none' }} onClick={(e) => { try { e.currentTarget.focus() } catch {} }} />
          {playing && <div className="tap-hint">{activePowerup && <span className="powerup-active">{POWERUPS.find(p => p.id === activePowerup)?.icon} {t(POWERUPS.find(p => p.id === activePowerup)?.name)}</span>}</div>}
          {!playing && !dead && <div className="start-hint"><Keyboard size={24} /> {t('encara_inicio')}</div>}
          {dead && <motion.div className="dead-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="dead-content">
              <Sparkles size={32} className="dead-icon" />
              <h4>{t('encara_chocaste')}</h4>
              <p className="dead-dist">{finalDist}m</p>
              <p className="dead-score">{score.toLocaleString()} pts</p>
              {finalDist > best && <p className="dead-record">{t('encara_nuevo_record')}</p>}
              <div className="dead-stats">
                <span>{nearMisses} {t('encara_cercanos')}</span>
                <span>{combo > 0 ? Math.round(combo) + ' ' + t('encara_combo_max') : ''}</span>
              </div>
            </div>
          </motion.div>}
        </div>

        {activePowerup && <div className="powerup-banner"><span>{POWERUPS.find(p => p.id === activePowerup)?.icon}</span> <strong>{t(POWERUPS.find(p => p.id === activePowerup)?.name)}</strong> <span>{Math.ceil(powerupTimer / 1000)}s</span></div>}

        <div className="lane-indicator">
          {LANES.map((_, i) => (
            <div key={i} className={`lane-dot ${i === lane ? 'active' : ''}`} />
          ))}
        </div>

        <div className="stats-row">
          <div className="stat-mini">
            <span className="stat-val">{finalDist}m</span>
            <span className="stat-lbl">{t('encara_actual')}</span>
          </div>
          <div className="stat-mini best">
            <span className="stat-val">{best}m</span>
            <span className="stat-lbl">{t('encara_record')}</span>
          </div>
          <div className="stat-mini">
            <span className="stat-val">{score.toLocaleString()}</span>
            <span className="stat-lbl">{t('encara_puntos')}</span>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={start}>
            <RotateCcw size={16} /> {t(dead ? 'encara_reintentar' : 'encara_reset')}
          </button>
          <button className="btn" onClick={() => switchTab('juegos')}>
            <ArrowLeft size={16} /> {t('encara_volver')}
          </button>
        </div>
      </motion.div>
    </>
  )
}