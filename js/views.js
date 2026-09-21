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
  const showTop = typeof hasActiveLigas === 'function' ? hasActiveLigas() : true;
  const standings = showTop ? computeStandings() : [];
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
          ${showTop ? `
          <div class="section-head"><h2 class="section-title">${tr('home_top')}</h2></div>
          ${top3.length ? `<div class="card" style="padding: 0.5rem;">${top3.map((t, i) => miniStandingRow(t, i)).join('')}</div>` : emptyState('ti-table-off', tr('home_no_results'))}
          ` : ''}

          <div class="section-head" style="margin-top: 1.5rem;"><h2 class="section-title">${tr('home_goleadores')}</h2></div>
          ${scorers.length ? `<div class="rank-list">${scorers.map((s, i) => rankItem(s, i, 'goals', '⚽')).join('')}</div>` : emptyState('ti-ball-off', tr('home_no_goals'))}
        </div>
      </div>
    </div>
    <style>@media (max-width: 800px) { .inicio-grid { grid-template-columns: 1fr !important; } }</style>
  `;
}

/* ---------------- VIEW: FIXTURE ---------------- */

/* Fecha/hora programada de un partido: texto "12/10 · 21:30" o "" si no hay.
   El admin la carga en Gestionar resultados; si pasa el día no pasa nada:
   es solo informativa y se muestra en el fixture debajo del resultado. */
function matchScheduledLabel(m) {
  const d = (m.scheduledDate || '').trim();
  const h = (m.scheduledTime || '').trim();
  if (!d && !h) return '';
  let datePart = d;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (iso) datePart = `${iso[3]}/${iso[2]}/${iso[1].slice(2)}`;
  return '📅 ' + [datePart, h].filter(Boolean).join(' · ');
}

function matchCard(m) {
  const home = getTeamById(m.homeId);
  const away = getTeamById(m.awayId);
  if (!home || !away) return '';
  const sched = matchScheduledLabel(m);
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
    ${sched ? `<div class="match-sched">${sched}</div>` : ''}
  </div>`;
}

function viewFixture() {
  const competitions = State.data.competitions || [];

  // Validar selección actual
  let sel = State.currentStatsCompetition || 'todas';
  if (sel !== 'todas' && !competitions.find(c => c.id === sel)) {
    sel = 'todas';
    State.currentStatsCompetition = 'todas';
  }

  // Combo desplegable para elegir competencia
  const compSelector = `
    <div style="margin-bottom:1.4rem; max-width:360px;">
      <label for="fixture-comp-select" style="display:block; font-size:0.78rem; color:var(--text-muted); font-weight:600; margin-bottom:0.35rem;">${tr('fixture_elegir_comp')}</label>
      <select id="fixture-comp-select" class="fixture-comp-select">
        <option value="todas" ${sel === 'todas' ? 'selected' : ''}>${tr('filtro_todas_comp')}</option>
        ${competitions.map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${escapeHtml(c.name)} · ${c.type === 'copa' ? tr('stats_copa') : tr('stats_liga')}</option>`).join('')}
      </select>
    </div>
  `;

  let body = '';
  if (sel !== 'todas') {
    body = renderFixtureByCompetition(competitions.find(c => c.id === sel));
  } else if (competitions.length) {
    // Cada competencia con su formato propio: liga = fechas, copa = llaves
    body = competitions.map(renderFixtureByCompetition).join('');
  } else if (State.data.settings.competitionFormat === 'copa') {
    // Legacy: copa sin competencias múltiples → llaves
    body = viewFixtureCopa();
  } else {
    // Legacy: liga sin competencias múltiples → fechas
    const rounds = {};
    State.data.matches.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });
    const roundKeys = Object.keys(rounds).sort((a, b) => a - b);
    body = State.data.matches.length ? roundKeys.map(r => {
      const matches = rounds[r];
      const allPlayed = matches.every(m => m.played);
      return `<div class="fixture-round" style="margin-top:1rem;">
        <div class="fixture-round-title">${tr('fixture_fecha', { n: r })} ${allPlayed ? '<span class="badge-live">' + tr('fixture_finalizada') + '</span>' : ''}</div>
        <div class="match-grid">${matches.map(matchCard).join('')}</div>
      </div>`;
    }).join('') : emptyState('ti-calendar-off', tr('fixture_empty'));
  }

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('fixture_title')}</h2>
    </div>
    ${competitions.length ? compSelector : ''}
    ${body}
  </div>`;
}

