import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Users,
  UserCheck,
  LineChart,
  Bell,
  Cpu,
  Settings,
  ShieldCheck,
  ChevronRight,
  Wifi,
  WifiOff,
  Heart,
  X
} from 'lucide-react';

export default function Sidebar({
  activePage,
  onNavigate,
  unreviewedAlertsCount = 0,
  deviceOnline = false,
  isMobileOpen = false,
  onCloseMobile
}) {
  const navItems = [
    {
      section: 'MONITORING',
      items: [
        { id: 'overview',        label: 'Dashboard Overview',    icon: LayoutDashboard,  desc: 'Main summary view' },
        { id: 'live',            label: 'Live Monitoring',       icon: Activity,         desc: 'Real-time vitals' },
        { id: 'history',         label: 'Historical Graphs',     icon: LineChart,        desc: 'Chart.js trends' },
      ]
    },
    {
      section: 'PATIENTS',
      items: [
        { id: 'patients',        label: 'Patient Records',       icon: Users,            desc: 'Registry & search' },
        { id: 'patient_detail',  label: 'Patient Details',       icon: UserCheck,        desc: 'Individual profile' },
      ]
    },
    {
      section: 'SYSTEM',
      items: [
        {
          id: 'alerts',
          label: 'Monitoring Alerts',
          icon: Bell,
          desc: 'Threshold warnings',
          badge: unreviewedAlertsCount > 0 ? String(unreviewedAlertsCount) : null,
          badgeStyle: 'bg-amber-500 text-white'
        },
        {
          id: 'devices',
          label: 'ESP32 Device Status',
          icon: Cpu,
          desc: 'Hardware health',
          badge: deviceOnline ? 'Online' : 'Offline',
          badgeStyle: deviceOnline
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-red-100 text-red-700 border border-red-200'
        },
        { id: 'settings',        label: 'Settings',              icon: Settings,         desc: 'Thresholds & config' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64
        bg-gradient-to-b from-[#f0fdfa] via-[#f8fafc] to-[#f0fdfa]/60
        border-r border-teal-100
        flex flex-col
        shadow-lg shadow-teal-900/5
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* ── Brand Header ── */}
        <div className="px-5 py-4 border-b border-teal-100/70 bg-white/70 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-500/25 shrink-0">
              <Heart size={18} className="text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Smart Health</h1>
              <p className="text-[11px] text-teal-600 font-semibold mt-0.5">Monitoring System</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navItems.map(({ section, items }) => (
            <div key={section}>
              {/* Section Label */}
              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400/80"></span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800/70">
                  {section}
                </p>
              </div>

              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`
                        w-full flex items-center justify-between
                        px-3 py-2.5 rounded-xl
                        text-left text-xs font-semibold
                        transition-all duration-150 group
                        ${isActive
                          ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-600/20'
                          : 'text-slate-700 hover:bg-white hover:text-teal-900 hover:shadow-xs border border-transparent hover:border-teal-100/70'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon container */}
                        <div className={`
                          w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all
                          ${isActive
                            ? 'bg-white/20 text-white shadow-xs'
                            : 'bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white border border-teal-100/60'
                          }
                        `}>
                          <Icon size={15} />
                        </div>

                        {/* Label + description */}
                        <div className="min-w-0">
                          <div className={`leading-tight truncate ${isActive ? 'text-white font-bold' : 'text-slate-800 group-hover:text-teal-950 font-medium'}`}>
                            {item.label}
                          </div>
                          <div className={`text-[10px] leading-tight mt-0.5 truncate ${
                            isActive ? 'text-teal-100 font-normal' : 'text-slate-400 group-hover:text-teal-600'
                          }`}>
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      {/* Right side: badge or active chevron */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeStyle}`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <ChevronRight size={14} className="text-white/90" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── ESP32 Status Card ── */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border border-teal-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-teal-700" />
              <span className="text-[11px] font-bold text-slate-800">ESP32 Hardware</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              deviceOnline
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${deviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {deviceOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="space-y-1 text-[10px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>Sensors</span>
              <span className="font-semibold text-teal-800">MAX30102 + DS18B20</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Node</span>
              <span className="font-mono font-semibold text-slate-700">ESP32-DevKit V1</span>
            </div>
          </div>
        </div>

        {/* ── Academic Disclaimer Footer ── */}

      </aside>
    </>
  );
}
