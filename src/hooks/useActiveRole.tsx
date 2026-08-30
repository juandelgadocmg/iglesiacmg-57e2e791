import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";

type AppRole = string;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  super_admin: "Super Admin",
  pastor: "Pastor",
  lider: "Líder",
  secretaria: "Secretaria",
  tesoreria: "Tesorería",
  maestro: "Maestro",
  consolidador_lider: "Consolidador Líder",
  consolidador: "Consolidador",
  lider_intercesion: "Líder Intercesión",
  lider_red: "Líder de Red",
  lider_casa_paz: "Líder Casa de Paz",
  consulta: "Consulta",
};

// Priority order — highest role shown first
const ROLE_PRIORITY: AppRole[] = [
  "super_admin", "admin", "pastor", "lider", "secretaria", "tesoreria",
  "maestro", "consolidador_lider", "consolidador", "lider_intercesion",
  "lider_red", "lider_casa_paz", "consulta",
];

interface ActiveRoleContextValue {
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  allRoles: AppRole[];
  roleLabel: string;
}

const ActiveRoleContext = createContext<ActiveRoleContextValue>({
  activeRole: null,
  setActiveRole: () => {},
  allRoles: [],
  roleLabel: "",
});

export function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const { roles } = useUserRoles();
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  // On roles load, set the highest-priority role as default
  useEffect(() => {
    const safeRoles = roles || [];
    if (safeRoles.length === 0) return;
    const sorted = [...safeRoles].sort(
      (a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b)
    );
    // Restore from localStorage if still valid
    const saved = localStorage.getItem("cmg_active_role");
    if (saved && safeRoles.includes(saved as AppRole)) {
      setActiveRoleState(saved as AppRole);
    } else {
      setActiveRoleState(sorted[0]);
    }
  }, [(roles || []).join(",")]);

  const setActiveRole = (role: AppRole) => {
    setActiveRoleState(role);
    localStorage.setItem("cmg_active_role", role);
  };

  return (
    <ActiveRoleContext.Provider value={{
      activeRole,
      setActiveRole,
      allRoles: roles,
      roleLabel: activeRole ? (ROLE_LABELS[activeRole] || activeRole) : "",
    }}>
      {children}
    </ActiveRoleContext.Provider>
  );
}

export function useActiveRole() {
  return useContext(ActiveRoleContext);
}

export { ROLE_LABELS };
