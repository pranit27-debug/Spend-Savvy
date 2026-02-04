import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

const groupColorClasses: Record<string, string> = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600",
  pink: "from-pink-500 to-pink-600",
  indigo: "from-indigo-500 to-indigo-600",
  red: "from-red-500 to-red-600",
  yellow: "from-yellow-500 to-yellow-600",
};

interface Group {
  id: string;
  name: string;
  color?: string;
  members?: string[];
  created_date?: string;
  memberCount?: number;
  totalExpenses?: number;
}

interface Transaction {
  id: string;
  group_id?: string;
  group_name?: string;
  amount: number;
  created_date: string;
}

interface TopGroupsProps {
  groups: Group[];
  transactions: Transaction[];
  isLoading: boolean;
}

export default function TopGroups({ groups, transactions, isLoading }: TopGroupsProps) {
  const getGroupStats = (groupId: string) => {
    const groupTransactions = transactions.filter((t) => t.group_id === groupId);
    return {
      totalExpenses: groupTransactions.reduce((sum, t) => sum + t.amount, 0),
      expenseCount: groupTransactions.length,
      recentActivity:
        groupTransactions.length > 0
          ? new Date(
              Math.max(...groupTransactions.map((t) => new Date(t.created_date).getTime()))
            )
          : null,
    };
  };

  const groupsWithExpenses = groups
    .map((group) => {
      const stats = getGroupStats(group.id);
      return {
        ...group,
        ...stats,
        memberCount: group.memberCount || group.members?.length || 0,
      };
    })
    .filter((group) => group.expenseCount > 0 || group.memberCount > 0)
    .sort((a, b) => {
      if (b.totalExpenses !== a.totalExpenses) {
        return b.totalExpenses - a.totalExpenses;
      }
      const aTime = a.recentActivity?.getTime() || 0;
      const bTime = b.recentActivity?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const getGroupColor = (index: number) => {
    const colors = ["blue", "green", "purple", "orange", "pink", "indigo", "red", "yellow"];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="w-full"
    >
      <Card className="shadow-lg hover:shadow-2xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-emerald-400" />
            Active Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <Skeleton className="w-12 h-12 rounded-full bg-gray-600" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2 bg-gray-600" />
                      <Skeleton className="h-3 w-16 bg-gray-600" />
                    </div>
                    <Skeleton className="h-4 w-12 bg-gray-600" />
                  </div>
                ))}
            </div>
          ) : groupsWithExpenses.length > 0 ? (
            <div className="space-y-3">
              {groupsWithExpenses.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.03, 
                    y: -2,
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 hover:shadow-lg transition-all duration-200 cursor-pointer group/item border border-gray-600/50 hover:border-violet-500/50"
                  onClick={() => (window.location.href = `/groups/${group.id}`)}
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${
                      groupColorClasses[group.color || getGroupColor(index)]
                    } flex items-center justify-center shadow-lg group-hover/item:scale-110 group-hover/item:shadow-xl transition-all duration-200`}
                  >
                    <span className="text-white font-bold text-lg">
                      {group.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate group-hover/item:text-violet-400 transition-colors">
                      {group.name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Users className="w-3 h-3" />
                      <span>{group.memberCount} members</span>
                      {group.expenseCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{group.expenseCount} expenses</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {group.totalExpenses > 0 ? (
                      <>
                        <div className="font-bold text-white">
                          ${group.totalExpenses.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">total spent</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">No expenses yet</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-300 font-medium">No active groups</p>
              <p className="text-xs text-gray-400 mt-1">
                Create a group to start splitting expenses
              </p>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 8px 25px rgba(139, 92, 246, 0.3)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => (window.location.href = "/groups")}
                className="mt-3 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 hover:shadow-lg transition-all duration-200"
              >
                View Groups
              </motion.button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
