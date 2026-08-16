import React, { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface SalesChartProps {
  data: DataPoint[];
  title?: string;
  valueLabel?: string;
  currency?: boolean;
  // Kalau true: bar warna-warni pastel dengan bar tertinggi disorot oranye
  // (dipakai di Dashboard Admin). Kalau false (default): tetap solid oranye
  // seperti sebelumnya - dipakai di Super Admin, tidak berubah.
  colorful?: boolean;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PASTEL_COLORS = ['#f9a8d4', '#93c5fd', '#86efac', '#fde68a', '#c4b5fd', '#a5f3fc', '#fdba74'];
const HIGHLIGHT_COLOR = '#f97316';

export default function SalesChart({ data, title = 'Grafik', valueLabel = 'Nilai', currency = true, colorful = false }: SalesChartProps) {
  const [mode, setMode] = useState<'bulanan' | 'tahunan'>('bulanan');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set<number>(data.map(d => new Date(d.date).getFullYear()));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const chartData = useMemo(() => {
    if (mode === 'bulanan') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const buckets: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) buckets[d] = 0;
      data.forEach(d => {
        const date = new Date(d.date);
        if (date.getFullYear() === selectedYear && date.getMonth() === selectedMonth) {
          buckets[date.getDate()] = (buckets[date.getDate()] || 0) + d.value;
        }
      });
      return Object.entries(buckets).map(([day, value]) => ({ label: day, value }));
    }
    const buckets: Record<number, number> = {};
    for (let m = 0; m < 12; m++) buckets[m] = 0;
    data.forEach(d => {
      const date = new Date(d.date);
      if (date.getFullYear() === selectedYear) {
        buckets[date.getMonth()] = (buckets[date.getMonth()] || 0) + d.value;
      }
    });
    return Object.entries(buckets).map(([m, value]) => ({ label: BULAN[Number(m)], value }));
  }, [data, mode, selectedMonth, selectedYear]);

  const total = chartData.reduce((acc, d) => acc + d.value, 0);
  const maxIndex = useMemo(() => {
    if (chartData.length === 0) return -1;
    let idx = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].value > chartData[idx].value) idx = i;
    }
    return chartData[idx].value > 0 ? idx : -1;
  }, [chartData]);

  const cardBorder = colorful ? 'border-slate-100' : 'border-gray-100';
  const activeToggleBg = colorful ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${cardBorder} p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setMode('bulanan')}
              className={`px-3 py-1.5 font-medium transition-colors ${mode === 'bulanan' ? `${activeToggleBg} text-white` : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setMode('tahunan')}
              className={`px-3 py-1.5 font-medium transition-colors ${mode === 'tahunan' ? `${activeToggleBg} text-white` : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Bulanan
            </button>
          </div>
          {mode === 'bulanan' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            >
              {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
            </select>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Total periode ini: <span className="font-bold text-gray-900">
          {currency ? `Rp ${total.toLocaleString('id-ID')}` : total.toLocaleString('id-ID')}
        </span>
      </p>

      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => currency ? `${(v / 1000).toFixed(0)}rb` : String(v)} width={45} />
            <Tooltip formatter={(v: number) => currency ? [`Rp ${v.toLocaleString('id-ID')}`, valueLabel] : [v, valueLabel]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#f97316">
              {colorful && chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === maxIndex ? HIGHLIGHT_COLOR : PASTEL_COLORS[index % PASTEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
