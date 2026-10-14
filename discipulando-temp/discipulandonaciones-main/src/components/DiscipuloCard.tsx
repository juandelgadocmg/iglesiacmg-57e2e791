import { SemaforoDot } from './SemaforoDot';
import { calcularSemaforo, ETAPAS_ORDER, ETAPAS_LABELS, calcularEstadoEtapas, formatDuracion } from '@/lib/semaforo';
import { differenceInDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Check, AlertTriangle, Calendar } from 'lucide-react';

interface DiscipuloCardProps {
  discipulo: any;
  progreso: any[];
}

export function DiscipuloCard({ discipulo, progreso }: DiscipuloCardProps) {
  const completadas = progreso.filter((p) => p.completed).length;
  const porcentaje = Math.round((completadas / ETAPAS_ORDER.length) * 100);

  const diasSinAct = discipulo.last_update_at
    ? differenceInDays(new Date(), new Date(discipulo.last_update_at))
    : null;

  const semaforo = calcularSemaforo({
    status: discipulo.status,
    startDate: discipulo.start_date,
    progreso,
  });

  const estadoEtapas = calcularEstadoEtapas(discipulo.start_date, progreso);

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <SemaforoDot color={semaforo} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-foreground truncate">{discipulo.full_name}</div>
          <div className="text-xs text-muted-foreground">
            {discipulo.status}
            {' • '}
            {diasSinAct !== null ? `Hace ${diasSinAct} día${diasSinAct !== 1 ? 's' : ''}` : 'Sin actualizar'}
            {discipulo.start_date && (
              <span> • Inicio: {format(new Date(discipulo.start_date), 'dd/MM/yyyy')}</span>
            )}
          </div>
        </div>
        <div className="text-sm font-semibold text-foreground whitespace-nowrap">
          {porcentaje}%
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-1.5">
          {estadoEtapas.map((etapa) => {
            const label = ETAPAS_LABELS[etapa.code] || etapa.code;
            const duracionTexto = formatDuracion(etapa.code);

            let badgeClass = 'text-muted-foreground border-border';
            let icon = <Clock size={10} className="text-muted-foreground" />;
            let statusText = '';

            if (etapa.completada) {
              badgeClass = 'bg-secondary text-secondary-foreground border-secondary';
              icon = <Check size={10} />;
              statusText = '✓ Completada';
            } else if (etapa.vencida) {
              badgeClass = 'border-destructive text-destructive bg-destructive/10';
              icon = <AlertTriangle size={10} className="text-destructive" />;
              statusText = `Vencida hace ${Math.abs(etapa.diasRestantes!)} días`;
            } else if (etapa.diasRestantes !== null) {
              if (etapa.diasRestantes <= 3 && etapa.diasRestantes > 0) {
                badgeClass = 'border-semaforo-amarillo text-semaforo-amarillo bg-semaforo-amarillo/10';
                statusText = `${etapa.diasRestantes}d restantes`;
              } else if (etapa.diasRestantes > 0) {
                statusText = `${etapa.diasRestantes}d restantes`;
              } else {
                statusText = 'Hoy es el límite';
                badgeClass = 'border-semaforo-amarillo text-semaforo-amarillo bg-semaforo-amarillo/10';
              }
            }

            return (
              <Tooltip key={etapa.code}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.5 cursor-help flex items-center gap-1 ${badgeClass}`}
                  >
                    {icon}
                    <span>{etapa.code}</span>
                    {!etapa.completada && etapa.diasRestantes !== null && (
                      <span className="font-mono text-[9px] opacity-75">
                        {etapa.diasRestantes > 0 ? `${etapa.diasRestantes}d` : etapa.vencida ? `−${Math.abs(etapa.diasRestantes)}d` : '!'}
                      </span>
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                  <p className="font-semibold">{label}</p>
                  <p className="text-muted-foreground">
                    {etapa.tipo === 'fechas_fijas' ? (
                      <span className="flex items-center gap-1"><Calendar size={10} /> Fechas: {etapa.fechasTexto}</span>
                    ) : (
                      <span>Duración: {duracionTexto}</span>
                    )}
                  </p>
                  {etapa.fechaLimite && (
                    <p className="text-muted-foreground">
                      Fecha límite: {format(etapa.fechaLimite, 'dd/MM/yyyy')}
                    </p>
                  )}
                  {statusText && <p className={etapa.vencida ? 'text-destructive font-medium' : ''}>{statusText}</p>}
                  {!etapa.completada && etapa.diasRestantes !== null && (
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          etapa.vencida ? 'bg-destructive' : etapa.porcentajeTiempo > 75 ? 'bg-semaforo-amarillo' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, etapa.porcentajeTiempo)}%` }}
                      />
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