function renderFixtureByCompetition(comp) {
  const isLiga = comp.type === 'liga';
  const matches = State.data.matches.filter(m => m.competitionId === comp.id);

  if (!matches.length) {
    return `<div class="fixture-comp-block">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)}</h2>
      </div>
      ${emptyState('ti-calendar-off', tr('competencia_empty'))}
    </div>`;
  }

  if (isLiga) {
    // Liga nunca mezcla partidos de copa (llaves)
    const ligaMatches = matches.filter(m => !m.bracket);
    if (!ligaMatches.length) {
      return renderFixtureCopaByCompetition(comp);
    }
    const rounds = {};
    ligaMatches.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });
    const roundKeys = Object.keys(rounds).sort((a, b) => a - b);

    return `<div class="fixture-comp-block">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)} (Liga)</h2>
        <span class="section-sub">${roundKeys.length} fechas · ${ligaMatches.length} partidos</span>
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
    // Copa → SIEMPRE llaves
    return renderFixtureCopaByCompetition(comp);
  }
}

function renderFixtureCopaByCompetition(comp) {
  // Copa SIEMPRE en llaves, con fallbacks para datos viejos
  let bracketMatches = State.data.matches.filter(m => m.competitionId === comp.id);
  if (!bracketMatches.length) {
    bracketMatches = State.data.matches.filter(m => m.bracket);
  }
  const rounds = {};
  bracketMatches.forEach(m => {
    const r = m.bracketRound || m.round || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });
  const roundKeys = Object.keys(rounds).sort((a, b) => a - b);
  const totalRounds = bracketMatches[0] ? (bracketMatches[0].totalBracketRounds || roundKeys.length) : roundKeys.length;

  const teamsInComp = (comp.teamIds || []).map(id => getTeamById(id)).filter(Boolean);
  const champion = teamsInComp.find(t => (t.titles || []).some(ti => ti.competitionName === comp.name && ti.year === comp.season));

  return `<div class="fixture-comp-block">
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

function attachFixtureEvents() {
  const sel = document.getElementById('fixture-comp-select');
  if (sel) {
    sel.onchange = () => {
      State.currentStatsCompetition = sel.value;
      renderMainContent();
    };
  }
}

function attachTablaEvents() {
  const sel = document.getElementById('tabla-comp-select');
  if (sel) {
    sel.onchange = () => {
      State.currentStatsCompetition = sel.value;
      renderMainContent();
    };
  }
}

/* ---------------- VIEW: TABLA DE POSICIONES ---------------- */

function viewTabla() {
  // SOLO competencias tipo LIGA: las copas no tienen tabla de posiciones
  const competitions = (State.data.competitions || []).filter(c => c.type === 'liga');
  const header = `<div class="section-head">
      <h2 class="section-title">${tr('tabla_title')}</h2>
    </div>`;

  // Sin ligas activas → no existe tabla de posiciones (solo copas = mensaje)
  if (!competitions.length) {
    const compsCount = (State.data.competitions || []).length;
    // Compatibilidad: datos legacy sin competencias creadas y formato liga
    const legacyLiga = !compsCount && State.data.matches.length > 0 && State.data.settings.competitionFormat !== 'copa';
    return `<div class="view active">
      ${header}
      ${legacyLiga ? renderTablaGeneral() : emptyState('ti-trophy', tr('tabla_solo_ligas'))}
    </div>`;
  }

  // Una sola liga activa → tabla directa, sin combo
  if (competitions.length === 1) {
    return `<div class="view active">
      ${header}
      ${renderTablaByCompetition(competitions[0])}
    </div>`;
  }

  // Dos o más ligas activas → combo para diferenciarlas
  let sel = State.currentStatsCompetition || 'todas';
  if (sel !== 'todas' && !competitions.find(c => c.id === sel)) {
    sel = 'todas';
    State.currentStatsCompetition = 'todas';
  }

  const compSelector = `
    <div style="margin-bottom:1.4rem; max-width:360px;">
      <label for="tabla-comp-select" style="display:block; font-size:0.78rem; color:var(--text-muted); font-weight:600; margin-bottom:0.35rem;">${tr('fixture_elegir_comp')}</label>
      <select id="tabla-comp-select" class="fixture-comp-select">
        <option value="todas" ${sel === 'todas' ? 'selected' : ''}>${tr('filtro_todas_comp')}</option>
        ${competitions.map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
  `;

  const body = sel !== 'todas'
    ? renderTablaByCompetition(competitions.find(c => c.id === sel))
    : competitions.map(renderTablaByCompetition).join('');

  return `<div class="view active">
    ${header}
    ${compSelector}
    ${body}
  </div>`;
}

