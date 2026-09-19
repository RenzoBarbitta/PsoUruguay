/* ======================================================================
   BANCO DE PREGUNTAS - PASAPALABRA
   La rosca diaria elige una pregunta por letra (A-Z) de forma aleatoria
   pero determinista según la fecha. Cada pregunta tiene 4 opciones y la
   respuesta correcta (w) empieza con la letra de su lista, en el idioma
   correspondiente (es / pt).
   ====================================================================== */

const PASAPALABRA_QUESTIONS = {
  es: {
    A: [
      { w: 'ÁRBITRO', q: 'El encargado de dirigir el partido, cobrar las faltas y sacar tarjetas.', opts: ['Árbitro', 'Técnico', 'Médico', 'Utilero'], c: 0 },
      { w: 'ANTICIPACIÓN', q: 'Acción de llegar antes que el rival a la pelota para jugarla primero.', opts: ['Anticipación', 'Rechazo', 'Marca', 'Retardo'], c: 0 },
      { w: 'ASISTENCIAS', q: 'Pases certeros que terminan en gol de un compañero.', opts: ['Asistencias', 'Atajadas', 'Posesiones', 'Recuperaciones'], c: 0 },
      { w: 'ARCO', q: 'El "palo" donde se convierte el gol, custodiado por el arquero.', opts: ['Arco', 'Córner', 'Área', 'Central'], c: 0 }
    ],
    B: [
      { w: 'BALÓN', q: 'El esférico con el que se juega.', opts: ['Balón', 'Pito', 'Silbato', 'Taco'], c: 0 },
      { w: 'BANQUILLO', q: 'Lugar al costado de la cancha donde se sientan los suplentes.', opts: ['Banquillo', 'Tribuna', 'Palco', 'Grada'], c: 0 },
      { w: 'BARRA', q: 'Grupo de hinchas que alienta con cánticos y banderas.', opts: ['Barra', 'Claque', 'Peña', 'Combo'], c: 0 },
      { w: 'BOTINES', q: 'Calzado con tacos que usan los jugadores.', opts: ['Botines', 'Chancletas', 'Zapatillas', 'Mocasines'], c: 0 }
    ],
    C: [
      { w: 'CAMPEÓN', q: 'El equipo que gana el título de la competencia.', opts: ['Campeón', 'Subcampeón', 'Finalista', 'Colista'], c: 0 },
      { w: 'CAPITÁN', q: 'El jugador que lleva el brazalete y lidera al equipo en cancha.', opts: ['Capitán', 'Arquero', 'Nueve', 'Volante'], c: 0 },
      { w: 'CAMBIO', q: 'La sustitución de un jugador por otro durante el partido.', opts: ['Cambio', 'Recambio', 'Relevo', 'Turno'], c: 0 },
      { w: 'CENTRAL', q: 'El defensor que juega en el centro de la zaga.', opts: ['Central', 'Lateral', 'Carrilero', 'Escolta'], c: 0 }
    ],
    D: [
      { w: 'DELANTERO', q: 'El jugador cuya función principal es marcar goles.', opts: ['Delantero', 'Arquero', 'Zaguero', 'Mediocampista'], c: 0 },
      { w: 'DESPEJE', q: 'Acción defensiva de alejar la pelota del área de un puntapié o cabezazo.', opts: ['Despeje', 'Pase', 'Centro', 'Recorte'], c: 0 },
      { w: 'DEFENSOR', q: 'El futbolista de la línea defensiva que protege su propio arco.', opts: ['Defensor', 'Delantero', 'Portero', 'Mediocentro'], c: 0 },
      { w: 'DOBLETE', q: 'Cuando un jugador marca dos goles en el mismo partido.', opts: ['Hat-trick', 'Doblete', 'Triplete', 'Póker'], c: 1 }
    ],
    E: [
      { w: 'EQUIPO', q: 'El conjunto de jugadores que compite contra otro.', opts: ['Equipo', 'Plantel', 'Dúo', 'Dúplex'], c: 0 },
      { w: 'EMPATE', q: 'Resultado en el que ambos equipos anotan la misma cantidad de goles.', opts: ['Empate', 'Goleada', 'Blanco', 'Reparto'], c: 0 },
      { w: 'ENTRENADOR', q: 'El que dirige y prepara tácticamente al equipo.', opts: ['Entrenador', 'Doctor', 'Representante', 'Hincha'], c: 0 },
      { w: 'ESQUEMA', q: 'La disposición táctica de los jugadores (4-4-2, 3-5-2…).', opts: ['Esquema', 'Molde', 'Formato', 'Dibujo'], c: 0 }
    ],
    F: [
      { w: 'FALTA', q: 'La infracción que sanciona el árbitro durante el juego.', opts: ['Falta', 'Ventaja', 'Fuerza', 'Señal'], c: 0 },
      { w: 'FINAL', q: 'El partido que define al campeón del torneo.', opts: ['Final', 'Semifinal', 'Inauguración', 'Despedida'], c: 0 },
      { w: 'FÚTBOL', q: 'El deporte que se juega con los pies, una pelota y dos arcos.', opts: ['Fútbol', 'Rugby', 'Hockey', 'Futsal'], c: 0 },
      { w: 'FUERA DE JUEGO', q: 'Situación en la que un atacante se adelanta a la defensa al recibir el pase (offside).', opts: ['Fuera de juego', 'Lateral', 'Saque inicial', 'Tiro libre'], c: 0 }
    ],
    G: [
      { w: 'GOL', q: 'La anotación, la unidad de puntuación del fútbol.', opts: ['Gol', 'Canasta', 'Ensayo', 'Home run'], c: 0 },
      { w: 'GARRA', q: 'La "garra charrúa": símbolo de la lucha de la selección uruguaya.', opts: ['Garra', 'Fuerza', 'Brío', 'Pasta'], c: 0 },
      { w: 'GOLEADOR', q: 'El jugador que convierte muchos goles.', opts: ['Goleador', 'Anotador', 'Crack', 'Figura'], c: 0 },
      { w: 'GUARDAMETA', q: 'Otro nombre del arquero: el que guarda la meta.', opts: ['Guardameta', 'Defensor', 'Portero', 'Cierre'], c: 0 }
    ],
    H: [
      { w: 'HAT-TRICK', q: 'Tres goles de un mismo jugador en un partido.', opts: ['Hat-trick', 'Doblete', 'Triplete', 'Póker'], c: 0 },
      { w: 'HINCHADA', q: 'Los simpatizantes que alientan desde las tribunas.', opts: ['Hinchada', 'Claque', 'Grada', 'Sala'], c: 0 },
      { w: 'HOMENAJE', q: 'La despedida de un ídolo o un reconocimiento histórico suele terminar con un…', opts: ['Homenaje', 'Himno', 'Hortaliza', 'Embargo'], c: 0 },
      { w: 'HAZAÑA', q: 'El Maracanazo de 1950 fue una gran… de la Celeste.', opts: ['Hazaña', 'Fracaso', 'Cierre', 'Suerte'], c: 0 }
    ],
    I: [
      { w: 'IDA', q: 'En un cruce de dos partidos, el primer encuentro (la "…").', opts: ['Ida', 'Vuelta', 'Desempate', 'Prórroga'], c: 0 },
      { w: 'IMPEDIMENTO', q: 'Otro nombre del offside o posición adelantada.', opts: ['Impedimento', 'Balón parado', 'Transfer', 'Descenso'], c: 0 },
      { w: 'ILÍCITO', q: 'El "juego …": el juego brusco y antirreglamentario.', opts: ['Ilícito', 'Ágil', 'Rápido', 'Legal'], c: 0 },
      { w: 'INFERIORES', q: 'Las divisiones formativas del club, previas a primera.', opts: ['Inferiores', 'Superiores', 'Supremas', 'Máximas'], c: 0 }
    ],
    J: [
      { w: 'JUGADOR', q: 'El futbolista, protagonista del deporte.', opts: ['Jugador', 'Árbitro', 'Técnico', 'Referí'], c: 0 },
      { w: 'JORNADA', q: 'Cada ronda o fecha de partidos de un torneo.', opts: ['Jornada', 'Semana', 'Mes', 'Cláusula'], c: 0 },
      { w: 'JUVENIL', q: 'La categoría de edad de los futbolistas más jóvenes.', opts: ['Juvenil', 'Profesional', 'Máster', 'Amateur'], c: 0 },
      { w: 'JUGADA', q: 'La acción ofensiva o defensiva durante un ataque.', opts: ['Jugada', 'Finta', 'Racha', 'Esquina'], c: 0 }
    ],
    K: [
      { w: 'KIT', q: 'El conjunto de camiseta, short y medias del equipo.', opts: ['Kit', 'Traje', 'Atuendo', 'Uniforme'], c: 0 },
      { w: 'KICK-OFF', q: 'El puntapié inicial con el que arranca cada tiempo.', opts: ['Kick-off', 'Penal', 'Tiro libre', 'Saque de banda'], c: 0 },
      { w: 'KINESIÓLOGO', q: 'El profesional de la salud que atiende las lesiones de los jugadores.', opts: ['Kinesiólogo', 'Nutricionista', 'Médico', 'Psicólogo'], c: 0 },
      { w: 'KLOSE', q: 'Apellido del alemán máximo goleador histórico de los Mundiales (16 goles).', opts: ['Klose', 'Müller', 'Götze', 'Best'], c: 0 }
    ],
    L: [
      { w: 'LIGA', q: 'La competencia de todos contra todos.', opts: ['Liga', 'Copa', 'Final', 'Descenso'], c: 0 },
      { w: 'LATERAL', q: 'El defensor que juega por una de las bandas de la cancha.', opts: ['Lateral', 'Central', 'Arquero', 'Delantero'], c: 0 },
      { w: 'LÍBERO', q: 'Defensor libre de marca que juega por detrás de la línea defensiva.', opts: ['Líbero', 'Lateral', 'Pivote', 'Segundo arquero'], c: 0 },
      { w: 'LOCAL', q: 'El equipo que juega en su casa, con su gente.', opts: ['Local', 'Visitante', 'Suplente', 'Titular'], c: 0 }
    ],
    M: [
      { w: 'MEDIOCAMPISTA', q: 'El jugador que conecta la defensa con el ataque.', opts: ['Mediocampista', 'Delantero', 'Arquero', 'Defensor'], c: 0 },
      { w: 'MARACANAZO', q: 'La histórica victoria de Uruguay sobre Brasil en el Mundial 1950.', opts: ['Maracanazo', 'Maracaná', 'Montecarlo', 'Mundialazo'], c: 0 },
      { w: 'MUNDIAL', q: 'La Copa del Mundo: el torneo de selecciones que se juega cada 4 años.', opts: ['Mundial', 'Supercopa', 'Recopa', 'Libertadores'], c: 0 },
      { w: 'MANO', q: 'La infracción de tocar la pelota con la mano.', opts: ['Mano', 'Pie', 'Cabeza', 'Hombro'], c: 0 }
    ],
    N: [
      { w: 'NACIONAL', q: 'El club tricolor de Montevideo, gran rival de Peñarol.', opts: ['Nacional', 'Danubio', 'Cerro', 'Racing'], c: 0 },
      { w: 'NÚMERO', q: 'La dorsal que identifica a cada jugador en la camiseta.', opts: ['Número', 'Nombre', 'Escudo', 'Sello'], c: 0 },
      { w: 'NOVENTA', q: 'Los… minutos reglamentarios de un partido de fútbol.', opts: ['Noventa', 'Ciento veinte', 'Cincuenta', 'Sesenta'], c: 0 },
      { w: 'NUEVE', q: 'El dorsal clásico del goleador: el "…" de área.', opts: ['Nueve', 'Diez', 'Siete', 'Once'], c: 0 }
    ],
    O: [
      { w: 'OFFSIDE', q: 'La posición adelantada: el fuera de juego.', opts: ['Offside', 'Lateral', 'Central', 'Córner'], c: 0 },
      { w: 'ONCE', q: 'La cantidad de jugadores de un equipo dentro de la cancha.', opts: ['Once', 'Diez', 'Doce', 'Siete'], c: 0 },
      { w: 'OLÍMPICO', q: 'El gol anotado directo desde el tiro de esquina.', opts: ['Olímpico', 'Convencional', 'Detenido', 'Volado'], c: 0 },
      { w: 'OCASIÓN', q: 'La jugada de peligro: una… clara de gol.', opts: ['Ocasión', 'Rutina', 'Fábula', 'Aventura'], c: 0 }
    ],
    P: [
      { w: 'PENAL', q: 'La falta máxima, que se cobra desde los doce pasos.', opts: ['Penal', 'Córner', 'Tiro libre', 'Saque'], c: 0 },
      { w: 'PEÑAROL', q: 'El club aurinegro de Montevideo, multicampeón de América.', opts: ['Peñarol', 'Nacional', 'Fénix', 'Wanderers'], c: 0 },
      { w: 'PATEAR', q: 'Darle a la pelota con el pie para enviarla hacia algún lado.', opts: ['Patear', 'Atajar', 'Cabezear', 'Parar'], c: 0 },
      { w: 'PORTERO', q: 'El arquero: el guardián del arco.', opts: ['Portero', 'Defensor', 'Mediocampista', 'Extremo'], c: 0 }
    ],
    Q: [
      { w: 'QATAR', q: 'El país que organizó el Mundial de fútbol 2022.', opts: ['Qatar', 'Emiratos', 'Omán', 'Kuwait'], c: 0 },
      { w: 'QUÍMICA', q: 'La… entre compañeros: el entendimiento y la conexión en cancha.', opts: ['Química', 'Física', 'Biología', 'Memoria'], c: 0 },
      { w: 'QUEBRAR', q: 'Superar la línea defensiva rival con una jugada veloz ("… la defensa").', opts: ['Quebrar', 'Nombrar', 'Contar', 'Saber'], c: 0 },
      { w: 'QUILOMBO', q: 'En lunfardo rioplatense: lío o desorden (¡qué… se armó en la tribuna!).', opts: ['Quilombo', 'Kilometraje', 'Festival', 'Clímax'], c: 0 }
    ],
    R: [
      { w: 'REFERÍ', q: 'Así se llama al árbitro en el fútbol uruguayo.', opts: ['Referí', 'Coach', 'Mánager', 'Utilero'], c: 0 },
      { w: 'ROJA', q: 'La tarjeta que expulsa a un jugador.', opts: ['Roja', 'Amarilla', 'Azul', 'Verde'], c: 0 },
      { w: 'REMATE', q: 'El disparo al arco buscando convertir el gol.', opts: ['Remate', 'Pase', 'Centro', 'Dribling'], c: 0 },
      { w: 'RECHAZO', q: 'Alejar la pelota de una jugada de peligro defensivo.', opts: ['Rechazo', 'Corte', 'Recorte', 'Bloqueo'], c: 0 }
    ],
    S: [
      { w: 'SUPLENTE', q: 'El jugador que espera en el banco para poder ingresar.', opts: ['Suplente', 'Titular', 'Refuerzo', 'Contratado'], c: 0 },
      { w: 'SELECCIÓN', q: 'El equipo nacional que reúne a los jugadores del país.', opts: ['Selección', 'Plantel', 'Liga', 'Reserva'], c: 0 },
      { w: 'SORTEO', q: 'El acto de definir por azar los cruces y el fixture.', opts: ['Sorteo', 'Veredicto', 'Sellado', 'Voto'], c: 0 },
      { w: 'SUDAMERICANA', q: 'La copa continental de clubes sudamericanos, por detrás de la Libertadores.', opts: ['Sudamericana', 'Europa League', 'Mundialito', 'Superliga'], c: 0 }
    ],
    T: [
      { w: 'TITULAR', q: 'El jugador que arranca el partido desde el inicio.', opts: ['Titular', 'Suplente', 'Invitado', 'Reforzado'], c: 0 },
      { w: 'TÉCNICO', q: 'El director técnico: el estratega del equipo.', opts: ['Técnico', 'Masajista', 'Canchero', 'Presidente'], c: 0 },
      { w: 'TARJETA', q: 'La amonestación: puede ser amarilla o roja.', opts: ['Tarjeta', 'Campana', 'Pasaporte', 'Acta'], c: 0 },
      { w: 'TRIUNFO', q: 'La victoria del equipo.', opts: ['Triunfo', 'Revés', 'Empate', 'Suspenso'], c: 0 }
    ],
    U: [
      { w: 'UNIFORME', q: 'La indumentaria completa que usa el equipo.', opts: ['Uniforme', 'Aparato', 'Accesorio', 'Adorno'], c: 0 },
      { w: 'URUGUAY', q: 'La Celeste: el país de la garra charrúa.', opts: ['Uruguay', 'Paraguay', 'Colombia', 'Chile'], c: 0 },
      { w: 'ÚLTIMO', q: 'El… minuto: el tramo final del partido (90 y descuento).', opts: ['Último', 'Primero', 'Séptimo', 'Cero'], c: 0 },
      { w: 'UTILERO', q: 'El encargado de la ropa y el equipamiento del plantel.', opts: ['Utilero', 'Canchero', 'Masajista', 'Chofer'], c: 0 }
    ],
    V: [
      { w: 'VAR', q: 'La tecnología de video que asiste al árbitro.', opts: ['VAR', 'GPS', 'FIFA', 'UEFA'], c: 0 },
      { w: 'VOLANTE', q: 'Así se llama al mediocampista en Sudamérica.', opts: ['Volante', 'Extremo', 'Lateral', 'Ariete'], c: 0 },
      { w: 'VISITANTE', q: 'El equipo que juega fuera de su cancha.', opts: ['Visitante', 'Local', 'Comodín', 'Anfitrión'], c: 0 },
      { w: 'VALLA', q: 'El arco o portería: "defender la…".', opts: ['Valla', 'Once', 'Banco', 'Medida'], c: 0 }
    ],
    W: [
      { w: 'WANDERERS', q: 'El club de Montevideo conocido como "los Bohemios".', opts: ['Wanderers', 'Wembley', 'Wilson', 'Windsor'], c: 0 },
      { w: 'WEMBLEY', q: 'El mítico estadio de Londres, sede de la final de la Euro 2021.', opts: ['Wembley', 'Anfield', 'Mestalla', 'San Siro'], c: 0 },
      { w: 'WING', q: 'En la jerga futbolera clásica, el extremo o puntero.', opts: ['Wing', 'Stand', 'Score', 'Corner'], c: 0 }
    ],
    X: [
      { w: 'XAVI', q: 'Futbolista y técnico catalán, leyenda del Barcelona.', opts: ['Xavi', 'Iniesta', 'Busquets', 'Puyol'], c: 0 }
    ],
    Y: [
      { w: 'YUGOSLAVIA', q: 'El país europeo que se desintegró; su selección jugó varios Mundiales (1958, 1962, 1974…).', opts: ['Yugoslavia', 'Yemen', 'Jordania', 'Eslovaquia'], c: 0 }
    ],
    Z: [
      { w: 'ZAGUERO', q: 'El defensor central, el que juega en el centro de la zaga.', opts: ['Zaguero', 'Delantero', 'Volante', 'Arquero'], c: 0 },
      { w: 'ZIZOU', q: 'El apodo de Zinedine Zidane, campeón del mundo en 1998.', opts: ['Zizou', 'Pelé', 'Maradona', 'Best'], c: 0 }
    ]
  },

  pt: {
    A: [
      { w: 'ÁRBITRO', q: 'O responsável por dirigir o jogo, marcar as faltas e aplicar cartões.', opts: ['Árbitro', 'Técnico', 'Médico', 'Massagista'], c: 0 },
      { w: 'ATACANTE', q: 'O jogador cuja principal função é marcar gols.', opts: ['Atacante', 'Zagueiro', 'Goleiro', 'Lateral'], c: 0 },
      { w: 'ASSISTÊNCIA', q: 'O passe que termina em gol de um companheiro.', opts: ['Assistência', 'Defesa', 'Recuperação', 'Posse'], c: 0 },
      { w: 'ÁREA', q: 'A região próxima ao gol em que o goleiro pode usar as mãos.', opts: ['Área', 'Lateral', 'Meio-campo', 'Círculo'], c: 0 }
    ],
    B: [
      { w: 'BOLA', q: 'O esférico com que se joga.', opts: ['Bola', 'Apito', 'Chuteira', 'Cartão'], c: 0 },
      { w: 'BANCO', q: 'Onde ficam os reservas durante o jogo.', opts: ['Banco', 'Cadeira', 'Arquibancada', 'Tribuna'], c: 0 },
      { w: 'BICICLETA', q: 'O lance em que o jogador chuta de costas para o gol (chilena).', opts: ['Bicicleta', 'Carrinho', 'Cavadinha', 'Cabeçada'], c: 0 },
      { w: 'BANDEIRINHA', q: 'O auxiliar do árbitro que sinaliza impedimentos e bolas fora.', opts: ['Bandeirinha', 'Gandula', 'Massagista', 'Técnico'], c: 0 }
    ],
    C: [
      { w: 'CAMPEÃO', q: 'O time que vence o título da competição.', opts: ['Campeão', 'Vice', 'Finalista', 'Lanterna'], c: 0 },
      { w: 'CARTÃO', q: 'A punição disciplinar: amarelo ou vermelho.', opts: ['Cartão', 'Sirene', 'Papel', 'Protocolo'], c: 0 },
      { w: 'COPA', q: 'O torneio de mata-mata, de eliminação direta.', opts: ['Copa', 'Liga', 'Amistoso', 'Recesso'], c: 0 },
      { w: 'CRAQUE', q: 'O jogador de muito talento e habilidade.', opts: ['Craque', 'Novato', 'Reserva', 'Zagueiro'], c: 0 }
    ],
    D: [
      { w: 'DEFESA', q: 'O ato de impedir o gol, feito pelo goleiro.', opts: ['Defesa', 'Escanteio', 'Lateral', 'Marca'], c: 0 },
      { w: 'DRIBLE', q: 'A ação de passar pelo adversário com a bola nos pés.', opts: ['Drible', 'Passe', 'Chute', 'Cabeceio'], c: 0 },
      { w: 'DESTAQUE', q: 'O melhor jogador da partida.', opts: ['Destaque', 'Supremo', 'Comum', 'Nulo'], c: 0 },
      { w: 'DERROTA', q: 'O oposto de vitória.', opts: ['Derrota', 'Empate', 'Goleada', 'Turno'], c: 0 }
    ],
    E: [
      { w: 'EQUIPE', q: 'O conjunto de jogadores que compete contra outro.', opts: ['Equipe', 'Time', 'Dupla', 'Seleção'], c: 0 },
      { w: 'EMPATE', q: 'Resultado com igual número de gols para os dois lados.', opts: ['Empate', 'Goleada', 'Jogo limpo', 'Mando'], c: 0 },
      { w: 'ESCANTEIO', q: 'A falta batida do canto do campo, o córner.', opts: ['Escanteio', 'Lateral', 'Tiro de meta', 'Pênalti'], c: 0 },
      { w: 'ESTÁDIO', q: 'O local onde se jogam as partidas.', opts: ['Estádio', 'Ginásio', 'Pátio', 'Quartel'], c: 0 }
    ],
    F: [
      { w: 'FALTA', q: 'A infração sancionada pelo árbitro.', opts: ['Falta', 'Vantagem', 'Força', 'Sinal'], c: 0 },
      { w: 'FINAL', q: 'A partida que define o campeão.', opts: ['Final', 'Semifinal', 'Abertura', 'Despedida'], c: 0 },
      { w: 'FUTEBOL', q: 'O esporte jogado com os pés, uma bola e dois gols.', opts: ['Futebol', 'Rugby', 'Hóquei', 'Futsal'], c: 0 },
      { w: 'FINTA', q: 'Movimento com o corpo para enganar o marcador.', opts: ['Finta', 'Chute', 'Toque', 'Desarme'], c: 0 }
    ],
    G: [
      { w: 'GOL', q: 'A anotação do futebol.', opts: ['Gol', 'Cesta', 'Ponto', 'Home run'], c: 0 },
      { w: 'GOLEIRO', q: 'O jogador que defende o gol, o único que pode usar as mãos.', opts: ['Goleiro', 'Zagueiro', 'Lateral', 'Atacante'], c: 0 },
      { w: 'GARRA', q: 'A "garra celeste": símbolo da luta da seleção uruguaia.', opts: ['Garra', 'Força', 'Estilo', 'Sorte'], c: 0 },
      { w: 'GOLEADA', q: 'Partida com muitos gols de um dos lados.', opts: ['Goleada', 'Empate', 'Batalha', 'Debate'], c: 0 }
    ],
    H: [
      { w: 'HAT-TRICK', q: 'Três gols de um mesmo jogador em uma partida.', opts: ['Hat-trick', 'Poker', 'Bicicleta', 'Gol olímpico'], c: 0 },
      { w: 'HALFTIME', q: 'O intervalo entre os dois tempos de jogo.', opts: ['Halftime', 'Kickoff', 'Extra time', 'Overtime'], c: 0 }
    ],
    I: [
      { w: 'IMPEDIMENTO', q: 'O offside: quando o atacante recebe a bola adiantado.', opts: ['Impedimento', 'Escanteio', 'Lateral', 'Falta'], c: 0 },
      { w: 'IDA', q: 'No formato de dois jogos, o primeiro confronto (a…).', opts: ['Ida', 'Volta', 'Desempate', 'Prorrogação'], c: 0 },
      { w: 'IMPRENSA', q: 'Os jornalistas que cobrem e noticiam o futebol.', opts: ['Imprensa', 'Público', 'Torcida', 'Convocação'], c: 0 },
      { w: 'INTERNACIONAL', q: 'Palavra presente no nome de clubes como o de Porto Alegre.', opts: ['Internacional', 'Estadual', 'Municipal', 'Amador'], c: 0 }
    ],
    J: [
      { w: 'JOGADOR', q: 'O atleta do futebol.', opts: ['Jogador', 'Árbitro', 'Técnico', 'Bandeirinha'], c: 0 },
      { w: 'JOGO', q: 'A partida entre dois times.', opts: ['Jogo', 'Treino', 'Sorteio', 'Bilhete'], c: 0 },
      { w: 'JUIZ', q: 'O árbitro também é chamado de… (o que apita o jogo é o central).', opts: ['Juiz', 'Ingênuo', 'Mestre', 'Cabeça'], c: 0 },
      { w: 'JÚNIOR', q: 'Categoria de base de um clube: o time…', opts: ['Júnior', 'Sênior', 'Máster', 'Amador'], c: 0 }
    ],
    K: [
      { w: 'KIT', q: 'O conjunto de camisa, short e meias do time.', opts: ['Kit', 'Traje', 'Uniforme', 'Figurino'], c: 0 },
      { w: 'KLOSE', q: 'Sobrenome do alemão maior artilheiro das Copas do Mundo (16 gols).', opts: ['Klose', 'Götze', 'Müller', 'Pelé'], c: 0 },
      { w: 'KICK-OFF', q: 'O pontapé inicial, que dá início à partida.', opts: ['Kick-off', 'Pênalti', 'Tiro de meta', 'Escanteio'], c: 0 }
    ],
    L: [
      { w: 'LATERAL', q: 'Jogador que atua pelas laterais do campo.', opts: ['Lateral', 'Zagueiro', 'Goleiro', 'Atacante'], c: 0 },
      { w: 'LIGA', q: 'Competição em que todos jogam contra todos.', opts: ['Liga', 'Copa', 'Final', 'Recesso'], c: 0 },
      { w: 'LANTERNA', q: 'O time que está em último lugar na tabela.', opts: ['Lanterna', 'Líder', 'Média', 'Topo'], c: 0 },
      { w: 'LIBERTADORES', q: 'A principal competição de clubes da América do Sul.', opts: ['Libertadores', 'Sul-Americana', 'Mundial', 'Recopa'], c: 0 }
    ],
    M: [
      { w: 'MEIA', q: 'O jogador que liga a defesa ao ataque (meio-campo).', opts: ['Meia', 'Atacante', 'Goleiro', 'Zagueiro'], c: 0 },
      { w: 'MUNDIAL', q: 'A Copa do Mundo de seleções.', opts: ['Mundial', 'Continental', 'Recopa', 'Superliga'], c: 0 },
      { w: 'MARACANAZO', q: 'A histórica vitória do Uruguai sobre o Brasil na Copa de 1950.', opts: ['Maracanazo', 'Maracanã', 'Milagre', 'Gesta'], c: 0 },
      { w: 'MÃO', q: 'Infração de tocar a bola com a mão.', opts: ['Mão', 'Pé', 'Cabeça', 'Ombro'], c: 0 }
    ],
    N: [
      { w: 'NACIONAL', q: 'Clube de Montevidéu, tricolor, grande rival do Peñarol.', opts: ['Nacional', 'Danúbio', 'Cerro', 'Racing'], c: 0 },
      { w: 'NOVE', q: 'A camisa clássica do artilheiro: o 9.', opts: ['Nove', 'Dez', 'Sete', 'Onze'], c: 0 },
      { w: 'NÚMERO', q: 'A numeração que identifica o jogador na camisa.', opts: ['Número', 'Nome', 'Escudo', 'Selo'], c: 0 },
      { w: 'NOVENTA', q: 'Os… minutos regulamentares de uma partida.', opts: ['Noventa', 'Cento e vinte', 'Cinquenta', 'Sessenta'], c: 0 }
    ],
    O: [
      { w: 'OFFSIDE', q: 'O impedimento, em inglês.', opts: ['Offside', 'Escanteio', 'Lateral', 'Tiro livre'], c: 0 },
      { w: 'ONZE', q: 'O número de jogadores de um time em campo.', opts: ['Onze', 'Dez', 'Doze', 'Sete'], c: 0 },
      { w: 'OLÍMPICO', q: 'Gol marcado direto do escanteio.', opts: ['Olímpico', 'Direto', 'Comum', 'Aéreo'], c: 0 },
      { w: 'OITAVAS', q: 'Fase de mata-mata com 16 equipes ainda na disputa.', opts: ['Oitavas', 'Quartas', 'Semifinal', 'Grupos'], c: 0 }
    ],
    P: [
      { w: 'PÊNALTI', q: 'A máxima penalidade, cobrada a partir dos 11 metros.', opts: ['Pênalti', 'Escanteio', 'Tiro livre', 'Lateral'], c: 0 },
      { w: 'PEÑAROL', q: 'Clube de Montevidéu, aurinegro, multicampeão da América.', opts: ['Peñarol', 'Nacional', 'Wanderers', 'Fênix'], c: 0 },
      { w: 'PASSE', q: 'A entrega da bola para um companheiro.', opts: ['Passe', 'Chute', 'Falta', 'Saque'], c: 0 },
      { w: 'PONTO', q: 'Como o gol também é chamado no placar.', opts: ['Ponto', 'Vitória', 'Duelo', 'Título'], c: 0 }
    ],
    Q: [
      { w: 'QUARTAS', q: 'Fase de mata-mata com 8 times.', opts: ['Quartas', 'Oitavas', 'Semifinal', 'Grupos'], c: 0 },
      { w: 'QUALIFICAÇÃO', q: 'As eliminatórias para definir quem vai ao Mundial.', opts: ['Qualificação', 'Amistoso', 'Torneio', 'Dominio'], c: 0 },
      { w: 'QATAR', q: 'O país que sediou a Copa do Mundo de 2022.', opts: ['Qatar', 'Emirados', 'Omã', 'Kuwait'], c: 0 },
      { w: 'QUÍMICA', q: 'A… entre companheiros: o entrosamento em campo.', opts: ['Química', 'Física', 'Biologia', 'Memória'], c: 0 }
    ],
    R: [
      { w: 'REDE', q: 'A parte de trás do gol, onde a bola termina quando entra.', opts: ['Rede', 'Travessão', 'Escanteio', 'Marca'], c: 0 },
      { w: 'RODADA', q: 'Cada ronda de jogos de uma competição.', opts: ['Rodada', 'Rodapé', 'Semana', 'Turno'], c: 0 },
      { w: 'RESERVA', q: 'O jogador que está no banco e pode entrar.', opts: ['Reserva', 'Titular', 'Reforço', 'Contratado'], c: 0 },
      { w: 'RIVAL', q: 'O adversário de um time.', opts: ['Rival', 'Parceiro', 'Sócio', 'Aliado'], c: 0 }
    ],
    S: [
      { w: 'SELEÇÃO', q: 'O time nacional do país.', opts: ['Seleção', 'Clube', 'Liga', 'Reserva'], c: 0 },
      { w: 'SORTEIO', q: 'O ato de definir os cruzamentos do calendário por sorte.', opts: ['Sorteio', 'Veredicto', 'Selo', 'Voto'], c: 0 },
      { w: 'SUL-AMERICANA', q: 'A segunda competição continental de clubes da América do Sul.', opts: ['Sul-Americana', 'Libertadores', 'Mundial', 'Nacional'], c: 0 },
      { w: 'SUSPENSÃO', q: 'Punição que afasta o jogador por alguns jogos.', opts: ['Suspensão', 'Comemoração', 'Promoção', 'Premiação'], c: 0 }
    ],
    T: [
      { w: 'TÉCNICO', q: 'O estrategista do time.', opts: ['Técnico', 'Massagista', 'Gandula', 'Presidente'], c: 0 },
      { w: 'TITULAR', q: 'O jogador que começa a partida jogando.', opts: ['Titular', 'Reserva', 'Convidado', 'Reforço'], c: 0 },
      { w: 'TORCIDA', q: 'Os torcedores que incentivam nas arquibancadas.', opts: ['Torcida', 'Claque', 'Galera', 'Banda'], c: 0 },
      { w: 'TRAVESSÃO', q: 'A trave superior do gol.', opts: ['Travessão', 'Lateral', 'Grelha', 'Marco'], c: 0 }
    ],
    U: [
      { w: 'URUGUAI', q: 'A Celeste: o país da garra charrua.', opts: ['Uruguai', 'Paraguai', 'Colômbia', 'Chile'], c: 0 },
      { w: 'UNIFORME', q: 'A vestimenta completa do time.', opts: ['Uniforme', 'Aparato', 'Figurino', 'Adereço'], c: 0 },
      { w: 'ÚLTIMO', q: 'O… lance da partida (90 e acréscimos).', opts: ['Último', 'Primeiro', 'Sétimo', 'Zero'], c: 0 },
      { w: 'UNIÃO', q: 'Palavra presente em nomes de clubes brasileiros (ex: União São João).', opts: ['União', 'Aliança', 'Coligação', 'Federação'], c: 0 }
    ],
    V: [
      { w: 'VAR', q: 'Tecnologia de vídeo que auxilia o árbitro.', opts: ['VAR', 'GPS', 'FIFA', 'UEFA'], c: 0 },
      { w: 'VITÓRIA', q: 'O resultado em que um time vence.', opts: ['Vitória', 'Derrota', 'Empate', 'Suspenso'], c: 0 },
      { w: 'VERMELHO', q: 'O cartão que expulsa o jogador.', opts: ['Vermelho', 'Amarelo', 'Azul', 'Verde'], c: 0 },
      { w: 'VOLEIO', q: 'Chute na bola no ar, sem tocar o chão.', opts: ['Voleio', 'Bicicleta', 'Cavadinha', 'Toque'], c: 0 }
    ],
    W: [
      { w: 'WANDERERS', q: 'Clube de Montevidéu conhecido como "os Boêmios".', opts: ['Wanderers', 'Wembley', 'Wilson', 'Web'], c: 0 },
      { w: 'WEMBLEY', q: 'Estádio mítico da Inglaterra.', opts: ['Wembley', 'Anfield', 'Santiago Bernabéu', 'San Siro'], c: 0 }
    ],
    X: [
      { w: 'XAVI', q: 'Técnico e ex-jogador catalão, lenda do Barcelona.', opts: ['Xavi', 'Iniesta', 'Busquets', 'Puyol'], c: 0 }
    ],
    Y: [
      { w: 'YUGOSLÁVIA', q: 'País europeu que se desfez; sua seleção disputou várias Copas do Mundo.', opts: ['Yugoslávia', 'Iêmen', 'Jordânia', 'Eslováquia'], c: 0 }
    ],
    Z: [
      { w: 'ZAGUEIRO', q: 'O defensor central.', opts: ['Zagueiro', 'Atacante', 'Meia', 'Goleiro'], c: 0 },
      { w: 'ZONA', q: 'A… de perigo: a área próxima ao gol.', opts: ['Zona', 'Linha', 'Conta', 'Parte'], c: 0 },
      { w: 'ZIZOU', q: 'O apelido de Zinedine Zidane, campeão do mundo em 1998.', opts: ['Zizou', 'Pelé', 'Maradona', 'Best'], c: 0 }
    ]
  }
};