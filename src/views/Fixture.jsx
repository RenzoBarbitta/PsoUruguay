import React, { useState } from 'react'
import { Crown, Trophy, Medal, Shield, Swords } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, EmptyState } from '../core/ui.jsx'
import { MatchCard, BracketMatchCard, bracketRoundName } from '../components/MatchCard.jsx'

/* Detalle de una competencia: liga → fechas; copa → llaves (SIEMPRE) */
function renderComp(comp) {
  const isLiga = comp.type === 'liga'
  const matches = State.data.matches.filter(m => m.competitionId === comp.id)

  if (!matches.length) {
    return (
      <div className="fixture-comp-block">
        <CompHead comp={comp} sub={null} />
        <EmptyState
          icon={isLiga ? '📅' : '🏆'}
          text={isLiga ? t('competencia_empty') : `${t('copa_sin_llave')} ${t('copa_hint')}`}
        />
      </div>
    )
  }

  if (isLiga) {
    const ligaMatches = matches.filter(m => !m.bracket)
    if (!ligaMatches.length) return renderCopa(comp)
    const rounds = {}
    ligaMatches.forEach(m => {
      const r = m.round || 1
      ;(rounds[r] = rounds[r] || []).push(m)
    })
    const roundKeys = Object.keys(rounds).sort((a, b) => a - b)
    return (
      <div className="fixture-comp-block">
        <CompHead comp={comp} sub={`${roundKeys.length} fechas · ${ligaMatches.length} partidos`} prefix=" (Liga)" />
        <div className="liga-copa-note">{t('liga_nota_copa')}</div>
        {roundKeys.map(r => {
          const ms = rounds[r]
          const allPlayed = ms.every(m => m.played)
          return (
            <div className="fixture-round" key={r} style={{ marginTop: '1rem' }}>
              <div className="fixture-round-title">
                {t('fixture_fecha', { n: r })}
                {allPlayed ? <span className="badge-live">{t('fixture_finalizada')}</span> : null}
              </div>
              <div className="match-grid">{ms.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}</div>
            </div>
          )
        })}
      </div>
    )
  }
  return renderCopa(comp)
}

function CompHead({ comp, sub, prefix = '' }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{comp.name}{prefix}</h2>
      {sub ? <span className="section-sub">{sub}</span> : null}
    </div>
  )
}

/* ---- Llave de copa (bracket) ---- */

const BRACKET_CARD_H = 112
const BRACKET_LEAF = BRACKET_CARD_H * 2

const roundRemaining = (roundNum, totalRounds) => totalRounds - roundNum + 1

/* Color de ronda: la final dorada e ídem descendiendo tonalidad */
function roundColor(roundNum, totalRounds) {
  const remaining = roundRemaining(roundNum, totalRounds)
  if (remaining === 1) return '#f3b83a'
  if (remaining === 2) return '#5b9bd5'
  if (remaining === 3) return '#4ec9c4'
  if (remaining === 4) return '#a78bfa'
  return 'var(--accent-dark)'
}

/* Icono eliminatorio por ronda */
function roundIcon(remaining) {
  if (remaining === 1) return <Crown size={15} />
  if (remaining === 2) return <Medal size={15} />
  if (remaining === 3) return <Trophy size={15} />
  if (remaining === 4) return <Shield size={15} />
  return <Swords size={15} />
}

/* Esqueleto del cuadro completo: cada ronda ocupa su posición estructural
    aunque todavía no tenga partidos (se ven como "Por definir"). */
function copaSkeleton(totalRounds) {
  const levels = []
  let count = Math.pow(2, totalRounds - 1)
  for (let r = 1; r <= totalRounds; r++) {
    const step = Math.pow(2, r - 1)
    const arr = []
    for (let j = 0; j < count; j++) arr.push({ top: j * step, bottom: (j + 1) * step })
    levels.push({ key: r, arr })
    count = Math.ceil(count / 2)
  }
  return levels
}

