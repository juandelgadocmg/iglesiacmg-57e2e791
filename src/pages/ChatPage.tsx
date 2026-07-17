import React, { useState, useRef, useEffect, useMemo, useCallback, useDeferredValue, useTransition } from "react";
import {
  Send, User, Loader2, LifeBuoy, Plus, MessageSquare, Trash2, Search,
  PanelRightClose, PanelRightOpen, BookOpen, Compass, ListChecks, ShieldCheck,
  Users, UsersRound, Award, GraduationCap, DollarSign, BarChart3, ClipboardList,
  Filter, Settings as SettingsIcon, LayoutGrid, CalendarDays, HeartHandshake,
  Megaphone, FileText, HandHeart, MoreHorizontal, Pin, PinOff, Pencil,
  Download, FileDown, FileType2, FileText as FileTxt, Cloud, CloudOff, RefreshCw,
  Share2, Copy, Check, Upload, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, formatDistanceToNowStrict, format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import {
  Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel,
} from "docx";
import {
  fetchRemoteThreads, upsertRemoteThread, deleteRemoteThread,
  mergeThreads, addTombstone, loadTombstones, clearTombstone,
  type ChatThread, type ChatMessage,
} from "@/lib/doxaChatSync";
import { createShare } from "@/lib/doxaChatShare";
import { importThreadFromFile } from "@/lib/doxaChatImport";

type Message = ChatMessage;
type Thread = ChatThread;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_PREFIX = "doxa.chat.threads.v2::";
const ACTIVE_PREFIX = "doxa.chat.activeThread.v2::";
const DRAFT_PREFIX = "doxa.chat.draft.v1::";
const storageKeyFor = (uid: string) => `${STORAGE_PREFIX}${uid}`;
const activeKeyFor = (uid: string) => `${ACTIVE_PREFIX}${uid}`;
const draftKeyFor = (uid: string, threadId: string) => `${DRAFT_PREFIX}${uid}::${threadId}`;

const PROMPT_CARDS: { icon: any; title: string; prompt: string; color: string }[] = [
  { icon: Users, title: "Crear una persona", prompt: "¿Cómo crear una persona?", color: "text-primary bg-primary/10" },
  { icon: ClipboardList, title: "Registrar asistencia", prompt: "¿Cómo registrar una asistencia?", color: "text-blue-600 bg-blue-500/10" },
  { icon: UsersRound, title: "Crear un grupo", prompt: "¿Cómo crear un grupo o Casa de Paz?", color: "text-emerald-600 bg-emerald-500/10" },
  { icon: Award, title: "Generar un certificado", prompt: "¿Cómo generar un certificado?", color: "text-amber-600 bg-amber-500/10" },
  { icon: GraduationCap, title: "Crear un curso", prompt: "¿Cómo crear un curso en Academia?", color: "text-violet-600 bg-violet-500/10" },
  { icon: DollarSign, title: "Administrar Finanzas", prompt: "¿Cómo administrar las finanzas?", color: "text-teal-600 bg-teal-500/10" },
  { icon: BarChart3, title: "Exportar un reporte", prompt: "¿Cómo exportar un reporte?", color: "text-rose-600 bg-rose-500/10" },
  { icon: SettingsIcon, title: "Configurar usuarios", prompt: "¿Cómo configurar usuarios?", color: "text-slate-600 bg-slate-500/10" },
];

const QUICK_CHIPS = [
  "¿Cómo crear una persona?",
  "¿Cómo registrar una asistencia?",
  "¿Cómo crear un grupo?",
  "¿Cómo crear un curso?",
  "¿Cómo generar un certificado?",
  "¿Cómo exportar un reporte?",
  "¿Cómo configurar un usuario?",
  "¿Cómo usar el módulo de Finanzas?",
  "¿Cómo administrar la Academia?",
];

const CAPABILITIES = [
  { icon: Compass, title: "Guía por módulos", desc: "Aprende cómo funciona cada módulo: Personas, Grupos, Reuniones, Academia, Finanzas y más." },
  { icon: ListChecks, title: "Procedimientos paso a paso", desc: "Recibe instrucciones numeradas para completar cualquier tarea dentro de DOXA." },
  { icon: Filter, title: "Uso de filtros y formularios", desc: "Explica cómo usar filtros, buscadores y formularios de cada pantalla." },
  { icon: BookOpen, title: "Buenas prácticas", desc: "Recomendaciones para sacar el máximo provecho de la plataforma." },
];

const LIMITATIONS = [
  "No consulta datos almacenados en DOXA.",
  "No genera estadísticas ni reportes.",
  "No responde temas fuera del uso de la plataforma.",
];

const MODULES: { icon: any; name: string; example: string }[] = [
  { icon: Users, name: "Personas", example: "¿Cómo crear una persona nueva y vincularla a un grupo?" },
  { icon: UsersRound, name: "Grupos / Casas de Paz", example: "¿Cómo crear una Casa de Paz y asignar un líder?" },
  { icon: ClipboardList, name: "Asistencia", example: "¿Cómo registrar la asistencia de una reunión?" },
  { icon: CalendarDays, name: "Reuniones", example: "¿Cómo programar una reunión y a sus servidores?" },
  { icon: GraduationCap, name: "Academia", example: "¿Cómo crear un curso y matricular estudiantes?" },
  { icon: Award, name: "Certificados", example: "¿Cómo generar un certificado y descargarlo en PDF?" },
  { icon: DollarSign, name: "Finanzas", example: "¿Cómo registrar un ingreso o una donación?" },
  { icon: HandHeart, name: "Tesorería CDP", example: "¿Cómo consignar la ofrenda semanal de una Casa de Paz?" },
  { icon: HeartHandshake, name: "Consejería", example: "¿Cómo agendar una cita de consejería?" },
  { icon: Megaphone, name: "Peticiones de oración", example: "¿Cómo registrar y hacer seguimiento a una petición de oración?" },
  { icon: BarChart3, name: "Reportes / Exportar", example: "¿Cómo exportar un reporte a Excel o PDF?" },
  { icon: FileText, name: "Multimedia", example: "¿Cómo publicar un banner o un video en la plataforma?" },
  { icon: SettingsIcon, name: "Usuarios y roles", example: "¿Cómo crear un usuario y asignarle un rol?" },
  { icon: LayoutGrid, name: "Configuración", example: "¿Cómo configurar la información general de la iglesia?" },
];

type DateFilter = "all" | "today" | "7d" | "30d";
type SyncState = "offline" | "loading" | "synced" | "error";

// ---------- helpers ----------
function newThread(): Thread {
  return { id: crypto.randomUUID(), title: "Nueva conversación", updatedAt: Date.now(), messages: [], pinned: false };
}

function loadLocalThreads(uid: string): { threads: Thread[]; activeId: string } {
  if (typeof window === "undefined") {
    const t = newThread();
    return { threads: [t], activeId: t.id };
  }
  try {
    const raw = localStorage.getItem(storageKeyFor(uid));
    const active = localStorage.getItem(activeKeyFor(uid)) || "";
    if (raw) {
      const parsed: Thread[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeId = parsed.find((t) => t.id === active)?.id || parsed[0].id;
        return { threads: parsed, activeId };
      }
    }
  } catch { /* fall through */ }
  const t = newThread();
  return { threads: [t], activeId: t.id };
}

function saveLocalThreads(uid: string, threads: Thread[], activeId: string) {
  try {
    localStorage.setItem(storageKeyFor(uid), JSON.stringify(threads));
    localStorage.setItem(activeKeyFor(uid), activeId);
  } catch { /* ignore */ }
}

function loadDraft(uid: string, threadId: string): string {
  try { return localStorage.getItem(draftKeyFor(uid, threadId)) || ""; } catch { return ""; }
}
function saveDraft(uid: string, threadId: string, value: string) {
  try {
    const k = draftKeyFor(uid, threadId);
    if (value) localStorage.setItem(k, value);
    else localStorage.removeItem(k);
  } catch { /* ignore */ }
}

function deriveTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 44 ? t.slice(0, 44) + "…" : t || "Nueva conversación";
}

