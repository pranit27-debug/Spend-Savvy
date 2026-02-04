'use client';
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Receipt, 
  Users, 
  Calendar,
  DollarSign,
  Plus,
  Minus,
  Calculator,
  Upload,
  Camera
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Group {
  id: string;
  name: string;
  members: {
    user_id: string;
    user_name: string;
  }[];
  expense_count: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Friend {
  id: string;
  name: string;
  email: string;
}

export default function AddExpensePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'percentage'>('equal');
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "other",
    group_id: "personal",
    date: new Date().toISOString().split('T')[0],
    participants: [] as string[],
    customSplits: {} as { [userId: string]: string }
  });

  // Mock user ID
  const userId = "1f2d1bd7-fa51-403f-a6ae-7aefc30cbbf3";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user profile
      const userResponse = await fetch(`/api/users/profile?userId=${userId}`);
      const userData = await userResponse.json();
      
      if (userData.success) {
        setCurrentUser(userData.user);
      }

      // Load groups
      const groupsResponse = await fetch(`/api/groups?userId=${userId}`);
      const groupsData = await groupsResponse.json();
      
      if (groupsData.success) {
        setGroups(groupsData.groups);
      }

      // Load friends
      const friendsResponse = await fetch(`/api/friends?userId=${userId}`);
      const friendsData = await friendsResponse.json();
      
      if (friendsData.success) {
        setFriends(friendsData.friends || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParticipantToggle = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(participantId)
        ? prev.participants.filter(id => id !== participantId)
        : [...prev.participants, participantId]
    }));
  };

  const getSelectedGroup = () => {
    if (formData.group_id === "personal") return null;
    return groups.find(g => g.id === formData.group_id);
  };

  const getAvailableParticipants = () => {
    const selectedGroup = getSelectedGroup();
    if (selectedGroup) {
      return selectedGroup.members;
    }
    return friends.map(f => ({ user_id: f.id, user_name: f.name }));
  };

  const calculateSplits = (): { [key: string]: number } => {
    const amount = parseFloat(formData.amount) || 0;
    const participants = formData.participants;
    
    if (splitMethod === 'equal') {
      const sharePerPerson = amount / (participants.length + 1); // +1 for current user
      const splits: { [key: string]: number } = { [userId]: sharePerPerson };
      participants.forEach(id => {
        splits[id] = sharePerPerson;
      });
      return splits;
    }
    
    // Custom splits would be handled here
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const splits = calculateSplits();
      
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        group_id: formData.group_id === "personal" ? null : formData.group_id,
        date: formData.date,
        participants: formData.participants,
        splits,
        userId
      };

      // Create the expense
      const response = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (response.ok) {
        router.push("/expenses");
      } else {
        console.error("Failed to create expense");
      }
    } catch (error) {
      console.error("Error creating expense:", error);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/expenses")}
            className="rounded-full shadow-lg bg-white/80 backdrop-blur-sm border-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Add New Expense</h1>
            <p className="text-slate-600 mt-1">Split bills and track expenses with your friends</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  Expense Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium">
                    What did you spend on?
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g., Dinner at Italian Restaurant"
                    className="text-lg h-12 bg-white/50 border-slate-200 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-700 font-medium">
                      Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                        className="text-lg h-12 pl-10 bg-white/50 border-slate-200 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-slate-700 font-medium">
                      Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="h-12 pl-10 bg-white/50 border-slate-200 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-700 font-medium">
                      Category
                    </Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger className="h-12 bg-white/50 border-slate-200 focus:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                        <SelectItem value="transport">🚗 Transport</SelectItem>
                        <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                        <SelectItem value="shopping">🛒 Shopping</SelectItem>
                        <SelectItem value="utilities">⚡ Utilities</SelectItem>
                        <SelectItem value="travel">✈️ Travel</SelectItem>
                        <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
                        <SelectItem value="education">📚 Education</SelectItem>
                        <SelectItem value="other">📋 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Group Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-purple-500" />
                  Split With
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Choose Group (Optional)</Label>
                  <Select 
                    value={formData.group_id} 
                    onValueChange={(value) => setFormData({...formData, group_id: value, participants: []})}
                  >
                    <SelectTrigger className="h-12 bg-white/50 border-slate-200 focus:bg-white">
                      <SelectValue placeholder="Personal expense or select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Expense</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{group.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {group.members.length} members
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Participants Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-700 font-medium">
                      Select participants to split with
                    </Label>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {formData.participants.length + 1} people
                    </Badge>
                  </div>

                  {getAvailableParticipants().length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 mb-4">
                        {formData.group_id ? 'This group has no other members' : 'No friends available'}
                      </p>
                      <Button variant="outline" onClick={() => router.push('/friends')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Friends
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current User */}
                      <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-500 text-white">
                              {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'You'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {currentUser?.name || 'You'} (Paid)
                            </p>
                            <p className="text-sm text-slate-600">{currentUser?.email}</p>
                          </div>
                          <Badge className="bg-blue-500 text-white">Payer</Badge>
                        </div>
                      </div>

                      {/* Other Participants */}
                      {getAvailableParticipants().map((participant) => (
                        <div
                          key={participant.user_id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            formData.participants.includes(participant.user_id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          onClick={() => handleParticipantToggle(participant.user_id)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={formData.participants.includes(participant.user_id)}
                              onChange={() => handleParticipantToggle(participant.user_id)}
                              className="h-4 w-4 text-green-600 rounded"
                            />
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                                {participant.user_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{participant.user_name}</p>
                              <p className="text-sm text-slate-600">Split equally</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Split Preview */}
          {formData.amount && formData.participants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Calculator className="w-5 h-5 text-green-500" />
                    Split Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Total Amount:</span>
                      <span className="text-2xl font-bold text-slate-900">${parseFloat(formData.amount).toFixed(2)}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {(() => {
                        const splits = calculateSplits();
                        const allParticipants = [
                          { id: userId, name: currentUser?.name || 'You' },
                          ...formData.participants.map(id => {
                            const participant = getAvailableParticipants().find(p => p.user_id === id);
                            return { id, name: participant?.user_name || 'Unknown' };
                          })
                        ];
                        
                        return allParticipants.map((participant) => (
                          <div key={participant.id} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                            <span className="font-medium">
                              {participant.name}
                              {participant.id === userId && <span className="text-blue-600 ml-2">(You paid)</span>}
                            </span>
                            <span className="text-lg font-semibold text-green-600">
                              ${(splits[participant.id] || 0).toFixed(2)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4 pt-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/expenses")}
              className="flex-1 h-12 bg-white/80 border-slate-200 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.description || !formData.amount}
              className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
