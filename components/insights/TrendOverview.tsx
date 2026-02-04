'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TrendOverviewProps {
  trends: Array<{
    week: string;
    amount: number;
  }>;
  isLoading: boolean;
}

const TrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-600">
        <p className="text-sm font-medium text-gray-200">{`Week of ${label}`}</p>
        <p className="text-sm text-violet-400">
          <span className="font-semibold">₹{payload[0].value.toLocaleString('en-IN')}</span>
        </p>
      </div>
    );
  }
  return null;
};

const getSpendingInsight = (trends: Array<{ week: string; amount: number }>) => {
  if (trends.length < 2) return "Start logging expenses to see trends!";
  
  const latest = trends[trends.length - 1]?.amount || 0;
  const previous = trends[trends.length - 2]?.amount || 0;
  
  if (latest > previous * 1.2) {
    return "📈 Spending increased significantly this week";
  } else if (latest < previous * 0.8) {
    return "📉 Great job reducing expenses this week!";
  } else {
    return "📊 Steady spending pattern - you're consistent!";
  }
};

const findPeakWeek = (trends: Array<{ week: string; amount: number }>) => {
  if (trends.length === 0) return null;
  
  const peak = trends.reduce((max, current) => 
    current.amount > max.amount ? current : max
  );
  
  return {
    week: peak.week,
    amount: peak.amount,
    isHigh: peak.amount > (trends.reduce((sum, t) => sum + t.amount, 0) / trends.length) * 1.5
  };
};

export default function TrendOverview({ trends, isLoading }: TrendOverviewProps) {
  const insight = getSpendingInsight(trends);
  const peak = findPeakWeek(trends);

  if (isLoading) {
    return (
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <CardTitle className="text-gray-200">Spending Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
            <Skeleton className="h-64 w-full bg-gray-700/50" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 group relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              <CardTitle className="text-gray-200">Spending Trends</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Last 4 weeks</span>
            </div>
          </div>
          
          {/* AI Insight */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 p-3 bg-violet-900/30 rounded-lg border border-violet-700/30"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-sm text-gray-300 font-medium">{insight}</p>
          </motion.div>
        </CardHeader>
        
        <CardContent className="relative">
          {trends.length > 0 ? (
            <div className="space-y-6">
              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#colorGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Peak Highlight */}
              {peak && peak.isHigh && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-3 bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-lg border border-amber-700/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <p className="text-sm text-amber-300">
                      <span className="font-medium">Peak spending:</span> ₹{peak.amount.toLocaleString('en-IN')} 
                      during week of {peak.week} 🎯
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600/30">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Average</p>
                  <p className="text-lg font-semibold text-gray-200">
                    ₹{trends.length > 0 ? Math.round(trends.reduce((sum, t) => sum + t.amount, 0) / trends.length).toLocaleString('en-IN') : '0'}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600/30">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Highest</p>
                  <p className="text-lg font-semibold text-gray-200">
                    ₹{trends.length > 0 ? Math.max(...trends.map(t => t.amount)).toLocaleString('en-IN') : '0'}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600/30">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total</p>
                  <p className="text-lg font-semibold text-gray-200">
                    ₹{trends.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-64 flex items-center justify-center text-gray-400"
            >
              <div className="text-center space-y-3">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-600" />
                <div>
                  <p className="font-medium text-gray-300">No trend data yet</p>
                  <p className="text-sm text-gray-500">Start adding expenses to see your spending patterns</p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
