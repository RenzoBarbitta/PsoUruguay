import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw, ArrowLeft, Zap, Flag, Sparkles } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t } from '../core/ui.jsx'

const STORAGE_KEY = 'pso_encara_best'

function getBest() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) } catch { return 0 }
}
function setBest(v) {
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
}

const PLAYER_RADIUS = 10
const ENEMY_RADIUS = 12
const PLAYER_MASS = 1
const PLAYER_FRICTION = 0.92
const PLAYER_ACCEL = 0.65
const MAX_SPEED = 7.5
const BASE_SPAWN_RATE = 1800
const MIN_SPAWN_RATE = 400
const LANE_WIDTH = 280

const ENEMY_TYPES = [
  { id: 'mirror', name: 't.encara_mirror', color: '#60a5fa', behavior: 'mirror', speed: 1.0, delay: 12 },
  { id: 'predictor', name: 't.encara_predictor', color: '#f87171', behavior: 'predictor', speed: 1.15, delay: 8 },
  { id: 'guardian', name: 't.encara_guardian', color: '#34d399', behavior: 'guardian', speed: 0.7, delay: 0, zone: true },
  { id: 'presser', name: 't.encara_presser', color: '#fb923c', behavior: 'presser', speed: 1.3, delay: 0 },
  { id: 'drifter', name: 't.encara_drifter', color: '#a78bfa', behavior: 'drifter', speed: 0.9, delay: 0 }
]

const ZONES = [
  { id: 'ice', name: 't.encara_ice', color: '#67e8f9', friction: 0.985, accelMul: 0.4, rare: 0.008 },
  { id: 'sand', name: 't.encara_sand', color: '#fde68a', friction: 0.82, accelMul: 1.8, rare: 0.008 },
  { id: 'portal', name: 't.encara_portal', color: '#f472b6', teleport: true, rare: 0.004 },
  { id: 'bubble', name: 't.encara_bubble', color: '#86efac', freeze: true, rare: 0.006 }
]

