import React, { useState } from "react";
import { useTallerState } from "@/modules/seminario/taller/useTallerState";
import { useIsSeminarioStaff } from "@/hooks/useSeminarioStudent";

import { TallerHeader } from "@/modules/seminario/taller/components/TallerHeader";
import { Actividad1Conectando } from "@/modules/seminario/taller/components/Actividad1Conectando";
import { Actividad2SieteEspiritus } from "@/modules/seminario/taller/components/Actividad2SieteEspiritus";
import { Actividad3Clasificacion } from "@/modules/seminario/taller/components/Actividad3Clasificacion";
import { Actividad4Falsificacion } from "@/modules/seminario/taller/components/Actividad4Falsificacion";
import { Actividad5Discernimiento } from "@/modules/seminario/taller/components/Actividad5Discernimiento";
import { Actividad6NueveDones } from "@/modules/seminario/taller/components/Actividad6NueveDones";
import { Actividad7LiderazgoServicio } from "@/modules/seminario/taller/components/Actividad7LiderazgoServicio";
import { Actividad8CasoIntegral } from "@/modules/seminario/taller/components/Actividad8CasoIntegral";
import { Actividad9DisenoIglesia } from "@/modules/seminario/taller/components/Actividad9DisenoIglesia";
import { Actividad10Aplicacion } from "@/modules/seminario/taller/components/Actividad10Aplicacion";
import { Desafio60Segundos } from "@/modules/seminario/taller/components/Desafio60Segundos";
import { ResultadoFinalView } from "@/modules/seminario/taller/components/ResultadoFinalView";
import { PanelProfesorView } from "@/modules/seminario/taller/components/PanelProfesorView";

export default function TallerNeumatologiaPage() {
  const {
    state,
    setRespuesta,
    setRespuestaAbierta,
    setDesafio60s,
    irAActividad,
    siguienteActividad,
    finalizarTaller,
    reiniciarTaller,
  } = useTallerState();

  const { data: isStaff } = useIsSeminarioStaff();
  const [modoProfesor, setModoProfesor] = useState(false);

  const renderContent = () => {
    if (modoProfesor) {
      return <PanelProfesorView />;
    }

    switch (state.actividadActual) {
      case 1:
        return (
          <Actividad1Conectando
            onCompletar={() => setRespuesta("act1_done", true)}
            onSiguiente={siguienteActividad}
            completadoPrevio={state.respuestas["act1_done"] === true}
          />
        );

      case 2:
        return (
          <Actividad2SieteEspiritus
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 3:
        return (
          <Actividad3Clasificacion
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 4:
        return (
          <Actividad4Falsificacion
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 5:
        return (
          <Actividad5Discernimiento
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 6:
        return (
          <Actividad6NueveDones
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 7:
        return (
          <Actividad7LiderazgoServicio
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(casoId, resp) => setRespuesta(casoId, resp)}
            onSiguiente={siguienteActividad}
          />
        );

      case 8:
        return (
          <Actividad8CasoIntegral
            respuestasPrevias={state.respuestas}
            onCompletarPaso={(pasoKey, opId) => setRespuesta(pasoKey, opId)}
            onSiguiente={siguienteActividad}
          />
        );

      case 9:
        return (
          <Actividad9DisenoIglesia
            completadoPrevio={state.respuestas["act9_done"] === true}
            onCompletar={() => setRespuesta("act9_done", true)}
            onSiguiente={siguienteActividad}
          />
        );

      case 10:
        return (
          <Actividad10Aplicacion
            respuestasPrevias={state.respuestasAbiertas}
            onGuardarRespuesta={(id, txt) => setRespuestaAbierta(id, txt)}
            onIrAlDesafio={() => irAActividad(11)}
          />
        );

      case 11:
        return (
          <Desafio60Segundos
            desafioPrevio={state.desafio60s}
            onCompletarDesafio={(d) => setDesafio60s(d)}
            onVerResultados={async () => {
              await finalizarTaller();
            }}
          />
        );

      case 12:
      default:
        return (
          <ResultadoFinalView
            resultado={state.resultado || {
              puntajeTotal: 85,
              nivel: "MUY BUEN DOMINIO",
              subareas: [],
              fortalezas: ["Discernimiento Espiritual", "Dones Espirituales"],
              debeReforzar: ["Consolidación Doctrinal"],
            }}
            estado={state.estado}
            onReiniciar={reiniciarTaller}
            onIrAActividad={(n) => irAActividad(n)}
          />
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen pb-16">
      <TallerHeader
        actividadActual={state.actividadActual}
        totalActividades={10}
        estado={state.estado}
        onIrAActividad={irAActividad}
        onReiniciar={reiniciarTaller}
        isStaff={!!isStaff}
        modoProfesor={modoProfesor}
        onToggleModoProfesor={() => setModoProfesor(!modoProfesor)}
      />

      <main className="mt-4">{renderContent()}</main>
    </div>
  );
}
