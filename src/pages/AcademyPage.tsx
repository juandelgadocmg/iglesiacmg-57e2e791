import { useEffect } from "react";
import { Link } from "react-router-dom";
import doxaWordmarkNavy from "@/assets/doxa-wordmark-navy.png";
import { useAcademyCMS } from "@/hooks/useAcademyCms";
import { Loader2 } from "lucide-react";

/**
 * Página pública de DOXA Academy — listado completo de los 6 diplomados
 * (facultades, objetivos, competencias, los 10 módulos de cada uno y su
 * proyecto final). Ruta: /academy (ver App.tsx).
 * Reutiliza la identidad visual navy/coral de LandingPage, encapsulada
 * bajo .doxa-academy para no interferir con el resto de la app.
 */
export default function AcademyPage() {
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
  const { data, isLoading } = useAcademyCMS();
  const facultades = data?.facultades || [];
  const diplomados = data?.diplomados || [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="doxa-academy">
      <header>
        <div className="wrap">
          <nav>
            <Link to="/" className="logo">
              <img src={doxaWordmarkNavy} alt="DOXA" className="logo-img" />
            </Link>
            <div className="navlinks">
              <Link to="/">Inicio</Link>
              <a href="#programa">Programa</a>
              <a href="#facultades">Facultades</a>
            </div>
            <div className="navcta">
              <a href="/#demo" className="btn btn-cta btn-sm">Agendar demo</a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="ac-hero">
          <div className="wrap">
            <span className="pill-tag"><span className="dot" />DOXA Academy</span>
            <h1>Formación profesional para transformar el liderazgo de tu iglesia</h1>
            <p className="lead">
              6 diplomados profesionales organizados en 4 facultades. Cada uno con 10 módulos, 40 horas,
              talleres prácticos, plantillas descargables, casos reales y un proyecto final implementado
              directamente en tu congregación.
            </p>
            <div className="ac-format">
              <span>10 módulos</span><span>·</span><span>40 horas</span><span>·</span><span>Presencial · Virtual · Híbrida</span><span>·</span><span>Certificación DOXA</span>
            </div>
            <p className="ac-note">DOXA Academy se apoya en la Visión de tu iglesia — no la reemplaza, la sistematiza.</p>
          </div>
        </section>

        {/* FACULTADES */}
        <section className="ac-faculties" id="facultades">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Facultades</span>
              <h2>4 facultades, 6 diplomados</h2>
            </div>
            <div className="faculty-grid">
              {facultades.map((f) => (
                <div className="faculty-card" key={f.nombre}>
                  <span className="faculty-tag">{f.nombre}</span>
                  <ul>
                    {f.diplomados.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROGRAMA COMPLETO */}
        <section className="ac-program" id="programa">
          <div className="wrap">
            <div className="sec-head">
              <span className="pill-tag"><span className="dot" />Programa completo</span>
              <h2>Los 6 diplomados, módulo por módulo</h2>
              <p>Despliega cada diplomado para ver su objetivo, a quién está dirigido, las competencias que desarrolla, sus 10 módulos y el proyecto final.</p>
            </div>

            <div className="diplomados-list">
              {diplomados.map((d) => (
                <details className="diplomado-card" key={d.numero}>
                  <summary>
                    <div className="dip-summary-left">
                      <span className="dip-num">Diplomado {d.numero}</span>
                      <h3>{d.titulo}</h3>
                      {d.subtitulo && <p className="dip-subtitle">{d.subtitulo}</p>}
                      <span className="dip-faculty">{d.facultad}</span>
                    </div>
                    <span className="plus">+</span>
                  </summary>

                  <div className="dip-body">
                    <div className="dip-badges">
                      <span>{d.duracion}</span>
                      <span>{d.modalidad}</span>
                      <span>{d.nivel}</span>
                    </div>

                    <p className="dip-objetivo"><strong>Objetivo general.</strong> {d.objetivo_general}</p>

                    {d.dirigido_a && (
                      <div className="dip-block">
                        <h4>Dirigido a</h4>
                        <div className="chip-row">
                          {d.dirigido_a.map((p) => <span className="chip" key={p}>{p}</span>)}
                        </div>
                      </div>
                    )}

                    {d.competencias && (
                      <div className="dip-block">
                        <h4>Al finalizar, el participante será capaz de</h4>
                        <ul className="comp-list">
                          {d.competencias.map((c) => <li key={c}>{c}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="dip-block">
                      <h4>Módulos</h4>
                      <div className="modules-list">
                        {d.modulos.map((m, i) => (
                          <div className="module-row" key={m.nombre}>
                            <span className="module-num">{i + 1}</span>
                            <div className="module-content">
                              <div className="module-name">{m.nombre}</div>
                              {m.objetivo && <p className="module-obj">{m.objetivo}</p>}
                              <p className="module-temas">{m.temas.join(" · ")}</p>
                              {m.taller && <p className="module-taller"><em>Taller:</em> {m.taller}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="dip-project">
                      <h4>Proyecto final del diplomado</h4>
                      <p className="dip-project-intro">Cada participante/iglesia desarrollará un entregable propio que incluye:</p>
                      <ul className="project-grid">
                        {d.proyecto_final.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ac-cta">
          <div className="wrap">
            <div className="ac-cta-box">
              <div>
                <h3>¿Quieres llevar DOXA Academy a tu iglesia?</h3>
                <p>Cuéntanos qué diplomado te interesa y coordinamos los detalles junto con la implementación de la plataforma.</p>
              </div>
              <a href="/#demo" className="btn btn-cta">Agendar una conversación →</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <Link to="/" className="logo"><img src={doxaWordmarkNavy} alt="DOXA" className="logo-img-dark" /></Link>
          <p>© {new Date().getFullYear()} DOXA. www.doxa.app.co</p>
        </div>
      </footer>

      <style>{`
        .doxa-academy{
          --navy:#003A6C; --navy-deep:#00294E;
          --coral:#FD8972; --coral-deep:#E8654A;
          --coral-soft:#FFE8E2; --navy-soft:#E5EEF5;
          --bg:#FFFFFF; --bg-tint:#F6F9FB;
          --ink:#0B2A44; --slate:#5B7185;
          --line:#E1E9EF;
          --r-lg:24px; --r-md:16px; --r-sm:10px;
          font-family:'Inter',sans-serif; color:var(--ink); background:var(--bg);
          line-height:1.55; -webkit-font-smoothing:antialiased;
        }
        .doxa-academy *{ box-sizing:border-box; }
        .doxa-academy h1,.doxa-academy h2,.doxa-academy h3,.doxa-academy h4{ font-family:'Poppins',sans-serif; font-weight:600; letter-spacing:-0.01em; color:var(--navy); margin:0; }
        .doxa-academy a{ color:inherit; text-decoration:none; }
        .doxa-academy ul{ list-style:none; margin:0; padding:0; }
        .doxa-academy .wrap{ max-width:960px; margin:0 auto; padding:0 28px; }

        .doxa-academy .pill-tag{ display:inline-flex; align-items:center; gap:8px; background:var(--navy-soft); color:var(--navy); padding:7px 16px; border-radius:999px; font-size:13px; font-weight:600; font-family:'Poppins'; }
        .doxa-academy .dot{ width:6px; height:6px; border-radius:50%; background:var(--coral); display:inline-block; }
        .doxa-academy .logo-img{ height:24px; width:auto; }
        .doxa-academy .logo-img-dark{ height:22px; width:auto; filter:brightness(0) invert(1); opacity:0.9; }

        .doxa-academy .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; border-radius:999px; font-weight:600; font-family:'Poppins'; font-size:14.5px; cursor:pointer; border:none; white-space:nowrap; transition:transform .15s ease; }
        .doxa-academy .btn-cta{ background:var(--coral); color:#fff; }
        .doxa-academy .btn-cta:hover{ transform:translateY(-2px); background:var(--coral-deep); }
        .doxa-academy .btn-sm{ padding:9px 16px; font-size:13px; }

        .doxa-academy header{ position:sticky; top:0; z-index:60; background:rgba(255,255,255,0.92); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
        .doxa-academy nav{ display:flex; align-items:center; justify-content:space-between; padding:14px 0; max-width:1100px; margin:0 auto; padding-left:28px; padding-right:28px; }
        .doxa-academy .navlinks{ display:flex; gap:26px; font-size:14px; font-weight:600; font-family:'Poppins'; color:var(--slate); }
        .doxa-academy .navlinks a:hover{ color:var(--coral); }
        @media (max-width:700px){ .doxa-academy .navlinks{ display:none; } }

        .doxa-academy .ac-hero{ padding:64px 0 44px; text-align:center; background:linear-gradient(180deg, var(--navy-soft), #fff 70%); }
        .doxa-academy .ac-hero h1{ font-size:clamp(28px,4vw,42px); line-height:1.15; margin:18px 0 16px; }
        .doxa-academy .ac-hero .lead{ color:var(--slate); font-size:16.5px; max-width:680px; margin:0 auto 24px; }
        .doxa-academy .ac-format{ display:flex; flex-wrap:wrap; justify-content:center; gap:10px; font-family:'Poppins'; font-size:13px; font-weight:600; color:var(--navy); margin-bottom:14px; }
        .doxa-academy .ac-format span:nth-child(even){ color:var(--slate); font-weight:400; }
        .doxa-academy .ac-note{ font-size:13.5px; color:var(--slate); font-style:italic; }

        .doxa-academy .sec-head{ text-align:center; max-width:640px; margin:0 auto 36px; }
        .doxa-academy .sec-head h2{ font-size:clamp(24px,3vw,30px); margin:14px 0 12px; }
        .doxa-academy .sec-head p{ color:var(--slate); font-size:15px; }

        .doxa-academy .ac-faculties{ padding:60px 0 20px; }
        .doxa-academy .faculty-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        @media (max-width:900px){ .doxa-academy .faculty-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:540px){ .doxa-academy .faculty-grid{ grid-template-columns:1fr; } }
        .doxa-academy .faculty-card{ background:var(--bg-tint); border:1px solid var(--line); border-radius:var(--r-md); padding:20px 18px; }
        .doxa-academy .faculty-tag{ display:block; font-family:'Poppins'; font-weight:700; font-size:13.5px; color:var(--navy); margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid var(--coral); }
        .doxa-academy .faculty-card ul{ display:flex; flex-direction:column; gap:7px; }
        .doxa-academy .faculty-card li{ font-size:12.5px; color:var(--slate); }

        .doxa-academy .ac-program{ padding:70px 0 40px; }
        .doxa-academy .diplomados-list{ display:flex; flex-direction:column; gap:14px; }
        .doxa-academy .diplomado-card{ border:1px solid var(--line); border-radius:var(--r-lg); overflow:hidden; background:#fff; }
        .doxa-academy .diplomado-card summary{ cursor:pointer; list-style:none; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:24px 26px; }
        .doxa-academy .diplomado-card summary::-webkit-details-marker{ display:none; }
        .doxa-academy .diplomado-card[open] summary{ border-bottom:1px solid var(--line); }
        .doxa-academy .dip-num{ font-family:'Poppins'; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--coral-deep); }
        .doxa-academy .dip-summary-left h3{ font-size:19px; margin:6px 0 4px; }
        .doxa-academy .dip-subtitle{ font-size:13px; color:var(--slate); font-style:italic; margin-bottom:6px; }
        .doxa-academy .dip-faculty{ font-size:12px; color:var(--navy); background:var(--navy-soft); padding:3px 10px; border-radius:999px; font-weight:600; font-family:'Poppins'; }
        .doxa-academy summary .plus{ font-family:'Poppins'; font-size:24px; color:var(--coral); flex-shrink:0; transition:transform .2s ease; line-height:1; }
        .doxa-academy details[open] summary .plus{ transform:rotate(45deg); }

        .doxa-academy .dip-body{ padding:26px; }
        .doxa-academy .dip-badges{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
        .doxa-academy .dip-badges span{ font-size:11.5px; font-weight:600; font-family:'Poppins'; background:var(--bg-tint); border:1px solid var(--line); color:var(--slate); padding:4px 10px; border-radius:999px; }
        .doxa-academy .dip-objetivo{ font-size:14.5px; color:var(--ink); margin-bottom:22px; line-height:1.6; }
        .doxa-academy .dip-objetivo strong{ color:var(--navy); }
        .doxa-academy .dip-block{ margin-bottom:24px; }
        .doxa-academy .dip-block h4{ font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--navy); margin-bottom:12px; }
        .doxa-academy .chip-row{ display:flex; flex-wrap:wrap; gap:8px; }
        .doxa-academy .chip{ font-size:12px; background:var(--coral-soft); color:var(--coral-deep); padding:5px 12px; border-radius:999px; font-weight:600; }
        .doxa-academy .comp-list{ display:grid; grid-template-columns:1fr 1fr; gap:8px 20px; }
        @media (max-width:600px){ .doxa-academy .comp-list{ grid-template-columns:1fr; } }
        .doxa-academy .comp-list li{ font-size:13.5px; color:var(--slate); padding-left:16px; position:relative; }
        .doxa-academy .comp-list li::before{ content:"✓"; position:absolute; left:0; color:var(--coral-deep); font-weight:700; font-size:11px; }

        .doxa-academy .modules-list{ display:flex; flex-direction:column; gap:2px; }
        .doxa-academy .module-row{ display:flex; gap:14px; padding:14px 0; border-top:1px dashed var(--line); }
        .doxa-academy .module-row:first-child{ border-top:none; }
        .doxa-academy .module-num{ flex-shrink:0; width:26px; height:26px; border-radius:50%; background:var(--navy); color:#fff; font-family:'Poppins'; font-size:11.5px; font-weight:700; display:flex; align-items:center; justify-content:center; }
        .doxa-academy .module-name{ font-family:'Poppins'; font-weight:600; font-size:14px; color:var(--ink); margin-bottom:4px; }
        .doxa-academy .module-obj{ font-size:12.5px; color:var(--slate); margin-bottom:6px; line-height:1.5; }
        .doxa-academy .module-temas{ font-size:12px; color:#7A8CA0; line-height:1.6; }
        .doxa-academy .module-taller{ font-size:12px; color:var(--coral-deep); margin-top:6px; }
        .doxa-academy .module-taller em{ font-style:normal; font-weight:700; }

        .doxa-academy .dip-project{ background:var(--bg-tint); border-radius:var(--r-md); padding:20px 22px; margin-top:8px; }
        .doxa-academy .dip-project h4{ font-size:13px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
        .doxa-academy .dip-project-intro{ font-size:12.5px; color:var(--slate); margin-bottom:12px; }
        .doxa-academy .project-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px 20px; }
        @media (max-width:600px){ .doxa-academy .project-grid{ grid-template-columns:1fr; } }
        .doxa-academy .project-grid li{ font-size:12.5px; color:var(--ink); padding-left:14px; position:relative; }
        .doxa-academy .project-grid li::before{ content:""; position:absolute; left:0; top:6px; width:5px; height:5px; border-radius:50%; background:var(--coral); }

        .doxa-academy .ac-cta{ padding:20px 0 90px; }
        .doxa-academy .ac-cta-box{ background:linear-gradient(120deg, var(--navy), var(--coral) 160%); border-radius:var(--r-lg); padding:44px 40px; display:flex; justify-content:space-between; align-items:center; gap:24px; flex-wrap:wrap; color:#fff; }
        .doxa-academy .ac-cta-box h3{ color:#fff; font-size:21px; margin-bottom:6px; }
        .doxa-academy .ac-cta-box p{ color:rgba(255,255,255,0.85); font-size:13.5px; max-width:420px; }

        .doxa-academy footer{ background:var(--navy-deep); padding:36px 0; text-align:center; }
        .doxa-academy footer .logo{ display:inline-flex; margin-bottom:10px; }
        .doxa-academy footer p{ color:#6E8AA3; font-size:12px; font-family:'Poppins'; }
      `}</style>
    </div>
  );
}
