import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  ChevronDown,
  User,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({
  patients = [],
  selectedPatient,
  onSelectPatient,
  connectionStatus = 'connecting', // 'online' | 'offline' | 'connecting' | 'demo'
  isDemo = false,
  onToggleDemo,
  isStale = false,
  secondsAgo = null,
  onOpenMobileSidebar,
}) {
  const [clock, setClock] = useState(new Date());
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activePatientObj = patients.find(p => p.patient_id === selectedPatient) || {
    patient_id: selectedPatient,
    name: 'Demonstration Patient',
    room_number: 'General Ward 101'
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Titles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Smart Health Monitoring System
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              IoT-Based Health Monitoring System
            </p>
          </div>
        </div>

        {/* Right: Telemetry Health, Clock, Demo Toggle, Patient Picker */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-end">
          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            <Clock size={13} className="text-slate-400" />
            <span>
              {clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500 font-sans">
              {clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          </div>

          {/* Stale Warning Pill */}
          {isStale && !isDemo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Stale Data ({secondsAgo !== null ? `${secondsAgo}s` : '>30s'})</span>
            </div>
          )}

          {/* ESP32 Hardware Live Stream Status Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            isDemo
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : isStale
              ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
              : connectionStatus === 'online'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : (connectionStatus === 'connecting' || connectionStatus === 'reconnecting')
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {isDemo ? (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Simulation Demo</span>
              </>
            ) : isStale ? (
              <>
                <WifiOff size={14} className="text-red-600" />
                <span>ESP32 Disconnected ({secondsAgo !== null ? `${secondsAgo}s ago` : '>15s'})</span>
              </>
            ) : connectionStatus === 'online' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-700 font-extrabold">ESP32 Live Stream {secondsAgo !== null ? `(${secondsAgo}s ago)` : ''}</span>
              </>
            ) : (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') ? (
              <>
                <RefreshCw size={13} className="text-blue-600 animate-spin" />
                <span>Connecting to Server...</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-red-600" />
                <span>Backend Offline</span>
              </>
            )}
          </div>

          {/* Demonstration Mode Switcher */}
          <button
            onClick={onToggleDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              isDemo
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
            }`}
          >
            {isDemo ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            <span>{isDemo ? 'Stop Demo' : 'Demo Mode'}</span>
          </button>

          {/* Patient Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              <User size={13} className="text-teal-600" />
              <span className="max-w-[120px] truncate">{activePatientObj.name}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {patientDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Select Patient
                </div>
                {patients.map((p) => (
                  <button
                    key={p.patient_id}
                    onClick={() => {
                      onSelectPatient(p.patient_id);
                      setPatientDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                      p.patient_id === selectedPatient ? 'bg-teal-50/70 text-teal-800 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.patient_id} · {p.room_number}</div>
                    </div>
                    {p.patient_id === selectedPatient && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
