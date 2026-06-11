import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function PlaceholderSection({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {phase}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-3">Este submódulo se habilita en la siguiente fase de implementación.</p>
      </CardContent>
    </Card>
  );
}
