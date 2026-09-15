import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';

export type KpiType = 'discipulos' | 'lideres' | 'visitas' | 'consolidados' | null;

interface KpiDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: KpiType;
  data: any[];
  lideresDict?: Record<string, string>; // Maps lider_id -> name
  casasDict?: Record<string, string>;   // Maps casa_de_paz_id -> name
}

export function KpiDetailsModal({
  isOpen,
  onClose,
  title,
  type,
  data,
  lideresDict = {},
  casasDict = {}
}: KpiDetailsModalProps) {
  
  if (!isOpen || !type) return null;

  const renderDiscipulosTable = (discipulos: any[]) => (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Líder Asignado</th>
            <th className="px-4 py-3">Casa de Paz</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {discipulos.map((d, i) => (
            <tr key={d.id || i} className="border-b">
              <td className="px-4 py-3 font-medium text-slate-900">{d.full_name}</td>
              <td className="px-4 py-3">{lideresDict[d.lider_id] || 'Sin asignar'}</td>
              <td className="px-4 py-3">{casasDict[d.casa_de_paz_id] || 'Sin casa'}</td>
              <td className="px-4 py-3">
                <Badge variant={d.status === 'Completado' ? 'default' : 'outline'}>
                  {d.status || 'Activo'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderLideresTable = (lideresList: any[]) => {
    // We expect the data passed here to already be grouped or at least we render the leaders and their assignments.
    // For simplicity, we just render the raw leader list passed.
    return (
      <div className="w-full overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3">Nombre del Líder</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {lideresList.map((l, i) => (
              <tr key={l.id || i} className="border-b">
                <td className="px-4 py-3 font-medium text-slate-900">{l.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{l.email || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderVisitasTable = (visitasList: any[]) => (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Discípulo</th>
            <th className="px-4 py-3">Líder</th>
            <th className="px-4 py-3">Notas</th>
          </tr>
        </thead>
        <tbody>
          {visitasList.map((v, i) => {
            // we try to resolve names if the objects are full or we have dictionaries.
            // If raw visitas, we might only have IDs.
            const discName = v.discipulo?.full_name || 'Desconocido';
            const lidName = v.lider?.full_name || lideresDict[v.lider_id] || 'Desconocido';
            return (
              <tr key={v.id || i} className="border-b">
                <td className="px-4 py-3 whitespace-nowrap">
                  {v.fecha ? format(parseISO(v.fecha), 'dd/MM/yyyy') : 'N/A'}
                </td>
                <td className="px-4 py-3 font-medium">{discName}</td>
                <td className="px-4 py-3">{lidName}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                  {v.notas_observaciones || '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <div className="text-sm text-slate-500">
            Total de registros: <span className="font-bold text-slate-800">{data.length}</span>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6 pt-0">
          {data.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No hay datos para mostrar.
            </div>
          ) : (
            <>
              {type === 'discipulos' && renderDiscipulosTable(data)}
              {type === 'consolidados' && renderDiscipulosTable(data)}
              {type === 'lideres' && renderLideresTable(data)}
              {type === 'visitas' && renderVisitasTable(data)}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
