import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';

// 8 Required Pages
import Overview from './pages/Overview.jsx';
import LiveMonitoring from './pages/LiveMonitoring.jsx';
import PatientRecords from './pages/PatientRecords.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import HistoricalGraphs from './pages/HistoricalGraphs.jsx';
import Alerts from './pages/Alerts.jsx';
import DeviceStatus from './pages/DeviceStatus.jsx';
import Settings from './pages/Settings.jsx';

import api from './services/api.js';
import './App.css';
import { generateMockReading, MOCK_PATIENTS } from './utils/mockData.js';

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [selectedPatient, setSelectedPatient] = useState('P001');
  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [latestReading, setLatestReading] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'online' | 'offline' | 'connecting' | 'reconnecting'
  const [connectionError, setConnectionError] = useState(null);
  const [isDemo, setIsDemo] = useState(false); // Default to LIVE ESP32 hardware streaming mode!
  const failCountRef = useRef(0); // track consecutive failures before showing offline
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Stale detection
  const [isStale, setIsStale] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(null);

  const demoIntervalRef = useRef(null);

  // 1. Fetch Patients Registry
  const loadPatients = useCallback(async () => {
    try {
      const res = await api.getPatients();
      // Support both {data:[...]} and {success:true, data:[...]} response shapes
      const list = res.data || res;
      if (Array.isArray(list) && list.length > 0) {
        // Normalize: ensure every patient has a patient_id field
        const normalized = list.map(p => ({
          ...p,
          patient_id: p.patient_id || p.id,
        }));
        setPatients(normalized);
        // Auto-select first patient if current selection not in list
        const ids = normalized.map(p => p.patient_id);
        setSelectedPatient(prev => ids.includes(prev) ? prev : normalized[0].patient_id);
      }
    } catch {
      // Keep baseline mock list if offline
    }
  }, []);

  // 2. Fetch Latest Telemetry (Polled every 5 seconds per Section 5)
  const pollTelemetry = useCallback(async () => {
    if (isDemo) return;

    try {
      setLoading(true);
      const res = await api.getLatestReading(selectedPatient);
      // Support both {data:{...}} and {success:true, data:{...}} shapes
      const reading = res.data || res;
      if (reading && (reading.spo2 !== undefined || reading.heart_rate !== undefined)) {
        // Normalize field names from both telemetry table and health_readings table
        const normalized = {
          ...reading,
          heart_rate: reading.heart_rate,
          spo2: reading.spo2,
          temperature: reading.temperature,
          respiration_rate: reading.respiration_rate || 18,
          patient_id: reading.patient_id || selectedPatient,
          pulse_rate: reading.heart_rate,
          monitoring_status: reading.spo2 < 92 ? 'Low SpO₂ Alert' : (reading.temperature > 38 ? 'Elevated Temperature' : 'Normal Range'),
          status: {
            overall_status: reading.spo2 < 92 ? 'Warning' : (reading.temperature > 38 ? 'Attention' : 'Normal Range'),
            warnings: reading.spo2 < 92 ? ['Low SpO₂ alert'] : (reading.temperature > 38 ? ['Elevated temperature'] : []),
            sensor_errors: []
          }
        };
        setLatestReading(normalized);
        setIsStale(Boolean(reading.is_stale));
        setSecondsAgo(reading.seconds_since_reading ?? null);
        setConnectionStatus('online');
        failCountRef.current = 0;
        setConnectionError(null);
      }
    } catch (err) {
      // Increment failure count — only show offline after 3 consecutive failures
      failCountRef.current += 1;
      if (failCountRef.current >= 3) {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('reconnecting');
      }
      setConnectionError(null);
      const mock = generateMockReading(selectedPatient);
      setLatestReading(prev => ({
        ...(prev || {}),
        ...mock,
        monitoring_status: mock.spo2 < 92 ? 'Low SpO₂ Alert' : 'Normal Range',
        status: {
          overall_status: 'Normal Range',
          warnings: [],
          sensor_errors: []
        }
      }));
    } finally {
      setLoading(false);
    }

    // Also update alerts and device list
    try {
      const alertRes = await api.getAlerts(null, false);
      const alertList = alertRes.data || alertRes;
      if (Array.isArray(alertList)) setAlerts(alertList);

      const devRes = await api.getDevices();
      const devList = devRes.data || devRes;
      if (Array.isArray(devList) && devList.length > 0) {
        const currentDev = devList.find(d => d.patient_id === selectedPatient) || devList[0];
        setDeviceStatus(currentDev);
      }
    } catch {
      // Offline fallback
    }
  }, [selectedPatient, isDemo]);

  // Demo tick function (defined before effects)
  const startDemoTick = useCallback((patientId) => {
    const tick = () => {
      const mockReading = generateMockReading(patientId);
      setLatestReading({
        ...mockReading,
        pulse_rate: mockReading.heart_rate,
        monitoring_status: mockReading.spo2 < 92 ? 'Low SpO₂ Alert' : (mockReading.temperature > 38 ? 'Elevated Temperature' : 'Normal Range'),
        status: {
          overall_status: mockReading.spo2 < 92 ? 'Warning' : (mockReading.temperature > 38 ? 'Attention' : 'Normal Range'),
          warnings: mockReading.spo2 < 92 ? ['Low SpO₂ simulation alert'] : (mockReading.temperature > 38 ? ['Elevated body temperature simulation'] : []),
          sensor_errors: []
        }
      });
      setIsStale(false);
      setSecondsAgo(0);
      setDeviceStatus({
        device_id: 'ESP32-001',
        patient_id: patientId,
        is_online: true,
        status: 'ONLINE',
        last_seen: new Date().toISOString()
      });
    };
    tick();
    return setInterval(tick, 2000);
  }, []);

  // Initial load: fetch real patients and live telemetry immediately
  useEffect(() => {
    loadPatients();
    setConnectionStatus('connecting');
    pollTelemetry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling timer for real backend (polls every 3 seconds to match ESP32)
  useEffect(() => {
    if (isDemo) return;
    pollTelemetry();
    const interval = setInterval(pollTelemetry, 3000);
    return () => clearInterval(interval);
  }, [pollTelemetry, isDemo]);

  // Demonstration Mode Handler
  const handleToggleDemo = () => {
    if (isDemo) {
      // Stop Demo
      setIsDemo(false);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
      pollTelemetry();
    } else {
      // Start Demo
      setIsDemo(true);
      setConnectionStatus('online');
      setConnectionError(null);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = startDemoTick(selectedPatient);
    }
  };

  // Alert review handler
  const handleReviewAlert = (alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, reviewed: true, reviewed_at: new Date().toISOString() } : a));
  };

  const currentPatientObj = patients.find(p => p.patient_id === selectedPatient) || {
    patient_id: selectedPatient,
    name: 'Demonstration Patient',
    room_number: 'General Ward 101'
  };

  const unreviewedAlertsCount = alerts.filter(a => !a.reviewed).length;
  const isDeviceOnline = !isStale && (isDemo ? true : Boolean(deviceStatus?.is_online || deviceStatus?.status === 'ONLINE' || latestReading));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      {/* 1. Sidebar Navigation (8 Pages) */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        unreviewedAlertsCount={unreviewedAlertsCount}
        deviceOnline={isDeviceOnline}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* 2. Top Navbar */}
        <Navbar
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          connectionStatus={connectionStatus}
          isDemo={isDemo}
          onToggleDemo={handleToggleDemo}
          isStale={isStale}
          secondsAgo={secondsAgo}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* 3. Dynamic Page View */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activePage === 'overview' && (
            <Overview
              latestReading={latestReading}
              deviceStatus={deviceStatus}
              patient={currentPatientObj}
              onNavigate={setActivePage}
              isStale={isStale}
              secondsAgo={secondsAgo}
            />
          )}

          {activePage === 'live' && (
            <LiveMonitoring
              latestReading={latestReading}
              loading={loading}
              connectionError={connectionError}
              isStale={isStale}
              secondsAgo={secondsAgo}
              isDemo={isDemo}
              onRefresh={pollTelemetry}
            />
          )}

          {activePage === 'patients' && (
            <PatientRecords
              patients={patients}
              onSelectPatient={setSelectedPatient}
              onNavigateToDetail={() => setActivePage('patient_detail')}
              onNavigateToHistory={() => setActivePage('history')}
            />
          )}

          {activePage === 'patient_detail' && (
            <PatientDetail
              patientId={selectedPatient}
              onBack={() => setActivePage('patients')}
              onNavigateToHistory={() => setActivePage('history')}
            />
          )}

          {activePage === 'history' && (
            <HistoricalGraphs
              selectedPatient={selectedPatient}
            />
          )}

          {activePage === 'alerts' && (
            <Alerts
              alerts={alerts}
              onReviewAlert={handleReviewAlert}
              selectedPatient={selectedPatient}
            />
          )}

          {activePage === 'devices' && (
            <DeviceStatus />
          )}

          {activePage === 'settings' && (
            <Settings />
          )}
        </main>

        {/* 4. Academic Footer & Non-Diagnostic Notice */}
        <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-slate-700">
            Smart Patient Health Monitoring &bull; MCA Academic Project
          </div>
          <div className="text-[11px] text-slate-400">
            Educational IoT Healthcare Demonstration &bull; Real-time physiological vitals monitoring
          </div>
        </footer>
      </div>
    </div>
  );
}
