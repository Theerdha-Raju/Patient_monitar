import { Activity, Wifi, WifiOff, RefreshCw, Moon, Sun, Cpu, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="mono text-sm text-slate-500 dark:text-slate-400 tabular-nums">
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      &nbsp;·&nbsp;
      {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  );
}

export default function Header({
  patients, selectedPatient, onSelectPatient,
  wsStatus, isMock, setMock,
  darkMode, setDarkMode
}) {
  const [open, setOpen] = useState(false);
  const currentPt = patients.find(p => p.patient_id === selectedPatient);

  const statusMeta = {
    live:         { icon: <Wifi size={13}/>,         label: 'Live',         cls: 'text-emerald-600 dark:text-emerald-400' },
    polling:      { icon: <RefreshCw size={13}/>,    label: 'Polling',      cls: 'text-amber-500' },
    reconnecting: { icon: <RefreshCw size={13} className="animate-spin-slow"/>, label: 'Reconnecting', cls: 'text-amber-500' },
    mock:         { icon: <Cpu size={13}/>,          label: 'Demo Mode',    cls: 'text-purple-500' },
  };
  const sm = statusMeta[wsStatus] || statusMeta.reconnecting;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow">
            <Activity size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none text-slate-900 dark:text-white">Smart Health Monitoring System</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">IoT Telemetry Dashboard</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clock */}
        <div className="hidden md:flex"><Clock /></div>

        {/* WS status */}
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
          wsStatus === 'live' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' :
          wsStatus === 'mock' ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40' :
          'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
        } ${sm.cls}`}>
          {sm.icon}
          <span>{sm.label}</span>
          {wsStatus === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        </div>

        {/* Mock toggle */}
        <button
          onClick={() => setMock(!isMock)}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            isMock
              ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
          }`}
        >
          {isMock ? '⏹ Stop Demo' : '▶ Demo Mode'}
        </button>

        {/* Patient selector */}
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200
                       hover:border-blue-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {currentPt ? `${currentPt.name} (${selectedPatient})` : selectedPatient}
            <ChevronDown size={14} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-60 card shadow-xl border z-50 py-1 animate-slide-in">
              {patients.map(p => (
                <button
                  key={p.patient_id}
                  onClick={() => { onSelectPatient(p.patient_id); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                    p.patient_id === selectedPatient ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg">
                    {p.status === 'Critical' ? '🔴' : p.status === 'Warning' ? '🟡' : '🟢'}
                  </span>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.room_number} · {p.patient_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                     flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
