import React from 'react';
import {
  Thermometer,
  Heart,
  Activity,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function Overview({
  latestReading,
  deviceStatus,
  patient,
  onNavigate,
  isStale = false,
  secondsAgo = null
}) {
  const r = latestReading || {};
  const statusEval = r.status || {};
  const warnings = statusEval.warnings || [];
  const sensorErrors = statusEval.sensor_errors || [];

  const tempVal = r.temperature !== undefined ? Number(r.temperature) : null;
  const pulseVal = r.pulse_rate !== undefined ? Number(r.pulse_rate) : (r.heart_rate !== undefined ? Number(r.heart_rate) : null);
  const spo2Val = r.spo2 !== undefined ? Number(r.spo2) : null;

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return 'No data yet';
    try {
      return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const readingAgeSeconds = r.timestamp ? (Date.now() - new Date(r.timestamp).getTime()) / 1000 : 9999;
  const isDeviceOnline = !isStale && (readingAgeSeconds < 45 || Boolean(deviceStatus?.is_online) || deviceStatus?.status === 'ONLINE');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome & Patient Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              {patient?.name || 'Patient'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {patient?.patient_id || 'PATIENT-001'}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {patient?.room_number || 'General Ward 101'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring Day {(patient?.admission_date || patient?.quarantine_start_date) ? Math.max(1, Math.floor((Date.now() - new Date(patient.admission_date || patient.quarantine_start_date).getTime()) / (1000 * 60 * 60 * 24))) : 4} &bull; Continuous IoT Vitals Telemetry
          </p>
        </div>

        <button
          onClick={() => onNavigate('live')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <span>Open Live Stream</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Prominent ESP32 Connection Status Alert Banner */}
      {isStale ? (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-400 flex flex-wrap items-center justify-between gap-3 text-red-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <WifiOff size={20} />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide text-red-800 flex items-center gap-2">
                <span>[!] ESP32 HARDWARE NOT CONNECTED / OFFLINE</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                  NO LIVE SIGNAL
                </span>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                No telemetry packets received from the ESP32 in over {secondsAgo !== null ? `${secondsAgo} seconds` : '15 seconds'}. 
                Connect ESP32 via USB and confirm Wi-Fi connection to resume live telemetry.
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-red-600 font-bold shrink-0">
            Last seen: {formatTime(r.timestamp)}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3 text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <span className="font-black text-xs uppercase tracking-wide text-emerald-800">
                🟢 LIVE ESP32 HARDWARE STREAM ACTIVE
              </span>
              <span className="text-[11px] text-emerald-700 ml-2 hidden sm:inline">
                &bull; Physical Node (ESP32-001) transmitting every 3s via Wi-Fi
              </span>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-emerald-700">
            Packet latency: {secondsAgo !== null ? `${secondsAgo}s ago` : '< 3s'}
          </div>
        </div>
      )}

      {/* 4 Summary Cards (Section 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Temperature */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-teal-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Thermometer size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Body Temperature
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
              DS18B20 Online
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {tempVal !== null ? tempVal.toFixed(2) : '—'}
              </span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <Clock size={11} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Normal Target:</span>
            <span className="font-semibold text-slate-700">36.1 – 37.2 °C</span>
          </div>
        </div>

        {/* 2. Pulse Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Heart size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pulse Rate
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              MAX30102 PPG
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {pulseVal !== null ? pulseVal.toFixed(0) : '—'}
              </span>
              <span className="text-base font-bold text-slate-400">BPM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <Clock size={11} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Resting Target:</span>
            <span className="font-semibold text-slate-700">60 – 100 BPM</span>
          </div>
        </div>

        {/* 3. SpO2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Blood Oxygen (SpO₂)
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
              Estimated Optical
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {spo2Val !== null ? spo2Val.toFixed(1) : '—'}
              </span>
              <span className="text-base font-bold text-slate-400">%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <Clock size={11} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Normal Saturation:</span>
            <span className="font-semibold text-slate-700">≥ 95.0%</span>
          </div>
        </div>

        {/* 4. ESP32 Device Status */}
        <div className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between border-t-4 ${
          isDeviceOnline ? 'border-t-emerald-500' : 'border-t-red-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDeviceOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                <Cpu size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                ESP32 Hardware
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isDeviceOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {isDeviceOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="my-2">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {isDeviceOnline ? (
                <>
                  <Wifi size={18} className="text-emerald-500" />
                  <span>Actively Streaming</span>
                </>
              ) : (
                <>
                  <WifiOff size={18} className="text-red-500" />
                  <span className="text-red-700">No Telemetry for &gt; 30s</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Last data: {formatTime(r.timestamp || deviceStatus?.last_seen)}
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Node ID:</span>
            <span className="font-mono font-bold text-slate-700">ESP32-001</span>
          </div>
        </div>
      </div>

      {/* Monitoring Status & Warnings Card (Section 4) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Observation Status & Demonstration Alerts
              </h4>
              <p className="text-xs text-slate-400">
                Automated rule checking against configurable demonstration parameters
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            warnings.length > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            Status: {r.monitoring_status || (warnings.length > 0 ? 'Threshold Observation' : 'Normal Range')}
          </span>
        </div>

        {/* Warnings list or normal message */}
        {warnings.length > 0 ? (
          <div className="space-y-2">
            {warnings.map((warn, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">{warn}</span>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    Triggered at {formatTime(r.timestamp)} &bull; Demonstration threshold breach (non-diagnostic)
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">All physiological parameters within target baseline range.</span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                No active threshold observation warnings for {patient?.patient_id || 'PATIENT-001'}.
              </p>
            </div>
          </div>
        )}

        {/* Clear non-diagnostic notice */}
        <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed border border-slate-200/60">
          <strong className="text-slate-700">Demonstration Note:</strong> Sensor monitoring warnings indicate deviations from educational thresholds. This system does NOT detect, diagnose, or confirm any illness or medical condition.
        </div>
      </div>
    </div>
  );
}
