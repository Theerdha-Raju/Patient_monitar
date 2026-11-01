import React, { useState, useEffect } from 'react';
import {
  User,
  Bed,
  Calendar,
  Thermometer,
  Heart,
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  History,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import api from '../services/api.js';

export default function PatientDetail({
  patientId = 'PATIENT-001',
  onBack,
  onNavigateToHistory
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPatientDetail(patientId);
        if (active) {
          setPatient(res.data);
        }
      } catch (err) {
        if (active) {
          setError(`Unable to retrieve patient details for ${patientId}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDetail();
    return () => { active = false; };
  }, [patientId]);

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
        <div className="animate-spin inline-block mb-2">⌛</div>
        <p>Loading patient observation record...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center text-red-700 text-sm space-y-3">
        <AlertTriangle size={24} className="mx-auto text-red-500" />
        <p className="font-semibold">{error || 'Patient record not found'}</p>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
        >
          Back to Patient Records
        </button>
      </div>
    );
  }

  const latest = patient.latest_reading || (
    (patient.heart_rate !== null && patient.heart_rate !== undefined) ? {
      temperature: patient.temperature,
      heart_rate: patient.heart_rate,
      pulse_rate: patient.pulse_rate || patient.heart_rate,
      spo2: patient.spo2,
      respiration_rate: patient.respiration_rate,
      timestamp: patient.last_telemetry_at || patient.timestamp
    } : {}
  );
  const isDemo = patient.patient_id === 'PATIENT-001' || (patient.name && patient.name.includes('Demonstration'));
  const isStale = patient.is_stale;
  const recentList = patient.recent_readings || [];

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'Not Recorded';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Return to Patient Records"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {patient.patient_id}
              </span>
              {isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200 flex items-center gap-1">
                  <Sparkles size={10} />
                  DEMO PATIENT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Isolation Location: {patient.room_number} &bull; Gender: {patient.gender || 'Unspecified'} &bull; Age: {patient.age || '45'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToHistory}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <History size={14} />
          <span>View Interactive Graphs</span>
        </button>
      </div>

      {/* Patient Profile & Admission Details Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Admission Date</span>
          <span className="font-semibold text-slate-800">{formatDateOnly(patient.admission_date || patient.quarantine_start_date)}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Monitoring Day</span>
          <span className="font-bold text-teal-700">Day {patient.monitoring_day || patient.quarantine_day || 1}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Comorbidities</span>
          <span className="font-semibold text-slate-800 truncate block" title={patient.comorbidities || 'None'}>
            {patient.comorbidities || 'None'}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Emergency Contact</span>
          <span className="font-mono text-slate-700">{patient.contact_emergency || 'N/A'}</span>
        </div>
      </div>

      {/* Latest Vitals Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Temp */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs border-t-4 border-t-teal-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Latest Temperature</span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">Target: 36.1 - 37.2°C</span>
          </div>
          <div className="my-2 flex items-baseline gap-1 font-mono text-4xl font-black text-slate-900">
            {latest.temperature !== undefined ? `${Number(latest.temperature).toFixed(2)}` : '—'}
            <span className="text-lg font-bold text-slate-400">°C</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Recorded: {formatDateTime(latest.timestamp)}
          </div>
        </div>

        {/* Pulse */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Latest Pulse Rate</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Target: 60 - 100 BPM</span>
          </div>
          <div className="my-2 flex items-baseline gap-1 font-mono text-4xl font-black text-slate-900">
            {latest.heart_rate !== undefined ? `${Number(latest.heart_rate).toFixed(0)}` : '—'}
            <span className="text-lg font-bold text-slate-400">BPM</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Recorded: {formatDateTime(latest.timestamp)}
          </div>
        </div>

        {/* SpO2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Latest Estimated SpO₂</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Target: ≥ 95%</span>
          </div>
          <div className="my-2 flex items-baseline gap-1 font-mono text-4xl font-black text-slate-900">
            {latest.spo2 !== undefined ? `${Number(latest.spo2).toFixed(1)}` : '—'}
            <span className="text-lg font-bold text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Recorded: {formatDateTime(latest.timestamp)}
          </div>
        </div>
      </div>

      {/* Observation Status & Telemetry Freshness */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Telemetry Freshness & Observation Status
          </span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
            isStale
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {isStale ? 'STALE TELEMETRY' : 'CURRENT & ACTIVE'}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isStale
            ? `Telemetry is marked stale because no frame has been received from the ESP32 in over 30 seconds. Historical entries remain logged in PostgreSQL.`
            : `The ESP32 microcontroller is streaming active telemetry frames into PostgreSQL every 5 seconds.`}
        </p>
      </div>

      {/* Recent Historical Log Table for this Patient */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recent Telemetry Frames (Last 10 Measurements)
          </h4>
          <span className="text-xs text-slate-400 font-mono">PostgreSQL Time-Series</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4">Frame Timestamp</th>
                <th className="py-2.5 px-4">Device ID</th>
                <th className="py-2.5 px-4">Temperature (°C)</th>
                <th className="py-2.5 px-4">Pulse Rate (BPM)</th>
                <th className="py-2.5 px-4">SpO₂ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No historical readings stored yet for this patient.
                  </td>
                </tr>
              ) : (
                recentList.map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{formatDateTime(row.timestamp)}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{row.device_id}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{Number(row.temperature).toFixed(2)} °C</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{Number(row.pulse_rate || row.heart_rate).toFixed(0)} BPM</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{Number(row.spo2).toFixed(1)} %</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
