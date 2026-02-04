'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Tag, Coffee } from 'lucide-react';

interface AnalyticsTableProps {
  data: {
    total_spent: number;
    category?: string;
    subcategory?: string;
    timeframe?: string;
  };
  type: 'coffee' | 'category' | 'subcategory' | 'total';
}

export function AnalyticsTable({ data, type }: AnalyticsTableProps) {
  const timeframeText = data.timeframe ? data.timeframe.replace('_', ' ') : 'Till Date';
  
  const getIcon = () => {
    switch (type) {
      case 'coffee': return <Coffee className="w-5 h-5 text-yellow-600" />;
      case 'category': return <Tag className="w-5 h-5 text-blue-600" />;
      case 'subcategory': return <Tag className="w-5 h-5 text-purple-600" />;
      default: return <DollarSign className="w-5 h-5 text-green-600" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'coffee': return 'Coffee Analysis';
      case 'category': return `${data.category?.charAt(0).toUpperCase()}${data.category?.slice(1)} Analysis`;
      case 'subcategory': return `${data.subcategory?.charAt(0).toUpperCase()}${data.subcategory?.slice(1)} Analysis`;
      default: return 'Spending Analysis';
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {getIcon()}
        <h3 className="text-xl font-bold text-white">{getTitle()}</h3>
      </div>

      {/* Main Stats Grid - Only Essential Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gray-300">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-white">${data.total_spent.toFixed(2)}</p>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Period</span>
          </div>
          <p className="text-lg font-semibold text-white capitalize">{timeframeText}</p>
        </div>
      </div>

      {/* Category Info - Only if available */}
      {data.category && (
        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Category</span>
          </div>
          <p className="text-lg text-white">
            {data.category}
            {data.subcategory && (
              <span className="text-gray-400"> → {data.subcategory}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
