'use client';
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Users, Calculator, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GroupMember {
  user_id: string;
  user_name: string;
  user_email: string;
}

interface GroupExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateExpense: (expenseData: any) => Promise<void>;
  groupMembers: GroupMember[];
  currentUserId: string;
}

interface SplitMember {
  user_id: string;
  user_name: string;
  amount: number;
  selected: boolean;
}

export default function GroupExpenseDialog({ 
  isOpen, 
  onClose, 
  onCreateExpense, 
  groupMembers, 
  currentUserId 
}: GroupExpenseDialogProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [splits, setSplits] = useState<SplitMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize splits when dialog opens
  React.useEffect(() => {
    if (isOpen && groupMembers.length > 0) {
      const initialSplits = groupMembers.map(member => ({
        user_id: member.user_id,
        user_name: member.user_name,
        amount: 0,
        selected: true
      }));
      setSplits(initialSplits);
    }
  }, [isOpen, groupMembers]);

  // Calculate equal split amounts
  React.useEffect(() => {
    if (splitType === "equal" && amount && splits.length > 0) {
      const totalAmount = parseFloat(amount);
      const selectedMembers = splits.filter(split => split.selected);
      
      if (selectedMembers.length > 0) {
        const splitAmount = totalAmount / selectedMembers.length;
        setSplits(prevSplits => 
          prevSplits.map(split => ({
            ...split,
            amount: split.selected ? splitAmount : 0
          }))
        );
      }
    }
  }, [amount, splitType, splits.map(s => s.selected).join(',')]);

  const handleMemberToggle = (userId: string, checked: boolean) => {
    setSplits(prevSplits =>
      prevSplits.map(split =>
        split.user_id === userId ? { ...split, selected: checked } : split
      )
    );
  };

  const handleAmountChange = (userId: string, newAmount: string) => {
    const numAmount = parseFloat(newAmount) || 0;
    setSplits(prevSplits =>
      prevSplits.map(split =>
        split.user_id === userId ? { ...split, amount: numAmount } : split
      )
    );
  };

  const getTotalSplitAmount = () => {
    return splits.reduce((total, split) => total + (split.selected ? split.amount : 0), 0);
  };

  const getSelectedCount = () => {
    return splits.filter(split => split.selected).length;
  };

  const getAmountDifference = () => {
    const totalAmount = parseFloat(amount || "0");
    const totalSplitAmount = getTotalSplitAmount();
    return Math.abs(totalAmount - totalSplitAmount);
  };

  const isAmountValid = () => {
    return getAmountDifference() <= 0.01;
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !category) return;
    
    const selectedSplits = splits.filter(split => split.selected);
    if (selectedSplits.length === 0) return;

    const totalAmount = parseFloat(amount);
    const totalSplitAmount = getTotalSplitAmount();

    if (Math.abs(totalAmount - totalSplitAmount) > 0.01) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateExpense({
        description: description.trim(),
        amount: totalAmount,
        category,
        subcategory: subcategory || undefined,
        splits: selectedSplits.map(split => ({
          user_id: split.user_id,
          amount: split.amount
        }))
      });
      
      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setSubcategory("");
      setSplitType("equal");
      onClose();
    } catch (error) {
      console.error("Error creating expense:", error);
    }
    setIsSubmitting(false);
  };

  const categoryOptions = [
    { value: "food", label: "Food & Dining", icon: "🍽️" },
    { value: "transport", label: "Transportation", icon: "🚗" },
    { value: "entertainment", label: "Entertainment", icon: "🎬" },
    { value: "shopping", label: "Shopping", icon: "🛒" },
    { value: "utilities", label: "Utilities", icon: "⚡" },
    { value: "travel", label: "Travel", icon: "✈️" },
    { value: "healthcare", label: "Healthcare", icon: "🏥" },
    { value: "education", label: "Education", icon: "📚" },
    { value: "other", label: "Other", icon: "📋" }
  ];

  const subcategoriesByCategory: { [key: string]: Array<{value: string, label: string}> } = {
    food: [
      { value: "coffee", label: "Coffee & Tea" },
      { value: "restaurant", label: "Restaurant" },
      { value: "fast-food", label: "Fast Food" },
      { value: "groceries", label: "Groceries" },
      { value: "snacks", label: "Snacks" },
      { value: "drinks", label: "Drinks" },
      { value: "other", label: "Other" }
    ],
    transport: [
      { value: "gas", label: "Gas" },
      { value: "ride-share", label: "Ride Share" },
      { value: "public-transit", label: "Public Transit" },
      { value: "parking", label: "Parking" },
      { value: "taxi", label: "Taxi" },
      { value: "other", label: "Other" }
    ],
    entertainment: [
      { value: "movies", label: "Movies" },
      { value: "games", label: "Games" },
      { value: "concerts", label: "Concerts" },
      { value: "sports", label: "Sports" },
      { value: "streaming", label: "Streaming" },
      { value: "other", label: "Other" }
    ],
    shopping: [
      { value: "clothing", label: "Clothing" },
      { value: "electronics", label: "Electronics" },
      { value: "books", label: "Books" },
      { value: "gifts", label: "Gifts" },
      { value: "household", label: "Household" },
      { value: "other", label: "Other" }
    ],
    utilities: [
      { value: "electricity", label: "Electricity" },
      { value: "water", label: "Water" },
      { value: "internet", label: "Internet" },
      { value: "phone", label: "Phone" },
      { value: "gas-bill", label: "Gas Bill" },
      { value: "other", label: "Other" }
    ],
    travel: [
      { value: "flights", label: "Flights" },
      { value: "hotels", label: "Hotels" },
      { value: "rental-car", label: "Rental Car" },
      { value: "tours", label: "Tours" },
      { value: "meals", label: "Meals" },
      { value: "other", label: "Other" }
    ],
    healthcare: [
      { value: "doctor", label: "Doctor" },
      { value: "pharmacy", label: "Pharmacy" },
      { value: "dental", label: "Dental" },
      { value: "vision", label: "Vision" },
      { value: "insurance", label: "Insurance" },
      { value: "other", label: "Other" }
    ],
    education: [
      { value: "tuition", label: "Tuition" },
      { value: "books", label: "Books" },
      { value: "supplies", label: "Supplies" },
      { value: "courses", label: "Courses" },
      { value: "other", label: "Other" }
    ],
    other: [
      { value: "miscellaneous", label: "Miscellaneous" },
      { value: "personal", label: "Personal" },
      { value: "business", label: "Business" },
      { value: "other", label: "Other" }
    ]
  };

  const getSubcategories = () => {
    return subcategoriesByCategory[category] || [];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-2xl">
            <DialogHeader className="space-y-4 pb-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-slate-900">Split New Expense</DialogTitle>
                  <p className="text-slate-500">Divide costs fairly among group members</p>
                </div>
              </motion.div>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Enhanced Basic Details */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Expense Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-700 font-medium">What did you pay for?</Label>
                      <Input 
                        id="description" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="e.g., Dinner at Italian restaurant" 
                        className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-slate-700 font-medium">Total Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          id="amount" 
                          type="number"
                          step="0.01"
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)} 
                          placeholder="0.00" 
                          className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-700 font-medium">Category</Label>
                      <Select value={category} onValueChange={(value) => {
                        setCategory(value);
                        setSubcategory("");
                      }}>
                        <SelectTrigger className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subcategory" className="text-slate-700 font-medium">Subcategory</Label>
                      <Select 
                        value={subcategory} 
                        onValueChange={setSubcategory}
                        disabled={!category}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                          <SelectValue placeholder={category ? "Select subcategory" : "Select category first"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {getSubcategories().map((subcat) => (
                            <SelectItem key={subcat.value} value={subcat.value} className="rounded-lg">
                              {subcat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Split Configuration */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    Split Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="split-type" className="text-slate-700 font-medium">How to split?</Label>
                      <Select value={splitType} onValueChange={setSplitType}>
                        <SelectTrigger className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="equal" className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Equal Split</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom" className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>Custom Amounts</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount Summary */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-600" />
                        <span className="font-medium text-slate-700">
                          Splitting with {getSelectedCount()} members
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isAmountValid() ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Balanced</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Off by ${getAmountDifference().toFixed(2)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm">
                          ${getTotalSplitAmount().toFixed(2)} / ${parseFloat(amount || "0").toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Member Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Select Members
                  </h3>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {splits.map((split, index) => (
                      <motion.div 
                        key={split.user_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                          split.selected 
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-md' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          checked={split.selected}
                          onCheckedChange={(checked: boolean) => handleMemberToggle(split.user_id, !!checked)}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
                        />
                        
                        <Avatar className="w-12 h-12 shadow-lg">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                            {split.user_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{split.user_name}</p>
                          {split.user_id === currentUserId && (
                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200">
                              You
                            </Badge>
                          )}
                        </div>
                        
                        {split.selected && (
                          <div className="w-28">
                            {splitType === "equal" ? (
                              <div className="text-right">
                                <div className="text-xl font-bold text-slate-800">
                                  ${split.amount.toFixed(2)}
                                </div>
                                <div className="text-xs text-slate-500">per person</div>
                              </div>
                            ) : (
                              <Input
                                type="number"
                                step="0.01"
                                value={split.amount}
                                onChange={(e) => handleAmountChange(split.user_id, e.target.value)}
                                className="text-right rounded-xl border-slate-200 focus:border-blue-400"
                                placeholder="0.00"
                              />
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            
            <DialogFooter className="flex gap-3 pt-6 border-t border-slate-200/60">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="rounded-full px-6 border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={
                  isSubmitting || 
                  !description.trim() || 
                  !amount || 
                  !category || 
                  getSelectedCount() === 0 ||
                  !isAmountValid()
                }
                className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 px-8"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Split Expense
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}