import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { DollarSign, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface StatCardProps {
  title: string;
  value: string;
icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: {
    type: 'up' | 'down';
    text: string;
  };
  isLoading: boolean;
}

const StatCard = ({ title, value, icon: Icon, color, trend, isLoading }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    whileHover={{ 
      scale: 1.05, 
      y: -5,
      boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)"
    }}
  >
    <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 ${color}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/80">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-white/20" />
            ) : (
              <p className="text-2xl font-bold text-white">{value}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                {trend.type === 'up' ? 
                  <TrendingUp className="w-3 h-3" /> : 
                  <TrendingDown className="w-3 h-3" />
                }
                <span>{trend.text}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-white/20 rounded-2xl shadow-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface QuickStatsProps {
  balanceData: {
    youOwe: number;
    owedToYou: number;
    netBalance: number;
  };
  totalTransactions: number;
  totalGroups: number;
  isLoading: boolean;
}

export default function QuickStats({ balanceData, totalTransactions, totalGroups, isLoading }: QuickStatsProps) {
  const formatAmount = (amount: number) => {
    return amount >= 0 ? `$${Math.abs(amount).toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="You Owe"
        value={formatAmount(balanceData.youOwe)}
        icon={TrendingUp}
        color="bg-gradient-to-br from-red-500 to-pink-600"
        isLoading={isLoading}
      />

      <StatCard
        title="Owed to You"
        value={formatAmount(balanceData.owedToYou)}
        icon={TrendingDown}
        color="bg-gradient-to-br from-emerald-500 to-green-600"
        isLoading={isLoading}
      />

      <StatCard
        title="Net Balance"
        value={formatAmount(balanceData.netBalance)}
        icon={DollarSign}
        color={`bg-gradient-to-br ${balanceData.netBalance >= 0 ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-red-600'}`}
        isLoading={isLoading}
      />

      <StatCard
        title="Total Expenses"
        value={totalTransactions.toString()}
        icon={Receipt}
        color="bg-gradient-to-br from-purple-500 to-indigo-600"
        isLoading={isLoading}
      />
    </div>
  );
}
