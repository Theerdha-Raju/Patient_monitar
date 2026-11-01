import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, User, Bed, Calendar, Clock, Heart } from 'lucide-react';
import { classifySpO2, classifyHeartRate, classifyTemperature, overallStatus, badgeClass } from '../utils/vitals.js';

export default function GaugeAndStatus({ patient, latestReading }) {
  const spo2 = latestReading?.spo2 ?? null;
  const hr = latestReading?.heart_rate ?? null;
  const temp = latestReading?.temperature ?? null;

  const currentStatus = latestReading?.status?.overall_status || overallStatus(spo2, hr, temp);

  // SpO2 calculation for SVG arc
  // Angle: -120 deg to +120 deg (total 240 deg)
  const minVal = 70;
  const maxVal = 100;
  const clampedSpo2 = spo2 !== null ? Math.min(maxVal, Math.max(minVal, spo2)) : minVal;
  const pct = (clampedSpo2 - minVal) / (maxVal - minVal);
  const angle = -120 + pct * 240;

  // Arc path constants
  const cx = 100;
  const cy = 100;
  const r = 72;

  // Polar to Cartesian
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Color bands on arc:
  // 70 - 92 : Red (<92%)   -> angle -120 to -120 + ((92-70)/30)*240 = -120 + 176 = 56
  // 92 - 95 : Amber (92-94.9%) -> 56 to -120 + ((95-70)/30)*240 = 80
  // 95 - 100 : Green (>=95%)   -> 80 to 120
  const arcRed = describeArc(cx, cy, r, -120, 56);
  const arcAmber = describeArc(cx, cy, r, 56, 80);
  const arcGreen = describeArc(cx, cy, r, 80, 120);

  const needleEnd = polarToCartesian(cx, cy, r - 12, angle);

  const statusIcons = {
    Stable: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    Warning: <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />,
    Critical: <AlertOctagon className="w-5 h-5 text-red-500 animate-bounce" />,
    Unknown: <Clock className="w-5 h-5 text-slate-400" />,
  };

  return (
    <div className="card p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* 1. SpO2 Semi-radial Gauge */}
      <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-5 md:pb-0 md:pr-6">
        <div className="flex items-center justify-between w-full mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            SpO₂ Saturation Gauge
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Target ≥ 95%</span>
        </div>

        <div className="relative w-48 h-40 flex items-center justify-center">
          <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible">
            {/* Background Arc */}
            <path
              d={describeArc(cx, cy, r, -120, 120)}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Colored Zones */}
            <path d={arcRed} fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.85" />
            <path d={arcAmber} fill="none" stroke="#f59e0b" strokeWidth="8" strokeOpacity="0.85" />
            <path d={arcGreen} fill="none" stroke="#10b981" strokeWidth="8" strokeOpacity="0.85" strokeLinecap="round" />

            {/* Needle */}
            {spo2 !== null && (
              <>
                <line
                  x1={cx}
                  y1={cy}
                  x2={needleEnd.x}
                  y2={needleEnd.y}
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <circle cx={cx} cy={cy} r="6" fill="#1d4ed8" />
                <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
              </>
            )}

            {/* Labels */}
            <text x="32" y="148" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono">70%</text>
            <text x="94" y="55" className="text-[9px] fill-amber-500 font-semibold">92%</text>
            <text x="146" y="148" className="text-[10px] fill-emerald-500 font-mono">100%</text>
          </svg>

          {/* Centered Readout */}
          <div className="absolute bottom-2 flex flex-col items-center">
            <span className="mono text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              {spo2 !== null ? `${spo2.toFixed(1)}%` : '—'}
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              spo2 >= 95 ? 'text-emerald-600 dark:text-emerald-400' :
              spo2 >= 92 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {spo2 >= 95 ? 'Normal Saturation' : spo2 >= 92 ? 'Borderline Hypoxia' : 'Critical Hypoxia'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Overall Status Badge & Clinical Assessment */}
      <div className="md:col-span-7 flex flex-col justify-between h-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Combined Clinical Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`badge text-sm px-3.5 py-1.5 flex items-center gap-2 shadow-sm font-bold ${badgeClass(currentStatus)}`}>
                {statusIcons[currentStatus] || statusIcons.Unknown}
                <span>PATIENT STATUS: {currentStatus.toUpperCase()}</span>
              </div>
              {currentStatus === 'Critical' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 dark:text-slate-500 block">Assessment Basis</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {currentStatus === 'Critical' ? 'Critical breach in vitals (<92% SpO2, >38.0°C or abnormal HR)' :
               currentStatus === 'Warning' ? 'Borderline readings require monitoring' :
               'All physiological vitals within target normal ranges'}
            </span>
          </div>
        </div>

        {/* Patient Profile Quick Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Patient</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={patient?.name}>
                {patient?.name || 'Loading...'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bed size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Ward Room</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {patient?.room_number || 'Room 101'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Monitoring Day</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {(patient?.admission_date || patient?.quarantine_start_date) ? (
                  `Day ${Math.max(1, Math.floor((Date.now() - new Date(patient.admission_date || patient.quarantine_start_date).getTime()) / (1000 * 60 * 60 * 24)))}`
                ) : 'Day 4'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Heart size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Demographics</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {patient ? `${patient.age || 45}y · ${patient.gender || 'M'}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
