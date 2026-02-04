import React, { useState } from 'react';
import { Plus, Camera, Mic, ArrowUp } from 'lucide-react';

export default function ChatInterface() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex-1 flex flex-col bg-[#212121]">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-white text-2xl font-normal">Where should we begin?</h1>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#2f2f2f] rounded-2xl border border-gray-700 overflow-hidden">
            <div className="flex items-end p-3">
              {/* Attachment Button */}
              <button className="p-2 hover:bg-gray-600 rounded-lg transition-colors mr-2">
                <Plus className="w-5 h-5 text-gray-400" />
              </button>

              {/* Text Input */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message ChatGPT"
                className="flex-1 bg-transparent text-white placeholder-gray-400 resize-none outline-none max-h-32 min-h-[24px] py-2"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-2">
                <button className="p-2 hover:bg-gray-600 rounded-lg transition-colors">
                  <Camera className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-600 rounded-lg transition-colors">
                  <Mic className="w-5 h-5 text-gray-400" />
                </button>
                <button 
                  className={`p-2 rounded-lg transition-colors ${
                    message.trim() 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!message.trim()}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 mt-2">
            ChatGPT can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </div>
  );
}