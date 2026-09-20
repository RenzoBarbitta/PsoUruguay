/* ======================================================================
   PSO URUGUAY - VISTAS PÚBLICAS
   Inicio · Fixture · Tabla de posiciones · Estadísticas · Palmarés
   ====================================================================== */

/* ---------------- VIEW: INICIO ---------------- */

function statCard(icon, value, label) {
  return `<div class="card" style="padding: 1rem; text-align: center;">
    <i class="ti ${icon}" style="font-size: 1.4rem; color: var(--accent-dark);"></i>
    <div style="font-family: var(--font-display); font-weight: 700; font-size: 1.6rem; margin-top: 0.3rem;">${value}</div>
    <div style="font-size: 0.75rem; color: var(--text-muted);">${label}</div>
  </div>`;
}

function miniStandingRow(t, i) {
  return `<div style="display:flex; align-items:center; gap:0.6rem; padding: 0.55rem 0.6rem; ${i < 2 ? 'border-bottom:0.5px solid var(--border);' : ''}">
    <span style="font-family: var(--font-display); font-weight:700; color: var(--text-muted); width:18px;">${i + 1}</span>
    ${teamDotHtml(getTeamById(t.id))}
    <span style="flex:1; font-weight:600; font-size:0.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span>
    <span style="font-family: var(--font-display); font-weight:700; color: var(--accent-dark);">${t.pts} pts</span>
  </div>`;
}

function rankItem(s, i, key, emoji) {
  return `<div class="rank-item">
    <div class="rank-pos">${i + 1}</div>
    <div class="rank-avatar">${s.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
    <div class="rank-info">
      <div class="rank-name">${escapeHtml(s.name)}</div>
      <div class="rank-team">${escapeHtml(s.teamName)}</div>
    </div>
    <div class="rank-value">${s[key]}</div>
  </div>`;
}

function viewInicio() {
  const standings = computeStandings();
  const top3 = standings.slice(0, 3);
  const scorers = computeTopScorers().slice(0, 3);
  const upcoming = State.data.matches.filter(m => !m.played).slice(0, 3);
  const totalGoals = State.data.matches.filter(m => m.played).reduce((s, m) => s + (Number(m.homeScore) || 0) + (Number(m.awayScore) || 0), 0);
  const playedCount = State.data.matches.filter(m => m.played).length;

  return `
    <div class="view active">
      <div style="background: var(--bg-header); border-radius: 16px; padding: 1.75rem 1.5rem; margin-bottom: 1.5rem; color: #fff; position: relative; overflow: hidden;">
        <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <img src="${window.PSO_LOGO_URL}" style="width: 64px; height: 64px; border-radius: 50%; box-shadow: 0 0 0 3px rgba(240,197,66,0.4);" alt="">
          <div>
            <div style="font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; letter-spacing: 0.01em;">${State.data.settings.leagueName}</div>
            <div style="color: var(--uy-sky-light); font-size: 0.85rem; font-weight: 500;">${tr('home_season_line', { season: State.data.settings.season, teams: State.data.teams.length, played: playedCount })}</div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 0.75rem; margin-bottom: 1.75rem;">
        ${statCard('ti-shield', State.data.teams.length, tr('stat_equipos'))}
        ${statCard('ti-ball-football', totalGoals, tr('stat_goles_totales'))}
      </div>

      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 1.25rem;" class="inicio-grid">
        <div>
          <div class="section-head"><h2 class="section-title">${tr('home_proximos')}</h2></div>
          ${upcoming.length ? `<div class="match-grid">${upcoming.map(matchCard).join('')}</div>` : emptyState('ti-calendar-off', tr('home_no_matches'))}
        </div>
        <div>
          <div class="section-head"><h2 class="section-title">${tr('home_top')}</h2></div>
          ${top3.length ? `<div class="card" style="padding: 0.5rem;">${top3.map((t, i) => miniStandingRow(t, i)).join('')}</div>` : emptyState('ti-table-off', tr('home_no_results'))}

          <div class="section-head" style="margin-top: 1.5rem;"><h2 class="section-title">${tr('home_goleadores')}</h2></div>
          ${scorers.length ? `<div class="rank-list">${scorers.map((s, i) => rankItem(s, i, 'goals', '⚽')).join('')}</div>` : emptyState('ti-ball-off', tr('home_no_goals'))}
        </div>
      </div>
    </div>
    <style>@media (max-width: 800px) { .inicio-grid { grid-template-columns: 1fr !important; } }</style>
  `;
}

