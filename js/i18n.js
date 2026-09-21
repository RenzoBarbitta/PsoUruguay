/* ======================================================================
   PSO URUGUAY - INTERNACIONALIZACIÓN
   Diccionarios ES / PT-BR + helpers. Se carga antes que el resto de los
   módulos para que cualquier función pueda usar tr() en tiempo de ejecución.
   ====================================================================== */

const I18N = {
  lang: localStorage.getItem('pso_lang') || 'es',
  dic: {
    /* ------- Meta / SEO ------- */
    meta_title: {
      es: 'PSO Uruguay | Pro Soccer Online Uruguay',
      pt: 'PSO Uruguay | Pro Soccer Online Uruguai'
    },
    meta_desc: {
      es: 'La liga Pro Soccer Online Uruguay: tabla de posiciones, fixture, estadísticas de jugadores, palmarés, trivia futbolera, pasapalabra diario y penales con ranking online. Creá tu cuenta y entrá al ranking de la celeste.',
      pt: 'A liga Pro Soccer Online Uruguai: classificação, calendário, estatísticas de jogadores, títulos, quiz de futebol, Passapalabra diário e pênaltis com ranking online. Crie sua conta e entre para o ranking da Celeste.'
    },
    og_desc: {
      es: 'Liga, estadísticas, trivia futbolera, pasapalabra diario y penales uruguayos con ranking online. ¡Creá tu cuenta y entrá al ranking!',
      pt: 'Liga, estatísticas, quiz de futebol, Passapalabra diário e pênaltis uruguaios com ranking online. Crie sua conta e entre para o ranking!'
    },
    twitter_desc: {
      es: 'Fútbol online uruguayo: liga, estadísticas, trivia, pasapalabra y penales con ranking. ¡Entrá al ranking!',
      pt: 'Futebol online uruguaio: liga, estatísticas, quiz, Passapalabra e pênaltis com ranking. Entre para o ranking!'
    },

    /* ------- Topbar / navegación ------- */
    tab_inicio: { es: 'Inicio', pt: 'Início' },
    tab_fixture: { es: 'Fixture', pt: 'Confrontos' },
    tab_tabla: { es: 'Posiciones', pt: 'Classificação' },
    tab_estadisticas: { es: 'Estadísticas', pt: 'Estatísticas' },
    tab_planteles: { es: 'Planteles', pt: 'Elencos' },
    tab_palmares: { es: 'Palmarés', pt: 'Títulos' },
    tab_seleccion: { es: 'Selección', pt: 'Seleção' },
    tab_juegos: { es: 'Juegos', pt: 'Jogos' },
    juegos_desc_trivia: { es: 'Respondé 8 preguntas y sumá racha al ranking', pt: 'Responda 8 perguntas e some sequência no ranking' },
    juegos_desc_pasapalabra: { es: 'La rosca diaria letra por letra', pt: 'A rosca diária letra por letra' },
    juegos_desc_penales: { es: 'Pateá 10 penales y vencé al arquero', pt: 'Bata 10 pênaltis e vença o goleiro' },
    juegos_hub_sub: { es: 'Elegí tu juego y sumá gloria celeste', pt: 'Escolha seu jogo e some glória celeste' },
    juegos_play: { es: 'Jugar', pt: 'Jogar' },
    juegos_tag_trivia: { es: '⚡ Ranking online', pt: '⚡ Ranking online' },
    juegos_tag_pasapalabra: { es: '📅 Reto diario', pt: '📅 Desafio diário' },
    juegos_tag_penales: { es: '🥅 10 tiros', pt: '🥅 10 chutes' },

    /* ------- Planteles ------- */
    planteles_title: { es: 'Planteles', pt: 'Elencos' },
    planteles_sub: { es: 'Tocá un escudo para ver la ficha del plantel', pt: 'Toque um escudo para ver a ficha do elenco' },
    planteles_empty: { es: 'Todavía no hay equipos cargados.', pt: 'Ainda não há equipes cadastradas.' },
    planteles_volver: { es: 'Volver a planteles', pt: 'Voltar aos elencos' },
    planteles_jugadores: { es: 'jugadores', pt: 'jogadores' },
    tab_trivia: { es: 'Trivia', pt: 'Quiz' },
    aria_discord: { es: 'Unirse al Discord de PSO Uruguay', pt: 'Entrar no Discord do PSO Uruguai' },
    tab_admin: { es: 'Administrar', pt: 'Administrar' },
    aria_theme: { es: 'Cambiar tema', pt: 'Trocar tema' },
    title_playing_as: { es: 'Jugando como {name}', pt: 'Jogando como {name}' },
    aria_logout: { es: 'Cerrar sesión', pt: 'Sair da conta' },
    aria_auth: { es: 'Ingresar o crear cuenta', pt: 'Entrar ou criar conta' },
    admin_pill: { es: 'Panel admin', pt: 'Painel admin' },
    aria_admin_login: { es: 'Acceso administrador', pt: 'Acesso do administrador' },
    toast_logout: { es: 'Sesión cerrada', pt: 'Sessão encerrada' },
    lang_es_title: { es: 'Español', pt: 'Espanhol' },
    lang_pt_title: { es: 'Português (Brasil)', pt: 'Português (Brasil)' },

    /* ------- Estado / API ------- */
    err_no_server: { es: 'Sin conexión con el servidor', pt: 'Sem conexão com o servidor' },
    err_server: { es: 'Error del servidor ({status})', pt: 'Erro do servidor ({status})' },
    toast_save_team_error: { es: 'No se pudo guardar en la base de datos', pt: 'Não foi possível salvar no banco de dados' },
    toast_save_match_error: { es: 'No se pudo guardar el partido', pt: 'Não foi possível salvar o jogo' },
    toast_conexion_restaurada: { es: 'Conexión restaurada ✅', pt: 'Conexão restaurada ✅' },
    toast_conexion_perdida: { es: 'Sin conexión — funcionando en modo local', pt: 'Sem conexão — funcionando em modo local' },

    /* ------- Botones genéricos ------- */
    btn_cancel: { es: 'Cancelar', pt: 'Cancelar' },
    btn_confirm: { es: 'Confirmar', pt: 'Confirmar' },
    btn_close: { es: 'Cerrar', pt: 'Fechar' },
    btn_editar: { es: 'Editar', pt: 'Editar' },
    btn_eliminar: { es: 'Eliminar', pt: 'Excluir' },
    btn_guardar: { es: 'Guardar', pt: 'Salvar' },
    title_titulos: { es: '{n} título(s)', pt: '{n} título(s)' },

    /* ------- Cuentas / Auth ------- */
    err_username_format: {
      es: 'El usuario debe tener entre 3 y 20 caracteres (letras, números o _).',
      pt: 'O usuário deve ter entre 3 e 20 caracteres (letras, números ou _).'
    },
    err_password_short: { es: 'La contraseña debe tener al menos 6 caracteres.', pt: 'A senha deve ter pelo menos 6 caracteres.' },
    err_username_taken: { es: 'Ese nombre de usuario ya está en uso.', pt: 'Esse nome de usuário já está em uso.' },
    err_signup_confirm_email: {
      es: 'Te enviamos un correo a {email}. Abrilo y confirmá la cuenta para poder ingresar.',
      pt: 'Enviamos um e-mail para {email}. Abra e confirme a conta para poder entrar.'
    },
    label_email: { es: 'Correo electrónico', pt: 'E-mail' },
    ph_email: { es: 'tucorreo@ejemplo.com', pt: 'seuemail@exemplo.com' },
    err_email_format: {
      es: 'Ingresá un correo electrónico válido (ej: tucorreo@gmail.com).',
      pt: 'Digite um e-mail válido (ex: seuemail@gmail.com).'
    },
    note_email_confirm: {
      es: 'Te vamos a enviar un correo a esa dirección: abrilo y confirmá la cuenta, si no no vas a poder ingresar.',
      pt: 'Vamos enviar um e-mail para esse endereço: abra e confirme a conta, senão você não poderá entrar.'
    },
    err_bad_credentials: { es: 'Usuario o contraseña incorrectos.', pt: 'Usuário ou senha incorretos.' },
    err_signup_failed: { es: 'No se pudo crear la cuenta. Probá de nuevo en un momento.', pt: 'Não foi possível criar a conta. Tente novamente em instantes.' },
    err_no_auth: { es: 'Iniciá sesión para continuar.', pt: 'Faça login para continuar.' },
    toast_signup: { es: '¡Cuenta creada! Bienvenido, {name}', pt: 'Conta criada! Bem-vindo, {name}' },
    toast_login: { es: '¡Hola de nuevo, {name}!', pt: 'Bem-vindo de volta, {name}!' },
    toast_email_confirmed: { es: '¡Cuenta confirmada, {name}! Ya estás dentro.', pt: 'Conta confirmada, {name}! Você já está dentro.' },
    auth_title: { es: 'Tu cuenta', pt: 'Sua conta' },
    auth_need_account: {
      es: 'Necesitás una cuenta para aparecer en el ranking de la trivia.',
      pt: 'Você precisa de uma conta para aparecer no ranking do quiz.'
    },
    btn_ingresar: { es: 'Ingresar', pt: 'Entrar' },
    btn_crear_cuenta: { es: 'Crear cuenta', pt: 'Criar conta' },
    label_username: { es: 'Nombre de usuario', pt: 'Nome de usuário' },
    ph_username: { es: 'ej: garra_charrua', pt: 'ex: garra_charrua' },
    label_display_name: { es: 'Nombre visible (opcional)', pt: 'Nome de exibição (opcional)' },
    ph_display_name: { es: 'Cómo te vas a ver en el ranking', pt: 'Como você vai aparecer no ranking' },
    label_password: { es: 'Contraseña', pt: 'Senha' },
    ph_password: { es: 'Mínimo 6 caracteres', pt: 'Mínimo 6 caracteres' },
    label_password_min: { es: '(6 caracteres mínimo)', pt: '(6 caracteres mínimo)' },
    label_password2: { es: 'Repetir contraseña', pt: 'Repetir senha' },
    btn_crear_mi_cuenta: { es: 'Crear mi cuenta', pt: 'Criar minha conta' },
    label_user: { es: 'Usuario', pt: 'Usuário' },
    ph_user: { es: 'Tu nombre de usuario', pt: 'Seu nome de usuário' },
    auth_admin_link: { es: '¿Sos el administrador de la liga?', pt: 'É você o administrador da liga?' },
    auth_admin_link_btn: { es: 'Ingresá acá', pt: 'Entre aqui' },
    err_login_incomplete: { es: 'Completá correo y contraseña.', pt: 'Preencha e-mail e senha.' },
    err_pass_mismatch: { es: 'Las contraseñas no coinciden.', pt: 'As senhas não coincidem.' },
    confirm_local_account: {
      es: 'Abriste el sitio sin servidor online: la cuenta se guardará SOLO en esta computadora. ¿Continuar?',
      pt: 'Você abriu o site sem servidor online: a conta será salva SOMENTE neste computador. Continuar?'
    },
    err_generic: { es: 'Ocurrió un error.', pt: 'Ocorreu um erro.' },
    login_modal_title: { es: 'Acceso administrador', pt: 'Acesso do administrador' },
    login_modal_desc: { es: 'Ingresá tus credenciales para gestionar la liga.', pt: 'Insira suas credenciais para gerenciar a liga.' },
    toast_admin_welcome: { es: 'Bienvenido, administrador', pt: 'Bem-vindo, administrador' },

    /* ------- Vistas públicas ------- */
    stat_equipos: { es: 'Equipos', pt: 'Equipes' },
    stat_goles_totales: { es: 'Goles totales', pt: 'Gols totais' },
    home_season_line: {
      es: 'Temporada {season} · {teams} equipos · {played} partidos jugados',
      pt: 'Temporada {season} · {teams} equipes · {played} jogos disputados'
    },
    home_proximos: { es: 'Próximos partidos', pt: 'Próximos jogos' },
    home_no_matches: { es: 'Todavía no hay partidos programados.', pt: 'Ainda não há jogos programados.' },
    home_top: { es: 'Top posiciones', pt: 'Top classificação' },
    home_no_results: { es: 'Aún no hay resultados cargados.', pt: 'Ainda não há resultados carregados.' },
    home_goleadores: { es: 'Máximos goleadores', pt: 'Artilheiros' },
    home_no_goals: { es: 'Sin goles registrados todavía.', pt: 'Ainda sem gols registrados.' },
    match_finalizado: { es: 'Finalizado', pt: 'Encerrado' },
    match_por_jugar: { es: 'Por jugar', pt: 'A jogar' },
    fixture_title: { es: 'Fixture', pt: 'Confrontos' },
    fixture_empty: {
      es: 'Todavía no hay fechas generadas. El administrador puede sortear el fixture desde el panel.',
      pt: 'Ainda não há rodadas geradas. O administrador pode sortear o calendário pelo painel.'
    },
    fixture_sub: { es: '{rounds} fechas · {matches} partidos', pt: '{rounds} rodadas · {matches} jogos' },
    fixture_fecha: { es: 'Fecha {n}', pt: 'Rodada {n}' },
    fixture_finalizada: { es: 'FINALIZADA', pt: 'ENCERRADA' },
    bracket_final: { es: 'Final', pt: 'Final' },
    bracket_semifinal: { es: 'Semifinal', pt: 'Semifinal' },
    bracket_cuartos: { es: 'Cuartos de final', pt: 'Quartas de final' },
    bracket_octavos: { es: 'Octavos de final', pt: 'Oitavas de final' },
    bracket_ronda: { es: 'Ronda {n}', pt: 'Rodada {n}' },
    copa_default_name: { es: 'Copa', pt: 'Copa' },
    copa_sub: {
      es: 'Eliminación directa · {a} de {b} rondas jugadas',
      pt: 'Eliminação direta · {a} de {b} rodadas disputadas'
    },
    champion_badge: { es: 'CAMPEÓN 🏆', pt: 'CAMPEÃO 🏆' },
    pase_libre: { es: 'Pase libre', pt: 'Folga' },
    por_definir: { es: 'Por definir', pt: 'A definir' },
    tabla_title: { es: 'Tabla de posiciones', pt: 'Classificação' },
    tabla_copa_msg: {
      es: 'La competencia activa es una Copa por eliminación directa. Mirá el cuadro de llaves en la sección Fixture.',
      pt: 'A competição ativa é uma Copa de eliminação direta. Veja o chaveamento na seção Confrontos.'
    },
    tabla_empty: { es: 'Todavía no hay equipos cargados.', pt: 'Ainda não há equipes cadastradas.' },
    tabla_sub: { es: 'Victoria: 3 pts · Empate: 1 pt · Derrota: 0 pts', pt: 'Vitória: 3 pts · Empate: 1 pt · Derrota: 0 pts' },
    th_equipo: { es: 'Equipo', pt: 'Equipe' },
    legend_lider: { es: 'Líder', pt: 'Líder' },
    legend_ultimo: { es: 'Último lugar', pt: 'Último lugar' },
    stats_title: { es: 'Estadísticas', pt: 'Estatísticas' },
    stats_mostrando: { es: 'Mostrando:', pt: 'Exibindo:' },
    stats_todas: { es: 'Todas', pt: 'Todas' },
    stats_liga: { es: 'Liga', pt: 'Liga' },
    stats_copa: { es: 'Copa', pt: 'Copa' },
    stats_general: { es: 'General', pt: 'Geral' },
    stats_goleadores: { es: 'Goleadores', pt: 'Artilheiros' },
    stats_asistencias: { es: 'Asistencias', pt: 'Assistências' },
    stats_atajadas: { es: 'Atajadas', pt: 'Defesas' },
    stats_empty_goles: { es: 'Todavía no hay goles cargados en esta competencia.', pt: 'Ainda não há gols carregados nesta competição.' },
    stats_empty_asist: { es: 'Todavía no hay asistencias cargadas en esta competencia.', pt: 'Ainda não há assistências carregadas nesta competição.' },
    stats_empty_atajadas: { es: 'Todavía no hay atajadas cargadas en esta competencia.', pt: 'Ainda não há defesas carregadas nesta competição.' },
    stats_empty_general: { es: 'Todavía no hay estadísticas cargadas en esta competencia.', pt: 'Ainda não há estatísticas carregadas nesta competição.' },
    th_jugador: { es: 'Jugador', pt: 'Jogador' },
    th_pj: { es: 'PJ', pt: 'PJ' },
    th_goles: { es: 'Goles', pt: 'Gols' },
    th_asist: { es: 'Asist.', pt: 'Assist.' },
    th_atajadas: { es: 'Atajadas', pt: 'Defesas' },
    th_ta: { es: 'TA', pt: 'CA' },
    th_tr: { es: 'TR', pt: 'CV' },
    palmares_title: { es: 'Palmarés', pt: 'Títulos' },
    palmares_empty: {
      es: 'Todavía ningún equipo salió campeón. Los títulos aparecerán acá cuando se defina un campeón de copa o de liga.',
      pt: 'Ainda nenhuma equipe foi campeã. Os títulos aparecerão aqui quando houver um campeão de copa ou de liga.'
    },
    palmares_empty_year: { es: 'No hay títulos cargados para {year} todavía.', pt: 'Não há títulos cadastrados para {year} ainda.' },
    palmares_sub: { es: 'Ranking histórico de campeones', pt: 'Ranking histórico de campeões' },
    palmares_agregar_btn: { es: 'Agregar título', pt: 'Adicionar título' },
    palmares_modal_title: { es: 'Agregar al Palmarés', pt: 'Adicionar aos Títulos' },
    palmares_label_nombre: { es: 'Nombre del club / título', pt: 'Nome do clube / título' },
    palmares_ph_nombre: { es: 'Ej: PSO Uruguay', pt: 'Ex: PSO Uruguai' },
    palmares_label_year: { es: 'Año', pt: 'Ano' },
    palmares_year_required: { es: 'Cargá un año válido', pt: 'Informe um ano válido' },
    palmares_btn_crear: { es: 'Crear título', pt: 'Criar título' },
    palmares_plantel: { es: 'Plantel', pt: 'Elenco' },
    toast_palmares_creado: { es: '🏆 {name} ({year}) agregado al Palmarés', pt: '🏆 {name} ({year}) adicionado aos Títulos' },
    toast_palmares_eliminado: { es: 'Título eliminado del Palmarés', pt: 'Título removido dos Títulos' },
    confirm_del_palmares: { es: '¿Quitar "{name}" del Palmarés?', pt: 'Remover "{name}" dos Títulos?' },
    modal_eliminar_palmares: { es: 'Quitar del Palmarés', pt: 'Remover dos Títulos' },

    /* ------- Trivia ------- */
    trivia_title: { es: '⚽ Trivia Futbolera', pt: '⚽ Quiz de Futebol' },
    trivia_need_account_title: { es: 'Creá tu cuenta para jugar', pt: 'Crie sua conta para jogar' },
    trivia_need_account_desc: {
      es: 'Para aparecer en el ranking y guardar tu mejor racha necesitás una cuenta de jugador. Es gratis y tarda unos segundos.',
      pt: 'Para aparecer no ranking e guardar sua melhor sequência, você precisa de uma conta de jogador. É grátis e leva alguns segundos.'
    },
    trivia_online_note: {
      es: 'El ranking es online y lo compartís con todos los jugadores.',
      pt: 'O ranking é online e é compartilhado com todos os jogadores.'
    },
    trivia_jugando_como: { es: 'Jugando como {name}', pt: 'Jogando como {name}' },
    trivia_modo_racha: { es: 'Modo Racha', pt: 'Modo Sequência' },
    trivia_modo_racha_desc: {
      es: 'Respondé preguntas de fútbol mundial y uruguayo. Seguís sumando hasta el primer error. ¿Hasta dónde llegás?',
      pt: 'Responda perguntas do futebol mundial e uruguaio. Você continua somando até o primeiro erro. Até onde você vai?'
    },
    trivia_jugar_ahora: { es: '▶️ Jugar ahora', pt: '▶️ Jogar agora' },
    trivia_ranking: { es: '🏅 Ranking online', pt: '🏅 Ranking online' },
    trivia_autorefresh: { es: 'Se actualiza solo', pt: 'Atualiza automaticamente' },
    trivia_cargando: { es: 'Cargando ranking...', pt: 'Carregando ranking...' },
    trivia_no_players: {
      es: 'Todavía nadie jugó. ¡Sé el primero en aparecer en el ranking!',
      pt: 'Ainda ninguém jogou. Seja o primeiro a aparecer no ranking!'
    },
    trivia_vos: { es: '(vos)', pt: '(você)' },
    trivia_mejor_racha: { es: 'Mejor racha', pt: 'Melhor sequência' },
    trivia_error_pregunta: { es: 'Hubo un error cargando la pregunta.', pt: 'Ocorreu um erro ao carregar a pergunta.' },
    trivia_dif_facil: { es: 'FÁCIL', pt: 'FÁCIL' },
    trivia_dif_media: { es: 'MEDIA', pt: 'MÉDIA' },
    trivia_dif_dificil: { es: 'DIFÍCIL', pt: 'DIFÍCIL' },
    trivia_racha_actual: { es: 'racha actual', pt: 'sequência atual' },
    trivia_terminar: { es: '✋ Terminar', pt: '✋ Encerrar' },
    trivia_correcto: { es: '✅ ¡Correcto! Racha: {n}', pt: '✅ Correto! Sequência: {n}' },
    trivia_incorrecto: { es: '❌ Incorrecto. Tu racha fue de {n}.', pt: '❌ Errado. Sua sequência foi de {n}.' },
    trivia_save_error: {
      es: 'No se pudo guardar tu puntaje online. Revisá la conexión.',
      pt: 'Não foi possível salvar sua pontuação online. Verifique a conexão.'
    },
    trivia_partida_terminada: { es: '¡Partida terminada!', pt: 'Partida encerrada!' },
    trivia_tu_racha: { es: 'Tu racha final fue de', pt: 'Sua sequência final foi de' },
    trivia_ver_ranking: { es: 'Ver ranking', pt: 'Ver ranking' },
    trivia_jugar_de_nuevo: { es: '🔁 Jugar de nuevo', pt: '🔁 Jogar de novo' },
    trivia_terminar_modal_title: { es: 'Terminar partida', pt: 'Encerrar partida' },
    trivia_terminar_modal_desc: {
      es: 'Tu racha actual es de {n}. ¿Seguro que querés terminar acá?',
      pt: 'Sua sequência atual é de {n}. Tem certeza que quer encerrar aqui?'
    },
    trivia_seguir_jugando: { es: 'Seguir jugando', pt: 'Continuar jogando' },
    trivia_confirmar_salir: { es: 'Terminar partida', pt: 'Encerrar partida' },

    /* ------- Pasapalabra ------- */
    tab_pasapalabra: { es: 'Pasapalabra', pt: 'Passapalabra' },
    pasap_title: { es: '🔠 Pasapalabra', pt: '🔠 Passapalabra' },
    pasap_desc: {
      es: 'La rosca del día: definiciones de fútbol y de la celeste con 4 opciones. Una letra por vez, de la A a la Z y las que saltás vuelven.',
      pt: 'A rosca do dia: definições de futebol e da Celeste com 4 opções. Uma letra por vez, de A a Z, e as que você passar voltam.'
    },
    pasap_hoy: { es: 'Rosca de hoy', pt: 'Rosca de hoje' },
    pasap_jugar: { es: '▶️ Jugar la rosca de hoy', pt: '▶️ Jogar a rosca de hoje' },
    pasap_banco: { es: '{n} preguntas en el banco', pt: '{n} perguntas no banco' },
    pasap_tu_record: { es: 'Tu récord', pt: 'Seu recorde' },
    pasap_sin_record: { es: 'Todavía no jugaste ninguna rosca. ¡La de hoy es la primera!', pt: 'Você ainda não jogou nenhuma rosca. A de hoje é a primeira!' },
    pasap_ya_jugada_t: { es: 'Hoy ya jugaste la rosca', pt: 'Hoje você já jogou a rosca' },
    pasap_vuelve: { es: '⏰ Volvé mañana por otra rosca', pt: '⏰ Volte amanhã para outra rosca' },
    pasap_ver_detalle: { es: 'Ver mi resultado', pt: 'Ver meu resultado' },
    pasap_de: { es: 'de', pt: 'de' },
    pasap_aciertos: { es: 'Aciertos', pt: 'Acertos' },
    pasap_fallas: { es: 'Fallos', pt: 'Erros' },
    pasap_pasadas: { es: 'Saltadas', pt: 'Passadas' },
    pasap_tiempo: { es: 'Tiempo', pt: 'Tempo' },
    pasap_contador: { es: 'Vuelta {n}', pt: 'Volta {n}' },
    pasap_primera: { es: 'Primera vuelta', pt: 'Primeira volta' },
    pasap_segunda: { es: 'Segunda vuelta · letras saltadas', pt: 'Segunda volta · letras passadas' },
    pasap_empieza_con: { es: 'La respuesta empieza con {letra}', pt: 'A resposta começa com {letra}' },
    pasap_salto: { es: '⏭ Salto', pt: '⏭ Passo' },
    pasap_terminar: { es: 'Terminar rosca', pt: 'Encerrar rosca' },
    pasap_correcto: { es: '✅ ¡Correcto!', pt: '✅ Correto!' },
    pasap_incorrecto: { es: '❌ Incorrecto. Era: {palabra}', pt: '❌ Errado. Era: {palabra}' },
    pasap_terminar_modal_t: { es: 'Terminar la rosca', pt: 'Encerrar a rosca' },
    pasap_terminar_modal_p: {
      es: 'Llevás {n} aciertos. Si terminás ahora, la rosca de hoy queda jugada. ¿Confirmás?',
      pt: 'Você vai com {n} acertos. Se encerrar agora, a rosca de hoje fica jogada. Confirma?'
    },
    pasap_seguir_jugando: { es: 'Seguir jugando', pt: 'Continuar jogando' },
    pasap_confirmar_terminar: { es: 'Terminar', pt: 'Encerrar' },
    pasap_res_title: { es: '¡Rosca completa!', pt: 'Rosca completa!' },
    pasap_se_acabo: { es: '¡Se acabó el tiempo!', pt: 'O tempo acabou!' },
    pasap_res_sub: { es: 'Tu resultado de hoy', pt: 'Seu resultado de hoje' },
    pasap_ver_respuestas: { es: 'Ver respuestas', pt: 'Ver respostas' },
    pasap_ocultar_respuestas: { es: 'Ocultar respuestas', pt: 'Ocultar respostas' },
    pasap_respuestas: { es: 'Respuestas de la rosca', pt: 'Respostas da rosca' },

    /* ------- Penales online ------- */
    tab_penales: { es: 'Penales', pt: 'Pênaltis' },
    penales_title: { es: '🥅 Penales', pt: '🥅 Pênaltis' },
    penales_desc: {
      es: 'El arquero se tira al azar y vos rematás a un palo. Convertí penales seguidos: cada gol sube el nivel y te deja menos tiempo de reacción.',
      pt: 'O goleiro salta aleatoriamente e você chuta para um dos cantos. Faça pênaltis seguidos: cada gol sobe o nível e deixa menos tempo de reação.'
    },
    penales_need_account_title: { es: 'Creá tu cuenta para patear', pt: 'Crie sua conta para chutar' },
    penales_need_account_desc: {
      es: 'Para aparecer en el ranking online de penales necesitás una cuenta de jugador. Es gratis y tarda unos segundos.',
      pt: 'Para aparecer no ranking online de pênaltis, você precisa de uma conta de jogador. É grátis e leva alguns segundos.'
    },
    penales_online_note: {
      es: 'El ranking es online y lo compartís con todos los jugadores.',
      pt: 'O ranking é online e é compartilhado com todos os jogadores.'
    },
    penales_jugando_como: { es: 'Jugando como {name}', pt: 'Jogando como {name}' },
    penales_jugar: { es: '▶️ Patear mis penales', pt: '▶️ Bater meus pênaltis' },
    penales_ranking: { es: '🏅 Ranking online de penales', pt: '🏅 Ranking online de pênaltis' },
    penales_autorefresh: { es: 'Se actualiza solo', pt: 'Atualiza automaticamente' },
    penales_cargando: { es: 'Cargando ranking...', pt: 'Carregando ranking...' },
    penales_no_players: {
      es: 'Todavía nadie pateó. ¡Sé el primero en el ranking!',
      pt: 'Ainda ninguém chutou. Seja o primeiro no ranking!'
    },
    penales_vos: { es: '(vos)', pt: '(você)' },
    penales_mejor_racha: { es: 'Mejor racha de penales', pt: 'Melhor sequência de pênaltis' },
    penales_nivel: { es: 'Nivel {n}', pt: 'Nível {n}' },
    penales_goles: { es: 'Goles', pt: 'Gols' },
    penales_racha_actual: { es: 'racha actual', pt: 'sequência atual' },
    penales_remata: { es: '¡Rematá! Elegí un palo ⚽', pt: 'Chute! Escolha um canto ⚽' },
    penales_zona_izq: { es: 'Izquierda', pt: 'Esquerda' },
    penales_zona_cen: { es: 'Centro', pt: 'Centro' },
    penales_zona_der: { es: 'Derecha', pt: 'Direita' },
    penales_gol: { es: '⚽ ¡GOL!', pt: '⚽ GOL!' },
    penales_atajada: { es: '🧤 ¡Atajada! El arquero se tiró hacia {zona}', pt: '🧤 Defesa! O goleiro saltou para {zona}' },
    penales_sin_tiempo: {
      es: '⏰ ¡Sin tiempo! El arquero atajó el penal sin que remates',
      pt: '⏰ Sem tempo! O goleiro defendeu o pênalti sem chute'
    },
    penales_siguiente: { es: 'Siguiente penal', pt: 'Próximo pênalti' },
    penales_fin: { es: '¡Terminó la tanda!', pt: 'Tanda encerrada!' },
    penales_tu_racha: { es: 'Convertiste {n} penal(es) al hilo', pt: 'Você marcou {n} pênalti(s) seguidos' },
    penales_ver_ranking: { es: 'Ver ranking', pt: 'Ver ranking' },
    penales_jugar_de_nuevo: { es: '🔁 Patear de nuevo', pt: '🔁 Bater de novo' },
    penales_nuevo_record: { es: '🎉 ¡Nuevo récord personal!', pt: '🎉 Novo recorde pessoal!' },
    penales_terminar: { es: '✋ Terminar tanda', pt: '✋ Encerrar tanda' },
    penales_terminar_modal_t: { es: 'Terminar tanda', pt: 'Encerrar tanda' },
    penales_terminar_modal_p: {
      es: 'Llevás {n} gol(es) convertidos. Si terminás ahora, tu racha se guarda igual en el ranking. ¿Confirmás?',
      pt: 'Você vai com {n} gol(s) convertidos. Se encerrar agora, sua sequência é salva no ranking. Confirma?'
    },
    penales_seguir_jugando: { es: 'Seguir pateando', pt: 'Continuar batendo' },
    penales_confirmar_terminar: { es: 'Terminar', pt: 'Encerrar' },
    penales_como_funciona_t: { es: '¿Cómo funciona?', pt: 'Como funciona?' },
    penales_como_funciona_p: {
      es: 'El arquero se tira al azar a un palo. Elegí una zona y rematá antes de que se agote el tiempo. Cada gol sube el nivel y deja menos tiempo de reacción. Si el arquero adivina tu palo o se te acaba el tiempo, termina la tanda.',
      pt: 'O goleiro salta aleatoriamente para um canto. Escolha uma zona e chute antes que o tempo acabe. Cada gol sobe o nível e deixa menos tempo de reação. Se o goleiro adivinhar seu canto ou o tempo acabar, a tanda termina.'
    },
    penales_time_reaction: { es: 'tiempo de reacción', pt: 'tempo de reação' },
    penales_seg: { es: '{t}s', pt: '{t}s' },
    penales_save_error: {
      es: 'No se pudo guardar tu puntaje online. Revisá la conexión.',
      pt: 'Não foi possível salvar sua pontuação online. Verifique a conexão.'
    },

    /* ------- Admin: posiciones ------- */
    pos_gk: { es: 'Arquero', pt: 'Goleiro' },
    pos_def: { es: 'Defensor', pt: 'Zagueiro' },
    pos_mid: { es: 'Mediocampista', pt: 'Meio-campista' },
    pos_fwd: { es: 'Delantero', pt: 'Atacante' },

    /* ------- Admin: equipos ------- */
    btn_nuevo_equipo: { es: 'Nuevo equipo', pt: 'Nova equipe' },
    equipos_empty: {
      es: 'Todavía no cargaste ningún equipo. Creá el primero para empezar.',
      pt: 'Você ainda não cadastrou nenhuma equipe. Crie a primeira para começar.'
    },
    title_agregar_jugador: { es: 'Agregar jugador', pt: 'Adicionar jogador' },
    btn_jugador: { es: 'Jugador', pt: 'Jogador' },
    title_editar_equipo: { es: 'Editar equipo', pt: 'Editar equipe' },
    sin_jugadores: { es: 'Sin jugadores cargados.', pt: 'Sem jogadores cadastrados.' },
    modal_editar_equipo: { es: 'Editar equipo', pt: 'Editar equipe' },
    modal_nuevo_equipo: { es: 'Nuevo equipo', pt: 'Nova equipe' },
    label_nombre_equipo: { es: 'Nombre del equipo', pt: 'Nome da equipe' },
    ph_equipo: { es: 'Ej: Peñarol FC', pt: 'Ex: Peñarol FC' },
    err_nombre_valido: { es: 'Ingresá un nombre válido.', pt: 'Digite um nome válido.' },
    label_plantel: { es: 'Jugadores del plantel', pt: 'Jogadores do elenco' },
    btn_agregar_jugador: { es: 'Agregar jugador', pt: 'Adicionar jogador' },
    btn_agregar: { es: 'Agregar', pt: 'Adicionar' },
    btn_guardar_cambios: { es: 'Guardar cambios', pt: 'Salvar alterações' },
    btn_crear_equipo: { es: 'Crear equipo', pt: 'Criar equipe' },
    btn_cambiar_logo: { es: 'Cambiar logo', pt: 'Trocar logo' },
    btn_subir_logo: { es: 'Subir logo', pt: 'Enviar logo' },
    btn_quitar: { es: 'Quitar', pt: 'Remover' },
    logo_crop_note: { es: 'Se recorta automáticamente al centro en formato cuadrado.', pt: 'É cortado automaticamente ao centro em formato quadrado.' },
    toast_logo_pesada: { es: 'La imagen es muy pesada, usá una de menos de 8MB', pt: 'A imagem está muito pesada, use uma com menos de 8MB' },
    toast_logo_actualizado: { es: 'Logo actualizado', pt: 'Logo atualizado' },
    toast_logo_error: { es: 'No se pudo procesar la imagen. Probá con otro archivo.', pt: 'Não foi possível processar a imagem. Tente outro arquivo.' },
    toast_logo_leer: { es: 'No se pudo leer el archivo.', pt: 'Não foi possível ler o arquivo.' },
    sin_jugadores_list: { es: 'Todavía no agregaste jugadores.', pt: 'Você ainda não adicionou jogadores.' },
    toast_equipo_actualizado: { es: 'Equipo actualizado', pt: 'Equipe atualizada' },
    toast_equipo_creado: { es: 'Equipo creado', pt: 'Equipe criada' },
    label_nombre_jugador: { es: 'Nombre del jugador', pt: 'Nome do jogador' },
    ph_jugador: { es: 'Ej: Juan Pérez', pt: 'Ex: Juan Pérez' },
    modal_eliminar_equipo: { es: 'Eliminar equipo', pt: 'Excluir equipe' },
    confirm_del_team: {
      es: '¿Seguro que querés eliminar {name}? Esta acción no se puede deshacer y también afectará los partidos relacionados.',
      pt: 'Tem certeza que quer excluir {name}? Esta ação não pode ser desfeita e também afetará os jogos relacionados.'
    },
    toast_equipo_eliminado: { es: 'Equipo eliminado', pt: 'Equipe excluída' },
    modal_add_player_to: { es: 'Agregar jugador a {name}', pt: 'Adicionar jogador a {name}' },
    toast_jugador_agregado: { es: 'Jugador agregado', pt: 'Jogador adicionado' },
    toast_jugador_eliminado: { es: 'Jugador eliminado', pt: 'Jogador removido' },

    /* ------- Admin: resultados ------- */
    resultados_need_teams: {
      es: 'Necesitás al menos 2 equipos cargados para registrar un partido.',
      pt: 'Você precisa de pelo menos 2 equipes cadastradas para registrar um jogo.'
    },
    resultados_no_comp: {
      es: 'Todavía no hay una competencia sorteada. Andá a "Sortear fixture" para generar los partidos.',
      pt: 'Ainda não há uma competição sorteada. Vá em "Sortear calendário" para gerar os jogos.'
    },
    btn_cargar_partido: { es: 'Cargar partido nuevo', pt: 'Cadastrar novo jogo' },
    copa_note: {
      es: 'Estás en formato Copa: los cruces se generan solos al avanzar el bracket. Cargá los resultados de cada llave a medida que se jueguen.',
      pt: 'Você está no formato Copa: os cruzamentos são gerados sozinhos conforme o chaveamento avança. Cadastre os resultados de cada chave conforme forem jogados.'
    },
    resultados_pendientes: { es: 'Partidos pendientes', pt: 'Jogos pendentes' },
    resultados_finalizados: { es: 'Partidos finalizados', pt: 'Jogos encerrados' },
    no_pendientes: { es: 'No hay partidos por jugar en este momento.', pt: 'Não há jogos a jogar no momento.' },
    fecha_badge: { es: 'FECHA {n}', pt: 'RODADA {n}' },
    label_jugador_eliminado: { es: 'Jugador eliminado', pt: 'Jogador removido' },
    btn_cargar_resultado: { es: 'Cargar resultado', pt: 'Cadastrar resultado' },
    btn_programar: { es: 'Programar', pt: 'Agendar' },
    modal_programar: { es: 'Programar partido', pt: 'Agendar jogo' },
    label_dia: { es: 'Día', pt: 'Dia' },
    label_horario: { es: 'Horario', pt: 'Horário' },
    sched_note: { es: 'Si pasa el día no pasa nada: es solo informativo y se muestra en el fixture.', pt: 'Se passar o dia não acontece nada: é só informativo e aparece no calendário.' },
    btn_quitar_programacion: { es: 'Quitar', pt: 'Remover' },
    toast_programado: { es: 'Partido programado 📅', pt: 'Jogo agendado 📅' },
    toast_programacion_quitada: { es: 'Programación eliminada', pt: 'Agendamento removido' },
    modal_cargar_partido: { es: 'Cargar partido nuevo', pt: 'Cadastrar novo jogo' },
    label_fecha_jornada: { es: 'Fecha / Jornada', pt: 'Rodada / Jornada' },
    label_local: { es: 'Equipo local', pt: 'Equipe da casa' },
    label_visitante: { es: 'Equipo visitante', pt: 'Equipe visitante' },
    err_two_teams: { es: 'Elegí dos equipos distintos.', pt: 'Escolha duas equipes diferentes.' },
    btn_crear_partido: { es: 'Crear partido', pt: 'Criar jogo' },
    toast_partido_creado: { es: 'Partido creado. Ahora podés cargar el resultado.', pt: 'Jogo criado. Agora você pode cadastrar o resultado.' },
    modal_eliminar_partido: { es: 'Eliminar partido', pt: 'Excluir jogo' },
    confirm_del_match: {
      es: '¿Seguro que querés eliminar este partido? Se perderán las estadísticas cargadas.',
      pt: 'Tem certeza que quer excluir este jogo? As estatísticas cadastradas serão perdidas.'
    },
    toast_partido_eliminado: { es: 'Partido eliminado', pt: 'Jogo excluído' },
    team_no_players: { es: 'Este equipo no tiene jugadores cargados.', pt: 'Esta equipe não tem jogadores cadastrados.' },
    titulares_count: { es: '{n}/6 titulares', pt: '{n}/6 titulares' },
    btn_titular: { es: 'Titular', pt: 'Titular' },
    btn_suplente: { es: 'Suplente', pt: 'Reserva' },
    label_posicion: { es: 'Posición:', pt: 'Posição:' },
    pos_sin_especificar: { es: 'Sin especificar', pt: 'Sem especificar' },
    lineup_note: {
      es: 'Marcá quiénes jugaron este partido: hasta 6 titulares por equipo, y los suplentes que quieras que hayan entrado. Elegí también la posición de cada uno. Solo los marcados van a sumar partido jugado y podrán cargarse sus estadísticas.',
      pt: 'Marque quem jogou este jogo: até 6 titulares por equipe, e os reservas que entraram. Escolha também a posição de cada um. Somente os marcados somam jogo disputado e podem ter estatísticas cadastradas.'
    },
    toast_6_titulares: {
      es: 'Ya elegiste 6 titulares para este equipo. Sacá uno antes de agregar otro.',
      pt: 'Você já escolheu 6 titulares para esta equipe. Tire um antes de adicionar outro.'
    },
    btn_continuar_stats: { es: 'Continuar a estadísticas', pt: 'Continuar para estatísticas' },
    continuar_sin_alineacion: { es: 'Continuar sin alineación', pt: 'Continuar sem escalação' },
    no_lineup_desc: {
      es: 'No marcaste jugadores para ninguno de los dos equipos. Podés seguir igual (el resultado se guarda sin estadísticas individuales), o volver y marcar la alineación.',
      pt: 'Você não marcou jogadores para nenhuma das duas equipes. Pode continuar mesmo assim (o resultado é salvo sem estatísticas individuais), ou voltar e marcar a escalação.'
    },
    btn_volver: { es: 'Volver', pt: 'Voltar' },
    continuar_igual: { es: 'Continuar igual', pt: 'Continuar mesmo assim' },
    badge_suplente: { es: 'SUPLENTE', pt: 'RESERVA' },
    badge_titular: { es: 'TITULAR', pt: 'TITULAR' },
    label_goles: { es: 'Goles', pt: 'Gols' },
    label_asist: { es: 'Asist.', pt: 'Assist.' },
    label_atajadas: { es: 'Atajadas', pt: 'Defesas' },
    label_t_amar: { es: 'T. Amar.', pt: 'C. Amar.' },
    label_t_roja: { es: 'T. Roja', pt: 'C. Verm.' },
    stats_no_players: {
      es: 'No hay jugadores convocados para este partido. Podés registrar el resultado igual, sin estadísticas individuales.',
      pt: 'Não há jogadores convocados para este jogo. Você pode registrar o resultado mesmo assim, sem estatísticas individuais.'
    },
    stats_title_modal: { es: 'Estadísticas por jugador', pt: 'Estatísticas por jogador' },
    btn_editar_alineacion: { es: 'Editar alineación', pt: 'Editar escalação' },
    stats_note: {
      es: 'Solo los jugadores convocados suman partido jugado y aparecen en los rankings de estadísticas.',
      pt: 'Somente os jogadores convocados somam jogo disputado e aparecem nos rankings de estatísticas.'
    },
    btn_guardar_resultado: { es: 'Guardar resultado', pt: 'Salvar resultado' },
    toast_empate_copa: {
      es: 'En copa no puede haber empate. Definí un ganador (por penales, por ejemplo).',
      pt: 'Na copa não pode haver empate. Defina um vencedor (por pênaltis, por exemplo).'
    },
    toast_resultado_guardado: { es: 'Resultado guardado correctamente', pt: 'Resultado salvo corretamente' },

    /* ------- Admin: sorteo ------- */
    sorteo_need_teams: {
      es: 'Necesitás al menos 2 equipos cargados para sortear una competencia.',
      pt: 'Você precisa de pelo menos 2 equipes cadastradas para sortear uma competição.'
    },
    competencia_activa: { es: 'Competencia activa:', pt: 'Competição ativa:' },
    copa_fmt: { es: 'Copa (eliminación directa)', pt: 'Copa (eliminação direta)' },
    liga_fmt: { es: 'Liga (todos contra todos)', pt: 'Liga (todos contra todos)' },
    sorteo_liga_titulo: { es: 'Liga', pt: 'Liga' },
    sorteo_liga_desc: { es: 'Todos contra todos, se define por tabla de posiciones.', pt: 'Todos contra todos, definido pela classificação.' },
    sorteo_copa_titulo: { es: 'Copa', pt: 'Copa' },
    sorteo_copa_desc: { es: 'Eliminación directa por llaves hasta la final.', pt: 'Eliminação direta por chaves até a final.' },
    config_liga: { es: 'Configurar liga', pt: 'Configurar liga' },
    sorteo_liga_p: { es: 'Se generarán enfrentamientos entre los {n} equipos cargados.', pt: 'Serão gerados confrontos entre as {n} equipes cadastradas.' },
    label_nombre_comp: { es: 'Nombre de la competencia', pt: 'Nome da competição' },
    ph_liga_nombre: { es: 'Ej: Torneo Clausura 2026', pt: 'Ex: Torneio Clausura 2026' },
    label_formato_partidos: { es: 'Formato de partidos', pt: 'Formato dos jogos' },
    opt_solo_ida: { es: 'Solo ida (una vuelta, todos contra todos)', pt: 'Somente ida (um turno, todos contra todos)' },
    opt_idavuelta: { es: 'Ida y vuelta (dos vueltas)', pt: 'Ida e volta (dois turnos)' },
    nota_reemplaza: {
      es: 'Ya existe una competencia cargada. Sortear de nuevo reemplaza todos los partidos y resultados actuales.',
      pt: 'Já existe uma competição cadastrada. Sortear novamente substitui todos os jogos e resultados atuais.'
    },
    btn_sortear_liga: { es: 'Sortear fixture de liga', pt: 'Sortear calendário da liga' },
    config_copa: { es: 'Configurar copa', pt: 'Configurar copa' },
    sorteo_copa_p: { es: 'Se armará un cuadro de eliminación directa con los {n} equipos cargados.', pt: 'Será montado um chaveamento de eliminação direta com as {n} equipes cadastradas.' },
    ph_copa_nombre: { es: 'Ej: Copa PSO Uruguay 2026', pt: 'Ex: Copa PSO Uruguai 2026' },
    copa_bye_note: {
      es: 'Con {n} equipos, algunos avanzarán de ronda automáticamente (bye) para completar las llaves de forma pareja.',
      pt: 'Com {n} equipes, algumas avançarão de rodada automaticamente (bye) para completar as chaves de forma equilibrada.'
    },
    nota_reemplaza_copa: {
      es: 'Ya existe una competencia cargada. Sortear de nuevo reemplaza todos los partidos actuales.',
      pt: 'Já existe uma competição cadastrada. Sortear novamente substitui todos os jogos atuais.'
    },
    btn_sortear_copa: { es: 'Sortear llaves de copa', pt: 'Sortear chaves da copa' },
    confirmar_sorteo_liga: { es: 'Confirmar sorteo de liga', pt: 'Confirmar sorteio da liga' },
    sorteo_liga_confirm_p: {
      es: 'Se generarán {n} fechas con un total de {m} partidos. Revisá el resultado:',
      pt: 'Serão geradas {n} rodadas com um total de {m} jogos. Veja o resultado:'
    },
    vista_previa: { es: 'Vista previa del fixture', pt: 'Pré-visualização do calendário' },
    btn_confirmar_guardar: { es: 'Confirmar y guardar', pt: 'Confirmar e salvar' },
    toast_liga_sorteada: { es: 'Liga sorteada: {n} fechas, {m} partidos', pt: 'Liga sorteada: {n} rodadas, {m} jogos' },
    confirmar_sorteo_copa: { es: 'Confirmar sorteo de copa', pt: 'Confirmar sorteio da copa' },
    sorteo_copa_confirm_p: {
      es: 'Cuadro de eliminación directa a {n} ronda(s). Primera ronda:',
      pt: 'Chaveamento de eliminação direta com {n} rodada(s). Primeira rodada:'
    },
    llaves_ronda1: { es: 'Llaves — ronda 1', pt: 'Chaves — rodada 1' },
    bye_libre: { es: 'BYE (libre)', pt: 'BYE (folga)' },
    toast_copa_sorteada: { es: 'Copa sorteada: {n} partidos en la primera ronda', pt: 'Copa sorteada: {n} jogos na primeira rodada' },
    toast_ronda_generada: { es: '¡Ronda {n} generada automáticamente!', pt: 'Rodada {n} gerada automaticamente!' },
    toast_campeon: { es: '🏆 {team} es el nuevo campeón de {comp}', pt: '🏆 {team} é o novo campeão de {comp}' },
    default_competencia: { es: 'Competencia', pt: 'Competição' },

    /* ------- Admin: configuración ------- */
    admin_sub_equipos: { es: 'Equipos', pt: 'Equipes' },
    admin_sub_resultados: { es: 'Cargar resultados', pt: 'Cadastrar resultados' },
    admin_sub_sorteo: { es: 'Sortear fixture', pt: 'Sortear calendário' },
    admin_sub_config: { es: 'Configuración', pt: 'Configuração' },
    admin_subtitle: { es: 'Gestioná equipos, resultados y el fixture de la liga', pt: 'Gerencie equipes, resultados e o calendário da liga' },
    datos_liga: { es: 'Datos de la liga', pt: 'Dados da liga' },
    label_nombre_liga: { es: 'Nombre de la liga', pt: 'Nome da liga' },
    label_temporada: { es: 'Temporada', pt: 'Temporada' },
    toast_config_guardada: { es: 'Configuración guardada', pt: 'Configuração salva' },
    declarar_campeon: { es: 'Declarar campeón', pt: 'Declarar campeã' },
    declarar_campeon_p: {
      es: 'Cuando termine la liga, elegí el equipo campeón para sumarlo al Palmarés.',
      pt: 'Quando a liga terminar, escolha a equipe campeã para adicioná-la aos Títulos.'
    },
    label_equipo_campeon: { es: 'Equipo campeón', pt: 'Equipe campeã' },
    btn_declarar_campeon: { es: 'Declarar campeón y sumar título', pt: 'Declarar campeã e somar título' },
    zona_riesgo: { es: 'Zona de riesgo', pt: 'Zona de risco' },
    zona_riesgo_p: { es: 'Esto borra todos los equipos, jugadores y partidos de forma permanente.', pt: 'Isso apaga todas as equipes, jogadores e jogos permanentemente.' },
    btn_reset_all: { es: 'Reiniciar toda la liga', pt: 'Reiniciar toda a liga' },
    confirmar_campeon: { es: 'Confirmar campeón', pt: 'Confirmar campeã' },
    confirmar_campeon_p: {
      es: '¿Confirmás a {team} como campeón de {liga} {season}? Se sumará un título a su palmarés.',
      pt: 'Confirma {team} como campeã de {liga} {season}? Um título será somado ao histórico dela.'
    },
    btn_confirmar_titulo: { es: 'Confirmar título', pt: 'Confirmar título' },
    toast_campeon_sumado: { es: '🏆 {team} sumado al Palmarés', pt: '🏆 {team} adicionada aos Títulos' },
    reiniciar_liga_title: { es: 'Reiniciar liga', pt: 'Reiniciar liga' },
    reiniciar_liga_p: {
      es: 'Esta acción eliminará todos los equipos, jugadores y partidos de forma permanente. ¿Confirmás?',
      pt: 'Esta ação excluirá todas as equipes, jogadores e jogos permanentemente. Confirma?'
    },
    btn_si_reiniciar: { es: 'Sí, reiniciar todo', pt: 'Sim, reiniciar tudo' },
    toast_liga_reiniciada: { es: 'Liga reiniciada', pt: 'Liga reiniciada' },

    /* ------- Competencias múltiples ------- */
    tab_competencias: { es: 'Competencias', pt: 'Competições' },
    admin_sub_competencias: { es: 'Competencias', pt: 'Competições' },
    competencias_title: { es: 'Gestionar competencias', pt: 'Gerenciar competições' },
    competencias_subtitle: { es: 'Crea hasta 4 competencias simultáneas (ligas y copas)', pt: 'Crie até 4 competições simultâneas (ligas e copas)' },
    btn_nueva_competencia: { es: '➕ Nueva competencia', pt: '➕ Nova competição' },
    btn_editar_competencia: { es: '✏️ Editar', pt: '✏️ Editar' },
    btn_eliminar_competencia: { es: '🗑️ Eliminar', pt: '🗑️ Excluir' },
    btn_guardar_competencia: { es: '💾 Guardar competencia', pt: '💾 Salvar competição' },
    label_nombre_competencia: { es: 'Nombre de la competencia', pt: 'Nome da competição' },
    ph_nombre_competencia: { es: 'Ej: Liga Uruguaya 2026', pt: 'Ex: Liga Uruguaia 2026' },
    label_tipo_competencia: { es: 'Tipo de competencia', pt: 'Tipo de competição' },
    opt_liga: { es: 'Liga (todos contra todos)', pt: 'Liga (todos contra todos)' },
    opt_copa: { es: 'Copa (eliminación directa)', pt: 'Copa (eliminação direta)' },
    label_equipos_participan: { es: 'Equipos participantes', pt: 'Equipes participantes' },
    ph_seleccionar_equipos: { es: ' Selecciona los equipos que participan...', pt: ' Selecione as equipes que participam...' },
    competencia_activa: { es: 'Competencia activa', pt: 'Competição ativa' },
    competencias_vacias: { es: 'No hay competencias creadas', pt: 'Não há competições criadas' },
    btn_sortear_competencia: { es: '🔀 Sortear fixture', pt: '🔀 Sortear calendário' },
    btn_ver_competencia: { es: '👁️ Ver competencia', pt: '👁️ Ver competição' },
    toast_competencia_creada: { es: '✅ Competencia creada', pt: '✅ Competição criada' },
    toast_competencia_actualizada: { es: '✅ Competencia actualizada', pt: '✅ Competição atualizada' },
    toast_competencia_eliminada: { es: '🗑️ Competencia eliminada', pt: '🗑️ Competição excluída' },
    toast_max_competencias: { es: '⚠️ Ya tienes 4 competencias máximas', pt: '⚠️ Você já tem 4 competições no máximo' },
    slot_competencia: { es: 'Competencia {n}', pt: 'Competição {n}' },
    no_equipos_seleccionados: { es: 'Selecciona al menos 2 equipos', pt: 'Selecione pelo menos 2 equipes' },
    confirmar_eliminar_competencia: { es: '¿Confirmás eliminar esta competencia?', pt: 'Confirma excluir esta competição?' },
    confirmar_eliminar_competencia_p: { es: 'Se eliminan todos los partidos de esta competencia. Los equipos no se eliminan.', pt: 'Todos os jogos desta competição serão excluídos. As equipes não serão excluídas.' },

    /* ------- Vista por competencia ------- */
    fixture_selecciona_competencia: { es: 'Selecciona una competencia', pt: 'Selecione uma competição' },
    tabla_selecciona_competencia: { es: 'Selecciona una competencia', pt: 'Selecione uma competição' },
    stats_selecciona_competencia: { es: 'Selecciona una competencia', pt: 'Selecione uma competição' },
    competencia_lista: { es: 'Competencias', pt: 'Competições' },
    competencia_sin_partidos: { es: 'Sin partidos', pt: 'Sem jogos' },
    competencia_empty: { es: 'No hay partidos en esta competencia', pt: 'Não há jogos nesta competição' },

    /* ------- Sorteo por competencia ------- */
    confirmar_sorteo_competencia: { es: 'Confirmar sorteo de {nombre}', pt: 'Confirmar sorteio de {nome}' },
    sorteo_competencia_p: { es: 'Se sorteará la competencia "{nombre}" con {n} equipos.', pt: 'A competição "{nome}" será sorteada com {n} equipes.' },
    btn_sortear_y_guardar: { es: '🔀 Sortear y guardar', pt: '🔀 Sortear e salvar' },
    toast_competencia_sorteada: { es: '🏆 Competencia "{nombre}" sorteada: {rounds} fechas, {matches} partidos', pt: '🏆 Competição "{nome}" sorteada: {rounds} rodadas, {matches} jogos' },
    sorteo_liga_p_comp: { es: 'Liga de {n} equipos. Cada equipo juega contra todos {veces} vez{plural}.', pt: 'Liga de {n} equipes. Cada equipe joga contra todos {veces} vez{es}' },
    sorteo_copa_p_comp: { es: 'Copa de {n} equipos. El formato de eliminación directa requiere potencia de 2.', pt: 'Copa de {n} equipes. O formato de eliminação direta requer potência de 2.' },
    sorteo_copa_confirm_p: { es: 'Copa de {n} equipos. Total de rondas: {rounds}.', pt: 'Copa de {n} equipes. Total de rodadas: {rounds}.' },
    llaves_ronda1: { es: 'Primera ronda (Llaves)', pt: 'Primeira rodada (Chaves)' },
    nota_reemplaza_comp: { es: 'Los partidos existentes de esta competencia serán reemplazados.', pt: 'Os jogos existentes desta competição serão substituídos.' },
    nota_reemplaza_copa_comp: { es: 'Los partidos existentes de esta copa serán reemplazados.', pt: 'Os jogos existentes desta copa serão substituídos.' },
    vista_previa_comp: { es: 'Vista previa del sorteo', pt: 'Pré-visualização do sorteio' },
    fecha_badge_comp: { es: 'Fecha {n}', pt: 'Rodada {n}' },
    bye_libre: { es: 'Libre (bye)', pt: 'Livre (bye)' },

    /* ------- Filtros por competencia ------- */
    filtro_todas_comp: { es: 'Todas', pt: 'Todas' },
    filtro_competencia: { es: '{nombre}', pt: '{nome}' },
    fixture_elegir_comp: { es: 'Elegir competencia', pt: 'Escolher competição' },
    resultados_grupo_general: { es: 'Otros partidos', pt: 'Outros jogos' },
    resultados_tipo_liga: { es: 'LIGA', pt: 'LIGA' },
    resultados_tipo_copa: { es: 'COPA', pt: 'COPA' },
    tabla_solo_ligas: { es: 'La tabla de posiciones solo existe para competencias de tipo Liga. Las copas se siguen por llaves en el Fixture.', pt: 'A tabela de classificação existe apenas para competições do tipo Liga. As copas são acompanhadas pelas chaves nos Confrontos.' },
    stats_pj_short: { es: 'PJ', pt: 'J' },
    err_campo_requerido: { es: 'campo requerido', pt: 'campo obrigatório' },

    /* ------- Selección Uruguaya ------- */
    sel_badge: { es: '🇺🇾 LA CELESTE', pt: '🇺🇾 A CELESTE' },
    sel_title: { es: 'Selección Uruguaya', pt: 'Seleção Uruguaia' },
    sel_sub: { es: 'Los elegidos para vestir la celeste en Pro Soccer Online', pt: 'Os escolhidos para vestir a Celeste no Pro Soccer Online' },
    sel_squad_label: { es: 'Plantel oficial · PSO Uruguay', pt: 'Elenco oficial · PSO Uruguai' },
    sel_count: { es: '{n} convocados', pt: '{n} convocados' },
    sel_pos_arqueros: { es: 'Arqueros', pt: 'Goleiros' },
    sel_pos_defensas: { es: 'Defensas', pt: 'Defensores' },
    sel_pos_medios: { es: 'Mediocampistas', pt: 'Meias' },
    sel_pos_delanteros: { es: 'Delanteros', pt: 'Atacantes' },
    sel_dorsal: { es: 'Dorsal {n}', pt: 'Camisa {n}' },
    sel_cta_join: { es: 'Quiero vestir la celeste', pt: 'Quero vestir a Celeste' },
    sel_cta_join_sub: { es: 'Sumate al Discord y peleá por tu lugar en la próxima convocatoria', pt: 'Entre no Discord e lute pela sua vaga na próxima convocação' },
  }
};

