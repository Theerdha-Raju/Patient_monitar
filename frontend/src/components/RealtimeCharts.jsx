import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label, unit, normalLabel }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700/60 backdrop-blur">
        <div className="text-slate-400 font-mono mb-1">{label}</div>
        <div className="flex items-baseline gap-1.5 font-bold text-sm">
          <span>{payload[0].name}:</span>
          <span className="mono text-blue-400">{val} {unit}</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
          Normal: {normalLabel}
        </div>
      </div>
    );
  }
  return null;
}

export default function RealtimeCharts({ readings = [] }) {
  // Filter for last 5 minutes (or latest 60 data points for rolling view)
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Keep the last 60 readings (covering 2-5 minutes of 2s interval)
    const recent = sorted.slice(-60);

    return recent.map((item) => {
      const d = new Date(item.timestamp);
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : item.timestamp;

      return {
        time: timeStr,
        timestamp: item.timestamp,
        spo2: Number(item.spo2),
        heart_rate: Number(item.heart_rate),
        temperature: Number(item.temperature),
      };
    });
  }, [readings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Real-Time Physiological Telemetry</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Auto-scrolling 5-minute rolling window with physiological target bands & threshold markers
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
          {chartData.length} samples in window
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. SpO2 Chart */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                SpO₂ Oxygen Saturation
              </span>
              <div className="text-[11px] text-slate-400">Normal Range: ≥ 95%</div>
            </div>
            <div className="text-right">
              <span className="mono text-lg font-bold text-slate-800 dark:text-slate-100">
                {chartData.length > 0 ? `${chartData[chartData.length - 1].spo2}%` : '—'}
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={25} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  content={<CustomTooltip unit="%" normalLabel="95% - 100%" />}
                />
                {/* Shaded Normal Range (95 - 100) */}
                <ReferenceArea y1={95} y2={100} fill="#10b981" fillOpacity={0.12} />
                {/* Critical Threshold Line (<92%) */}
                <ReferenceLine y={92} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crit <92%', fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }} />
                {/* Warning Line (95%) */}
                <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  name="SpO₂"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#059669', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block"></span> Normal (≥95%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block"></span> Amber (92-94%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block"></span> Critical (&lt;92%)</span>
          </div>
        </div>

        {/* 2. Heart Rate Chart */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Pulse / Heart Rate
              </span>
              <div className="text-[11px] text-slate-400">Normal Range: 60 – 100 BPM</div>
            </div>
            <div className="text-right">
              <span className="mono text-lg font-bold text-slate-800 dark:text-slate-100">
                {chartData.length > 0 ? `${chartData[chartData.length - 1].heart_rate} bpm` : '—'}
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={25} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip
                  content={<CustomTooltip unit="BPM" normalLabel="60 - 100 BPM" />}
                />
                {/* Shaded Normal Range (60 - 100) */}
                <ReferenceArea y1={60} y2={100} fill="#3b82f6" fillOpacity={0.12} />
                {/* Threshold lines */}
                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Tachy >100', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
                <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crit >120', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }} />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="heart_rate"
                  name="Heart Rate"
                  stroke="#3b82f6"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#1d4ed8', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400 inline-block"></span> Normal (60-100)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block"></span> 50-59 / 101-120</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block"></span> &lt;50 / &gt;120</span>
          </div>
        </div>

        {/* 3. Body Temperature Chart */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Body Temperature
              </span>
              <div className="text-[11px] text-slate-400">Normal Range: 36.1 – 37.2 °C</div>
            </div>
            <div className="text-right">
              <span className="mono text-lg font-bold text-slate-800 dark:text-slate-100">
                {chartData.length > 0 ? `${chartData[chartData.length - 1].temperature}°C` : '—'}
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={25} />
                <YAxis domain={[35.0, 40.5]} tick={{ fontSize: 10 }} />
                <Tooltip
                  content={<CustomTooltip unit="°C" normalLabel="36.1°C - 37.2°C" />}
                />
                {/* Shaded Normal Range (36.1 - 37.2) */}
                <ReferenceArea y1={36.1} y2={37.2} fill="#10b981" fillOpacity={0.12} />
                {/* Fever Threshold (>38.0) */}
                <ReferenceLine y={38.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Fever >38°C', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }} />
                <ReferenceLine y={37.3} stroke="#f59e0b" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#d97706', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block"></span> Normal (36.1-37.2)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block"></span> Subfebrile (37.3-38.0)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block"></span> Fever (&gt;38.0°C)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
