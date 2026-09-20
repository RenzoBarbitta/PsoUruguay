/* ======================================================================
   PSO URUGUAY - GESTIÓN DE COMPETENCIAS
   ====================================================================== */

function attachCompetenciasEvents() {
  const btnNew = document.getElementById('btn-new-competition');
  if (btnNew) btnNew.onclick = () => openCompetitionFormModal();
  const btnNewFirst = document.getElementById('btn-new-competition-first');
  if (btnNewFirst) btnNewFirst.onclick = () => openCompetitionFormModal();

  document.querySelectorAll('.btn-edit-competition').forEach(btn => {
    btn.onclick = () => {
      const comp = getCompetitionById(btn.dataset.compId);
      if (comp) openCompetitionFormModal(comp);
    };
  });

  document.querySelectorAll('.btn-delete-competition').forEach(btn => {
    btn.onclick = () => {
      const comp = getCompetitionById(btn.dataset.compId);
      if (comp) openDeleteCompetitionModal(comp);
    };
  });

  document.querySelectorAll('.btn-sortear-competition').forEach(btn => {
    btn.onclick = () => {
      const comp = getCompetitionById(btn.dataset.compId);
      if (comp) openSortearCompetitionModal(comp);
    };
  });

  document.querySelectorAll('.btn-ver-competition').forEach(btn => {
    btn.onclick = () => {
      const comp = getCompetitionById(btn.dataset.compId);
      if (comp) {
        State.currentStatsCompetition = comp.id;
        State.currentTab = 'fixture';
        renderShell();
        renderMainContent();
      }
    };
  });
}

// Función auxiliar para próximo power of 2
function nextPowerOfTwo(n) {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Generar bracket de copa básico
function generateCopaBracket(teamIds) {
  const pairs = [];
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

// Renderizar partido de bracket (para vista de copa por competencia)
function bracketMatchCard(m) {
  const home = m.homeId ? getTeamById(m.homeId) : null;
  const away = m.awayId ? getTeamById(m.awayId) : null;
  const isBye = m.isBye || false;

  return `<div style="display:flex; flex-direction:column; align-items:center; gap:0.3rem; padding:0.5rem; background:var(--bg-surface); border-radius:6px; border:0.5px solid var(--border);">
    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.8rem;">
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-align:left;">${home ? escapeHtml(home.name) : '—'}</span>
      <span style="color:var(--text-muted); font-size:0.65rem;">vs</span>
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-align:right;">${away ? escapeHtml(away.name) : '—'}</span>
    </div>
    <div style="font-family:var(--font-display); font-weight:700; font-size:0.85rem;">
      ${m.played ? `${m.homeScore || 0} - ${m.awayScore || 0}` : '—'}
    </div>
  </div>`;
}

// Renderizar fixture de copa para una competencia específica
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
  const champion = teamsInComp.find(t => (t.titles || []).some(ti => ti.competitionName === comp.name));

  return `<div class="view active">
    <div class="section-head">
      <h2 class="section-title">${escapeHtml(comp.name)} (Copa)</h2>
      <span class="section-sub">${roundKeys.length} rondas · ${bracketMatches.length} partidos</span>
    </div>

    ${champion ? `<div class="draw-result-card" style="text-align:center; margin-bottom:1.5rem;">
      <i class="ti ti-trophy" style="font-size:2rem; color:var(--gold);"></i>
      <div style="font-family:var(--font-display); font-weight:700; margin-top:0.5rem;">${escapeHtml(champion.name)}</div>
    </div>` : ''}

    <div style="overflow-x:auto; padding-bottom:0.5rem;">
      <div style="display:flex; gap:1.5rem; min-width:min-content;">
        ${roundKeys.map(r => {
          const matches = rounds[r].sort((a, b) => a.bracketSlot - b.bracketSlot);
          return `<div style="min-width:220px;">
            <div class="fixture-round-title" style="justify-content:center; text-align:center;">${bracketRoundName(Number(r), totalRounds)}</div>
            <div style="display:flex; flex-direction:column; gap:0.8rem;">
              ${matches.map(bracketMatchCard).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// Renderizar tabla por competencia específica (solo ligas)
function renderTablaByCompetition(comp) {
  const isLiga = comp.type === 'liga';
  if (!isLiga) {
    return `<div class="fixture-comp-block">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)}</h2>
      </div>
      ${emptyState('ti-trophy', tr('tabla_copa_msg'))}
    </div>`;
  }

  const standings = computeStandings(comp.id);
  if (!standings.length) {
    return `<div class="fixture-comp-block">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(comp.name)}</h2>
      </div>
      ${emptyState('ti-table-off', tr('competencia_empty'))}
    </div>`;
  }

  const n = standings.length;
  return `<div class="fixture-comp-block">
    <div class="section-head">
      <h2 class="section-title">${escapeHtml(comp.name)}</h2>
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
              <td>${teamDotHtml(getTeamById(t.id))} ${escapeHtml(t.name)}</td>
              <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
              <td>${t.gf}</td><td>${t.gc}</td><td>${t.dg > 0 ? '+' : ''}${t.dg}</td>
              <td class="pts">${t.pts}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}
