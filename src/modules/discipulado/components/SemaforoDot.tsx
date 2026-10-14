import { SemaforoColor, SEMAFORO_CONFIG } from '../utils/semaforo';

interface SemaforoDotProps {
  color: SemaforoColor;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

const sizeMap = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-5 h-5',
};

export function SemaforoDot({ color, size = 'md', showLabel = false, pulse = false }: SemaforoDotProps) {
  const config = SEMAFORO_CONFIG[color];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block rounded-full ${sizeMap[size]} ${config.dotClass} ${
          pulse && color === 'rojo' ? 'animate-pulse' : ''
        }`}
      />
      {showLabel && (
        <span className="text-sm font-medium text-foreground">{config.label}</span>
      )}
    </div>
  );
}
