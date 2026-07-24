// Lightweight ring buffer capturing recent console output for bug reports.
// Installed at app start; no-op in SSR.

type Entry = { t: string; level: "log" | "info" | "warn" | "error" | "debug"; msg: string };

const MAX = 200;
const buffer: Entry[] = [];

function fmt(args: any[]): string {
  try {
    return args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ""}`;
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
  } catch {
    return "[unserializable]";
  }
}

function push(level: Entry["level"], args: any[]) {
  const msg = fmt(args).slice(0, 2000);
  buffer.push({ t: new Date().toISOString(), level, msg });
  if (buffer.length > MAX) buffer.shift();
}

if (typeof window !== "undefined" && !(window as any).__consoleCaptureInstalled) {
  (window as any).__consoleCaptureInstalled = true;
  (["log", "info", "warn", "error", "debug"] as const).forEach((level) => {
    const orig = (console as any)[level].bind(console);
    (console as any)[level] = (...args: any[]) => {
      push(level, args);
      orig(...args);
    };
  });
  window.addEventListener("error", (e) => {
    push("error", [`window.error: ${e.message}`, e.filename, e.lineno, e.colno]);
  });
  window.addEventListener("unhandledrejection", (e: any) => {
    push("error", [`unhandledrejection: ${e?.reason?.message || e?.reason || "?"}`]);
  });
}

export function getConsoleLog(): Entry[] {
  return buffer.slice();
}

export function getConsoleLogText(): string {
  return buffer.map((e) => `[${e.t}] ${e.level.toUpperCase()} ${e.msg}`).join("\n");
}