function renderTablaGeneral() {
  const standings = computeStandings();
  if (!standings.length) {
    return emptyState('ti-table-off', tr('tabla_empty'));
  }

  const n = standings.length;
  return `<div class="card table-wrap">
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

/* ---------------- VIEW: PLANTELES ---------------- */

function viewPlanteles() {
  const sel = State.currentPlantel && getTeamById(State.currentPlantel) ? State.currentPlantel : null;
  if (sel) return viewPlantelDetail(sel);

  const teams = State.data.teams;
  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${tr('planteles_title')}</h2>
      <span class="section-sub">${tr('planteles_sub')}</span>
    </div>
    ${teams.length
      ? `<div class="plant-grid">${teams.map(plantelCardHtml).join('')}</div>`
      : emptyState('ti-shield-off', tr('planteles_empty'))}
  </div>`;
}

function plantelCardHtml(team) {
  const color = team.color || 'var(--accent-dark)';
  return `<button class="plant-card" data-plantel="${team.id}" style="--pc:${color};">
    <span class="plant-card-crest">${teamDotHtml({ logo: team.logo, name: team.name }, '')}</span>
    <span class="plant-card-name">${escapeHtml(team.name)}</span>
  </button>`;
}

function attachPlantelesEvents() {
  document.querySelectorAll('.plant-card').forEach(c => {
    c.onclick = () => { State.currentPlantel = c.dataset.plantel; renderMainContent(); };
  });
  const back = document.getElementById('plantel-back-btn');
  if (back) back.onclick = () => { State.currentPlantel = null; renderMainContent(); };
}

function viewPlantelDetail(teamId) {
  const team = getTeamById(teamId);
  if (!team) { State.currentPlantel = null; return viewPlanteles(); }

  const color = team.color || 'var(--accent-dark)';
  const statsByPlayer = {};
  computeAllPlayerStats('todas').forEach(s => { statsByPlayer[s.playerId] = s; });
  const players = (team.players || []).map(p => ({ name: p.name, s: statsByPlayer[p.id] }));

  return `<div class="view active">
    <button class="btn btn-sm" id="plantel-back-btn" style="margin-bottom:1rem;"><i class="ti ti-arrow-left"></i> ${tr('planteles_volver')}</button>

    <div class="plantel-head" style="--pc:${color};">
      <div class="plantel-head-crest">${teamDotHtml({ logo: team.logo, name: team.name }, '')}</div>
      <div class="plantel-head-info">
        <div class="plantel-head-name">${escapeHtml(team.name)}</div>
        <div class="plantel-head-meta">${(team.players || []).length} ${tr('planteles_jugadores')}${team.short ? ` · ${escapeHtml(team.short.toUpperCase())}` : ''}</div>
      </div>
    </div>

    <div class="card plantel-squad" style="--pc:${color};">
      ${players.length ? players.map(plantelPlayerRow).join('') : `<p style="color:var(--text-muted); font-size:0.85rem; padding:0.75rem 0;">${tr('sin_jugadores')}</p>`}
    </div>
  </div>`;
}

