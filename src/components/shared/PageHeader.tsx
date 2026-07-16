import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ModuleHero, { type ModuleVariant } from "@/components/shell/ModuleHero";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  eyebrow?: string;
  /** Fuerza la variante visual del hero (sobrescribe la detección por ruta). */
  variant?: ModuleVariant;
}

function variantFromPath(pathname: string): ModuleVariant {
  const seg = "/" + (pathname.split("/").filter(Boolean)[0] || "");
  const map: Record<string, ModuleVariant> = {
    "/hoy": "hoy",
    "/dashboard": "dashboard",
    "/personas": "personas",
    "/grupos": "grupos",
    "/servicios": "reuniones",
    "/eventos": "eventos",
    "/academia": "academia",
    "/seminario": "seminario",
    "/certificados": "certificados",
    "/finanzas": "finanzas",
    "/donaciones": "donaciones",
    "/mensajes": "mensajes",
    "/peticiones": "peticiones",
    "/reportes": "reportes",
    "/usuarios": "usuarios",
    "/configuracion": "configuracion",
    "/seguridad": "seguridad",
    "/asistencia": "asistencia",
    "/inscripciones": "inscripciones",
    "/banners": "banners",
    "/videos": "videos",
    "/mapa": "mapa",
    "/senal": "senal",
  };
  return map[seg] ?? "generic";
}

/**
 * PageHeader unificado. Delega en `ModuleHero` para mantener una identidad
 * visual consistente (gradiente, chip, patrón e ícono) en todos los módulos.
 * Los hijos se renderizan como acciones a la derecha del hero.
 */
export default function PageHeader({
  title,
  description,
  children,
  eyebrow,
  variant,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const resolved = variant ?? variantFromPath(pathname);

  return (
    <ModuleHero
      variant={resolved}
      title={title}
      description={description}
      eyebrow={eyebrow}
      actions={children}
    />
  );
}