/* Traduce una clave del diccionario con interpolación de {vars} */
function tr(key, vars) {
  const entry = I18N.dic[key];
  if (!entry) return key;
  let text = entry[I18N.lang] !== undefined && entry[I18N.lang] !== null ? entry[I18N.lang] : entry.es;
  if (vars) {
    for (const k in vars) {
      text = text.split('{' + k + '}').join(String(vars[k]));
    }
  }
  return text;
}

/* Aplica idioma/meta sin re-renderizar (se usa al arrancar y en setLang) */
function syncLangUI() {
  document.documentElement.setAttribute('lang', I18N.lang === 'pt' ? 'pt-BR' : 'es');
  document.title = tr('meta_title');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', tr('meta_desc'));
  const og = document.querySelector('meta[property="og:description"]');
  if (og) og.setAttribute('content', tr('og_desc'));
  const tw = document.querySelector('meta[name="twitter:description"]');
  if (tw) tw.setAttribute('content', tr('twitter_desc'));

  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === I18N.lang);
  });
}

/* Aplica el idioma seleccionado y re-renderiza la app */
function setLang(lang) {
  lang = lang === 'pt' ? 'pt' : 'es';
  I18N.lang = lang;
  localStorage.setItem('pso_lang', lang);

  syncLangUI();

  if (typeof renderAll === 'function') renderAll();
}

