import React, { useState } from 'react'
import { motion } from 'motion/react'
import {
  Users, ClipboardList, Trophy, Settings, Plus, Trash2, Save, Shield,
  UserPlus, Pencil, X, CalendarClock, Shuffle, Eye, RotateCcw
} from 'lucide-react'
import { useApp, ConfirmModal } from '../core/app.jsx'
import { useData, t, TeamDot, EmptyState, fadeUp } from '../core/ui.jsx'

/* ======================================================================
   PANEL DE ADMIN (réplica React del admin legacy)
   Usa los mismos helpers de datos (persistTeam / persistMatch /
   persistCompetition / persistSettings + safeSet/RLS). El reseteo vuelve
   los equipos al estado original del bebé de carga (estado LOCAL siguiendo
   la convención del código legacy).
   ====================================================================== */

/* Helpers portados de legacy/admin.js (código original no se carga más) */
const POSITION_KEYS = ['gk', 'def', 'mid', 'fwd']
const POSITION_SHORT_LABELS = {
  gk: { es: 'ARQ', pt: 'GOL' },
  def: { es: 'DEF', pt: 'ZAG' },
  mid: { es: 'MED', pt: 'MEI' },
  fwd: { es: 'DEL', pt: 'ATA' }
}
const positionLabel = code => t('pos_' + code)
const positionShort = code => (POSITION_SHORT_LABELS[code] || {})[typeof I18N !== 'undefined' && I18N.lang] || (POSITION_SHORT_LABELS[code] || {}).es || code

function generateRoundRobin(teamIds, idaVuelta = true) {
  let teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push(null)
  const n = teams.length
  const half = n / 2
  const rounds = []
  let arr = [...teams]
  for (let r = 0; r < n - 1; r++) {
    const roundMatches = []
    for (let i = 0; i < half; i++) {
      const a = arr[i], b = arr[n - 1 - i]
      if (a !== null && b !== null) {
        roundMatches.push(r % 2 === 0 ? [a, b] : [b, a])
      }
    }
    rounds.push(roundMatches)
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop())
    arr = [fixed, ...rest]
  }
  if (idaVuelta) {
    return [...rounds, ...rounds.map(round => round.map(([a, b]) => [b, a]))]
  }
  return rounds
}

async function maybeAdvanceCopaRounds(forMatch) {
  let bracketMatches = State.data.matches.filter(m => m.bracket)
  if (!bracketMatches.length) return
  const isLegacy = bracketMatches.some(m => !m.competitionId)
  if (!isLegacy && forMatch && forMatch.competitionId) {
    bracketMatches = bracketMatches.filter(m => m.competitionId === forMatch.competitionId)
  }
  if (!bracketMatches.length) return
  const maxRound = Math.max(...bracketMatches.map(m => m.bracketRound || 1))
  const totalRounds = bracketMatches[0].totalBracketRounds || maxRound
  const currentRoundMatches = bracketMatches.filter(m => m.bracketRound === maxRound)
  if (!currentRoundMatches.every(m => m.played)) return
  if (maxRound >= totalRounds || currentRoundMatches.length === 1) {
    const finalMatch = currentRoundMatches[0]
    if (finalMatch && finalMatch.played && !finalMatch.championDeclared) {
      const winnerId = Number(finalMatch.homeScore) > Number(finalMatch.awayScore) ? finalMatch.homeId : finalMatch.awayId
      if (winnerId) {
        const comp = (State.data.competitions || []).find(c => c.id === finalMatch.competitionId)
        await declareChampion(winnerId, comp || null)
        await persistMatch({ ...finalMatch, championDeclared: true })
      }
    }
    return
  }
  if (bracketMatches.some(m => m.bracketRound === maxRound + 1)) return
  const winners = currentRoundMatches
    .sort((a, b) => a.bracketSlot - b.bracketSlot)
    .map(m => m.isBye ? (m.homeId || m.awayId) : Number(m.homeScore) > Number(m.awayScore) ? m.homeId : m.awayId)
  const nextMatches = []
  for (let i = 0; i < winners.length; i += 2) {
    const homeId = winners[i], awayId = winners[i + 1] || null
    const hasBye = !homeId || !awayId
    nextMatches.push({
      id: uid('match'), round: maxRound + 1, bracket: true, bracketRound: maxRound + 1, bracketSlot: i / 2,
      homeId: homeId || null, awayId: awayId || null,
      homeScore: hasBye && homeId ? 1 : 0, awayScore: hasBye && awayId ? 1 : 0,
      played: hasBye, isBye: hasBye, stats: {},
      competitionId: isLegacy ? undefined : (forMatch && forMatch.competitionId),
      totalBracketRounds: totalRounds, competitionFormat: 'copa'
    })
  }
  for (const m of nextMatches) await persistMatch(m)
  toast(t('toast_ronda_generada', { n: maxRound + 1 }))
  window.psoBus.emit('data-updated')
  await maybeAdvanceCopaRounds(forMatch)
}

