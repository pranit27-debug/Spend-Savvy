'use client';
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { GroupCard } from "@/components/groups/GroupCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  user_id: string;
  user_name: string;
}

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  totalExpenses: number;
  memberCount: number;
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  
  useEffect(() => {
    // Get the actual logged-in user data from localStorage
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
        setCurrentUser({
          email: user.email,
          name: user.name
        });
        loadGroups(user.id);
      }
    }
  }, []);

  const loadGroups = async (currentUserId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups?userId=${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Loaded groups:', data.groups);
        console.log('Groups member details:', data.groups.map((g: Group) => ({ 
          name: g.name, 
          memberCount: g.memberCount, 
          membersLength: g.members.length,
          members: g.members
        })));
        setGroups(data.groups || []);
      } else {
        console.error('Failed to load groups:', data.error);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      console.log('Creating group with data:', { name, memberIds, userId });
      
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          createdBy: userId,
          memberIds: [...memberIds, userId] // Include current user
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // Refresh groups list
        loadGroups(userId);
      } else {
        throw new Error(data.error || 'Failed to create group');
      }
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  };

  const handleGroupClick = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups?groupId=${groupId}&userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh groups list
        loadGroups(userId);
      } else {
        alert(data.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert('Failed to delete group');
    }
  };

  // Animations for staggered list items
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/3 w-80 h-80 bg-purple-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              <Users className="text-violet-400" />
              Your Groups
            </h1>
            <p className="text-gray-400 mt-1">Manage shared expenses with friends</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg"
            >
              <Plus className="mr-1 h-4 w-4" />
              New Group
            </Button>
          </motion.div>
        </div>
        
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-gray-800/60 backdrop-blur-lg rounded-lg animate-pulse border border-gray-700/50"></div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <motion.div 
            className="grid gap-4 grid-cols-1 md:grid-cols-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {groups.map((group) => (
              <motion.div key={group.id} variants={item}>
                <GroupCard
                  id={group.id}
                  name={group.name}
                  members={group.members}
                  memberCount={group.memberCount}
                  totalExpenses={group.totalExpenses}
                  onClick={() => handleGroupClick(group.id)}
                  onDelete={handleDeleteGroup}
                  currentUserId={userId}
                  createdBy={group.created_by}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-xl p-8 max-w-md mx-auto border border-gray-700/50 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-600/20 rounded-full transform translate-x-10 -translate-y-10"></div>
              
              <div className="relative">
                <Users className="h-16 w-16 mx-auto text-violet-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-200 mb-3">No Groups Yet</h3>
                <p className="text-gray-400 mb-6">Create your first group to start splitting expenses with friends</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      <CreateGroupDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
