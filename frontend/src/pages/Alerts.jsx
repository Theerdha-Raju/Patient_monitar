import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  ShieldCheck,
  Check,
  Filter,
  Info
} from 'lucide-react';
import api from '../services/api.js';

export default function Alerts({
  alerts = [],
  onReviewAlert,
  selectedPatient
}) {
  const [filterPatientOnly, setFilterPatientOnly] = useState(false);
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'health' | 'sensor'
  const [reviewingId, setReviewingId] = useState(null);

  const handleReview = async (alertId) => {
    setReviewingId(alertId);
    try {
      await api.reviewAlert(alertId, 'Clinical Monitor Operator');
      if (onReviewAlert) onReviewAlert(alertId);
    } catch (err) {
      console.error('Failed to review alert', err);
    } finally {
      setReviewingId(null);
    }
  };

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

  // Filter list
  const filtered = alerts.filter(a => {
    if (filterPatientOnly && a.patient_id !== selectedPatient) return false;
    if (unreviewedOnly && a.reviewed) return false;

    const isSensorError = (a.metric && a.metric.toLowerCase().includes('sensor')) ||
                          (a.message && a.message.toLowerCase().includes('sensor'));

    if (activeTab === 'health' && isSensorError) return false;
    if (activeTab === 'sensor' && !isSensorError) return false;
    return true;
  });

  const unreviewedCount = alerts.filter(a => !a.reviewed).length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.reviewed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Health Monitoring Warnings & Sensor Alerts
              </h3>
              {unreviewedCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {unreviewedCount} Awaiting Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated threshold violation detector &bull; Educational demonstration purposes only
            </p>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setUnreviewedOnly(!unreviewedOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                unreviewedOnly
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {unreviewedOnly ? 'Showing Unreviewed Only' : 'All Alerts'}
            </button>

            <button
              onClick={() => setFilterPatientOnly(!filterPatientOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                filterPatientOnly
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterPatientOnly ? `Patient: ${selectedPatient}` : 'All Patients'}
            </button>
          </div>
        </div>

        {/* Category Tabs: Separate Sensor Errors from Health Warnings (Section 8) */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Notifications ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'health' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Health-Related Warnings
          </button>
          <button
            onClick={() => setActiveTab('sensor')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'sensor' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hardware & Sensor Errors
          </button>
        </div>
      </div>

      {/* Educational Non-Diagnostic Notice (Section 8) */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-sm">Educational Monitoring Disclaimer</strong>
          <p className="leading-relaxed">
            Alerts on this page are generated for academic demonstration and simulation observation. They do <strong>not</strong> detect, diagnose, or predict any medical condition. Clinical decisions must always be guided by qualified healthcare professionals using certified medical diagnostic instruments.
          </p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="font-bold text-slate-700 text-sm">No Active Monitoring Alerts</p>
            <p className="text-xs text-slate-400 mt-1">
              All validated sensor telemetry parameters remain within demonstration target ranges.
            </p>
          </div>
        ) : (
          filtered.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isReviewed = Boolean(alert.reviewed);

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border bg-white shadow-xs transition-all flex flex-wrap items-start justify-between gap-4 ${
                  isCrit && !isReviewed
                    ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/20'
                    : !isReviewed
                    ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/15'
                    : 'border-l-4 border-l-slate-300 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCrit ? (
                      <AlertOctagon size={18} className="text-red-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">
                        {alert.patient_id} ({alert.metric})
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        Value: {alert.value}
                      </span>
                      {isReviewed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check size={10} />
                          Reviewed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 pt-1">
                      <span>Triggered: {formatDateTime(alert.timestamp)}</span>
                      {isReviewed && alert.reviewed_at && (
                        <span>&bull; Reviewed at: {formatDateTime(alert.reviewed_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mark as Reviewed Button (Section 8) */}
                {!isReviewed && (
                  <button
                    onClick={() => handleReview(alert.id)}
                    disabled={reviewingId === alert.id}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 text-xs font-bold shadow-2xs transition-all shrink-0"
                  >
                    {reviewingId === alert.id ? 'Saving...' : 'Mark as Reviewed'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
