/**
 * Vital classification thresholds — mirrors backend models.py
 */

export function classifySpO2(val) {
  if (val === null || val === undefined) return 'unknown';
  if (val >= 95) return 'green';
  if (val >= 92) return 'amber';
  return 'red';
}

export function classifyHeartRate(val) {
  if (val === null || val === undefined) return 'unknown';
  if (val >= 60 && val <= 100) return 'green';
  if ((val >= 50 && val < 60) || (val > 100 && val <= 120)) return 'amber';
  return 'red';
}

export function classifyTemperature(val) {
  if (val === null || val === undefined) return 'unknown';
  if (val >= 36.1 && val <= 37.2) return 'green';
  if (val > 37.2 && val <= 38.0) return 'amber';
  return 'red';
}

export function overallStatus(spo2, hr, temp) {
  const s2 = classifySpO2(spo2);
  const h  = classifyHeartRate(hr);
  const t  = classifyTemperature(temp);
  if ([s2, h, t].includes('red'))   return 'Critical';
  if ([s2, h, t].includes('amber')) return 'Warning';
  if (s2 === 'unknown' && h === 'unknown' && t === 'unknown') return 'Unknown';
  return 'Stable';
}

export function colorClass(status) {
  if (status === 'green')   return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'amber')   return 'text-amber-500 dark:text-amber-400';
  if (status === 'red')     return 'text-red-500 dark:text-red-400';
  return 'text-slate-400';
}

export function badgeClass(overall) {
  if (overall === 'Critical') return 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border border-red-200 dark:border-red-800';
  if (overall === 'Warning')  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
}

export function trendArrow(trend) {
  if (trend === 'up')   return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

export function trendColor(metric, trend) {
  const goodUp = metric === 'spo2';
  if (trend === 'stable') return 'text-slate-400';
  if (trend === 'up')     return goodUp ? 'text-emerald-500' : 'text-amber-500';
  return goodUp ? 'text-amber-500' : 'text-emerald-500';
}

export function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return ts; }
}

export function secondsAgo(ts) {
  if (!ts) return null;
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  } catch { return null; }
}

export function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]).join(',');
  const lines = rows.map(r =>
    Object.values(r).map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',')
  );
  return [headers, ...lines].join('\n');
}
