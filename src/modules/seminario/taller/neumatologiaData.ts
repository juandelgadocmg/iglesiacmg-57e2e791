export interface PreguntaOpcion {
  id: string;
  texto: string;
  explicacion?: string;
  referenciaBiblica?: string;
  esCorrecta?: boolean;
}

export interface PreguntaEscenario {
  id: string;
  titulo?: string;
  descripcion: string;
  opciones: PreguntaOpcion[];
  respuestaCorrectaId: string;
  explicacionGeneral: string;
  referenciaBiblica?: string;
}

export interface ConceptoDesafio {
  id: string;
  nombre: string;
  descripcionBreve: string;
  preguntasGuia: string[];
}

export const CONCEPTOS_60_SEGUNDOS: ConceptoDesafio[] = [
  {
    id: "espiritu_santo",
    nombre: "Espíritu Santo",
    descripcionBreve: "Tercera persona de la Trinidad, Consolador y Guía.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "siete_espiritus",
    nombre: "Siete Espíritus",
    descripcionBreve: "La plenitud y manifestación septiforme del Espíritu de Dios (Isaías 11:2).",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "don",
    nombre: "Don Espiritual",
    descripcionBreve: "Manifestación sobrenatural concedida por el Espíritu Santo para edificación.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "operacion",
    nombre: "Operación",
    descripcionBreve: "La obra eficaz que Dios produce mediante las manifestaciones espirituales.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "ministerio",
    nombre: "Ministerio",
    descripcionBreve: "Servicio y función estructurada para cuidar y equipar al cuerpo de Cristo.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "discernimiento",
    nombre: "Discernimiento",
    descripcionBreve: "Capacidad dada por el Espíritu para juzgar las manifestaciones y espíritus.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "falsificacion",
    nombre: "Falsificación",
    descripcionBreve: "Imitación carnal o demoníaca que imita la obra verdadera pero contradice la Verdad.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "anciano",
    nombre: "Anciano / Pastor",
    descripcionBreve: "Oficio ministerial dedicado al cuidado, supervisión y alimento espiritual.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "diacono",
    nombre: "Diácono",
    descripcionBreve: "Oficio ministerial de servicio práctico con alta exigencia moral.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "ayudas",
    nombre: "Dones / Ministerio de Ayudas",
    descripcionBreve: "Capacidad para respaldar, facilitar y apoyar el trabajo del cuerpo.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
  {
    id: "gobierno",
    nombre: "Dones / Ministerio de Gobierno",
    descripcionBreve: "Capacidad para administrar, guiar y coordinar ordenadamente el ministerio.",
    preguntasGuia: ["¿Qué es?", "¿Para qué sirve?", "¿Cómo se aplica en la Iglesia?"],
  },
];

// ACTIVIDAD 1: CONECTANDO TODO
export const ACTIVIDAD_1_DATA = {
  titulo: "Conectando todo",
  subtitulo: "¿Cómo se relacionan estos conceptos?",
  instrucciones: "Aprende y evalúa la diferencia práctica entre DONES, MINISTERIOS y OPERACIONES.",
  tarjetas: [
    {
      id: "dones",
      concepto: "DONES",
      subtituloConcepto: "¿Qué manifiesta el Espíritu?",
      pregunta: "¿Cuál de estas situaciones representa principalmente un DON?",
      opciones: [
        {
          id: "A",
          texto: "A. El Espíritu Santo concede a una persona una manifestación sobrenatural para provecho de otros.",
          esCorrecta: true,
        },
        {
          id: "B",
          texto: "B. Una persona es responsable de supervisar y cuidar espiritualmente a una congregación.",
          esCorrecta: false,
        },
        {
          id: "C",
          texto: "C. Una iglesia organiza sus diferentes equipos para funcionar de manera ordenada.",
          esCorrecta: false,
        },
      ],
      respuestaCorrectaId: "A",
      retroalimentacion: "Los dones son manifestaciones del Espíritu dadas para provecho.",
      referenciaBiblica: "1 Corintios 12:7",
    },
    {
      id: "ministerios",
      concepto: "MINISTERIOS",
      subtituloConcepto: "¿Cómo servimos al cuerpo?",
      pregunta: "¿Cuál de estas situaciones representa principalmente un MINISTERIO?",
      opciones: [
        {
          id: "A",
          texto: "A. Dios produce un resultado sobrenatural mediante una manifestación espiritual.",
          esCorrecta: false,
        },
        {
          id: "B",
          texto: "B. Una persona ejerce una función de servicio y edificación dentro del cuerpo de Cristo.",
          esCorrecta: true,
        },
        {
          id: "C",
          texto: "C. El Espíritu Santo concede una manifestación sobrenatural a un creyente.",
          esCorrecta: false,
        },
      ],
      respuestaCorrectaId: "B",
      retroalimentacion: "Los ministerios describen funciones o servicios dentro del cuerpo de Cristo para su edificación.",
      referenciaBiblica: "1 Corintios 12:5 / Efesios 4:11-12",
    },
    {
      id: "operaciones",
      concepto: "OPERACIONES",
      subtituloConcepto: "¿Qué produce Dios?",
      pregunta: "¿Cuál de estas situaciones representa principalmente una OPERACIÓN?",
      opciones: [
        {
          id: "A",
          texto: "A. El Espíritu Santo manifiesta un don mediante una persona.",
          esCorrecta: false,
        },
        {
          id: "B",
          texto: "B. Una persona ocupa una función de servicio dentro de la iglesia.",
          esCorrecta: false,
        },
        {
          id: "C",
          texto: "C. Dios produce un efecto o resultado mediante su obra.",
          esCorrecta: true,
        },
      ],
      respuestaCorrectaId: "C",
      retroalimentacion: "Las operaciones se relacionan con la actividad, efecto o resultado que Dios produce.",
      referenciaBiblica: "1 Corintios 12:6",
    },
  ],
  flujoTeologico: [
    { concepto: "DONES", pregunta: "¿Qué manifiesta el Espíritu?" },
    { concepto: "MINISTERIOS", pregunta: "¿Cómo servimos al cuerpo?" },
    { concepto: "OPERACIONES", pregunta: "¿Qué produce Dios?" },
    { concepto: "EDIFICACIÓN DEL CUERPO DE CRISTO", pregunta: "Propósito supremo" },
  ],
  casoIntegrador: {
    historia: "Durante una reunión, el Espíritu Santo manifiesta un don a través de un creyente. Esa persona está sirviendo dentro de un ministerio de la iglesia y, mediante esa intervención, Dios produce restauración en una persona.",
    preguntas: [
      {
        id: "don",
        etiqueta: "¿QUÉ ES EL DON?",
        opciones: [
          { id: "don_correcta", texto: "Manifestación sobrenatural del Espíritu", esCorrecta: true },
          { id: "don_inc1", texto: "Función administrativa de liderazgo" },
          { id: "don_inc2", texto: "El resultado final de sanidad física" },
        ],
        respuestaCorrectaId: "don_correcta",
      },
      {
        id: "ministerio",
        etiqueta: "¿QUÉ ES EL MINISTERIO?",
        opciones: [
          { id: "min_inc1", texto: "La emoción colectiva vivida en el templo" },
          { id: "min_correcta", texto: "Función mediante la cual la persona sirve", esCorrecta: true },
          { id: "min_inc2", texto: "Un diploma de certificación teológica" },
        ],
        respuestaCorrectaId: "min_correcta",
      },
      {
        id: "operacion",
        etiqueta: "¿QUÉ ES LA OPERACIÓN?",
        opciones: [
          { id: "op_inc1", texto: "El esfuerzo humano de la congregación" },
          { id: "op_inc2", texto: "El carisma o don del predicador" },
          { id: "op_correcta", texto: "Lo que Dios produce mediante esa obra", esCorrecta: true },
        ],
        respuestaCorrectaId: "op_correcta",
      },
    ],
  },
  fraseFinal: [
    "EL ESPÍRITU MANIFIESTA",
    "NOSOTROS SERVIMOS",
    "DIOS OPERA",
  ],
  referenciaFinal: "1 Corintios 12:4-6",
};

// ACTIVIDAD 2: SIETE ESPÍRITUS DE DIOS
export const ACTIVIDAD_2_DATA = {
  titulo: "Los Siete Espíritus de Dios",
  aclaracionTeologica: "De acuerdo al material estudiado en el curso (Isaías 11:2 y Apocalipsis 1:4), esta expresión no se refiere a 7 Espíritus Santos diferentes, sino a la descripción bíblica sobre la plenitud septiforme y perfecta operación del único Espíritu de Dios.",
  expresiones: [
    "Espíritu de Jehová",
    "Espíritu de Sabiduría",
    "Espíritu de Entendimiento",
    "Espíritu de Consejo",
    "Espíritu de Poder",
    "Espíritu de Conocimiento",
    "Espíritu de Temor de Jehová",
  ],
  casos: [
    {
      id: "a2_c1",
      descripcion: "Un líder debe tomar una decisión compleja sobre un conflicto ministerial que afecta a varias familias en la congregación.",
      opciones: ["Espíritu de Poder", "Espíritu de Sabiduría", "Género de Lenguas", "Sanidad"],
      respuestaCorrecta: "Espíritu de Sabiduría",
      explicacion: "El Espíritu de Sabiduría otorga la capacidad sobrenatural para aplicar la verdad divina en decisiones prácticas e imprevistas con prudencia celestial.",
      referenciaBiblica: "Isaías 11:2 / Santiago 3:17",
    },
    {
      id: "a2_c2",
      descripcion: "Un creyente profundiza en un texto difícil de la Escritura y de pronto comprende con total claridad la intención espiritual del texto.",
      opciones: ["Espíritu de Entendimiento", "Espíritu de Temor de Jehová", "Dones de Sanidades", "Operación de Milagros"],
      respuestaCorrecta: "Espíritu de Entendimiento",
      explicacion: "El Espíritu de Entendimiento brinda perspicacia divina para discernir la luz y el significado profundo de la Revelación.",
      referenciaBiblica: "Isaías 11:2 / Efesios 1:17-18",
    },
    {
      id: "a2_c3",
      descripcion: "Un pastor ante una crisis severa recibe la dirección bíblica estratégica exacta sobre qué pasos institucionales tomar.",
      opciones: ["Espíritu de Consejo", "Espíritu de Poder", "Lenguas", "Profecía"],
      respuestaCorrecta: "Espíritu de Consejo",
      explicacion: "El Espíritu de Consejo es el orientador divino que traza el rumbo exacto y la estrategia correcta ante situaciones difíciles.",
      referenciaBiblica: "Isaías 11:2 / Salmos 32:8",
    },
    {
      id: "a2_c4",
      descripcion: "Un servidor siente una reverencia santa y profunda ante la presencia del Señor, llevándolo a alejarse del pecado voluntariamente.",
      opciones: ["Espíritu de Temor de Jehová", "Espíritu de Poder", "Espíritu de Sabiduría", "Interpretación de Lenguas"],
      respuestaCorrecta: "Espíritu de Temor de Jehová",
      explicacion: "El Espíritu de Temor de Jehová engendra un santo respeto, asombro reverente y obediencia absoluta a la santidad de Dios.",
      referenciaBiblica: "Isaías 11:2 / Proverbios 9:10",
    },
    {
      id: "a2_c5",
      descripcion: "Un creyente recibe fuerzas espirituales extraordinarias para resistir una fuerte tentación y mantenerse firme frente a la persecución.",
      opciones: ["Espíritu de Poder", "Espíritu de Conocimiento", "Espíritu de Consejo", "Ayudas"],
      respuestaCorrecta: "Espíritu de Poder",
      explicacion: "El Espíritu de Poder manifiesta el vigor, la fortaleza (dunamis) y la firmeza soberana de Dios para vencer el mal y cumplir su obra.",
      referenciaBiblica: "Isaías 11:2 / 2 Timoteo 1:7",
    },
  ],
};

// ACTIVIDAD 3: ¿DON, MINISTERIO U OPERACIÓN?
export const ACTIVIDAD_3_DATA = {
  titulo: "¿Don, Ministerio u Operación?",
  instrucciones: "Clasifica cada una de las siguientes manifestaciones según corresponda a DON, MINISTERIO u OPERACIÓN.",
  casos: [
    {
      id: "a3_c1",
      descripcion: "El Espíritu Santo concede una manifestación sobrenatural a un creyente para provecho de la iglesia.",
      respuestaCorrecta: "DON",
      explicacion: "Es un DON porque constituye una manifestación graciosa e inmerecida otorgada capacitada por el Espíritu Santo.",
      referenciaBiblica: "1 Corintios 12:7",
    },
    {
      id: "a3_c2",
      descripcion: "Una persona sirve cuidando, guiando y supervisando espiritualmente a la congregación de manera constante.",
      respuestaCorrecta: "MINISTERIO",
      explicacion: "Es un MINISTERIO porque es una función de servicio continuo y un rol de edificación asignado en el cuerpo.",
      referenciaBiblica: "Efesios 4:11 / 1 Pedro 5:2",
    },
    {
      id: "a3_c3",
      descripcion: "Dios utiliza una manifestación espiritual para producir restauración profunda y salvación en una persona.",
      respuestaCorrecta: "OPERACIÓN",
      explicacion: "Es una OPERACIÓN porque se enfoca en la obra y el fruto transformador que Dios realiza eficazmente.",
      referenciaBiblica: "1 Corintios 12:6",
    },
    {
      id: "a3_c4",
      descripcion: "Un creyente recibe súbitamente la revelación específica de un pasaje para exhortar y consolar a alguien en angustia.",
      respuestaCorrecta: "DON",
      explicacion: "La impartición dada puntualmente para ese momento corresponde a la manifestación de un DON espiritual (Profecía / Palabra).",
      referenciaBiblica: "1 Corintios 14:3",
    },
    {
      id: "a3_c5",
      descripcion: "Un hermano ejerce la labor de Diácono administrando los recursos de caridad de la iglesia local.",
      respuestaCorrecta: "MINISTERIO",
      explicacion: "Corresponde a un MINISTERIO formal de servicio dentro de la estructura eclesiástica.",
      referenciaBiblica: "1 Timoteo 3:8-10",
    },
    {
      id: "a3_c6",
      descripcion: "El resultado milagroso obtenido tras una oración con fe que sana a un enfermo y produce convicción en incrédulos.",
      respuestaCorrecta: "OPERACIÓN",
      explicacion: "El impacto, poder y efecto producido por Dios es la OPERACIÓN divinamente ejecutada.",
      referenciaBiblica: "1 Corintios 12:6,11",
    },
  ],
};

// ACTIVIDAD 4: LA FALSIFICACIÓN DE LOS DONES
export const ACTIVIDAD_4_DATA = {
  titulo: "La Falsificación de los Dones",
  instrucciones: "Analiza el caso e identifica si la situación se trata de: GENUINO, DON GENUINO MAL UTILIZADO o FALSIFICACIÓN.",
  casos: [
    {
      id: "a4_c1",
      descripcion: "Una persona tiene una capacidad espiritual genuina, pero comienza a utilizarla para controlar las decisiones de otras personas e infundir temor.",
      respuestaCorrecta: "DON GENUINO MAL UTILIZADO",
      explicacion: "El origen puede haber sido genuino, pero el uso manipulador y carnal distorsiona el propósito del don de edificar.",
      referenciaBiblica: "1 Corintios 14:40 / 2 Corintios 4:2",
    },
    {
      id: "a4_c2",
      descripcion: "Una persona afirma recibir mensajes espirituales que contradicen claramente la enseñanza revelada en la Sagrada Escritura.",
      respuestaCorrecta: "FALSIFICACIÓN",
      explicacion: "El Espíritu Santo nunca contradice la Palabra de Dios que Él mismo inspiró. Cualquier manifestación contraria a la Biblia es una falsificación.",
      referenciaBiblica: "Gálatas 1:8 / 1 Juan 4:1",
    },
    {
      id: "a4_c3",
      descripcion: "Una manifestación es presentada humildemente, está en total acuerdo con la Escritura, glorifica a Cristo y se somete a juicio del liderazgo.",
      respuestaCorrecta: "GENUINO",
      explicacion: "Reúne las marcas bíblicas de autenticidad: someterse a Cristo, alinearse con la Biblia, dar fruto santo y sujetarse al orden.",
      referenciaBiblica: "1 Corintios 14:29-33",
    },
    {
      id: "a4_c4",
      descripcion: "Un individuo simula hablar en lenguas imitando sonidos aprendidos de manera teatral para ganar estatus y admiración en la tarima.",
      respuestaCorrecta: "FALSIFICACIÓN",
      explicacion: "Una imitación intencional nacida de la vanagloria carnal es una falsificación desprovista del Espíritu.",
      referenciaBiblica: "Mateo 6:5 / 2 Timoteo 3:5",
    },
    {
      id: "a4_c5",
      descripcion: "Un hermano recibe una palabra inspirada de exhortación pero interrumpe violentamente la predicación del pastor sin ningún orden.",
      respuestaCorrecta: "DON GENUINO MAL UTILIZADO",
      explicacion: "Pablo señala que 'los espíritus de los profetas están sujetos a los profetas' y que todo debe hacerse decorosamente. El impulso es genuino pero el procedimiento es desordenado.",
      referenciaBiblica: "1 Corintios 14:32-33",
    },
  ],
};

// ACTIVIDAD 5: DISCERNIMIENTO ESPIRITUAL
export const ACTIVIDAD_5_DATA = {
  titulo: "Discernimiento Espiritual",
  filtros: [
    { numero: "01", nombre: "CRISTO", pregunta: "¿Glorifica a Jesús como Señor?" },
    { numero: "02", nombre: "PALABRA", pregunta: "¿Está en total acuerdo con la Sagrada Escritura?" },
    { numero: "03", nombre: "FRUTO", pregunta: "¿Qué produce en la conducta y en la iglesia?" },
    { numero: "04", nombre: "EDIFICACIÓN", pregunta: "¿Edifica, consoló y fortalece al cuerpo?" },
    { numero: "05", nombre: "ORDEN", pregunta: "¿Respeta el orden y autoridad bíblica?" },
  ],
  casos: [
    {
      id: "a5_c1",
      descripcion: "En una reunión, una persona da una exhortación que trae profunda convicción de pecado, invita al arrepentimiento, honra a Cristo y respeta la guía del pastor.",
      respuestaCorrecta: "🟢 ACEPTARSE",
      explicacion: "Pasa con excelencia los 5 filtros: glorifica a Cristo, edifica a la congregación, da fruto santo y se enmarca en el orden.",
      referenciaBiblica: "1 Corintios 14:3",
    },
    {
      id: "a5_c2",
      descripcion: "Una persona profetiza afirmando que 'Dios ha cambiado de opinión sobre el matrimonio' y propone romper un hogar alegando 'una nueva revelación'.",
      respuestaCorrecta: "🔴 RECHAZARSE",
      explicacion: "Falla estrepitosamente en el filtro de la PALABRA y del FRUTO. Ninguna profecía puede anular la ley moral y la enseñanza de Jesús sobre el matrimonio.",
      referenciaBiblica: "Hebreos 13:4 / Mateo 19:6",
    },
    {
      id: "a5_c3",
      descripcion: "Durante la oración se manifiesta una palabra que inquieta pero no queda totalmente clara si procede de una emoción personal o inspiración del Espíritu.",
      respuestaCorrecta: "🟡 DISCERNIRSE / JUZGARSE",
      explicacion: "La Escritura ordena: 'Probadlo todo; retened lo bueno' y 'los profetas hablen... y los demás juzguen'. Requiere análisis antes de aplicarse.",
      referenciaBiblica: "1 Tesalonicenses 5:21 / 1 Corintios 14:29",
    },
    {
      id: "a5_c4",
      descripcion: "Un conferencista exige dinero a cambio de 'impartir la unción de prosperidad', prometiendo milagros inmediatos a quien deposite valores.",
      respuestaCorrecta: "🔴 RECHAZARSE",
      explicacion: "Es el pecado de Simonía (Hechos 8). Los dones de Dios no se compran ni se venden. Debe rechazarse con firmeza.",
      referenciaBiblica: "Hechos 8:18-22",
    },
  ],
};

// ACTIVIDAD 6: LOS NUEVE DONES EN ACCIÓN
export const ACTIVIDAD_6_DATA = {
  titulo: "Los Nueve Dones en Acción",
  donesDisponibles: [
    "Palabra de sabiduría",
    "Palabra de conocimiento",
    "Fe",
    "Dones de sanidades",
    "Operación de milagros",
    "Profecía",
    "Discernimiento de espíritus",
    "Géneros de lenguas",
    "Interpretación de lenguas",
  ],
  casos: [
    {
      id: "a6_c1",
      descripcion: "Una persona recibe información sobrenatural sobre una situación personal de alguien que no podía conocer por medios naturales.",
      respuestaCorrecta: "Palabra de conocimiento",
      explicacion: "Revelación sobrenatural dada por el Espíritu sobre hechos pasados o presentes que Dios conoce.",
      referenciaBiblica: "1 Corintios 12:8",
    },
    {
      id: "a6_c2",
      descripcion: "Una persona recibe una dirección sobrenatural e inspirada sobre cómo actuar exactamente ante una situación sumamente compleja.",
      respuestaCorrecta: "Palabra de sabiduría",
      explicacion: "Capacidad divina para aplicar la sabiduría de Dios en la resolución estratégica de dilemas.",
      referenciaBiblica: "1 Corintios 12:8",
    },
    {
      id: "a6_c3",
      descripcion: "Un creyente recibe una certidumbre sobrenatural inquebrantable para creer a Dios ante una imposibilidad humana absoluta.",
      respuestaCorrecta: "Fe",
      explicacion: "No es la fe salvadora común, sino un don de fe extraordinario para realizar hazañas y creer lo imposible.",
      referenciaBiblica: "1 Corintios 12:9",
    },
    {
      id: "a6_c4",
      descripcion: "Una persona recibe un mensaje inspirado en su idioma conocido para edificación, exhortación y consolación de la iglesia.",
      respuestaCorrecta: "Profecía",
      explicacion: "Hablar de parte de Dios para edificar, exhortar y consolar a los oyentes.",
      referenciaBiblica: "1 Corintios 14:3",
    },
    {
      id: "a6_c5",
      descripcion: "Un creyente percibe con claridad divina que la causa detrás de la aflicción de una persona es un espíritu de atadura y no una simple dolencia física.",
      respuestaCorrecta: "Discernimiento de espíritus",
      explicacion: "Habilidad dada por el Espíritu para diferenciar entre la obra divina, la influencia demoníaca o la carne.",
      referenciaBiblica: "1 Corintios 12:10",
    },
    {
      id: "a6_c6",
      descripcion: "A través de la imposición de manos y oración, una persona es librada sobrenaturalmente de una enfermedad crónica diagnosticada incurablemente.",
      respuestaCorrecta: "Dones de sanidades",
      explicacion: "Manifestaciones de poder restaurador para sanar dolencias y enfermedades físicas o emocionales.",
      referenciaBiblica: "1 Corintios 12:9",
    },
    {
      id: "a6_c7",
      descripcion: "Ocurre una alteración instantánea de las leyes naturales (ej. multiplicación de alimentos o detención de una tormenta) por oración impetrada.",
      respuestaCorrecta: "Operación de milagros",
      explicacion: "Intervenciones divinas sobrenaturales que suspenden o sobrepasan el orden natural manifiesto.",
      referenciaBiblica: "1 Corintios 12:10",
    },
    {
      id: "a6_c8",
      descripcion: "Un creyente se dirige a Dios mediante un lenguaje espiritual sobrenatural concedido directamente por el Espíritu Santo.",
      respuestaCorrecta: "Géneros de lenguas",
      explicacion: "Oración o alabanza en idiomas espirituales o humanos no aprendidos previamente por el hablante.",
      referenciaBiblica: "1 Corintios 12:10 / 1 Corintios 14:2",
    },
    {
      id: "a6_c9",
      descripcion: "En la congregación se da el significado en el idioma común de una manifestación hablada en lenguas para edificar a todos.",
      respuestaCorrecta: "Interpretación de lenguas",
      explicacion: "Don que traduce el sentido del mensaje en lenguas para que la congregación entienda y sea edificada.",
      referenciaBiblica: "1 Corintios 12:10 / 1 Corintios 14:27",
    },
  ],
};

// ACTIVIDAD 7: ANCIANOS, DIÁCONOS, AYUDAS Y GOBIERNOS
export const ACTIVIDAD_7_DATA = {
  titulo: "Ancianos, Diáconos, Ayudas y Gobiernos",
  roles: [
    { id: "ancianos", nombre: "ANCIANOS", funcion: "Cuidar y supervisar espiritualmente" },
    { id: "diaconos", nombre: "DIÁCONOS", funcion: "Servir con responsabilidad en lo práctico" },
    { id: "ayudas", nombre: "AYUDAS", funcion: "Facilitar y apoyar el trabajo de otros" },
    { id: "gobiernos", nombre: "GOBIERNOS", funcion: "Organizar, administrar y coordinar" },
  ],
  casos: [
    {
      id: "a7_c1",
      descripcion: "La iglesia necesita coordinar la logística, horarios y presupuestos de diferentes equipos para que una gran actividad funcione con orden.",
      respuestaCorrecta: "gobiernos",
      explicacion: "El don y función de GOBIERNOS (administración) permite estructurar la logística y gobernanza eficaz.",
      referenciaBiblica: "1 Corintios 12:28",
    },
    {
      id: "a7_c2",
      descripcion: "Una familia de la congregación atraviesa un duelo doloroso y requiere acompañamiento doctrinal, oración de pastoreo y consejería.",
      respuestaCorrecta: "ancianos",
      explicacion: "Corresponde al rol pastoral de los ANCIANOS: velar por el rebaño, alimentar y dar cuidado espiritual.",
      referenciaBiblica: "Hechos 20:28 / 1 Pedro 5:2",
    },
    {
      id: "a7_c3",
      descripcion: "Se necesita organizar y repartir con transparencia la ayuda alimentaria e insumos a las viudas y familias necesitadas.",
      respuestaCorrecta: "diaconos",
      explicacion: "Es la función histórica original de los DIÁCONOS (Hechos 6): atender las necesidades prácticas de caridad liberando a los apóstoles para la oración.",
      referenciaBiblica: "Hechos 6:1-6 / 1 Timoteo 3:8",
    },
    {
      id: "a7_c4",
      descripcion: "Un equipo voluntario recibe en la entrada, ubica a los asistentes y asiste a los maestros de niños durante las clases.",
      respuestaCorrecta: "ayudas",
      explicacion: "Corresponde al don de AYUDAS: servir de soporte, facilitar la tarea de otros y servir con gozo invisible.",
      referenciaBiblica: "1 Corintios 12:28 / Romanos 12:7",
    },
  ],
};

// ACTIVIDAD 8: CASO INTEGRAL
export const ACTIVIDAD_8_DATA = {
  titulo: "Caso Integral: 'Una Iglesia en Crisis'",
  narrativa: "Una iglesia local está creciendo rápidamente. Hay muchos nuevos creyentes y alegría, pero comienzan a surgir severas tensiones: personas afirman recibir revelaciones constantemente pero contradicen el liderazgo; líderes buscan reconocimiento personal; los servidores prácticos están exhaustos; no hay claridad en responsabilidades; los recién conversos no reciben seguimiento pastoral; y las actividades lucen desorganizadas.",
  pasos: [
    {
      numero: 1,
      pregunta: "¿Qué decisión debe tomarse ante las constantes 'revelaciones' espontáneas?",
      opciones: [
        { id: "p1_o1", texto: "Aceptarlas automáticamente por ser manifestaciones espirituales." },
        { id: "p1_o2", texto: "Prohibir y rechazar tajantemente toda manifestación del Espíritu." },
        { id: "p1_o3", texto: "Discernirlas y juzgarlas bíblicamente antes de darles lugar.", esCorrecta: true },
        { id: "p1_o4", texto: "Dejar que cada creyente decida lo que mejor le parezca libremente." },
      ],
      respuestaCorrectaId: "p1_o3",
      explicacion: "La solución bíblica no es apagar el Espíritu ni aceptar el engaño, sino discernir todo a la luz de la Palabra.",
      referenciaBiblica: "1 Tesalonicenses 5:19-21",
    },
    {
      numero: 2,
      pregunta: "¿Qué aspecto integral debe fortalecerse equilibradamente en la congregación?",
      opciones: [
        { id: "p2_o1", texto: "Exclusivamente el desarrollo de los dones espirituales." },
        { id: "p2_o2", texto: "Solamente las estructuras administrativas de la organización." },
        { id: "p2_o3", texto: "El trinomio: Dones espirituales + Carácter cristiano + Orden bíblico.", esCorrecta: true },
        { id: "p2_o4", texto: "Solamente la autoridad rígida del pastor principal." },
      ],
      respuestaCorrectaId: "p2_o3",
      explicacion: "El verdadero avivamiento combina los dones con el fruto del Espíritu (carácter) y la disciplina bíblica (orden).",
      referenciaBiblica: "1 Corintios 14:40 / Gálatas 5:22-23",
    },
    {
      numero: 3,
      pregunta: "¿Quiénes deben asumir primordialmente la responsabilidad del cuidado espiritual y la enseñanza?",
      opciones: [
        { id: "p3_o1", texto: "Los Ancianos / Pastores preparados", esCorrecta: true },
        { id: "p3_o2", texto: "Los Diáconos encargados del aseo" },
        { id: "p3_o3", texto: "Cualquier visitante voluntario" },
        { id: "p3_o4", texto: "Un comité secular externo" },
      ],
      respuestaCorrectaId: "p3_o1",
      explicacion: "Los Ancianos están llamados a apacentar la grey, velar por la sana doctrina y aconsejar.",
      referenciaBiblica: "Tito 1:9 / 1 Pedro 5:2",
    },
    {
      numero: 4,
      pregunta: "¿Quiénes deben ser comisionados para atender las necesidades prácticas e itinerantes de caridad?",
      opciones: [
        { id: "p4_o1", texto: "Los Diáconos idóneos", esCorrecta: true },
        { id: "p4_o2", texto: "Los Ancianos dejando la oración" },
        { id: "p4_o3", texto: "Nadie, que cada quien resuelva sus necesidades" },
      ],
      respuestaCorrectaId: "p4_o1",
      explicacion: "Los Diáconos sirven como las manos de la iglesia en asuntos materiales y de compasión.",
      referenciaBiblica: "Hechos 6:3",
    },
    {
      numero: 5,
      pregunta: "¿Quiénes apoyan facilitando y respaldando el desarrollo de los ministerios?",
      opciones: [
        { id: "p5_o1", texto: "El don y ministerio de Ayudas", esCorrecta: true },
        { id: "p5_o2", texto: "Cualquier persona impenitente" },
        { id: "p5_o3", texto: "Empresas comerciales contratadas" },
      ],
      respuestaCorrectaId: "p5_o1",
      explicacion: "El equipo de Ayudas facilita que el liderazgo se concentre en sus labores primarias.",
      referenciaBiblica: "1 Corintios 12:28",
    },
    {
      numero: 6,
      pregunta: "¿Quiénes deben articular la organización, planificación y coordinación de actividades?",
      opciones: [
        { id: "p6_o1", texto: "El don de Gobiernos / Administradores", esCorrecta: true },
        { id: "p6_o2", texto: "El desorden espontáneo" },
        { id: "p6_o3", texto: "Solamente personas ajenas a la FE" },
      ],
      respuestaCorrectaId: "p6_o1",
      explicacion: "El don de Gobierno otorga capacidad organizativa para que el cuerpo fluya en armonía.",
      referenciaBiblica: "1 Corintios 12:28 / Romanos 12:8",
    },
  ],
};

// ACTIVIDAD 9: DISEÑA UNA IGLESIA SALUDABLE
export const ACTIVIDAD_9_DATA = {
  titulo: "Diseña una Iglesia Saludable",
  instrucciones: "En una iglesia bíblica, CRISTO es la cabeza suprema en el centro. Coloca e integra visualmente los elementos alrededor para estructurar la iglesia según el modelo del Espíritu.",
  elementoCentral: "CRISTO",
  elementosParaUbicar: [
    { id: "espiritu", nombre: "Espíritu Santo", area: "Trinidad & Origen" },
    { id: "dones", nombre: "Dones Espirituales", area: "Capacitación" },
    { id: "ministerios", nombre: "Ministerios", area: "Servicio" },
    { id: "operaciones", nombre: "Operaciones", area: "Fruto & Poder" },
    { id: "ancianos", nombre: "Ancianos / Pastores", area: "Liderazgo" },
    { id: "diaconos", nombre: "Diáconos", area: "Servicio Práctico" },
    { id: "ayudas", nombre: "Ayudas", area: "Soporte" },
    { id: "gobiernos", nombre: "Gobiernos", area: "Administración" },
    { id: "discernimiento", nombre: "Discernimiento", area: "Protección" },
    { id: "cuerpo", nombre: "Cuerpo de Cristo", area: "Propósito Final" },
  ],
  explicacionFinal: "El Espíritu Santo equipa a la Iglesia con dones, los cuales se manifiestan en ministerios de servicio; Dios produce las operaciones sobrenaturales, los ancianos y diáconos ordenan el cuerpo bajo el filtro del discernimiento, y TODO conduce a la edificación del Cuerpo de Cristo bajo el señorío único de CRISTO.",
};

// ACTIVIDAD 10: MI APLICACIÓN PERSONAL
export const ACTIVIDAD_10_DATA = {
  titulo: "Mi Aplicación Personal",
  subtitulo: "Reflexión individual para tu vida y ministerio (sin calificación punitiva)",
  preguntas: [
    {
      id: "a10_p1",
      texto: "1. ¿Qué concepto de Neumatología estudiado en el curso cambió más radicalmente tu manera de pensar y actuar?",
      placeholder: "Escribe tu reflexión detallada aquí...",
    },
    {
      id: "a10_p2",
      texto: "2. ¿Qué aprendiste sobre el discernimiento espiritual y cómo lo aplicarás ante manifestaciones dudosas?",
      placeholder: "Explica cómo utilizarás los 5 filtros bíblicos...",
    },
    {
      id: "a10_p3",
      texto: "3. ¿En qué áreas consideras que debes mejorar en tu manera de servir a la iglesia local?",
      placeholder: "Reflexiona sobre tu carácter, disposición y entrega...",
    },
    {
      id: "a10_p4",
      texto: "4. ¿En qué área o ministerio te sientes llamado a ser más útil dentro del cuerpo de Cristo?",
      placeholder: "Identifica tus dones y el servicio en el que puedes contribuir...",
    },
    {
      id: "a10_p5",
      texto: "5. ¿Qué significa para ti la declaración: 'EL ESPÍRITU DA, DIOS OPERA Y NOSOTROS SERVIMOS'?",
      placeholder: "Escribe tu conclusión personal y teológica...",
    },
  ],
};
