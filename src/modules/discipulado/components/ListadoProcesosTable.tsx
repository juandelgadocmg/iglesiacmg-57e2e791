import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, Circle, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

interface ListadoProcesosTableProps {
  discipulos: any[];
  progreso: any[];
  lideresDict: Record<string, string>;
  casasDict: Record<string, string>;
  casasRaw: any[]; // to find red_id
  redesRaw: any[]; // to find red name
  lideresRaw: any[];
  initialFilter?: string;
}

const ETAPAS = [
  { code: 'NPT', label: 'Nací para triunfar' },
  { code: 'TSDP', label: 'Tres semanas de poder' },
  { code: 'NVNC', label: 'Nueva vida' },
  { code: 'RSI', label: 'Retiro Sanidad' },
  { code: 'DNC', label: 'Discipulado' },
  { code: 'ES', label: 'Escuela' },
  { code: 'LCP', label: 'Líderes' },
  { code: 'RLCP', label: 'Retiro Líderes' }
];

export function ListadoProcesosTable({
  discipulos,
  progreso,
  lideresDict,
  casasDict,
  casasRaw,
  redesRaw,
  lideresRaw,
  initialFilter = 'Todos'
}: ListadoProcesosTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>(initialFilter);
  const [redFilter, setRedFilter] = useState<string>("Todas");
  const [casaFilter, setCasaFilter] = useState<string>("Todas");
  const [etapaFilter, setEtapaFilter] = useState<string>("Todas");

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

  // Unique Red names for the filter dropdown
  const uniqueRedes = useMemo(() => {
    const redes = Array.from(new Set(Object.values(redByCasa)));
    return redes.filter(r => r !== 'Sin Red').sort();
  }, [redByCasa]);

  const uniqueCasas = useMemo(() => {
    let casas = casasRaw || [];
    if (redFilter !== 'Todas') {
      casas = casas.filter(c => redByCasa[c.id] === redFilter);
    }
    const names = Array.from(new Set(casas.map(c => c.name)));
    return names.filter(n => n && n !== 'Sin nombre').sort();
  }, [casasRaw, redFilter, redByCasa]);

  // Combine Discipulos with their Progress
  const rows = useMemo(() => {
    return discipulos.map(d => {
      // Find progress
      const dProgreso = progreso.filter(p => p.discipulo_id === d.id);
      const pMap: Record<string, boolean> = {};
      dProgreso.forEach(p => {
        if (p.completed) pMap[p.etapa_code] = true;
      });

      // Find Casa & Red
      let casaName = d.casa_de_paz_id ? casasDict[d.casa_de_paz_id] : null;
      let redName = d.casa_de_paz_id ? redByCasa[d.casa_de_paz_id] : null;

      // Fallback a la casa del líder si el discípulo no la tiene
      if (!casaName && d.lider_id) {
        const liderInfo = lideresRaw?.find(l => l.id === d.lider_id);
        if (liderInfo && liderInfo.casa_de_paz_id && casasDict[liderInfo.casa_de_paz_id]) {
          casaName = casasDict[liderInfo.casa_de_paz_id];
          redName = redByCasa[liderInfo.casa_de_paz_id];
        } else {
          const casaLider = casasRaw?.find(c => c.lider_id === d.lider_id);
          if (casaLider) {
            casaName = casaLider.name;
            redName = redByCasa[casaLider.id];
          }
        }
      }
      
      casaName = casaName || 'Sin casa';
      redName = redName || 'Sin Red';
      
      return {
        ...d,
        liderName: lideresDict[d.lider_id] || 'Sin asignar',
        casaName,
        redName,
        progressMap: pMap
      };
    });
  }, [discipulos, progreso, lideresDict, casasDict, redByCasa, lideresRaw, casasRaw]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (filter === 'NPT') {
      result = result.filter(r => r.progressMap['NPT'] === true);
    } else if (filter === 'TSDP') {
      result = result.filter(r => r.progressMap['TSDP'] === true);
    } else if (filter === 'RSI') {
      result = result.filter(r => r.progressMap['RSI'] === true);
    } else if (filter === 'Consolidados') {
      result = result.filter(r => r.status === 'Completado');
    }

    // Apply Red Filter
    if (redFilter !== 'Todas') {
      result = result.filter(r => r.redName === redFilter);
    }

    if (casaFilter !== 'Todas') {
      result = result.filter(r => r.casaName === casaFilter);
    }

    // Apply Etapa Filter
    if (etapaFilter !== 'Todas') {
      result = result.filter(r => r.progressMap[etapaFilter] === true);
    }

    // Apply Text Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.full_name?.toLowerCase().includes(lower) || 
        r.liderName.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [rows, filter, redFilter, casaFilter, etapaFilter, searchTerm]);

  const exportToExcel = () => {
    const exportData = filteredRows.map(row => {
      const data: any = {
        'Red': row.redName,
        'Casa de Paz': row.casaName,
        'Discípulo': row.full_name,
        'Líder': row.liderName,
        'Estado': row.status || 'Activo',
      };
      
      ETAPAS.forEach(etapa => {
        data[etapa.code] = row.progressMap[etapa.code] ? 'Completado' : 'Pendiente';
      });
      
      return data;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procesos");
    XLSX.writeFile(workbook, `Listado_Procesos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[75vh] w-full max-w-full">
      <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Listado General de Procesos</h2>
          <p className="text-xs text-slate-500 font-medium">Total mostrados: {filteredRows.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Buscar por discípulo o líder..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="NPT">NPT</SelectItem>
              <SelectItem value="TSDP">Tres Semanas</SelectItem>
              <SelectItem value="RSI">Retiro</SelectItem>
              <SelectItem value="Consolidados">Consolidados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={redFilter} onValueChange={(val) => { setRedFilter(val); setCasaFilter('Todas'); }}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Red" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Redes</SelectItem>
              <SelectItem value="Sin Red">Sin Red</SelectItem>
              {uniqueRedes.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={casaFilter} onValueChange={setCasaFilter}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Casa de Paz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Casas</SelectItem>
              <SelectItem value="Sin casa">Sin casa</SelectItem>
              {uniqueCasas.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={etapaFilter} onValueChange={setEtapaFilter}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Etapas</SelectItem>
              {ETAPAS.map(e => (
                <SelectItem key={e.code} value={e.code}>{e.label} ({e.code})</SelectItem>
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
        <table className="w-full text-sm text-left min-w-[1000px]">
          <thead className="text-xs text-slate-500 uppercase bg-white border-b sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Discípulo</th>
              <th className="px-4 py-3 min-w-[150px]">Líder</th>
              <th className="px-4 py-3 min-w-[150px]">Red / Casa</th>
              <th className="px-4 py-3 min-w-[100px]">Estado</th>
              {ETAPAS.map(etapa => (
                <th key={etapa.code} className="px-2 py-3 text-center whitespace-nowrap" title={etapa.label}>
                  {etapa.code}
                </th>
              ))}
            </tr>
          </thead>
            <tbody className="divide-y">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4 + ETAPAS.length} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron discípulos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.liderName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-700">{row.redName}</span>
                        <span className="text-xs text-slate-500">{row.casaName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === 'Completado' ? 'default' : 'outline'} className={row.status === 'Completado' ? 'bg-red-600' : ''}>
                        {row.status || 'Activo'}
                      </Badge>
                    </td>
                    {ETAPAS.map(etapa => (
                      <td key={etapa.code} className="px-2 py-3 text-center">
                        {row.progressMap[etapa.code] ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-200 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
