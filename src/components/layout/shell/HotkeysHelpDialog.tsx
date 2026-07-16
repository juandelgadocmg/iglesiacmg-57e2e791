import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Global",
    items: [
      ["⌘ K  /  Ctrl K", "Abrir buscador de comandos"],
      ["C", "Menú de creación rápida"],
      ["?", "Mostrar atajos"],
    ],
  },
  {
    title: "Ir a",
    items: [
      ["G  H", "Hoy"],
      ["G  P", "Personas"],
      ["G  G", "Grupos"],
      ["G  R", "Reuniones"],
      ["G  E", "Eventos"],
      ["G  A", "Academia"],
      ["G  S", "Seminario"],
      ["G  F", "Finanzas"],
      ["G  M", "Mensajes"],
      ["G  Q", "Peticiones"],
      ["G  T", "Reportes"],
      ["G  D", "Dashboard"],
    ],
  },
  {
    title: "Creación rápida",
    items: [
      ["N  P", "Nueva persona"],
      ["N  E", "Nuevo evento"],
      ["N  Q", "Nueva petición"],
      ["N  M", "Nuevo mensaje"],
    ],
  },
];

export default function HotkeysHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">{g.title}</p>
              <ul className="space-y-1.5">
                {g.items.map(([k, l]) => (
                  <li key={k} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-muted-foreground">{l}</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">{k}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground border-t pt-3">
          Consejo: los atajos "G X" y "N X" son secuencias — pulsa la primera tecla y luego la segunda dentro de 800ms. No funcionan mientras escribes en un campo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
