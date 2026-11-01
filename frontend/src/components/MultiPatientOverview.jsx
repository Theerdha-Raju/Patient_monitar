import React from 'react';
import { User, Bed, Heart, Activity, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { classifySpO2, classifyHeartRate, classifyTemperature, overallStatus, badgeClass, formatTimestamp, secondsAgo } from '../utils/vitals.js';

export default function MultiPatientOverview({
  patients = [],
  latestByPt = {},
  selectedPatient,
  onSelectPatient,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Ward Patients Overview</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {patients.length} Active Patients
            </span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
                        Real-time status of all monitored patients — click any card to open detailed telemetry
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {patients.map((patient) => {
          const pid = patient.patient_id;
          const isSelected = pid === selectedPatient;

          // Merge latest from hook or patient model
          const latest = latestByPt[pid] || patient.latest_reading || {};
          const spo2 = latest.spo2 ?? null;
          const hr = latest.heart_rate ?? null;
          const temp = latest.temperature ?? null;

          const s2 = classifySpO2(spo2);
          const h = classifyHeartRate(hr);
          const t = classifyTemperature(temp);
          const st = latest.status?.overall_status || overallStatus(spo2, hr, temp);

          const secAgo = secondsAgo(latest.timestamp);

          return (
            <div
              key={pid}
              onClick={() => onSelectPatient(pid)}
              className={`patient-tile relative group cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md border-blue-300 dark:border-blue-700'
                  : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header: Name, Room, Status Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {patient.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Bed size={12} />
                    <span>{patient.room_number} · {pid}</span>
                  </div>
                </div>

                <span className={`badge text-[10px] shrink-0 ${badgeClass(st)}`}>
                  {st}
                </span>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-3 text-center">
                {/* SpO2 */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">SpO₂</div>
                  <div className={`mono font-bold text-sm ${
                    s2 === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
                    s2 === 'amber' ? 'text-amber-500' :
                    s2 === 'red' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {spo2 !== null ? `${Number(spo2).toFixed(1)}%` : '—'}
                  </div>
                </div>

                {/* Heart Rate */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Heart Rate</div>
                  <div className={`mono font-bold text-sm ${
                    h === 'green' ? 'text-blue-600 dark:text-blue-400' :
                    h === 'amber' ? 'text-amber-500' :
                    h === 'red' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {hr !== null ? `${Number(hr).toFixed(0)} bpm` : '—'}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Temp</div>
                  <div className={`mono font-bold text-sm ${
                    t === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
                    t === 'amber' ? 'text-amber-500' :
                    t === 'red' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {temp !== null ? `${Number(temp).toFixed(1)}°C` : '—'}
                  </div>
                </div>
              </div>

              {/* Footer info: last seen and detail cue */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  {secAgo !== null ? (secAgo < 5 ? 'Just now' : `${secAgo}s ago`) : 'No data yet'}
                </span>

                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform text-[11px]">
                  <span>Detail</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