async function declareChampion(teamId, comp) {
  const team = getTeamById(teamId)
  if (!team) return
  const title = {
    competitionName: comp ? comp.name : (State.data.settings.competitionName || t('copa_default_name')),
    format: comp ? comp.type : State.data.settings.competitionFormat,
    year: comp ? (comp.season || State.data.settings.season) : State.data.settings.season
  }
  await persistTeam({ ...team, titles: [...(team.titles || []), title] })
}

const TABS = [
  { id: 'equipos', label: () => t('admin_tab_equipos'), icon: Users },
  { id: 'resultados', label: () => t('admin_tab_resultados'), icon: ClipboardList },
  { id: 'competencias', label: () => t('admin_tab_competencias'), icon: Trophy },
  { id: 'config', label: () => t('admin_tab_config'), icon: Settings }
]

export default function AdminPanel() {
  const { showToast } = useApp()
  const { data } = useData()
  const [sub, setSub] = useState(State.currentAdminTab || 'equipos')

  const cambiarTab = tab => {
    State.currentAdminTab = tab
    setSub(tab)
    window.psoBus.emit('content-updated')
  }

  const refresh = () => window.psoBus.emit('data-updated')

  return (
    <div className="admin-wrap">
      <motion.div className="admin-subtabs" initial="hidden" animate="show" variants={fadeUp}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} className={`admin-subtab ${sub === tab.id ? 'active' : ''}`} onClick={() => cambiarTab(tab.id)}>
              <Icon size={16} /> {tab.label()}
            </button>
          )
        })}
      </motion.div>

      <motion.div key={sub} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {sub === 'equipos' && <AdminEquipos data={data} showToast={showToast} refresh={refresh} />}
        {sub === 'resultados' && <AdminResultados data={data} showToast={showToast} refresh={refresh} />}
        {sub === 'competencias' && <AdminCompetencias data={data} showToast={showToast} refresh={refresh} />}
        {sub === 'config' && <AdminConfig data={data} showToast={showToast} refresh={refresh} />}
      </motion.div>
    </div>
  )
}

/* ---------------- EQUIPOS ---------------- */

