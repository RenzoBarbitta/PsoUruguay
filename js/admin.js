/* ======================================================================
   PSO URUGUAY - PANEL DE ADMINISTRACIÓN
   Equipos · Resultados · Sorteo de fixture · Configuración
   ====================================================================== */

function viewAdmin() {
  return `<div class="view active">
    <div class="admin-header">
      <div>
        <h2 class="section-title">${tr('tab_admin')}</h2>
        <span class="section-sub">${tr('admin_subtitle')}</span>
      </div>
    </div>
    <div class="admin-subtabs">
      ${adminSubtab('equipos', 'ti-users-group', tr('admin_sub_equipos'))}
      ${adminSubtab('resultados', 'ti-clipboard-check', tr('admin_sub_resultados'))}
      ${adminSubtab('sorteo', 'ti-arrows-shuffle', tr('admin_sub_sorteo'))}
      ${adminSubtab('config', 'ti-adjustments', tr('admin_sub_config'))}
    </div>
    <div id="admin-panel-content"></div>
  </div>`;
}

function adminSubtab(id, icon, label) {
  return `<button class="subtab-btn ${State.currentAdminTab === id ? 'active' : ''}" data-subtab="${id}"><i class="ti ${icon}"></i> ${label}</button>`;
}

function attachAdminEvents() {
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.onclick = () => {
      State.currentAdminTab = btn.dataset.subtab;
      document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderAdminPanel();
    };
  });
  renderAdminPanel();
}

function renderAdminPanel() {
  const el = document.getElementById('admin-panel-content');
  if (!el) return;
  switch (State.currentAdminTab) {
    case 'equipos': el.innerHTML = adminPanelEquipos(); attachEquiposEvents(); break;
    case 'resultados': el.innerHTML = adminPanelResultados(); attachResultadosEvents(); break;
    case 'sorteo': sorteoFormatoElegido = null; el.innerHTML = adminPanelSorteo(); attachSorteoEvents(); break;
    case 'config': el.innerHTML = adminPanelConfig(); attachConfigEvents(); break;
  }
}

/* -------------------- ADMIN: EQUIPOS -------------------- */

function adminPanelEquipos() {
  return `
    <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
      <button class="btn btn-primary" id="btn-new-team"><i class="ti ti-plus"></i> ${tr('btn_nuevo_equipo')}</button>
    </div>
    ${State.data.teams.length ? State.data.teams.map(teamAdminCard).join('') : emptyState('ti-shield-off', tr('equipos_empty'))}
  `;
}

function teamAdminCard(team) {
  const titleCount = (team.titles || []).length;
  return `<div class="team-admin-card" data-team-id="${team.id}">
    <div class="team-admin-head" style="flex-wrap: wrap;">
      ${teamDotHtml(team)}
      <div class="team-admin-name">${escapeHtml(team.name)} ${titleCount ? `<i class="ti ti-trophy" style="color:var(--gold); font-size:0.85rem;" title="${tr('title_titulos', { n: titleCount })}"></i>` : ''}</div>
      <div style="display:flex; gap:0.4rem; flex-shrink:0;">
        <button class="btn btn-sm btn-add-player" data-team="${team.id}" title="${tr('title_agregar_jugador')}"><i class="ti ti-user-plus"></i> ${tr('btn_jugador')}</button>
        <button class="btn btn-sm btn-edit-team" data-team="${team.id}" title="${tr('title_editar_equipo')}"><i class="ti ti-edit"></i> ${tr('btn_editar')}</button>
        <button class="btn btn-sm btn-danger btn-delete-team" data-team="${team.id}" title="${tr('btn_eliminar')}"><i class="ti ti-trash"></i> ${tr('btn_eliminar')}</button>
      </div>
    </div>
    <div>
      ${(team.players || []).length ? team.players.map(p => `<span class="player-chip">${escapeHtml(p.name)}${p.position ? ` <em style="font-style:normal; color:var(--text-muted); font-size:0.7rem;">· ${positionShort(p.position)}</em>` : ''} <button class="btn-remove-player" data-team="${team.id}" data-player="${p.id}"><i class="ti ti-x"></i></button></span>`).join('') : `<span style="color:var(--text-muted); font-size:0.82rem;">${tr('sin_jugadores')}</span>`}
    </div>
  </div>`;
}

function attachEquiposEvents() {
  const btnNew = document.getElementById('btn-new-team');
  if (btnNew) btnNew.onclick = () => openTeamFormModal();

  document.querySelectorAll('.btn-edit-team').forEach(b => b.onclick = () => openTeamFormModal(getTeamById(b.dataset.team)));
  document.querySelectorAll('.btn-delete-team').forEach(b => b.onclick = () => confirmDeleteTeam(b.dataset.team));
  document.querySelectorAll('.btn-add-player').forEach(b => b.onclick = () => openAddPlayerModal(b.dataset.team));
  document.querySelectorAll('.btn-remove-player').forEach(b => b.onclick = () => removePlayer(b.dataset.team, b.dataset.player));
}

const POSITION_KEYS = ['gk', 'def', 'mid', 'fwd'];
const POSITION_SHORT_LABELS = {
  gk: { es: 'ARQ', pt: 'GOL' },
  def: { es: 'DEF', pt: 'ZAG' },
  mid: { es: 'MED', pt: 'MEI' },
  fwd: { es: 'DEL', pt: 'ATA' }
};

function positionLabel(code) {
  return tr('pos_' + code);
}

function positionShort(code) {
  const l = POSITION_SHORT_LABELS[code] || {};
  return l[I18N.lang] || l.es || code;
}

let teamFormLogoData = null;
let teamFormPlayers = [];