function plantelPlayerRow({ name, s }) {
  const st = s || { pj: 0, goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 };
  let pills = `
    <span class="plantel-pill"><em>${tr('th_pj')}</em><strong>${st.pj}</strong></span>
    <span class="plantel-pill hl"><em>${tr('th_goles')}</em><strong>${st.goals}</strong></span>
    <span class="plantel-pill"><em>${tr('th_asist')}</em><strong>${st.assists}</strong></span>`;
  if (st.saves > 0) pills += `<span class="plantel-pill"><em>${tr('th_atajadas')}</em><strong>${st.saves}</strong></span>`;
  if (st.yellow > 0) pills += `<span class="plantel-pill card-ta"><em>${tr('th_ta')}</em><strong>${st.yellow}</strong></span>`;
  if (st.red > 0) pills += `<span class="plantel-pill card-tr"><em>${tr('th_tr')}</em><strong>${st.red}</strong></span>`;

  return `<div class="plantel-player">
    <span class="plantel-player-name">${escapeHtml(name)}</span>
    <span class="plantel-player-stats">${pills}</span>
  </div>`;
}

/* ---------------- VIEW: PALMARES ---------------- */

/* Lista completa de títulos: los manuales (cargados por el admin con año,
   imagen y plantel) + los derivados de torneos (campeones declarados). */
function palmaresEntries() {
  const entries = [];
  (State.data.palmares || []).forEach(p => {
    entries.push({
      id: p.id, year: String(p.year || '').trim(), name: p.name,
      logo: p.logo, players: (p.players || []).map(pl => pl.name),
      tag: '', source: 'manual'
    });
  });
  State.data.teams.forEach(t => {
    (t.titles || []).forEach(ti => {
      entries.push({
        id: t.id, year: String(ti.year || '').trim(), name: t.name,
        logo: t.logo, players: (t.players || []).map(pl => pl.name),
        tag: ti.competitionName || '', source: 'auto'
      });
    });
  });
  return entries.filter(e => e.year);
}

function palmaresYears(entries) {
  return [...new Set(entries.map(e => e.year))].sort((a, b) => Number(b) - Number(a));
}

function viewPalmares() {
  const entries = palmaresEntries();
  const years = palmaresYears(entries);

  const head = `
    <div class="section-head">
      <h2 class="section-title">${tr('palmares_title')}</h2>
      <span class="section-sub">${tr('palmares_sub')}</span>
      ${State.isAdmin ? `<button class="btn btn-primary" id="palmares-add-btn" style="margin-left:auto;"><i class="ti ti-plus"></i> ${tr('palmares_agregar_btn')}</button>` : ''}
    </div>`;

  if (!years.length) {
    return `<div class="view active">${head}${emptyState('ti-trophy-off', tr('palmares_empty'))}</div>`;
  }

  const raw = localStorage.getItem('pso_pal_year') || String(years[0]);
  const selYear = years.includes(raw) ? raw : String(years[0]);
  const selEntries = entries.filter(e => e.year === selYear);

  return `<div class="view active">
    ${head}
    <div class="pal-years">${years.map(y => `
      <button class="pal-year-btn ${y === selYear ? 'active' : ''}" data-year="${y}">${escapeHtml(y)}</button>
    `).join('')}</div>
    <div id="palmares-year-content">
      ${selEntries.length ? selEntries.map(e => palmaresWinnerCard(e)).join('') : emptyState('ti-trophy-off', tr('palmares_empty_year', { year: selYear }))}
    </div>
  </div>`;
}

