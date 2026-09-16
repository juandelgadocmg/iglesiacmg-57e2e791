import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, PhoneCall, Home, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ListadoInteraccionesTableProps {
  visitas: any[];
  llamadas: any[];
  discipulosDict: Record<string, string>;
  lideresDict: Record<string, string>;
  casasDict: Record<string, string>;
  redesRaw: any[];
  casasRaw: any[];
  discipulosRaw: any[];
  lideresRaw: any[];
}

export function ListadoInteraccionesTable({
  visitas = [],
  llamadas = [],
  discipulosDict = {},
  lideresDict = {},
  casasDict = {},
  redesRaw = [],
  casasRaw = [],
  discipulosRaw = [],
  lideresRaw = []
}: ListadoInteraccionesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("Todos");
  const [redFilter, setRedFilter] = useState<string>("Todas");

  // Derive Red mapping
  const redByCasa = useMemo(() => {
    const map: Record<string, string> = {};
    casasRaw?.forEach(c => {
      if (c.red_id) {
        const r = redesRaw?.find(red => red.id === c.red_id);
        map[c.id] = r ? r.name : 'Sin Red';
      } else {
        map[c.id] = 'Sin Red';
      }
    });
    return map;
  }, [casasRaw, redesRaw]);

  const uniqueRedes = useMemo(() => {
    const redes = Array.from(new Set(Object.values(redByCasa)));
    return redes.sort();
  }, [redByCasa]);

  const allInteractions = useMemo(() => {
    const enrichInteraction = (i: any, type: string, icon: any, color: string) => {
      const disc = discipulosRaw?.find(d => d.id === i.discipulo_id);
      let cId = disc?.casa_de_paz_id;
      
      if (!cId) {
        const lid = lideresRaw?.find(l => l.id === (i.lider_id || disc?.lider_id));
        cId = lid?.casa_de_paz_id;
      }
      
      const redName = cId ? (redByCasa[cId] || 'Sin Red') : 'Sin Red';
      const casaName = cId ? (casasDict[cId] || 'Sin casa') : 'Sin casa';

      return {
        ...i,
        tipo: type,
        icon,
        color,
        redName,
        casaName
      };
    };
    
    const v = visitas.map(vi => enrichInteraction(vi, 'Visita', <Home className="w-4 h-4 text-emerald-600" />, 'bg-emerald-100 text-emerald-800'));
    const l = llamadas.map(ll => enrichInteraction(ll, 'Llamada', <PhoneCall className="w-4 h-4 text-blue-600" />, 'bg-blue-100 text-blue-800'));

    return [...v, ...l].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [visitas, llamadas, discipulosRaw, lideresRaw, redByCasa, casasDict]);

  const filteredInteractions = useMemo(() => {
    let result = allInteractions;

    if (tipoFilter !== 'Todos') {
      result = result.filter(r => r.tipo === tipoFilter);
    }

    if (redFilter !== 'Todas') {
      result = result.filter(r => r.redName === redFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => {
        const discipulo = discipulosDict[r.discipulo_id] || '';
        const lider = lideresDict[r.lider_id] || '';
        return discipulo.toLowerCase().includes(lower) || 
               lider.toLowerCase().includes(lower) ||
               (r.descripcion && r.descripcion.toLowerCase().includes(lower)) ||
               (r.notas && r.notas.toLowerCase().includes(lower));
      });
    }

    return result;
  }, [allInteractions, tipoFilter, redFilter, searchTerm, discipulosDict, lideresDict]);

  const exportToExcel = () => {
    const exportData = filteredInteractions.map(row => {
      return {
        'Tipo': row.tipo,
        'Fecha': row.fecha,
        'Hora': row.hora || 'No especificada',
        'Red': row.redName,
        'Casa de Paz': row.casaName,
        'Discípulo': discipulosDict[row.discipulo_id] || 'Desconocido',
        'Líder que registró': lideresDict[row.lider_id] || 'Desconocido',
        'Detalles / Notas': row.descripcion || row.notas || 'Sin detalles'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Interacciones");
    XLSX.writeFile(workbook, `Registro_Interacciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[75vh] w-full max-w-full">
      <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Registro de Visitas y Llamadas</h2>
          <p className="text-xs text-slate-500 font-medium">Total mostrados: {filteredInteractions.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Buscar por nombre o nota..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los tipos</SelectItem>
              <SelectItem value="Visita">Visitas</SelectItem>
              <SelectItem value="Llamada">Llamadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={redFilter} onValueChange={setRedFilter}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Red" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Redes</SelectItem>
              {uniqueRedes.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel}
            className="gap-2 text-green-700 border-green-200 hover:bg-green-50 bg-green-50/50"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full overflow-auto relative [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="text-xs text-slate-500 uppercase bg-white border-b sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 min-w-[120px]">Tipo</th>
              <th className="px-4 py-3 min-w-[150px]">Fecha</th>
              <th className="px-4 py-3 min-w-[180px]">Discípulo</th>
              <th className="px-4 py-3 min-w-[180px]">Líder</th>
              <th className="px-4 py-3 min-w-[150px]">Red / Casa</th>
              <th className="px-4 py-3 min-w-[300px]">Detalles</th>
            </tr>
          </thead>
            <tbody className="divide-y">
              {filteredInteractions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filteredInteractions.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`flex items-center gap-1.5 w-fit ${row.color}`}>
                        {row.icon}
                        {row.tipo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {row.fecha ? format(parseISO(row.fecha), "dd MMM yyyy", { locale: es }) : 'N/A'}
                        {row.hora && <span className="text-xs text-slate-400 ml-1">({row.hora})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {discipulosDict[row.discipulo_id] || 'Desconocido'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lideresDict[row.lider_id] || 'Desconocido'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-700">{row.redName}</span>
                        <span className="text-xs text-slate-500">{row.casaName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic">
                      {row.descripcion || row.notas || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