export default function Encara() {
  const { v, switchTab } = useApp()
  void v
  const [playing, setPlaying] = useState(false)
  const [dead, setDead] = useState(false)
  const [distance, setDistance] = useState(0)
  const [best, setBestDist] = useState(getBest())
  const [player, setPlayer] = useState({ x: 0, y: 0, vx: 0, vy: 0 })
  const [enemies, setEnemies] = useState([])
  const [zones, setZones] = useState([])
  const [particles, setParticles] = useState([])
  const [trail, setTrail] = useState([])
  const [ghostTrail, setGhostTrail] = useState([])
  const [showGhost, setShowGhost] = useState(false)
  const [activeZone, setActiveZone] = useState(null)
  const [zoneTimer, setZoneTimer] = useState(0)
  const [combo, setCombo] = useState(0)
  const [nearMisses, setNearMisses] = useState(0)
  const [spawnTimer, setSpawnTimer] = useState(0)
  const [nextEnemyType, setNextEnemyType] = useState(0)
  const [difficulty, setDifficulty] = useState(0)
  const raf = useRef(null)
  const lastTime = useRef(0)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const input = useRef({ x: 0, y: 0, down: false })
  const ghostData = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('pso_encara_ghost')
    if (saved) {
      try { ghostData.current = JSON.parse(saved); setShowGhost(true) } catch {}
    }
  }, [])

  const saveGhost = (trailData) => {
    if (trailData.length > 100) {
      const simplified = trailData.filter((_, i) => i % 3 === 0).slice(-500)
      ghostData.current = simplified
      try { localStorage.setItem('pso_encara_ghost', JSON.stringify(simplified)) } catch {}
      setShowGhost(true)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctxRef.current = ctx
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const spawnEnemy = () => {
    const type = ENEMY_TYPES[Math.min(nextEnemyType, ENEMY_TYPES.length - 1)]
    const lane = (Math.random() - 0.5) * LANE_WIDTH * 0.8
    const startY = -60
    let enemy = {
      id: Date.now() + Math.random(),
      type: type.id,
      x: lane,
      y: startY,
      vx: 0,
      vy: 0,
      angle: 0,
      hue: 0,
      frozen: 0
    }
    if (type.id === 'guardian') {
      enemy.zoneX = lane
      enemy.zoneY = startY + 200 + Math.random() * 300
    }
    setEnemies(e => [...e, enemy])
    setNextEnemyType(n => Math.min(n + 0.15, ENEMY_TYPES.length - 1))
  }

  const spawnZone = () => {
    if (Math.random() > 0.008) return
    const zoneType = ZONES[Math.floor(Math.random() * ZONES.length)]
    if (Math.random() > (zoneType.rare || 0.01)) return
    const zone = {
      id: Date.now(),
      type: zoneType.id,
      x: (Math.random() - 0.5) * LANE_WIDTH * 0.7,
      y: -80,
      radius: 50 + Math.random() * 30,
      life: 1,
      color: zoneType.color
    }
    setZones(z => [...z, zone])
  }

  const addParticles = (x, y, color, count, speed = 3) => {
    const newP = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color
    }))
    setParticles(p => [...p, ...newP])
  }

  const checkCollision = (px, py, ex, ey, pr, er) => {
    const dx = px - ex
    const dy = py - ey
    return dx * dx + dy * dy < (pr + er) ** 2
  }

  const gameLoop = (timestamp) => {
    if (!playing) return
    const dt = Math.min(32, timestamp - lastTime.current)
    lastTime.current = timestamp
    const timeSec = dt / 16.67

    setDistance(d => d + Math.max(0.5, Math.hypot(player.vx, player.vy)) * 0.08 * timeSec)

    let friction = PLAYER_FRICTION
    let accelMul = 1
    if (activeZone) {
      const zone = ZONES.find(z => z.id === activeZone)
      if (zone) {
        friction = zone.friction || friction
        accelMul = zone.accelMul || accelMul
      }
    }

    setPlayer(p => {
      let nx = p.x
      let ny = p.y
      let nvx = p.vx
      let nvy = p.vy

      if (input.current.down) {
        const dx = input.current.x - nx
        const dy = input.current.y - ny
        const dist = Math.hypot(dx, dy)
        if (dist > 1) {
          nvx += (dx / dist) * PLAYER_ACCEL * accelMul * timeSec
          nvy += (dy / dist) * PLAYER_ACCEL * accelMul * timeSec
        }
      }

      const speed = Math.hypot(nvx, nvy)
      if (speed > MAX_SPEED) {
        nvx = (nvx / speed) * MAX_SPEED
        nvy = (nvy / speed) * MAX_SPEED
      }

      nvx *= friction
      nvy *= friction

      nx += nvx * timeSec
      ny += nvy * timeSec

      const halfW = (LANE_WIDTH / 2) - PLAYER_RADIUS
      if (nx < -halfW) { nx = -halfW; nvx = Math.abs(nvx) * 0.3 }
      if (nx > halfW) { nx = halfW; nvx = -Math.abs(nvx) * 0.3 }

      return { x: nx, y: ny, vx: nvx, vy: nvy }
    })

    setEnemies(e => {
      const newEnemies = []
      const p = player
      for (const enemy of e) {
        if (enemy.frozen > 0) {
          newEnemies.push({ ...enemy, frozen: enemy.frozen - 1, y: enemy.y + 0.5 * timeSec })
          continue
        }

        let nvx = enemy.vx
        let nvy = enemy.vy
        const type = ENEMY_TYPES.find(t => t.id === enemy.type)
        const spd = (type?.speed || 1) * (1 + difficulty * 0.08)

        if (type?.id === 'mirror') {
          const targetX = p.x
          const targetY = p.y + 120
          const dx = targetX - enemy.x
          const dy = targetY - enemy.y
          const dist = Math.hypot(dx, dy)
          if (dist > 1) {
            nvx += (dx / dist) * 0.12 * spd * timeSec
            nvy += (dy / dist) * 0.12 * spd * timeSec
          }
        } else if (type?.id === 'predictor') {
          const predX = p.x + p.vx * 10
          const predY = p.y + p.vy * 10 + 100
          const dx = predX - enemy.x
          const dy = predY - enemy.y
          const dist = Math.hypot(dx, dy)
          if (dist > 1) {
            nvx += (dx / dist) * 0.15 * spd * timeSec
            nvy += (dy / dist) * 0.15 * spd * timeSec
          }
        } else if (type?.id === 'guardian') {
          const dx = enemy.zoneX - enemy.x
          const dy = enemy.zoneY - enemy.y
          const dist = Math.hypot(dx, dy)
          if (dist > 30) {
            nvx += (dx / dist) * 0.08 * spd * timeSec
            nvy += (dy / dist) * 0.08 * spd * timeSec
          } else {
            const pdx = p.x - enemy.x
            const pdy = p.y - enemy.y
            const pdist = Math.hypot(pdx, pdy)
            if (pdist < 100) {
              nvx += (pdx / pdist) * 0.2 * spd * timeSec
              nvy += (pdy / pdist) * 0.2 * spd * timeSec
            }
          }
        } else if (type?.id === 'presser') {
          const dx = p.x - enemy.x
          const dy = p.y - enemy.y
          const dist = Math.hypot(dx, dy)
          if (dist > 1) {
            nvx += (dx / dist) * 0.18 * spd * timeSec
            nvy += (dy / dist) * 0.18 * spd * timeSec
          }
        } else if (type?.id === 'drifter') {
          nvx += Math.sin(timestamp / 800 + enemy.id) * 0.05 * timeSec
          nvy += 0.35 * spd * timeSec
        }

        const espeed = Math.hypot(nvx, nvy)
        const maxE = 4.5 * spd
        if (espeed > maxE) {
          nvx = (nvx / espeed) * maxE
          nvy = (nvy / espeed) * maxE
        }

        const nx = enemy.x + nvx * timeSec
        const ny = enemy.y + nvy * timeSec

        const angle = Math.atan2(nvy, nvx)

        if (ny < 500) {
          newEnemies.push({ ...enemy, x: nx, y: ny, vx: nvx, vy: nvy, angle })
        }
      }
      return newEnemies
    })

    setZones(z => z.map(zo => {
      const nzo = { ...zo, y: zo.y + 2.5 * timeSec, life: zo.life - 0.0008 * timeSec }
      return nzo.life > 0 && nzo.y < 500 ? nzo : null
    }).filter(Boolean))

    setParticles(p => p.map(pt => ({
      ...pt, x: pt.x + pt.vx * timeSec, y: pt.y + pt.vy * timeSec,
      vy: pt.vy + 0.08 * timeSec, life: pt.life - pt.decay * timeSec
    })).filter(pt => pt.life > 0))

    setTrail(t => {
      const nt = [{ x: player.x, y: player.y, t: timestamp, speed: Math.hypot(player.vx, player.vy) }, ...t.slice(0, 120)]
      return nt
    })

    setSpawnTimer(s => {
      const rate = Math.max(MIN_SPAWN_RATE, BASE_SPAWN_RATE - difficulty * 30)
      if (s + dt >= rate) {
        spawnEnemy()
        spawnZone()
        return 0
      }
      return s + dt
    })

    setDifficulty(d => d + 0.0008 * timeSec)

    let hit = false
    let closeCall = false
    for (const enemy of enemies) {
      if (checkCollision(player.x, player.y, enemy.x, enemy.y, PLAYER_RADIUS, ENEMY_RADIUS)) {
        hit = true
        break
      }
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y)
      if (dist < 35 && !hit) closeCall = true
    }

    if (closeCall) {
      setNearMisses(n => n + 1)
      setCombo(c => Math.min(c + 1, 99))
      addParticles(player.x, player.y, '#fbbf24', 3, 2)
    } else if (!hit) {
      setCombo(c => Math.max(c - 0.1, 0))
    }

    for (const zone of zones) {
      if (checkCollision(player.x, player.y, zone.x, zone.y, PLAYER_RADIUS, zone.radius)) {
        const ztype = ZONES.find(z => z.id === zone.type)
        if (ztype?.teleport) {
          setPlayer(p => ({ ...p, x: (Math.random() - 0.5) * LANE_WIDTH * 0.6, y: p.y - 200 }))
          addParticles(player.x, player.y, zone.color, 20, 6)
          setZones(z => z.filter(z => z.id !== zone.id))
        } else if (ztype?.freeze) {
          setEnemies(e => e.map(en => ({ ...en, frozen: 120 })))
          setZoneTimer(180)
          addParticles(player.x, player.y, zone.color, 15, 3)
          setZones(z => z.filter(z => z.id !== zone.id))
        } else {
          setActiveZone(zone.type)
          setZoneTimer(400)
          addParticles(player.x, player.y, zone.color, 8, 2)
        }
        break
      }
    }

    if (zoneTimer > 0) {
      setZoneTimer(z => z - 1)
      if (zoneTimer === 1) setActiveZone(null)
    }

    if (hit) {
      setPlaying(false)
      setDead(true)
      const finalDist = Math.floor(distance + Math.max(0.5, Math.hypot(player.vx, player.vy)) * 0.08 * timeSec)
      setDistance(finalDist)
      if (finalDist > best) { setBestDist(finalDist); setBest(finalDist) }
      saveGhost(trail)
      addParticles(player.x, player.y, '#ef4444', 30, 8)
      return
    }

    raf.current = requestAnimationFrame(gameLoop)
  }

  const start = () => {
    setPlaying(true)
    setDead(false)
    setDistance(0)
    setPlayer({ x: 0, y: 180, vx: 0, vy: 0 })
    setEnemies([])
    setZones([])
    setParticles([])
    setTrail([])
    setCombo(0)
    setNearMisses(0)
    setSpawnTimer(0)
    setNextEnemyType(0)
    setDifficulty(0)
    setActiveZone(null)
    setZoneTimer(0)
    input.current = { x: 0, y: 180, down: false }
    lastTime.current = performance.now()
    raf.current = requestAnimationFrame(gameLoop)
  }

  const handlePointerDown = (e) => {
    if (dead) { start(); return }
    if (!playing) { start(); return }
    const rect = canvasRef.current.getBoundingClientRect()
    input.current = { x: (e.clientX - rect.left - rect.width / 2) / window.devicePixelRatio, y: (e.clientY - rect.top - rect.height / 2) / window.devicePixelRatio, down: true }
  }

  const handlePointerMove = (e) => {
    if (playing) {
      const rect = canvasRef.current.getBoundingClientRect()
      input.current = { x: (e.clientX - rect.left - rect.width / 2) / window.devicePixelRatio, y: (e.clientY - rect.top - rect.height / 2) / window.devicePixelRatio, down: true }
    }
  }

  const handlePointerUp = () => {
    if (playing) input.current.down = false
  }

  const draw = () => {
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
    grad.addColorStop(0, '#0d1a2e')
    grad.addColorStop(0.4, '#1a2a4a')
    grad.addColorStop(1, '#0f1b3d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(91,155,213,0.08)'
    ctx.lineWidth = 1 * scale
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * 60 * scale, 0)
      ctx.lineTo(cx + i * 60 * scale, h)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(cx, cy)

    if (showGhost && ghostData.current) {
      ctx.strokeStyle = 'rgba(168,85,247,0.15)'
      ctx.lineWidth = 2.5 * scale
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

    zones.forEach(zone => {
      const alpha = zone.life * 0.3
      const grad = ctx.createRadialGradient(zone.x * scale, (180 - zone.y) * scale, 0, zone.x * scale, (180 - zone.y) * scale, zone.radius * scale)
      grad.addColorStop(0, zone.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', ''))
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(zone.x * scale, (180 - zone.y) * scale, zone.radius * scale, 0, Math.PI * 2)
      ctx.fill()

      if (zone.type === 'portal') {
        ctx.strokeStyle = zone.color
        ctx.lineWidth = 2 * scale
        ctx.beginPath()
        ctx.arc(zone.x * scale, (180 - zone.y) * scale, (zone.radius + Math.sin(Date.now() / 100) * 5) * scale, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x * scale, (180 - p.y) * scale, p.size * scale, 0, Math.PI * 2)
      ctx.fill()
    })

    trail.forEach((pt, i) => {
      const alpha = (1 - i / trail.length) * 0.15 * Math.min(1, pt.speed / 5)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = pt.speed > 6 ? '#fbbf24' : '#60a5fa'
      ctx.lineWidth = (2 + pt.speed * 0.3) * scale
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
      const frozen = enemy.frozen > 0

      ctx.save()
      ctx.translate(enemy.x * scale, (180 - enemy.y) * scale)
      ctx.rotate(enemy.angle)

      if (frozen) {
        ctx.fillStyle = 'rgba(134,239,172,0.3)'
        ctx.beginPath()
        ctx.arc(0, 0, (ENEMY_RADIUS + 8) * scale, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = clr
      ctx.beginPath()
      ctx.moveTo(ENEMY_RADIUS * scale, 0)
      ctx.lineTo(-ENEMY_RADIUS * 0.6 * scale, -ENEMY_RADIUS * 0.8 * scale)
      ctx.lineTo(-ENEMY_RADIUS * 0.6 * scale, ENEMY_RADIUS * 0.8 * scale)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ENEMY_RADIUS * 0.3 * scale, -ENEMY_RADIUS * 0.2 * scale, 2 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-ENEMY_RADIUS * 0.3 * scale, -ENEMY_RADIUS * 0.2 * scale, 2 * scale, 0, Math.PI * 2)
      ctx.fill()

      if (type?.id === 'guardian') {
        ctx.strokeStyle = 'rgba(52,211,153,0.5)'
        ctx.lineWidth = 1.5 * scale
        ctx.setLineDash([8 * scale, 6 * scale])
        ctx.beginPath()
        ctx.arc(0, 0, 70 * scale, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    const speed = Math.hypot(player.vx, player.vy)
    const boost = speed > MAX_SPEED * 0.85

    ctx.shadowColor = boost ? '#fbbf24' : 'rgba(91,155,213,0.6)'
    ctx.shadowBlur = boost ? 20 * scale : 12 * scale

    const playerGrad = ctx.createRadialGradient(-4 * scale, -4 * scale, 0, 0, 0, PLAYER_RADIUS * scale)
    playerGrad.addColorStop(0, boost ? '#fffbeb' : '#fff')
    playerGrad.addColorStop(0.5, boost ? '#fde68a' : '#93c5fd')
    playerGrad.addColorStop(1, boost ? '#fbbf24' : '#3b82f6')
    ctx.fillStyle = playerGrad
    ctx.beginPath()
    ctx.arc(player.x * scale, (180 - player.y) * scale, PLAYER_RADIUS * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc((player.x - 3) * scale, (183 - player.y) * scale, 3 * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    requestAnimationFrame(draw)
  }

  useEffect(() => { draw() }, [player, enemies, zones, particles, trail, activeZone, distance])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [playing])

  const finalDist = Math.floor(distance)

  return (
    <>
      <div className="game-topbar">
        <div className="streak">
          <Zap size={22} className="flame" style={{ color: finalDist > best ? '#fbbf24' : 'var(--gold)' }} />
          <span className="streak-num" style={{ color: finalDist > best ? '#fbbf24' : 'inherit' }}>{finalDist}m</span>
          <span className="streak-label">{t('encara_distancia')}</span>
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

        <div className="encara-canvas-wrap" onPointerDown={handlePointerDown}>
          <canvas ref={canvasRef} className="encara-canvas" />
          {playing && <div className="tap-hint">{t('encara_arrastra')}</div>}
          {!playing && !dead && <div className="start-hint">{t('encara_inicio')}</div>}
          {dead && <motion.div className="dead-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="dead-content">
              <Sparkles size={32} className="dead-icon" />
              <h4>{t('encara_chocaste')}</h4>
              <p className="dead-dist">{finalDist}m</p>
              {finalDist > best && <p className="dead-record">{t('encara_nuevo_record')}</p>}
              <div className="dead-stats">
                <span>{nearMisses} {t('encara_cercanos')}</span>
                <span>{combo > 0 ? Math.round(combo) + ' ' + t('encara_combo_max') : ''}</span>
              </div>
            </div>
          </motion.div>}
        </div>

        {activeZone && <div className="zone-indicator">{t('encara_zona_activa')} <strong>{t(ZONES.find(z => z.id === activeZone)?.name || activeZone)}</strong></div>}

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
            <span className="stat-val">{enemies.length}</span>
            <span className="stat-lbl">{t('encara_rivales')}</span>
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