function fileSafe(name: string) {
  return name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "conversacion";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportThreadAsMarkdown(t: Thread) {
  const header = `# ${t.title}\n\n_Exportado ${format(new Date(), "PPpp", { locale: es })}_\n\n---\n\n`;
  const body = t.messages.map((m) => {
    const who = m.role === "user" ? "**🧑 Usuario**" : "**🤖 Asistente DOXA IA**";
    return `${who}:\n\n${m.content}\n`;
  }).join("\n---\n\n");
  downloadBlob(new Blob([header + body], { type: "text/markdown;charset=utf-8" }), `${fileSafe(t.title)}.md`);
}

function exportThreadAsTxt(t: Thread) {
  const header = `Asistente DOXA IA\n${t.title}\nExportado: ${format(new Date(), "PPpp", { locale: es })}\n${"=".repeat(60)}\n\n`;
  const body = t.messages.map((m) => {
    const who = m.role === "user" ? "USUARIO" : "ASISTENTE DOXA IA";
    return `[${who}]\n${m.content}\n`;
  }).join("\n" + "-".repeat(60) + "\n\n");
  downloadBlob(new Blob([header + body], { type: "text/plain;charset=utf-8" }), `${fileSafe(t.title)}.txt`);
}

function exportThreadAsPdf(t: Thread) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Asistente DOXA IA", margin, y); y += 22;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(t.title, margin, y); y += 16;
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Exportado: ${format(new Date(), "PPpp", { locale: es })}`, margin, y); y += 18;
  doc.setTextColor(0); doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y); y += 16;

  const writeBlock = (label: string, text: string, color: [number, number, number]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.setTextColor(...color);
    if (y > pageH - margin - 20) { doc.addPage(); y = margin; }
    doc.text(label, margin, y); y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30);
    const lines = doc.splitTextToSize(text || "(sin contenido)", maxW);
    for (const ln of lines) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(ln, margin, y); y += 13;
    }
    y += 8;
  };
  for (const m of t.messages) {
    if (m.role === "user") writeBlock("Usuario", m.content, [37, 99, 235]);
    else writeBlock("Asistente DOXA IA", m.content, [16, 122, 87]);
  }
  doc.save(`${fileSafe(t.title)}.pdf`);
}

async function exportThreadAsDocx(t: Thread) {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Asistente DOXA IA")] }),
    new Paragraph({ children: [new TextRun({ text: t.title, bold: true, size: 26 })] }),
    new Paragraph({ children: [new TextRun({ text: `Exportado: ${format(new Date(), "PPpp", { locale: es })}`, italics: true, color: "888888", size: 18 })] }),
    new Paragraph({ children: [new TextRun("")] }),
  ];
  for (const m of t.messages) {
    const who = m.role === "user" ? "Usuario" : "Asistente DOXA IA";
    const color = m.role === "user" ? "2563EB" : "107A57";
    children.push(new Paragraph({ children: [new TextRun({ text: who, bold: true, color, size: 22 })] }));
    for (const line of (m.content || "(sin contenido)").split(/\n/)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })] }));
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }
  const doc = new DocxDocument({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${fileSafe(t.title)}.docx`);
}

