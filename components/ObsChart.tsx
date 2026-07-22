import React from 'react';

// Diagrammes 100% SVG, sans dépendance externe → crawlables (SEO) et légers.
// Alimentés par des specs JSON (produites par la routine éditoriale).

export interface ChartSpec {
  type: 'bar' | 'line' | 'donut';
  title?: string;
  unit?: string;                 // ex: '%'
  source?: string;
  series: { label: string; value: number }[];
}

const PALETTE = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#0891b2', '#dc2626', '#ca8a04', '#4f46e5'];
const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));

const BarChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const w = 640, h = 300, padL = 44, padB = 56, padT = 16, padR = 16;
  const data = spec.series;
  const max = Math.max(1, ...data.map(d => d.value));
  const iw = w - padL - padR, ih = h - padT - padB;
  const bw = iw / data.length;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={spec.title || 'Diagramme'}>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = padT + (ih * i) / ticks;
        const val = max - (max * i) / ticks;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#9ca3af">{fmt(val)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = (d.value / max) * ih;
        const x = padL + i * bw + bw * 0.15;
        const y = padT + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw * 0.7} height={bh} rx={4} fill={PALETTE[i % PALETTE.length]} />
            <text x={x + bw * 0.35} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#374151">
              {fmt(d.value)}{spec.unit || ''}
            </text>
            <text x={x + bw * 0.35} y={h - padB + 16} textAnchor="middle" fontSize={11} fill="#6b7280">
              {d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const w = 640, h = 300, padL = 44, padB = 44, padT = 16, padR = 16;
  const data = spec.series;
  const max = Math.max(1, ...data.map(d => d.value));
  const min = Math.min(0, ...data.map(d => d.value));
  const iw = w - padL - padR, ih = h - padT - padB;
  const x = (i: number) => padL + (iw * i) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={spec.title || 'Courbe'}>
      {[0, 1, 2, 3, 4].map(i => {
        const yy = padT + (ih * i) / 4;
        return <line key={i} x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      <path d={path} fill="none" stroke={PALETTE[0]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} fill={PALETTE[0]} />
          <text x={x(i)} y={y(d.value) - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151">
            {fmt(d.value)}{spec.unit || ''}
          </text>
          <text x={x(i)} y={h - padB + 16} textAnchor="middle" fontSize={11} fill="#6b7280">
            {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const size = 240, cx = 120, cy = 120, r = 88, sw = 34;
  const total = spec.series.reduce((s, d) => s + d.value, 0) || 1;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={spec.title || 'Répartition'}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        {spec.series.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={sw}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill="#111827">
          {fmt(total)}{spec.unit || ''}
        </text>
      </svg>
      <ul className="text-sm space-y-1.5">
        {spec.series.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-gray-700">{d.label}</span>
            <span className="text-gray-400">— {fmt(d.value)}{spec.unit || ''} ({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ObsChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  if (!spec || !Array.isArray(spec.series) || spec.series.length === 0) return null;
  return (
    <figure className="my-6 bg-white border border-gray-200 rounded-2xl p-5">
      {spec.title && <figcaption className="font-bold text-gray-900 mb-3">{spec.title}</figcaption>}
      {spec.type === 'line' ? <LineChart spec={spec} />
        : spec.type === 'donut' ? <DonutChart spec={spec} />
        : <BarChart spec={spec} />}
      {spec.source && <p className="text-xs text-gray-400 mt-3">Source : {spec.source}</p>}
    </figure>
  );
};

export default ObsChart;
