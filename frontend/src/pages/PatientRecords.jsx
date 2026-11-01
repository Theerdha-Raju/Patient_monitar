import React, { useState } from 'react';
import {
  Users,
  Search,
  Calendar,
  Thermometer,
  Heart,
  Activity,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle
} from 'lucide-react';

export default function PatientRecords({
  patients = [],
  onSelectPatient,
  onNavigateToDetail,
  onNavigateToHistory
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      p.patient_id.toLowerCase().includes(q) ||
      (p.name && p.name.toLowerCase().includes(q))
    );
  });

  const formatTime = (ts) => {
    if (!ts) return 'No data';
    try {
      return new Date(ts).toLocaleString('en-GB', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Current Date';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              Patient Records Registry
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {patients.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pseudonymous patient observation logs &bull; Academic health monitoring records
          </p>
        </div>

        {/* Search by Patient ID */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient ID (e.g. PATIENT-001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Subject Name / Pseudonym</th>
                <th className="py-3 px-4">Admission Date</th>
                <th className="py-3 px-4">Latest Temp (°C)</th>
                <th className="py-3 px-4">Latest Pulse (BPM)</th>
                <th className="py-3 px-4">Latest SpO₂ (%)</th>
                <th className="py-3 px-4">Last Reading Time</th>
                <th className="py-3 px-4">Monitoring Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const latest = patient.latest_reading || (
                    (patient.heart_rate !== null && patient.heart_rate !== undefined) ? {
                      temperature: patient.temperature,
                      heart_rate: patient.heart_rate,
                      pulse_rate: patient.pulse_rate || patient.heart_rate,
                      spo2: patient.spo2,
                      timestamp: patient.last_telemetry_at || patient.timestamp
                    } : null
                  );
                  const isDemoPatient = patient.patient_id === 'PATIENT-001' || (patient.name && patient.name.includes('Demonstration'));
                  const isStale = patient.is_stale;

                  return (
                    <tr key={patient.patient_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Patient ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{patient.patient_id}</span>
                          {isDemoPatient && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded border border-purple-200" title="Demonstration Patient">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name / Room */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{patient.name}</div>
                        <div className="text-[10px] text-slate-400">{patient.room_number}</div>
                      </td>

                      {/* Admission Date */}
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {formatDate(patient.admission_date || patient.quarantine_start_date)}
                      </td>

                      {/* Latest Temp */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {latest ? `${Number(latest.temperature).toFixed(2)} °C` : '—'}
                      </td>

                      {/* Latest Pulse */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {latest ? `${Number(latest.pulse_rate || latest.heart_rate).toFixed(0)} BPM` : '—'}
                      </td>

                      {/* Latest SpO2 */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {latest ? `${Number(latest.spo2).toFixed(1)} %` : '—'}
                      </td>

                      {/* Last Reading Timestamp */}
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-500">
                        {latest ? formatTime(latest.timestamp) : '—'}
                      </td>

                      {/* Monitoring Status & Stale Pill */}
                      <td className="py-3 px-4">
                        {isStale ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={10} />
                            Stale Telemetry
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={10} />
                            {patient.monitoring_status || 'Normal Range'}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              onSelectPatient(patient.patient_id);
                              onNavigateToDetail();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              onSelectPatient(patient.patient_id);
                              onNavigateToHistory();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            Graphs
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
