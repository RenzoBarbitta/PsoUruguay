import React, { useState } from 'react'
import { useApp } from '../core/app.jsx'
import { t, TeamDot, EmptyState } from '../core/ui.jsx'

function renderTablaByCompetition(comp) {
  const standings = computeStandings(comp.id)
  if (!standings.length) return <EmptyState icon="📋" text={t('tabla_empty')} />
  return <StandingsTable standings={standings} />
}

function renderTablaGeneral() {
  const standings = computeStandings()
  if (!standings.length) return <EmptyState icon="📋" text={t('tabla_empty')} />
  return <StandingsTable standings={standings} />
}

function StandingsTable({ standings }) {
  const n = standings.length
  return (
    <>
      <div className="card table-wrap">
        <table className="pso-table">
          <thead>
            <tr>
              <th>#</th><th>{t('th_equipo')}</th><th>{t('th_pj')}</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              let zoneClass = ''
              if (n >= 3) {
                if (i === 0) zoneClass = 'zone-top'
                else if (i === n - 1) zoneClass = 'zone-bottom'
              }
              return (
                <tr key={row.id} className={zoneClass}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="team-cell">
                      <TeamDot team={getTeamById(row.id)} />
                      {row.name}
                    </div>
                  </td>
                  <td>{row.pj}</td><td>{row.pg}</td><td>{row.pe}</td><td>{row.pp}</td>
                  <td>{row.gf}</td><td>{row.gc}</td><td>{row.dg > 0 ? '+' : ''}{row.dg}</td>
                  <td className="pts">{row.pts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="legend-row">
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--win)' }} />{t('legend_lider')}</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--loss)' }} />{t('legend_ultimo')}</div>
      </div>
    </>
  )
}

export default function Tabla() {
  const { v } = useApp()
  void v
  const [selState, setSelState] = useState(() => State.currentStatsCompetition || 'todas')
  const competitions = (State.data.competitions || []).filter(c => c.type === 'liga')
  const header = <div className="section-head"><h2 className="section-title">{t('tabla_title')}</h2></div>

  if (!competitions.length) {
    const compsCount = (State.data.competitions || []).length
    const legacyLiga = !compsCount && State.data.matches.length > 0 && State.data.settings.competitionFormat !== 'copa'
    return (
      <>
        {header}
        {legacyLiga ? renderTablaGeneral() : <EmptyState icon="🏆" text={t('tabla_solo_ligas')} />}
      </>
    )
  }

  if (competitions.length === 1) {
    return <>{header}{renderTablaByCompetition(competitions[0])}</>
  }

  let sel = selState
  if (sel !== 'todas' && !competitions.find(c => c.id === sel)) {
    sel = 'todas'
    setSelState('todas')
  }
  const effective = sel !== 'todas' ? competitions.find(c => c.id === sel) : null

  return (
    <>
      {header}
      <div className="comp-select">
        <label htmlFor="tabla-comp-select">{t('fixture_elegir_comp')}</label>
        <select
          id="tabla-comp-select"
          className="fixture-comp-select"
          value={sel}
          onChange={e => {
            const val = e.target.value
            State.currentStatsCompetition = val
            setSelState(val)
          }}
        >
          <option value="todas">{t('filtro_todas_comp')}</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {effective ? renderTablaByCompetition(effective) : competitions.map(renderTablaByCompetition)}
    </>
  )
}