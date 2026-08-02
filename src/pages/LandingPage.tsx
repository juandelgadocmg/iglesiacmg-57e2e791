import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import doxaIcon from "@/assets/doxa-icon.png";
import {
  Users,
  UsersRound,
  CalendarDays,
  DollarSign,
  GraduationCap,
  HeartHandshake,
  BarChart3,
  Sparkles,
} from "lucide-react";

/**
 * Página pública de aterrizaje de DOXA.
 * Se renderiza en la ruta "/" (ver App.tsx) y es lo primero que ve
 * cualquier visitante antes de iniciar sesión.
 *
 * Paleta, tipografía (Geist / Inter) e isotipo tomados del Brand Book 1.0 de DOXA.
 * Estilos encapsulados bajo .doxa-landing para no interferir con el resto de la app.
 */

const DoxaMark = ({ size = 28 }: { size?: number }) => (
  <img src={doxaIcon} alt="" width={size} height={size} style={{ objectFit: "contain" }} aria-hidden="true" />
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    iglesia: "",
    tamano: "Menos de 100 personas",
    correo: "",
    telefono: "",
    mensaje: "",
  });

  useEffect(() => {
    const id = "doxa-landing-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const update = (field: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const year = new Date().getFullYear();

  const iconItems = [
    { label: "Personas", Icon: Users },
    { label: "Grupos", Icon: UsersRound },
    { label: "Eventos", Icon: CalendarDays },
    { label: "Finanzas", Icon: DollarSign },
    { label: "Academia", Icon: GraduationCap },
    { label: "Ministerios", Icon: HeartHandshake },
    { label: "Reportes", Icon: BarChart3 },
    { label: "IA Asistente", Icon: Sparkles },
  ];

  return (
    <div className="doxa-landing">
      <header>
        <div className="wrap">
          <nav>
            <a href="#top" className="logo">
              <DoxaMark size={30} />
              DOXA
            </a>
            <div className="navlinks">
              <a href="#modulos">Módulos</a>
              <a href="#planes">Planes</a>
              <a href="#faq">Preguntas frecuentes</a>
              <a href="#demo">Contacto</a>
            </div>
            <div className="navcta">
              <Link to="/login" className="btn btn-outline btn-sm">
                Ingresar
              </Link>
              <a href="#demo" className="btn btn-primary btn-sm">
                Agendar demo
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-inner">
            <span className="pill-tag">
              <span className="dot" />
              Plataforma todo en uno para iglesias que avanzan
            </span>
            <h1>
              Conectamos tu iglesia. <span className="accent">Potenciamos su propósito.</span>
            </h1>
            <p className="lead">
              DOXA reúne personas, grupos, formación, programación de ministerios y finanzas en un
              solo lugar. Un isotipo, una plataforma, todos los ministerios trabajando en unidad.
            </p>
            <div className="hero-actions">
              <a href="#demo" className="btn btn-primary">
                Agendar una demo
              </a>
              <a href="#modulos" className="btn btn-outline">
                Ver módulos
              </a>
            </div>
            <div className="hero-badges">
              <span><span className="ck">✓</span> En la nube, sin instalaciones</span>
              <span><span className="ck">✓</span> Roles y permisos por ministerio</span>
              <span><span className="ck">✓</span> Acompañamiento en la migración</span>
            </div>
          </div>

          <div className="wrap">
            <div className="hero-shot" aria-hidden="true">
              <div className="hero-shot-inner">
                <div className="hs-side">
                  <div className="hs-brand">
                    <DoxaMark size={18} />
                    <span>DOXA</span>
                  </div>
                  <div className="it on">Dashboard</div>
                  <div className="it">Personas</div>
                  <div className="it">Grupos</div>
                  <div className="it">Eventos</div>
                  <div className="it">Ministerios</div>
                  <div className="it">Academia</div>
                  <div className="it">Finanzas</div>
                  <div className="it">Reportes</div>
                  <div className="it">Configuración</div>
                </div>
                <div className="hs-main">
                  <div className="hs-grid">
                    <div className="hs-card">
                      <div className="l">Personas activas</div>
                      <div className="n">1,250</div>
                      <div className="delta">+12%</div>
                    </div>
                    <div className="hs-card">
                      <div className="l">Grupos activos</div>
                      <div className="n">156</div>
                      <div className="delta">+8%</div>
                    </div>
                    <div className="hs-card">
                      <div className="l">Eventos este mes</div>
                      <div className="n">28</div>
                      <div className="delta">+15%</div>
                    </div>
                    <div className="hs-card">
                      <div className="l">Diezmos del mes</div>
                      <div className="n">$24,560</div>
                      <div className="delta">+10%</div>
                    </div>
                  </div>
                  <div className="hs-chart">
                    <div className="hs-chart-label">Asistencia</div>
                    <svg viewBox="0 0 300 70" width="100%" height="70" preserveAspectRatio="none">
                      <polyline
                        points="0,50 40,35 80,45 120,20 160,30 200,12 240,25 300,8"
                        fill="none"
                        stroke="url(#hsline)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="hsline" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#4E7CFF" />
                          <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE / ICONOGRAFÍA */}
        <section className="marquee-wrap">
          <p className="marquee-label">Todo lo que tu equipo ministerial necesita, conectado</p>
          <div className="marquee">
            {[...iconItems, ...iconItems].map(({ label, Icon }, i) => (
              <div className="chip" key={i}>
                <Icon size={16} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="stats">
          <div className="wrap stats-grid">
            <div><div className="n">18+</div><div className="l">Módulos integrados</div></div>
            <div><div className="n">5</div><div className="l">Áreas ministeriales</div></div>
            <div><div className="n">100%</div><div className="l">En la nube</div></div>
            <div><div className="n">1</div><div className="l">Asistente con IA incluido</div></div>
          </div>
        </section>

        {/* PRODUCT BLOCKS */}
        <section className="products" id="modulos">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Qué incluye</span>
              <h2>Un módulo para cada parte de la vida de tu iglesia</h2>
              <p>Cada área se administra por separado, con permisos propios — pero toda la información vive conectada.</p>
            </div>

            <div className="prod-block">
              <div className="prod-copy">
                <span className="tag">Comunidad</span>
                <h3>Conoce y acompaña a cada persona</h3>
                <p>Directorio de personas y familias, grupos, casas de paz, reuniones, asistencia y eventos — todo enlazado al perfil de cada persona.</p>
                <div className="chk"><span className="ic">✓</span>Historial completo por persona, sin planillas sueltas</div>
                <div className="chk"><span className="ic">✓</span>Seguimiento por líder de red o de grupo</div>
                <a href="#demo" className="btn btn-outline btn-sm">Conocer más →</a>
              </div>
              <div className="prod-visual">
                <div className="row"><span className="k">Personas activas</span><span className="v">1,250</span></div>
                <div className="row"><span className="k">Grupos en operación</span><span className="badge">156 activos</span></div>
                <div className="row"><span className="k">Próximo evento</span><span className="v">Este domingo</span></div>
              </div>
            </div>

            <div className="prod-block rev">
              <div className="prod-copy">
                <span className="tag">Formación</span>
                <h3>Academia, seminario y certificados</h3>
                <p>Escuelas, periodos, materias, matrícula y calificaciones. Cuando una persona termina su proceso, el certificado se genera automáticamente.</p>
                <div className="chk"><span className="ic">✓</span>Matrícula manual o por cargue masivo</div>
                <div className="chk"><span className="ic">✓</span>Historial de formación ligado al perfil de cada persona</div>
                <a href="#demo" className="btn btn-outline btn-sm">Conocer más →</a>
              </div>
              <div className="prod-visual">
                <div className="row"><span className="k">Matrículas del periodo</span><span className="v">—</span></div>
                <div className="row"><span className="k">Estado</span><span className="badge">Aprobado</span></div>
                <div className="row"><span className="k">Certificados emitidos</span><span className="v">Automático</span></div>
              </div>
            </div>

            <div className="prod-block">
              <div className="prod-copy">
                <span className="tag">Operación</span>
                <h3>Programación de ministerios sin fricción</h3>
                <p>Formatos ISO por ministerio, asignación de servidores, disponibilidad y reemplazos — exportables en PDF, tal como ya los usas.</p>
                <div className="chk"><span className="ic">✓</span>Permisos de programación por rol (Líder, Pastor, Admin)</div>
                <div className="chk"><span className="ic">✓</span>Campos de texto libre o buscador de persona, según cada estación</div>
                <a href="#demo" className="btn btn-outline btn-sm">Conocer más →</a>
              </div>
              <div className="prod-visual">
                <div className="row"><span className="k">Ministerio</span><span className="v">Kabod</span></div>
                <div className="row"><span className="k">Servidores asignados</span><span className="badge">Completo</span></div>
                <div className="row"><span className="k">Formato</span><span className="v">Exportable a PDF</span></div>
              </div>
            </div>

            <div className="prod-block rev">
              <div className="prod-copy">
                <span className="tag">Finanzas</span>
                <h3>Diezmos, ofrendas y reportes claros</h3>
                <p>Registra los ingresos de tu congregación y consulta reportes por periodo, sin depender de una hoja de cálculo aparte.</p>
                <div className="chk"><span className="ic">✓</span>Dashboard financiero por periodo</div>
                <div className="chk"><span className="ic">✓</span>Roles de tesorería independientes de la administración general</div>
                <a href="#demo" className="btn btn-outline btn-sm">Conocer más →</a>
              </div>
              <div className="prod-visual">
                <div className="row"><span className="k">Diezmos del mes</span><span className="v">$24,560</span></div>
                <div className="row"><span className="k">Reportes</span><span className="badge">Automáticos</span></div>
                <div className="row"><span className="k">Acceso</span><span className="v">Por rol</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="why" id="por-que">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Por qué DOXA</span>
              <h2>Gloria, conexión y unidad — llevadas a tu operación diaria</h2>
              <p>Cada segmento del isotipo representa un ministerio trabajando en unidad. Así construimos la plataforma.</p>
            </div>
            <div className="why-grid">
              <div className="why-card"><div className="ic"><HeartHandshake size={20} /></div><h4>Permisos por ministerio</h4><p>Cada líder ve y edita solo lo que le corresponde, sin fricción ni exceso de acceso.</p></div>
              <div className="why-card"><div className="ic"><Sparkles size={20} /></div><h4>Asistente DOXA IA</h4><p>Pregunta en lenguaje natural sobre personas, finanzas o programación y obtén datos reales.</p></div>
              <div className="why-card"><div className="ic"><CalendarDays size={20} /></div><h4>Formatos que ya usas</h4><p>Programación ISO exportable en PDF, tal como la maneja tu equipo hoy.</p></div>
              <div className="why-card"><div className="ic"><UsersRound size={20} /></div><h4>Migración acompañada</h4><p>Te ayudamos a pasar tu información actual y configurar los ministerios de tu iglesia.</p></div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="quote-sec">
          <div className="wrap">
            <div className="quote-card">
              <div className="quote-mark">"</div>
              <p className="q">Pasamos de manejar cada ministerio en hojas separadas a tener toda la programación, las personas y la formación en un solo lugar.</p>
              <div className="who">Equipo administrativo — congregación en operación con DOXA</div>
            </div>
          </div>
        </section>

        {/* PLANS */}
        <section className="plans" id="planes">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Planes</span>
              <h2>Un plan que se adapta al tamaño de tu congregación</h2>
              <p>Sin contratos de permanencia. Empieza con lo que necesitas hoy y crece cuando lo necesites.</p>
            </div>
            <div className="plans-grid">
              <div className="plan">
                <h4>Comunidad</h4>
                <p className="desc">Para congregaciones que están empezando a organizar su información.</p>
                <p className="price">Habla con ventas</p>
                <ul>
                  <li><span className="ic">✓</span>Personas, grupos y eventos</li>
                  <li><span className="ic">✓</span>1 ministerio con programación ISO</li>
                  <li><span className="ic">✓</span>Soporte por correo</li>
                </ul>
                <a href="#demo" className="btn btn-outline">Agendar demo</a>
              </div>
              <div className="plan feat">
                <span className="flag">Más elegido</span>
                <h4>Congregación</h4>
                <p className="desc">Para iglesias con varios ministerios y equipo administrativo activo.</p>
                <p className="price">Habla con ventas</p>
                <ul>
                  <li><span className="ic">✓</span>Todos los módulos de Comunidad y Formación</li>
                  <li><span className="ic">✓</span>Ministerios ilimitados con programación ISO</li>
                  <li><span className="ic">✓</span>Finanzas y reportes</li>
                  <li><span className="ic">✓</span>Asistente DOXA IA</li>
                </ul>
                <a href="#demo" className="btn btn-primary">Agendar demo</a>
              </div>
              <div className="plan">
                <h4>Red multi-sede</h4>
                <p className="desc">Para redes de iglesias o congregaciones con varias sedes.</p>
                <p className="price">Habla con ventas</p>
                <ul>
                  <li><span className="ic">✓</span>Todo lo de Congregación</li>
                  <li><span className="ic">✓</span>Gestión por sede y por líder de red</li>
                  <li><span className="ic">✓</span>Acompañamiento dedicado en la migración</li>
                </ul>
                <a href="#demo" className="btn btn-outline">Agendar demo</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" id="faq">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Preguntas frecuentes</span>
              <h2>Resolvemos tus dudas</h2>
            </div>
            <div className="faq-list">
              <details open>
                <summary>¿Qué es DOXA?<span className="plus">+</span></summary>
                <p>Es una plataforma en la nube para gestionar la operación de una congregación: personas, grupos, formación, programación de ministerios, comunicación pastoral y finanzas, todo conectado en un solo lugar.</p>
              </details>
              <details>
                <summary>¿Puedo darle acceso solo a un líder de ministerio, sin que vea toda la información?<span className="plus">+</span></summary>
                <p>Sí. Los permisos se configuran por rol y por ministerio, así cada líder solo ve y edita lo que le corresponde a su área.</p>
              </details>
              <details>
                <summary>¿Me ayudan a migrar la información que ya tengo en Excel?<span className="plus">+</span></summary>
                <p>Sí, te acompañamos en el proceso de cargue y configuración inicial de tus ministerios y bases de datos existentes.</p>
              </details>
              <details>
                <summary>¿DOXA funciona para iglesias con varias sedes?<span className="plus">+</span></summary>
                <p>Sí, puedes gestionar varias sedes desde la misma cuenta, con roles diferenciados por líder de red.</p>
              </details>
              <details>
                <summary>¿Necesito instalar algo?<span className="plus">+</span></summary>
                <p>No. DOXA es 100% en la nube: accedes desde cualquier computador o celular con conexión a internet.</p>
              </details>
              <details>
                <summary>¿Cómo agendo una demo?<span className="plus">+</span></summary>
                <p>Completa el formulario al final de esta página y nuestro equipo te contactará para agendar una sesión con tu equipo pastoral y administrativo.</p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA STRIP */}
        <section className="cta-strip">
          <div className="wrap">
            <div className="cta-box">
              <div>
                <h3>¿Listo para ver DOXA funcionando con datos reales?</h3>
                <p>Agenda una demo de 30 minutos, sin costo ni compromiso.</p>
              </div>
              <a href="#demo" className="btn btn-dark">Agendar demo →</a>
            </div>
          </div>
        </section>

        {/* DEMO FORM */}
        <section className="demo" id="demo">
          <div className="wrap">
            <div className="demo-panel">
              <div className="demo-copy">
                <span className="pill-tag pill-dark"><span className="dot" />Agenda una demo</span>
                <h2>Conoce DOXA funcionando con datos reales</h2>
                <p>Una sesión de 30 minutos con tu equipo pastoral y administrativo para mostrarte cómo se vería tu congregación dentro de la plataforma.</p>
                <div className="row"><span className="dot" />Te mostramos los módulos que más te interesan.</div>
                <div className="row"><span className="dot" />Resolvemos dudas sobre migración de datos.</div>
                <div className="row"><span className="dot" />Sin costo ni compromiso.</div>
              </div>
              <div className="demo-form">
                {!submitted ? (
                  <form onSubmit={handleSubmit}>
                    <div className="field">
                      <label htmlFor="nombre">Nombre completo</label>
                      <input id="nombre" type="text" required placeholder="Tu nombre" value={form.nombre} onChange={update("nombre")} />
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="iglesia">Congregación</label>
                        <input id="iglesia" type="text" required placeholder="Nombre de tu iglesia" value={form.iglesia} onChange={update("iglesia")} />
                      </div>
                      <div className="field">
                        <label htmlFor="tamano">Tamaño aproximado</label>
                        <select id="tamano" value={form.tamano} onChange={update("tamano")}>
                          <option>Menos de 100 personas</option>
                          <option>100 – 500 personas</option>
                          <option>500 – 2.000 personas</option>
                          <option>Más de 2.000 personas</option>
                        </select>
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="correo">Correo</label>
                        <input id="correo" type="email" required placeholder="tucorreo@iglesia.org" value={form.correo} onChange={update("correo")} />
                      </div>
                      <div className="field">
                        <label htmlFor="telefono">Teléfono / WhatsApp</label>
                        <input id="telefono" type="tel" placeholder="+57 300 000 0000" value={form.telefono} onChange={update("telefono")} />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="mensaje">Cuéntanos qué necesitas (opcional)</label>
                      <textarea id="mensaje" rows={3} placeholder="Ej: manejamos varias sedes y necesitamos programación por ministerio" value={form.mensaje} onChange={update("mensaje")} />
                    </div>
                    <button type="submit" className="btn btn-primary">Solicitar demo →</button>
                    <p className="form-note">Te contactaremos en menos de 1 día hábil.</p>
                  </form>
                ) : (
                  <div className="success show">
                    <div className="check">✓</div>
                    <h3>Solicitud recibida</h3>
                    <p>Gracias — nuestro equipo se pondrá en contacto contigo pronto para agendar tu demo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a href="#top" className="logo">
                <DoxaMark size={26} />
                DOXA
              </a>
              <p className="tag">Plataforma todo en uno para iglesias que avanzan.</p>
            </div>
            <div><h4>Comunidad</h4><ul><li><a href="#modulos">Personas</a></li><li><a href="#modulos">Grupos</a></li><li><a href="#modulos">Eventos</a></li></ul></div>
            <div><h4>Formación</h4><ul><li><a href="#modulos">Academia</a></li><li><a href="#modulos">Seminario</a></li><li><a href="#modulos">Certificados</a></li></ul></div>
            <div><h4>Operación</h4><ul><li><a href="#modulos">Programación</a></li><li><a href="#modulos">Finanzas</a></li><li><a href="#modulos">Reportes</a></li></ul></div>
            <div><h4>Contacto</h4><ul><li><a href="#demo">Agendar demo</a></li><li><a href="mailto:hola@doxa.app">hola@doxa.app</a></li><li><Link to="/login">Ingresar</Link></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {year} DOXA. Todos los derechos reservados.</span>
            <span>DOXA.APP · Brand Book 1.0</span>
          </div>
        </div>
      </footer>

      <style>{`
        .doxa-landing{
          --navy:#0A1633; --navy-deep:#070E24;
          --blue:#1E40FF; --blue-light:#4E7CFF; --blue-soft:#EAF0FF;
          --violet:#7C3AED; --cyan:#22D3EE;
          --gold:#FFC857; --gold-soft:#FFF4DE;
          --bg:#FFFFFF; --bg-tint:#F5F7FC;
          --ink:#0A1633; --slate:#5B6B8C;
          --line:#E4E9F5;
          --r-lg:28px; --r-md:18px; --r-sm:12px;
          font-family:'Inter',sans-serif; color:var(--ink); background:var(--bg);
          line-height:1.55; -webkit-font-smoothing:antialiased;
        }
        .doxa-landing *{ box-sizing:border-box; }
        .doxa-landing h1,.doxa-landing h2,.doxa-landing h3{ font-family:'Geist',sans-serif; font-weight:600; letter-spacing:-0.015em; color:var(--navy); margin:0; }
        .doxa-landing a{ color:inherit; text-decoration:none; }
        .doxa-landing ul{ list-style:none; margin:0; padding:0; }
        .doxa-landing section{ position:relative; }
        .doxa-landing .wrap{ max-width:1200px; margin:0 auto; padding:0 28px; }

        .doxa-landing .pill-tag{ display:inline-flex; align-items:center; gap:8px; background:var(--blue-soft); color:var(--blue); padding:7px 16px; border-radius:999px; font-size:13px; font-weight:600; font-family:'Geist'; }
        .doxa-landing .pill-tag.pill-dark{ background:rgba(255,255,255,0.1); color:var(--gold-soft); }
        .doxa-landing .dot{ width:6px; height:6px; border-radius:50%; background:var(--gold); display:inline-block; }

        .doxa-landing .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:15px 28px; border-radius:999px; font-weight:600; font-family:'Geist'; font-size:15px; cursor:pointer; border:1.5px solid transparent; transition:transform .15s ease, box-shadow .15s ease, background .15s ease; white-space:nowrap; }
        .doxa-landing .btn:focus-visible{ outline:3px solid var(--gold); outline-offset:2px; }
        .doxa-landing .btn-primary{ background:linear-gradient(135deg, var(--blue), var(--violet)); color:#fff; box-shadow:0 10px 24px -10px rgba(30,64,255,0.55); }
        .doxa-landing .btn-primary:hover{ transform:translateY(-2px); box-shadow:0 16px 30px -10px rgba(30,64,255,0.6); }
        .doxa-landing .btn-dark{ background:var(--navy); color:#fff; }
        .doxa-landing .btn-dark:hover{ transform:translateY(-2px); }
        .doxa-landing .btn-outline{ background:#fff; color:var(--navy); border-color:var(--line); }
        .doxa-landing .btn-outline:hover{ border-color:var(--blue); color:var(--blue); }
        .doxa-landing .btn-sm{ padding:10px 18px; font-size:13.5px; }

        .doxa-landing header{ position:sticky; top:0; z-index:60; background:rgba(255,255,255,0.9); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
        .doxa-landing nav{ display:flex; align-items:center; justify-content:space-between; padding:16px 0; gap:24px; }
        .doxa-landing .logo{ display:flex; align-items:center; gap:9px; font-family:'Geist'; font-weight:700; font-size:20px; letter-spacing:0.02em; }
        .doxa-landing .navlinks{ display:flex; gap:28px; font-size:14.5px; font-weight:600; font-family:'Geist'; color:var(--navy); }
        .doxa-landing .navlinks a{ color:var(--slate); }
        .doxa-landing .navlinks a:hover{ color:var(--blue); }
        .doxa-landing .navcta{ display:flex; align-items:center; gap:12px; }
        @media (max-width:860px){ .doxa-landing .navlinks{ display:none; } }

        .doxa-landing .hero{ padding:76px 0 40px; background:radial-gradient(1100px 480px at 82% -10%, var(--blue-soft), transparent 60%); }
        .doxa-landing .hero-inner{ text-align:center; max-width:780px; margin:0 auto; }
        .doxa-landing .hero h1{ font-size:clamp(32px,5vw,52px); line-height:1.08; margin:20px 0 18px; font-weight:600; }
        .doxa-landing .hero h1 .accent{ background:linear-gradient(90deg, var(--blue), var(--violet)); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .doxa-landing .hero p.lead{ font-size:18px; color:var(--slate); max-width:560px; margin:0 auto 30px; }
        .doxa-landing .hero-actions{ display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-bottom:14px; }
        .doxa-landing .hero-badges{ display:flex; gap:22px; justify-content:center; flex-wrap:wrap; margin-top:22px; font-size:13px; color:var(--slate); font-weight:600; }
        .doxa-landing .hero-badges span{ display:inline-flex; align-items:center; gap:6px; }
        .doxa-landing .hero-badges .ck{ color:var(--blue); }

        .doxa-landing .hero-shot{ max-width:1040px; margin:52px auto 0; border-radius:var(--r-lg); background:linear-gradient(160deg,var(--navy) 0%,var(--navy-deep) 100%); padding:3px; box-shadow:0 40px 90px -40px rgba(10,22,51,0.5); }
        .doxa-landing .hero-shot-inner{ border-radius:calc(var(--r-lg) - 3px); background:var(--navy-deep); display:grid; grid-template-columns:180px 1fr; overflow:hidden; min-height:400px; }
        .doxa-landing .hs-side{ background:#0D1B40; padding:20px 14px; border-right:1px solid rgba(255,255,255,0.06); }
        .doxa-landing .hs-brand{ display:flex; align-items:center; gap:8px; color:#fff; font-family:'Geist'; font-weight:700; font-size:14px; padding:6px 6px 18px; }
        .doxa-landing .hs-side .it{ font-size:12.5px; color:#B9C6E4; padding:8px 9px; border-radius:9px; margin-bottom:2px; }
        .doxa-landing .hs-side .it.on{ background:linear-gradient(90deg, rgba(30,64,255,0.35), rgba(124,58,237,0.25)); color:#fff; position:relative; }
        .doxa-landing .hs-side .it.on::before{ content:""; position:absolute; left:-6px; top:50%; transform:translateY(-50%); width:3px; height:14px; background:var(--gold); border-radius:2px; }
        .doxa-landing .hs-main{ padding:26px 28px; }
        .doxa-landing .hs-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
        .doxa-landing .hs-card{ background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:14px; padding:14px; }
        .doxa-landing .hs-card .l{ font-size:10.5px; color:#8EA1CB; margin-bottom:6px; }
        .doxa-landing .hs-card .n{ font-family:'Geist'; font-size:20px; font-weight:700; color:#fff; }
        .doxa-landing .hs-card .delta{ font-size:10.5px; color:var(--cyan); margin-top:4px; font-weight:600; }
        .doxa-landing .hs-chart{ background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; }
        .doxa-landing .hs-chart-label{ font-size:11px; color:#8EA1CB; margin-bottom:8px; font-family:'Geist'; }

        .doxa-landing .marquee-wrap{ padding:44px 0 20px; overflow:hidden; }
        .doxa-landing .marquee-label{ text-align:center; font-size:13px; color:var(--slate); font-weight:600; margin-bottom:22px; }
        .doxa-landing .marquee{ display:flex; gap:40px; width:max-content; animation:doxa-scroll 24s linear infinite; }
        @media (prefers-reduced-motion:reduce){ .doxa-landing .marquee{ animation:none; } }
        @keyframes doxa-scroll{ from{ transform:translateX(0); } to{ transform:translateX(-50%); } }
        .doxa-landing .marquee .chip{ display:flex; align-items:center; gap:9px; font-family:'Geist'; font-weight:600; font-size:15px; color:var(--slate); white-space:nowrap; }
        .doxa-landing .marquee .chip svg{ color:var(--blue); }

        .doxa-landing .stats{ padding:60px 0; background:var(--bg-tint); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
        .doxa-landing .stats-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:24px; text-align:center; }
        @media (max-width:800px){ .doxa-landing .stats-grid{ grid-template-columns:1fr 1fr; } }
        .doxa-landing .stats .n{ font-family:'Geist'; font-size:clamp(30px,3.6vw,42px); font-weight:700; color:var(--navy); }
        .doxa-landing .stats .l{ font-size:13.5px; color:var(--slate); margin-top:6px; }

        .doxa-landing .products{ padding:100px 0 60px; }
        .doxa-landing .sec-head{ max-width:640px; margin:0 auto 60px; text-align:center; }
        .doxa-landing .sec-head h2{ font-size:clamp(28px,3.4vw,38px); margin:16px 0 14px; }
        .doxa-landing .sec-head p{ color:var(--slate); font-size:16.5px; }

        .doxa-landing .prod-block{ display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; padding:56px 0; border-bottom:1px solid var(--line); }
        .doxa-landing .prod-block:last-child{ border-bottom:none; }
        .doxa-landing .prod-block.rev .prod-copy{ order:2; }
        @media (max-width:900px){ .doxa-landing .prod-block{ grid-template-columns:1fr; } .doxa-landing .prod-block.rev .prod-copy{ order:0; } }
        .doxa-landing .prod-copy .tag{ font-family:'Geist'; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--blue); font-weight:600; }
        .doxa-landing .prod-copy h3{ font-size:26px; margin:12px 0 14px; }
        .doxa-landing .prod-copy p{ color:var(--slate); font-size:15.5px; margin-bottom:20px; }
        .doxa-landing .prod-copy .chk{ display:flex; gap:10px; align-items:flex-start; font-size:14.5px; color:var(--ink); margin-bottom:10px; }
        .doxa-landing .prod-copy .chk .ic{ width:18px; height:18px; border-radius:50%; background:var(--gold-soft); color:#946213; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; margin-top:1px; font-weight:700; }
        .doxa-landing .prod-visual{ background:var(--bg-tint); border:1px solid var(--line); border-radius:var(--r-lg); padding:26px; min-height:280px; display:flex; flex-direction:column; justify-content:center; gap:12px; }
        .doxa-landing .prod-visual .row{ background:#fff; border:1px solid var(--line); border-radius:var(--r-sm); padding:14px 16px; display:flex; justify-content:space-between; align-items:center; font-size:13.5px; }
        .doxa-landing .prod-visual .row .k{ color:var(--slate); }
        .doxa-landing .prod-visual .row .v{ font-weight:700; color:var(--navy); font-family:'Geist'; }
        .doxa-landing .prod-visual .row .badge{ background:var(--gold-soft); color:#946213; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700; }

        .doxa-landing .why{ padding:90px 0; background:var(--bg-tint); }
        .doxa-landing .why-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        @media (max-width:920px){ .doxa-landing .why-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:560px){ .doxa-landing .why-grid{ grid-template-columns:1fr; } }
        .doxa-landing .why-card{ background:#fff; border:1px solid var(--line); border-radius:var(--r-md); padding:26px; }
        .doxa-landing .why-card .ic{ width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,var(--blue),var(--violet)); margin-bottom:16px; display:flex; align-items:center; justify-content:center; color:#fff; }
        .doxa-landing .why-card h4{ font-size:16px; margin-bottom:8px; font-family:'Geist'; }
        .doxa-landing .why-card p{ font-size:14px; color:var(--slate); margin:0; }

        .doxa-landing .quote-sec{ padding:100px 0; }
        .doxa-landing .quote-card{ max-width:820px; margin:0 auto; text-align:center; background:linear-gradient(160deg,var(--navy) 0%,var(--navy-deep) 100%); border-radius:var(--r-lg); padding:64px 48px; color:#fff; position:relative; overflow:hidden; }
        .doxa-landing .quote-card::after{ content:""; position:absolute; right:-100px; top:-100px; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle, rgba(124,58,237,0.28), transparent 70%); }
        .doxa-landing .quote-mark{ font-family:'Geist'; font-size:64px; color:var(--gold); line-height:1; margin-bottom:8px; }
        .doxa-landing .quote-card p.q{ font-size:22px; font-weight:500; line-height:1.5; max-width:620px; margin:0 auto 24px; position:relative; z-index:1; }
        .doxa-landing .quote-card .who{ font-size:13.5px; color:#9FB1D8; position:relative; z-index:1; }

        .doxa-landing .plans{ padding:20px 0 100px; }
        .doxa-landing .plans-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        @media (max-width:900px){ .doxa-landing .plans-grid{ grid-template-columns:1fr; max-width:420px; margin:0 auto; } }
        .doxa-landing .plan{ border:1.5px solid var(--line); border-radius:var(--r-md); padding:32px 26px; background:#fff; display:flex; flex-direction:column; }
        .doxa-landing .plan.feat{ border-color:var(--blue); box-shadow:0 20px 40px -20px rgba(30,64,255,0.35); position:relative; }
        .doxa-landing .plan.feat .flag{ position:absolute; top:-13px; left:26px; background:var(--gold); color:var(--navy); font-size:11px; font-weight:700; padding:5px 12px; border-radius:999px; font-family:'Geist'; }
        .doxa-landing .plan h4{ font-family:'Geist'; font-size:20px; margin-bottom:6px; }
        .doxa-landing .plan .desc{ font-size:13.5px; color:var(--slate); margin-bottom:20px; }
        .doxa-landing .plan .price{ font-family:'Geist'; font-size:15px; color:var(--navy); font-weight:600; margin-bottom:22px; }
        .doxa-landing .plan ul{ display:flex; flex-direction:column; gap:11px; margin-bottom:26px; flex:1; }
        .doxa-landing .plan li{ display:flex; gap:9px; align-items:flex-start; font-size:14px; color:var(--ink); }
        .doxa-landing .plan li .ic{ width:16px; height:16px; border-radius:50%; background:var(--blue-soft); color:var(--blue); display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; margin-top:2px; font-weight:700; }
        .doxa-landing .plan .btn{ width:100%; }

        .doxa-landing .faq{ padding:20px 0 110px; }
        .doxa-landing .faq-list{ max-width:780px; margin:0 auto; }
        .doxa-landing details{ border-bottom:1px solid var(--line); padding:20px 0; }
        .doxa-landing summary{ cursor:pointer; list-style:none; display:flex; justify-content:space-between; align-items:center; font-weight:600; font-family:'Geist'; font-size:15.5px; color:var(--navy); }
        .doxa-landing summary::-webkit-details-marker{ display:none; }
        .doxa-landing summary .plus{ font-family:'Geist'; font-size:20px; color:var(--blue); transition:transform .2s ease; flex-shrink:0; margin-left:16px; }
        .doxa-landing details[open] summary .plus{ transform:rotate(45deg); }
        .doxa-landing details p{ font-size:14.5px; color:var(--slate); margin-top:12px; max-width:640px; }

        .doxa-landing .cta-strip{ padding:0 0 110px; }
        .doxa-landing .cta-box{ max-width:1000px; margin:0 auto; background:var(--blue-soft); border-radius:var(--r-lg); padding:56px; display:flex; justify-content:space-between; align-items:center; gap:30px; flex-wrap:wrap; }
        .doxa-landing .cta-box h3{ font-size:24px; margin-bottom:8px; }
        .doxa-landing .cta-box p{ color:var(--slate); font-size:14.5px; margin:0; }

        .doxa-landing .demo{ padding:0 0 110px; }
        .doxa-landing .demo-panel{ background:#fff; border:1px solid var(--line); border-radius:var(--r-lg); display:grid; grid-template-columns:1fr 1fr; overflow:hidden; box-shadow:0 30px 70px -45px rgba(10,22,51,0.4); }
        @media (max-width:880px){ .doxa-landing .demo-panel{ grid-template-columns:1fr; } }
        .doxa-landing .demo-copy{ padding:50px; background:linear-gradient(160deg,var(--navy) 0%,var(--navy-deep) 100%); color:#fff; }
        .doxa-landing .demo-copy h2{ color:#fff; font-size:28px; margin:14px 0 14px; }
        .doxa-landing .demo-copy p{ color:#B9C6E4; font-size:15px; margin-bottom:26px; }
        .doxa-landing .demo-copy .row{ display:flex; gap:10px; align-items:flex-start; font-size:13.5px; color:#DCE5F7; margin-bottom:12px; }
        .doxa-landing .demo-form{ padding:50px; }
        .doxa-landing .field{ margin-bottom:16px; }
        .doxa-landing .field label{ display:block; font-size:12.5px; font-weight:700; font-family:'Geist'; color:var(--navy); margin-bottom:6px; }
        .doxa-landing .field input, .doxa-landing .field select, .doxa-landing .field textarea{ width:100%; padding:12px 14px; border:1.5px solid var(--line); border-radius:12px; font-family:'Inter'; font-size:14.5px; color:var(--ink); background:var(--bg-tint); }
        .doxa-landing .field input:focus, .doxa-landing .field select:focus, .doxa-landing .field textarea:focus{ outline:2px solid var(--blue); outline-offset:1px; border-color:var(--blue); }
        .doxa-landing .field-row{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media (max-width:520px){ .doxa-landing .field-row{ grid-template-columns:1fr; } }
        .doxa-landing .demo-form .btn{ width:100%; margin-top:6px; }
        .doxa-landing .form-note{ font-size:12px; color:var(--slate); margin-top:12px; text-align:center; }
        .doxa-landing .success{ text-align:center; padding:40px 10px; }
        .doxa-landing .success .check{ width:54px; height:54px; border-radius:50%; background:var(--gold); margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:24px; color:var(--navy); }
        .doxa-landing .success h3{ font-size:19px; margin-bottom:8px; }
        .doxa-landing .success p{ color:var(--slate); font-size:14px; margin:0; }

        .doxa-landing footer{ background:var(--navy-deep); color:#B9C6E4; padding:64px 0 30px; }
        .doxa-landing .foot-grid{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1fr; gap:36px; margin-bottom:48px; }
        @media (max-width:900px){ .doxa-landing .foot-grid{ grid-template-columns:1fr 1fr 1fr; } }
        @media (max-width:600px){ .doxa-landing .foot-grid{ grid-template-columns:1fr 1fr; } }
        .doxa-landing footer .logo{ color:#fff; }
        .doxa-landing footer p.tag{ font-size:13px; color:#8EA1CB; margin-top:12px; max-width:220px; }
        .doxa-landing footer h4{ font-family:'Geist'; color:#fff; font-size:14px; margin-bottom:14px; }
        .doxa-landing footer ul{ display:flex; flex-direction:column; gap:9px; font-size:13px; }
        .doxa-landing footer a:hover{ color:#fff; }
        .doxa-landing .foot-bottom{ border-top:1px solid rgba(255,255,255,0.08); padding-top:24px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:12.5px; color:#8EA1CB; }
      `}</style>
    </div>
  );
}
