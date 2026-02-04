'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  Crown,
  DollarSign,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import React from 'react';

interface SummarySnapshotProps {
  data: {
    totalSpentThisMonth: number;
    mostActiveCategory: {
      name: string;
      percentage: number;
    };
    netBalance: number;
    topFriend: {
      name: string;
      amount: number;
    };
  } | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    text: string;
  };
  isLoading: boolean;
}

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, isLoading }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="h-full"
  >
    <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full ${color}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between h-full">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-white/80">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-white/20" />
            ) : (
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                {subtitle && (
                  <p className="text-sm text-white/70">{subtitle}</p>
                )}
              </div>
            )}
            {trend && !isLoading && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                {trend.type === 'up' ? 
                  <TrendingUp className="w-3 h-3" /> : 
                  trend.type === 'down' ?
                  <TrendingDown className="w-3 h-3" /> :
                  null
                }
                <span>{trend.text}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-white/20 rounded-2xl">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function SummarySnapshot({ data, isLoading }: SummarySnapshotProps) {
  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  };

  const getBalanceInfo = (balance: number) => {
    if (balance > 0) {
      return {
        value: formatCurrency(balance),
        subtitle: "You're owed",
        color: "bg-gradient-to-br from-emerald-500 to-green-600",
        trend: { type: 'up' as const, text: 'Positive balance' }
      };
    } else if (balance < 0) {
      return {
        value: formatCurrency(balance),
        subtitle: "You owe",
        color: "bg-gradient-to-br from-orange-500 to-red-600",
        trend: { type: 'down' as const, text: 'Outstanding balance' }
      };
    } else {
      return {
        value: "₹0",
        subtitle: "All settled up",
        color: "bg-gradient-to-br from-blue-500 to-cyan-600",
        trend: { type: 'neutral' as const, text: 'Balanced' }
      };
    }
  };

  const balanceInfo = data ? getBalanceInfo(data.netBalance) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-violet-400" />
        <h2 className="text-xl font-semibold text-white">
          Financial Pulse
        </h2>
        <span className="text-sm text-slate-400">
          Your money at a glance
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Total Spent This Month */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.05 }}
  >
    <StatCard
      title="This Month"
      value={data ? formatCurrency(data.totalSpentThisMonth) : "₹0"}
      subtitle="Total spent"
      icon={DollarSign}
      color="bg-gradient-to-br from-purple-500 to-indigo-600"
      isLoading={isLoading}
    />
  </motion.div>

  {/* Most Active Category */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.1 }}
    whileHover={{ scale: 1.05 }}
  >
    <StatCard
      title="Top Category"
      value={data?.mostActiveCategory.name || "No data"}
      subtitle={data ? `${data.mostActiveCategory.percentage}% of expenses` : ""}
      icon={Crown}
      color="bg-gradient-to-br from-pink-500 to-rose-600"
      isLoading={isLoading}
    />
  </motion.div>

  {/* Net Balance */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.2 }}
    whileHover={{ scale: 1.05 }}
  >
    <StatCard
      title="Net Balance"
      value={balanceInfo?.value || "₹0"}
      subtitle={balanceInfo?.subtitle || ""}
      icon={Scale}
      color={balanceInfo?.color || "bg-gradient-to-br from-blue-500 to-cyan-600"}
      trend={balanceInfo?.trend}
      isLoading={isLoading}
    />
  </motion.div>

  {/* Top Friend */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.3 }}
    whileHover={{ scale: 1.05 }}
  >
    <StatCard
      title="Top Expense Buddy"
      value={data?.topFriend.name || "No shared expenses"}
      subtitle={data ? formatCurrency(data.topFriend.amount) : ""}
      icon={Users}
      color="bg-gradient-to-br from-teal-500 to-cyan-600"
      isLoading={isLoading}
    />
  </motion.div>
</div>

    </div>
  );
}
