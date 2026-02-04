'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a brief delay to show the animation
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="w-24 h-24 mx-auto mb-6 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg"></div>
          <div className="absolute w-24 h-24 border-t-4 border-r-4 border-blue-500 rounded-full"></div>
        </motion.div>
        
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          BillBuddy
        </h1>
        <p className="text-slate-500 mt-2">Loading your dashboard...</p>
      </motion.div>
    </div>
  );
}
