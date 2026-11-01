import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  ShieldAlert,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Server
} from 'lucide-react';
import api from '../services/api.js';

export default function Settings() {
  const [thresholds, setThresholds] = useState({
    spo2_normal_min: 95.0,
    spo2_warning_min: 92.0,
    pulse_normal_min: 60.0,
    pulse_normal_max: 100.0,
    pulse_warning_max: 120.0,
    temp_normal_min: 36.1,
    temp_normal_max: 37.2,
    temp_warning_max: 38.0,
    stale_timeout_sec: 30
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.getSettings();
        if (res.thresholds) {
          setThresholds(res.thresholds);
        }
      } catch (err) {
        console.warn('Using baseline client thresholds');
      }

      try {
        const healthRes = await api.checkHealth();
        setApiHealth(healthRes);
      } catch {
        setApiHealth({ status: 'offline' });
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key, val) => {
    setThresholds(prev => ({
      ...prev,
      [key]: Number(val)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings({
        spo2_min_normal: thresholds.spo2_normal_min,
        spo2_warning_low: thresholds.spo2_warning_min,
        pulse_min_normal: thresholds.pulse_normal_min,
        pulse_max_normal: thresholds.pulse_normal_max,
        pulse_warning_high: thresholds.pulse_warning_max,
        temp_min_normal: thresholds.temp_normal_min,
        temp_max_normal: thresholds.temp_normal_max,
        temp_warning_max: thresholds.temp_warning_max,
        stale_timeout_seconds: thresholds.stale_timeout_sec
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save thresholds to backend');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <SettingsIcon size={22} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            System Configuration & Demonstration Thresholds
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure baseline alert boundaries, stale data timeouts, and REST gateway integration
          </p>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Disclaimer Box */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-sm block">Academic Project Non-Diagnostic Notice</strong>
          <p className="leading-relaxed">
            These thresholds are configured for educational demonstration and simulation evaluation in this MCA IoT engineering project.
            <strong> This system does not diagnose or confirm any medical condition.</strong> Sensor-based threshold warnings must not be construed as clinical medical advice.
          </p>
        </div>
      </div>

      {/* Threshold Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-teal-600" />
            <h4 className="text-sm font-bold text-slate-800">Demonstration Threshold Parameters</h4>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle size={13} />
              Saved to Backend
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SpO2 Thresholds */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <h5 className="text-xs font-bold uppercase tracking-wider text-teal-700">
              SpO₂ Saturation (%)
            </h5>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Normal Minimum Target (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.spo2_normal_min}
                onChange={(e) => handleChange('spo2_normal_min', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Default: ≥ 95.0%</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Warning Threshold (&lt; %)
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.spo2_warning_min}
                onChange={(e) => handleChange('spo2_warning_min', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Default: &lt; 92.0%</span>
            </div>
          </div>

          {/* Pulse Rate Thresholds */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <h5 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Pulse Rate (BPM)
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Normal Min
                </label>
                <input
                  type="number"
                  value={thresholds.pulse_normal_min}
                  onChange={(e) => handleChange('pulse_normal_min', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Normal Max
                </label>
                <input
                  type="number"
                  value={thresholds.pulse_normal_max}
                  onChange={(e) => handleChange('pulse_normal_max', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                High Pulse Warning (&gt; BPM)
              </label>
              <input
                type="number"
                value={thresholds.pulse_warning_max}
                onChange={(e) => handleChange('pulse_warning_max', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Default: &gt; 120 BPM</span>
            </div>
          </div>

          {/* Body Temperature Thresholds */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Temperature (°C)
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Normal Min
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.temp_normal_min}
                  onChange={(e) => handleChange('temp_normal_min', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Normal Max
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.temp_normal_max}
                  onChange={(e) => handleChange('temp_normal_max', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fever Warning (&gt; °C)
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.temp_warning_max}
                onChange={(e) => handleChange('temp_warning_max', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Default: &gt; 38.0 °C</span>
            </div>
          </div>
        </div>

        {/* Timeout Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="text-xs font-bold text-slate-800 block">
              ESP32 Stale Data Disconnection Timeout
            </label>
            <p className="text-xs text-slate-500">
              Mark device as Offline and flag readings as stale if no telemetry frame is received within this window.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={thresholds.stale_timeout_sec}
              onChange={(e) => handleChange('stale_timeout_sec', e.target.value)}
              className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
            />
            <span className="text-xs text-slate-500 font-semibold">seconds</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Save size={14} />
            <span>{saving ? 'Updating Backend...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
