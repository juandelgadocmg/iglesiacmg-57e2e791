import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportarGlobalDiscipulosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportarGlobalDiscipulosModal({ isOpen, onClose, onSuccess }: ImportarGlobalDiscipulosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);

  // Cargar casas de paz para poder mapear los nombres del Excel a IDs reales
  useEffect(() => {
    if (isOpen) {
      const fetchGrupos = async () => {
        const { data } = await supabase
          .from('grupos')
          .select('id, nombre, red, lider_id')
          .eq('estado', 'Activo');
        if (data) setGrupos(data);
      };
      fetchGrupos();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedData(data);
      } catch (error) {
        console.error("Error parsing file", error);
        toast.error("Error al procesar el archivo. Asegúrate de que sea un Excel válido.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const normalizeStr = (str: string) => {
    return (str || '').toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("El archivo está vacío o no se pudo leer.");
      return;
    }

    setLoading(true);

    try {
      let unmappedCdps = new Set<string>();

      const rowsToInsert = parsedData.map(row => {
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        // Nombres y Apellidos
        const nombre = normalizedRow['nombre'] || '';
        const apellido = normalizedRow['apellido'] || '';
        const fullName = `${nombre} ${apellido}`.trim() || normalizedRow['nombres'] || normalizedRow['discipulo'];
        
        // Teléfono
        const phone = normalizedRow['celular'] || normalizedRow['teléfono'] || normalizedRow['telefono'];
        
        // CDP y Red
        const cdpName = normalizedRow['cdp'] || normalizedRow['casa de paz'];
        const redName = normalizedRow['red'];
        
        let casaDePazId = null;
        let liderId = null;

        if (cdpName) {
          // Buscar coincidencia en la base de datos
          const normalizedExcelCdp = normalizeStr(cdpName);
          const normalizedExcelRed = normalizeStr(redName);

          const matchedGrupo = grupos.find(g => {
            const gCdp = normalizeStr(g.nombre);
            const gRed = normalizeStr(g.red);
            // Si el Excel tiene Red, intentar coincidir ambas. Si no, solo nombre de CDP.
            if (redName) {
              return gCdp === normalizedExcelCdp && gRed === normalizedExcelRed;
            }
            return gCdp === normalizedExcelCdp;
          });

          if (matchedGrupo) {
            casaDePazId = matchedGrupo.id;
            liderId = matchedGrupo.lider_id;
          } else {
            unmappedCdps.add(cdpName);
          }
        }

        return {
          full_name: fullName,
          telefono: phone ? String(phone) : null,
          casa_de_paz_id: casaDePazId,
          lider_id: liderId,
          status: 'Activo',
          notes: `Importado globalmente`
        };
      }).filter(r => !!r.full_name);

      if (rowsToInsert.length === 0) {
        toast.error("No se encontraron nombres válidos en el archivo.");
        setLoading(false);
        return;
      }

      if (unmappedCdps.size > 0) {
        toast.warning(`Atención: Algunas Casas de Paz no se encontraron en la base de datos (${Array.from(unmappedCdps).join(', ')}). Esos discípulos quedarán sin casa asignada temporalmente.`);
      }

      // Procesar en lotes si hay muchos
      const batchSize = 100;
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('discipulos').insert(batch);
        if (error) throw error;
      }

      toast.success(`${rowsToInsert.length} discípulos importados correctamente.`);
      onSuccess();
      onClose();
      setFile(null);
      setParsedData([]);
    } catch (err: any) {
      console.error("Error inserting data", err);
      toast.error(err.message || "Ocurrió un error al guardar los discípulos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Importación Global
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx o .csv) con la estructura completa de discipulado (Nombre, Apellido, Celular, Red, CDP).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
            <Input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              disabled={loading}
            />
            
            {file ? (
              <>
                <FileSpreadsheet className="w-10 h-10 text-indigo-500 mb-2" />
                <p className="font-semibold text-slate-700">{file.name}</p>
                <p className="text-sm text-slate-500">{parsedData.length} filas detectadas</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700">Toca para seleccionar un archivo</p>
                <p className="text-sm text-slate-500">o arrástralo aquí</p>
              </>
            )}
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Formato esperado:</p>
              <p>El Excel debe contener columnas llamadas: <strong>NOMBRE</strong>, <strong>APELLIDO</strong>, <strong>CELULAR</strong>, <strong>RED</strong> y <strong>CDP</strong>.</p>
              <p className="text-xs opacity-80">El sistema buscará la Casa de Paz automáticamente y asignará al líder correspondiente.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || parsedData.length === 0 || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
