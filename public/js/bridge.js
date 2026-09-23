/* ======================================================================
   PSO URUGUAY - PUENTE DE EVENTOS (bridge)
   Conecta la capa legacy (scripts clásicos de datos/lógica que siguen en
   public/js) con la app React. Expone stubs globales que la capa legacy
   llama en runtime y los convierte en eventos del bus psoBus que React
   escucha, evitando reescribir la lógica de datos/negocio.
   ====================================================================== */

window.psoBus = (() => {
  const listeners = {};
  return {
    on(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      return () => {
        const arr = listeners[type] || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      };
    },
    emit(type, payload) {
      (listeners[type] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.error('[psoBus]', type, e); }
      });
    }
  };
})();

/* Stubs que los scripts legacy (state.js, auth.js, i18n.js) llaman en
   runtime. Todos se convierten en eventos del bus; React reacciona. */
window.toast = (msg, type = 'success') => window.psoBus.emit('toast', { msg: String(msg), type });
window.renderAll = () => window.psoBus.emit('data-updated');
window.renderShell = () => window.psoBus.emit('shell-updated');
window.renderMainContent = () => window.psoBus.emit('content-updated');
window.switchTab = (tab) => window.psoBus.emit('switch-tab', { tab });

/* Modales DOM legacy: la app ya no los usa (React maneja los modales).
   Se dejan como no-op seguros para que nada truene si algún resto de la
   capa legacy los invoca por error. */
window.openModal = () => ({});
window.closeModal = () => {};

window.escapeHtml = (str) => {
  const s = String(str == null ? '' : str);
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

/* Tema global: en el legacy vivía en ui.js (ya no se carga). React y los
   componentes lo llaman para aplicar el data-theme sobre <html>. */
window.saveTheme = (() => {
  const apply = () => {
    const t = (typeof State !== 'undefined' && State.theme) || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    return t;
  };
  try { localStorage.setItem('pso_theme', (typeof State !== 'undefined' && State.theme) || 'dark'); } catch (e) {}
  apply();
  return apply;
})();

/* Registro de estado de minijuegos para que la app React pueda consultar
   las partidas en curso (se puebla desde los componentes React). */
window.PSO_GAMES = window.PSO_GAMES || {
  trivia: { jugando: false },
  pasapalabra: { jugando: false },
  penales: { jugando: false }
};