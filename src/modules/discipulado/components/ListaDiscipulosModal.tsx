import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export interface ListaDiscipulosModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  discipulos: any[];
}

export function ListaDiscipulosModal({ isOpen, onClose, title, discipulos }: ListaDiscipulosModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title} ({discipulos.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {discipulos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay discípulos en esta categoría.
            </p>
          ) : (
            <ul className="space-y-2">
              {discipulos.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.status || 'Sin estado'}
                      {d.start_date && ` • Inicio: ${format(new Date(d.start_date), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                  {d.telefono && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{d.telefono}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ListaDiscipulosModal;
