import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Volume2, VolumeX, Bell, Check, Filter } from 'lucide-react';
import { formatTimestamp, formatDateTime } from '../utils/vitals.js';

// Web Audio synthesizer beep
function playAudioBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.12); // D6 note

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // AudioContext blocked or not allowed until user interaction
  }
}

export default function AlertsPanel({ alerts = [], onAcknowledgeAlert, selectedPatient }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterPatientOnly, setFilterPatientOnly] = useState(false);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [localAcknowledged, setLocalAcknowledged] = useState({});

  const prevAlertCount = useRef(alerts.length);

  // Beep when a new critical alert arrives
  useEffect(() => {
    if (alerts.length > prevAlertCount.current) {
      const newest = alerts[0];
      if (newest && newest.severity === 'CRITICAL' && soundEnabled) {
        playAudioBeep();
      }
    }
    prevAlertCount.current = alerts.length;
  }, [alerts, soundEnabled]);

  const handleAcknowledge = async (alertId) => {
    setLocalAcknowledged(prev => ({ ...prev, [alertId]: true }));
    if (onAcknowledgeAlert) {
      await onAcknowledgeAlert(alertId);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterPatientOnly && a.patient_id !== selectedPatient) return false;
    const isAck = a.acknowledged || localAcknowledged[a.id];
    if (unresolvedOnly && isAck) return false;
    return true;
  });

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged && !localAcknowledged[a.id]).length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING' && !a.acknowledged && !localAcknowledged[a.id]).length;

  return (
    <div className="card p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Clinical Alerts & Breaches
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  {criticalCount} Critical
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Automated threshold violation detector with audible alert trigger
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Disable audio alerts' : 'Enable audio alerts'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition-colors ${
              soundEnabled
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          {/* Unresolved Filter Toggle */}
          <button
            onClick={() => setUnresolvedOnly(!unresolvedOnly)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              unresolvedOnly
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {unresolvedOnly ? 'Active Only' : 'All Alerts'}
          </button>

          {/* Patient Filter */}
          <button
            onClick={() => setFilterPatientOnly(!filterPatientOnly)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              filterPatientOnly
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {filterPatientOnly ? `Only ${selectedPatient}` : 'All Patients'}
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] custom-scroll pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500/70" />
            <p className="text-sm font-medium">No Active Clinical Alerts</p>
            <p className="text-xs text-slate-400 mt-1">All physiological parameters remain within normal target safety bounds</p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const isAck = alert.acknowledged || localAcknowledged[alert.id];
            const isCrit = alert.severity === 'CRITICAL';

            return (
              <div
                key={alert.id || alert._key || idx}
                className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                  isCrit && !isAck
                    ? 'border-red-300 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40 animate-pulse'
                    : alert.severity === 'WARNING' && !isAck
                    ? 'border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-75'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isCrit ? (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCrit ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {alert.patient_id} ({alert.metric})
                      </span>
                      <span className="mono font-semibold text-slate-700 dark:text-slate-300">
                        Value: {alert.value}
                        {alert.metric === 'SpO2' ? '%' : alert.metric === 'Temperature' ? '°C' : ' BPM'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      {alert.message}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{formatDateTime(alert.timestamp)}</span>
                      {isAck && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check size={11} /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acknowledge Button */}
                {!isAck && (
                  <button
                    onClick={() => handleAcknowledge(alert.id || alert._key)}
                    className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Showing {filteredAlerts.length} events</span>
        <div className="flex items-center gap-3">
          <span className="text-red-500 font-medium">{criticalCount} Critical</span>
          <span className="text-amber-500 font-medium">{warningCount} Warnings</span>
        </div>
      </div>
    </div>
  );
}
