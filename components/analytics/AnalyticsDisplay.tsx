'use client';

import React from 'react';
import { SpendingChart } from './SpendingChart';
import { AnalyticsTable } from './AnalyticsTable';

interface AnalyticsDisplayProps {
  data: {
    total_spent: number;
    category?: string;
    subcategory?: string;
    timeframe?: string;
  };
  showChart?: boolean;
  chartType?: 'pie' | 'bar' | 'line';
}

export function AnalyticsDisplay({ data, showChart = false, chartType = 'pie' }: AnalyticsDisplayProps) {
  const getAnalyticsType = () => {
    if (data.subcategory === 'coffee') return 'coffee';
    if (data.subcategory) return 'subcategory';
    if (data.category) return 'category';
    return 'total';
  };

  return (
    <div className="space-y-6">
      {/* Analytics Table */}
      <AnalyticsTable 
        data={data} 
        type={getAnalyticsType()}
      />
      
      {/* Chart Display */}
      {showChart && data.total_spent > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart data={data} chartType="pie" />
          <SpendingChart data={data} chartType="bar" />
        </div>
      )}
    </div>
  );
}
