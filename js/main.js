/* ======================================================================
   PSO URUGUAY - INICIALIZACIÓN
   ====================================================================== */

function setSplashLogo() {
  const img = document.getElementById('splash-logo');
  if (img && window.PSO_LOGO_URL) img.src = window.PSO_LOGO_URL;
}

async function initApp() {
  saveTheme();
  setSplashLogo();
  if (typeof syncLangUI === 'function') {
    syncLangUI();
  } else {
    console.error('[PSO] i18n.js no cargó (syncLangUI ausente). Revisá la ruta js/i18n.js o hacé Ctrl+F5.');
    // Reintento: recargar i18n.js dinámicamente y seguir
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/i18n.js?v=' + Date.now();
        s.onload = resolve;
        s.onerror = () => reject(new Error('no se pudo cargar js/i18n.js'));
        document.head.appendChild(s);
      });
      if (typeof syncLangUI === 'function') syncLangUI();
    } catch (e) {
      console.error('[PSO]', e.message);
    }
  }
  renderShell();
  renderMainContent();

  await initDB();

  /* Si el jugador viene de confirmar el email, trae los tokens en el hash:
     los convertimos en sesión antes de validar nada más. */
  await handleAuthRedirect();

  if (online && authToken()) {
    // Validar que la sesión siga siendo válida en Supabase
    try {
      /* eslint-disable-next-line no-unused-vars */
      const data = await apiRequest('/api/me', { auth: true });
      if (data.user) {
        AuthState.user = data.user;
        localStorage.setItem('pso_user', JSON.stringify(data.user));
      }
    } catch (e) {
      // Token inválido o servidor caído: se mantiene la sesión local que ya estaba
    }
  }

  setTimeout(() => {
    document.getElementById('splash').classList.add('closing');
    document.getElementById('app').classList.add('show');
  }, 2050);

  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');
  }, 2700);

  if (online) {
    setInterval(async () => {
      if (document.getElementById('active-modal')) return; // no interrumpir edición en curso
      if (State.isAdmin) return; // el panel admin ya maneja sus propios datos: no pisarlo con el auto-refresco
      if (TriviaState.jugando) return; // no interrumpir una partida de trivia en curso
      if (PasapalabraState.jugando) return; // no interrumpir la rosca en curso
      if (PenalesState.jugando) return; // no interrumpir la tanda de penales
      await refreshFromStorage();
    }, 25000);
  }
}

document.addEventListener('DOMContentLoaded', initApp);