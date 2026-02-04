import React from 'react';
import { 
  Edit3, 
  Search, 
  Library, 
  Sparkles, 
  Blocks, 
  FolderOpen, 
  ChevronDown,
  Settings
} from 'lucide-react';

const chatHistory = [
  'Backend frameworks used',
  'Wrong indexing disadvantages',
  'What is EC2',
  'Stripe application draft',
  'Learning concurrency in C++',
  'Week 1 concurrency guide',
  'Custom comparator in map',
  'TypeScript Node.js setup'
];

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#171717] border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-3">
        <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <span className="text-white font-medium">ChatGPT</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-3">
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <Edit3 className="w-4 h-4" />
          <span>New chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <Search className="w-4 h-4" />
          <span>Search chats</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="px-3 space-y-1 mb-4">
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <Library className="w-4 h-4" />
          <span>Library</span>
        </button>
        
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <Sparkles className="w-4 h-4" />
          <span>Sora</span>
        </button>
        
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <Blocks className="w-4 h-4" />
          <span>GPTs</span>
        </button>
        
        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-4 h-4" />
            <span>Projects</span>
          </div>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">NEW</span>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 px-3 overflow-y-auto">
        <div className="text-gray-500 text-xs font-medium mb-2 px-2">Chats</div>
        <div className="space-y-1">
          {chatHistory.map((chat, index) => (
            <button
              key={index}
              className="w-full text-left p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white text-sm truncate"
            >
              {chat}
            </button>
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">TA</span>
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Tafheem Ahemad</div>
            <div className="text-gray-400 text-xs">Free</div>
          </div>
          <Settings className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
}