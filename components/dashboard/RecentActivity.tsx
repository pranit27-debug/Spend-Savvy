import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Clock, Receipt, Users } from "lucide-react";
import { useState } from "react";

const categoryColors: Record<string, string> = {
  food: "bg-orange-500/30 !text-white border-orange-400/50 hover:bg-orange-500/40 hover:!text-white",
  transport: "bg-blue-500/30 !text-white border-blue-400/50 hover:bg-blue-500/40 hover:!text-white",
  entertainment: "bg-purple-500/30 !text-white border-purple-400/50 hover:bg-purple-500/40 hover:!text-white",
  shopping: "bg-pink-500/30 !text-white border-pink-400/50 hover:bg-pink-500/40 hover:!text-white",
  utilities: "bg-green-500/30 !text-white border-green-400/50 hover:bg-green-500/40 hover:!text-white",
  travel: "bg-cyan-500/30 !text-white border-cyan-400/50 hover:bg-cyan-500/40 hover:!text-white",
  healthcare: "bg-red-500/30 !text-white border-red-400/50 hover:bg-red-500/40 hover:!text-white",
  education: "bg-indigo-500/30 !text-white border-indigo-400/50 hover:bg-indigo-500/40 hover:!text-white",
  other: "bg-gray-500/30 !text-white border-gray-400/50 hover:bg-gray-500/40 hover:!text-white"
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  partial: "bg-orange-900/50 text-orange-300 border-orange-700",
  paid: "bg-green-900/50 text-green-300 border-green-700"
};

interface Participant {
  email: string;
  share: number;
  paid: boolean;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  payer: string;
  participants?: Participant[];
  category: string;
  group_id?: string;
  created_date: string;
  status: string;
}

interface Group {
  id: string;
  name: string;
}

interface User {
  email: string;
}

interface RecentActivityProps {
  transactions: Transaction[];
  currentUser: User | null;
  groups: Group[];
  isLoading: boolean;
}

export default function RecentActivity({ transactions, currentUser, groups, isLoading }: RecentActivityProps) {
  const [showAll, setShowAll] = useState(false);

  const getGroupName = (groupId?: string) => {
    const group = groupId ? groups.find(g => g.id === groupId) : null;
    return group?.name || "Personal";
  };

  const getTransactionType = (transaction: Transaction) => {
    if (transaction.payer === currentUser?.email) {
      return { type: "paid", icon: ArrowUpRight, text: "You paid" };
    } else {
      const userParticipant = transaction.participants?.find(p => p.email === currentUser?.email);
      if (userParticipant) {
        return { type: "owe", icon: ArrowDownLeft, text: "You owe" };
      }
    }
    return { type: "neutral", icon: Clock, text: "Involved" };
  };

  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5); // default 5

  return (
    <Card className="shadow-lg hover:shadow-2xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            Recent Activity
          </CardTitle>
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            Last 30 days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-700/50">
                <Skeleton className="w-12 h-12 rounded-full bg-gray-600" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-600" />
                  <Skeleton className="h-3 w-1/2 bg-gray-600" />
                </div>
                <Skeleton className="h-6 w-16 bg-gray-600" />
              </div>
            ))
        ) : (
          <>
            <AnimatePresence>
              {displayedTransactions.map((transaction, index) => {
                const transactionType = getTransactionType(transaction);
                const userShare =
                  transaction.participants?.find(p => p.email === currentUser?.email)?.share || 0;

                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.02, 
                      y: -2,
                      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)"
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700/70 hover:shadow-lg transition-all duration-200 border border-gray-600/50 hover:border-violet-500/50 cursor-pointer"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold">
                          {transaction.description?.charAt(0)?.toUpperCase() || "E"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center shadow-lg border border-gray-600">
                        <transactionType.icon className="w-3 h-3 text-gray-300" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {transaction.description}
                        </h3>
                        <Badge 
                          className={`${categoryColors[transaction.category]} transition-all duration-150 font-medium hover:scale-105 hover:shadow-lg cursor-pointer [&:hover]:!text-violet-300`} 
                          variant="outline"
                          style={{ color: 'white' }}
                        >
                          {transaction.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-3 h-3" />
                        <span 
                          className="hover:text-violet-300 hover:underline transition-colors duration-200 cursor-pointer"
                        >
                          {getGroupName(transaction.group_id)}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(transaction.created_date), "MMM d")}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white">${transaction.amount?.toFixed(2)}</div>
                      {transactionType.type === "owe" && (
                        <div className="text-sm text-red-400 font-medium">
                          You owe ${userShare?.toFixed(2)}
                        </div>
                      )}
                      <Badge className={statusColors[transaction.status]} variant="outline">
                        {transaction.status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show More / Show Less button */}
            {transactions.length > 5 && (
              <div className="flex justify-center mt-2">
                <button
                  className="text-violet-400 text-sm font-medium hover:text-violet-300 hover:underline transition-colors"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show Less" : "Show More"}
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && transactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No expenses yet</h3>
            <p className="text-gray-400">Start by adding your first expense!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
