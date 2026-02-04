'use client';

import React, { useState } from 'react';
import { Check, X, Users, DollarSign, Tag, Edit2, AlertCircle } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  amount: number;
  percentage: number;
}

interface ExpenseData {
  description: string;
  totalAmount: number;
  amount?: number;
  category: string;
  subcategory?: string;
  splits?: Array<{
    userName: string;
    name?: string;
    amount: number;
    percentage?: number;
  }>;
}

interface ExpenseConfirmationProps {
  data: ExpenseData;
  onConfirm: (confirmed: boolean, updatedData?: ExpenseData & { participants: Participant[] }) => void;
  onCancel: (confirmed: boolean) => void;
}

export const ExpenseConfirmation: React.FC<ExpenseConfirmationProps> = ({ data, onConfirm, onCancel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState({
    description: data?.description || "Expense",
    totalAmount: data?.totalAmount || data?.amount || 0,
    category: data?.category || "General",
    subcategory: data?.subcategory || "",
    participants: data?.splits?.map((split, index) => ({
      id: index,
      name: split.userName || split.name || `Person ${index + 1}`,
      amount: split.amount || 0,
      percentage: split.percentage || ((split.amount / (data?.totalAmount || data?.amount || 1)) * 100)
    })) || []
  });

  const updateAmount = (participantId: number, newAmount: string) => {
    const amount = parseFloat(newAmount) || 0;
    const updatedParticipants = editableData.participants.map(p => 
      p.id === participantId ? { ...p, amount } : p
    );
    
    const totalSplit = updatedParticipants.reduce((sum, p) => sum + p.amount, 0);
    const updatedWithPercentages = updatedParticipants.map(p => ({
      ...p,
      percentage: totalSplit > 0 ? ((p.amount / totalSplit) * 100) : 0
    }));
    
    setEditableData({ ...editableData, participants: updatedWithPercentages });
  };

  const totalSplit = editableData.participants.reduce((sum, p) => sum + p.amount, 0);
  const isBalanced = Math.abs(totalSplit - editableData.totalAmount) < 0.01;

  const handleConfirm = () => {
    onConfirm(true, editableData);
  };

  const handleCancel = () => {
    onCancel(false);
  };

  return (
    <div className="bg-yellow-600 text-white p-4 rounded-2xl max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-3 h-3" />
          </div>
          <h3 className="font-semibold text-sm">Confirm Expense Split</h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 hover:bg-white/20 rounded-md transition-colors"
          title={isEditing ? "Done editing" : "Edit details"}
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>

      {/* Expense Summary */}
      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editableData.description}
                onChange={(e) => setEditableData({...editableData, description: e.target.value})}
                className="w-full bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded text-sm focus:outline-none focus:bg-white/30"
                placeholder="Description"
              />
            ) : (
              <p className="font-medium text-sm">{editableData.description}</p>
            )}
          </div>
          <div className="text-right ml-3">
            <p className="text-xl font-bold">${editableData.totalAmount.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tag className="w-3 h-3" />
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
            {editableData.category}
          </span>
          {editableData.subcategory && (
            <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
              {editableData.subcategory}
            </span>
          )}
        </div>
      </div>

      {/* Balance Warning */}
      {!isBalanced && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium">Split doesn't balance</p>
            <p>Difference: ${Math.abs(editableData.totalAmount - totalSplit).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">Split between {editableData.participants.length} people:</span>
        </div>
        
        <div className="space-y-2">
          {editableData.participants.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium">{participant.name}</p>
                  <p className="text-xs opacity-75">{participant.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={participant.amount}
                    onChange={(e) => updateAmount(participant.id, e.target.value)}
                    className="w-16 bg-white/20 text-white text-xs px-1 py-1 rounded text-right focus:outline-none focus:bg-white/30"
                  />
                ) : (
                  <p className="text-sm font-semibold">${participant.amount.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isBalanced}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            isBalanced
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-400/50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <Check className="w-3 h-3" />
          {isBalanced ? 'Confirm' : 'Fix Balance'}
        </button>
      </div>
    </div>
  );
};