import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportarDiscipulosModalProps {
  isOpen: boolean;
  onClose: () => void;
  liderId: string;
  casaDePazId?: string | null;
  onSuccess: () => void;
}

export function ImportarDiscipulosModal({ isOpen, onClose, liderId, casaDePazId, onSuccess }: ImportarDiscipulosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

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

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("El archivo está vacío o no se pudo leer.");
      return;
    }

    setLoading(true);

    try {
      // Map columns based on common names
      const rowsToInsert = parsedData.map(row => {
        // Normalize keys to lowercase for easier matching
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        const fullName = normalizedRow['nombre'] || normalizedRow['nombre completo'] || normalizedRow['nombres'] || normalizedRow['discipulo'];
        const phone = normalizedRow['teléfono'] || normalizedRow['telefono'] || normalizedRow['celular'];
        const notes = normalizedRow['notas'] || normalizedRow['detalles'] || normalizedRow['observaciones'];

        return {
          full_name: fullName,
          telefono: phone ? String(phone) : null,
          notes: notes ? String(notes) : null,
          lider_id: liderId,
          casa_de_paz_id: casaDePazId || null,
          status: 'Activo'
        };
      }).filter(r => !!r.full_name); // Filter out rows without a name

      if (rowsToInsert.length === 0) {
        toast.error("No se encontraron nombres válidos en el archivo. Verifica la cabecera de la columna.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('discipulos').insert(rowsToInsert);

      if (error) {
        throw error;
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
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar Discípulos
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx o .csv) con la lista de tus discípulos.
            El archivo debe tener al menos una columna llamada <strong>"Nombre"</strong>.
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
                <FileSpreadsheet className="w-10 h-10 text-green-500 mb-2" />
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
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
            <p>
              El sistema buscará automáticamente las columnas <strong>Nombre</strong> y <strong>Teléfono</strong>. 
              Se descartarán las filas que no tengan un nombre válido.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || parsedData.length === 0 || loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