function roundMatches(rounds, r) {
  return (rounds[r] || []).slice().sort((a, b) => a.bracketSlot - b.bracketSlot)
}

function CopaBracket({ rounds, roundKeys, totalRounds }) {
  if (!totalRounds || !roundKeys.length) return null
  const levels = copaSkeleton(totalRounds)
  const heightPx = Math.pow(2, totalRounds - 1) * BRACKET_LEAF
  return (
    <div className="bracket-scroll">
      <div className="bracket-row">
        {levels.map(({ key: r, arr }, idx) => {
          const isLast = idx === levels.length - 1
          const ms = roundMatches(rounds, r)
          const conns = []
          if (!isLast) {
            for (let j = 0; j < arr.length; j += 2) {
              if (j + 1 >= arr.length) break
              const a = arr[j]
              const b = arr[j + 1]
              const cA = (a.top + a.bottom) / 2
              const cB = (b.top + b.bottom) / 2
              const lo = Math.min(cA, cB)
              conns.push({ key: j, top: lo * BRACKET_LEAF, height: Math.abs(cB - cA) * BRACKET_LEAF })
            }
          }
          return (
            <div key={r} className="bracket-col">
              <div
                className="bracket-round-badge"
                style={{ '--rc': roundColor(Number(r), totalRounds) }}
              >
                {roundIcon(roundRemaining(Number(r), totalRounds))}
                <span>{bracketRoundName(Number(r), totalRounds)}</span>
              </div>
              <div className="bracket-body" style={{ height: heightPx + 'px' }}>
                {arr.map((s, j) => {
                  const center = ((s.top + s.bottom) / 2) * BRACKET_LEAF
                  const m = ms[j]
                  return (
                    <div key={m ? m.id : 'ph-' + r + '-' + j} className="bracket-slot" style={{ top: (center - BRACKET_CARD_H / 2) + 'px', height: BRACKET_CARD_H + 'px' }}>
                      {m
                        ? <BracketMatchCard m={m} index={j} rc={roundColor(Number(r), totalRounds)} />
                        : <BracketMatchCard m={{ id: 'ph-' + r + '-' + j, played: false, isBye: false }} placeholder index={j} rc={roundColor(Number(r), totalRounds)} />}
                    </div>
                  )
                })}
                {conns.map(c => (
                  <div key={'cn' + c.key} className="bracket-conn" style={{ top: c.top + 'px', height: c.height + 'px', '--delay': (idx * 0.14) + 's', '--rc': roundColor(Number(r), totalRounds) }}>
                    <i className="br-v" />
                    <i className="br-h br-h-t" />
                    <i className="br-h br-h-b" />
                    <i className="br-h br-h-m" />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderCopa(comp) {
  let bracketMatches = State.data.matches.filter(m => m.competitionId === comp.id)
  if (!bracketMatches.length) bracketMatches = State.data.matches.filter(m => m.bracket)
  const rounds = {}
  bracketMatches.forEach(m => {
    const r = m.bracketRound || m.round || 1
    ;(rounds[r] = rounds[r] || []).push(m)
  })
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b)
  const totalRounds = bracketMatches[0] ? (bracketMatches[0].totalBracketRounds || roundKeys.length) : roundKeys.length
  const teamsInComp = (comp.teamIds || []).map(id => getTeamById(id)).filter(Boolean)
  const champion = teamsInComp.find(t => (t.titles || []).some(ti => ti.competitionName === comp.name && ti.year === comp.season))

  return (
    <div className="fixture-comp-block">
      <CompHead comp={comp} sub={`${roundKeys.length} rondas · ${bracketMatches.length} partidos`} prefix=" (Copa)" />
      <div className="copa-elim-strip"><Swords size={13} /> {t('copa_eliminacion')}</div>
      {champion ? (
        <div className="draw-result-card champ-hero">
          <TrophyIcon />
          <div className="champ-name">{champion.name}</div>
          <div className="champ-sub">{t('champion_badge')}</div>
        </div>
      ) : null}
      <CopaBracket rounds={rounds} roundKeys={roundKeys} totalRounds={totalRounds} />
    </div>
  )
}

function TrophyIcon() { return <span aria-hidden="true">🏆</span> }

/* Fallback legacy: copa sin competencias múltiples */
function LegacyCopaFixture() {
  const bracketMatches = State.data.matches.filter(m => m.bracket)
  const rounds = {}
  bracketMatches.forEach(m => {
    const r = m.bracketRound || 1
    ;(rounds[r] = rounds[r] || []).push(m)
  })
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b)
  const totalRounds = bracketMatches[0] ? (bracketMatches[0].totalBracketRounds || roundKeys.length) : roundKeys.length
  const champion = State.data.teams.find(t => (t.titles || []).some(ti => ti.competitionName === State.data.settings.competitionName && ti.year === State.data.settings.season))

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{State.data.settings.competitionName || t('copa_default_name')}</h2>
        <span className="section-sub">{t('copa_sub', { a: roundKeys.length, b: totalRounds })}</span>
      </div>
      <div className="copa-elim-strip"><Swords size={13} /> {t('copa_eliminacion')}</div>
      {champion ? (
        <div className="draw-result-card champ-hero">
          <TrophyIcon />
          <div className="champ-name">{champion.name}</div>
          <div className="champ-sub">{t('champion_badge')}</div>
        </div>
      ) : null}
      <CopaBracket rounds={rounds} roundKeys={roundKeys} totalRounds={totalRounds} />
    </>
  )
}

export default function Fixture() {
  const { v } = useApp()
  void v
  const competitions = State.data.competitions || []

  let sel = State.currentStatsCompetition || 'todas'
  if (sel !== 'todas' && !competitions.find(c => c.id === sel)) {
    sel = 'todas'
    State.currentStatsCompetition = 'todas'
  }
  const [selState, setSelState] = useState(sel)

  const body = (() => {
    if (selState !== 'todas') {
      const comp = competitions.find(c => c.id === selState)
      return comp ? renderComp(comp) : null
    }
    if (competitions.length) return competitions.map(renderComp)
    const brackets = State.data.matches.filter(m => m.bracket)
    const ligas = State.data.matches.filter(m => !m.bracket)
    if (State.data.settings.competitionFormat === 'copa' || brackets.length) {
      return <LegacyCopaFixture />
    }
    const rounds = {}
    ligas.forEach(m => {
      const r = m.round || 1
      ;(rounds[r] = rounds[r] || []).push(m)
    })
    const roundKeys = Object.keys(rounds).sort((a, b) => a - b)
    return ligas.length
      ? (
          <div className="fixture-comp-block">
            <div className="liga-copa-note">{t('liga_nota_copa')}</div>
            {roundKeys.map(r => {
              const ms = rounds[r]
              const allPlayed = ms.every(m => m.played)
              return (
                <div className="fixture-round" key={r} style={{ marginTop: '1rem' }}>
                  <div className="fixture-round-title">
                    {t('fixture_fecha', { n: r })}
                    {allPlayed ? <span className="badge-live">{t('fixture_finalizada')}</span> : null}
                  </div>
                  <div className="match-grid">{ms.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}</div>
                </div>
              )
            })}
          </div>
        )
      : <EmptyState icon="🗓" text={t('fixture_empty')} />
  })()

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('fixture_title')}</h2>
      </div>
      {competitions.length ? (
        <div className="comp-select">
          <label htmlFor="fixture-comp-select">{t('fixture_elegir_comp')}</label>
          <select
            id="fixture-comp-select"
            className="fixture-comp-select"
            value={selState}
            onChange={e => {
              const val = e.target.value
              State.currentStatsCompetition = val
              setSelState(val)
            }}
          >
            <option value="todas">{t('filtro_todas_comp')}</option>
            {competitions.map(c => (
              <option key={c.id} value={c.id}>{c.name} · {c.type === 'copa' ? t('stats_copa') : t('stats_liga')}</option>
            ))}
          </select>
        </div>
      ) : null}
      {body}
    </>
  )
}