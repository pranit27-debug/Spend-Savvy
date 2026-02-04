'use client';
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Plus, Search, UserPlus } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<void>;
}

export function CreateGroupDialog({ isOpen, onClose, onCreateGroup }: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // Load friends when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.log('No user data found in localStorage');
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('Loading friends for user:', user.id);
      
      const response = await fetch(`/api/friends?userId=${user.id}`);
      const data = await response.json();
      
      console.log('Friends API response:', data);
      
      if (data.success) {
        console.log('Setting available users:', data.friends);
        setAvailableUsers(data.friends || []);
      } else {
        console.error('Failed to load friends:', data.error);
        // For debugging - add some mock data if no friends found
        if (data.friends && data.friends.length === 0) {
          console.log('No friends found, using mock data for testing');
          setAvailableUsers([
            { id: "mock1", name: "Amit Mohanty", email: "amit@example.com" },
            { id: "mock2", name: "John Doe", email: "john@example.com" },
            { id: "mock3", name: "Jane Smith", email: "jane@example.com" }
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const filteredUsers = availableUsers.filter(
    (user) => {
      const isNotSelected = !selectedUsers.some((selected) => selected.id === user.id);
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Debug logging
      if (searchQuery) {
        console.log(`Filtering user ${user.name}:`, {
          isNotSelected,
          matchesSearch,
          searchQuery,
          userName: user.name,
          userEmail: user.email
        });
      }
      
      return isNotSelected && matchesSearch;
    }
  );

  // Debug the final filtered result
  if (searchQuery) {
    console.log('Available users:', availableUsers);
    console.log('Search query:', searchQuery);
    console.log('Filtered users:', filteredUsers);
  }

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery("");
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleSubmit = async () => {
    if (groupName.trim() === "" || selectedUsers.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onCreateGroup(groupName, selectedUsers.map((user) => user.id));
      // Reset form
      setGroupName("");
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-500" />
            Create New Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input 
              id="group-name" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
              placeholder="Enter group name" 
              className="text-md"
            />
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Members</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-blue-200 text-blue-800 text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    <button 
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="search-friends">Add Members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                id="search-friends" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search by name or email" 
                className="pl-9"
              />
            </div>
            
            {searchQuery && !isLoadingFriends && filteredUsers.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Plus className="ml-auto h-4 w-4 text-blue-500" />
                  </div>
                ))}
              </div>
            ) : isLoadingFriends ? (
              <div className="mt-2 p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-slate-500 mt-2">Loading friends...</p>
              </div>
            ) : searchQuery && !isLoadingFriends ? (
              <p className="text-sm text-slate-500 p-2">No friends found</p>
            ) : availableUsers.length === 0 && !isLoadingFriends ? (
              <p className="text-sm text-slate-500 p-2">No friends available. Add friends first!</p>
            ) : null}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || groupName.trim() === "" || selectedUsers.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
