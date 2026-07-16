import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type DockContent = { title: string; node: ReactNode } | null;

interface Ctx {
  open: (title: string, node: ReactNode) => void;
  close: () => void;
}

const ContextDockCtx = createContext<Ctx>({ open: () => {}, close: () => {} });

export function ContextDockProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DockContent>(null);

  const open = useCallback((title: string, node: ReactNode) => setContent({ title, node }), []);
  const close = useCallback(() => setContent(null), []);

  return (
    <ContextDockCtx.Provider value={{ open, close }}>
      {children}
      <Sheet open={!!content} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{content?.title}</SheetTitle>
          </SheetHeader>
          <div className="p-6">{content?.node}</div>
        </SheetContent>
      </Sheet>
    </ContextDockCtx.Provider>
  );
}

export function useContextDock() {
  return useContext(ContextDockCtx);
}
