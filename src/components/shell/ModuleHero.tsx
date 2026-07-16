import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Wallet, BarChart3, Users, Settings2, ShieldCheck,
  Award, ScrollText, Coins, KeyRound, BookOpenCheck, LucideIcon
} from "lucide-react";

export type ModuleVariant =
  | "academia" | "finanzas" | "reportes" | "usuarios"
  | "configuracion" | "seguridad" | "certificados"
  | "auditoria" | "roles" | "tesoreria" | "seminario";

type Kpi = { label: string; value: ReactNode; hint?: string; tone?: "ok" | "warn" | "bad" | "info" };

interface Props {
  variant: ModuleVariant;
  title: string;
  eyebrow?: string;
  description?: string;
  kpis?: Kpi[];
  actions?: ReactNode;
  status?: { label: string; tone?: "ok" | "warn" | "bad" | "info" };
}

const VARIANTS: Record<ModuleVariant, {
  icon: LucideIcon;
  gradient: string;
  chip: string;
  ring: string;
  pattern: ReactNode;
  tag: string;
  inspiredBy: string;
}> = {
  academia: {
    icon: GraduationCap,
    gradient: "from-indigo-600 via-violet-600 to-fuchsia-500",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20",
    ring: "ring-indigo-500/30",
    tag: "LMS · Academia",
    inspiredBy: "Canvas LMS",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs><pattern id="g-ac" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12h24M12 0v24" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
        <rect width="400" height="200" fill="url(#g-ac)"/>
      </svg>
    )
  },
  finanzas: {
    icon: Wallet,
    gradient: "from-slate-900 via-slate-800 to-violet-700",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
    ring: "ring-violet-500/30",
    tag: "Finance Suite",
    inspiredBy: "Stripe · QuickBooks",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 400 200" preserveAspectRatio="none">
        <path d="M0 160 L60 130 L120 145 L180 90 L240 110 L300 60 L360 80 L400 40" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M0 180 L60 160 L120 170 L180 130 L240 145 L300 100 L360 120 L400 90" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="3 3"/>
      </svg>
    )
  },
  reportes: {
    icon: BarChart3,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    ring: "ring-amber-500/30",
    tag: "Business Intelligence",
    inspiredBy: "Power BI · Looker",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 200" preserveAspectRatio="none">
        {[20,50,80,110,140,170,200,230,260,290,320,350].map((x,i)=>(
          <rect key={i} x={x} y={200 - (30 + (i%4)*25)} width="14" height={30 + (i%4)*25} fill="currentColor"/>
        ))}
      </svg>
    )
  },
  usuarios: {
    icon: Users,
    gradient: "from-sky-500 via-cyan-500 to-emerald-500",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20",
    ring: "ring-sky-500/30",
    tag: "Identity & Access",
    inspiredBy: "Clerk · Auth0",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 400 200" preserveAspectRatio="none">
        {Array.from({length:24}).map((_,i)=>(
          <circle key={i} cx={20 + (i%12)*32} cy={40 + Math.floor(i/12)*80} r="8" fill="currentColor"/>
        ))}
      </svg>
    )
  },
  configuracion: {
    icon: Settings2,
    gradient: "from-zinc-900 via-zinc-800 to-zinc-700",
    chip: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/20",
    ring: "ring-zinc-500/30",
    tag: "Platform Settings",
    inspiredBy: "Vercel",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 400 200" preserveAspectRatio="none">
        <line x1="0" y1="40" x2="400" y2="40" stroke="currentColor" strokeWidth="0.5"/>
        <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeWidth="0.5"/>
        <line x1="0" y1="160" x2="400" y2="160" stroke="currentColor" strokeWidth="0.5"/>
      </svg>
    )
  },
  seguridad: {
    icon: ShieldCheck,
    gradient: "from-emerald-700 via-emerald-600 to-teal-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    ring: "ring-emerald-500/30",
    tag: "Security Console",
    inspiredBy: "Supabase Dashboard",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 400 200" preserveAspectRatio="none">
        <text x="10" y="30" fill="currentColor" fontFamily="monospace" fontSize="10">$ audit --tail</text>
        <text x="10" y="55" fill="currentColor" fontFamily="monospace" fontSize="10">✓ policy.applied</text>
        <text x="10" y="80" fill="currentColor" fontFamily="monospace" fontSize="10">✓ rls.enforced</text>
        <text x="10" y="105" fill="currentColor" fontFamily="monospace" fontSize="10">→ session.verify</text>
      </svg>
    )
  },
  certificados: {
    icon: Award,
    gradient: "from-amber-600 via-yellow-500 to-amber-400",
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-amber-500/20",
    ring: "ring-amber-500/30",
    tag: "Credentials",
    inspiredBy: "Diploma engine",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 200" preserveAspectRatio="none">
        <circle cx="350" cy="100" r="60" stroke="currentColor" strokeWidth="1" fill="none"/>
        <circle cx="350" cy="100" r="45" stroke="currentColor" strokeWidth="0.5" fill="none"/>
        <circle cx="350" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" fill="none"/>
      </svg>
    )
  },
  auditoria: {
    icon: ScrollText,
    gradient: "from-rose-600 via-red-500 to-orange-500",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20",
    ring: "ring-rose-500/30",
    tag: "Audit Trail",
    inspiredBy: "SIEM",
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 400 200" preserveAspectRatio="none">
        {Array.from({length:8}).map((_,i)=>(
          <g key={i}><circle cx={40 + i*45} cy="100" r="4" fill="currentColor"/><line x1={40 + i*45} y1="100" x2={40 + (i+1)*45} y2="100" stroke="currentColor" strokeWidth="0.5"/></g>
        ))}
      </svg>
    )
  },
  roles: {
    icon: KeyRound,
    gradient: "from-blue-700 via-blue-600 to-indigo-500",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
    ring: "ring-blue-500/30",
    tag: "RBAC",
    inspiredBy: "Auth0 · Clerk",
    pattern: <div />
  },
  tesoreria: {
    icon: Coins,
    gradient: "from-emerald-600 via-teal-600 to-amber-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    ring: "ring-emerald-500/30",
    tag: "Treasury Ops",
    inspiredBy: "Modern Treasury",
    pattern: <div />
  }
};