/* Banderas en SVG inline (los emoji de bandera no renderizan en Windows) */
function flagSvg(lang) {
  if (lang === 'pt') {
    return `<svg viewBox="0 0 70 50" width="20" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="70" height="50" fill="#009B3A"/><polygon points="35,4 62,25 35,46 8,25" fill="#FEDF00"/><circle cx="35" cy="25" r="11" fill="#002776"/></svg>`;
  }
  return `<svg viewBox="0 0 75 50" width="20" height="13" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="75" height="50" fill="#C60B1E"/><rect y="12.5" width="75" height="25" fill="#FFC400"/></svg>`;
}

/* HTML del selector de idioma para la topbar */
function langSwitchHtml() {
  return `
    <div class="lang-switch" role="group" aria-label="Idioma">
      <button class="lang-btn ${I18N.lang === 'es' ? 'active' : ''}" data-lang="es" title="${tr('lang_es_title')}" aria-label="${tr('lang_es_title')}">${flagSvg('es')}</button>
      <button class="lang-btn ${I18N.lang === 'pt' ? 'active' : ''}" data-lang="pt" title="${tr('lang_pt_title')}" aria-label="${tr('lang_pt_title')}">${flagSvg('pt')}</button>
    </div>
  `;
}

function initLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.onclick = () => setLang(b.dataset.lang);
  });
}