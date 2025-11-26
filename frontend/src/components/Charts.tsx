// Chart components using Recharts
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Colors for charts
const COLORS = {
  primary: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: COLORS.warning,
  SENT: COLORS.primary,
  ACCEPTED: COLORS.success,
  REJECTED: COLORS.danger,
  CANCELLED: '#6b7280',
};

// Invoice status distribution (Pie Chart)
interface StatusDistributionProps {
  data: Array<{ name: string; value: number }>;
}

export function StatusDistributionChart({ data }: StatusDistributionProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS.primary} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Revenue trend (Line Chart)
interface RevenueTrendProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueTrendChart({ data }: RevenueTrendProps) {
  // Guard against empty or single-point data
  if (!data || data.length < 2) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-400">
        Nedovoljno podataka za prikaz trenda
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          className="text-gray-600 dark:text-gray-400"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          className="text-gray-600 dark:text-gray-400"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value.toLocaleString('sr-RS')} RSD`, 'Prihod']}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={COLORS.success}
          strokeWidth={2}
          dot={{ fill: COLORS.success, r: 4 }}
          activeDot={{ r: 6 }}
          name="Prihod"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Invoice count by month (Bar Chart)
interface MonthlyInvoicesProps {
  data: Array<{ month: string; created: number; sent: number; accepted: number }>;
}

export function MonthlyInvoicesChart({ data }: MonthlyInvoicesProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="month"
          className="text-gray-600 dark:text-gray-400"
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-gray-600 dark:text-gray-400" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="created" fill={COLORS.warning} name="Kreirano" radius={[4, 4, 0, 0]} />
        <Bar dataKey="sent" fill={COLORS.primary} name="Poslato" radius={[4, 4, 0, 0]} />
        <Bar dataKey="accepted" fill={COLORS.success} name="Prihvaćeno" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Mini trend chart (inline)
interface MiniTrendProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniTrendChart({ data, color = COLORS.primary, height = 40 }: MiniTrendProps) {
  // Guard against empty or single-point data which causes SVG path errors
  if (!data || data.length < 2) {
    return (
      <div style={{ width: '100%', height }} className="flex items-center justify-center text-gray-400 text-xs">
        Nedovoljno podataka
      </div>
    );
  }

  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}