function palmaresWinnerCard(e) {
  const admin = State.isAdmin;
  return `<div class="palmares-winner" style="${e.tag ? 'border-color: rgba(240,197,66,0.5);' : ''}">
    <div class="palmares-winner-crest">${teamDotHtml({ logo: e.logo, name: e.name }, 'pal-winner-dot')}</div>
    <div class="palmares-winner-info">
      <div class="palmares-winner-name">${escapeHtml(e.name)}</div>
      ${e.tag ? `<div class="palmares-winner-tag"><i class="ti ti-trophy" style="font-size:0.8rem;"></i> ${escapeHtml(e.tag)}</div>` : ''}
      ${(e.players || []).length ? `<div class="palmares-winner-plantel">${tr('palmares_plantel')}: ${e.players.map(escapeHtml).join(' · ')}</div>` : ''}
    </div>
    ${admin && e.source === 'manual' ? `<button class="btn btn-icon btn-danger palmares-del-btn" data-pal="${e.id}" title="${tr('btn_eliminar')}" style="width:34px; height:34px;"><i class="ti ti-trash"></i></button>` : ''}
  </div>`;
}

function attachPalmaresEvents() {
  const addBtn = document.getElementById('palmares-add-btn');
  if (addBtn) addBtn.onclick = openPalmaresFormModal;

  document.querySelectorAll('.pal-year-btn').forEach(b => {
    b.onclick = () => {
      localStorage.setItem('pso_pal_year', b.dataset.year);
      document.querySelectorAll('.pal-year-btn').forEach(x => x.classList.toggle('active', x === b));
      const entries = palmaresEntries().filter(e => e.year === b.dataset.year);
      const content = document.getElementById('palmares-year-content');
      if (content) {
        content.innerHTML = entries.length ? entries.map(palmaresWinnerCard).join('') : emptyState('ti-trophy-off', tr('palmares_empty_year', { year: b.dataset.year }));
        attachPalmaresDeleteEvents();
      }
    };
  });

  attachPalmaresDeleteEvents();
}

function attachPalmaresDeleteEvents() {
  document.querySelectorAll('.palmares-del-btn').forEach(b => {
    b.onclick = async () => {
      const entry = (State.data.palmares || []).find(e => e.id === b.dataset.pal);
      if (!entry) return;
      openModal(tr('modal_eliminar_palmares'), `
        <p style="font-size:0.92rem;">${tr('confirm_del_palmares', { name: escapeHtml(entry.name) })}</p>
      `, `
        <button class="btn" id="del-pal-cancel">${tr('btn_cancel')}</button>
        <button class="btn btn-danger" id="del-pal-confirm"><i class="ti ti-trash"></i> ${tr('btn_eliminar')}</button>
      `);
      document.getElementById('del-pal-cancel').onclick = closeModal;
      document.getElementById('del-pal-confirm').onclick = async () => {
        await deletePalmaresEntryDB(entry.id);
        closeModal();
        renderMainContent();
        toast(tr('toast_palmares_eliminado'));
      };
    };
  });
}

/* ---------------- ADMIN: AGREGAR TÍTULO AL PALMARÉS ---------------- */

let palFormState = null;

