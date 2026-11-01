import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Calendar,
  RefreshCw,
  Download,
  AlertCircle,
  Thermometer,
  Heart,
  Activity,
  Layers
} from 'lucide-react';
import { TemperatureChart, PulseRateChart, SpO2Chart } from '../components/ChartComponents.jsx';
import api from '../services/api.js';

// Generate mock history for demo/offline mode
function generateMockHistory(count = 60) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - i) * 5000;
    const base_spo2 = 97;
    const base_hr = 75;
    const base_temp = 36.8;
    return {
      timestamp: new Date(t).toISOString(),
      spo2: Math.min(100, Math.max(88, base_spo2 + Math.sin(i * 0.3) * 1.5 + (Math.random() - 0.5) * 0.5)),
      heart_rate: Math.round(base_hr + Math.sin(i * 0.4) * 5 + (Math.random() - 0.5) * 2),
      temperature: Math.round((base_temp + Math.sin(i * 0.2) * 0.3 + (Math.random() - 0.5) * 0.05) * 100) / 100,
      pulse_rate: Math.round(base_hr + Math.sin(i * 0.4) * 5 + (Math.random() - 0.5) * 2),
    };
  });
}

export default function HistoricalGraphs({ selectedPatient = 'PATIENT-001' }) {
  const [range, setRange] = useState('1h'); // '1h' | '24h' | '7d'
  const [data, setData] = useState(() => generateMockHistory(60)); // pre-fill with demo data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const limitMap = { '1h': 150, '24h': 350, '7d': 800 };
      const res = await api.getReadingsHistory(selectedPatient, range, limitMap[range] || 150);
      const records = res.data || [];
      if (records.length > 0) {
        setData(records);
        setIsDemo(false);
      } else {
        // No data from backend — use mock
        setData(generateMockHistory(80));
        setIsDemo(true);
      }
    } catch (err) {
      setError('Unable to fetch historical telemetry from backend — showing simulated demo data.');
      setData(generateMockHistory(80));
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedPatient, range]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChart size={20} className="text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              Interactive Physiological Graphs (Chart.js)
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {selectedPatient}
            </span>
            {isDemo && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                SIMULATED DATA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDemo ? 'Simulated physiological telemetry — connect backend for real PostgreSQL data' : 'Verified telemetry measurements retrieved directly from PostgreSQL'}
          </p>
        </div>

        {/* Time-Range Filters (1h, 24h, 7d) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: '1h', label: 'Last 1 Hour' },
              { id: '24h', label: 'Last 24 Hours' },
              { id: '7d', label: 'Last 7 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === tab.id
                    ? 'bg-white text-teal-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Separate Interactive Line Charts (Section 6) */}
      <div className="space-y-6">
        {/* 1. Temperature History (°C) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Thermometer size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Body Temperature History (°C)
                </h4>
                <p className="text-[11px] text-slate-400">DS18B20 Digital Thermometer Telemetry</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {data.length} records in window
            </span>
          </div>

          <div className="h-64 w-full">
            <TemperatureChart data={data} />
          </div>
        </div>

        {/* 2. Pulse Rate History (BPM) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Heart size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Pulse Rate History (BPM)
                </h4>
                <p className="text-[11px] text-slate-400">MAX30102 Optical PPG Sensor Telemetry</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {data.length} records in window
            </span>
          </div>

          <div className="h-64 w-full">
            <PulseRateChart data={data} />
          </div>
        </div>

        {/* 3. SpO2 History (%) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Estimated Blood Oxygen Saturation History (SpO₂ %)
                </h4>
                <p className="text-[11px] text-slate-400">Estimated Arterial Oxygen Saturation</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {data.length} records in window
            </span>
          </div>

          <div className="h-64 w-full">
            <SpO2Chart data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