// --------- highlight helpers ---------
function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function highlightNodes(node: React.ReactNode, query: string): React.ReactNode {
  if (!query) return node;
  if (typeof node === "string") {
    const re = new RegExp(`(${escapeRegex(query)})`, "gi");
    const parts = node.split(re);
    if (parts.length <= 1) return node;
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-amber-200/80 text-foreground rounded px-0.5">{p}</mark>
        : <React.Fragment key={i}>{p}</React.Fragment>
    );
  }
  if (typeof node === "number") return node;
  if (Array.isArray(node)) {
    return node.map((c, i) => <React.Fragment key={i}>{highlightNodes(c, query)}</React.Fragment>);
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<any>;
    return React.cloneElement(el, {
      ...el.props,
      children: highlightNodes(el.props.children, query),
    });
  }
  return node;
}

function makeMarkdownComponents(query: string) {
  const wrap = (Tag: any) => ({ children, node, ...rest }: any) =>
    <Tag {...rest}>{highlightNodes(children, query)}</Tag>;
  return {
    p: wrap("p"), li: wrap("li"), strong: wrap("strong"), em: wrap("em"),
    a: wrap("a"), code: wrap("code"), blockquote: wrap("blockquote"),
    h1: wrap("h1"), h2: wrap("h2"), h3: wrap("h3"),
    h4: wrap("h4"), h5: wrap("h5"), h6: wrap("h6"),
    td: wrap("td"), th: wrap("th"),
  };
}