function openTeamFormModal(team, preserveState) {
  const isEdit = !!team;
  if (!preserveState) {
    teamFormLogoData = isEdit ? (team.logo || null) : null;
    teamFormPlayers = isEdit ? JSON.parse(JSON.stringify(team.players || [])) : [];
  }
  const currentNameValue = preserveState ? preserveState.name : (isEdit ? team.name : '');

  const overlay = openModal(isEdit ? tr('modal_editar_equipo') : tr('modal_nuevo_equipo'), `
    <div id="team-logo-section"></div>

    <div class="field">
      <label>${tr('label_nombre_equipo')}</label>
      <input type="text" id="team-name-input" value="${escapeHtml(currentNameValue)}" placeholder="${tr('ph_equipo')}">
    </div>
    <div class="field-error" id="team-name-error" style="display:none;">${tr('err_nombre_valido')}</div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin: 1.1rem 0 0.6rem;">
      <label style="font-size:0.82rem; font-weight:600; color:var(--text-secondary);">${tr('label_plantel')}</label>
      <button class="btn btn-sm" id="team-add-player-inline" type="button"><i class="ti ti-user-plus"></i> ${tr('btn_agregar_jugador')}</button>
    </div>
    <div id="team-players-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:240px; overflow-y:auto;"></div>
  `, `
    <button class="btn" id="team-form-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="team-form-save"><i class="ti ti-check"></i> ${isEdit ? tr('btn_guardar_cambios') : tr('btn_crear_equipo')}</button>
  `);

  function renderLogoSection() {
    const section = document.getElementById('team-logo-section');
    section.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem;">
        <div id="team-logo-preview" style="width:88px; height:88px; border-radius:50%; background:var(--bg-surface-2); border:2px solid var(--border-strong); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; font-weight:800; color:var(--accent-dark); font-size:1.4rem;">
          ${teamFormLogoData ? `<img src="${teamFormLogoData}" style="width:100%; height:100%; object-fit:cover;">` : teamInitials(isEdit ? team.name : (currentNameValue || ''))}
        </div>
        <div>
          <input type="file" id="team-logo-input" accept="image/*" style="display:none;">
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-sm" id="team-logo-btn" type="button">🖼️ ${teamFormLogoData ? tr('btn_cambiar_logo') : tr('btn_subir_logo')}</button>
            ${teamFormLogoData ? `<button class="btn btn-sm btn-danger" id="team-logo-remove" type="button">${tr('btn_quitar')}</button>` : ''}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem;">${tr('logo_crop_note')}</div>
        </div>
      </div>
    `;

    document.getElementById('team-logo-btn').onclick = () => document.getElementById('team-logo-input').click();
    document.getElementById('team-logo-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { toast(tr('toast_logo_pesada'), 'error'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar a un cuadrado de 400x400 recortando el centro,
          // para que el logo se vea bien en el círculo sin distorsionarse ni pesar de más
          const size = 400;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          teamFormLogoData = canvas.toDataURL('image/webp', 0.9);
          renderLogoSection();
          toast(tr('toast_logo_actualizado'));
        };
        img.onerror = () => toast(tr('toast_logo_error'), 'error');
        img.src = ev.target.result;
      };
      reader.onerror = () => toast(tr('toast_logo_leer'), 'error');
      reader.readAsDataURL(file);
    };
    const removeBtn = document.getElementById('team-logo-remove');
    if (removeBtn) {
      removeBtn.onclick = () => {
        teamFormLogoData = null;
        renderLogoSection();
      };
    }
  }
  renderLogoSection();

  function renderPlayersList() {
    const list = document.getElementById('team-players-list');
    if (!teamFormPlayers.length) {
      list.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem 0;">${tr('sin_jugadores_list')}</p>`;
      return;
    }
    list.innerHTML = teamFormPlayers.map((p, i) => `
      <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface-2); border-radius:8px; padding:0.5rem 0.6rem;">
        <span style="flex:1; font-size:0.86rem; font-weight:600;">${escapeHtml(p.name)}</span>
        <button class="btn btn-icon btn-sm" data-remove-inline="${i}" type="button" style="width:28px; height:28px;"><i class="ti ti-x" style="font-size:0.9rem;"></i></button>
      </div>
    `).join('');
    list.querySelectorAll('[data-remove-inline]').forEach(b => {
      b.onclick = () => { teamFormPlayers.splice(Number(b.dataset.removeInline), 1); renderPlayersList(); };
    });
  }
  renderPlayersList();

  document.getElementById('team-add-player-inline').onclick = () => {
    const typedName = document.getElementById('team-name-input').value;
    openQuickPlayerModal((name, position) => {
      teamFormPlayers.push({ id: uid('pl'), name, position });
    }, () => openTeamFormModal(team, { name: typedName }));
  };

  document.getElementById('team-form-cancel').onclick = closeModal;
  document.getElementById('team-form-save').onclick = async () => {
    const nameInput = document.getElementById('team-name-input');
    const name = nameInput.value.trim();
    if (!name) { document.getElementById('team-name-error').style.display = 'block'; return; }
    const teamObj = isEdit
      ? { ...team, name, logo: teamFormLogoData, players: teamFormPlayers }
      : { id: uid('team'), name, short: name.slice(0, 3).toUpperCase(), logo: teamFormLogoData, players: teamFormPlayers };
    await persistTeam(teamObj);
    renderAdminPanel();
    closeModal();
    toast(isEdit ? tr('toast_equipo_actualizado') : tr('toast_equipo_creado'));
  };
  setTimeout(() => document.getElementById('team-name-input').focus(), 100);
}