/* ---------------- VIEW: FIXTURE ---------------- */

function matchCard(m) {
  const home = getTeamById(m.homeId);
  const away = getTeamById(m.awayId);
  if (!home || !away) return '';
  return `<div class="match-card">
    <div class="match-teams">
      <div class="match-team">
        ${teamDotHtml(home)}
        <span class="match-team-name">${escapeHtml(home.name)}</span>
      </div>
      <div class="match-score ${m.played ? '' : 'pending'}">${m.played ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
      <div class="match-team right">
        ${teamDotHtml(away)}
        <span class="match-team-name">${escapeHtml(away.name)}</span>
      </div>
    </div>
    <div class="match-meta">${m.played ? tr('match_finalizado') : tr('match_por_jugar')}${m.date ? ' · ' + m.date : ''}</div>
  </div>`;
}

function viewFixture() {
  const competitions = State.data.competitions || [];
  const hasCompetitions = competitions.length > 0;

  // Si hay competencia seleccionada, mostrar solo esa
  if (hasCompetitions && State.currentStatsCompetition) {
    const comp = competitions.find(c => c.id === State.currentStatsCompetition);
    if (comp) return renderFixtureByCompetition(comp);
  }

  if (!State.data.matches.length) {
    return `<div class="view active">
      <div class="section-head"><h2 class="section-title">${tr('fixture_title')}</h2></div>
      ${emptyState('ti-calendar-off', tr('fixture_empty'))}
    </div>`;
  }

  // Selector de competencia si hay varias
  const compSelector = hasCompetitions && competitions.length > 1 ? `
    <div style="margin-bottom:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
      <button class="btn btn-sm ${!State.currentStatsCompetition ? 'btn-primary' : ''}" data-comp-filter="todas">${tr('filtro_todas_comp')}</button>
      ${competitions.map(c => `
        <button class="btn btn-sm ${State.currentStatsCompetition === c.id ? 'btn-primary' : ''}" data-comp-filter="${c.id}">${escapeHtml(c.name)}</button>
      `).join('')}
    </div>
  ` : '';

  const rounds = {};
  State.data.matches.forEach(m => {
    const r = m.round || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b);

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${hasCompetitions ? tr('competencia_lista') : tr('fixture_title')}</h2>
      <span class="section-sub">${roundKeys.length} fechas · ${State.data.matches.length} partidos</span>
    </div>
    ${compSelector}
    ${roundKeys.map(r => {
      const matches = rounds[r];
      const allPlayed = matches.every(m => m.played);
      return `<div class="fixture-round" style="margin-top:1rem;">
        <div class="fixture-round-title">${tr('fixture_fecha', { n: r })} ${allPlayed ? '<span class="badge-live">' + tr('fixture_finalizada') + '</span>' : ''}</div>
        <div class="match-grid">${matches.map(matchCard).join('')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderFixtureByCompetition(comp) {
  const isLiga = comp.type === 'liga';
  const matches = State.data.matches.filter(m => m.competitionId === comp.id);

  if (!matches.length) {
    return `<div class="view active">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)}</h2>
      </div>
      ${emptyState('ti-calendar-off', tr('competencia_empty'))}
    </div>`;
  }

  if (isLiga) {
    const rounds = {};
    matches.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });
    const roundKeys = Object.keys(rounds).sort((a, b) => a - b);

    return `<div class="view active">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)} (Liga)</h2>
        <span class="section-sub">${roundKeys.length} fechas · ${matches.length} partidos</span>
      </div>
      ${roundKeys.map(r => {
        const matches = rounds[r];
        const allPlayed = matches.every(m => m.played);
        return `<div class="fixture-round" style="margin-top:1rem;">
          <div class="fixture-round-title">${tr('fixture_fecha', { n: r })} ${allPlayed ? '<span class="badge-live">' + tr('fixture_finalizada') + '</span>' : ''}</div>
          <div class="match-grid">${matches.map(matchCard).join('')}</div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    // Copa
    return renderFixtureCopaByCompetition(comp);
  }
}

function renderFixtureCopaByCompetition(comp) {
  const bracketMatches = State.data.matches.filter(m => m.bracket && m.competitionId === comp.id);
  const rounds = {};
  bracketMatches.forEach(m => {
    const r = m.bracketRound || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b);
  const totalRounds = bracketMatches[0] ? (bracketMatches[0].totalBracketRounds || roundKeys.length) : roundKeys.length;

  const teamsInComp = (comp.teamIds || []).map(id => getTeamById(id)).filter(Boolean);
  const champion = teamsInComp.find(t => (t.titles || []).some(ti => ti.competitionName === comp.name && ti.year === comp.season));

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${escapeHtml(comp.name)} (Copa)</h2>
      <span class="section-sub">${roundKeys.length} rondas · ${bracketMatches.length} partidos</span>
    </div>

    ${champion ? `
      <div class="draw-result-card" style="background: linear-gradient(135deg, #7a5c0e, var(--uy-navy)); text-align:center; margin-bottom:1.5rem;">
        <i class="ti ti-trophy" style="font-size:2.2rem; color:var(--gold);"></i>
        <div style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin-top:0.5rem;">${escapeHtml(champion.name)}</div>
        <div style="color:var(--uy-sky-light); font-size:0.82rem; margin-top:0.2rem;">${tr('champion_badge')}</div>
      </div>
    ` : ''}

    <div style="overflow-x:auto; padding-bottom:0.5rem;">
      <div style="display:flex; gap:1.5rem; min-width:min-content;">
        ${roundKeys.map(r => {
          const matches = rounds[r].sort((a, b) => a.bracketSlot - b.bracketSlot);
          return `<div style="min-width:230px;">
            <div class="fixture-round-title" style="justify-content:center; text-align:center;">${bracketRoundName(Number(r), totalRounds)}</div>
            <div style="display:flex; flex-direction:column; gap:1rem; justify-content:space-around; height:100%;">
              ${matches.map(bracketMatchCard).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function bracketRoundName(roundNum, totalRounds) {
  const remaining = totalRounds - roundNum + 1;
  if (remaining === 1) return tr('bracket_final');
  if (remaining === 2) return tr('bracket_semifinal');
  if (remaining === 3) return tr('bracket_cuartos');
  if (remaining === 4) return tr('bracket_octavos');
  return tr('bracket_ronda', { n: roundNum });
}

function bracketMatchCard(m) {
  const home = m.homeId ? getTeamById(m.homeId) : null;
  const away = m.awayId ? getTeamById(m.awayId) : null;
  const isBye = m.isBye || false;

  return `<div class="bracket-match" style="display:flex; flex-direction:column; align-items:center; gap:0.4rem; padding:0.6rem 0.4rem; background:var(--bg-surface); border-radius:8px; border:0.5px solid var(--border);">
    <div style="display:flex; align-items:center; justify-content:center; gap:0.4rem; width:100%;">
      ${home ? `<span style="font-size:0.8rem; padding:0.2rem 0.5rem; background:var(--bg-surface-2); border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${escapeHtml(home.name)}</span>` : `<span style="font-size:0.72rem; color:var(--text-muted);">—</span>`}
      <span class="draw-vs" style="font-size:0.7rem; color:var(--text-muted);">vs</span>
      ${away ? `<span style="font-size:0.8rem; padding:0.2rem 0.5rem; background:var(--bg-surface-2); border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${escapeHtml(away.name)}</span>` : `<span style="font-size:0.72rem; color:var(--text-muted);">—</span>`}
    </div>
    <div style="display:flex; align-items:center; gap:0.8rem; font-family:var(--font-display); font-weight:700;">
      <span style="font-size:0.9rem; min-width:20px; text-align:center;">${m.played ? (m.homeScore || 0) : ''}</span>
      <span style="color:var(--text-muted); font-size:0.75rem;">-</span>
      <span style="font-size:0.9rem; min-width:20px; text-align:center;">${m.played ? (m.awayScore || 0) : ''}</span>
    </div>
    <div style="font-size:0.7rem; color:var(--text-muted);">
      ${isBye ? tr('bye_libre') : (m.played ? tr('match_finalizado') : tr('match_por_jugar'))}
    </div>
  </div>`;
}

function viewFixtureCopa() {
  const bracketMatches = State.data.matches.filter(m => m.bracket);
  const rounds = {};
  bracketMatches.forEach(m => {
    const r = m.bracketRound || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b);
  const totalRounds = bracketMatches[0] ? (bracketMatches[0].totalBracketRounds || roundKeys.length) : roundKeys.length;

  const champion = State.data.teams.find(t => (t.titles || []).some(ti => ti.competitionName === State.data.settings.competitionName && ti.year === State.data.settings.season));

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${escapeHtml(State.data.settings.competitionName || tr('copa_default_name'))}</h2>
      <span class="section-sub">${tr('copa_sub', { a: roundKeys.length, b: totalRounds })}</span>
    </div>

    ${champion ? `
      <div class="draw-result-card" style="background: linear-gradient(135deg, #7a5c0e, var(--uy-navy)); text-align:center; margin-bottom:1.5rem;">
        <i class="ti ti-trophy" style="font-size:2.2rem; color:var(--gold);"></i>
        <div style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin-top:0.5rem;">${escapeHtml(champion.name)}</div>
        <div style="color:var(--uy-sky-light); font-size:0.82rem; margin-top:0.2rem;">${tr('champion_badge')}</div>
      </div>
    ` : ''}

    <div style="overflow-x:auto; padding-bottom:0.5rem;">
      <div style="display:flex; gap:1.5rem; min-width:min-content;">
        ${roundKeys.map(r => {
          const matches = rounds[r].sort((a, b) => a.bracketSlot - b.bracketSlot);
          return `<div style="min-width:230px;">
            <div class="fixture-round-title" style="justify-content:center; text-align:center;">${bracketRoundName(Number(r), totalRounds)}</div>
            <div style="display:flex; flex-direction:column; gap:1rem; justify-content:space-around; height:100%;">
              ${matches.map(m => bracketMatchCard(m)).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function bracketMatchCard(m) {
  const home = m.homeId ? getTeamById(m.homeId) : null;
  const away = m.awayId ? getTeamById(m.awayId) : null;
  const homeWon = m.played && home && away && Number(m.homeScore) > Number(m.awayScore);
  const awayWon = m.played && home && away && Number(m.awayScore) > Number(m.homeScore);

  return `<div class="match-card" style="padding:0.6rem 0.75rem;">
    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.3rem 0; ${homeWon ? 'font-weight:700;' : 'opacity:0.75;'}">
      <span style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${home ? teamDotHtml(home) : ''}${home ? escapeHtml(home.name) : (m.isBye ? '—' : tr('por_definir'))}</span>
      <span style="font-family:var(--font-display); font-weight:700; font-size:0.9rem;">${m.played ? m.homeScore : ''}</span>
    </div>
    <div style="height:0.5px; background:var(--border);"></div>
    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.3rem 0; ${awayWon ? 'font-weight:700;' : 'opacity:0.75;'}">
      <span style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${away ? teamDotHtml(away) : ''}${away ? escapeHtml(away.name) : (m.isBye ? '—' : tr('por_definir'))}</span>
      <span style="font-family:var(--font-display); font-weight:700; font-size:0.9rem;">${m.played ? m.awayScore : ''}</span>
    </div>
    ${m.isBye ? `<div class="match-meta">${tr('pase_libre')}</div>` : `<div class="match-meta">${m.played ? tr('match_finalizado') : tr('match_por_jugar')}</div>`}
  </div>`;
}

function attachFixtureEvents() {}

/* ---------------- VIEW: TABLA DE POSICIONES ---------------- */

function viewTabla() {
  const competitions = State.data.competitions || [];
  const hasCompetitions = competitions.length > 0;

  // Si hay competencia seleccionada, mostrar solo esa
  if (hasCompetitions && State.currentStatsCompetition) {
    const comp = competitions.find(c => c.id === State.currentStatsCompetition);
    if (comp) return renderTablaByCompetition(comp);
  }

  // Si hay competencias, mostrar selector
  if (hasCompetitions) {
    const compSelector = competitions.length > 1 ? `
      <div style="margin-bottom:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-sm btn-primary" data-comp-filter="todas">${tr('filtro_todas_comp')}</button>
        ${competitions.map(c => `
          <button class="btn btn-sm ${State.currentStatsCompetition === c.id ? 'btn-primary' : ''}" data-comp-filter="${c.id}">${escapeHtml(c.name)}</button>
        `).join('')}
      </div>
    ` : '';

    const standings = computeStandings();
    if (!standings.length) {
      return `<div class="view active">
        <div class="section-head"><h2 class="section-title">${tr('tabla_title')}</h2></div>
        ${compSelector}
        ${emptyState('ti-table-off', tr('tabla_empty'))}
      </div>`;
    }

    const n = standings.length;
    return `<div class="view active">
      <div class="section-head">
        <h2 class="section-title">${tr('tabla_title')}</h2>
        <span class="section-sub">${tr('tabla_sub')}</span>
      </div>
      ${compSelector}
      <div class="card table-wrap">
        <table class="pso-table">
          <thead><tr>
            <th>#</th><th>${tr('th_equipo')}</th><th>${tr('th_pj')}</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
          </tr></thead>
          <tbody>
            ${standings.map((t, i) => {
              let zoneClass = '';
              if (n >= 3) {
                if (i === 0) zoneClass = 'zone-top';
                else if (i === n - 1) zoneClass = 'zone-bottom';
              }
              return `<tr class="${zoneClass}">
                <td>${i + 1}</td>
                <td><div class="team-cell">${teamDotHtml(getTeamById(t.id))}${escapeHtml(t.name)}</div></td>
                <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
                <td>${t.gf}</td><td>${t.gc}</td><td>${t.dg > 0 ? '+' : ''}${t.dg}</td>
                <td class="pts">${t.pts}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="legend-row">
        <div class="legend-item"><span class="legend-dot" style="background:var(--win)"></span>${tr('legend_lider')}</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--loss)"></span>${tr('legend_ultimo')}</div>
      </div>
    </div>`;
  }

  // Compatibilidad con modo legacy (sin competencias múltiples)
  if (State.data.settings.competitionFormat === 'copa') {
    return `<div class="view active">
      <div class="section-head"><h2 class="section-title">${tr('tabla_title')}</h2></div>
      ${emptyState('ti-trophy', tr('tabla_copa_msg'))}
    </div>`;
  }

  const standings = computeStandings();
  if (!standings.length) {
    return `<div class="view active">
      <div class="section-head"><h2 class="section-title">${tr('tabla_title')}</h2></div>
      ${emptyState('ti-table-off', tr('tabla_empty'))}
    </div>`;
  }

  const n = standings.length;
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('tabla_title')}</h2>
      <span class="section-sub">${tr('tabla_sub')}</span>
    </div>
    <div class="card table-wrap">
      <table class="pso-table">
        <thead><tr>
          <th>#</th><th>${tr('th_equipo')}</th><th>${tr('th_pj')}</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
        </tr></thead>
        <tbody>
          ${standings.map((t, i) => {
            let zoneClass = '';
            if (n >= 3) {
              if (i === 0) zoneClass = 'zone-top';
              else if (i === n - 1) zoneClass = 'zone-bottom';
            }
            return `<tr class="${zoneClass}">
              <td>${i + 1}</td>
              <td><div class="team-cell">${teamDotHtml(getTeamById(t.id))}${escapeHtml(t.name)}</div></td>
              <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
              <td>${t.gf}</td><td>${t.gc}</td><td>${t.dg > 0 ? '+' : ''}${t.dg}</td>
              <td class="pts">${t.pts}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="legend-row">
      <div class="legend-item"><span class="legend-dot" style="background:var(--win)"></span>${tr('legend_lider')}</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--loss)"></span>${tr('legend_ultimo')}</div>
    </div>
  </div>`;
}

/* ---------------- VIEW: ESTADISTICAS ---------------- */

function viewEstadisticas() {
  const sub = State.currentStatsTab || 'general';
  const filtro = State.currentStatsCompetition || 'todas';
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('stats_title')}</h2>
    </div>

    <div class="card" style="padding:0.6rem 0.75rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
      <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;"><i class="ti ti-filter"></i> ${tr('stats_mostrando')}</span>
      <div style="display:flex; gap:0.4rem;">
        <button class="btn btn-sm competition-filter-btn ${filtro === 'todas' ? 'btn-primary' : ''}" data-comp-filter="todas">${tr('stats_todas')}</button>
        <button class="btn btn-sm competition-filter-btn ${filtro === 'liga' ? 'btn-primary' : ''}" data-comp-filter="liga"><i class="ti ti-table"></i> ${tr('stats_liga')}</button>
        <button class="btn btn-sm competition-filter-btn ${filtro === 'copa' ? 'btn-primary' : ''}" data-comp-filter="copa"><i class="ti ti-trophy"></i> ${tr('stats_copa')}</button>
      </div>
    </div>

    <div class="admin-subtabs">
      <button class="subtab-btn stats-subtab-btn ${sub === 'general' ? 'active' : ''}" data-stats-tab="general"><i class="ti ti-chart-bar"></i> ${tr('stats_general')}</button>
      <button class="subtab-btn stats-subtab-btn ${sub === 'goleadores' ? 'active' : ''}" data-stats-tab="goleadores"><i class="ti ti-ball-football"></i> ${tr('stats_goleadores')}</button>
      <button class="subtab-btn stats-subtab-btn ${sub === 'asistencias' ? 'active' : ''}" data-stats-tab="asistencias"><i class="ti ti-arrows-split"></i> ${tr('stats_asistencias')}</button>
      <button class="subtab-btn stats-subtab-btn ${sub === 'atajadas' ? 'active' : ''}" data-stats-tab="atajadas"><i class="ti ti-hand-stop"></i> ${tr('stats_atajadas')}</button>
    </div>
    <div id="stats-subtab-content">${renderStatsSubtab(sub, filtro)}</div>
  </div>`;
}

function renderStatsSubtab(sub, filtro) {
  filtro = filtro || State.currentStatsCompetition || 'todas';
  if (sub === 'goleadores') {
    const scorers = computeTopScorers(filtro);
    return scorers.length
      ? `<div class="rank-list">${scorers.map((s, i) => rankItem(s, i, 'goals', '⚽')).join('')}</div>`
      : emptyState('ti-ball-off', tr('stats_empty_goles'));
  }
  if (sub === 'asistencias') {
    const assists = computeTopAssists(filtro);
    return assists.length
      ? `<div class="rank-list">${assists.map((s, i) => rankItem(s, i, 'assists', '🎯')).join('')}</div>`
      : emptyState('ti-arrows-split', tr('stats_empty_asist'));
  }
  if (sub === 'atajadas') {
    const saves = computeTopSaves(filtro);
    return saves.length
      ? `<div class="rank-list">${saves.map((s, i) => rankItem(s, i, 'saves', '🧤')).join('')}</div>`
      : emptyState('ti-hand-stop', tr('stats_empty_atajadas'));
  }
  // general
  const players = computeAllPlayerStats(filtro);
  if (!players.length) return emptyState('ti-chart-bar-off', tr('stats_empty_general'));
  return `
    <div class="card table-wrap">
      <table class="pso-table">
        <thead><tr>
          <th>${tr('th_jugador')}</th><th>${tr('th_equipo')}</th><th>${tr('th_pj')}</th><th>${tr('th_goles')}</th><th>${tr('th_asist')}</th><th>${tr('th_atajadas')}</th><th>${tr('th_ta')}</th><th>${tr('th_tr')}</th>
        </tr></thead>
        <tbody>
          ${players.map(p => `<tr>
            <td style="text-align:left; font-weight:600;">${escapeHtml(p.name)}</td>
            <td style="text-align:left; color:var(--text-muted);">${escapeHtml(p.teamName)}</td>
            <td>${p.pj}</td>
            <td style="font-weight:700; color:var(--accent-dark);">${p.goals}</td>
            <td>${p.assists}</td>
            <td style="font-weight:700; color:var(--accent-dark);">${p.saves}</td>
            <td>${p.yellow ? `<span style="display:inline-block;width:14px;height:18px;background:${'#e3b93a'};border-radius:2px;"></span> ${p.yellow}` : '0'}</td>
            <td>${p.red ? `<span style="display:inline-block;width:14px;height:18px;background:${'#d3455b'};border-radius:2px;"></span> ${p.red}` : '0'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function attachEstadisticasEvents() {
  document.querySelectorAll('.stats-subtab-btn').forEach(btn => {
    btn.onclick = () => {
      State.currentStatsTab = btn.dataset.statsTab;
      document.querySelectorAll('.stats-subtab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('stats-subtab-content').innerHTML = renderStatsSubtab(State.currentStatsTab, State.currentStatsCompetition);
    };
  });
  document.querySelectorAll('.competition-filter-btn').forEach(btn => {
    btn.onclick = () => {
      State.currentStatsCompetition = btn.dataset.compFilter;
      document.querySelectorAll('.competition-filter-btn').forEach(b => b.classList.toggle('btn-primary', b === btn));
      document.getElementById('stats-subtab-content').innerHTML = renderStatsSubtab(State.currentStatsTab, State.currentStatsCompetition);
    };
  });
}

/* ---------------- VIEW: PALMARES ---------------- */

function viewPalmares() {
  const ranking = computePalmares();
  if (!ranking.length) {
    return `<div class="view active">
      <div class="section-head"><h2 class="section-title">${tr('palmares_title')}</h2></div>
      ${emptyState('ti-trophy-off', tr('palmares_empty'))}
    </div>`;
  }
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('palmares_title')}</h2>
      <span class="section-sub">${tr('palmares_sub')}</span>
    </div>
    <div class="rank-list">
      ${ranking.map((t, i) => `
        <div class="rank-item" style="${i === 0 ? 'border-color: rgba(240,197,66,0.5); background: linear-gradient(135deg, rgba(240,197,66,0.08), transparent);' : ''}">
          <div class="rank-pos">${i + 1}</div>
          ${teamDotHtml({ logo: t.logo, name: t.name }, '')}
          <div class="rank-info">
            <div class="rank-name">${escapeHtml(t.name)}</div>
            <div class="rank-team">${t.titles.map(ti => escapeHtml(ti.competitionName + (ti.year ? ' ' + ti.year : ''))).join(' · ')}</div>
          </div>
          <div style="display:flex; align-items:center; gap:0.3rem;">
            <i class="ti ti-trophy" style="color:var(--gold); font-size:1.1rem;"></i>
            <div class="rank-value">${t.titles.length}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}