function openPalmaresFormModal(preserve) {
  if (!preserve || !palFormState) {
    palFormState = { logo: null, players: [], name: '' };
  }
  const st = palFormState;

  const overlay = openModal(tr('palmares_modal_title'), `
    <div id="pal-logo-section"></div>

    <div class="field-row">
      <div class="field">
        <label>${tr('palmares_label_nombre')}</label>
        <input type="text" id="pal-name-input" placeholder="${tr('palmares_ph_nombre')}" value="${escapeHtml(st.name)}">
      </div>
      <div class="field" style="max-width:130px;">
        <label>${tr('palmares_label_year')}</label>
        <input type="number" id="pal-year-input" min="1990" max="2100" value="${new Date().getFullYear()}" placeholder="2026">
      </div>
    </div>
    <div class="field-error" id="pal-name-error" style="display:none;">${tr('err_nombre_valido')}</div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin: 1.1rem 0 0.6rem;">
      <label style="font-size:0.82rem; font-weight:600; color:var(--text-secondary);">${tr('label_plantel')}</label>
      <button class="btn btn-sm" id="pal-add-player-inline" type="button"><i class="ti ti-user-plus"></i> ${tr('btn_agregar_jugador')}</button>
    </div>
    <div id="pal-players-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:220px; overflow-y:auto;"></div>
  `, `
    <button class="btn" id="pal-form-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="pal-form-save"><i class="ti ti-check"></i> ${tr('palmares_btn_crear')}</button>
  `);

  function renderLogoSection() {
    const section = document.getElementById('pal-logo-section');
    section.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem;">
        <div id="pal-logo-preview" style="width:88px; height:88px; border-radius:50%; background:var(--bg-surface-2); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; font-weight:800; color:var(--accent-dark); font-size:1.4rem;">
          ${st.logo ? `<img src="${st.logo}" style="width:100%; height:100%; object-fit:cover;">` : teamInitials((document.getElementById('pal-name-input') || {}).value || tr('palmares_title'))}
        </div>
        <div>
          <input type="file" id="pal-logo-input" accept="image/*" style="display:none;">
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-sm" id="pal-logo-btn" type="button">🖼️ ${st.logo ? tr('btn_cambiar_logo') : tr('btn_subir_logo')}</button>
            ${st.logo ? `<button class="btn btn-sm btn-danger" id="pal-logo-remove" type="button">${tr('btn_quitar')}</button>` : ''}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem;">${tr('logo_crop_note')}</div>
        </div>
      </div>
    `;

    document.getElementById('pal-logo-btn').onclick = () => document.getElementById('pal-logo-input').click();
    document.getElementById('pal-logo-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { toast(tr('toast_logo_pesada'), 'error'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Igual que el logo de club: recorta el centro a un cuadrado 400x400
          // para que la imagen "se ajuste" al círculo sin distorsionarse.
          const size = 400;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          st.logo = canvas.toDataURL('image/webp', 0.9);
          renderLogoSection();
          toast(tr('toast_logo_actualizado'));
        };
        img.onerror = () => toast(tr('toast_logo_error'), 'error');
        img.src = ev.target.result;
      };
      reader.onerror = () => toast(tr('toast_logo_leer'), 'error');
      reader.readAsDataURL(file);
    };
    const removeBtn = document.getElementById('pal-logo-remove');
    if (removeBtn) removeBtn.onclick = () => { st.logo = null; renderLogoSection(); };
  }
  renderLogoSection();

  function renderPlayersList() {
    const list = document.getElementById('pal-players-list');
    if (!st.players.length) {
      list.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem 0;">${tr('sin_jugadores_list')}</p>`;
      return;
    }
    list.innerHTML = st.players.map((p, i) => `
      <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface-2); border-radius:8px; padding:0.5rem 0.6rem;">
        <span style="flex:1; font-size:0.86rem; font-weight:600;">${escapeHtml(p.name)}</span>
        <button class="btn btn-icon btn-sm" data-pal-remove="${i}" type="button" style="width:28px; height:28px;"><i class="ti ti-x" style="font-size:0.9rem;"></i></button>
      </div>
    `).join('');
    list.querySelectorAll('[data-pal-remove]').forEach(b => {
      b.onclick = () => { st.players.splice(Number(b.dataset.palRemove), 1); renderPlayersList(); };
    });
  }
  renderPlayersList();

  document.getElementById('pal-add-player-inline').onclick = () => {
    st.name = document.getElementById('pal-name-input').value.trim();
    openQuickPlayerModal((name) => {
      st.players.push({ id: uid('pl'), name });
    }, () => openPalmaresFormModal(true));
  };

  document.getElementById('pal-form-cancel').onclick = closeModal;
  document.getElementById('pal-form-save').onclick = async () => {
    const name = document.getElementById('pal-name-input').value.trim();
    const year = String(document.getElementById('pal-year-input').value || '').trim();
    if (!name) { document.getElementById('pal-name-error').style.display = 'block'; return; }
    if (!year) { toast(tr('palmares_year_required'), 'error'); return; }
    const entry = { id: uid('pal'), name, year, logo: st.logo, players: st.players };
    await persistPalmaresEntry(entry);
    renderMainContent();
    closeModal();
    toast(tr('toast_palmares_creado', { name: entry.name, year: entry.year }));
  };
  setTimeout(() => document.getElementById('pal-name-input').focus(), 100);
}
/* ---------------- VIEW: SELECCIÓN URUGUAYA ---------------- */

