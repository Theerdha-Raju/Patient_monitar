import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../utils/vitals.js';

export default function DeviceHealth({ isMock, latestByPt = {} }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDevices = async () => {
    if (isMock) {
      // Mock devices mapped to latest telemetry
      const mockDevs = [
        { device_id: 'esp32-01', patient_id: 'P001', patient_name: 'John Doe (Ward 101)', ip_address: '192.168.1.101', status: 'ONLINE' },
        { device_id: 'esp32-02', patient_id: 'P002', patient_name: 'Elena Rostova', ip_address: '192.168.1.102', status: 'ONLINE' },
        { device_id: 'esp32-03', patient_id: 'P003', patient_name: 'Marcus Vance', ip_address: '192.168.1.103', status: 'ONLINE' },
        { device_id: 'esp32-04', patient_id: 'P004', patient_name: 'Aisha Sharma', ip_address: '192.168.1.104', status: 'ONLINE' },
      ].map((d) => {
        const latest = latestByPt[d.patient_id];
        const lastSeen = latest?.timestamp || new Date().toISOString();
        const secAgo = Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000));
        const isOffline = secAgo > 30;
        return {
          ...d,
          last_seen: lastSeen,
          seconds_since_last_seen: secAgo,
          is_offline: isOffline,
          health_status: isOffline ? 'OFFLINE' : 'HEALTHY',
          warning: isOffline ? 'No data for > 30s' : null,
        };
      });
      setDevices(mockDevs);
      setLastRefreshed(new Date());
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      if (res.ok) {
        const json = await res.json();
        setDevices(json.data || []);
      }
    } catch (_) {
      // fallback
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchDevices();
    const timer = setInterval(fetchDevices, 4000);
    return () => clearInterval(timer);
  }, [isMock, latestByPt]);

  const onlineCount = devices.filter(d => !d.is_offline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Cpu size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              ESP32 Sensor Hardware Fleet Status
              {offlineCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {offlineCount} Offline
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Heartbeat monitor with automated 30-second sensor disconnection timeout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin-slow' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {devices.map((dev) => {
          const isOffline = dev.is_offline || (dev.seconds_since_last_seen !== null && dev.seconds_since_last_seen > 30);
          const sec = dev.seconds_since_last_seen ?? 0;

          return (
            <div
              key={dev.device_id}
              className={`p-4 rounded-xl border transition-all ${
                isOffline
                  ? 'border-red-300 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30'
                  : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="mono font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Cpu size={14} className={isOffline ? 'text-red-500' : 'text-emerald-500'} />
                    {dev.device_id}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Patient: {dev.patient_id} ({dev.patient_name || 'Assigned'})
                  </div>
                </div>

                <span className={`badge text-[10px] px-2 py-0.5 ${
                  isOffline
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}>
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>

              {/* Status details */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between text-slate-500">
                  <span>IP Address:</span>
                  <span className="mono font-medium text-slate-700 dark:text-slate-300">{dev.ip_address || 'DHCP (Dynamic)'}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Last Transmission:</span>
                  <span className="mono font-semibold text-slate-700 dark:text-slate-300">
                    {sec < 5 ? 'Just now' : `${sec}s ago`}
                  </span>
                </div>

                {isOffline && (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-[11px] bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg mt-2">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>Warning: No data for &gt; 30s</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
