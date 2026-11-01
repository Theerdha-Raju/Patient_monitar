import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Layers,
  Activity,
  Trash2
} from 'lucide-react';
import api from '../services/api.js';

export default function DeviceStatus() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.getDevices();
      setDevices(res.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to query devices', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOffline = async () => {
    try {
      await api.cleanupOfflineDevices();
      fetchDevices();
    } catch (err) {
      console.error('Failed to cleanup offline devices', err);
    }
  };

  const handleDeleteDevice = async (deviceId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await api.deleteDevice(deviceId);
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete device', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (ts) => {
    if (!ts) return 'Never received';
    try {
      return new Date(ts).toLocaleString('en-GB', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              ESP32 Telemetry Hardware Fleet Status
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {devices.length} Nodes Configured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active heartbeat monitoring &bull; Automated 30-second disconnection timeout detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          {devices.some((d) => !d.is_online) && (
            <button
              onClick={handleCleanupOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
              title="Remove stale/offline devices"
            >
              <Trash2 size={13} />
              <span>Clear Offline ({devices.filter((d) => !d.is_online).length})</span>
            </button>
          )}

          <button
            onClick={fetchDevices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Disconnection Warning Notice (Section 4) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-700 text-xs flex items-start gap-3">
        <Activity size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-slate-900 block">Strict Connectivity Rule</strong>
          <p className="leading-relaxed">
            The dashboard does <strong>not</strong> assume an ESP32 is online merely because the web page is open. An ESP32 is marked <strong className="text-emerald-700 font-bold">ONLINE</strong> only when valid telemetry was received within the last 30 seconds. If no data arrives for over 30 seconds, it is marked <strong className="text-red-700 font-bold">OFFLINE</strong>.
          </p>
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.length === 0 ? (
          /* Fallback Demo Device Card when backend is offline */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-slate-300 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3 text-slate-500">
              <Cpu size={20} className="text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-700">No device telemetry available from backend</p>
                <p className="text-xs text-slate-400 mt-0.5">Start the FastAPI backend and send data from ESP32 to see real device status cards here. Run: <code className="font-mono bg-slate-100 px-1 rounded">python run.py backend</code></p>
              </div>
            </div>
          </div>
        ) : null}
        {devices.map((dev) => {
          const isOnline = Boolean(dev.is_online);
          const sec = dev.seconds_since_last_seen;

          return (
            <div
              key={dev.device_id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all border-t-4 ${
                isOnline ? 'border-t-emerald-500 border-slate-200' : 'border-t-red-500 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h4 className="font-mono font-bold text-sm text-slate-900">{dev.device_id}</h4>
                      <p className="text-[11px] text-slate-400">Assigned: {dev.patient_id || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    {!isOnline && (
                      <button
                        onClick={(e) => handleDeleteDevice(dev.device_id, e)}
                        className="p-1 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                        title={`Remove ${dev.device_id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wi-Fi / LAN IP:</span>
                    <span className="font-mono font-semibold text-slate-800">{dev.ip_address || 'DHCP (Dynamic)'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Telemetry:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {sec !== null ? (sec < 5 ? 'Just now' : `${sec}s ago`) : 'Never'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Transmission Time:</span>
                    <span className="text-[11px] font-mono text-slate-600">{formatDateTime(dev.last_seen)}</span>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="mt-4 pt-2 flex items-center gap-2 text-xs">
                {isOnline ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <Wifi size={14} className="text-emerald-600" />
                    <span>Telemetry Active (Every 2–5s)</span>
                  </span>
                ) : (
                  <span className="text-red-700 font-semibold flex items-center gap-1.5">
                    <WifiOff size={14} className="text-red-600" />
                    <span>Offline: No signal for &gt; 30s</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
