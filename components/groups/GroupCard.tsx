'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Users } from "lucide-react";
import React, { useState } from "react";

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  user_id: string;
  user_name: string;
}

interface GroupCardProps {
  id: string;
  name: string;
  members: GroupMember[];
  totalExpenses: number;
  memberCount?: number;
  onClick?: () => void;
  onDelete?: (groupId: string) => void;
  currentUserId?: string;
  createdBy?: string;
}

export function GroupCard({ 
  id, 
  name, 
  members, 
  totalExpenses, 
  memberCount, 
  onClick, 
  onDelete, 
  currentUserId, 
  createdBy 
}: GroupCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Display up to 3 avatars, with a +X indicator for remaining members
  const displayedMembers = members.slice(0, 3);
  const actualMemberCount = members.length; // Always use actual array length
  const remainingCount = actualMemberCount - displayedMembers.length;
  const canDelete = currentUserId === createdBy; // Only group creator can delete

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!onDelete || !window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card 
        onClick={onClick}
        className="cursor-pointer border-0 shadow-xl hover:shadow-2xl bg-gray-800/80 backdrop-blur-lg transition-all duration-300 border border-gray-700/50 group relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-violet-900/50 text-violet-400 p-2 rounded-lg">
                <Users size={18} />
              </div>
              <h3 className="font-semibold text-lg text-gray-100 group-hover:text-violet-400 transition-colors duration-300">{name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-violet-900/50 text-violet-300 border-violet-700">
                {actualMemberCount} {actualMemberCount === 1 ? 'member' : 'members'}
              </Badge>
              {canDelete && (
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/50 p-1 h-8 w-8"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
              {displayedMembers.map((member, index) => (
                <Avatar key={member.user_id || member.id || index} className="border-2 border-gray-700 ring-2 ring-gray-800">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">
                    {(member.user_name || member.name).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              
              {remainingCount > 0 && (
                <Avatar className="bg-gray-600 border-2 border-gray-700 ring-2 ring-gray-800">
                  <AvatarFallback className="bg-gray-600 text-gray-300">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Expenses</p>
              <p className="font-semibold text-lg text-emerald-400">${totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
