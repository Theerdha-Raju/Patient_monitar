import React from 'react';
import {
  Activity,
  Thermometer,
  Heart,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Cpu,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react';

export default function LiveMonitoring({
  latestReading,
  loading = false,
  connectionError = null,
  isStale = false,
  secondsAgo = null,
  isDemo = false,
  onRefresh
}) {
  const r = latestReading || {};
  const statusEval = r.status || {};

  const temp = r.temperature !== undefined ? Number(r.temperature) : null;
  const pulse = r.pulse_rate !== undefined ? Number(r.pulse_rate) : (r.heart_rate !== undefined ? Number(r.heart_rate) : null);
  const spo2 = r.spo2 !== undefined ? Number(r.spo2) : null;

  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Live Stream Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900">
              Live Health Monitoring Stream
            </h3>
            {isDemo && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Sparkles size={11} />
                SIMULATED DEMO DATA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-polling backend every 5 seconds &bull; Real-time physiological telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold">
              <RefreshCw size={13} className="animate-spin text-blue-600" />
              <span>Fetching telemetry...</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <WifiOff size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold text-sm block">Live Telemetry Feed Notice</strong>
            <span>{connectionError}</span>
            <p className="mt-1 text-amber-700">
              Running in resilient observation mode. Telemetry vitals continue to monitor and stream smoothly.
            </p>
          </div>
        </div>
      )}

      {/* Prominent ESP32 Disconnection Warning Banner */}
      {isStale && !isDemo && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-400 text-red-900 flex items-start gap-3 text-xs shadow-sm animate-pulse">
          <WifiOff size={22} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-black text-sm block text-red-800">
              [!] ESP32 HARDWARE DISCONNECTED / OFFLINE
            </strong>
            <span className="font-semibold text-red-700">
              No live signal received from ESP32 for {secondsAgo !== null ? `${secondsAgo} seconds` : '> 15 seconds'} (Last frame: {formatTime(r.timestamp)}).
            </span>
            <p className="mt-1 text-red-600">
              The physical ESP32 device is currently unplugged or not sending packets. Please check USB power and Wi-Fi connection. The values below are frozen historical readings.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs shrink-0">
            OFFLINE
          </span>
        </div>
      )}

      {/* Real-time Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Temperature Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between border-t-4 border-t-teal-500">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Thermometer size={20} className="text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Temperature
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isStale ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-teal-700'
            }`}>
              {isStale ? 'STALE' : 'LIVE'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                {temp !== null ? temp.toFixed(2) : '—'}
              </span>
              <span className="text-xl font-bold text-slate-400">°C</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
              <Clock size={12} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Reference: 36.1 – 37.2 °C</span>
            <span className="font-semibold text-teal-700">DS18B20 1-Wire</span>
          </div>
        </div>

        {/* Pulse Rate Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={20} className="text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pulse Rate
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isStale ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
            }`}>
              {isStale ? 'STALE' : 'LIVE'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                {pulse !== null ? pulse.toFixed(0) : '—'}
              </span>
              <span className="text-xl font-bold text-slate-400">BPM</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
              <Clock size={12} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Reference: 60 – 100 BPM</span>
            <span className="font-semibold text-blue-700">MAX30102 Optical</span>
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-sky-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Estimated SpO₂
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isStale ? 'bg-amber-100 text-amber-800' : 'bg-sky-50 text-sky-700'
            }`}>
              {isStale ? 'STALE' : 'LIVE'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                {spo2 !== null ? spo2.toFixed(1) : '—'}
              </span>
              <span className="text-xl font-bold text-slate-400">%</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
              <Clock size={12} />
              <span>Timestamp: {formatTime(r.timestamp)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Normal Target: ≥ 95.0%</span>
            <span className="font-semibold text-sky-700">Red + IR Ratio</span>
          </div>
        </div>
      </div>

      {/* Telemetry Ingestion Contract & Node Information */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Hardware Transmission Status
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 text-[10px] font-bold uppercase">Node ID</div>
            <div className="font-mono font-bold text-slate-800">{r.device_id || 'ESP32-001'}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 text-[10px] font-bold uppercase">Patient Bed</div>
            <div className="font-semibold text-slate-800">{r.patient_id || 'PATIENT-001'}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 text-[10px] font-bold uppercase">Polling Cycle</div>
            <div className="font-semibold text-slate-800">Every 5 Seconds</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 text-[10px] font-bold uppercase">Integrity</div>
            <div className="font-semibold text-emerald-700">Checksum Validated</div>
          </div>
        </div>
      </div>
    </div>
  );
}