function AdminEquipos({ data, showToast, refresh }) {
  const { openModal } = useApp()
  const teams = data.teams || []

  const nuevo = () => openModal(<TeamFormModal team={null} onDone={refresh} />)
  const editar = team => openModal(<TeamFormModal team={team} onDone={refresh} />)

  const agregarJugador = team => openModal(
    <div className="modal-pad">
      <div className="modal-title-text">{t('modal_add_player_to', { name: team.name })}</div>
      <QuickPlayerForm
        onSave={async name => {
          const updated = { ...team, players: [...(team.players || []), { id: uid('pl'), name, position: null }] }
          await persistTeam(updated)
          showToast(t('toast_jugador_agregado'))
          refresh()
        }}
      />
    </div>
  )

  const sacarJugador = async (team, playerId) => {
    await persistTeam({ ...team, players: (team.players || []).filter(p => p.id !== playerId) })
    showToast(t('toast_jugador_eliminado'))
    refresh()
  }

  const eliminar = team => openModal(
    <ConfirmModal
      title={t('modal_eliminar_equipo')}
      body={t('confirm_del_team', { name: team.name })}
      confirmLabel={t('btn_eliminar')}
      onConfirm={async () => {
        await deleteTeamDB(team.id)
        showToast(t('toast_equipo_eliminado'))
        refresh()
      }}
    />
  )

  if (!teams.length) {
    return (
      <div style={{ maxWidth: 480 }}>
        <button className="btn btn-primary btn-block" onClick={nuevo}><Plus size={16} /> {t('btn_nuevo_equipo')}</button>
        <EmptyState icon="🛡️" text={t('equipos_empty')} />
      </div>
    )
  }

  return (
    <div className="admin-teams">
      <div className="admin-col-head">
        <span className="section-sub">{t('admin_equipos_lista', { n: teams.length })}</span>
        <button className="btn btn-sm btn-gold" onClick={nuevo}><Plus size={14} /> {t('btn_nuevo_equipo')}</button>
      </div>
      {teams.map(team => (
        <motion.div key={team.id} className="team-admin-card" whileHover={{ y: -2 }}>
          <div className="team-admin-head">
            <TeamDot team={team} size={40} />
            <div className="team-admin-name">
              <b>{team.name}</b>
              {(team.titles || []).length > 0 && <Trophy size={13} className="gold-icon" />}
            </div>
            <div className="ta-actions">
              <button className="btn btn-sm" onClick={() => agregarJugador(team)} title={t('title_agregar_jugador')}><UserPlus size={14} /> {t('btn_jugador')}</button>
              <button className="btn btn-sm" onClick={() => editar(team)} title={t('title_editar_equipo')}><Pencil size={14} /></button>
              <button className="btn btn-sm btn-danger" onClick={() => eliminar(team)} title={t('btn_eliminar')}><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="ta-players">
            {(team.players || []).length ? team.players.map(p => (
              <span key={p.id} className="player-chip">
                {p.name}
                {p.position ? <em>{positionShort(p.position)}</em> : null}
                <button className="btn-remove-player" onClick={() => sacarJugador(team, p.id)}><X size={12} /></button>
              </span>
            )) : <span className="muted-sm">{t('sin_jugadores')}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function TeamFormModal({ team, onDone }) {
  const { closeModal, showToast } = useApp()
  const isEdit = !!team
  const [name, setName] = useState(team ? team.name : '')
  const [players, setPlayers] = useState(team ? JSON.parse(JSON.stringify(team.players || [])) : [])
  const [newPlayer, setNewPlayer] = useState('')

  const addPlayer = () => {
    const n = newPlayer.trim()
    if (!n) return
    setPlayers([...players, { id: uid('pl'), name: n, position: null }])
    setNewPlayer('')
  }

  const save = async () => {
    if (!name.trim()) { showToast(t('err_nombre_valido'), 'error'); return }
    const teamObj = isEdit
      ? { ...team, name: name.trim(), players }
      : { id: uid('team'), name: name.trim(), short: name.trim().slice(0, 3).toUpperCase(), logo: null, players }
    await persistTeam(teamObj)
    showToast(isEdit ? t('toast_equipo_actualizado') : t('toast_equipo_creado'))
    closeModal()
    onDone()
  }

  return (
    <div className="modal-pad">
      <div className="modal-title-text">{isEdit ? t('modal_editar_equipo') : t('modal_nuevo_equipo')}</div>
      <label>{t('label_nombre_equipo')}</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={t('ph_equipo')} />
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
        <input value={newPlayer} onChange={e => setNewPlayer(e.target.value)} placeholder={t('ph_jugador')} onKeyDown={e => { if (e.key === 'Enter') addPlayer() }} />
        <button className="btn btn-sm" onClick={addPlayer}><Plus size={14} /> {t('btn_jugador')}</button>
      </div>
      <div className="ta-players">
        {(players || []).map((p, i) => (
          <span key={p.id} className="player-chip">
            {p.name}
            <button className="btn-remove-player" onClick={() => setPlayers(players.filter((_, j) => j !== i))}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-gold" onClick={save}><Save size={15} /> {t('btn_guardar')}</button>
      </div>
    </div>
  )
}

function QuickPlayerForm({ onSave }) {
  const { closeModal } = useApp()
  const [name, setName] = useState('')
  const save = async () => {
    const n = name.trim()
    if (!n) { toast(t('err_nombre_valido'), 'error'); return }
    closeModal()
    await onSave(n)
  }
  return (
    <>
      <label>{t('label_nombre_jugador')}</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={t('ph_jugador')} onKeyDown={e => { if (e.key === 'Enter') save() }} />
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-primary" onClick={save}><Plus size={14} /> {t('btn_agregar')}</button>
      </div>
    </>
  )
}

/* ---------------- RESULTADOS ---------------- */

function AdminResultados({ data, showToast, refresh }) {
  const { openModal } = useApp()
  const teams = data.teams || []
  const matches = (data.matches || []).slice().sort((a, b) => (b.round || 0) - (a.round || 0))

  if (teams.length < 2) return <EmptyState icon="⚠️" text={t('resultados_need_teams')} />

  const nuevo = () => openModal(<NewMatchModal teams={teams} onDone={refresh} />)
  const programar = m => openModal(<ScheduleModal match={m} onDone={refresh} />)
  const resultado = m => openModal(<ResultModal match={m} onDone={refresh} />)
  const eliminar = m => openModal(
    <ConfirmModal
      title={t('modal_eliminar_partido')}
      body={t('confirm_del_match')}
      confirmLabel={t('btn_eliminar')}
      onConfirm={async () => {
        await deleteMatchDB(m.id)
        showToast(t('toast_partido_eliminado'))
        refresh()
      }}
    />
  )

  return (
    <div className="admin-res">
      <div className="admin-col-head">
        <span className="section-sub">{t('admin_res_lista')}</span>
        <button className="btn btn-sm btn-gold" onClick={nuevo}><Plus size={14} /> {t('btn_crear_partido')}</button>
      </div>
      {matches.map(m => {
        const home = getTeamById(m.homeId), away = getTeamById(m.awayId)
        const label = `${home ? home.name : '?'} vs ${away ? away.name : '?'}`
        return (
          <div key={m.id} className="admin-res-row">
            <span className="admin-res-round">{t('admin_round', { n: m.round ?? '—' })}</span>
            <span className="admin-res-names">
              <b>{home ? home.name : m.homeId}</b> {m.played ? `${m.homeScore}–${m.awayScore}` : '· vs ·'} <b>{away ? away.name : m.awayId}</b>
              {m.scheduledDate ? <em className="sched-badge">{m.scheduledDate}{m.scheduledTime ? ' ' + m.scheduledTime : ''}</em> : null}
            </span>
            <div className="ta-actions">
              <button className="btn btn-sm" onClick={() => programar(m)} title={t('btn_programar')}><CalendarClock size={14} /></button>
              <button className="btn btn-sm btn-primary" onClick={() => resultado(m)} title={t('btn_cargar_resultado')}>{t('btn_resultado')}</button>
              <button className="btn btn-sm btn-danger" onClick={() => eliminar(m)} title={t('btn_eliminar')}><Trash2 size={14} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NewMatchModal({ teams, onDone }) {
  const { closeModal, showToast } = useApp()
  const [round, setRound] = useState('1')
  const [homeId, setHomeId] = useState(teams[0] ? teams[0].id : '')
  const [awayId, setAwayId] = useState(teams[1] ? teams[1].id : '')
  const [err, setErr] = useState(null)

  const save = async () => {
    setErr(null)
    if (homeId === awayId) { setErr(t('err_two_teams')); return }
    const match = { id: uid('match'), round: Number(round) || 1, homeId, awayId, homeScore: 0, awayScore: 0, played: false, stats: {}, competitionFormat: 'liga' }
    await persistMatch(match)
    showToast(t('toast_partido_creado'))
    closeModal()
    onDone()
  }

  return (
    <div className="modal-pad">
      <div className="modal-title-text">{t('modal_cargar_partido')}</div>
      <label>{t('label_fecha_jornada')}</label>
      <input type="number" min="1" value={round} onChange={e => setRound(e.target.value)} />
      <div className="field-row">
        <div><label>{t('label_local')}</label>
          <select value={homeId} onChange={e => setHomeId(e.target.value)}>{teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label>{t('label_visitante')}</label>
          <select value={awayId} onChange={e => setAwayId(e.target.value)}>{teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      </div>
      {err ? <div className="field-error">{err}</div> : null}
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-gold" onClick={save}><Plus size={15} /> {t('btn_crear_partido')}</button>
      </div>
    </div>
  )
}

function ScheduleModal({ match, onDone }) {
  const { closeModal, showToast } = useApp()
  const [date, setDate] = useState(match.scheduledDate || '')
  const [time, setTime] = useState(match.scheduledTime || '')
  const tiene = !!(match.scheduledDate || match.scheduledTime)

  const save = async () => {
    await persistMatch({ ...match, scheduledDate: date, scheduledTime: time })
    showToast(t('toast_programado'))
    closeModal()
    onDone()
  }
  const quitar = async () => {
    await persistMatch({ ...match, scheduledDate: '', scheduledTime: '' })
    showToast(t('toast_programacion_quitada'))
    closeModal()
    onDone()
  }

  return (
    <div className="modal-pad">
      <div className="modal-title-text">{t('modal_programar')}</div>
      <div className="mini-note">{t('sched_note')}</div>
      <label>{t('label_dia')}</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <label>{t('label_horario')}</label>
      <input type="time" value={time} onChange={e => setTime(e.target.value)} />
      <div className="modal-footer-actions">
        {tiene ? <button className="btn btn-danger" onClick={quitar}>{t('btn_quitar_programacion')}</button> : null}
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-primary" onClick={save}><Save size={15} /> {t('btn_guardar')}</button>
      </div>
    </div>
  )
}

function ResultModal({ match, onDone }) {
  const { closeModal, showToast } = useApp()
  const home = getTeamById(match.homeId), away = getTeamById(match.awayId)
  const [step, setStep] = useState('lineup')
  const [lineup, setLineup] = useState({ ...(match.lineup || {}) })
  const [positions, setPositions] = useState({ ...(match.lineupPositions || {}) })
  const [homeScore, setHomeScore] = useState(match.homeScore || 0)
  const [awayScore, setAwayScore] = useState(match.awayScore || 0)
  const convocados = id => {
    const team = id === home.id ? home : away
    return (team.players || []).filter(p => lineup[p.id])
  }
  const [stats, setStats] = useState(() => {
    const all = [
      ...((home.players || []).filter(p => (match.lineup || {})[p.id])),
      ...((away.players || []).filter(p => (match.lineup || {})[p.id]))
    ]
    const s = {}
    all.forEach(p => { s[p.id] = (match.stats && match.stats[p.id]) || { goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 } })
    return s
  })

  const titulares = (team) => (team.players || []).filter(p => lineup[p.id] === 'titular').length

  const toggleLineup = (pid, team, estado) => {
    setLineup(prev => {
      if (prev[pid] === estado) {
        const { [pid]: _k, ...rest } = prev
        return rest
      }
      if (estado === 'titular' && titulares(team) >= 6) { toast(t('toast_6_titulares'), 'error'); return prev }
      return { ...prev, [pid]: estado }
    })
  }

  const setStat = (pid, field, value) =>
    setStats(s => ({ ...s, [pid]: { ...(s[pid] || { goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 }), [field]: Number(value) || 0 } }))

  const guardar = async () => {
    if (match.bracket && homeScore === awayScore) { showToast(t('toast_empate_copa'), 'error'); return }
    const updated = { ...match, homeScore: Number(homeScore) || 0, awayScore: Number(awayScore) || 0, played: true, playedAt: Date.now(), stats, lineup: { ...lineup }, lineupPositions: { ...positions } }
    await persistMatch(updated)
    for (const team of [home, away]) {
      let cambio = false
      const nuevos = (team.players || []).map(p => {
        if (positions[p.id] && positions[p.id] !== p.position) { cambio = true; return { ...p, position: positions[p.id] } }
        return p
      })
      if (cambio) await persistTeam({ ...team, players: nuevos })
    }
    closeModal()
    showToast(t('toast_resultado_guardado'))
    if (match.bracket) await maybeAdvanceCopaRounds(match)
    onDone()
  }

  if (step === 'lineup') {
    const renderLineup = (team) => {
      if (!(team.players || []).length) return <p className="muted-sm">{t('team_no_players')}</p>
      return (team.players || []).map(p => {
        const estado = lineup[p.id] || 'no-jugo'
        return (
          <div key={p.id} className="lineup-row">
            <div className="lineup-row-head">
              <span className="lineup-name">{p.name}</span>
              <span className="lineup-btns">
                <button className={`lineup-btn ${estado === 'titular' ? 'active' : ''}`} onClick={() => toggleLineup(p.id, team, 'titular')}>{t('btn_titular')}</button>
                <button className={`lineup-btn ${estado === 'suplente' ? 'active' : ''}`} onClick={() => toggleLineup(p.id, team, 'suplente')}>{t('btn_suplente')}</button>
              </span>
            </div>
            {estado === 'titular' || estado === 'suplente' ? (
              <select className="posicion-select" value={positions[p.id] || ''} onChange={e => setPositions(pp => {
                const next = { ...pp }
                if (e.target.value) next[p.id] = e.target.value; else delete next[p.id]
                return next
              })}>
                <option value="">{t('pos_sin_especificar')}</option>
                {POSITION_KEYS.map(pos => <option key={pos} value={pos}>{positionLabel(pos)}</option>)}
              </select>
            ) : null}
          </div>
        )
      })
    }

    return (
      <div className="modal-pad">
        <div className="modal-title-text">{home ? home.name : '?'} vs {away ? away.name : '?'}</div>
        <div className="mini-note">{t('lineup_note')}</div>
        <div className="lineup-grid">
          <div><div className="lineup-team-name">{home ? home.name : ''}</div>{renderLineup(home)}</div>
          <div><div className="lineup-team-name">{away ? away.name : ''}</div>{renderLineup(away)}</div>
        </div>
        <div className="modal-footer-actions">
          <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
          <button className="btn btn-primary" onClick={() => {
            if (!Object.keys(lineup).length) { setStep('confirmEmpty'); return }
            setStep('stats')
          }}>{t('btn_continuar_stats')}</button>
        </div>
      </div>
    )
  }

  if (step === 'confirmEmpty') {
    return (
      <div className="modal-pad">
        <div className="modal-title-text">{t('continuar_sin_alineacion')}</div>
        <div className="modal-body-text">{t('no_lineup_desc')}</div>
        <div className="modal-footer-actions">
          <button className="btn" onClick={() => setStep('lineup')}>{t('btn_volver')}</button>
          <button className="btn btn-primary" onClick={() => setStep('stats')}>{t('continuar_igual')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-pad">
      <div className="modal-title-text">{home ? home.name : '?'} vs {away ? away.name : '?'}</div>
      <div className="result-row">
        <div className="result-team">
          <div className="result-team-name">{home ? home.name : ''}</div>
          <input type="number" min="0" className="score-input" value={homeScore} onChange={e => setHomeScore(e.target.value)} />
        </div>
        <div className="result-vs">VS</div>
        <div className="result-team">
          <div className="result-team-name">{away ? away.name : ''}</div>
          <input type="number" min="0" className="score-input" value={awayScore} onChange={e => setAwayScore(e.target.value)} />
        </div>
      </div>
      <div className="stats-bar">
        <span>{t('stats_title_modal')}</span>
        <button className="btn btn-sm" onClick={() => setStep('lineup')}>{t('btn_editar_alineacion')}</button>
      </div>
      <div className="stat-rows">
        {[home, away].flatMap(team =>
          (team.players || []).filter(p => lineup[p.id]).map(p => {
            const esArq = positions[p.id] === 'gk'
            const s = stats[p.id] || {}
            return (
              <div key={p.id} className="stat-row">
                <div className="stat-name">
                  <b>{p.name}</b>
                  <em>{team.name}{positions[p.id] ? ' · ' + positionShort(positions[p.id]) : ''}</em>
                </div>
                <div className="stat-inputs">
                  <label>{t('label_goles')}<input type="number" min="0" value={s.goals || 0} onChange={e => setStat(p.id, 'goals', e.target.value)} /></label>
                  <label>{t('label_asist')}<input type="number" min="0" value={s.assists || 0} onChange={e => setStat(p.id, 'assists', e.target.value)} /></label>
                  <label className={esArq ? 'is-gk' : ''}>{t('label_atajadas')}<input type="number" min="0" value={s.saves || 0} onChange={e => setStat(p.id, 'saves', e.target.value)} /></label>
                  <label>{t('label_t_amar')}<input type="number" min="0" max="2" value={s.yellow || 0} onChange={e => setStat(p.id, 'yellow', e.target.value)} /></label>
                  <label>{t('label_t_roja')}<input type="number" min="0" max="1" value={s.red || 0} onChange={e => setStat(p.id, 'red', e.target.value)} /></label>
                </div>
              </div>
            )
          })
        ) || <p className="muted-sm">{t('stats_no_players')}</p>}
      </div>
      <div className="mini-note">{t('stats_note')}</div>
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-primary" onClick={guardar}><Save size={15} /> {t('btn_guardar_resultado')}</button>
      </div>
    </div>
  )
}

/* ---------------- COMPETENCIAS ---------------- */

function AdminCompetencias({ data, showToast, refresh }) {
  const { openModal } = useApp()
  const cups = data.competitions || []
  const teams = data.teams || []

  const nuevo = () => openModal(<CompFormModal comp={null} onDone={refresh} />)
  const editar = comp => openModal(<CompFormModal comp={comp} onDone={refresh} />)

  const ver = comp => {
    State.currentStatsCompetition = comp.id
    window.psoBus.emit('switch-tab', 'fixture')
  }

  const sortear = comp => {
    if ((comp.teamIds || []).length < 2) { showToast(t('no_equipos_seleccionados'), 'error'); return }
    const isLiga = comp.type === 'liga'
    const rounds = isLiga ? generateRoundRobin(comp.teamIds, true) : []
    const totalRounds = isLiga ? rounds.length : Math.ceil(Math.log2(nextPowerOfTwo(comp.teamIds.length)))
    const preview = isLiga
      ? rounds.map((r, idx) => (
          <div key={idx} className="sorteo-preview">
            <div className="round-title">{t('round_title', { n: idx + 1 })}</div>
            {r.map(([h, a]) => (
              <div key={`${h}-${a}`} className="match-preview">
                <span>{getTeamById(h) ? getTeamById(h).name : h}</span><span className="draw-vs">vs</span><span>{getTeamById(a) ? getTeamById(a).name : a}</span>
              </div>
            ))}
          </div>
        ))
      : ((comp.teamIds || []).length > 0 && (
          <div className="sorteo-preview">
            <div className="round-title">{t('copa_primera_ronda')}</div>
            {generateCopaBracket(comp.teamIds).map(([a, b], i) => (
              <div key={i} className="match-preview">
                <span>{a ? getTeamById(a).name : t('bye_libre')}</span><span className="draw-vs">vs</span><span>{b ? getTeamById(b).name : t('bye_libre')}</span>
              </div>
            ))}
          </div>
        ))
    openModal(
      <ConfirmModal
        title={t('confirmar_sorteo_competencia', { nombre: comp.name })}
        body={
          <div>
            <p className="muted-sm">{t('sorteo_competencia_p', { nombre: comp.name, n: (comp.teamIds || []).length })}</p>
            {preview}
          </div>
        }
        confirmLabel={t('btn_sortear_y_guardar')}
        tone="gold"
        onConfirm={async () => {
          if (isLiga) {
            const existing = State.data.matches.filter(m => m.competitionId === comp.id)
            for (const m of existing) await deleteMatchDB(m.id)
            const newMatches = []
            rounds.forEach((pares, idx) => pares.forEach(([homeId, awayId]) => {
              newMatches.push({ id: uid('match'), round: idx + 1, homeId, awayId, homeScore: 0, awayScore: 0, played: false, stats: {}, competitionId: comp.id, competitionFormat: 'liga', bracket: false })
            }))
            for (const m of newMatches) await persistMatch(m)
            showToast(t('toast_competencia_sorteada', { nombre: comp.name, rounds: rounds.length, matches: newMatches.length }))
          } else {
            const existing = State.data.matches.filter(m => m.competitionId === comp.id && m.bracket)
            for (const m of existing) await deleteMatchDB(m.id)
            const bracketMatches = []
            const total = Math.ceil(Math.log2(nextPowerOfTwo(comp.teamIds.length)))
            generateCopaBracket(comp.teamIds).forEach(([homeId, awayId], idx) => {
              const hasBye = !homeId || !awayId
              bracketMatches.push({ id: uid('match'), bracketRound: 1, bracketSlot: idx, homeId: homeId || null, awayId: awayId || null, homeScore: hasBye && homeId ? 1 : 0, awayScore: hasBye && awayId ? 1 : 0, played: hasBye, isBye: hasBye, stats: {}, bracket: true, competitionId: comp.id, competitionFormat: 'copa', totalBracketRounds: total })
            })
            for (const m of bracketMatches) await persistMatch(m)
            showToast(t('toast_competencia_sorteada', { nombre: comp.name, rounds: total, matches: bracketMatches.length }))
          }
          refresh()
        }}
      />
    )
  }

  const eliminar = comp => openModal(
    <ConfirmModal
      title={t('confirmar_eliminar_competencia')}
      body={
        <div>
          <p>{t('confirmar_eliminar_competencia_p')}</p>
          <div className="comp-delete-summary">
            <strong>{comp.name}</strong>
            <div className="muted-sm">{(comp.teamIds || []).length} {t('label_equipos_short')} · {getCompetitionMatchesCount(comp.id)} {t('stats_pj_short').toLowerCase()}</div>
          </div>
        </div>
      }
      confirmLabel={t('btn_eliminar_competencia')}
      onConfirm={async () => {
        const ms = State.data.matches.filter(m => m.competitionId === comp.id)
        for (const m of ms) await deleteMatchDB(m.id)
        await deleteCompetitionDB(comp.id)
        showToast(t('toast_competencia_eliminada'))
        refresh()
      }}
    />
  )

  if (!cups.length) {
    return (
      <div className="comp-empty">
        <div className="comp-empty-emoji">🏆</div>
        <p>{t('competencias_vacias')}</p>
        <button className="btn btn-gold" onClick={nuevo}><Plus size={16} /> {t('btn_nueva_competencia')}</button>
      </div>
    )
  }

  return (
    <div className="admin-comp">
      <div className="admin-col-head">
        <span className="section-sub">{t('competencias_subtitle')}</span>
        <button className="btn btn-sm btn-gold" onClick={nuevo} disabled={cups.length >= 4}><Plus size={14} /> {t('btn_nueva_competencia')}</button>
      </div>
      <div className="comp-grid">
        {cups.map((comp, idx) => {
          const isLiga = comp.type === 'liga'
          const participantes = teams.filter(x => comp.teamIds && comp.teamIds.includes(x.id))
          return (
            <motion.div key={comp.id} className="card competition-card" whileHover={{ y: -2 }}>
              <div className="competition-card-header">
                <div className="competition-slot-badge">{idx + 1}</div>
                <div className="cc-name">
                  <b>{comp.name}</b>
                  <span className="cc-type">{isLiga ? t('opt_liga') : t('opt_copa')} · {comp.teamIds ? comp.teamIds.length : 0} {t('label_equipos_short')}</span>
                </div>
                <div className="ta-actions">
                  <button className="btn btn-icon" onClick={() => editar(comp)} title={t('btn_editar_competencia')}><Pencil size={14} /></button>
                  <button className="btn btn-icon btn-danger" onClick={() => eliminar(comp)} title={t('btn_eliminar_competencia')}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="comp-teams-preview">
                {participantes.slice(0, 4).map(x => <TeamDot key={x.id} team={x} size={28} />)}
                {participantes.length > 4 ? <span className="comp-more">+{participantes.length - 4}</span> : null}
                {!participantes.length ? <span className="muted-sm">{t('competencias_vacias')}</span> : null}
              </div>
              <div className="comp-stats-row">
                <div><b>{getCompetitionMatchesCount(comp.id)}</b><span>{t('stats_pj_short')}</span></div>
                <div><b className="muted-sm">{isLiga ? t('admin_ida_vuelta') : t('admin_eliminacion')}</b><span>{t('label_tipo_competencia')}</span></div>
              </div>
              <div className="comp-actions">
                <button className="btn btn-sm" onClick={() => sortear(comp)}><Shuffle size={14} /> {t('btn_sortear_competencia')}</button>
                <button className="btn btn-sm" onClick={() => ver(comp)}><Eye size={14} /> {t('btn_ver_competencia')}</button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function CompFormModal({ comp, onDone }) {
  const { closeModal, showToast } = useApp()
  const isEdit = !!comp
  const [name, setName] = useState(comp ? comp.name : '')
  const [type, setType] = useState(comp ? comp.type : 'liga')
  const existingIds = isEdit && comp.teamIds ? comp.teamIds : []
  const [selected, setSelected] = useState(existingIds)

  const toggleTeam = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    if (!name.trim()) { showToast(t('err_campo_requerido'), 'error'); return }
    if (selected.length < 2) { showToast(t('no_equipos_seleccionados'), 'error'); return }
    if (!isEdit && State.data.competitions.length >= 4) { showToast(t('toast_max_competencias'), 'error'); return }
    const teamIds = isEdit ? [...new Set([...comp.teamIds, ...selected])] : selected
    const updated = isEdit
      ? { ...comp, name: name.trim(), type, teamIds }
      : { id: uid('comp'), name: name.trim(), type, teamIds, season: State.data.settings.season || '2026', createdAt: Date.now() }
    await persistCompetition(updated)
    showToast(isEdit ? t('toast_competencia_actualizada') : t('toast_competencia_creada'))
    closeModal()
    onDone()
  }

  return (
    <div className="modal-pad">
      <div className="modal-title-text">{isEdit ? t('btn_editar_competencia') : t('btn_nueva_competencia')}</div>
      <label>{t('label_nombre_competencia')}</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={t('ph_nombre_competencia')} />
      <label>{t('label_tipo_competencia')}</label>
      <select disabled={isEdit} value={type} onChange={e => setType(e.target.value)}>
        <option value="liga">{t('opt_liga')}</option>
        <option value="copa">{t('opt_copa')}</option>
      </select>
      <label>{t('label_equipos_participan')}</label>
      <div className="comp-teams-selector">
        {(State.data.teams || []).map(x => {
          const isSel = selected.includes(x.id)
          const locked = isEdit && existingIds.includes(x.id)
          return (
            <label key={x.id} className={`competition-team-checkbox ${isSel ? 'on' : ''}`}>
              <input type="checkbox" checked={isSel || locked} disabled={locked} onChange={() => toggleTeam(x.id)} />
              <TeamDot team={x} size={22} />
              <span>{x.name}</span>
              {locked ? <b className="lock">✓</b> : null}
            </label>
          )
        })}
      </div>
      {isEdit ? <div className="mini-note">{t('comp_edit_lock_note')}</div> : null}
      <div className="modal-footer-actions">
        <button className="btn" onClick={closeModal}>{t('btn_cancel')}</button>
        <button className="btn btn-gold" onClick={save}><Save size={15} /> {t('btn_guardar_competencia')}</button>
      </div>
    </div>
  )
}

/* ---------------- CONFIG ---------------- */

function AdminConfig({ data, showToast, refresh }) {
  const { openModal } = useApp()
  const settings = data.settings || {}
  const [leagueName, setLeagueName] = useState(settings.leagueName || '')
  const [season, setSeason] = useState(settings.season || '')
  const isLiga = settings.competitionFormat === 'liga'
  const standings = isLiga ? computeStandings() : []

  const save = async () => {
    State.data.settings.leagueName = leagueName.trim() || 'Pro Soccer Online Uruguay'
    State.data.settings.season = season.trim() || '2026'
    await persistSettings()
    showToast(t('toast_config_guardada'))
    renderShell()
    refresh()
  }

  const declarar = () => {
    const teamId = document.getElementById('admin-champ-select') ? document.getElementById('admin-champ-select').value : null
    const team = getTeamById(teamId)
    if (!team) return
    openModal(
      <ConfirmModal
        title={t('confirmar_campeon')}
        body={t('confirmar_campeon_p', { team: team.name, liga: settings.leagueName || '', season: settings.season || '' })}
        confirmLabel={t('btn_confirmar_titulo')}
        tone="gold"
        onConfirm={async () => {
          const title = { competitionName: settings.leagueName || t('copa_default_name'), format: 'liga', year: settings.season || '2026' }
          await persistTeam({ ...team, titles: [...(team.titles || []), title] })
          showToast(t('toast_campeon_sumado', { team: team.name }))
          refresh()
        }}
      />
    )
  }

  const resetAll = () => openModal(
    <ConfirmModal
      title={t('reiniciar_liga_title')}
      body={t('reiniciar_liga_p')}
      confirmLabel={t('btn_si_reiniciar')}
      onConfirm={async () => {
        for (const x of [...State.data.teams]) await deleteTeamDB(x.id)
        for (const m of [...State.data.matches]) await deleteMatchDB(m.id)
        State.data.settings.leagueName = 'Pro Soccer Online Uruguay'
        State.data.settings.season = '2026'
        State.data.competitions = []
        await persistSettings()
        showToast(t('toast_liga_reiniciada'))
        setTimeout(() => window.location.reload(), 600)
      }}
    />
  )

  return (
    <div className="admin-config">
      <div className="card cfg-card">
        <h4>{t('datos_liga')}</h4>
        <label>{t('label_nombre_liga')}</label>
        <input value={leagueName} onChange={e => setLeagueName(e.target.value)} />
        <label>{t('label_temporada')}</label>
        <input value={season} onChange={e => setSeason(e.target.value)} />
        <button className="btn btn-gold" onClick={save}><Save size={15} /> {t('btn_guardar_cambios')}</button>
      </div>

      {isLiga && standings.length ? (
        <div className="card cfg-card">
          <h4><Trophy size={16} /> {t('declarar_campeon')}</h4>
          <p className="muted-sm">{t('declarar_campeon_p')}</p>
          <select id="admin-champ-select" defaultValue={standings[0].id}>
            {standings.map((row, i) => <option key={row.id} value={row.id}>{i === 0 ? '👑 ' : ''}{row.name} ({row.pts} pts)</option>)}
          </select>
          <button className="btn btn-gold btn-block" onClick={declarar}>{t('btn_declarar_campeon')}</button>
        </div>
      ) : null}

      <div className="card cfg-card cfg-danger">
        <h4 className="danger-title">{t('zona_riesgo')}</h4>
        <p className="muted-sm">{t('zona_riesgo_p')}</p>
        <button className="btn btn-danger" onClick={resetAll}><RotateCcw size={15} /> {t('btn_reset_all')}</button>
      </div>
    </div>
  )
}