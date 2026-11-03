import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMockReadingsForAllPatients } from '../utils/mockData.js';
import { classifySpO2, classifyHeartRate, classifyTemperature, overallStatus } from '../utils/vitals.js';

const rawEnvBackend = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
const cleanEnvHost = rawEnvBackend.replace(/^https?:\/\//, '').replace(/\/+$/, '');
const isCleanEnvHostValid = cleanEnvHost && !cleanEnvHost.includes('xxxx') && !cleanEnvHost.includes('localhost');

const BACKEND_HOST = isCleanEnvHostValid
  ? cleanEnvHost
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? 'patient-monitar-dldf.onrender.com'
    : (typeof window !== 'undefined' ? window.location.host : 'localhost:5000');

const WS_URL = `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'}://${BACKEND_HOST}/ws`;
const POLL_MS  = 3000;
const MAX_PTS  = 150; // max history points kept in state

/**
 * useRealtimeFeed — manages WebSocket + polling fallback + mock mode.
 *
 * Returns:
 *   readings      — map of patient_id -> array of reading objects (latest last)
 *   latestByPt    — map of patient_id -> most recent reading
 *   alerts        — array of alert objects (newest first)
 *   wsStatus      — 'live' | 'polling' | 'reconnecting' | 'mock'
 *   isMock        — boolean
 *   setMock       — toggle mock mode
 */
export function useRealtimeFeed(selectedPatient) {
  const [isMock,       setMockState]   = useState(false);
  const [wsStatus,     setWsStatus]    = useState('reconnecting');
  const [readings,     setReadings]    = useState({});
  const [latestByPt,   setLatestByPt]  = useState({});
  const [alerts,       setAlerts]      = useState([]);

  const wsRef       = useRef(null);
  const pollRef     = useRef(null);
  const mockRef     = useRef(null);
  const retryCount  = useRef(0);
  const isMockRef   = useRef(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  const appendReading = useCallback((r) => {
    setReadings(prev => {
      const pid  = r.patient_id;
      const arr  = prev[pid] ? [...prev[pid]] : [];
      arr.push(r);
      if (arr.length > MAX_PTS) arr.splice(0, arr.length - MAX_PTS);
      return { ...prev, [pid]: arr };
    });
    setLatestByPt(prev => ({ ...prev, [r.patient_id]: r }));
  }, []);

  const appendAlerts = useCallback((newAlerts) => {
    if (!newAlerts || newAlerts.length === 0) return;
    setAlerts(prev => {
      const merged = [...newAlerts.map(a => ({ ...a, _key: `${a.metric}-${a.timestamp || Date.now()}` })), ...prev];
      return merged.slice(0, 100);
    });
  }, []);

  // ── Mock mode ─────────────────────────────────────────────────────────────

  const startMock = useCallback(() => {
    stopAll();
    setWsStatus('mock');

    function tick() {
      const readings = generateMockReadingsForAllPatients();
      readings.forEach(r => {
        const s2 = classifySpO2(r.spo2);
        const h  = classifyHeartRate(r.heart_rate);
        const t  = classifyTemperature(r.temperature);
        r.status = { spo2_status: s2, heart_rate_status: h, temperature_status: t, overall_status: overallStatus(r.spo2, r.heart_rate, r.temperature) };
        appendReading(r);

        // generate mock alerts
        const alerts = [];
        if (r.spo2 < 92) alerts.push({ patient_id: r.patient_id, metric: 'SpO2', value: r.spo2, severity: 'CRITICAL', message: `Critical Hypoxia: SpO2 ${r.spo2}%`, timestamp: r.timestamp, id: Math.random() });
        else if (r.spo2 < 95) alerts.push({ patient_id: r.patient_id, metric: 'SpO2', value: r.spo2, severity: 'WARNING', message: `Low SpO2: ${r.spo2}%`, timestamp: r.timestamp, id: Math.random() });
        if (r.temperature > 38) alerts.push({ patient_id: r.patient_id, metric: 'Temperature', value: r.temperature, severity: 'CRITICAL', message: `High Fever: ${r.temperature}°C`, timestamp: r.timestamp, id: Math.random() });
        if (r.heart_rate > 120) alerts.push({ patient_id: r.patient_id, metric: 'Heart Rate', value: r.heart_rate, severity: 'CRITICAL', message: `Tachycardia: ${r.heart_rate} BPM`, timestamp: r.timestamp, id: Math.random() });
        appendAlerts(alerts);
      });
    }

    tick();
    mockRef.current = setInterval(tick, 2000);
  }, [appendReading, appendAlerts]);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (isMockRef.current) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setWsStatus('reconnecting');

      ws.onopen = () => {
        retryCount.current = 0;
        setWsStatus('live');
        stopPolling();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'NEW_READING' && msg.data) {
            appendReading(msg.data);
            appendAlerts(msg.alerts);
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        if (isMockRef.current) return;
        setWsStatus('polling');
        startPolling();
        // exponential back-off reconnect
        const delay = Math.min(30000, 1000 * Math.pow(1.5, retryCount.current++));
        setTimeout(connectWS, delay);
      };

      ws.onerror = () => ws.close();
    } catch (_) {
      setWsStatus('polling');
      startPolling();
    }
  }, [appendReading, appendAlerts]);

  // ── Polling fallback ──────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (isMockRef.current) return;
      try {
        // Fetch latest for all known patients
        const res  = await fetch('/api/patients');
        if (!res.ok) return;
        const json = await res.json();
        const pts  = json.data || [];
        for (const p of pts) {
          if (p.latest_reading) appendReading({ ...p.latest_reading, patient_id: p.patient_id, status: p.vitals_status });
        }
        // Also fetch recent alerts
        const ar = await fetch('/api/alerts?unresolved_only=true');
        if (ar.ok) { const aj = await ar.json(); appendAlerts(aj.data || []); }
      } catch (_) {}
    }, POLL_MS);
  }, [appendReading, appendAlerts]);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const stopMock    = () => { if (mockRef.current)  { clearInterval(mockRef.current);  mockRef.current  = null; } };
  const stopAll     = () => {
    stopPolling(); stopMock();
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  };

  // ── Toggle mock ───────────────────────────────────────────────────────────

  const setMock = useCallback((enabled) => {
    isMockRef.current = enabled;
    setMockState(enabled);
    if (enabled) {
      startMock();
    } else {
      stopAll();
      setWsStatus('reconnecting');
      connectWS();
    }
  }, [startMock, connectWS]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial: try WebSocket, fall back to polling
    connectWS();
    return () => stopAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial data load for selected patient ───────────────────────────────

  useEffect(() => {
    if (isMock) return;
    fetch(`/api/readings?patient_id=${selectedPatient}&limit=150`)
      .then(r => r.json())
      .then(j => {
        (j.data || []).forEach(r => appendReading({ ...r, patient_id: selectedPatient }));
      })
      .catch(() => {});
  }, [selectedPatient, isMock]); // eslint-disable-line react-hooks/exhaustive-deps

  return { readings, latestByPt, alerts, wsStatus, isMock, setMock };
}
