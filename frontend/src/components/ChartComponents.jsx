import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function TemperatureChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm font-medium">
        No historical temperature telemetry available for this time range.
      </div>
    );
  }

  const labels = data.map(d => {
    const dt = new Date(d.timestamp);
    return !isNaN(dt.getTime())
      ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.timestamp;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Body Temperature (°C)',
        data: data.map(d => Number(d.temperature)),
        borderColor: '#0d9488', // Teal
        backgroundColor: 'rgba(13, 148, 136, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: data.length > 30 ? 1 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0d9488',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12 },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 10,
        callbacks: {
          label: (ctx) => ` Temperature: ${ctx.parsed.y.toFixed(2)} °C`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        min: 34.0,
        max: 41.0,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 10 },
          callback: (val) => `${val}°C`,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}


export function PulseRateChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm font-medium">
        No historical pulse rate telemetry available for this time range.
      </div>
    );
  }

  const labels = data.map(d => {
    const dt = new Date(d.timestamp);
    return !isNaN(dt.getTime())
      ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.timestamp;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Pulse Rate (BPM)',
        data: data.map(d => Number(d.pulse_rate || d.heart_rate)),
        borderColor: '#1e40af', // Navy Blue
        backgroundColor: 'rgba(30, 64, 175, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: data.length > 30 ? 1 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#1e40af',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12 },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 10,
        callbacks: {
          label: (ctx) => ` Pulse Rate: ${ctx.parsed.y.toFixed(0)} BPM`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 10 },
          callback: (val) => `${val} BPM`,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}


export function SpO2Chart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm font-medium">
        No historical SpO₂ telemetry available for this time range.
      </div>
    );
  }

  const labels = data.map(d => {
    const dt = new Date(d.timestamp);
    return !isNaN(dt.getTime())
      ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.timestamp;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Estimated SpO₂ (%)',
        data: data.map(d => Number(d.spo2)),
        borderColor: '#0284c7', // Sky / Cyan Blue
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: data.length > 30 ? 1 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0284c7',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12 },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 10,
        callbacks: {
          label: (ctx) => ` SpO₂: ${ctx.parsed.y.toFixed(1)} %`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        min: 80.0,
        max: 100.0,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 10 },
          callback: (val) => `${val}%`,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
