import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useVideosIglesia, useCreateVideo, useDeleteVideo, useUpdateVideoStatus } from "@/hooks/useVideosIglesia";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, EyeOff, Video } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

function getYoutubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    if (u.pathname.includes("/embed/")) return url;
  } catch {}
  return url;
}

export default function VideosPage() {
  const { data: videos, isLoading } = useVideosIglesia();
  const createVideo = useCreateVideo();
  const deleteVideo = useDeleteVideo();
  const updateStatus = useUpdateVideoStatus();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  

  const handleCreate = async () => {
    if (!titulo || !youtubeUrl) { toast.error("Completa todos los campos"); return; }
    try {
      await createVideo.mutateAsync({ titulo, youtube_url: youtubeUrl });
      toast.success("Video agregado");
      setOpen(false);
      setTitulo("");
      setYoutubeUrl("");
    } catch { toast.error("Error al crear video"); }
  };


  if (isLoading) return <div className="space-y-4 animate-fade-in"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Videos" description="Gestiona los videos de YouTube del dashboard">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Video</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Video</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre del video" />
              </div>
              <div className="space-y-2">
                <Label>URL de YouTube</Label>
                <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <Button onClick={handleCreate} disabled={createVideo.isPending} className="w-full">
                {createVideo.isPending ? "Guardando..." : "Agregar Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos?.map(v => (
          <Card key={v.id} className="overflow-hidden">
            <div className="aspect-video bg-muted">
              <iframe
                src={getYoutubeEmbedUrl(v.youtube_url)}
                title={v.titulo}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <CardContent className="pt-3 pb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{v.titulo}</p>
                <Badge variant={v.estado === "Activo" ? "default" : "secondary"} className="mt-1">{v.estado}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: v.id, estado: v.estado === "Activo" ? "Inactivo" : "Activo" })}>
                  {v.estado === "Activo" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <DeleteConfirmDialog
                  onConfirm={async () => { try { await deleteVideo.mutateAsync(v.id); toast.success("Video eliminado"); } catch { toast.error("Error"); } }}
                  trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {(!videos || videos.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay videos agregados.</p>
          </div>
        )}
      </div>

    </div>
  );
}
