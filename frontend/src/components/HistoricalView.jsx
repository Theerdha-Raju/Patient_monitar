import React, { useState, useMemo, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Calendar, Activity, BarChart2 } from 'lucide-react';
import { formatDateTime, toCSV, classifySpO2, classifyHeartRate, classifyTemperature, overallStatus, badgeClass } from '../utils/vitals.js';

export default function HistoricalView({ patientId, isMock, mockReadings = [] }) {
  const [range, setRange] = useState('15m'); // '15m', '1h', '24h', '7d'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch or filter historical data
  useEffect(() => {
    let isCancelled = false;

    if (isMock) {
      // Filter mock readings for selected patient
      const filtered = (mockReadings[patientId] || []).slice().reverse();
      setData(filtered);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const limitMap = { '15m': 100, '1h': 250, '24h': 500, '7d': 1000 };
        const limit = limitMap[range] || 100;
        const res = await fetch(`/api/readings?patient_id=${patientId}&limit=${limit}&range=${range}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!isCancelled) {
          // Store newest first for the table
          setData(json.data ? [...json.data].reverse() : []);
        }
      } catch (err) {
        if (!isCancelled) setError('Failed to retrieve historical telemetry records');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => { isCancelled = true; };
  }, [patientId, range, isMock, mockReadings]);

  // Reset page when range or patient changes
  useEffect(() => {
    setPage(1);
  }, [range, patientId]);

  // Statistical calculations
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const spo2s = data.map(d => Number(d.spo2)).filter(v => !isNaN(v));
    const hrs = data.map(d => Number(d.heart_rate)).filter(v => !isNaN(v));
    const temps = data.map(d => Number(d.temperature)).filter(v => !isNaN(v));

    const calc = (arr) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0 };
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const sum = arr.reduce((acc, v) => acc + v, 0);
      return { min, max, avg: (sum / arr.length).toFixed(1) };
    };

    return {
      spo2: calc(spo2s),
      hr: calc(hrs),
      temp: calc(temps),
      count: data.length,
    };
  }, [data]);

  // Pagination slice
  const totalPages = Math.ceil((data.length || 0) / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const csvContent = toCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `health_telemetry_${patientId}_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card p-5 space-y-5">
      {/* Top Header & Range Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-600 dark:text-blue-400" />
            Historical Telemetry & Audit Logs
          </h3>
          <p className="text-[11px] text-slate-400">
            Exportable clinical telemetry logs for {patientId}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: '15m', label: '15 min' },
              { id: '1h', label: '1 hr' },
              { id: '24h', label: '24 hr' },
              { id: '7d', label: '7 days' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === tab.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Statistical Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-400 font-medium mb-1">SpO₂ Summary ({range})</div>
            <div className="flex items-baseline justify-between">
              <span className="mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                Avg: {stats.spo2.avg}%
              </span>
              <span className="text-[11px] text-slate-400">
                Min: {stats.spo2.min}% · Max: {stats.spo2.max}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-400 font-medium mb-1">Heart Rate Summary ({range})</div>
            <div className="flex items-baseline justify-between">
              <span className="mono text-base font-bold text-blue-600 dark:text-blue-400">
                Avg: {stats.hr.avg} bpm
              </span>
              <span className="text-[11px] text-slate-400">
                Min: {stats.hr.min} · Max: {stats.hr.max}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-400 font-medium mb-1">Temperature Summary ({range})</div>
            <div className="flex items-baseline justify-between">
              <span className="mono text-base font-bold text-amber-600 dark:text-amber-400">
                Avg: {stats.temp.avg}°C
              </span>
              <span className="text-[11px] text-slate-400">
                Min: {stats.temp.min}°C · Max: {stats.temp.max}°C
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin-slow mb-2">⌛</div>
            <p>Loading historical records...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 text-sm">
            {error}
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No telemetry records found for this patient in the selected window.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Patient</th>
                <th>Device</th>
                <th>SpO₂ (%)</th>
                <th>Heart Rate (BPM)</th>
                <th>Body Temp (°C)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const s2 = classifySpO2(row.spo2);
                const hr = classifyHeartRate(row.heart_rate);
                const tp = classifyTemperature(row.temperature);
                const st = overallStatus(row.spo2, row.heart_rate, row.temperature);

                return (
                  <tr key={row.id || idx}>
                    <td className="mono text-xs text-slate-500">
                      {formatDateTime(row.timestamp)}
                    </td>
                    <td className="font-semibold text-slate-700 dark:text-slate-300">
                      {row.patient_id}
                    </td>
                    <td className="font-mono text-xs text-slate-400">
                      {row.device_id}
                    </td>
                    <td>
                      <span className={`mono font-bold ${
                        s2 === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
                        s2 === 'amber' ? 'text-amber-500' : 'text-red-500 font-extrabold'
                      }`}>
                        {Number(row.spo2).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`mono font-bold ${
                        hr === 'green' ? 'text-blue-600 dark:text-blue-400' :
                        hr === 'amber' ? 'text-amber-500' : 'text-red-500 font-extrabold'
                      }`}>
                        {Number(row.heart_rate).toFixed(0)} BPM
                      </span>
                    </td>
                    <td>
                      <span className={`mono font-bold ${
                        tp === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
                        tp === 'amber' ? 'text-amber-500' : 'text-red-500 font-extrabold'
                      }`}>
                        {Number(row.temperature).toFixed(2)}°C
                      </span>
                    </td>
                    <td>
                      <span className={`badge text-[10px] py-0.5 px-2 ${badgeClass(st)}`}>
                        {st}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.length)} of {data.length} records
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 text-xs"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>

          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
