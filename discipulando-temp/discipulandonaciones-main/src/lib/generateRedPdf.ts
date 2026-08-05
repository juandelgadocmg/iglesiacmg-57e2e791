import { calcularSemaforo, SEMAFORO_CONFIG, ETAPAS_ORDER, ETAPAS_LABELS, calcularEstadoEtapas, SemaforoColor } from './semaforo';

interface Discipulo {
  id: string;
  full_name: string;
  status: string;
  start_date: string | null;
  lider_id: string | null;
}

interface Progreso {
  discipulo_id: string;
  etapa_code: string;
  completed: boolean;
}

interface Leader {
  id: string;
  full_name: string;
  casas_de_paz?: { id: string; name: string; red_id: string | null } | null;
}

interface RedInfo {
  id: string;
  name: string;
  lider_red: string | null;
}

interface Casa {
  id: string;
  name: string;
  red_id: string | null;
}

const SEMAFORO_COLORS: Record<SemaforoColor, string> = {
  verde: '#22c55e',
  amarillo: '#eab308',
  rojo: '#ef4444',
  gris: '#9ca3af',
  azul: '#3b82f6',
};

export function generateRedPdf(
  red: RedInfo,
  leaders: Leader[],
  discipulos: Discipulo[],
  progreso: Progreso[],
  casas: Casa[]
) {
  // Filter leaders belonging to this red
  const redCasas = casas.filter(c => c.red_id === red.id);
  const redCasaIds = new Set(redCasas.map(c => c.id));
  const redLeaders = leaders.filter(l => {
    const casaId = (l.casas_de_paz as any)?.id;
    return casaId && redCasaIds.has(casaId);
  });

  if (redLeaders.length === 0) return null;

  // Build HTML for PDF
  const today = new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  .header h1 { font-size: 20px; color: #1e40af; }
  .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
  .summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-box { padding: 8px 14px; border-radius: 6px; text-align: center; min-width: 80px; }
  .casa-title { font-size: 14px; font-weight: bold; color: #334155; margin: 16px 0 8px; padding: 4px 8px; background: #f1f5f9; border-radius: 4px; }
  .leader-section { margin: 10px 0 16px 8px; page-break-inside: avoid; }
  .leader-name { font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; color: white; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 12px; font-size: 10px; }
  th { background: #e2e8f0; text-align: left; padding: 4px 6px; font-weight: 600; border: 1px solid #cbd5e1; }
  td { padding: 4px 6px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
  .etapa-done { color: #22c55e; font-weight: bold; }
  .etapa-pending { color: #9ca3af; }
  .etapa-overdue { color: #ef4444; font-weight: bold; }
  .no-disc { color: #94a3b8; font-style: italic; font-size: 10px; margin-left: 12px; }
  @media print { .leader-section { page-break-inside: avoid; } }
</style></head><body>`;

  // Header
  html += `<div class="header">
    <h1>Informe de Red: ${red.name}</h1>
    ${red.lider_red ? `<p>Líder de Red: ${red.lider_red}</p>` : ''}
    <p>Fecha: ${today}</p>
  </div>`;

  // Summary counts
  const allDisc = discipulos.filter(d => {
    const leader = redLeaders.find(l => l.id === d.lider_id);
    return !!leader;
  });
  const semaforoCounts: Record<SemaforoColor, number> = { verde: 0, amarillo: 0, rojo: 0, gris: 0, azul: 0 };
  allDisc.forEach(d => {
    const prog = progreso.filter(p => p.discipulo_id === d.id);
    const color = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: prog });
    semaforoCounts[color]++;
  });

  html += `<div class="summary">
    <div class="summary-box" style="background:#dbeafe"><strong>${redLeaders.length}</strong><br/>Líderes</div>
    <div class="summary-box" style="background:#dcfce7"><strong>${allDisc.length}</strong><br/>Discípulos</div>
    ${Object.entries(semaforoCounts).map(([color, count]) => 
      `<div class="summary-box" style="background:${SEMAFORO_COLORS[color as SemaforoColor]}22">
        <span class="dot" style="background:${SEMAFORO_COLORS[color as SemaforoColor]}"></span> 
        <strong>${count}</strong> ${SEMAFORO_CONFIG[color as SemaforoColor].label}
      </div>`
    ).join('')}
  </div>`;

  // Per casa, per leader
  redCasas.forEach(casa => {
    const casaLeaders = redLeaders.filter(l => (l.casas_de_paz as any)?.id === casa.id);
    if (casaLeaders.length === 0) return;

    html += `<div class="casa-title">🏠 ${casa.name}</div>`;

    casaLeaders.forEach(leader => {
      const disc = discipulos.filter(d => d.lider_id === leader.id);
      html += `<div class="leader-section">`;
      html += `<div class="leader-name">👤 ${leader.full_name} <span style="font-size:10px;color:#64748b;font-weight:normal">(${disc.length} discípulos)</span></div>`;

      if (disc.length === 0) {
        html += `<p class="no-disc">Sin discípulos asignados</p>`;
      } else {
        html += `<table><tr><th>Discípulo</th><th>Estado</th><th>Semáforo</th>`;
        ETAPAS_ORDER.forEach(code => {
          html += `<th style="text-align:center;font-size:9px">${code}</th>`;
        });
        html += `</tr>`;

        disc.forEach(d => {
          const prog = progreso.filter(p => p.discipulo_id === d.id);
          const color = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: prog });
          const estados = calcularEstadoEtapas(d.start_date, prog);

          html += `<tr><td>${d.full_name}</td><td>${d.status}</td>`;
          html += `<td><span class="dot" style="background:${SEMAFORO_COLORS[color]}"></span> ${SEMAFORO_CONFIG[color].label}</td>`;
          
          estados.forEach(e => {
            let cls = 'etapa-pending';
            let symbol = '○';
            if (e.completada) { cls = 'etapa-done'; symbol = '✓'; }
            else if (e.vencida) { cls = 'etapa-overdue'; symbol = '✗'; }
            html += `<td style="text-align:center" class="${cls}">${symbol}</td>`;
          });
          html += `</tr>`;
        });
        html += `</table>`;
      }
      html += `</div>`;
    });
  });

  html += `</body></html>`;
  return html;
}

export function downloadHtmlAsPdf(html: string, filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback: download as HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.html');
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