const toneClass = (t?: "ok" | "warn" | "bad" | "info") => {
  switch (t) {
    case "ok": return "text-emerald-600 dark:text-emerald-400";
    case "warn": return "text-amber-600 dark:text-amber-400";
    case "bad": return "text-rose-600 dark:text-rose-400";
    case "info": return "text-sky-600 dark:text-sky-400";
    default: return "text-foreground";
  }
};

export default function ModuleHero({
  variant, title, eyebrow, description, kpis = [], actions, status
}: Props) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-card mb-5 ring-1",
      v.ring
    )}>
      {/* Colored bar */}
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", v.gradient)} />
      {/* Pattern layer */}
      <div className={cn("absolute inset-0 text-foreground pointer-events-none")}>{v.pattern}</div>
      {/* Radial glow */}
      <div className={cn("absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br", v.gradient)} />

      <div className="relative p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg bg-gradient-to-br",
              v.gradient
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1", v.chip)}>
                  {v.tag}
                </span>
                {eyebrow && <span className="text-[11px] text-muted-foreground">{eyebrow}</span>}
                {status && (
                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", toneClass(status.tone))}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      status.tone === "ok" && "bg-emerald-500 animate-pulse",
                      status.tone === "warn" && "bg-amber-500",
                      status.tone === "bad" && "bg-rose-500 animate-pulse",
                      status.tone === "info" && "bg-sky-500",
                      !status.tone && "bg-foreground"
                    )}/>
                    {status.label}
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-1.5">{title}</h1>
              {description && <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">{description}</p>}
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">Inspirado en {v.inspiredBy}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>

        {kpis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {kpis.map((k, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl bg-background/60 backdrop-blur border p-3 subtle-hover",
                  "hover:bg-background/90 hover:border-border/80 hover:-translate-y-0.5",
                  "transition-transform"
                )}
                title={k.hint || undefined}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                <p className={cn("text-xl font-bold mt-1 tabular-nums", toneClass(k.tone))}>{k.value}</p>
                {k.hint && <p className="text-[10.5px] text-muted-foreground mt-0.5">{k.hint}</p>}
              </div>

            ))}
          </div>
        )}
      </div>
    </div>
  );
}