function openQuickPlayerModal(onConfirm, onCancelReopen) {
  openModal(tr('btn_agregar_jugador'), `
    <div class="field">
      <label>${tr('label_nombre_jugador')}</label>
      <input type="text" id="qp-name-input" placeholder="${tr('ph_jugador')}">
    </div>
    <div class="field-error" id="qp-name-error" style="display:none;">${tr('err_nombre_valido')}</div>
  `, `
    <button class="btn" id="qp-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="qp-save"><i class="ti ti-plus"></i> ${tr('btn_agregar')}</button>
  `);
  document.getElementById('qp-cancel').onclick = () => { closeModal(); if (onCancelReopen) onCancelReopen(); };
  const save = () => {
    const name = document.getElementById('qp-name-input').value.trim();
    if (!name) { document.getElementById('qp-name-error').style.display = 'block'; return; }
    closeModal();
    onConfirm(name, null);
    if (onCancelReopen) onCancelReopen();
  };
  document.getElementById('qp-save').onclick = save;
  document.getElementById('qp-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  setTimeout(() => document.getElementById('qp-name-input').focus(), 100);
}

function confirmDeleteTeam(teamId) {
  const team = getTeamById(teamId);
  openModal(tr('modal_eliminar_equipo'), `
    <p style="font-size:0.92rem;">${tr('confirm_del_team', { name: escapeHtml(team.name) })}</p>
  `, `
    <button class="btn" id="del-team-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-danger" id="del-team-confirm"><i class="ti ti-trash"></i> ${tr('btn_eliminar')}</button>
  `);
  document.getElementById('del-team-cancel').onclick = closeModal;
  document.getElementById('del-team-confirm').onclick = async () => {
    await deleteTeamDB(teamId);
    renderAdminPanel();
    closeModal();
    toast(tr('toast_equipo_eliminado'));
  };
}

function openAddPlayerModal(teamId) {
  const team = getTeamById(teamId);
  const overlay = openModal(tr('modal_add_player_to', { name: escapeHtml(team.name) }), `
    <div class="field">
      <label>${tr('label_nombre_jugador')}</label>
      <input type="text" id="player-name-input" placeholder="${tr('ph_jugador')}">
    </div>
    <div class="field-error" id="player-name-error" style="display:none;">${tr('err_nombre_valido')}</div>
  `, `
    <button class="btn" id="player-form-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="player-form-save"><i class="ti ti-plus"></i> ${tr('btn_agregar')}</button>
  `);
  document.getElementById('player-form-cancel').onclick = closeModal;
  const save = async () => {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (!name) { document.getElementById('player-name-error').style.display = 'block'; return; }
    const updated = { ...team, players: [...(team.players || []), { id: uid('pl'), name, position: null }] };
    await persistTeam(updated);
    renderAdminPanel();
    closeModal();
    toast(tr('toast_jugador_agregado'));
  };
  document.getElementById('player-form-save').onclick = save;
  document.getElementById('player-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  setTimeout(() => document.getElementById('player-name-input').focus(), 100);
}

async function removePlayer(teamId, playerId) {
  const team = getTeamById(teamId);
  if (!team) return;
  const updated = { ...team, players: (team.players || []).filter(p => p.id !== playerId) };
  await persistTeam(updated);
  renderAdminPanel();
  toast(tr('toast_jugador_eliminado'));
}

/* -------------------- ADMIN: RESULTADOS -------------------- */

function adminPanelResultados() {
  if (State.data.teams.length < 2) {
    return emptyState('ti-alert-triangle', tr('resultados_need_teams'));
  }
  if (!State.data.matches.length) {
    return emptyState('ti-clipboard-off', tr('resultados_no_comp'));
  }

  const isCopa = State.data.settings.competitionFormat === 'copa';
  const pending = State.data.matches.filter(m => !m.played && !m.isBye);
  const played = State.data.matches.filter(m => m.played).sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));

  return `
    ${!isCopa ? `
      <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
        <button class="btn btn-primary" id="btn-new-match"><i class="ti ti-plus"></i> ${tr('btn_cargar_partido')}</button>
      </div>
    ` : `<div class="mini-note" style="margin-bottom:1rem;"><i class="ti ti-info-circle"></i> ${tr('copa_note')}</div>`}

    ${pending.length ? `
      <h3 style="font-family:var(--font-display); font-size:1rem; margin-bottom:0.6rem;">${tr('resultados_pendientes')}</h3>
      <div style="display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1.5rem;">
        ${pending.map(m => pendingMatchRow(m)).join('')}
      </div>
    ` : ''}

    ${played.length ? `
      <h3 style="font-family:var(--font-display); font-size:1rem; margin-bottom:0.6rem;">${tr('resultados_finalizados')}</h3>
      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        ${played.filter(m => !m.isBye).map(m => playedMatchRow(m)).join('')}
      </div>
    ` : (!pending.length ? emptyState('ti-clipboard-off', tr('no_pendientes')) : '')}
  `;
}

function pendingMatchRow(m) {
  const home = getTeamById(m.homeId), away = getTeamById(m.awayId);
  if (!home || !away) return '';
  return `<div class="card" style="padding:0.8rem 1rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
    <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; background:var(--bg-surface-2); padding:0.2rem 0.5rem; border-radius:6px;">${tr('fecha_badge', { n: (m.round || 1) })}</span>
    <span style="flex:1; font-weight:600; min-width:160px;">${escapeHtml(home.name)} vs ${escapeHtml(away.name)}</span>
    <button class="btn btn-sm btn-primary btn-load-result" data-match="${m.id}"><i class="ti ti-clipboard-check"></i> ${tr('btn_cargar_resultado')}</button>
    <button class="btn btn-icon btn-danger btn-delete-match" data-match="${m.id}"><i class="ti ti-trash"></i></button>
  </div>`;
}

function playedMatchRow(m) {
  const home = getTeamById(m.homeId), away = getTeamById(m.awayId);
  if (!home || !away) return '';
  return `<div class="card" style="padding:0.8rem 1rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
    <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; background:var(--bg-surface-2); padding:0.2rem 0.5rem; border-radius:6px;">${tr('fecha_badge', { n: (m.round || 1) })}</span>
    <span style="flex:1; font-weight:600; min-width:160px;">${escapeHtml(home.name)} <strong style="color:var(--accent-dark)">${m.homeScore} - ${m.awayScore}</strong> ${escapeHtml(away.name)}</span>
    <button class="btn btn-sm btn-load-result" data-match="${m.id}"><i class="ti ti-edit"></i> ${tr('btn_editar')}</button>
    <button class="btn btn-icon btn-danger btn-delete-match" data-match="${m.id}"><i class="ti ti-trash"></i></button>
  </div>`;
}

function attachResultadosEvents() {
  const btnNew = document.getElementById('btn-new-match');
  if (btnNew) btnNew.onclick = () => openNewMatchModal();
  document.querySelectorAll('.btn-load-result').forEach(b => b.onclick = () => openResultFormModal(b.dataset.match));
  document.querySelectorAll('.btn-delete-match').forEach(b => b.onclick = () => confirmDeleteMatch(b.dataset.match));
}

