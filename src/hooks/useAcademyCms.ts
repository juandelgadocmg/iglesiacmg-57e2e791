import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuloCMS {
  id: string;
  nombre: string;
  objetivo?: string;
  temas: string[];
  taller?: string;
}

export interface DiplomadoCMS {
  id: string;
  facultad_id?: string;
  numero: string;
  titulo: string;
  subtitulo?: string;
  duracion: string;
  modalidad: string;
  nivel: string;
  objetivo_general: string;
  dirigido_a: string[];
  competencias: string[];
  proyecto_final: string[];
  facultad: string;
  modulos: ModuloCMS[];
}

export interface FacultadCMS {
  id: string;
  nombre: string;
  diplomados: string[];
}

const FALLBACK_DIPLOMADOS: DiplomadoCMS[] = [
  {
    id: "1f087b6a-3dd1-415b-ba30-b86c2382d65d",
    facultad_id: "83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a",
    numero: "I",
    titulo: "Visión y Cultura Organizacional",
    duracion: "40 Horas (10 módulos de 4 horas)",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Fortalecer la identidad, la visión y la cultura organizacional de la iglesia para alinear el liderazgo, los ministerios, los procesos y las personas con el propósito que Dios ha establecido, promoviendo una cultura saludable que impulse el crecimiento, la unidad y el cumplimiento de la misión.",
    dirigido_a: [
      "Pastores",
      "Copastores",
      "Líderes ministeriales",
      "Coordinadores",
      "Equipos de liderazgo",
    ],
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
    proyecto_final: [
      "Diagnóstico de la cultura organizacional",
      "Declaración de visión, misión y valores",
      "Definición del ADN institucional",
      "Estrategia de comunicación de la visión",
      "Plan de fortalecimiento del liderazgo",
      "Modelo de gobierno organizacional",
      "Plan de desarrollo de equipos",
      "Sistema de indicadores de cultura",
      "Plan de gestión del cambio",
      "Cronograma de implementación a 12 meses",
    ],
    facultad: "Facultad de Desarrollo Ministerial",
    modulos: [
      {
        id: "04f06d62-2b19-4f3c-b9d8-973e6cc04b4a",
        nombre: "Fundamentos de la Visión Organizacional",
        objetivo:
          "Comprender el papel de la visión como elemento orientador de toda organización y su influencia en la cultura, el liderazgo y la toma de decisiones.",
        temas: [
          "¿Qué es una visión?",
          "Diferencia entre visión, misión y propósito",
          "El origen de una visión",
          "La visión como ventaja estratégica",
          "Características de una visión inspiradora",
          "La visión como eje organizacional",
          "Visión compartida y alineación institucional",
        ],
        taller: "Diagnóstico de la visión actual de la iglesia. Producto: Informe de diagnóstico.",
      },
      {
        id: "c4028f35-95f6-4cda-8919-a26911f2d94e",
        nombre: "Identidad y ADN Institucional",
        objetivo:
          "Definir los elementos que conforman la identidad institucional y construir un ADN organizacional coherente.",
        temas: [
          "¿Qué es identidad organizacional?",
          "Historia institucional y legado",
          "Vocación ministerial",
          "Valores, principios y creencias",
          "Misión, visión y propuesta de valor",
        ],
        taller: "Construcción del ADN institucional. Producto: Documento de identidad institucional.",
      },
      {
        id: "a87c34a8-169a-40b8-8e1a-2422f953baf3",
        nombre: "Construcción de Cultura Organizacional",
        objetivo:
          "Diseñar una cultura organizacional que refleje la identidad y fortalezca el cumplimiento de la visión.",
        temas: [
          "Concepto y niveles de cultura organizacional",
          "Cultura del servicio y de excelencia",
          "Cultura del Reino",
          "Compromiso y trabajo colaborativo",
        ],
        taller: "Mapa cultural de la iglesia. Producto: Diagnóstico cultural.",
      },
      {
        id: "70143bfa-10c0-4ebc-97e6-150d9dda1d8f",
        nombre: "Comunicación Estratégica de la Visión",
        objetivo:
          "Desarrollar estrategias para comunicar la visión de forma clara, consistente e inspiradora.",
        temas: [
          "Comunicación interna y externa",
          "Storytelling y narrativa institucional",
          "Comunicación entre ministerios",
          "Retroalimentación y escucha activa",
        ],
        taller: "Diseño del Plan de Comunicación de la Visión.",
      },
      {
        id: "7e70bad5-e20a-4e72-9855-2ac7b4625913",
        nombre: "Liderazgo y Cultura",
        objetivo:
          "Desarrollar líderes capaces de fortalecer y transmitir la cultura organizacional.",
        temas: [
          "El líder como modelo",
          "Influencia, credibilidad y coherencia",
          "Empoderar equipos y desarrollar personas",
          "Mentoría, sucesión y multiplicación",
        ],
        taller: "Evaluación del liderazgo institucional.",
      },
      {
        id: "ad84e4b2-6630-4395-b529-a6d12e920e6c",
        nombre: "Gestión del Cambio",
        objetivo:
          "Preparar a la organización para gestionar cambios de manera efectiva y sostenible.",
        temas: [
          "Naturaleza del cambio y diagnóstico",
          "Manejo de la resistencia y adaptación",
          "Implementación, seguimiento y sostenibilidad",
        ],
        taller: "Diseño de un plan de gestión del cambio.",
      },
      {
        id: "d6cc7bdc-fa9c-41ba-a7de-ddaa8ec57272",
        nombre: "Gobierno Organizacional",
        objetivo:
          "Diseñar una estructura organizacional alineada con la visión institucional.",
        temas: [
          "Gobierno organizacional y organigrama",
          "Niveles de autoridad y manual de funciones",
          "Toma de decisiones y rendición de cuentas",
        ],
        taller: "Diseño del organigrama institucional.",
      },
      {
        id: "d75a4bd0-b772-4aa9-8f2f-a65f0bb33cf0",
        nombre: "Equipos de Alto Desempeño",
        objetivo: "Fortalecer equipos alineados con la cultura y la visión.",
        temas: [
          "Formación de equipos y diversidad de talentos",
          "Colaboración y resolución de conflictos",
          "Motivación, evaluación y reconocimiento",
        ],
        taller: "Plan de fortalecimiento de equipos.",
      },
      {
        id: "cd75881b-68c5-4db6-80c1-0d174c6c2136",
        nombre: "Indicadores de Cultura Organizacional",
        objetivo: "Medir el impacto de la cultura organizacional mediante indicadores.",
        temas: [
          "Indicadores culturales y de liderazgo",
          "Clima organizacional y encuestas",
          "Dashboards y planes de mejora",
        ],
        taller: "Diseño del tablero de indicadores.",
      },
      {
        id: "c8c07f6c-9504-43ad-9e34-f2b687b46dcd",
        nombre: "Proyecto de Implementación",
        objetivo:
          "Integrar los conocimientos adquiridos en un plan estratégico aplicable a la realidad de la iglesia.",
        temas: [
          "Diagnóstico organizacional",
          "Definición de objetivos y estrategias",
          "Cronograma, recursos y sustentación del proyecto",
        ],
      },
    ],
  },
  {
    id: "3fd10370-c42c-483c-a314-e1ca6d3df953",
    facultad_id: "a1b349a1-fd9e-446e-bc2d-cb735269fae2",
    numero: "II",
    titulo: "Administración Eclesiástica",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Desarrollar competencias administrativas, organizacionales y estratégicas que permitan fortalecer la gestión de la iglesia mediante procesos eficientes, estructuras organizacionales saludables, administración responsable de los recursos y una cultura de excelencia orientada al cumplimiento de la misión.",
    dirigido_a: [
      "Pastores",
      "Administradores",
      "Tesoreros",
      "Secretarios",
      "Líderes de ministerio",
    ],
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
    proyecto_final: [
      "Diagnóstico organizacional",
      "Organigrama institucional",
      "Manual de funciones",
      "Mapa de procesos",
      "Manual de procedimientos",
      "Sistema de indicadores",
      "Plan financiero",
      "Plan anual de trabajo",
    ],
    facultad: "Facultad de Gestión",
    modulos: [
      {
        id: "4b168077-42d9-4728-b678-09dcac96f15b",
        nombre: "Fundamentos de la Administración Eclesiástica",
        objetivo: "Comprender los principios de la administración aplicados al contexto ministerial.",
        temas: [
          "Administración y mayordomía",
          "Planeación, organización, dirección y control",
          "Administración basada en procesos",
        ],
        taller: "Diagnóstico administrativo de la iglesia.",
      },
      {
        id: "50a3d887-d693-44e6-a7b4-ed55276589dc",
        nombre: "Gobierno y Estructura Organizacional",
        objetivo: "Diseñar estructuras organizacionales saludables.",
        temas: [
          "Organigrama ministerial",
          "Manual de funciones y delegación efectiva",
          "Coordinación interministerial",
        ],
        taller: "Diseñar el organigrama institucional.",
      },
      {
        id: "05812349-2be9-4b75-bee0-e25463c06716",
        nombre: "Gestión por Procesos",
        objetivo: "Documentar y mejorar procesos organizacionales.",
        temas: [
          "Identificación de procesos estratégicos, misionales y de apoyo",
          "Diagramas de flujo, procedimientos y manuales",
        ],
      },
      {
        id: "efa9afbc-1031-48b4-8254-7bfe2a303b06",
        nombre: "Gestión Documental",
        temas: [
          "Políticas, reglamentos, manuales y actas",
          "Gestión documental digital y auditoría",
        ],
      },
      {
        id: "34e58d86-51af-4767-a8ff-d1c66d134a69",
        nombre: "Administración Financiera",
        temas: [
          "Presupuesto, planeación financiera y tesorería",
          "Ofrendas, flujo de caja, control interno y transparencia",
        ],
      },
      {
        id: "58fed98a-4300-4965-ae1c-346d07c1c948",
        nombre: "Gestión del Talento Humano",
        temas: [
          "Cultura de servicio, integración y capacitación",
          "Desarrollo ministerial y plan de sucesión",
        ],
      },
      {
        id: "e7ba9a00-7c83-4c37-9503-9bbff5d5379e",
        nombre: "Gestión de Ministerios",
        temas: [
          "Planificación anual, objetivos e indicadores",
          "Reuniones efectivas, seguimiento y reportes",
        ],
      },
      {
        id: "2536cb6e-3b2a-4084-ac58-cee659c53ea9",
        nombre: "Gestión de Eventos",
        temas: [
          "Planeación, presupuesto, cronograma y logística",
          "Protocolo, voluntarios y evaluación",
        ],
      },
      {
        id: "c2bbbaf8-e647-4549-a6e4-ddb5838a5cb2",
        nombre: "Tecnología para la Administración",
        temas: [
          "CRM para iglesias, automatización y dashboards",
          "Seguridad informática e IA administrativa",
        ],
      },
      {
        id: "2e04df3f-e79b-4cb1-826f-4bec87f93ec2",
        nombre: "Gestión Estratégica y Mejora Continua",
        temas: [
          "KPIs administrativos, OKRs y Balanced Scorecard",
          "Auditorías, mejora continua y proyecto final",
        ],
      },
    ],
  },
  {
    id: "90eaa718-ecaf-499c-bf89-0ae81cd915dd",
    facultad_id: "3c452d30-71e2-45aa-88f8-0b5b24032bfd",
    numero: "III",
    titulo: "Liderazgo Ministerial",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Desarrollar líderes íntegros, estratégicos y multiplicadores, capaces de inspirar, formar equipos, administrar ministerios y desarrollar nuevos líderes que contribuyan al cumplimiento de la visión de la iglesia.",
    dirigido_a: [
      "Pastores",
      "Copastores",
      "Líderes de ministerio",
      "Líderes de Casas de Paz",
      "Coordinadores",
      "Supervisores",
      "Aspirantes al liderazgo",
    ],
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
    proyecto_final: [
      "Diagnóstico del liderazgo de la iglesia",
      "Perfil de competencias para líderes",
      "Ruta de formación y mentoría",
      "Sistema de evaluación",
      "Plan de sucesión",
      "Estrategia de multiplicación de líderes",
    ],
    facultad: "Facultad de Liderazgo",
    modulos: [
      {
        id: "a63797ac-15c8-4bc9-9f5c-2fa19410bf2e",
        nombre: "Fundamentos del Liderazgo Ministerial",
        objetivo:
          "Comprender los principios fundamentales del liderazgo cristiano y su impacto en el desarrollo de la iglesia.",
        temas: [
          "Liderazgo bíblico y servicio",
          "Autoridad, responsabilidad e influencia",
          "Liderazgo transformacional",
        ],
        taller: "Diagnóstico del estilo personal de liderazgo.",
      },
      {
        id: "3f5f2108-a381-4459-8a2a-6301fcc2048f",
        nombre: "Carácter e Integridad del Líder",
        objetivo: "Fortalecer el carácter como fundamento del liderazgo ministerial.",
        temas: [
          "Integridad y ética ministerial",
          "Humildad, credibilidad y disciplina personal",
          "Vida espiritual del líder",
        ],
        taller: "Plan personal de crecimiento.",
      },
      {
        id: "50bd77b1-c162-40ea-a135-704359feb052",
        nombre: "Inteligencia Emocional",
        objetivo: "Desarrollar habilidades emocionales para liderar personas de manera efectiva.",
        temas: [
          "Autoconocimiento y autocontrol",
          "Empatía y relaciones interpersonales",
          "Manejo del estrés y salud emocional",
        ],
        taller: "Evaluación del perfil emocional.",
      },
      {
        id: "9f9b939e-458c-4a25-a201-6fb405fa8565",
        nombre: "Comunicación de Alto Impacto",
        objetivo: "Desarrollar habilidades de comunicación para influir, enseñar y liderar.",
        temas: [
          "Comunicación efectiva y escucha activa",
          "Hablar en público y presentaciones efectivas",
          "Storytelling y comunicación digital",
        ],
        taller: "Presentación de una enseñanza de 10 minutos.",
      },
      {
        id: "e5766bfb-b8b8-4412-b427-a95c832b64dd",
        nombre: "Liderazgo de Equipos",
        objetivo: "Aprender a formar, desarrollar y fortalecer equipos ministeriales.",
        temas: [
          "Equipos de alto desempeño y diversidad de dones",
          "Delegación, empoderamiento y motivación",
          "Seguimiento y evaluación del desempeño",
        ],
        taller: "Diseño del plan de fortalecimiento de un ministerio.",
      },
      {
        id: "26999424-c0ee-4962-82bd-3fb6b08e6b20",
        nombre: "Mentoría y Desarrollo de Líderes",
        objetivo: "Desarrollar competencias para formar nuevos líderes.",
        temas: [
          "Mentoría, coaching y discipulado de líderes",
          "Acompañamiento, multiplicación y sucesión",
        ],
        taller: "Diseño del plan de mentoría.",
      },
      {
        id: "711c6583-2081-4ef6-981c-2e3fe409245e",
        nombre: "Gestión de Conflictos",
        objetivo: "Resolver conflictos fortaleciendo la unidad y el crecimiento del equipo.",
        temas: [
          "Diagnóstico y comunicación en el conflicto",
          "Negociación, mediación y restauración",
        ],
        taller: "Resolución de casos prácticos.",
      },
      {
        id: "4229b98b-5d30-4b95-be99-46d432822e5d",
        nombre: "Liderazgo Estratégico",
        objetivo: "Desarrollar visión estratégica para conducir ministerios y proyectos.",
        temas: [
          "Planeación ministerial, objetivos e indicadores",
          "Gestión por resultados y toma de decisiones",
        ],
        taller: "Construcción del plan estratégico de un ministerio.",
      },
      {
        id: "0e3d5ede-0d6d-4856-8c86-d916ba021eba",
        nombre: "Liderazgo Multiplicador",
        objetivo: "Crear una cultura de multiplicación y desarrollo continuo de nuevos líderes.",
        temas: [
          "Delegación estratégica y desarrollo de sucesores",
          "Equipos autosostenibles y liderazgo generacional",
        ],
        taller: "Diseño del mapa de multiplicación de líderes.",
      },
      {
        id: "c10560a7-48c8-4467-84f5-0010797da340",
        nombre: "Proyecto Integrador",
        objetivo:
          "Integrar los conocimientos adquiridos mediante el diseño de un plan de liderazgo para la iglesia.",
        temas: [
          "Diagnóstico del liderazgo actual y perfil de líder",
          "Ruta de formación, mentoría y sucesión",
        ],
      },
    ],
  },
  {
    id: "043b4f59-0998-4e2b-a470-01260306ff86",
    facultad_id: "83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a",
    numero: "IV",
    titulo: "Discipulado Estratégico",
    subtitulo: "Diseñando iglesias que hacen discípulos, forman líderes y transforman comunidades",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Capacitar a líderes e iglesias para diseñar, implementar y evaluar un sistema integral de discipulado que permita evangelizar, integrar, formar, desarrollar y enviar discípulos comprometidos con la misión de la iglesia.",
    dirigido_a: [
      "Pastores",
      "Líderes de discipulado",
      "Coordinadores de consolidación",
      "Líderes de grupos pequeños",
      "Supervisores",
      "Mentores",
      "Maestros bíblicos",
    ],
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
    proyecto_final: [
      "Diagnóstico del discipulado actual",
      "Ruta de crecimiento espiritual",
      "Plan de consolidación",
      "Programa de mentoría",
      "Modelo de grupos pequeños",
      "Indicadores de crecimiento",
    ],
    facultad: "Facultad de Desarrollo Ministerial",
    modulos: [
      {
        id: "48dc449a-3153-4305-bde3-10cd93e4766b",
        nombre: "Fundamentos del Discipulado",
        objetivo: "Comprender el discipulado como el centro de la misión de la iglesia.",
        temas: [
          "La Gran Comisión y el ministerio de Jesús",
          "Cultura y modelos de discipulado",
        ],
        taller: "Diagnóstico del sistema de discipulado de la iglesia.",
      },
      {
        id: "b23a65a8-a848-46da-a137-4b2fdec38a93",
        nombre: "Evangelismo y Primer Contacto",
        objetivo: "Diseñar estrategias para alcanzar personas y facilitar su integración.",
        temas: [
          "Evangelismo relacional, comunitario y digital",
          "Primer contacto, hospitalidad y seguimiento inicial",
        ],
        taller: "Diseño del proceso de primer contacto.",
      },
      {
        id: "048e6f8e-5da6-439c-af87-4a26628959c6",
        nombre: "Consolidación de Nuevos Creyentes",
        objetivo: "Implementar un proceso efectivo para acompañar a quienes inician su vida cristiana.",
        temas: [
          "Principios de acompañamiento y plan de seguimiento",
          "Cuidado pastoral e indicadores de consolidación",
        ],
        taller: "Diseño de la ruta de consolidación.",
      },
      {
        id: "8e1b1b12-5e89-4b72-a8e3-387c405c9333",
        nombre: "Formación Espiritual",
        objetivo: "Desarrollar procesos sistemáticos de crecimiento espiritual.",
        temas: [
          "Disciplinas espirituales, oración y estudio bíblico",
          "Comunidad cristiana y servicio",
        ],
        taller: "Diseño del plan de formación espiritual.",
      },
      {
        id: "d229e734-3d8d-4116-b9cf-cbf1f05e7f77",
        nombre: "Mentoría y Acompañamiento",
        objetivo: "Capacitar líderes para acompañar y desarrollar discípulos.",
        temas: [
          "Perfil del mentor y relación mentor-discípulo",
          "Acompañamiento espiritual y multiplicación de mentores",
        ],
        taller: "Diseño del programa de mentoría.",
      },
      {
        id: "dd860253-c33e-4a5b-bee4-c7396dd52aa5",
        nombre: "Desarrollo de Líderes",
        objetivo: "Preparar discípulos para asumir responsabilidades de liderazgo.",
        temas: [
          "Identificación de futuros líderes y formación por competencias",
          "Escuelas de liderazgo y multiplicación",
        ],
        taller: "Ruta de desarrollo de líderes.",
      },
      {
        id: "eecc601e-5600-43c2-8e1a-d4e768c42a24",
        nombre: "Grupos Pequeños y Comunidad",
        objetivo: "Fortalecer la vida comunitaria mediante grupos pequeños.",
        temas: [
          "Organización y liderazgo de grupos pequeños",
          "Pastoreo, multiplicación e integración",
        ],
        taller: "Diseño del sistema de grupos pequeños.",
      },
      {
        id: "2d35aeb5-44bb-461c-a61b-dd7ad3596569",
        nombre: "Gestión del Discipulado",
        objetivo: "Administrar y evaluar el sistema de discipulado.",
        temas: [
          "Procesos, bases de datos y seguimiento",
          "Indicadores, reportes y mejora continua",
        ],
        taller: "Mapa de procesos del discipulado.",
      },
      {
        id: "cc821cff-89e3-4af3-9ab1-23b2d6d2ddf2",
        nombre: "Discipulado y Transformación Comunitaria",
        objetivo: "Comprender el impacto del discipulado más allá de la iglesia local.",
        temas: [
          "Discipulado, familia y servicio social",
          "Impacto comunitario y cultura del Reino",
        ],
        taller: "Proyecto de impacto comunitario.",
      },
      {
        id: "33d246a2-986b-44fd-8fe4-44faed101391",
        nombre: "Diseño del Sistema Integral de Discipulado",
        objetivo:
          "Integrar todos los conocimientos del diplomado en un sistema completo de discipulado para la iglesia.",
        temas: [
          "Definición de la ruta de discipulado e indicadores",
          "Tecnología aplicada y plan de implementación",
        ],
      },
    ],
  },
  {
    id: "bb598d5b-3a6d-475e-8645-d6dd4399c4e7",
    facultad_id: "a1b349a1-fd9e-446e-bc2d-cb735269fae2",
    numero: "V",
    titulo: "Planeación Estratégica e Indicadores para Iglesias",
    subtitulo: "Transformando la visión en resultados medibles",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Desarrollar competencias para planificar estratégicamente el crecimiento de la iglesia, establecer objetivos claros, implementar indicadores de gestión y tomar decisiones basadas en información para fortalecer el cumplimiento de la visión.",
    dirigido_a: [
      "Pastores",
      "Copastores",
      "Administradores",
      "Coordinadores ministeriales",
      "Supervisores",
      "Líderes de proyectos",
    ],
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
    proyecto_final: [
      "Diagnóstico organizacional y análisis FODA",
      "Mapa estratégico y objetivos institucionales",
      "Plan operativo anual y sistema de KPIs",
      "Dashboard ministerial y cronograma de ejecución",
    ],
    facultad: "Facultad de Gestión",
    modulos: [
      {
        id: "ac33847c-cbbc-404c-8004-c4f4b6ee6f0d",
        nombre: "Fundamentos de la Planeación Estratégica",
        objetivo:
          "Comprender la importancia de la planeación estratégica como herramienta para desarrollar la visión.",
        temas: [
          "Pensamiento estratégico y ciclo de la planeación",
          "Niveles de planificación y cultura de planeación",
        ],
        taller: "Diagnóstico del nivel de planeación de la iglesia.",
      },
      {
        id: "5c42ea08-cd85-4912-a487-a9ee15cf5997",
        nombre: "Diagnóstico Organizacional",
        objetivo:
          "Analizar la situación actual de la iglesia para identificar oportunidades de mejora.",
        temas: [
          "Análisis interno, externo y FODA",
          "Factores críticos de éxito y priorización",
        ],
        taller: "Construcción del FODA institucional.",
      },
      {
        id: "6f7d2a56-ddec-4d76-b493-54dc4b046f15",
        nombre: "Formulación Estratégica",
        objetivo:
          "Diseñar los elementos estratégicos que orientarán el desarrollo de la iglesia.",
        temas: [
          "Objetivos, líneas e iniciativas estratégicas",
          "Mapa estratégico y alineación ministerial",
        ],
        taller: "Diseño del mapa estratégico.",
      },
      {
        id: "eeb88f4c-839e-4f02-b4ca-4c63b668b634",
        nombre: "Gestión por Objetivos",
        objetivo: "Aprender a convertir la visión en objetivos concretos.",
        temas: [
          "Objetivos SMART y OKRs",
          "Planes de acción, cronogramas y responsables",
        ],
        taller: "Construcción de objetivos estratégicos.",
      },
      {
        id: "24d000ec-fcbe-45e1-9934-71bbf65e410a",
        nombre: "Indicadores de Gestión",
        objetivo: "Diseñar indicadores para evaluar el cumplimiento de la visión.",
        temas: [
          "Indicadores estratégicos, ministeriales y de discipulado",
          "Fichas técnicas de indicadores",
        ],
        taller: "Diseño del sistema de KPIs.",
      },
      {
        id: "39e47b22-2fba-4cfe-97f3-81d48e3a4abc",
        nombre: "Tableros de Control (Dashboards)",
        objetivo: "Visualizar la información para facilitar la toma de decisiones.",
        temas: [
          "Dashboards, Balanced Scorecard y paneles ministeriales",
          "Reportes ejecutivos y seguimiento mensual",
        ],
        taller: "Diseño del tablero estratégico.",
      },
      {
        id: "10928d15-44af-46e2-91f0-763af416ace4",
        nombre: "Gestión de Proyectos Ministeriales",
        objetivo: "Planificar y administrar proyectos alineados con la visión.",
        temas: [
          "Ciclo de vida del proyecto, alcance y presupuesto",
          "Gestión de riesgos, evaluación y cierre",
        ],
        taller: "Diseño de un proyecto ministerial.",
      },
      {
        id: "ad05ddf4-e633-4559-973c-3d50f99e4e96",
        nombre: "Toma de Decisiones Basada en Datos",
        objetivo:
          "Desarrollar una cultura organizacional orientada al análisis de información.",
        temas: [
          "Análisis de información e interpretación de indicadores",
          "Reuniones estratégicas y resolución de problemas",
        ],
        taller: "Análisis de un tablero de indicadores.",
      },
      {
        id: "454777e4-7f96-4b46-a9d2-fbc9cbecd5ff",
        nombre: "Mejora Continua",
        objetivo: "Implementar procesos permanentes de evaluación y optimización.",
        temas: [
          "Ciclo PHVA, auditoría interna y evaluación ministerial",
          "Planes de mejora y sostenibilidad",
        ],
        taller: "Diseño del plan de mejora institucional.",
      },
      {
        id: "fef50491-f1e0-4b28-aacb-778eab1f1194",
        nombre: "Diseño del Plan Estratégico Institucional",
        objetivo: "Integrar todo lo aprendido en un plan estratégico listo para implementar.",
        temas: [
          "Consolidación del diagnóstico y objetivos",
          "Plan operativo anual y presentación ejecutiva",
        ],
      },
    ],
  },
  {
    id: "85e1d45e-21e4-415a-b478-2c56908bb96f",
    facultad_id: "b9a66d05-7a99-464b-bde3-bab879e1c8a3",
    numero: "VI",
    titulo: "Tecnología e Inteligencia Artificial para Iglesias",
    subtitulo: "Innovando para cumplir mejor la misión",
    duracion: "40 Horas",
    modalidad: "Presencial • Virtual • Híbrida",
    nivel: "Diplomado Profesional",
    objetivo_general:
      "Capacitar a líderes, pastores y administradores para diseñar e implementar estrategias de transformación digital mediante el uso de tecnología e inteligencia artificial, fortaleciendo la administración, el discipulado, la comunicación y la toma de decisiones de la iglesia.",
    dirigido_a: [
      "Pastores",
      "Administradores",
      "Líderes ministeriales",
      "Equipos de comunicaciones",
      "Líderes de tecnología",
    ],
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
    proyecto_final: [
      "Diagnóstico de madurez digital",
      "Arquitectura tecnológica y estrategia de automatización",
      "Plan de implementación de IA y gestión de datos",
      "Roadmap tecnológico a tres años",
    ],
    facultad: "Facultad de Innovación",
    modulos: [
      {
        id: "6f465515-27b5-47a8-80f5-e5af6dc5c5ae",
        nombre: "Transformación Digital en la Iglesia",
        objetivo: "Comprender el impacto de la transformación digital en el desarrollo ministerial.",
        temas: [
          "Cultura digital y madurez tecnológica",
          "Ecosistema digital y tendencias globales",
        ],
        taller: "Evaluación del nivel de madurez digital de la iglesia.",
      },
      {
        id: "a7eda50f-4bf1-4197-834a-79923918273e",
        nombre: "Ecosistema Tecnológico para Iglesias",
        objetivo: "Diseñar la arquitectura tecnológica de una iglesia moderna.",
        temas: [
          "Sistemas de gestión ministerial, bases de datos y CRM",
          "Plataformas colaborativas y seguridad en la nube",
        ],
        taller: "Mapa del ecosistema tecnológico institucional.",
      },
      {
        id: "68c6af3b-0365-4f96-a904-078921ff2fa0",
        nombre: "Gestión de Datos",
        objetivo: "Aprender a administrar la información de manera estratégica.",
        temas: [
          "Calidad de datos y bases de datos ministeriales",
          "Protección de datos, privacidad y analítica",
        ],
        taller: "Diseño del modelo de datos de la iglesia.",
      },
      {
        id: "4f6bae55-085f-451a-a7ac-d0f866f6b140",
        nombre: "Automatización de Procesos",
        objetivo: "Automatizar tareas repetitivas para mejorar la eficiencia.",
        temas: [
          "Formularios digitales, flujos de trabajo e integraciones",
          "Notificaciones automáticas y optimización de procesos",
        ],
        taller: "Diseño de un flujo automatizado.",
      },
      {
        id: "b01bf48e-e903-4aaa-8914-bfc557f53d9a",
        nombre: "Inteligencia Artificial Generativa",
        objetivo: "Comprender los fundamentos y aplicaciones de la IA.",
        temas: [
          "IA generativa, modelos de lenguaje e ingeniería de prompts",
          "Herramientas de IA y productividad",
        ],
        taller: "Creación de prompts especializados para el ministerio.",
      },
      {
        id: "37cb4320-014c-412d-bf0e-5e2262bec233",
        nombre: "IA Aplicada al Ministerio",
        objetivo: "Aplicar inteligencia artificial en diferentes áreas de la iglesia.",
        temas: [
          "IA para investigación bíblica, planificación y discipulado",
          "IA para administración, comunicaciones y atención al miembro",
        ],
        taller: "Diseño de asistentes de IA para ministerios.",
      },
      {
        id: "a1e7ce84-db47-4539-9407-1cda89cc06ac",
        nombre: "Comunicación Digital",
        objetivo: "Diseñar estrategias digitales para fortalecer el alcance de la iglesia.",
        temas: [
          "Estrategia digital, redes sociales y producción audiovisual",
          "Streaming, mensajería y analítica digital",
        ],
        taller: "Plan anual de comunicación digital.",
      },
      {
        id: "f77f4cf1-f83a-49b0-980c-18194de6396c",
        nombre: "Ciberseguridad y Ética Digital",
        objetivo: "Proteger la información institucional y promover un uso responsable de la tecnología.",
        temas: [
          "Ciberseguridad, gestión de accesos y copias de seguridad",
          "Ética tecnológica, ética en IA y privacidad",
        ],
        taller: "Diagnóstico de seguridad tecnológica.",
      },
      {
        id: "c1c9be01-e1d7-4570-9704-f865aa55f95e",
        nombre: "Gestión de la Innovación",
        objetivo: "Desarrollar una cultura organizacional orientada a la innovación continua.",
        temas: [
          "Design Thinking, transformación cultural y laboratorios de innovación",
          "Escalabilidad y roadmap tecnológico",
        ],
        taller: "Diseño del plan de innovación institucional.",
      },
      {
        id: "ed0793eb-30a1-4b9c-b1c7-d52792d996b5",
        nombre: "Diseño del Plan de Transformación Digital",
        objetivo: "Integrar todo lo aprendido en un plan de transformación digital para la iglesia.",
        temas: [
          "Diagnóstico tecnológico, selección de herramientas y presupuesto",
          "Indicadores digitales y presentación ejecutiva",
        ],
      },
    ],
  },
];

