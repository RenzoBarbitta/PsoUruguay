/* ======================================================================
   PSO URUGUAY - CÁLCULO DE ESTADÍSTICAS
   Funciones puras: reciben los datos y devuelven los números calculados.
   ====================================================================== */

function getTeamById(id) {
  return State.data.teams.find(t => t.id === id);
}

/* ---------------- Tabla de posiciones ---------------- */
// Sistema básico de fútbol: Victoria 3pts, Empate 1pt, Derrota 0pts

function computeStandings() {
  const table = {};
  State.data.teams.forEach(t => {
    table[t.id] = {
      id: t.id, name: t.name, short: t.short, color: t.color,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0
    };
  });

  State.data.matches.filter(m => m.played).forEach(m => {
    const home = table[m.homeId];
    const away = table[m.awayId];
    if (!home || !away) return;
    const hs = Number(m.homeScore) || 0;
    const as = Number(m.awayScore) || 0;

    home.pj++; away.pj++;
    home.gf += hs; home.gc += as;
    away.gf += as; away.gc += hs;

    if (hs > as) { home.pg++; home.pts += 3; away.pp++; }
    else if (hs < as) { away.pg++; away.pts += 3; home.pp++; }
    else { home.pe++; away.pe++; home.pts += 1; away.pts += 1; }
  });

  const arr = Object.values(table);
  arr.forEach(t => t.dg = t.gf - t.gc);
  arr.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
  return arr;
}

function matchMatchesCompetitionFilter(m, competitionFilter) {
  if (!competitionFilter || competitionFilter === 'todas') return true;
  const format = m.competitionFormat || (m.bracket ? 'copa' : 'liga');
  return format === competitionFilter;
}

/* ---------------- Rankings de jugadores ---------------- */

function findPlayerAndTeam(playerId) {
  for (const team of State.data.teams) {
    const p = (team.players || []).find(pl => pl.id === playerId);
    if (p) return { player: p, team };
  }
  return null;
}

function enrichPlayerRanking(map, sortKey) {
  const arr = Object.values(map).map(entry => {
    const found = findPlayerAndTeam(entry.playerId);
    return {
      ...entry,
      name: found ? found.player.name : tr('label_jugador_eliminado'),
      teamName: found ? found.team.short || found.team.name : '—'
    };
  });
  arr.sort((a, b) => b[sortKey] - a[sortKey] || a.name.localeCompare(b.name));
  return arr.filter(a => a[sortKey] > 0);
}

function computeTopScorers(competitionFilter) {
  const map = {};
  State.data.matches
    .filter(m => m.played && m.stats)
    .filter(m => matchMatchesCompetitionFilter(m, competitionFilter))
    .forEach(m => {
      Object.entries(m.stats).forEach(([playerId, s]) => {
        if (!s.goals) return;
        if (!map[playerId]) map[playerId] = { playerId, goals: 0, assists: 0 };
        map[playerId].goals += Number(s.goals) || 0;
      });
    });
  return enrichPlayerRanking(map, 'goals');
}

function computeTopAssists(competitionFilter) {
  const map = {};
  State.data.matches
    .filter(m => m.played && m.stats)
    .filter(m => matchMatchesCompetitionFilter(m, competitionFilter))
    .forEach(m => {
      Object.entries(m.stats).forEach(([playerId, s]) => {
        if (!s.assists) return;
        if (!map[playerId]) map[playerId] = { playerId, goals: 0, assists: 0 };
        map[playerId].assists += Number(s.assists) || 0;
      });
    });
  return enrichPlayerRanking(map, 'assists');
}

function computeTopSaves(competitionFilter) {
  const map = {};
  State.data.matches
    .filter(m => m.played && m.stats)
    .filter(m => matchMatchesCompetitionFilter(m, competitionFilter))
    .forEach(m => {
      Object.entries(m.stats).forEach(([playerId, s]) => {
        if (!s.saves) return;
        if (!map[playerId]) map[playerId] = { playerId, saves: 0 };
        map[playerId].saves += Number(s.saves) || 0;
      });
    });
  return enrichPlayerRanking(map, 'saves');
}

function computeAllPlayerStats(competitionFilter) {
  const map = {};
  State.data.teams.forEach(team => {
    (team.players || []).forEach(p => {
      map[p.id] = { playerId: p.id, name: p.name, teamName: team.short || team.name, pj: 0, goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 };
    });
  });
  State.data.matches
    .filter(m => m.played)
    .filter(m => matchMatchesCompetitionFilter(m, competitionFilter))
    .forEach(m => {
      const lineup = m.lineup || {};
      Object.keys(lineup).forEach(playerId => {
        if (map[playerId]) map[playerId].pj++;
      });
      if (m.stats) {
        Object.entries(m.stats).forEach(([playerId, s]) => {
          if (!map[playerId]) return;
          // Solo contar estadísticas de jugadores efectivamente convocados a este partido
          if (Object.keys(lineup).length && !lineup[playerId]) return;
          map[playerId].goals += Number(s.goals) || 0;
          map[playerId].assists += Number(s.assists) || 0;
          map[playerId].saves += Number(s.saves) || 0;
          map[playerId].yellow += Number(s.yellow) || 0;
          map[playerId].red += Number(s.red) || 0;
        });
      }
    });
  return Object.values(map).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

function computePalmares() {
  const arr = State.data.teams
    .map(t => ({ id: t.id, name: t.name, logo: t.logo, titles: t.titles || [] }))
    .filter(t => t.titles.length > 0);
  arr.sort((a, b) => b.titles.length - a.titles.length || a.name.localeCompare(b.name));
  return arr;
}