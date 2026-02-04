import React from 'react';
import { ChevronDown, Settings } from 'lucide-react';

export default function Header() {
  return (
    <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-[#212121]">
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <span className="text-white font-medium">ChatGPT</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm">
          Upgrade to Go
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Settings className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}