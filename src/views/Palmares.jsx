import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Trash2, X, Trophy, UserPlus, Check } from 'lucide-react'
import { useApp, ConfirmModal } from '../core/app.jsx'
import { t, EmptyState, TeamDot, initialsOf } from '../core/ui.jsx'

/* Lista completa de títulos: manuales (palmares) + derivados de títulos de clubes. */
function palmaresEntries() {
  const entries = []
  ;(State.data.palmares || []).forEach(p => {
    entries.push({
      id: p.id, year: String(p.year || '').trim(), name: p.name,
      logo: p.logo, players: (p.players || []).map(pl => pl.name),
      tag: '', source: 'manual'
    })
  })
  State.data.teams.forEach(team => {
    (team.titles || []).forEach(ti => {
      entries.push({
        id: team.id, year: String(ti.year || '').trim(), name: team.name,
        logo: team.logo, players: (team.players || []).map(pl => pl.name),
        tag: ti.competitionName || '', source: 'auto'
      })
    })
  })
  return entries.filter(e => e.year)
}

function palmaresYears(entries) {
  return [...new Set(entries.map(e => e.year))].sort((a, b) => Number(b) - Number(a))
}

function WinnerCard({ e, index, onDelete }) {
  const isAdmin = typeof State !== 'undefined' ? !!State.isAdmin : false
  return (
    <motion.div
      className="palmares-winner"
      style={e.tag ? { borderColor: 'rgba(240,197,66,0.5)' } : undefined}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.3 }}
    >
      <div className="palmares-winner-crest">
        <TeamDot team={{ logo: e.logo, name: e.name }} className="pal-winner-dot" />
      </div>
      <div className="palmares-winner-info">
        <div className="palmares-winner-name">{e.name}</div>
        {e.tag ? <div className="palmares-winner-tag"><Trophy size={14} /> {e.tag}</div> : null}
        {e.players && e.players.length ? (
          <div className="palmares-winner-plantel">{t('palmares_plantel')}: {e.players.join(' · ')}</div>
        ) : null}
      </div>
      {isAdmin && e.source === 'manual' ? (
        <button className="btn btn-icon btn-danger palmares-del-btn" onClick={() => onDelete(e)} title={t('btn_eliminar')}>
          <Trash2 size={16} />
        </button>
      ) : null}
    </motion.div>
  )
}

export default function Palmares() {
  const { v, openModal, showToast, isAdmin } = useAppNoAuth()
  void v
  const isAdminReal = typeof State !== 'undefined' ? !!State.isAdmin : isAdmin
  const entries = palmaresEntries()
  const years = palmaresYears(entries)

  const [selYear, setSelYear] = useState(() => {
    const fallback = String(years[0] || '')
    try {
      const raw = localStorage.getItem('pso_pal_year') || fallback
      return years.includes(raw) ? raw : fallback
    } catch (e) { return fallback }
  })

  const selEntries = entries.filter(e => e.year === selYear)

  const askDelete = e => {
    openModal(
      <ConfirmModal
        title={t('modal_eliminar_palmares')}
        body={t('confirm_del_palmares', { name: e.name })}
        confirmLabel="btn_eliminar"
        tone="danger"
        onConfirm={async () => {
          await deletePalmaresEntryDB(e.id)
          showToast(t('toast_palmares_eliminado'))
        }}
      />
    )
  }

  const pickYear = y => {
    try { localStorage.setItem('pso_pal_year', y) } catch (err) {}
    setSelYear(y)
  }

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('palmares_title')}</h2>
        <span className="section-sub">{t('palmares_sub')}</span>
        {isAdminReal ? (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => openModal(<PalFormModal />)}>
            <Plus size={16} /> {t('palmares_agregar_btn')}
          </button>
        ) : null}
      </div>

      {!years.length ? (
        <EmptyState icon="🏆" text={t('palmares_empty')} />
      ) : (
        <>
          <div className="pal-years">
            {years.map(y => (
              <button key={y} className={`pal-year-btn ${y === selYear ? 'active' : ''}`} onClick={() => pickYear(y)}>{y}</button>
            ))}
          </div>
          <div className="palmares-year-content">
            {selEntries.length
              ? selEntries.map((e, i) => <WinnerCard key={e.id + e.year + i} e={e} index={i} onDelete={askDelete} />)
              : <EmptyState icon="🏆" text={t('palmares_empty_year', { year: selYear })} />}
          </div>
        </>
      )}
    </>
  )
}

