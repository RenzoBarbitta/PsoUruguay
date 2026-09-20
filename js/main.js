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
  syncLangUI();
  renderShell();
  renderMainContent();

  await initDB();

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
      if (TriviaState.jugando) return; // no interrumpir una partida de trivia en curso
      if (PasapalabraState.jugando) return; // no interrumpir la rosca en curso
      if (PenalesState.jugando) return; // no interrumpir la tanda de penales
      await refreshFromStorage();
    }, 8000);
  }
}

document.addEventListener('DOMContentLoaded', initApp);