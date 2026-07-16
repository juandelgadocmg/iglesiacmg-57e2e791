import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useBanners, useCreateBanner, useDeleteBanner, useUpdateBannerStatus } from "@/hooks/useBanners";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, EyeOff, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function BannersPage() {
  const { data: banners, isLoading } = useBanners();
  const createBanner = useCreateBanner();
  const deleteBanner = useDeleteBanner();
  const updateStatus = useUpdateBannerStatus();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  

  const handleCreate = async () => {
    if (!titulo || !file) { toast.error("Completa todos los campos"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("banners").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
      await createBanner.mutateAsync({ titulo, imagen_url: urlData.publicUrl });
      toast.success("Banner creado");
      setOpen(false);
      setTitulo("");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Error al subir");
    } finally {
      setUploading(false);
    }
  };


  if (isLoading) return <div className="space-y-4 animate-fade-in"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Banners" description="Gestiona los banners del dashboard">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Banner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Banner</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Logo, Pastor, Bienvenida" />
              </div>
              <div className="space-y-2">
                <Label>Imagen</Label>
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleCreate} disabled={uploading} className="w-full">
                {uploading ? "Subiendo..." : "Crear Banner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners?.map(b => (
          <Card key={b.id} className="overflow-hidden">
            <div className="relative aspect-[16/6] bg-muted">
              <img src={b.imagen_url} alt={b.titulo} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <Badge variant={b.estado === "Activo" ? "default" : "secondary"}>{b.estado}</Badge>
              </div>
            </div>
            <CardContent className="pt-3 pb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{b.titulo}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: b.id, estado: b.estado === "Activo" ? "Inactivo" : "Activo" })}>
                  {b.estado === "Activo" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <DeleteConfirmDialog
                  onConfirm={async () => { try { await deleteBanner.mutateAsync(b.id); toast.success("Banner eliminado"); } catch { toast.error("Error"); } }}
                  trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {(!banners || banners.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay banners. Crea el primero.</p>
          </div>
        )}
      </div>

    </div>
  );
}