/* Mini-hook local: solo necesita openModal/showToast del contexto */
function useAppNoAuth() {
  return useApp()
}

/* ======================================================================
   MODAL: AGREGAR TÍTULO AL PALMARÉS (solo admin)
   ====================================================================== */
function PalFormModal() {
  const { closeModal, showToast } = useApp()
  const [name, setName] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [logo, setLogo] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const onFile = e => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { showToast(t('toast_logo_pesada'), 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const size = 400
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        setLogo(canvas.toDataURL('image/webp', 0.9))
        showToast(t('toast_logo_actualizado'))
      }
      img.onerror = () => showToast(t('toast_logo_error'), 'error')
      img.src = ev.target.result
    }
    reader.onerror = () => showToast(t('toast_logo_leer'), 'error')
    reader.readAsDataURL(file)
  }

  const addPlayer = pName => setPlayers(ps => [...ps, { id: uid('pl'), name: pName }])
  const removePlayer = i => setPlayers(ps => ps.filter((_, idx) => idx !== i))

  const save = async () => {
    const finalName = name.trim()
    const finalYear = String(year || '').trim()
    if (!finalName) { setError(t('err_nombre_valido')); return }
    if (!finalYear) { showToast(t('palmares_year_required'), 'error'); return }
    const entry = { id: uid('pal'), name: finalName, year: finalYear, logo, players }
    await persistPalmaresEntry(entry)
    closeModal()
    showToast(t('toast_palmares_creado', { name: entry.name, year: entry.year }))
  }

  return (
    <div className="modal-pad pal-form">
      <div className="modal-title-text">{t('palmares_modal_title')}</div>

      <div className="pal-logo-row">
        <div className="pal-logo-preview">
          {logo ? <img src={logo} alt="" /> : initialsOf(name || t('palmares_title'))}
        </div>
        <div>
          <input type="file" id="pal-logo-input" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          <div className="btn-row">
            <button type="button" className="btn btn-sm" onClick={() => document.getElementById('pal-logo-input').click()}>
              🖼️ {logo ? t('btn_cambiar_logo') : t('btn_subir_logo')}
            </button>
            {logo ? (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => setLogo(null)}>{t('btn_quitar')}</button>
            ) : null}
          </div>
          <div className="pal-logo-note">{t('logo_crop_note')}</div>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('palmares_label_nombre')}</label>
          <input type="text" autoFocus value={name} placeholder={t('palmares_ph_nombre')} onChange={e => { setName(e.target.value); setError('') }} />
        </div>
        <div className="field field-year">
          <label>{t('palmares_label_year')}</label>
          <input type="number" min="1990" max="2100" value={year} placeholder="2026" onChange={e => setYear(e.target.value)} />
        </div>
      </div>
      {error ? <div className="field-error show">{error}</div> : null}

      <div className="pal-players-head">
        <label>{t('label_plantel')}</label>
        <button type="button" className="btn btn-sm" onClick={() => setAdding(a => !a)}>
          <UserPlus size={15} /> {t('btn_agregar_jugador')}
        </button>
      </div>

      {adding ? (
        <QuickPlayerForm onAdd={pName => { addPlayer(pName); setAdding(false) }} onCancel={() => setAdding(false)} />
      ) : null}

      <div className="pal-players-list">
        {!players.length
          ? <p className="pal-players-empty">{t('sin_jugadores_list')}</p>
          : players.map((p, i) => (
              <div className="pal-player-row" key={p.id}>
                <span>{p.name}</span>
                <button type="button" className="btn btn-icon btn-sm" onClick={() => removePlayer(i)}><X size={15} /></button>
              </div>
            ))}
      </div>

      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-primary" onClick={save}><Check size={16} /> {t('palmares_btn_crear')}</button>
      </div>
    </div>
  )
}

function QuickPlayerForm({ onAdd, onCancel }) {
  const [val, setVal] = useState('')
  return (
    <div className="quick-player">
      <input
        type="text"
        autoFocus
        value={val}
        placeholder={t('ph_player_name')}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onAdd(val.trim()) }}
      />
      <div className="btn-row">
        <button type="button" className="btn btn-sm btn-primary" disabled={!val.trim()} onClick={() => onAdd(val.trim())}>{t('btn_guardar')}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>{t('btn_cancel')}</button>
      </div>
    </div>
  )
}