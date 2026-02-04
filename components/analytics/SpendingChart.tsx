'use client';

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface SpendingData {
  total_spent: number;
  category?: string;
  subcategory?: string;
  timeframe?: string;
}

interface SpendingChartProps {
  data: SpendingData;
  chartType?: 'pie' | 'bar' | 'line';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function SpendingChart({ data, chartType = 'pie' }: SpendingChartProps) {
  // Sample data for demonstration - in real implementation, this would come from props
  const categoryData = [
    { name: 'Food', value: data.total_spent * 0.4, color: '#FF6B6B' },
    { name: 'Transport', value: data.total_spent * 0.3, color: '#4ECDC4' },
    { name: 'Entertainment', value: data.total_spent * 0.2, color: '#45B7D1' },
    { name: 'Other', value: data.total_spent * 0.1, color: '#96CEB4' },
  ];

  const weeklyData = [
    { week: 'Week 1', amount: data.total_spent * 0.2 },
    { week: 'Week 2', amount: data.total_spent * 0.3 },
    { week: 'Week 3', amount: data.total_spent * 0.25 },
    { week: 'Week 4', amount: data.total_spent * 0.25 },
  ];

  if (chartType === 'pie') {
    return (
      <div className="w-full h-64 bg-gray-800 rounded-lg p-4">
        <h3 className="text-white text-lg font-semibold mb-4">Spending Breakdown</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'bar') {
    return (
      <div className="w-full h-64 bg-gray-800 rounded-lg p-4">
        <h3 className="text-white text-lg font-semibold mb-4">Weekly Spending</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-gray-800 rounded-lg p-4">
      <h3 className="text-white text-lg font-semibold mb-4">Spending Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