const SELECCION_UY = [
  { pos: 'arqueros', icon: 'ti-hand-stop', players: [{ name: 'Molleja', num: 99 }, { name: 'Benji Price', num: 1 }] },
  { pos: 'defensas', icon: 'ti-shield', players: [{ name: 'Qevale', num: 47 }, { name: 'Sebasuarezz' }, { name: 'Unfav', num: 4 }, { name: 'Taro Misaki', num: 24 }] },
  { pos: 'medios', icon: 'ti-run', players: [{ name: 'Caseros', num: 64 }, { name: 'Agstn', num: 16 }, { name: 'Marabola', num: 7 }, { name: 'Best666', num: 10 }, { name: 'Sant1_Uru', num: 14 }] },
  { pos: 'delanteros', icon: 'ti-ball-football', players: [{ name: 'Fran', num: 69 }, { name: 'Popa' }, { name: 'Parling', num: 17 }, { name: 'Chepas', num: 21 }, { name: 'Lnfermo' }, { name: 'Alan Velasco' }, { name: 'El Rkt' }, { name: 'Nachodeldanu' }, { name: 'Perssa', num: 5 }] },
];

function seleccionPosKey(pos) {
  if (pos === 'arqueros') return 'sel_pos_arqueros';
  if (pos === 'defensas') return 'sel_pos_defensas';
  if (pos === 'medios') return 'sel_pos_medios';
  return 'sel_pos_delanteros';
}

function seleccionPlayerCard(name, n) {
  return `<div class="sel-player">
    <div class="sel-player-avatar">${n}</div>
    <div class="sel-player-info">
      <div class="sel-player-name">${escapeHtml(name)}</div>
    </div>
    <i class="ti ti-star-filled sel-player-star"></i>
  </div>`;
}

function viewSeleccion() {
  const used = new Set();
  SELECCION_UY.forEach(g => g.players.forEach(p => { if (p && typeof p === 'object' && p.num != null) used.add(p.num); }));
  let nextFree = 1;
  const nextNumber = () => { while (used.has(nextFree)) nextFree += 1; used.add(nextFree); return nextFree; };
  const total = SELECCION_UY.reduce((s, g) => s + g.players.length, 0);
  const groups = SELECCION_UY.map(g => {
    const cards = g.players.map(p => {
      const dorsal = (p && typeof p === 'object' && p.num != null) ? p.num : nextNumber();
      const nombre = (p && typeof p === 'object') ? p.name : p;
      return seleccionPlayerCard(nombre, dorsal);
    }).join('');
    return `<section class="sel-group sel-group-${g.pos}">
      <div class="sel-group-head">
        <span class="sel-group-icon"><i class="ti ${g.icon}"></i></span>
        <h3>${tr(seleccionPosKey(g.pos))}</h3>
        <span class="sel-group-count">${g.players.length}</span>
      </div>
      <div class="sel-grid">${cards}</div>
    </section>`;
  }).join('');

  return `<div class="view active">
    <div class="sel-hero">
      <div class="sel-hero-stripes" aria-hidden="true"></div>
      <div class="sel-hero-inner">
        <span class="sel-badge">${tr('sel_badge')}</span>
        <h2 class="sel-title">${tr('sel_title')}</h2>
        <p class="sel-sub">${tr('sel_sub')}</p>
        <div class="sel-meta">
          <span class="sel-meta-chip"><i class="ti ti-shirt"></i>${tr('sel_squad_label')}</span>
          <span class="sel-meta-chip gold"><i class="ti ti-users"></i>${tr('sel_count', { n: total })}</span>
        </div>
      </div>
    </div>
    ${groups}
    <a class="sel-cta" href="https://discord.gg/3HymNM8XB3" target="_blank" rel="noopener">
      <i class="ti ti-brand-discord"></i>
      <span><strong>${tr('sel_cta_join')}</strong><small>${tr('sel_cta_join_sub')}</small></span>
      <i class="ti ti-arrow-right"></i>
    </a>
  </div>`;
}