// --------- streaming ---------
async function streamChat({
  messages, onDelta, onDone,
}: { messages: Message[]; onDelta: (text: string) => void; onDone: () => void }) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Error ${resp.status}`);
  }
  if (!resp.body) throw new Error("No stream body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buffer = line + "\n" + buffer; break; }
    }
  }
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

// ============================================================
export default function ChatPage() {
  const [userId, setUserId] = useState<string>("__anon");
  const [{ threads, activeId }, setState] = useState<{ threads: Thread[]; activeId: string }>(
    () => loadLocalThreads("__anon")
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [contextOpen, setContextOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("offline");

  // Pagination + skeleton
  const [visibleCount, setVisibleCount] = useState(30);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Share dialog
  const [shareThread, setShareThread] = useState<Thread | null>(null);
  const [shareTtlHours, setShareTtlHours] = useState<number>(24);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareResult, setShareResult] = useState<{ url: string; expiresAt: Date } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Import
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deferred search (non-blocking)
  const deferredQuery = useDeferredValue(threadQuery);
  const [, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const draftLoadedRef = useRef<string>("");
  const lastSyncedRef = useRef<Map<string, number>>(new Map());
  const pushTimerRef = useRef<number | null>(null);
  const searchIndexRef = useRef<Map<string, { sig: number; blob: string }>>(new Map());

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const messages = active?.messages || [];

  // --- auth + carga inicial + sync remota ---
  useEffect(() => {
    let mounted = true;
    const bootstrap = async (uid: string) => {
      setUserId(uid);
      const local = loadLocalThreads(uid);
      setState(local);
      if (uid === "__anon") { setSyncState("offline"); return; }
      setSyncState("loading");
      try {
        const remote = await fetchRemoteThreads(uid);
        const tombs = loadTombstones(uid);
        const { merged, toPushRemote } = mergeThreads(local.threads, remote, tombs);
        // Aplica el merge
        if (mounted) {
          const activeId = merged.find((t) => t.id === local.activeId)?.id || merged[0]?.id || local.activeId;
          const finalThreads = merged.length > 0 ? merged : local.threads;
          setState({ threads: finalThreads, activeId });
          saveLocalThreads(uid, finalThreads, activeId);
          for (const r of remote) lastSyncedRef.current.set(r.id, r.updatedAt);
        }
        // Empuja locales más frescos
        await Promise.all(toPushRemote.map(async (t) => {
          try { await upsertRemoteThread(uid, t); lastSyncedRef.current.set(t.id, t.updatedAt); } catch { /* siguiente ciclo */ }
        }));
        // Elimina remotamente los tombstones y límpialos
        for (const id of tombs) {
          try { await deleteRemoteThread(uid, id); clearTombstone(uid, id); } catch { /* reintenta luego */ }
        }
        if (mounted) setSyncState("synced");
      } catch (e) {
        console.warn("[doxa-chat] sync error", e);
        if (mounted) setSyncState("error");
      } finally {
        if (mounted) setBootstrapping(false);
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id || "__anon";
      if (uid === "__anon") setBootstrapping(false);
      bootstrap(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      bootstrap(session?.user?.id || "__anon");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- persist local + push remote (debounced) ---
  useEffect(() => {
    saveLocalThreads(userId, threads, activeId);
    if (userId === "__anon") return;
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(async () => {
      const dirty = threads.filter((t) => (lastSyncedRef.current.get(t.id) ?? -1) < t.updatedAt);
      if (dirty.length === 0) return;
      setSyncState("loading");
      try {
        await Promise.all(dirty.map(async (t) => {
          await upsertRemoteThread(userId, t);
          lastSyncedRef.current.set(t.id, t.updatedAt);
        }));
        setSyncState("synced");
      } catch (e) {
        console.warn("[doxa-chat] push error", e);
        setSyncState("error");
      }
    }, 900);
  }, [threads, activeId, userId]);

  // --- draft por hilo/usuario ---
  useEffect(() => {
    if (!activeId) return;
    const key = `${userId}::${activeId}`;
    if (draftLoadedRef.current === key) return;
    draftLoadedRef.current = key;
    setInput(loadDraft(userId, activeId));
  }, [userId, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const h = setTimeout(() => saveDraft(userId, activeId, input), 300);
    return () => clearTimeout(h);
  }, [input, userId, activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  // --- state helpers ---
  const updateActive = (updater: (t: Thread) => Thread) => {
    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === prev.activeId ? updater(t) : t)),
    }));
  };

  const createThread = () => {
    const t = newThread();
    setState((prev) => ({ threads: [t, ...prev.threads], activeId: t.id }));
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const selectThread = (id: string) => setState((prev) => ({ ...prev, activeId: id }));

  const performDelete = useCallback(async (thread: Thread) => {
    saveDraft(userId, thread.id, "");
    setState((prev) => {
      const remaining = prev.threads.filter((t) => t.id !== thread.id);
      if (remaining.length === 0) {
        const t = newThread();
        return { threads: [t], activeId: t.id };
      }
      const nextActive = prev.activeId === thread.id ? remaining[0].id : prev.activeId;
      return { threads: remaining, activeId: nextActive };
    });
    if (userId !== "__anon") {
      try { await deleteRemoteThread(userId, thread.id); }
      catch { addTombstone(userId, thread.id); }
    }
    lastSyncedRef.current.delete(thread.id);
  }, [userId]);

  const restoreThread = useCallback((thread: Thread) => {
    setState((prev) => ({ threads: [thread, ...prev.threads], activeId: thread.id }));
    clearTombstone(userId, thread.id);
    if (userId !== "__anon") {
      upsertRemoteThread(userId, { ...thread, updatedAt: Date.now() })
        .then(() => lastSyncedRef.current.set(thread.id, Date.now()))
        .catch(() => setSyncState("error"));
    }
    toast.success("Conversación restaurada");
  }, [userId]);

  const confirmAndDelete = useCallback(async (thread: Thread) => {
    await performDelete(thread);
    toast.success("Conversación eliminada", {
      description: `${thread.title} · ${thread.messages.length} mensaje(s)`,
      duration: 8000,
      action: { label: "Deshacer", onClick: () => restoreThread(thread) },
    });
  }, [performDelete, restoreThread]);

  const togglePin = (id: string) => {
    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updatedAt: Date.now() } : t)),
    }));
  };

  const startRename = (t: Thread) => { setRenamingId(t.id); setRenameValue(t.title); };
  const commitRename = () => {
    if (!renamingId) return;
    const v = renameValue.trim();
    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === renamingId ? { ...t, title: v || t.title, updatedAt: Date.now() } : t)),
    }));
    setRenamingId(null);
    setRenameValue("");
    toast.success("Conversación renombrada");
  };

  const insertPrompt = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* ignore */ }
      }
    }, 20);
  };

  const sendWith = async (text: string) => {
    const clean = text.trim();
    if (!clean || isLoading) return;
    const userMsg: Message = { role: "user", content: clean };
    const isFirst = messages.length === 0;

    updateActive((t) => ({
      ...t,
      messages: [...t.messages, userMsg],
      title: isFirst ? deriveTitle(clean) : t.title,
      updatedAt: Date.now(),
    }));
    setInput("");
    saveDraft(userId, activeId, "");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      updateActive((t) => {
        const last = t.messages[t.messages.length - 1];
        const next = last?.role === "assistant"
          ? t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content: assistantSoFar } : m))
          : [...t.messages, { role: "assistant" as const, content: assistantSoFar }];
        return { ...t, messages: next, updatedAt: Date.now() };
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => { setIsLoading(false); setTimeout(() => inputRef.current?.focus(), 50); },
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al comunicarse con el asistente");
      setIsLoading(false);
    }
  };

  const send = () => sendWith(input);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Search index: memoized lowercased "title + messages" blob per thread, invalidated by updatedAt.
  const getBlob = useCallback((t: Thread): string => {
    const cached = searchIndexRef.current.get(t.id);
    if (cached && cached.sig === t.updatedAt) return cached.blob;
    const blob = (t.title + "\n" + t.messages.map((m) => m.content).join("\n")).toLowerCase();
    searchIndexRef.current.set(t.id, { sig: t.updatedAt, blob });
    return blob;
  }, []);

  const filteredThreads = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const now = Date.now();
    const windowMs =
      dateFilter === "today" ? 24 * 3600 * 1000 :
      dateFilter === "7d" ? 7 * 24 * 3600 * 1000 :
      dateFilter === "30d" ? 30 * 24 * 3600 * 1000 : 0;

    const inWindow = (t: Thread) => !windowMs || (now - t.updatedAt) <= windowMs;
    const matchesQuery = (t: Thread) => !q || getBlob(t).includes(q);

    return [...threads]
      .filter((t) => inWindow(t) && matchesQuery(t))
      .sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        return b.updatedAt - a.updatedAt;
      });
  }, [threads, deferredQuery, dateFilter, getBlob]);

  const isSearchPending = deferredQuery !== threadQuery;

  // Reset pagination when filter/query changes
  useEffect(() => { setVisibleCount(30); }, [deferredQuery, dateFilter]);

  // Infinite scroll sentinel in the sidebar
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisibleCount((v) => Math.min(v + 30, filteredThreads.length));
      }
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [filteredThreads.length]);

  const visibleThreads = filteredThreads.slice(0, visibleCount);
  const hasMoreThreads = filteredThreads.length > visibleThreads.length;

  const isEmpty = messages.length === 0;
  const q = threadQuery.trim();
  const markdownComponents = useMemo(() => makeMarkdownComponents(q), [q]);
  const matchCount = useMemo(() => {
    if (!q) return 0;
    const re = new RegExp(escapeRegex(q), "gi");
    return messages.reduce((n, m) => n + ((m.content.match(re) || []).length), 0);
  }, [q, messages]);
  const threadToDelete = threads.find((t) => t.id === confirmDeleteId) || null;

  const SyncIcon = syncState === "loading" ? RefreshCw : syncState === "synced" ? Cloud : CloudOff;
  const syncLabel =
    userId === "__anon" ? "Solo este navegador (sin sesión)" :
    syncState === "loading" ? "Sincronizando…" :
    syncState === "synced" ? "Sincronizado en tu cuenta" :
    syncState === "error" ? "Sin conexión con el servidor" : "Local";

  // --------- Share handlers ---------
  const openShare = (t: Thread) => {
    if (userId === "__anon") {
      toast.error("Inicia sesión para generar un enlace de solo lectura.");
      return;
    }
    if (t.messages.length === 0) {
      toast.error("La conversación está vacía; no hay nada que compartir.");
      return;
    }
    setShareThread(t);
    setShareTtlHours(24);
    setShareResult(null);
    setShareCopied(false);
  };
  const generateShare = async () => {
    if (!shareThread) return;
    setShareBusy(true);
    try {
      const { url, expiresAt } = await createShare(userId, shareThread, shareTtlHours);
      setShareResult({ url, expiresAt });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "No se pudo generar el enlace de compartir.");
    } finally {
      setShareBusy(false);
    }
  };
  const copyShareLink = async () => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.url);
      setShareCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  // --------- Import handler ---------
  const onImportFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImporting(true);
    const files = Array.from(fileList);
    let imported: Thread[] = [];
    const errors: string[] = [];
    for (const f of files) {
      try {
        const t = await importThreadFromFile(f);
        imported.push(t);
      } catch (e: any) {
        errors.push(`${f.name}: ${e.message || "error"}`);
      }
    }
    if (imported.length > 0) {
      setState((prev) => ({
        threads: [...imported, ...prev.threads],
        activeId: imported[0].id,
      }));
      if (userId !== "__anon") {
        // Empuja al remoto para fusionar entre dispositivos.
        for (const t of imported) {
          try { await upsertRemoteThread(userId, t); lastSyncedRef.current.set(t.id, t.updatedAt); }
          catch (e) { console.warn("[doxa-chat] import upsert error", e); }
        }
      }
      toast.success(
        `Se ${imported.length === 1 ? "importó 1 conversación" : `importaron ${imported.length} conversaciones`}`,
        { description: errors.length ? `${errors.length} archivo(s) fallaron.` : undefined }
      );
    }
    if (imported.length === 0 && errors.length > 0) {
      toast.error("No se pudo importar", { description: errors.join(" · ") });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Rail izquierdo */}
      <aside className="hidden md:flex w-64 shrink-0 border-r bg-card/40 flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-1.5">
            <Button onClick={createThread} className="flex-1 justify-start gap-2 h-9" size="sm">
              <Plus className="h-4 w-4" /> Nueva conversación
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              title="Importar desde .txt, .md o .docx"
              aria-label="Importar conversaciones"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              hidden
              onChange={(e) => onImportFiles(e.target.files)}
            />
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={threadQuery}
              onChange={(e) => {
                const v = e.target.value;
                startTransition(() => setThreadQuery(v));
              }}
              placeholder="Buscar en títulos y mensajes…"
              className="pl-8 h-8 text-[13px]"
            />
            {isSearchPending && (
              <Loader2 className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="h-8 text-[12.5px]">
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fechas</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
          {q && (
            <p className="text-[10.5px] text-muted-foreground">
              {filteredThreads.length} conversación(es) coinciden con “{q}”
              {matchCount > 0 && <> · {matchCount} coincidencia(s) en el hilo activo</>}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {bootstrapping && threads.length <= 1 && (
            <div className="px-2 py-2 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-2.5 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!bootstrapping && filteredThreads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Sin conversaciones</p>
          )}
          {visibleThreads.map((t) => {
            const isActive = t.id === activeId;
            const isRenaming = renamingId === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                )}
                onClick={() => !isRenaming && selectThread(t.id)}
              >
                {t.pinned
                  ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  : <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <Input
                      autoFocus value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-[12.5px] px-1"
                    />
                  ) : (
                    <>
                      <p className="text-[13px] font-medium truncate">
                        {highlightNodes(t.title, q)}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground truncate">
                        {t.messages.length > 0
                          ? formatDistanceToNow(t.updatedAt, { addSuffix: true, locale: es })
                          : "Vacía"}
                      </p>
                    </>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                      aria-label="Opciones de conversación"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => startRename(t)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePin(t.id)}>
                      {t.pinned
                        ? <><PinOff className="h-3.5 w-3.5 mr-2" /> Desfijar</>
                        : <><Pin className="h-3.5 w-3.5 mr-2" /> Fijar arriba</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openShare(t)}
                      disabled={userId === "__anon" || t.messages.length === 0}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-2" /> Compartir enlace…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportThreadAsPdf(t)}>
                      <FileType2 className="h-3.5 w-3.5 mr-2" /> Exportar a PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportThreadAsDocx(t)}>
                      <FileText className="h-3.5 w-3.5 mr-2" /> Exportar a Word (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportThreadAsMarkdown(t)}>
                      <FileDown className="h-3.5 w-3.5 mr-2" /> Exportar como .md
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportThreadAsTxt(t)}>
                      <FileTxt className="h-3.5 w-3.5 mr-2" /> Exportar como .txt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDeleteId(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t text-[10.5px] text-muted-foreground flex items-center gap-1.5">
          <SyncIcon className={cn("h-3 w-3", syncState === "loading" && "animate-spin", syncState === "synced" && "text-emerald-600", syncState === "error" && "text-amber-600")} />
          <span className="truncate">{syncLabel}</span>
        </div>
      </aside>

      {/* Centro */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 border-b flex items-center gap-3 px-4 bg-background/95 backdrop-blur">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0">
            <LifeBuoy className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{active?.title || "Asistente DOXA IA"}</p>
            <p className="text-[10.5px] text-muted-foreground">Aprende a utilizar la plataforma DOXA</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="sm" className="h-8 gap-1.5"
                disabled={!active || active.messages.length === 0}
                aria-label="Exportar conversación"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[12px]">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px]">Descargar conversación</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => active && exportThreadAsPdf(active)}>
                <FileType2 className="h-3.5 w-3.5 mr-2" /> PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => active && exportThreadAsDocx(active)}>
                <FileText className="h-3.5 w-3.5 mr-2" /> Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => active && exportThreadAsMarkdown(active)}>
                <FileDown className="h-3.5 w-3.5 mr-2" /> Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => active && exportThreadAsTxt(active)}>
                <FileTxt className="h-3.5 w-3.5 mr-2" /> Texto (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setContextOpen((v) => !v)}
            aria-label="Panel de ayuda"
          >
            {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 py-6 animate-fade-in">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
                    <LifeBuoy className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-semibold">👋 Hola, soy Asistente DOXA IA</h1>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Estoy aquí para ayudarte a <span className="font-medium text-foreground">aprender a utilizar la plataforma DOXA</span>.
                    Pregúntame cómo hacer cualquier tarea y te guiaré paso a paso.
                  </p>
                </div>

                <div className="w-full max-w-2xl rounded-xl border bg-card/60 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                    Puedes preguntarme, por ejemplo
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <li>• ¿Cómo crear una persona?</li>
                    <li>• ¿Cómo registrar una asistencia?</li>
                    <li>• ¿Cómo crear un grupo?</li>
                    <li>• ¿Cómo generar un certificado?</li>
                    <li>• ¿Cómo crear un curso?</li>
                    <li>• ¿Cómo administrar las finanzas?</li>
                    <li>• ¿Cómo exportar un reporte?</li>
                    <li>• ¿Cómo configurar usuarios?</li>
                    <li>• ¿Cómo usar los filtros?</li>
                    <li>• ¿Qué hace este módulo?</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl">
                  {PROMPT_CARDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.title}
                        onClick={() => sendWith(c.prompt)}
                        className="text-left rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all group"
                      >
                        <div className={cn("inline-flex p-2 rounded-lg mb-2", c.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-[13px] font-semibold mb-0.5">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{c.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3 animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-sm">
                        <LifeBuoy className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                          : "bg-card border border-border/70 text-foreground rounded-tl-sm shadow-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>*:last-child]:mb-0 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-accent">
                          <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{highlightNodes(msg.content, q)}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
                        <User className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                      <LifeBuoy className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border/70 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background/95 backdrop-blur px-4 md:px-6 py-3">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative rounded-xl border bg-card p-2 flex items-end gap-2 focus-within:shadow-md focus-within:border-primary/40 transition-all">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame cómo usar DOXA… (Enter para enviar, Shift+Enter para salto de línea)"
                className="min-h-[44px] max-h-[160px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent px-3 py-2"
                rows={1}
                disabled={isLoading}
              />
              <Button onClick={send} disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-9 w-9 rounded-lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((qc) => (
                <button
                  key={qc}
                  onClick={() => sendWith(qc)}
                  disabled={isLoading}
                  className="text-[11.5px] px-2.5 py-1 rounded-full border bg-card hover:bg-muted/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {qc}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              {input.trim() ? "Borrador guardado automáticamente · " : ""}
              Asistente DOXA IA · Solo enseña a usar la plataforma. No consulta datos internos.
            </p>
          </div>
        </div>
      </section>

      {/* Panel derecho */}
      {contextOpen && (
        <aside className="hidden xl:flex w-72 shrink-0 border-l bg-card/40 flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b">
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Acerca del asistente</p>
            <h3 className="text-sm font-semibold mt-0.5">¿En qué puedo ayudarte?</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Módulos DOXA</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                Toca un módulo para insertar una pregunta de ejemplo en el chat.
              </p>
              <div className="grid grid-cols-1 gap-1">
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => insertPrompt(m.example)}
                      title={m.example}
                      className="w-full flex items-center gap-2 rounded-md border bg-card hover:border-primary/40 hover:bg-primary/5 px-2.5 py-1.5 text-left transition-colors group"
                    >
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium truncate">{m.name}</p>
                        <p className="text-[10.5px] text-muted-foreground truncate">{m.example}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Capacidades</p>
              {CAPABILITIES.map((c) => (
                <div key={c.title} className="rounded-lg border bg-card p-3 mb-2 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                      <c.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-[13px] font-semibold">{c.title}</p>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-gradient-to-br from-amber-500/5 to-card p-3 mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Limitaciones</p>
              </div>
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                {LIMITATIONS.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-3 border-t text-[10.5px] text-muted-foreground">
            Hilo activo: <span className="font-mono">{active?.id.slice(0, 8)}</span> · {messages.length} mensajes
          </div>
        </aside>
      )}

      {/* Confirmar eliminación con resumen + deshacer en toast */}
      <AlertDialog open={!!threadToDelete} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conversación?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="font-medium text-foreground truncate">{threadToDelete?.title}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {threadToDelete?.messages.length ?? 0} mensaje(s)
                    {threadToDelete?.updatedAt
                      ? <> · actualizada {formatDistanceToNow(threadToDelete.updatedAt, { addSuffix: true, locale: es })}</>
                      : null}
                  </p>
                  {threadToDelete?.messages[0] && (
                    <p className="text-[12px] text-muted-foreground mt-2 line-clamp-2">
                      “{threadToDelete.messages[0].content.slice(0, 160)}
                      {threadToDelete.messages[0].content.length > 160 ? "…" : ""}”
                    </p>
                  )}
                </div>
                <p>Podrás <span className="font-medium">deshacer</span> esta acción desde la notificación durante unos segundos.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (threadToDelete) {
                  const t = threadToDelete;
                  setConfirmDeleteId(null);
                  confirmAndDelete(t);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
