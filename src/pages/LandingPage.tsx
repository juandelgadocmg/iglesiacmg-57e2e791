import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import doxaWordmarkNavy from "@/assets/doxa-wordmark-navy.png";
import doxaWordmarkWhite from "@/assets/doxa-wordmark-white.png";
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
 * Línea gráfica oficial (a partir de DOXA_APP_VISUAL): navy #003A6C + coral #FD8972,
 * wordmark "doxa" real (imagen), tagline "Gestión inteligente, liderazgo eficiente."
 * Estilos encapsulados bajo .doxa-landing para no interferir con el resto de la app.
 */
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
      link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // NOTA: maqueta de front-end. Conectar a un backend real (Supabase edge
    // function, tabla de leads, o webhook a correo/CRM) para recibir estas
    // solicitudes de demo.
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
              <img src={doxaWordmarkNavy} alt="DOXA" className="logo-img" />
            </a>
            <div className="navlinks">
              <a href="#top">Inicio</a>
              <a href="#nosotros">Nosotros</a>
              <a href="#servicios">Servicios</a>
              <a href="#planes">Planes</a>
            </div>
            <div className="navcta">
              <Link to="/login" className="btn btn-outline btn-sm">
                Login
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
          <div className="hero-x hero-x1" aria-hidden="true" />
          <div className="hero-x hero-x2" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1>
                Gestión <em>inteligente</em>,<br />
                liderazgo <em>eficiente</em>.
              </h1>
              <p className="lead">
                DOXA es la plataforma todo en uno para iglesias que avanzan: personas, grupos,
                formación, programación de ministerios y finanzas, en un solo lugar.
              </p>
              <div className="hero-actions">
                <a href="#demo" className="btn btn-cta">Agendar una demo</a>
                <a href="#servicios" className="btn btn-outline-light">Ver más</a>
              </div>
              <div className="hero-url">www.doxa.app.co</div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="laptop">
                <div className="laptop-notch" />
                <div className="laptop-screen">
                  <div className="browser-bar">
                    <img src={doxaWordmarkNavy} alt="" className="browser-logo" />
                    <div className="browser-links">
                      <span>Inicio</span><span>Nosotros</span><span>Servicios</span><span>Planes</span>
                    </div>
                    <div className="browser-login">Login</div>
                  </div>
                  <div className="browser-hero">
                    <svg className="target-mini" viewBox="0 0 120 120" width="72" height="72">
                      <circle cx="60" cy="60" r="52" fill="#FD8972" />
                      <circle cx="60" cy="60" r="38" fill="#fff" />
                      <circle cx="60" cy="60" r="26" fill="#B9C4CE" />
                      <circle cx="60" cy="60" r="13" fill="#fff" />
                      <path d="M20 20 L58 55 L48 65 Z" fill="#fff" stroke="#003A6C" strokeWidth="1.5" />
                    </svg>
                    <div>
                      <div className="browser-h1">Gestión inteligente,<br/>liderazgo eficiente.</div>
                      <div className="browser-btn">Ver más</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="laptop-base" />
            </div>
          </div>
        </section>

        {/* MARQUEE */}
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

        {/* NOSOTROS / CONCEPTO */}
        <section className="concept" id="nosotros">
          <div className="concept-split">
            <div className="concept-panel navy">
              <span className="word">Eficiencia</span>
              <span className="word">Organización</span>
              <span className="word">Liderazgo</span>
            </div>
            <div className="concept-panel coral">
              <span className="word">Innovación</span>
              <span className="word">Claridad</span>
              <span className="word">Resultados</span>
            </div>
            <div className="concept-target" aria-hidden="true">
              <svg viewBox="0 0 220 220" width="180" height="180">
                <circle cx="110" cy="110" r="100" fill="#FD8972" />
                <circle cx="110" cy="110" r="76" fill="#fff" />
                <circle cx="110" cy="110" r="52" fill="#B9C4CE" />
                <circle cx="110" cy="110" r="26" fill="#fff" />
                <path d="M28 28 L108 100 L84 124 Z" fill="#fff" stroke="#003A6C" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="wrap concept-copy">
            <span className="pill-tag"><span className="dot" />Por qué DOXA</span>
            <h2>Gestión con propósito, para equipos que quieren avanzar</h2>
            <p>Construimos DOXA sobre seis pilares: eficiencia, organización y liderazgo en la operación diaria; innovación, claridad y resultados en cómo se ve tu congregación de aquí en adelante.</p>
          </div>
        </section>

        {/* PRODUCT BLOCKS */}
        <section className="products" id="servicios">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Servicios</span>
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
                <div className="row"><span className="k">Personas activas</span><span className="v">—</span></div>
                <div className="row"><span className="k">Grupos en operación</span><span className="badge">Al día</span></div>
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
                <div className="row"><span className="k">Periodo</span><span className="v">Mensual</span></div>
                <div className="row"><span className="k">Reportes</span><span className="badge">Automáticos</span></div>
                <div className="row"><span className="k">Acceso</span><span className="v">Por rol</span></div>
              </div>
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
              <a href="#demo" className="btn btn-cta">Agendar demo →</a>
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
                    <button type="submit" className="btn btn-cta" style={{ width: "100%" }}>Solicitar demo →</button>
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
                <img src={doxaWordmarkWhite} alt="DOXA" className="logo-img" />
              </a>
              <p className="tag">Gestión inteligente, liderazgo eficiente.<br />www.doxa.app.co</p>
            </div>
            <div><h4>Comunidad</h4><ul><li><a href="#servicios">Personas</a></li><li><a href="#servicios">Grupos</a></li><li><a href="#servicios">Eventos</a></li></ul></div>
            <div><h4>Formación</h4><ul><li><a href="#servicios">Academia</a></li><li><a href="#servicios">Seminario</a></li><li><a href="#servicios">Certificados</a></li></ul></div>
            <div><h4>Operación</h4><ul><li><a href="#servicios">Programación</a></li><li><a href="#servicios">Finanzas</a></li><li><a href="#servicios">Reportes</a></li></ul></div>
            <div><h4>Contacto</h4><ul><li><a href="#demo">Agendar demo</a></li><li><a href="mailto:hola@doxa.app.co">hola@doxa.app.co</a></li><li><Link to="/login">Login</Link></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {year} DOXA. Todos los derechos reservados.</span>
            <span>www.doxa.app.co</span>
          </div>
        </div>
      </footer>

      <style>{`
        .doxa-landing{
          --navy:#003A6C; --navy-deep:#00294E;
          --coral:#FD8972; --coral-deep:#E8654A;
          --coral-soft:#FFE8E2; --navy-soft:#E5EEF5;
          --bg:#FFFFFF; --bg-tint:#F6F9FB;
          --ink:#0B2A44; --slate:#5B7185;
          --line:#E1E9EF;
          --r-lg:28px; --r-md:18px; --r-sm:12px;
          font-family:'Inter',sans-serif; color:var(--ink); background:var(--bg);
          line-height:1.55; -webkit-font-smoothing:antialiased;
        }
        .doxa-landing *{ box-sizing:border-box; }
        .doxa-landing h1,.doxa-landing h2,.doxa-landing h3{ font-family:'Poppins',sans-serif; font-weight:600; letter-spacing:-0.01em; color:var(--navy); margin:0; }
        .doxa-landing a{ color:inherit; text-decoration:none; }
        .doxa-landing ul{ list-style:none; margin:0; padding:0; }
        .doxa-landing section{ position:relative; }
        .doxa-landing .wrap{ max-width:1200px; margin:0 auto; padding:0 28px; }

        .doxa-landing .pill-tag{ display:inline-flex; align-items:center; gap:8px; background:var(--navy-soft); color:var(--navy); padding:7px 16px; border-radius:999px; font-size:13px; font-weight:600; font-family:'Poppins'; }
        .doxa-landing .pill-tag.pill-dark{ background:rgba(255,255,255,0.12); color:#FFD9CD; }
        .doxa-landing .dot{ width:6px; height:6px; border-radius:50%; background:var(--coral); display:inline-block; }

        .doxa-landing .logo-img{ height:26px; width:auto; display:block; }

        .doxa-landing .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:15px 28px; border-radius:999px; font-weight:600; font-family:'Poppins'; font-size:15px; cursor:pointer; border:1.5px solid transparent; transition:transform .15s ease, box-shadow .15s ease, background .15s ease; white-space:nowrap; }
        .doxa-landing .btn:focus-visible{ outline:3px solid var(--coral); outline-offset:2px; }
        .doxa-landing .btn-primary{ background:var(--navy); color:#fff; box-shadow:0 10px 24px -10px rgba(0,58,108,0.5); }
        .doxa-landing .btn-primary:hover{ transform:translateY(-2px); }
        .doxa-landing .btn-cta{ background:var(--coral); color:#fff; box-shadow:0 10px 24px -10px rgba(253,137,114,0.65); }
        .doxa-landing .btn-cta:hover{ transform:translateY(-2px); background:var(--coral-deep); }
        .doxa-landing .btn-outline{ background:#fff; color:var(--navy); border-color:var(--line); }
        .doxa-landing .btn-outline:hover{ border-color:var(--navy); }
        .doxa-landing .btn-outline-light{ background:rgba(255,255,255,0.12); color:#fff; border-color:rgba(255,255,255,0.5); }
        .doxa-landing .btn-outline-light:hover{ background:rgba(255,255,255,0.2); }
        .doxa-landing .btn-sm{ padding:10px 18px; font-size:13.5px; }

        .doxa-landing header{ position:sticky; top:0; z-index:60; background:rgba(255,255,255,0.92); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
        .doxa-landing nav{ display:flex; align-items:center; justify-content:space-between; padding:16px 0; gap:24px; }
        .doxa-landing .logo{ display:flex; align-items:center; }
        .doxa-landing .navlinks{ display:flex; gap:28px; font-size:14.5px; font-weight:600; font-family:'Poppins'; color:var(--navy); }
        .doxa-landing .navlinks a{ color:var(--slate); }
        .doxa-landing .navlinks a:hover{ color:var(--coral); }
        .doxa-landing .navcta{ display:flex; align-items:center; gap:12px; }
        @media (max-width:860px){ .doxa-landing .navlinks{ display:none; } }

        .doxa-landing .hero{ padding:80px 0 90px; background:linear-gradient(120deg, var(--navy) 0%, var(--navy) 40%, var(--coral) 115%); overflow:hidden; position:relative; }
        .doxa-landing .hero-x{ position:absolute; background:rgba(255,255,255,0.08); border-radius:18px; }
        .doxa-landing .hero-x1{ width:120px; height:420px; right:8%; top:-80px; transform:rotate(35deg); background:rgba(253,137,114,0.35); }
        .doxa-landing .hero-x2{ width:90px; height:340px; right:16%; top:-40px; transform:rotate(-35deg); background:rgba(255,255,255,0.1); }
        .doxa-landing .hero-grid{ position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; }
        @media (max-width:920px){ .doxa-landing .hero-grid{ grid-template-columns:1fr; } }
        .doxa-landing .hero-copy h1{ color:#fff; font-size:clamp(32px,4.4vw,50px); line-height:1.15; font-weight:700; }
        .doxa-landing .hero-copy h1 em{ font-style:normal; color:#FFD9CD; }
        .doxa-landing .hero-copy .lead{ color:rgba(255,255,255,0.85); font-size:17px; max-width:460px; margin:20px 0 30px; }
        .doxa-landing .hero-actions{ display:flex; gap:14px; flex-wrap:wrap; margin-bottom:22px; }
        .doxa-landing .hero-url{ color:rgba(255,255,255,0.7); font-family:'Poppins'; font-size:14px; font-weight:500; }

        .doxa-landing .hero-visual{ display:flex; flex-direction:column; align-items:center; }
        .doxa-landing .laptop{ width:100%; max-width:480px; background:#111; border-radius:16px 16px 0 0; padding:10px 10px 0; box-shadow:0 30px 60px -25px rgba(0,0,0,0.5); }
        .doxa-landing .laptop-notch{ width:60px; height:6px; background:#000; border-radius:0 0 6px 6px; margin:0 auto; }
        .doxa-landing .laptop-screen{ background:#fff; border-radius:8px; overflow:hidden; margin-top:4px; }
        .doxa-landing .laptop-base{ width:110%; max-width:530px; height:14px; background:linear-gradient(#2a2a2a,#111); border-radius:0 0 10px 10px; margin-left:auto; margin-right:auto; }
        .doxa-landing .browser-bar{ display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid var(--line); }
        .doxa-landing .browser-logo{ height:14px; width:auto; }
        .doxa-landing .browser-links{ display:flex; gap:12px; font-size:9px; font-family:'Poppins'; font-weight:600; color:var(--slate); }
        .doxa-landing .browser-login{ font-size:9px; font-family:'Poppins'; font-weight:600; background:var(--bg-tint); border:1px solid var(--line); border-radius:999px; padding:4px 10px; color:var(--navy); }
        .doxa-landing .browser-hero{ background:linear-gradient(120deg, var(--navy), var(--coral) 140%); padding:28px 18px; display:flex; align-items:center; gap:16px; }
        .doxa-landing .browser-h1{ color:#fff; font-family:'Poppins'; font-weight:700; font-size:14px; line-height:1.35; margin-bottom:10px; }
        .doxa-landing .browser-btn{ display:inline-block; background:var(--coral); color:#fff; font-size:10px; font-family:'Poppins'; font-weight:600; padding:6px 14px; border-radius:999px; }

        .doxa-landing .marquee-wrap{ padding:44px 0 20px; overflow:hidden; }
        .doxa-landing .marquee-label{ text-align:center; font-size:13px; color:var(--slate); font-weight:600; margin-bottom:22px; }
        .doxa-landing .marquee{ display:flex; gap:40px; width:max-content; animation:doxa-scroll 24s linear infinite; }
        @media (prefers-reduced-motion:reduce){ .doxa-landing .marquee{ animation:none; } }
        @keyframes doxa-scroll{ from{ transform:translateX(0); } to{ transform:translateX(-50%); } }
        .doxa-landing .marquee .chip{ display:flex; align-items:center; gap:9px; font-family:'Poppins'; font-weight:600; font-size:15px; color:var(--slate); white-space:nowrap; }
        .doxa-landing .marquee .chip svg{ color:var(--coral); }

        .doxa-landing .stats{ padding:60px 0; background:var(--bg-tint); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
        .doxa-landing .stats-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:24px; text-align:center; }
        @media (max-width:800px){ .doxa-landing .stats-grid{ grid-template-columns:1fr 1fr; } }
        .doxa-landing .stats .n{ font-family:'Poppins'; font-size:clamp(30px,3.6vw,42px); font-weight:700; color:var(--navy); }
        .doxa-landing .stats .l{ font-size:13.5px; color:var(--slate); margin-top:6px; }

        .doxa-landing .concept{ padding:0 0 20px; }
        .doxa-landing .concept-split{ position:relative; display:grid; grid-template-columns:1fr 1fr; min-height:280px; }
        @media (max-width:700px){ .doxa-landing .concept-split{ min-height:340px; } }
        .doxa-landing .concept-panel{ display:flex; flex-direction:column; justify-content:center; gap:36px; padding:40px 8%; }
        .doxa-landing .concept-panel.navy{ background:var(--navy); align-items:flex-start; }
        .doxa-landing .concept-panel.coral{ background:var(--coral); align-items:flex-end; }
        .doxa-landing .concept-panel .word{ color:#fff; font-family:'Poppins'; font-weight:600; font-size:20px; }
        .doxa-landing .concept-target{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); filter:drop-shadow(0 20px 30px rgba(0,0,0,0.25)); }
        @media (max-width:700px){ .doxa-landing .concept-target svg{ width:110px; height:110px; } }
        .doxa-landing .concept-copy{ text-align:center; max-width:640px; margin:52px auto 0; }
        .doxa-landing .concept-copy h2{ font-size:clamp(26px,3.2vw,34px); margin:16px 0 14px; }
        .doxa-landing .concept-copy p{ color:var(--slate); font-size:16px; }

        .doxa-landing .products{ padding:90px 0 60px; }
        .doxa-landing .sec-head{ max-width:640px; margin:0 auto 60px; text-align:center; }
        .doxa-landing .sec-head h2{ font-size:clamp(28px,3.4vw,38px); margin:16px 0 14px; }
        .doxa-landing .sec-head p{ color:var(--slate); font-size:16.5px; }

        .doxa-landing .prod-block{ display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; padding:56px 0; border-bottom:1px solid var(--line); }
        .doxa-landing .prod-block:last-child{ border-bottom:none; }
        .doxa-landing .prod-block.rev .prod-copy{ order:2; }
        @media (max-width:900px){ .doxa-landing .prod-block{ grid-template-columns:1fr; } .doxa-landing .prod-block.rev .prod-copy{ order:0; } }
        .doxa-landing .prod-copy .tag{ font-family:'Poppins'; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--coral-deep); font-weight:600; }
        .doxa-landing .prod-copy h3{ font-size:26px; margin:12px 0 14px; }
        .doxa-landing .prod-copy p{ color:var(--slate); font-size:15.5px; margin-bottom:20px; }
        .doxa-landing .prod-copy .chk{ display:flex; gap:10px; align-items:flex-start; font-size:14.5px; color:var(--ink); margin-bottom:10px; }
        .doxa-landing .prod-copy .chk .ic{ width:18px; height:18px; border-radius:50%; background:var(--coral-soft); color:var(--coral-deep); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; margin-top:1px; font-weight:700; }
        .doxa-landing .prod-visual{ background:var(--bg-tint); border:1px solid var(--line); border-radius:var(--r-lg); padding:26px; min-height:280px; display:flex; flex-direction:column; justify-content:center; gap:12px; }
        .doxa-landing .prod-visual .row{ background:#fff; border:1px solid var(--line); border-radius:var(--r-sm); padding:14px 16px; display:flex; justify-content:space-between; align-items:center; font-size:13.5px; }
        .doxa-landing .prod-visual .row .k{ color:var(--slate); }
        .doxa-landing .prod-visual .row .v{ font-weight:700; color:var(--navy); font-family:'Poppins'; }
        .doxa-landing .prod-visual .row .badge{ background:var(--coral-soft); color:var(--coral-deep); padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700; }

        .doxa-landing .quote-sec{ padding:100px 0; }
        .doxa-landing .quote-card{ max-width:820px; margin:0 auto; text-align:center; background:linear-gradient(120deg, var(--navy) 0%, var(--coral) 160%); border-radius:var(--r-lg); padding:64px 48px; color:#fff; position:relative; overflow:hidden; }
        .doxa-landing .quote-mark{ font-family:'Poppins'; font-size:64px; color:#FFD9CD; line-height:1; margin-bottom:8px; }
        .doxa-landing .quote-card p.q{ font-size:22px; font-weight:500; line-height:1.5; max-width:620px; margin:0 auto 24px; position:relative; z-index:1; }
        .doxa-landing .quote-card .who{ font-size:13.5px; color:rgba(255,255,255,0.75); position:relative; z-index:1; }

        .doxa-landing .plans{ padding:20px 0 100px; }
        .doxa-landing .plans-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        @media (max-width:900px){ .doxa-landing .plans-grid{ grid-template-columns:1fr; max-width:420px; margin:0 auto; } }
        .doxa-landing .plan{ border:1.5px solid var(--line); border-radius:var(--r-md); padding:32px 26px; background:#fff; display:flex; flex-direction:column; }
        .doxa-landing .plan.feat{ border-color:var(--coral); box-shadow:0 20px 40px -20px rgba(253,137,114,0.4); position:relative; }
        .doxa-landing .plan.feat .flag{ position:absolute; top:-13px; left:26px; background:var(--coral); color:#fff; font-size:11px; font-weight:700; padding:5px 12px; border-radius:999px; font-family:'Poppins'; }
        .doxa-landing .plan h4{ font-family:'Poppins'; font-size:20px; margin-bottom:6px; }
        .doxa-landing .plan .desc{ font-size:13.5px; color:var(--slate); margin-bottom:20px; }
        .doxa-landing .plan .price{ font-family:'Poppins'; font-size:15px; color:var(--navy); font-weight:600; margin-bottom:22px; }
        .doxa-landing .plan ul{ display:flex; flex-direction:column; gap:11px; margin-bottom:26px; flex:1; }
        .doxa-landing .plan li{ display:flex; gap:9px; align-items:flex-start; font-size:14px; color:var(--ink); }
        .doxa-landing .plan li .ic{ width:16px; height:16px; border-radius:50%; background:var(--navy-soft); color:var(--navy); display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; margin-top:2px; font-weight:700; }
        .doxa-landing .plan .btn{ width:100%; }

        .doxa-landing .faq{ padding:20px 0 110px; }
        .doxa-landing .faq-list{ max-width:780px; margin:0 auto; }
        .doxa-landing details{ border-bottom:1px solid var(--line); padding:20px 0; }
        .doxa-landing summary{ cursor:pointer; list-style:none; display:flex; justify-content:space-between; align-items:center; font-weight:600; font-family:'Poppins'; font-size:15.5px; color:var(--navy); }
        .doxa-landing summary::-webkit-details-marker{ display:none; }
        .doxa-landing summary .plus{ font-family:'Poppins'; font-size:20px; color:var(--coral); transition:transform .2s ease; flex-shrink:0; margin-left:16px; }
        .doxa-landing details[open] summary .plus{ transform:rotate(45deg); }
        .doxa-landing details p{ font-size:14.5px; color:var(--slate); margin-top:12px; max-width:640px; }

        .doxa-landing .cta-strip{ padding:0 0 110px; }
        .doxa-landing .cta-box{ max-width:1000px; margin:0 auto; background:var(--navy-soft); border-radius:var(--r-lg); padding:56px; display:flex; justify-content:space-between; align-items:center; gap:30px; flex-wrap:wrap; }
        .doxa-landing .cta-box h3{ font-size:24px; margin-bottom:8px; }
        .doxa-landing .cta-box p{ color:var(--slate); font-size:14.5px; margin:0; }

        .doxa-landing .demo{ padding:0 0 110px; }
        .doxa-landing .demo-panel{ background:#fff; border:1px solid var(--line); border-radius:var(--r-lg); display:grid; grid-template-columns:1fr 1fr; overflow:hidden; box-shadow:0 30px 70px -45px rgba(0,58,108,0.35); }
        @media (max-width:880px){ .doxa-landing .demo-panel{ grid-template-columns:1fr; } }
        .doxa-landing .demo-copy{ padding:50px; background:linear-gradient(140deg, var(--navy) 0%, var(--coral) 170%); color:#fff; }
        .doxa-landing .demo-copy h2{ color:#fff; font-size:28px; margin:14px 0 14px; }
        .doxa-landing .demo-copy p{ color:rgba(255,255,255,0.85); font-size:15px; margin-bottom:26px; }
        .doxa-landing .demo-copy .row{ display:flex; gap:10px; align-items:flex-start; font-size:13.5px; color:rgba(255,255,255,0.9); margin-bottom:12px; }
        .doxa-landing .demo-form{ padding:50px; }
        .doxa-landing .field{ margin-bottom:16px; }
        .doxa-landing .field label{ display:block; font-size:12.5px; font-weight:700; font-family:'Poppins'; color:var(--navy); margin-bottom:6px; }
        .doxa-landing .field input, .doxa-landing .field select, .doxa-landing .field textarea{ width:100%; padding:12px 14px; border:1.5px solid var(--line); border-radius:12px; font-family:'Inter'; font-size:14.5px; color:var(--ink); background:var(--bg-tint); }
        .doxa-landing .field input:focus, .doxa-landing .field select:focus, .doxa-landing .field textarea:focus{ outline:2px solid var(--coral); outline-offset:1px; border-color:var(--coral); }
        .doxa-landing .field-row{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media (max-width:520px){ .doxa-landing .field-row{ grid-template-columns:1fr; } }
        .doxa-landing .form-note{ font-size:12px; color:var(--slate); margin-top:12px; text-align:center; }
        .doxa-landing .success{ text-align:center; padding:40px 10px; }
        .doxa-landing .success .check{ width:54px; height:54px; border-radius:50%; background:var(--coral); margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff; }
        .doxa-landing .success h3{ font-size:19px; margin-bottom:8px; }
        .doxa-landing .success p{ color:var(--slate); font-size:14px; margin:0; }

        .doxa-landing footer{ background:var(--navy-deep); color:#B9CBDA; padding:64px 0 30px; }
        .doxa-landing .foot-grid{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1fr; gap:36px; margin-bottom:48px; }
        @media (max-width:900px){ .doxa-landing .foot-grid{ grid-template-columns:1fr 1fr 1fr; } }
        @media (max-width:600px){ .doxa-landing .foot-grid{ grid-template-columns:1fr 1fr; } }
        .doxa-landing footer p.tag{ font-size:13.5px; margin-top:14px; max-width:250px; color:#8FA6BC; }
        .doxa-landing footer h4{ font-family:'Poppins'; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:#6E8AA3; margin-bottom:14px; font-weight:600; }
        .doxa-landing footer ul{ display:flex; flex-direction:column; gap:9px; font-size:13.5px; }
        .doxa-landing footer ul a:hover{ color:#fff; }
        .doxa-landing .foot-bottom{ border-top:1px solid rgba(255,255,255,0.08); padding-top:24px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:12.5px; color:#6E8AA3; font-family:'Poppins'; }
      `}</style>
    </div>
  );
}