function openNewMatchModal() {
  const teams = State.data.teams;
  const overlay = openModal(tr('modal_cargar_partido'), `
    <div class="field">
      <label>${tr('label_fecha_jornada')}</label>
      <input type="number" id="new-match-round" min="1" value="1">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${tr('label_local')}</label>
        <select id="new-match-home">${teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>${tr('label_visitante')}</label>
        <select id="new-match-away">${teams.map((t, i) => `<option value="${t.id}" ${i === 1 ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="field-error" id="new-match-error" style="display:none;">${tr('err_two_teams')}</div>
  `, `
    <button class="btn" id="new-match-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="new-match-save"><i class="ti ti-plus"></i> ${tr('btn_crear_partido')}</button>
  `);
  document.getElementById('new-match-cancel').onclick = closeModal;
  document.getElementById('new-match-save').onclick = async () => {
    const round = Number(document.getElementById('new-match-round').value) || 1;
    const homeId = document.getElementById('new-match-home').value;
    const awayId = document.getElementById('new-match-away').value;
    if (homeId === awayId) { document.getElementById('new-match-error').style.display = 'block'; return; }
    const match = { id: uid('match'), round, homeId, awayId, homeScore: 0, awayScore: 0, played: false, stats: {}, competitionFormat: 'liga' };
    await persistMatch(match);
    renderAdminPanel();
    closeModal();
    toast(tr('toast_partido_creado'));
  };
}

function confirmDeleteMatch(matchId) {
  openModal(tr('modal_eliminar_partido'), `<p style="font-size:0.92rem;">${tr('confirm_del_match')}</p>`, `
    <button class="btn" id="del-match-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-danger" id="del-match-confirm"><i class="ti ti-trash"></i> ${tr('btn_eliminar')}</button>
  `);
  document.getElementById('del-match-cancel').onclick = closeModal;
  document.getElementById('del-match-confirm').onclick = async () => {
    await deleteMatchDB(matchId);
    renderAdminPanel();
    closeModal();
    toast(tr('toast_partido_eliminado'));
  };
}

let alineacionPartidoActual = {}; // { playerId: 'titular' | 'suplente' }
let posicionesPartidoActual = {}; // { playerId: 'gk' | 'def' | 'mid' | 'fwd' }

function openResultFormModal(matchId) {
  const m = State.data.matches.find(x => x.id === matchId);
  if (!m) return;
  const home = getTeamById(m.homeId), away = getTeamById(m.awayId);
  if (!home || !away) return;

  // Precargar alineación existente (si ya se había guardado antes) o vacía
  alineacionPartidoActual = m.lineup ? { ...m.lineup } : {};
  posicionesPartidoActual = m.lineupPositions ? { ...m.lineupPositions } : {};

  renderLineupStepModal(m, home, away);
}

function contarTitulares(teamPlayers) {
  return teamPlayers.filter(p => alineacionPartidoActual[p.id] === 'titular').length;
}

function posicionActualDeJugador(p) {
  return posicionesPartidoActual[p.id] || p.position || '';
}

function renderLineupStepModal(m, home, away) {
  const renderTeamLineup = (team, side) => {
    const players = team.players || [];
    if (!players.length) {
      return `<p style="color:var(--text-muted); font-size:0.82rem; padding:0.5rem 0;">${tr('team_no_players')}</p>`;
    }
    const titularesCount = contarTitulares(players);
    return `
      <div style="margin-bottom:0.5rem; display:flex; align-items:center; justify-content:space-between;">
        <span style="font-weight:700; font-size:0.9rem;">${escapeHtml(team.name)}</span>
        <span style="font-size:0.74rem; color: ${titularesCount > 6 ? 'var(--loss)' : 'var(--text-muted)'}; font-weight:600;">${tr('titulares_count', { n: titularesCount })}</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:320px; overflow-y:auto; padding-right:0.25rem;">
        ${players.map(p => {
          const estado = alineacionPartidoActual[p.id] || 'no-jugo';
          const jugoEstePartido = estado === 'titular' || estado === 'suplente';
          const posActual = posicionActualDeJugador(p);
          return `<div style="background:var(--bg-surface-2); border-radius:8px; padding:0.5rem 0.6rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="flex:1; font-size:0.84rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.name)}</span>
              <div style="display:flex; gap:0.3rem; flex-shrink:0;">
                <button type="button" class="lineup-btn lineup-titular ${estado === 'titular' ? 'active' : ''}" data-player="${p.id}" data-team-side="${side}" data-estado="titular">${tr('btn_titular')}</button>
                <button type="button" class="lineup-btn lineup-suplente ${estado === 'suplente' ? 'active' : ''}" data-player="${p.id}" data-team-side="${side}" data-estado="suplente">${tr('btn_suplente')}</button>
              </div>
            </div>
            ${jugoEstePartido ? `
              <div style="margin-top:0.4rem; display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.68rem; color:var(--text-muted); flex-shrink:0;">${tr('label_posicion')}</span>
                <select class="posicion-select" data-player="${p.id}" style="flex:1; font-size:0.78rem; padding:0.3rem 0.4rem; border-radius:6px; border:0.5px solid var(--border-strong); background:var(--bg-surface); color:var(--text-primary);">
                  <option value="">${tr('pos_sin_especificar')}</option>
                  ${POSITION_KEYS.map(pos => `<option value="${pos}" ${posActual === pos ? 'selected' : ''}>${positionLabel(pos)}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>`;
        }).join('')}
      </div>
    `;
  };

  const overlay = openModal(`${escapeHtml(home.name)} vs ${escapeHtml(away.name)}`, `
    <div class="mini-note" style="margin-bottom:1rem;"><i class="ti ti-users"></i> ${tr('lineup_note')}</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="lineup-grid">
      <div>${renderTeamLineup(home, 'home')}</div>
      <div>${renderTeamLineup(away, 'away')}</div>
    </div>
    <style>@media (max-width:520px){ .lineup-grid{ grid-template-columns:1fr !important; } }</style>
  `, `
    <button class="btn" id="lineup-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="lineup-continue"><i class="ti ti-arrow-right"></i> ${tr('btn_continuar_stats')}</button>
  `);

  const attachLineupEvents = () => {
    overlay.querySelectorAll('.lineup-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.player;
        const estado = btn.dataset.estado;
        const teamSide = btn.dataset.teamSide;
        const team = teamSide === 'home' ? home : away;

        if (alineacionPartidoActual[pid] === estado) {
          // Toggle off si tocan el mismo botón activo
          delete alineacionPartidoActual[pid];
        } else {
          if (estado === 'titular' && contarTitulares(team.players || []) >= 6) {
            toast(tr('toast_6_titulares'), 'error');
            return;
          }
          alineacionPartidoActual[pid] = estado;
        }
        document.getElementById('lineup-body-home').innerHTML = renderTeamLineup(home, 'home');
        document.getElementById('lineup-body-away').innerHTML = renderTeamLineup(away, 'away');
        attachLineupEvents();
      };
    });
    overlay.querySelectorAll('.posicion-select').forEach(sel => {
      sel.onchange = () => {
        const pid = sel.dataset.player;
        if (sel.value) posicionesPartidoActual[pid] = sel.value;
        else delete posicionesPartidoActual[pid];
      };
    });
  };

  // Envolver cada columna con un id para poder re-renderizarla
  const bodyDiv = overlay.querySelector('.modal-body');
  const cols = bodyDiv.querySelectorAll('.lineup-grid > div');
  if (cols[0]) cols[0].id = 'lineup-body-home';
  if (cols[1]) cols[1].id = 'lineup-body-away';
  attachLineupEvents();

  document.getElementById('lineup-cancel').onclick = closeModal;
  document.getElementById('lineup-continue').onclick = () => {
    const jugadoresSeleccionados = Object.keys(alineacionPartidoActual).length;
    if (jugadoresSeleccionados === 0) {
      openModal(tr('continuar_sin_alineacion'), `<p style="font-size:0.9rem;">${tr('no_lineup_desc')}</p>`, `
        <button class="btn" id="no-lineup-back">${tr('btn_volver')}</button>
        <button class="btn btn-primary" id="no-lineup-continue">${tr('continuar_igual')}</button>
      `);
      document.getElementById('no-lineup-back').onclick = () => renderLineupStepModal(m, home, away);
      document.getElementById('no-lineup-continue').onclick = () => renderStatsStepModal(m, home, away);
      return;
    }
    renderStatsStepModal(m, home, away);
  };
}

function renderStatsStepModal(m, home, away) {
  const jugadoresConvocados = [
    ...(home.players || []).filter(p => alineacionPartidoActual[p.id]).map(p => ({ ...p, teamName: home.name })),
    ...(away.players || []).filter(p => alineacionPartidoActual[p.id]).map(p => ({ ...p, teamName: away.name }))
  ];

  const statsHtml = jugadoresConvocados.length ? jugadoresConvocados.map(p => {
    const s = (m.stats && m.stats[p.id]) || {};
    const posActual = posicionActualDeJugador(p);
    const isGK = posActual === 'gk';
    const esSuplente = alineacionPartidoActual[p.id] === 'suplente';
    return `<div class="card" style="padding:0.7rem 0.85rem; margin-bottom:0.5rem;">
      <div style="font-weight:600; font-size:0.85rem; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
        ${escapeHtml(p.name)}
        <span style="color:var(--text-muted); font-weight:400; font-size:0.76rem;">(${escapeHtml(p.teamName)}${posActual ? ' · ' + positionShort(posActual) : ''})</span>
        <span style="font-size:0.65rem; font-weight:700; padding:0.1rem 0.45rem; border-radius:10px; background: ${esSuplente ? 'var(--bg-surface-2)' : 'rgba(91,155,213,0.15)'}; color: ${esSuplente ? 'var(--text-muted)' : 'var(--accent-dark)'};">${esSuplente ? tr('badge_suplente') : tr('badge_titular')}</span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:0.5rem;">
        <div><label style="font-size:0.68rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${tr('label_goles')}</label><input type="number" min="0" class="stat-input" data-player="${p.id}" data-field="goals" value="${s.goals || 0}" style="width:100%; padding:0.4rem; text-align:center; border-radius:6px; border:0.5px solid var(--border-strong); background:var(--bg-surface);"></div>
        <div><label style="font-size:0.68rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${tr('label_asist')}</label><input type="number" min="0" class="stat-input" data-player="${p.id}" data-field="assists" value="${s.assists || 0}" style="width:100%; padding:0.4rem; text-align:center; border-radius:6px; border:0.5px solid var(--border-strong); background:var(--bg-surface);"></div>
        <div><label style="font-size:0.68rem; color:${isGK ? 'var(--accent-dark)' : 'var(--text-muted)'}; display:block; margin-bottom:0.2rem; font-weight:${isGK ? '700' : '400'};">${tr('label_atajadas')}</label><input type="number" min="0" class="stat-input" data-player="${p.id}" data-field="saves" value="${s.saves || 0}" style="width:100%; padding:0.4rem; text-align:center; border-radius:6px; border:0.5px solid ${isGK ? 'var(--accent-dark)' : 'var(--border-strong)'}; background:var(--bg-surface);"></div>
        <div><label style="font-size:0.68rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${tr('label_t_amar')}</label><input type="number" min="0" max="2" class="stat-input" data-player="${p.id}" data-field="yellow" value="${s.yellow || 0}" style="width:100%; padding:0.4rem; text-align:center; border-radius:6px; border:0.5px solid var(--border-strong); background:var(--bg-surface);"></div>
        <div><label style="font-size:0.68rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">${tr('label_t_roja')}</label><input type="number" min="0" max="1" class="stat-input" data-player="${p.id}" data-field="red" value="${s.red || 0}" style="width:100%; padding:0.4rem; text-align:center; border-radius:6px; border:0.5px solid var(--border-strong); background:var(--bg-surface);"></div>
      </div>
    </div>`;
  }).join('') : `<p style="color:var(--text-muted); font-size:0.85rem;">${tr('stats_no_players')}</p>`;

  const overlay = openModal(`${escapeHtml(home.name)} vs ${escapeHtml(away.name)}`, `
    <div class="result-row">
      <div style="text-align:center;">
        <div style="font-weight:600; font-size:0.85rem; margin-bottom:0.4rem;">${escapeHtml(home.name)}</div>
        <input type="number" min="0" id="score-home" class="score-input" value="${m.homeScore || 0}">
      </div>
      <div style="font-family:var(--font-display); font-weight:700; color:var(--text-muted);">VS</div>
      <div style="text-align:center;">
        <div style="font-weight:600; font-size:0.85rem; margin-bottom:0.4rem;">${escapeHtml(away.name)}</div>
        <input type="number" min="0" id="score-away" class="score-input" value="${m.awayScore || 0}">
      </div>
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; margin: 1rem 0 0.6rem;">
      <h3 style="font-family:var(--font-display); font-size:0.95rem;">${tr('stats_title_modal')}</h3>
      <button class="btn btn-sm" id="back-to-lineup"><i class="ti ti-arrow-left"></i> ${tr('btn_editar_alineacion')}</button>
    </div>
    <div style="max-height: 320px; overflow-y:auto; padding-right:0.25rem;">${statsHtml}</div>
    <div class="mini-note"><i class="ti ti-info-circle"></i> ${tr('stats_note')}</div>
  `, `
    <button class="btn" id="result-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-primary" id="result-save"><i class="ti ti-device-floppy"></i> ${tr('btn_guardar_resultado')}</button>
  `);

  document.getElementById('back-to-lineup').onclick = () => renderLineupStepModal(m, home, away);
  document.getElementById('result-cancel').onclick = closeModal;
  document.getElementById('result-save').onclick = async () => {
    const homeScore = Number(document.getElementById('score-home').value) || 0;
    const awayScore = Number(document.getElementById('score-away').value) || 0;

    if (m.bracket && homeScore === awayScore) {
      toast(tr('toast_empate_copa'), 'error');
      return;
    }

    const stats = {};
    overlay.querySelectorAll('.stat-input').forEach(inp => {
      const pid = inp.dataset.player, field = inp.dataset.field;
      if (!stats[pid]) stats[pid] = { goals: 0, assists: 0, saves: 0, yellow: 0, red: 0 };
      stats[pid][field] = Number(inp.value) || 0;
    });
    const updated = { ...m, homeScore, awayScore, played: true, playedAt: Date.now(), stats, lineup: { ...alineacionPartidoActual }, lineupPositions: { ...posicionesPartidoActual } };
    await persistMatch(updated);

    // Guardar la posición elegida en la ficha del jugador, para recordarla la próxima vez
    for (const team of [home, away]) {
      let cambioEnEquipo = false;
      const nuevosJugadores = (team.players || []).map(p => {
        if (posicionesPartidoActual[p.id] && posicionesPartidoActual[p.id] !== p.position) {
          cambioEnEquipo = true;
          return { ...p, position: posicionesPartidoActual[p.id] };
        }
        return p;
      });
      if (cambioEnEquipo) {
        await persistTeam({ ...team, players: nuevosJugadores });
      }
    }

    renderAdminPanel();
    closeModal();
    toast(tr('toast_resultado_guardado'));
    if (m.bracket) {
      await maybeAdvanceCopaRounds();
    }
  };
}

/* -------------------- ADMIN: SORTEO DE FIXTURE -------------------- */

function generateRoundRobin(teamIds, ida_vuelta) {
  let teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null); // bye
  const n = teams.length;
  const rounds = [];
  const half = n / 2;
  let arr = [...teams];

  for (let r = 0; r < n - 1; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a !== null && b !== null) {
        // Alternar local/visitante para variar
        if (r % 2 === 0) roundMatches.push([a, b]);
        else roundMatches.push([b, a]);
      }
    }
    rounds.push(roundMatches);
    // Rotar (fijo el primero, rota el resto)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }

  if (ida_vuelta) {
    const secondLeg = rounds.map(round => round.map(([a, b]) => [b, a]));
    return [...rounds, ...secondLeg];
  }
  return rounds;
}

let sorteoFormatoElegido = null; // 'liga' | 'copa'

function adminPanelSorteo() {
  const teams = State.data.teams;
  const hasMatches = State.data.matches.length > 0;
  const currentFormat = State.data.settings.competitionFormat;

  if (teams.length < 2) {
    return emptyState('ti-alert-triangle', tr('sorteo_need_teams'));
  }

  return `
    ${currentFormat ? `<div class="mini-note" style="margin-bottom:1rem;"><i class="ti ti-info-circle"></i> ${tr('competencia_activa')} <strong style="margin-left:4px;">${currentFormat === 'copa' ? tr('copa_fmt') : tr('liga_fmt')}</strong></div>` : ''}

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:0.85rem; margin-bottom:1.25rem;">
      <button class="card format-choice-btn" data-format="liga" style="padding:1.25rem; text-align:left; border-width:0.5px;">
        <i class="ti ti-table" style="font-size:1.5rem; color:var(--accent-dark);"></i>
        <div style="font-family:var(--font-display); font-weight:700; font-size:1.05rem; margin-top:0.5rem;">Liga</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">${tr('sorteo_liga_desc')}</div>
      </button>
      <button class="card format-choice-btn" data-format="copa" style="padding:1.25rem; text-align:left; border-width:0.5px;">
        <i class="ti ti-trophy" style="font-size:1.5rem; color:var(--gold);"></i>
        <div style="font-family:var(--font-display); font-weight:700; font-size:1.05rem; margin-top:0.5rem;">Copa</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">${tr('sorteo_copa_desc')}</div>
      </button>
    </div>

    <div id="sorteo-formato-detalle"></div>
  `;
}

function attachSorteoEvents() {
  document.querySelectorAll('.format-choice-btn').forEach(btn => {
    btn.onclick = () => {
      sorteoFormatoElegido = btn.dataset.format;
      document.querySelectorAll('.format-choice-btn').forEach(b => b.style.borderColor = (b === btn ? 'var(--accent-dark)' : 'var(--border)'));
      renderSorteoDetalle();
    };
  });
}

function renderSorteoDetalle() {
  const el = document.getElementById('sorteo-formato-detalle');
  if (!el) return;
  const teams = State.data.teams;
  const hasMatches = State.data.matches.length > 0;

  if (sorteoFormatoElegido === 'liga') {
    el.innerHTML = `
      <div class="card" style="padding:1.25rem;">
        <h3 style="font-family:var(--font-display); font-size:1.05rem; margin-bottom:0.4rem;">${tr('config_liga')}</h3>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${tr('sorteo_liga_p', { n: teams.length })}</p>
        <div class="field">
          <label>${tr('label_nombre_comp')}</label>
          <input type="text" id="liga-nombre-input" value="${escapeHtml(State.data.settings.competitionName || State.data.settings.leagueName)}" placeholder="${tr('ph_liga_nombre')}">
        </div>
        <div class="field">
          <label>${tr('label_formato_partidos')}</label>
          <select id="sorteo-formato-liga">
            <option value="ida">${tr('opt_solo_ida')}</option>
            <option value="idavuelta">${tr('opt_idavuelta')}</option>
          </select>
        </div>
        ${hasMatches ? `<div class="mini-note"><i class="ti ti-alert-triangle"></i> ${tr('nota_reemplaza')}</div>` : ''}
        <div style="margin-top:1rem;">
          <button class="btn btn-gold btn-block" id="btn-sortear-liga"><i class="ti ti-arrows-shuffle"></i> ${tr('btn_sortear_liga')}</button>
        </div>
      </div>
    `;
    document.getElementById('btn-sortear-liga').onclick = doSorteoLiga;
  } else if (sorteoFormatoElegido === 'copa') {
    const isPowerOfTwo = teams.length >= 2 && (teams.length & (teams.length - 1)) === 0;
    el.innerHTML = `
      <div class="card" style="padding:1.25rem;">
        <h3 style="font-family:var(--font-display); font-size:1.05rem; margin-bottom:0.4rem;">${tr('config_copa')}</h3>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${tr('sorteo_copa_p', { n: teams.length })}</p>
        <div class="field">
          <label>${tr('label_nombre_comp')}</label>
          <input type="text" id="copa-nombre-input" value="${escapeHtml(State.data.settings.competitionName || '')}" placeholder="${tr('ph_copa_nombre')}">
        </div>
        ${!isPowerOfTwo ? `<div class="mini-note"><i class="ti ti-info-circle"></i> ${tr('copa_bye_note', { n: teams.length })}</div>` : ''}
        ${hasMatches ? `<div class="mini-note"><i class="ti ti-alert-triangle"></i> ${tr('nota_reemplaza_copa')}</div>` : ''}
        <div style="margin-top:1rem;">
          <button class="btn btn-gold btn-block" id="btn-sortear-copa"><i class="ti ti-arrows-shuffle"></i> ${tr('btn_sortear_copa')}</button>
        </div>
      </div>
    `;
    document.getElementById('btn-sortear-copa').onclick = doSorteoCopa;
  } else {
    el.innerHTML = '';
  }
}

async function doSorteoLiga() {
  const teams = State.data.teams;
  const nombre = document.getElementById('liga-nombre-input').value.trim() || State.data.settings.leagueName;
  const formato = document.getElementById('sorteo-formato-liga').value;
  const ida_vuelta = formato === 'idavuelta';
  const teamIds = teams.map(t => t.id);
  const rounds = generateRoundRobin(teamIds, ida_vuelta);

  const previewHtml = rounds.map((roundMatches, idx) => `
    <div class="draw-match" style="flex-direction:column; align-items:stretch; gap:0.3rem; padding:0.6rem 0;">
      <div style="font-size:0.72rem; color:var(--uy-sky-light); font-weight:700; margin-bottom:0.2rem;">${tr('fecha_badge', { n: idx + 1 })}</div>
      ${roundMatches.map(([h, a]) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.2rem 0;"><span>${escapeHtml(getTeamById(h).name)}</span><span class="draw-vs">vs</span><span>${escapeHtml(getTeamById(a).name)}</span></div>`).join('')}
    </div>
  `).join('');

  openModal(tr('confirmar_sorteo_liga'), `
    <p style="font-size:0.88rem; margin-bottom:1rem; color:var(--text-secondary);">${tr('sorteo_liga_confirm_p', { n: rounds.length, m: rounds.reduce((s, r) => s + r.length, 0) })}</p>
    <div class="draw-result-card" style="max-height:320px; overflow-y:auto;">
      <div class="draw-result-title">${tr('vista_previa')}</div>
      ${previewHtml}
    </div>
  `, `
    <button class="btn" id="sorteo-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-gold" id="sorteo-confirm"><i class="ti ti-check"></i> Confirmar y guardar</button>
  `);
  document.getElementById('sorteo-cancel').onclick = closeModal;
  document.getElementById('sorteo-confirm').onclick = async () => {
    for (const m of State.data.matches) await deleteMatchDB(m.id);
    const newMatches = [];
    rounds.forEach((roundMatches, idx) => {
      roundMatches.forEach(([homeId, awayId]) => {
        newMatches.push({ id: uid('match'), round: idx + 1, homeId, awayId, homeScore: 0, awayScore: 0, played: false, stats: {}, bracket: false, competitionFormat: 'liga' });
      });
    });
    for (const m of newMatches) await persistMatch(m);
    State.data.settings.competitionFormat = 'liga';
    State.data.settings.competitionName = nombre;
    await persistSettings();
    renderAdminPanel();
    closeModal();
    toast(tr('toast_liga_sorteada', { n: rounds.length, m: newMatches.length }));
    renderAdminPanel();
  };
}

/* -------------------- COPA: generacion de bracket -------------------- */

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function generateCopaBracket(teamIds) {
  // Baraja los equipos
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const bracketSize = nextPowerOfTwo(shuffled.length);
  const byesNeeded = bracketSize - shuffled.length;
  // Rellenar con null (bye) distribuido al final
  const slots = [...shuffled];
  for (let i = 0; i < byesNeeded; i++) slots.push(null);

  // Ronda 1: emparejar de a 2
  const round1 = [];
  for (let i = 0; i < slots.length; i += 2) {
    round1.push([slots[i], slots[i + 1]]);
  }
  return round1; // array de [teamIdA, teamIdB|null]
}

async function doSorteoCopa() {
  const teams = State.data.teams;
  const nombre = document.getElementById('copa-nombre-input').value.trim() || 'Copa PSO Uruguay';
  const teamIds = teams.map(t => t.id);
  const round1Pairs = generateCopaBracket(teamIds);
  const totalRounds = Math.log2(nextPowerOfTwo(teamIds.length));

  const previewHtml = round1Pairs.map(([a, b]) => {
    const teamA = a ? getTeamById(a).name : tr('bye_libre');
    const teamB = b ? getTeamById(b).name : tr('bye_libre');
    return `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.35rem 0; border-bottom:0.5px solid rgba(255,255,255,0.08);"><span>${escapeHtml(teamA)}</span><span class="draw-vs">vs</span><span>${escapeHtml(teamB)}</span></div>`;
  }).join('');

  openModal(tr('confirmar_sorteo_copa'), `
    <p style="font-size:0.88rem; margin-bottom:1rem; color:var(--text-secondary);">${tr('sorteo_copa_confirm_p', { n: totalRounds })}</p>
    <div class="draw-result-card" style="max-height:320px; overflow-y:auto;">
      <div class="draw-result-title">${tr('llaves_ronda1')}</div>
      ${previewHtml}
    </div>
  `, `
    <button class="btn" id="sorteo-cancel">${tr('btn_cancel')}</button>
    <button class="btn btn-gold" id="sorteo-confirm"><i class="ti ti-check"></i> Confirmar y guardar</button>
  `);
  document.getElementById('sorteo-cancel').onclick = closeModal;
  document.getElementById('sorteo-confirm').onclick = async () => {
    for (const m of State.data.matches) await deleteMatchDB(m.id);

    const newMatches = [];
    round1Pairs.forEach(([homeId, awayId], idx) => {
      // Si hay bye, el partido ya se marca jugado automáticamente y avanza el equipo presente
      const hasBye = !homeId || !awayId;
      newMatches.push({
        id: uid('match'), round: 1, bracket: true, bracketRound: 1, bracketSlot: idx,
        homeId: homeId || null, awayId: awayId || null,
        homeScore: hasBye && homeId ? 1 : 0, awayScore: hasBye && awayId ? 1 : 0,
        played: hasBye, isBye: hasBye, stats: {},
        totalBracketRounds: totalRounds, competitionFormat: 'copa'
      });
    });
    for (const m of newMatches) await persistMatch(m);

    State.data.settings.competitionFormat = 'copa';
    State.data.settings.competitionName = nombre;
    await persistSettings();
    renderAdminPanel();
    closeModal();
    toast(tr('toast_copa_sorteada', { n: newMatches.length }));
    renderAdminPanel();
    await maybeAdvanceCopaRounds();
  };
}

/* Avanza rondas de copa automáticamente cuando toda la ronda actual está jugada */
async function maybeAdvanceCopaRounds() {
  if (State.data.settings.competitionFormat !== 'copa') return;
  const bracketMatches = State.data.matches.filter(m => m.bracket);
  if (!bracketMatches.length) return;

  const maxRound = Math.max(...bracketMatches.map(m => m.bracketRound || 1));
  const totalRounds = bracketMatches[0].totalBracketRounds || maxRound;
  const currentRoundMatches = bracketMatches.filter(m => m.bracketRound === maxRound);

  const allPlayed = currentRoundMatches.every(m => m.played);
  if (!allPlayed) return;

  // Si es la ronda final y ya se jugó, declarar campeón
  if (maxRound >= totalRounds || currentRoundMatches.length === 1) {
    const finalMatch = currentRoundMatches[0];
    if (finalMatch && finalMatch.played && !finalMatch.championDeclared) {
      const winnerId = Number(finalMatch.homeScore) > Number(finalMatch.awayScore) ? finalMatch.homeId : finalMatch.awayId;
      if (winnerId) {
        await declareChampion(winnerId);
        const updatedFinal = { ...finalMatch, championDeclared: true };
        await persistMatch(updatedFinal);
      }
    }
    return;
  }

  // Ya existe la siguiente ronda generada?
  const nextRoundExists = bracketMatches.some(m => m.bracketRound === maxRound + 1);
  if (nextRoundExists) return;

  // Generar la siguiente ronda emparejando ganadores en orden de slot
  const winners = currentRoundMatches
    .sort((a, b) => a.bracketSlot - b.bracketSlot)
    .map(m => {
      if (m.isBye) return m.homeId || m.awayId;
      return Number(m.homeScore) > Number(m.awayScore) ? m.homeId : m.awayId;
    });

  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    const homeId = winners[i], awayId = winners[i + 1] || null;
    const hasBye = !homeId || !awayId;
    nextMatches.push({
      id: uid('match'), round: maxRound + 1, bracket: true, bracketRound: maxRound + 1, bracketSlot: i / 2,
      homeId: homeId || null, awayId: awayId || null,
      homeScore: hasBye && homeId ? 1 : 0, awayScore: hasBye && awayId ? 1 : 0,
      played: hasBye, isBye: hasBye, stats: {},
      totalBracketRounds: totalRounds, competitionFormat: 'copa'
    });
  }
  for (const m of nextMatches) await persistMatch(m);
  renderAdminPanel();
  toast(tr('toast_ronda_generada', { n: maxRound + 1 }));

  // Si la nueva ronda también tiene todos bye (raro pero posible), seguir avanzando
  await maybeAdvanceCopaRounds();
}

async function declareChampion(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;
  const title = {
    competitionName: State.data.settings.competitionName || 'Competencia',
    format: State.data.settings.competitionFormat,
    year: State.data.settings.season
  };
  const updated = { ...team, titles: [...(team.titles || []), title] };
  await persistTeam(updated);
  toast(tr('toast_campeon', { team: team.name, comp: title.competitionName }));
}

/* -------------------- ADMIN: CONFIGURACION -------------------- */

function adminPanelConfig() {
  const isLiga = State.data.settings.competitionFormat === 'liga';
  const standings = isLiga ? computeStandings() : [];

  return `
    <div class="card" style="padding:1.25rem; max-width: 480px;">
      <h3 style="font-family:var(--font-display); font-size:1.05rem; margin-bottom:1rem;">${tr('datos_liga')}</h3>
      <div class="field">
        <label>${tr('label_nombre_liga')}</label>
        <input type="text" id="config-league-name" value="${escapeHtml(State.data.settings.leagueName)}">
      </div>
      <div class="field">
        <label>${tr('label_temporada')}</label>
        <input type="text" id="config-season" value="${escapeHtml(State.data.settings.season)}">
      </div>
      <button class="btn btn-primary" id="btn-save-config"><i class="ti ti-device-floppy"></i> ${tr('btn_guardar_cambios')}</button>
    </div>

    ${isLiga && standings.length ? `
      <div class="card" style="padding:1.25rem; max-width: 480px; margin-top:1.25rem;">
        <h3 style="font-family:var(--font-display); font-size:1.05rem; margin-bottom:0.5rem;">${tr('declarar_campeon')}</h3>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">${tr('declarar_campeon_p')}</p>
        <div class="field">
          <label>${tr('label_equipo_campeon')}</label>
          <select id="config-champion-select">
            ${standings.map((t, i) => `<option value="${t.id}" ${i === 0 ? 'selected' : ''}>${i === 0 ? '👑 ' : ''}${escapeHtml(t.name)} (${t.pts} pts)</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-gold btn-block" id="btn-declare-champion"><i class="ti ti-trophy"></i> ${tr('btn_declarar_campeon')}</button>
      </div>
    ` : ''}

    <div class="card" style="padding:1.25rem; max-width: 480px; margin-top:1.25rem; border-color: rgba(211,69,91,0.3);">
      <h3 style="font-family:var(--font-display); font-size:1.05rem; margin-bottom:0.5rem; color:var(--loss);">${tr('zona_riesgo')}</h3>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">${tr('zona_riesgo_p')}</p>
      <button class="btn btn-danger" id="btn-reset-all"><i class="ti ti-alert-triangle"></i> ${tr('btn_reset_all')}</button>
    </div>
  `;
}

function attachConfigEvents() {
  document.getElementById('btn-save-config').onclick = async () => {
    State.data.settings.leagueName = document.getElementById('config-league-name').value.trim() || 'Pro Soccer Online Uruguay';
    State.data.settings.season = document.getElementById('config-season').value.trim() || '2026';
    await persistSettings();
    renderShell();
    switchTab('admin');
    State.currentAdminTab = 'config';
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === 'config'));
    renderAdminPanel();
    toast(tr('toast_config_guardada'));
  };

  const btnChampion = document.getElementById('btn-declare-champion');
  if (btnChampion) {
    btnChampion.onclick = () => {
      const teamId = document.getElementById('config-champion-select').value;
      const team = getTeamById(teamId);
      openModal(tr('confirmar_campeon'), `<p style="font-size:0.9rem;">${tr('confirmar_campeon_p', { team: escapeHtml(team.name), liga: escapeHtml(State.data.settings.leagueName), season: escapeHtml(State.data.settings.season) })}</p>`, `
        <button class="btn" id="champ-cancel">${tr('btn_cancel')}</button>
        <button class="btn btn-gold" id="champ-confirm"><i class="ti ti-trophy"></i> ${tr('btn_confirmar_titulo')}</button>
      `);
      document.getElementById('champ-cancel').onclick = closeModal;
      document.getElementById('champ-confirm').onclick = async () => {
        const title = { competitionName: State.data.settings.leagueName, format: 'liga', year: State.data.settings.season };
        const updated = { ...team, titles: [...(team.titles || []), title] };
        await persistTeam(updated);
        closeModal();
        toast(tr('toast_campeon_sumado', { team: team.name }));
        renderAdminPanel();
      };
    };
  }

  document.getElementById('btn-reset-all').onclick = () => {
    openModal(tr('reiniciar_liga_title'), `<p style="font-size:0.9rem;">${tr('reiniciar_liga_p')}</p>`, `
      <button class="btn" id="reset-cancel">${tr('btn_cancel')}</button>
      <button class="btn btn-danger" id="reset-confirm"><i class="ti ti-trash"></i> ${tr('btn_si_reiniciar')}</button>
    `);
    document.getElementById('reset-cancel').onclick = closeModal;
    document.getElementById('reset-confirm').onclick = async () => {
      for (const t of [...State.data.teams]) await deleteTeamDB(t.id);
      for (const m of [...State.data.matches]) await deleteMatchDB(m.id);
      State.data.settings.competitionFormat = null;
      State.data.settings.competitionName = '';
      await persistSettings();
      renderAdminPanel();
      closeModal();
      toast(tr('toast_liga_reiniciada'));
      renderAdminPanel();
    };
  };
}