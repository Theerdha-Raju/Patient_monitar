import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { colorClass, trendArrow } from '../utils/vitals.js';

function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp size={15} className="stroke-[2.5]" />;
  if (trend === 'down') return <TrendingDown size={15} className="stroke-[2.5]" />;
  return <Minus size={15} className="stroke-[2.5]" />;
}

function VitalCard({ label, value, unit, status, trend, icon, normal, normalRange }) {
  const isGreen = status === 'green';
  const isAmber = status === 'amber';
  const isRed   = status === 'red';

  // Status-specific theme tokens
  const statusTheme = {
    green: {
      border: 'border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      badgeText: 'NORMAL',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
    },
    amber: {
      border: 'border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      badgeText: 'ATTENTION',
      valueColor: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-500',
      dotColor: 'bg-amber-500',
    },
    red: {
      border: 'border-slate-200 dark:border-slate-800 border-t-4 border-t-red-500',
      badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 animate-pulse',
      badgeText: 'CRITICAL',
      valueColor: 'text-red-600 dark:text-red-400',
      barColor: 'bg-red-500',
      dotColor: 'bg-red-500',
    },
    unknown: {
      border: 'border-slate-200 dark:border-slate-800 border-t-4 border-t-slate-400',
      badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      badgeText: 'AWAITING',
      valueColor: 'text-slate-700 dark:text-slate-200',
      barColor: 'bg-slate-300',
      dotColor: 'bg-slate-400',
    }
  };

  const currentTheme = statusTheme[status] || statusTheme.unknown;
  const arrow = trendArrow(trend);

  return (
    <div className={`card p-5 flex flex-col justify-between ${currentTheme.border} shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900`}>
      {/* 1. Card Header: Metric Name & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={label}>{icon}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {label}
          </span>
        </div>

        {/* Status Pill Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${currentTheme.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotColor} ${isRed ? 'animate-ping' : ''}`} />
          {currentTheme.badgeText}
        </span>
      </div>

      {/* 2. Main Value Readout (Big, High Contrast & Crystal Clear) */}
      <div className="my-2 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="mono text-5xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            {value !== null && value !== undefined
              ? (typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value)
              : '—'}
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
          <TrendIcon trend={trend} />
          <span>{arrow}</span>
        </div>
      </div>

      {/* 3. Footer Reference & Target Range */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Target: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{normal}</strong>
        </span>

        {/* Status color indicator bar */}
        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full w-full ${currentTheme.barColor} transition-all duration-500`} />
        </div>
      </div>
    </div>
  );
}

export default function VitalCards({ latest }) {
  const r = latest || {};

  const spo2Status = r.status?.spo2_status;
  const hrStatus   = r.status?.heart_rate_status;
  const tempStatus = r.status?.temperature_status;

  const spo2Trend  = r.trends?.spo2_trend  || r.spo2_trend;
  const hrTrend    = r.trends?.heart_rate_trend || r.heart_rate_trend;
  const tempTrend  = r.trends?.temperature_trend || r.temperature_trend;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <VitalCard
        label="Blood Oxygen (SpO₂)"
        value={r.spo2}
        unit="%"
        status={spo2Status}
        trend={spo2Trend || 'stable'}
        icon="🫁"
        normal="≥ 95.0%"
      />
      <VitalCard
        label="Heart Rate"
        value={r.heart_rate}
        unit="BPM"
        status={hrStatus}
        trend={hrTrend || 'stable'}
        icon="❤️"
        normal="60 – 100 BPM"
      />
      <VitalCard
        label="Body Temperature"
        value={r.temperature}
        unit="°C"
        status={tempStatus}
        trend={tempTrend || 'stable'}
        icon="🌡️"
        normal="36.1 – 37.2 °C"
      />
    </div>
  );
}
