import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Camera, X, User, Trophy, Target, Save, Loader2, LogIn, UserPlus } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, TeamDot, EmptyState } from '../core/ui.jsx'

function getTeamById(id) {
  return State.data.teams.find(t => t.id === id)
}

function getUpcomingMatches() {
  return (State.data.matches || []).filter(m => !m.played && !m.isBye).sort((a, b) => (a.round || 0) - (b.round || 0))
}

function getPlayedMatches() {
  return (State.data.matches || []).filter(m => m.played).sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0))
}

function getUserPreds() {
  if (!AuthState.user) return {}
  const S = (window.PSO_GAMES = window.PSO_GAMES || {}).predicciones || {}
  return S.preds?.[AuthState.user.id] || {}
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

export default function Perfil() {
  const { v, showToast, openModal } = useApp()
  void v
  const [avatar, setAvatar] = useState(() => AuthState.user?.avatar || null)
  const [cropper, setCropper] = useState({ img: null, x: 0, y: 0, scale: 1 })
  const [showCropper, setShowCropper] = useState(false)
  const [uploading, setUploading] = useState(false)
  const canvasRef = useRef(null)

  const [showTab, setShowTab] = useState('pendientes')

  useEffect(() => {
    if (AuthState.user?.avatar) setAvatar(AuthState.user.avatar)
  }, [AuthState.user, v])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast(t('perfil_foto_error'), 'error'); return }
    if (!file.type.startsWith('image/')) { showToast(t('perfil_foto_error'), 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        cropper.img = img
        setCropper({ ...cropper, img, x: 0, y: 0, scale: 1 })
        setShowCropper(true)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const drawCropper = () => {
    const canvas = canvasRef.current
    if (!canvas || !cropper.img) return
    const ctx = canvas.getContext('2d')
    const size = 300
    canvas.width = size
    canvas.height = size
    ctx.drawImage(cropper.img, cropper.x, cropper.y, cropper.img.width / cropper.scale, cropper.img.height / cropper.scale, 0, 0, size, size)
  }

  useEffect(() => { drawCropper() }, [cropper])

  const handleDrag = (e) => {
    if (!cropper.img) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scale = 300 / rect.width
    cropper.x -= e.movementX * scale / cropper.scale
    cropper.y -= e.movementY * scale / cropper.scale
    setCropper({ ...cropper })
  }

  const handleWheel = (e) => {
    e.preventDefault()
    if (!cropper.img) return
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(1, Math.min(5, cropper.scale * delta))
    cropper.scale = newScale
    setCropper({ ...cropper })
  }

  const saveAvatar = async () => {
    if (!cropper.img) return
    setUploading(true)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    ctx.drawImage(cropper.img, cropper.x, cropper.y, cropper.img.width / cropper.scale, cropper.img.height / cropper.scale, 0, 0, 400, 400)
    const dataUrl = canvas.toDataURL('image/webp', 0.85)
    try {
      await persistUserAvatar(dataUrl)
      setAvatar(dataUrl)
      if (AuthState.user) {
        AuthState.user.avatar = dataUrl
        localStorage.setItem('pso_user', JSON.stringify(AuthState.user))
      }
      setShowCropper(false)
      showToast(t('perfil_foto_guardada'))
    } catch (e) {
      showToast(t('perfil_foto_error'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    await persistUserAvatar(null)
    setAvatar(null)
    if (AuthState.user) {
      AuthState.user.avatar = null
      localStorage.setItem('pso_user', JSON.stringify(AuthState.user))
    }
    showToast(t('perfil_foto_guardada'))
  }

  async function persistUserAvatar(dataUrl) {
    if (!AuthState.user) return
    const userData = { ...AuthState.user, avatar: dataUrl }
    if (online) {
      try {
        await supaFetch('/rest/v1/users?id=eq.' + AuthState.user.id, {
          method: 'PATCH',
          token: authToken(),
          body: { avatar: dataUrl }
        })
      } catch (e) { /* offline fallback */ }
    }
  }

  const userPreds = getUserPreds()
  const upcoming = getUpcomingMatches()
  const played = getPlayedMatches()
  const myPoints = computePrediccionesPoints()

  const upcomingWithPreds = upcoming.map(m => {
    const home = getTeamById(m.homeId)
    const away = getTeamById(m.awayId)
    const pred = userPreds[m.id]
    return { ...m, home, away, pred }
  })

  const playedWithPreds = played.map(m => {
    const home = getTeamById(m.homeId)
    const away = getTeamById(m.awayId)
    const pred = userPreds[m.id]
    let status = 'pendiente'
    let points = 0
    if (pred) {
      if (pred.home === m.homeScore && pred.away === m.awayScore) { status = 'acierto'; points = 3 }
      else if ((pred.home > pred.away && m.homeScore > m.awayScore) ||
               (pred.home < pred.away && m.homeScore < m.awayScore) ||
               (pred.home === pred.away && m.homeScore === m.awayScore)) { status = 'acierto'; points = 1 }
      else { status = 'fallo'; points = 0 }
    }
    return { ...m, home, away, pred, status, points }
  })

  if (!AuthState.user) return <LoginRequired openModal={openModal} />

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('perfil_title')}</h2>
      </div>

      <motion.div className="card perfil-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="perfil-header">
          <div className="perfil-avatar-wrap">
            {avatar ? (
              <img src={avatar} alt="" className="perfil-avatar-img" />
            ) : (
              <div className="perfil-avatar-placeholder">{AuthState.user.displayName?.[0] || AuthState.user.username?.[0] || '?'}</div>
            )}
            <label className="perfil-avatar-btn" htmlFor="avatar-input">
              <Camera size={20} />
            </label>
            <input id="avatar-input" type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <div className="perfil-info">
            <h3>{AuthState.user.displayName || AuthState.user.username}</h3>
            <span className="perfil-username">@{AuthState.user.username}</span>
            <div className="perfil-stats">
              <span>🏆 {t('trivia_mejor_racha')}: {AuthState.user.bestStreak || 0}</span>
              <span>⚽ {t('tiroslibres_mejor_puntaje')}: {AuthState.user.bestPenalStreak || 0}</span>
              <span>🔮 {t('predicciones_ranking')}: {myPoints} pts</span>
            </div>
          </div>
        </div>
      </motion.div>

      {showCropper && (
        <motion.div className="modal-overlay show" onClick={() => setShowCropper(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="modal-box cropper-modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
            <div className="cropper-header">
              <h3>{t('perfil_ajustar')}</h3>
              <button className="modal-close" onClick={() => setShowCropper(false)}><X size={20} /></button>
            </div>
            <p className="cropper-note">{t('perfil_crop_note')}</p>
            <canvas ref={canvasRef} width={300} height={300} className="cropper-canvas" onMouseDown={e => { window.addEventListener('mousemove', handleDrag); window.addEventListener('mouseup', () => window.removeEventListener('mousemove', handleDrag)) }} onWheel={handleWheel} />
            <div className="cropper-actions">
              <button className="btn btn-danger" onClick={() => setShowCropper(false)}>{t('btn_cancel')}</button>
              <button className="btn btn-primary" onClick={saveAvatar} disabled={uploading}>
                {uploading ? <Loader2 size={16} className="spin" /> : <Save size={16} />} {t('btn_guardar')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="section-head">
        <h3 className="section-title">{t('perfil_tus_predicciones')}</h3>
      </div>

      {Object.keys(userPreds).length === 0 ? (
        <EmptyState icon="🔮" text={t('perfil_sin_predicciones')} />
      ) : (
        <div className="predicciones-history">
          <div className="prediccion-summary">
            <span>{t('perfil_ranking_predicciones', { n: 1, pts: myPoints })}</span>
          </div>
          <div className="prediccion-tabs">
            <button className={`prediccion-tab ${!upcomingWithPreds.some(p => p.pred) ? 'active' : ''}`} onClick={() => setShowTab('pendientes')}>
              {t('predicciones_pendiente')} ({upcomingWithPreds.filter(p => p.pred).length})
            </button>
            <button className={`prediccion-tab ${playedWithPreds.some(p => p.pred) ? 'active' : ''}`} onClick={() => setShowTab('jugados')}>
              {t('match_finalizado')} ({playedWithPreds.filter(p => p.pred).length})
            </button>
          </div>
          {showTab === 'pendientes' ? (
            upcomingWithPreds.filter(p => p.pred).map(renderPrediccionCard)
          ) : (
            playedWithPreds.filter(p => p.pred).map(renderPrediccionCard)
          )}
        </div>
      )}
    </>
  )
}

function LoginRequired({ openModal }) {
  return (
    <>
      <div className="section-head"><h2 className="section-title">{t('perfil_title')}</h2></div>
      <motion.div className="card game-cta-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="game-cta-emoji">👤</div>
        <h3>{t('auth_title')}</h3>
        <p>{t('auth_need_account')}</p>
        <div className="btn-row-block">
          <button className="btn btn-primary btn-block" onClick={() => openModal(<LoginModal />)}><LogIn size={16} /> {t('btn_ingresar')}</button>
          <button className="btn btn-gold btn-block" onClick={() => openModal(<LoginModal initialTab="register" />)}><UserPlus size={16} /> {t('btn_crear_cuenta')}</button>
        </div>
      </motion.div>
    </>
  )
}

function renderPrediccionCard(m) {
  const isPlayed = m.played
  const pred = m.pred
  return (
    <motion.div key={m.id} className="prediccion-history-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="prediccion-history-header">
        <span className="prediccion-round">{t('admin_round', { n: m.round })}</span>
        {isPlayed && <span className={`prediccion-status ${m.status}`}>{m.status === 'acierto' ? t('predicciones_acierto') : t('predicciones_fallo')} {m.points > 0 && t('predicciones_puntos', { n: m.points })}</span>}
      </div>
      <div className="prediccion-teams">
        <div className="prediccion-team">
          <TeamDot team={m.home} size={28} />
          <span>{m.home?.name}</span>
          {pred && <strong>{pred.home}</strong>}
        </div>
        <span className="prediccion-vs">VS</span>
        <div className="prediccion-team">
          <TeamDot team={m.away} size={28} />
          <span>{m.away?.name}</span>
          {pred && <strong>{pred.away}</strong>}
        </div>
      </div>
      {isPlayed && (
        <div className="prediccion-real">
          <span>{t('predicciones_resultado_real')}: </span>
          <strong>{m.homeScore} - {m.awayScore}</strong>
        </div>
      )}
    </motion.div>
  )
}