const FALLBACK_FACULTADES: FacultadCMS[] = [
  {
    id: "3c452d30-71e2-45aa-88f8-0b5b24032bfd",
    nombre: "Facultad de Liderazgo",
    diplomados: ["Diplomado III: Liderazgo Ministerial"],
  },
  {
    id: "a1b349a1-fd9e-446e-bc2d-cb735269fae2",
    nombre: "Facultad de Gestión",
    diplomados: [
      "Diplomado II: Administración Eclesiástica",
      "Diplomado V: Planeación Estratégica e Indicadores para Iglesias",
    ],
  },
  {
    id: "83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a",
    nombre: "Facultad de Desarrollo Ministerial",
    diplomados: [
      "Diplomado I: Visión y Cultura Organizacional",
      "Diplomado IV: Discipulado Estratégico",
    ],
  },
  {
    id: "b9a66d05-7a99-464b-bde3-bab879e1c8a3",
    nombre: "Facultad de Innovación",
    diplomados: [
      "Diplomado VI: Tecnología e Inteligencia Artificial para Iglesias",
    ],
  },
];

export function useAcademyCMS() {
  return useQuery({
    queryKey: ["academy_cms_data"],
    queryFn: async () => {
      try {
        const { data: facultades, error: fError } = await (supabase as any)
          .from("academy_facultades")
          .select("*")
          .order("orden", { ascending: true });
        if (fError) throw fError;

        const { data: diplomados, error: dError } = await (supabase as any)
          .from("academy_diplomados")
          .select("*")
          .order("orden", { ascending: true });
        if (dError) throw dError;

        const { data: modulos, error: mError } = await (supabase as any)
          .from("academy_modulos")
          .select("*")
          .order("orden", { ascending: true });
        if (mError) throw mError;

        if (!diplomados || diplomados.length === 0) {
          return {
            facultades: FALLBACK_FACULTADES,
            diplomados: FALLBACK_DIPLOMADOS,
          };
        }

        const formattedDiplomados: DiplomadoCMS[] = diplomados.map((d: any) => ({
          id: d.id,
          facultad_id: d.facultad_id,
          numero: d.numero,
          titulo: d.titulo,
          subtitulo: d.subtitulo,
          duracion: d.duracion,
          modalidad: d.modalidad,
          nivel: d.nivel,
          objetivo_general: d.objetivo_general,
          dirigido_a: d.dirigido_a || [],
          competencias: d.competencias || [],
          proyecto_final: d.proyecto_final || [],
          facultad:
            (facultades || []).find((f: any) => f.id === d.facultad_id)?.nombre || "",
          modulos: (modulos || [])
            .filter((m: any) => m.diplomado_id === d.id)
            .map((m: any) => ({
              id: m.id,
              nombre: m.nombre,
              objetivo: m.objetivo,
              temas: m.temas || [],
              taller: m.taller,
            })),
        }));

        const formattedFacultades: FacultadCMS[] =
          facultades && facultades.length > 0
            ? facultades.map((f: any) => ({
                id: f.id,
                nombre: f.nombre,
                diplomados: formattedDiplomados
                  .filter((d) => d.facultad_id === f.id)
                  .map((d) => `Diplomado ${d.numero}: ${d.titulo}`),
              }))
            : FALLBACK_FACULTADES;

        return {
          facultades: formattedFacultades,
          diplomados: formattedDiplomados,
        };
      } catch (err) {
        console.warn("Usando catálogo integrado de DOXA Academy:", err);
        return {
          facultades: FALLBACK_FACULTADES,
          diplomados: FALLBACK_DIPLOMADOS,
        };
      }
    },
  });
}
