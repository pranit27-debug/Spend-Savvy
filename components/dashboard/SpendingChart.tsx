import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion"; // ✅ import motion
import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface Transaction {
  id: string;
  category: string;
  amount: number;
  created_date: string;
}

interface SpendingChartsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export default function SpendingCharts({ transactions, isLoading }: SpendingChartsProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  if (isLoading) return <p>Loading charts...</p>;

  // Category-wise spend
  const categoryData = Object.values(
    transactions.reduce((acc: any, tx) => {
      if (!acc[tx.category]) acc[tx.category] = { name: tx.category, value: 0 };
      acc[tx.category].value += tx.amount;
      return acc;
    }, {})
  );

  // Weekly spend (group by week number)
  const weeklyData = Object.values(
    transactions.reduce((acc: any, tx) => {
      const week = new Date(tx.created_date).toLocaleDateString("en-US", {
        // week is not standard → fallback to month+week grouping if needed
        month: "short",
        day: "numeric",
      });
      if (!acc[week]) acc[week] = { week, value: 0 };
      acc[week].value += tx.amount;
      return acc;
    }, {})
  );

  const COLORS = ["#FF3B30", "#34C759", "#007AFF", "#AF52DE", "#FF9500"];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Custom tooltip component with white background
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-gray-800 font-medium">
            {label || data.payload.name}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold text-purple-600">
              ${data.value.toFixed(2)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Spend by Category */}
      <motion.div
        whileHover={{ 
          scale: 1.03, 
          y: -5,
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="shadow-lg hover:shadow-2xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Spend by Category</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {categoryData.map((_, index) => (
                    <Cell 
                      key={index} 
                      fill={COLORS[index % COLORS.length]}
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                        transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Spend */}
      <motion.div
        whileHover={{ 
          scale: 1.03, 
          y: -5,
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="shadow-lg hover:shadow-2xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Weekly Spend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                <XAxis dataKey="week" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
