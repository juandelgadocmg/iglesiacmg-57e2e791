export interface Modulo {
  nombre: string;
  objetivo?: string;
  temas: string[];
  taller?: string;
}

export interface Diplomado {
  numero: string;
  titulo: string;
  subtitulo?: string;
  facultad: string;
  duracion: string;
  modalidad: string;
  nivel: string;
  objetivoGeneral: string;
  dirigidoA?: string[];
  competencias?: string[];
  modulos: Modulo[];
  proyectoFinal: string[];
}

export const diplomados: Diplomado[] = [
  {
    numero: "I",
    titulo: "Visión y Cultura Organizacional",
    facultad: "Facultad de Desarrollo Ministerial",
    duracion: "40 Horas (10 módulos de 4 horas)",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Fortalecer la identidad, la visión y la cultura organizacional de la iglesia para alinear el liderazgo, los ministerios, los procesos y las personas con el propósito que Dios ha establecido, promoviendo una cultura saludable que impulse el crecimiento, la unidad y el cumplimiento de la misión.",
    competencias: [
      "Comprender los fundamentos de la visión organizacional",
      "Definir y fortalecer la identidad institucional",
      "Construir una cultura organizacional saludable",
      "Comunicar eficazmente la visión",
      "Desarrollar líderes que modelen la cultura",
      "Gestionar procesos de cambio",
      "Diseñar estructuras organizacionales alineadas con la visión",
      "Desarrollar equipos comprometidos",
      "Medir la cultura mediante indicadores",
      "Diseñar un Plan Estratégico de Cultura Organizacional",
    ],
    modulos: [
      {
        nombre: "Fundamentos de la Visión Organizacional",
        objetivo: "Comprender el papel de la visión como elemento orientador de toda organización y su influencia en la cultura, el liderazgo y la toma de decisiones.",
        temas: ["¿Qué es una visión?", "Diferencia entre visión, misión y propósito", "El origen de una visión", "La visión como ventaja estratégica", "Características de una visión inspiradora", "La visión como eje organizacional", "Cómo la visión orienta las decisiones", "Visión y crecimiento", "Visión compartida", "Alineación institucional", "¿La organización conoce su visión?", "Síntomas de una visión débil", "Evaluación del nivel de alineación", "Barreras comunes", "Casos de estudio"],
        taller: "Diagnóstico de la visión actual de la iglesia. Producto: Informe de diagnóstico.",
      },
      {
        nombre: "Identidad y ADN Institucional",
        objetivo: "Definir los elementos que conforman la identidad institucional y construir un ADN organizacional coherente.",
        temas: ["¿Qué es identidad organizacional?", "Historia institucional", "Legado", "Propósito", "Vocación ministerial", "Cultura", "Valores", "Principios", "Creencias", "Comportamientos", "Misión", "Visión", "Valores", "Propuesta de valor", "Diferenciación"],
        taller: "Construcción del ADN institucional. Producto: Documento de identidad institucional.",
      },
      {
        nombre: "Construcción de Cultura Organizacional",
        objetivo: "Diseñar una cultura organizacional que refleje la identidad y fortalezca el cumplimiento de la visión.",
        temas: ["Concepto de cultura organizacional", "Componentes", "Niveles de cultura", "Cultura visible e invisible", "Cultura organizacional saludable", "Construcción de valores", "Vivencia de valores", "Cultura del servicio", "Cultura de excelencia", "Cultura del Reino", "Compromiso", "Responsabilidad", "Trabajo colaborativo", "Innovación", "Aprendizaje continuo"],
        taller: "Mapa cultural de la iglesia. Producto: Diagnóstico cultural.",
      },
      {
        nombre: "Comunicación Estratégica de la Visión",
        objetivo: "Desarrollar estrategias para comunicar la visión de forma clara, consistente e inspiradora.",
        temas: ["Comunicación interna y externa", "Storytelling", "Narrativa institucional", "Mensaje central", "Reuniones", "Predicación", "Redes sociales", "Diseño gráfico", "Material institucional", "Comunicación de líderes", "Comunicación entre ministerios", "Retroalimentación", "Escucha activa", "Gestión de la información"],
        taller: "Diseño del Plan de Comunicación de la Visión. Producto: Manual de comunicación.",
      },
      {
        nombre: "Liderazgo y Cultura",
        objetivo: "Desarrollar líderes capaces de fortalecer y transmitir la cultura organizacional.",
        temas: ["El líder como modelo", "Influencia", "Credibilidad", "Coherencia", "Autoridad", "Inspirar", "Motivar", "Delegar", "Desarrollar personas", "Empoderar equipos", "Formación continua", "Mentoría", "Evaluación", "Sucesión", "Multiplicación"],
        taller: "Evaluación del liderazgo institucional. Producto: Plan de fortalecimiento del liderazgo.",
      },
      {
        nombre: "Gestión del Cambio",
        objetivo: "Preparar a la organización para gestionar cambios de manera efectiva y sostenible.",
        temas: ["Naturaleza del cambio", "Diagnóstico", "Resistencia", "Adaptación", "Innovación", "Comunicación", "Participación", "Gestión emocional", "Implementación", "Seguimiento", "Cultura del cambio", "Aprendizaje", "Evaluación", "Ajustes", "Sostenibilidad"],
        taller: "Diseño de un plan de cambio. Producto: Plan de gestión del cambio.",
      },
      {
        nombre: "Gobierno Organizacional",
        objetivo: "Diseñar una estructura organizacional alineada con la visión institucional.",
        temas: ["Gobierno organizacional", "Organigrama", "Niveles de autoridad", "Manual de funciones", "Responsabilidades", "Toma de decisiones", "Comités", "Políticas", "Rendición de cuentas", "Buen gobierno"],
        taller: "Diseño del organigrama institucional. Producto: Modelo de gobierno.",
      },
      {
        nombre: "Equipos de Alto Desempeño",
        objetivo: "Fortalecer equipos alineados con la cultura y la visión.",
        temas: ["Formación de equipos", "Diversidad de talentos", "Colaboración", "Resolución de conflictos", "Confianza", "Comunicación", "Motivación", "Evaluación", "Reconocimiento", "Multiplicación"],
        taller: "Diagnóstico de equipos. Producto: Plan de fortalecimiento de equipos.",
      },
      {
        nombre: "Indicadores de Cultura Organizacional",
        objetivo: "Medir el impacto de la cultura organizacional mediante indicadores.",
        temas: ["¿Qué es un KPI?", "Indicadores culturales", "Indicadores de liderazgo", "Indicadores de compromiso", "Clima organizacional", "Encuestas", "Dashboards", "Auditorías culturales", "Planes de mejora", "Seguimiento"],
        taller: "Diseño del tablero de indicadores. Producto: Sistema de indicadores.",
      },
      {
        nombre: "Proyecto de Implementación",
        objetivo: "Integrar los conocimientos adquiridos en un plan estratégico aplicable a la realidad de la iglesia.",
        temas: ["Diagnóstico organizacional", "Análisis de resultados", "Definición de objetivos", "Estrategias de implementación", "Cronograma", "Recursos", "Indicadores", "Gestión del cambio", "Presentación ejecutiva", "Sustentación del proyecto"],
      },
    ],
    proyectoFinal: ["Diagnóstico de la cultura organizacional", "Declaración de visión, misión y valores", "Definición del ADN institucional", "Estrategia de comunicación de la visión", "Plan de fortalecimiento del liderazgo", "Modelo de gobierno organizacional", "Plan de desarrollo de equipos", "Sistema de indicadores de cultura", "Plan de gestión del cambio", "Cronograma de implementación a 12 meses"],
  },

  {
    numero: "II",
    titulo: "Administración Eclesiástica",
    facultad: "Facultad de Gestión",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Desarrollar competencias administrativas, organizacionales y estratégicas que permitan fortalecer la gestión de la iglesia mediante procesos eficientes, estructuras organizacionales saludables, administración responsable de los recursos y una cultura de excelencia orientada al cumplimiento de la misión.",
    competencias: [
      "Diseñar estructuras organizacionales eficientes",
      "Implementar procesos administrativos",
      "Gestionar equipos ministeriales",
      "Administrar recursos con transparencia",
      "Elaborar manuales administrativos",
      "Diseñar indicadores de gestión",
      "Gestionar proyectos ministeriales",
      "Implementar herramientas tecnológicas",
      "Desarrollar una cultura administrativa saludable",
      "Liderar procesos de mejora continua",
    ],
    modulos: [
      { nombre: "Fundamentos de la Administración Eclesiástica", objetivo: "Comprender los principios de la administración aplicados al contexto ministerial.", temas: ["Concepto de administración", "Administración y mayordomía", "La administración como ministerio", "Principios de excelencia", "Planeación", "Organización", "Dirección", "Control", "Administración basada en procesos", "Casos prácticos"], taller: "Diagnóstico administrativo de la iglesia." },
      { nombre: "Gobierno y Estructura Organizacional", objetivo: "Diseñar estructuras organizacionales saludables.", temas: ["Gobierno organizacional", "Organigrama ministerial", "Autoridad y responsabilidad", "Niveles organizacionales", "Manual de funciones", "Delegación efectiva", "Equipos ministeriales", "Coordinación interministerial", "Cultura organizacional"], taller: "Diseñar el organigrama institucional." },
      { nombre: "Gestión por Procesos", objetivo: "Documentar y mejorar procesos organizacionales.", temas: ["Introducción a BPM", "Identificación de procesos", "Procesos estratégicos, misionales y de apoyo", "Diagramas de flujo", "Procedimientos", "Manuales", "Mejora continua"] },
      { nombre: "Gestión Documental", temas: ["Documentación institucional", "Políticas", "Reglamentos", "Manuales", "Procedimientos", "Actas", "Archivo", "Gestión documental digital", "Control y auditoría documental"] },
      { nombre: "Administración Financiera", temas: ["Principios financieros", "Presupuesto", "Planeación financiera", "Tesorería", "Ofrendas y donaciones", "Flujo de caja", "Compras", "Control interno", "Transparencia y rendición de cuentas"] },
      { nombre: "Gestión del Talento Humano", temas: ["Cultura de servicio", "Reclutamiento y selección", "Integración", "Capacitación", "Evaluación", "Motivación", "Reconocimiento", "Desarrollo ministerial", "Plan de sucesión"] },
      { nombre: "Gestión de Ministerios", temas: ["Organización ministerial", "Planificación anual", "Objetivos ministeriales", "Cronogramas", "Indicadores", "Reuniones efectivas", "Seguimiento", "Evaluación", "Reportes"] },
      { nombre: "Gestión de Eventos", temas: ["Planeación de eventos", "Organización", "Presupuesto", "Cronograma", "Logística", "Protocolo", "Gestión de voluntarios", "Comunicación", "Evaluación e informe final"] },
      { nombre: "Tecnología para la Administración", temas: ["Transformación digital", "Sistemas de información", "Bases de datos", "CRM para iglesias", "Automatización", "Reportes", "Dashboards", "Seguridad informática", "IA administrativa"] },
      { nombre: "Gestión Estratégica y Mejora Continua", temas: ["Planeación estratégica", "KPIs administrativos", "OKRs", "Balanced Scorecard", "Auditorías", "Gestión de riesgos", "Mejora continua", "Innovación", "Presentación del proyecto final"] },
    ],
    proyectoFinal: ["Diagnóstico organizacional", "Organigrama institucional", "Manual de funciones", "Mapa de procesos", "Manual de procedimientos", "Sistema de indicadores", "Plan financiero", "Plan anual de trabajo", "Sistema de reuniones", "Propuesta de transformación digital"],
  },
  {
    numero: "III",
    titulo: "Liderazgo Ministerial",
    facultad: "Facultad de Liderazgo",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Desarrollar líderes íntegros, estratégicos y multiplicadores, capaces de inspirar, formar equipos, administrar ministerios y desarrollar nuevos líderes que contribuyan al cumplimiento de la visión de la iglesia.",
    dirigidoA: ["Pastores", "Copastores", "Líderes de ministerio", "Líderes de Casas de Paz", "Coordinadores", "Supervisores", "Aspirantes al liderazgo"],
    competencias: [
      "Comprender el liderazgo bíblico y contemporáneo",
      "Desarrollar un carácter íntegro",
      "Liderar equipos de alto desempeño",
      "Comunicar con influencia",
      "Resolver conflictos de manera saludable",
      "Formar y acompañar nuevos líderes",
      "Dirigir reuniones efectivas",
      "Tomar decisiones estratégicas",
      "Gestionar el cambio",
      "Construir un plan de desarrollo para líderes",
    ],
    modulos: [
      { nombre: "Fundamentos del Liderazgo Ministerial", objetivo: "Comprender los principios fundamentales del liderazgo cristiano y su impacto en el desarrollo de la iglesia.", temas: ["¿Qué es el liderazgo?", "Liderazgo y servicio", "Liderazgo bíblico", "El llamado al liderazgo", "Liderazgo e influencia", "Autoridad y responsabilidad", "Modelos de liderazgo", "Liderazgo transformacional", "El líder como ejemplo", "Tendencias del siglo XXI"], taller: "Diagnóstico del estilo personal de liderazgo." },
      { nombre: "Carácter e Integridad del Líder", objetivo: "Fortalecer el carácter como fundamento del liderazgo ministerial.", temas: ["El carácter del líder", "Integridad", "Ética ministerial", "Humildad y servicio", "Credibilidad", "Disciplina personal", "Administración del tiempo", "Vida espiritual del líder", "Manejo del éxito y del fracaso"], taller: "Plan personal de crecimiento." },
      { nombre: "Inteligencia Emocional", objetivo: "Desarrollar habilidades emocionales para liderar personas de manera efectiva.", temas: ["Inteligencia emocional", "Autoconocimiento", "Autocontrol", "Motivación", "Empatía", "Relaciones interpersonales", "Manejo del estrés", "Liderazgo emocional", "Salud emocional"], taller: "Evaluación del perfil emocional." },
      { nombre: "Comunicación de Alto Impacto", objetivo: "Desarrollar habilidades de comunicación para influir, enseñar y liderar.", temas: ["Comunicación efectiva", "Comunicación verbal y no verbal", "Escucha activa", "Retroalimentación", "Comunicación en equipos", "Hablar en público", "Presentaciones efectivas", "Storytelling", "Comunicación digital"], taller: "Presentación de una enseñanza de 10 minutos." },
      { nombre: "Liderazgo de Equipos", objetivo: "Aprender a formar, desarrollar y fortalecer equipos ministeriales.", temas: ["Equipos de alto desempeño", "Roles en el equipo", "Diversidad de dones", "Delegación", "Empoderamiento", "Motivación", "Cultura de colaboración", "Seguimiento y evaluación del desempeño"], taller: "Diseño del plan de fortalecimiento de un ministerio." },
      { nombre: "Mentoría y Desarrollo de Líderes", objetivo: "Desarrollar competencias para formar nuevos líderes.", temas: ["Mentoría", "Coaching", "Discipulado de líderes", "Formación por competencias", "Acompañamiento", "Retroalimentación", "Multiplicación", "Sucesión", "Escuela de líderes"], taller: "Diseño del plan de mentoría." },
      { nombre: "Gestión de Conflictos", objetivo: "Resolver conflictos fortaleciendo la unidad y el crecimiento del equipo.", temas: ["Naturaleza del conflicto", "Diagnóstico", "Comunicación en el conflicto", "Negociación", "Mediación", "Restauración", "Manejo de crisis", "Conversaciones difíciles", "Cultura de paz"], taller: "Resolución de casos prácticos." },
      { nombre: "Liderazgo Estratégico", objetivo: "Desarrollar visión estratégica para conducir ministerios y proyectos.", temas: ["Pensamiento estratégico", "Planeación ministerial", "Objetivos", "Indicadores", "Gestión por resultados", "Innovación", "Gestión del cambio", "Toma de decisiones", "Priorización"], taller: "Construcción del plan estratégico de un ministerio." },
      { nombre: "Liderazgo Multiplicador", objetivo: "Crear una cultura de multiplicación y desarrollo continuo de nuevos líderes.", temas: ["Multiplicación", "Delegación estratégica", "Desarrollo de sucesores", "Equipos autosostenibles", "Cultura de crecimiento", "Liderazgo generacional", "Formación continua", "Comunidad de aprendizaje"], taller: "Diseño del mapa de multiplicación de líderes." },
      { nombre: "Proyecto Integrador", objetivo: "Integrar los conocimientos adquiridos mediante el diseño de un plan de liderazgo para la iglesia.", temas: ["Diagnóstico del liderazgo actual", "Definición del perfil de líder", "Ruta de formación", "Sistema de mentoría", "Evaluación de líderes", "Indicadores de desarrollo", "Plan de sucesión", "Cronograma de implementación", "Presentación del proyecto"] },
    ],
    proyectoFinal: ["Diagnóstico del liderazgo de la iglesia", "Perfil de competencias para líderes", "Ruta de formación y mentoría", "Sistema de evaluación", "Plan de sucesión", "Estrategia de multiplicación de líderes", "Indicadores de crecimiento", "Cronograma anual de implementación"],
  },
  {
    numero: "IV",
    titulo: "Discipulado Estratégico",
    subtitulo: "Diseñando iglesias que hacen discípulos, forman líderes y transforman comunidades",
    facultad: "Facultad de Desarrollo Ministerial",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Capacitar a líderes e iglesias para diseñar, implementar y evaluar un sistema integral de discipulado que permita evangelizar, integrar, formar, desarrollar y enviar discípulos comprometidos con la misión de la iglesia.",
    dirigidoA: ["Pastores", "Líderes de discipulado", "Coordinadores de consolidación", "Líderes de grupos pequeños", "Supervisores", "Mentores", "Maestros bíblicos"],
    competencias: [
      "Diseñar un sistema integral de discipulado",
      "Fortalecer la consolidación de nuevos creyentes",
      "Implementar rutas de crecimiento espiritual",
      "Formar mentores y discipuladores",
      "Desarrollar procesos de seguimiento",
      "Crear indicadores de discipulado",
      "Multiplicar líderes y grupos pequeños",
      "Evaluar el impacto del discipulado",
    ],
    modulos: [
      { nombre: "Fundamentos del Discipulado", objetivo: "Comprender el discipulado como el centro de la misión de la iglesia.", temas: ["La Gran Comisión", "¿Qué es un discípulo?", "El discipulado en el ministerio de Jesús", "El discipulado en la iglesia primitiva", "Propósito del discipulado", "Características de un discípulo", "Cultura de discipulado", "Modelos de discipulado", "Retos actuales del discipulado"], taller: "Diagnóstico del sistema de discipulado de la iglesia." },
      { nombre: "Evangelismo y Primer Contacto", objetivo: "Diseñar estrategias para alcanzar personas y facilitar su integración.", temas: ["Cultura evangelística", "Evangelismo relacional, comunitario y digital", "Eventos evangelísticos", "Grupos pequeños como herramienta evangelística", "Primer contacto con nuevos asistentes", "Hospitalidad", "Registro y seguimiento inicial", "Integración a la comunidad"], taller: "Diseño del proceso de primer contacto." },
      { nombre: "Consolidación de Nuevos Creyentes", objetivo: "Implementar un proceso efectivo para acompañar a quienes inician su vida cristiana.", temas: ["¿Qué es la consolidación?", "Principios de acompañamiento", "Plan de seguimiento", "Mentor asignado", "Bienvenida e integración", "Cuidado pastoral", "Formación inicial", "Prevención de la deserción", "Indicadores de consolidación"], taller: "Diseño de la ruta de consolidación." },
      { nombre: "Formación Espiritual", objetivo: "Desarrollar procesos sistemáticos de crecimiento espiritual.", temas: ["Madurez espiritual", "Disciplinas espirituales", "Vida devocional", "Oración", "Estudio bíblico", "Comunidad cristiana", "Servicio", "Evangelismo como estilo de vida", "Formación continua"], taller: "Diseño del plan de formación espiritual." },
      { nombre: "Mentoría y Acompañamiento", objetivo: "Capacitar líderes para acompañar y desarrollar discípulos.", temas: ["Mentoría cristiana", "Perfil del mentor", "Relación mentor-discípulo", "Escucha activa", "Acompañamiento espiritual", "Retroalimentación", "Seguimiento personalizado", "Desarrollo de hábitos", "Multiplicación de mentores"], taller: "Diseño del programa de mentoría." },
      { nombre: "Desarrollo de Líderes", objetivo: "Preparar discípulos para asumir responsabilidades de liderazgo.", temas: ["Identificación de futuros líderes", "Formación por competencias", "Delegación", "Desarrollo ministerial", "Escuelas de liderazgo", "Prácticas ministeriales", "Evaluación del liderazgo", "Plan de crecimiento", "Multiplicación y sucesión"], taller: "Ruta de desarrollo de líderes." },
      { nombre: "Grupos Pequeños y Comunidad", objetivo: "Fortalecer la vida comunitaria mediante grupos pequeños.", temas: ["Fundamentos de grupos pequeños", "Organización", "Liderazgo de grupos", "Dinámica de reuniones", "Pastoreo en grupos", "Multiplicación de grupos", "Seguimiento", "Integración de nuevos miembros", "Indicadores"], taller: "Diseño del sistema de grupos pequeños." },
      { nombre: "Gestión del Discipulado", objetivo: "Administrar y evaluar el sistema de discipulado.", temas: ["Procesos de discipulado", "Manuales", "Bases de datos", "Seguimiento", "Automatización", "Indicadores", "Reportes", "Auditoría del discipulado", "Mejora continua"], taller: "Mapa de procesos del discipulado." },
      { nombre: "Discipulado y Transformación Comunitaria", objetivo: "Comprender el impacto del discipulado más allá de la iglesia local.", temas: ["Discipulado y familia", "Discipulado y comunidad", "Servicio social", "Evangelización integral", "Impacto comunitario", "Formación de ciudadanos", "Cultura del Reino", "Influencia en la sociedad", "Testimonio cristiano"], taller: "Proyecto de impacto comunitario." },
      { nombre: "Diseño del Sistema Integral de Discipulado", objetivo: "Integrar todos los conocimientos del diplomado en un sistema completo de discipulado para la iglesia.", temas: ["Diagnóstico institucional", "Definición de la ruta de discipulado", "Procesos de integración", "Formación de mentores", "Desarrollo de líderes", "Sistema de seguimiento", "Indicadores de crecimiento", "Tecnología aplicada al discipulado", "Plan de implementación"] },
    ],
    proyectoFinal: ["Diagnóstico del discipulado actual", "Ruta de crecimiento espiritual", "Plan de consolidación", "Programa de mentoría", "Escuela de desarrollo de líderes", "Modelo de grupos pequeños", "Sistema de seguimiento", "Indicadores de crecimiento", "Plan anual de implementación", "Estrategia de mejora continua"],
  },
  {
    numero: "V",
    titulo: "Planeación Estratégica e Indicadores para Iglesias",
    subtitulo: "Transformando la visión en resultados medibles",
    facultad: "Facultad de Gestión",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Desarrollar competencias para planificar estratégicamente el crecimiento de la iglesia, establecer objetivos claros, implementar indicadores de gestión y tomar decisiones basadas en información para fortalecer el cumplimiento de la visión.",
    dirigidoA: ["Pastores", "Copastores", "Administradores", "Coordinadores ministeriales", "Supervisores", "Líderes de proyectos", "Equipos administrativos"],
    competencias: [
      "Elaborar un plan estratégico ministerial",
      "Definir objetivos y metas institucionales",
      "Diseñar indicadores de gestión",
      "Construir tableros de control",
      "Gestionar proyectos ministeriales",
      "Medir resultados",
      "Implementar procesos de seguimiento",
      "Desarrollar una cultura de mejora continua",
    ],
    modulos: [
      { nombre: "Fundamentos de la Planeación Estratégica", objetivo: "Comprender la importancia de la planeación estratégica como herramienta para desarrollar la visión.", temas: ["¿Qué es la planeación estratégica?", "Planeación en organizaciones", "Planeación aplicada a iglesias", "Pensamiento estratégico", "Planeación vs improvisación", "Ciclo de la planeación", "Niveles de planificación", "Cultura de planeación", "Beneficios de planificar"], taller: "Diagnóstico del nivel de planeación de la iglesia." },
      { nombre: "Diagnóstico Organizacional", objetivo: "Analizar la situación actual de la iglesia para identificar oportunidades de mejora.", temas: ["Diagnóstico institucional", "Análisis interno y externo", "Análisis FODA", "Identificación de oportunidades", "Riesgos organizacionales", "Factores críticos de éxito", "Priorización de problemas", "Elaboración del diagnóstico"], taller: "Construcción del FODA institucional." },
      { nombre: "Formulación Estratégica", objetivo: "Diseñar los elementos estratégicos que orientarán el desarrollo de la iglesia.", temas: ["Visión, misión y valores", "Objetivos estratégicos", "Líneas estratégicas", "Metas", "Iniciativas estratégicas", "Mapa estratégico", "Alineación ministerial", "Validación del plan"], taller: "Diseño del mapa estratégico." },
      { nombre: "Gestión por Objetivos", objetivo: "Aprender a convertir la visión en objetivos concretos.", temas: ["Objetivos SMART", "OKRs", "Metas institucionales y ministeriales", "Priorización", "Planes de acción", "Cronogramas", "Responsables", "Recursos", "Seguimiento"], taller: "Construcción de objetivos estratégicos." },
      { nombre: "Indicadores de Gestión", objetivo: "Diseñar indicadores para evaluar el cumplimiento de la visión.", temas: ["¿Qué es un KPI?", "Tipos de indicadores", "Indicadores estratégicos, ministeriales y financieros", "Indicadores de discipulado", "Indicadores de crecimiento", "Indicadores de calidad", "Fichas técnicas de indicadores"], taller: "Diseño del sistema de KPIs." },
      { nombre: "Tableros de Control (Dashboards)", objetivo: "Visualizar la información para facilitar la toma de decisiones.", temas: ["Dashboards", "Balanced Scorecard", "Paneles ministeriales", "Visualización de datos", "Reportes ejecutivos", "Seguimiento mensual", "Reuniones de indicadores", "Herramientas digitales", "Automatización"], taller: "Diseño del tablero estratégico." },
      { nombre: "Gestión de Proyectos Ministeriales", objetivo: "Planificar y administrar proyectos alineados con la visión.", temas: ["Gestión de proyectos", "Ciclo de vida del proyecto", "Definición del alcance", "Cronogramas", "Presupuesto", "Gestión de riesgos", "Seguimiento", "Evaluación y cierre", "Lecciones aprendidas"], taller: "Diseño de un proyecto ministerial." },
      { nombre: "Toma de Decisiones Basada en Datos", objetivo: "Desarrollar una cultura organizacional orientada al análisis de información.", temas: ["Datos vs opiniones", "Análisis de información", "Interpretación de indicadores", "Reuniones estratégicas", "Gestión del conocimiento", "Resolución de problemas", "Priorización", "Herramientas de análisis"], taller: "Análisis de un tablero de indicadores." },
      { nombre: "Mejora Continua", objetivo: "Implementar procesos permanentes de evaluación y optimización.", temas: ["Cultura de mejora", "Ciclo PHVA", "Auditoría interna", "Evaluación ministerial", "Retroalimentación", "Innovación", "Gestión del cambio", "Planes de mejora", "Sostenibilidad"], taller: "Diseño del plan de mejora institucional." },
      { nombre: "Diseño del Plan Estratégico Institucional", objetivo: "Integrar todo lo aprendido en un plan estratégico listo para implementar.", temas: ["Consolidación del diagnóstico", "Formulación de objetivos", "Definición de indicadores", "Diseño del mapa estratégico", "Plan operativo anual", "Cronograma institucional", "Asignación de responsables", "Seguimiento y evaluación", "Presentación ejecutiva"] },
    ],
    proyectoFinal: ["Diagnóstico organizacional", "Análisis FODA", "Mapa estratégico", "Objetivos institucionales", "Plan operativo anual", "Sistema de KPIs", "Dashboard ministerial", "Cronograma de ejecución", "Plan de seguimiento", "Plan de mejora continua"],
  },
  {
    numero: "VI",
    titulo: "Tecnología e Inteligencia Artificial para Iglesias",
    subtitulo: "Innovando para cumplir mejor la misión",
    facultad: "Facultad de Innovación",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivoGeneral:
      "Capacitar a líderes, pastores y administradores para diseñar e implementar estrategias de transformación digital mediante el uso de tecnología e inteligencia artificial, fortaleciendo la administración, el discipulado, la comunicación y la toma de decisiones de la iglesia.",
    dirigidoA: ["Pastores", "Administradores", "Líderes ministeriales", "Equipos de comunicaciones", "Equipos administrativos", "Líderes de tecnología", "Coordinadores de proyectos"],
    competencias: [
      "Liderar procesos de transformación digital",
      "Seleccionar herramientas tecnológicas adecuadas",
      "Automatizar procesos administrativos",
      "Aplicar inteligencia artificial al ministerio",
      "Gestionar datos institucionales",
      "Diseñar estrategias de comunicación digital",
      "Implementar proyectos tecnológicos",
      "Desarrollar una cultura de innovación",
    ],
    modulos: [
      { nombre: "Transformación Digital en la Iglesia", objetivo: "Comprender el impacto de la transformación digital en el desarrollo ministerial.", temas: ["¿Qué es la transformación digital?", "Cultura digital", "Madurez tecnológica", "Innovación organizacional", "Ecosistema digital", "Retos tecnológicos de la iglesia", "Beneficios de la digitalización", "Casos de éxito", "Tendencias globales"], taller: "Evaluación del nivel de madurez digital de la iglesia." },
      { nombre: "Ecosistema Tecnológico para Iglesias", objetivo: "Diseñar la arquitectura tecnológica de una iglesia moderna.", temas: ["Sistemas de gestión ministerial", "Bases de datos", "CRM para iglesias", "Software administrativo", "Gestión documental", "Plataformas colaborativas", "Integraciones", "Almacenamiento en la nube", "Seguridad tecnológica"], taller: "Mapa del ecosistema tecnológico institucional." },
      { nombre: "Gestión de Datos", objetivo: "Aprender a administrar la información de manera estratégica.", temas: ["Datos e información", "Calidad de datos", "Modelado de información", "Bases de datos ministeriales", "Protección de datos", "Privacidad", "Gobierno de datos", "Analítica básica", "Reportes"], taller: "Diseño del modelo de datos de la iglesia." },
      { nombre: "Automatización de Procesos", objetivo: "Automatizar tareas repetitivas para mejorar la eficiencia.", temas: ["Automatización", "Formularios digitales", "Flujos de trabajo", "Integraciones", "Notificaciones automáticas", "Gestión documental", "Agenda digital", "Automatización de comunicaciones", "Optimización de procesos"], taller: "Diseño de un flujo automatizado." },
      { nombre: "Inteligencia Artificial Generativa", objetivo: "Comprender los fundamentos y aplicaciones de la IA.", temas: ["¿Qué es la IA?", "IA generativa", "Modelos de lenguaje", "Ingeniería de prompts", "Herramientas de IA", "Productividad", "Casos de uso", "Limitaciones", "Tendencias y futuro de la IA"], taller: "Creación de prompts especializados para el ministerio." },
      { nombre: "IA Aplicada al Ministerio", objetivo: "Aplicar inteligencia artificial en diferentes áreas de la iglesia.", temas: ["IA para investigación bíblica", "IA para planificación", "IA para discipulado", "IA para formación", "IA para administración", "IA para comunicaciones", "IA para eventos", "IA para análisis de información", "IA para atención al miembro"], taller: "Diseño de asistentes de IA para ministerios." },
      { nombre: "Comunicación Digital", objetivo: "Diseñar estrategias digitales para fortalecer el alcance de la iglesia.", temas: ["Estrategia digital", "Redes sociales", "Marketing de contenidos", "Diseño gráfico", "Producción audiovisual", "Streaming", "Email marketing", "WhatsApp y mensajería", "Analítica digital"], taller: "Plan anual de comunicación digital." },
      { nombre: "Ciberseguridad y Ética Digital", objetivo: "Proteger la información institucional y promover un uso responsable de la tecnología.", temas: ["Ciberseguridad", "Protección de información", "Gestión de accesos", "Copias de seguridad", "Riesgos digitales", "Ética tecnológica", "Ética en IA", "Privacidad", "Normativas y buenas prácticas"], taller: "Diagnóstico de seguridad tecnológica." },
      { nombre: "Gestión de la Innovación", objetivo: "Desarrollar una cultura organizacional orientada a la innovación continua.", temas: ["Innovación organizacional", "Design Thinking", "Transformación cultural", "Gestión del cambio", "Innovación abierta", "Laboratorios de innovación", "Evaluación de proyectos", "Escalabilidad", "Roadmap tecnológico"], taller: "Diseño del plan de innovación institucional." },
      { nombre: "Diseño del Plan de Transformación Digital", objetivo: "Integrar todo lo aprendido en un plan de transformación digital para la iglesia.", temas: ["Diagnóstico tecnológico", "Definición de objetivos", "Priorización de proyectos", "Selección de herramientas", "Plan de implementación", "Presupuesto tecnológico", "Indicadores digitales", "Gestión del cambio", "Presentación ejecutiva"] },
    ],
    proyectoFinal: ["Diagnóstico de madurez digital", "Arquitectura tecnológica", "Estrategia de automatización", "Plan de implementación de IA", "Sistema de gestión de datos", "Estrategia de comunicación digital", "Plan de ciberseguridad", "Roadmap tecnológico a tres años", "Indicadores de transformación digital", "Cronograma de implementación"],
  },
];

export const facultades = [
  { nombre: "Facultad de Liderazgo", diplomados: ["Liderazgo Ministerial"] },
  { nombre: "Facultad de Gestión", diplomados: ["Administración Eclesiástica", "Planeación Estratégica e Indicadores para Iglesias"] },
  { nombre: "Facultad de Desarrollo Ministerial", diplomados: ["Visión y Cultura Organizacional", "Discipulado Estratégico"] },
  { nombre: "Facultad de Innovación", diplomados: ["Tecnología e Inteligencia Artificial para Iglesias"] },
];
