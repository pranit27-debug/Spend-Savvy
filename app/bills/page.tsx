'use client';

import {
    DocumentIcon,
    EyeIcon,
    PhotoIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface BillData {
  id: string;
  filename: string;
  merchantName: string;
  totalAmount: number;
  billDate: string;
  rawOcrText: string;
  parsedData: any;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export default function UploadedBillsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bills, setBills] = useState<BillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'merchant'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'high-amount'>('all');
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const router = useRouter();

  // Helper functions for image handling
  const isImage = (filename: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  // Bill Image Component with S3 support
  const BillImage = ({ filename, alt, className }: { filename: string; alt: string; className?: string }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
      const loadImage = async () => {
        try {
          setIsLoading(true);
          setHasError(false);
          console.log('Loading image for filename:', filename);
          
          // Try S3 signed URL first
          try {
            const response = await fetch(`/api/bills/signed-url/${filename}`);
            console.log('S3 signed URL response:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log('S3 signed URL data:', data);
              setImageUrl(data.url);
              return;
            } else {
              const errorData = await response.text();
              console.log('S3 signed URL failed:', errorData);
              throw new Error('S3 URL failed');
            }
          } catch (s3Error) {
            console.log('S3 failed, trying local:', s3Error);
            // Fallback to local
            const localUrl = `/api/images/${filename}`;
            console.log('Trying local URL:', localUrl);
            setImageUrl(localUrl);
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setHasError(true);
          setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setIsLoading(false);
        }
      };

      if (isImage(filename)) {
        loadImage();
      } else {
        setIsLoading(false);
      }
    }, [filename]);

    if (!isImage(filename)) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          <DocumentIcon className="h-16 w-16 text-gray-400" />
          <span className="text-xs text-gray-500 ml-2">PDF</span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (hasError || !imageUrl) {
      return (
        <div className={`flex flex-col items-center justify-center bg-gray-100 ${className}`}>
          <PhotoIcon className="h-16 w-16 text-gray-400" />
          <span className="text-xs text-gray-500 mt-2 text-center px-2">
            {errorMessage || 'Image not found'}
          </span>
          <span className="text-xs text-gray-400 mt-1">{filename}</span>
        </div>
      );
    }

    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        onError={(e) => {
          console.error('Image load error for:', imageUrl);
          setHasError(true);
          setErrorMessage('Failed to load image');
        }}
        onLoad={() => {
          console.log('Image loaded successfully:', imageUrl);
        }}
      />
    );
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/signin');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadBills(parsedUser.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/signin');
    }
  }, [router]);

  const loadBills = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bills/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills || []);
      } else {
        console.error('Failed to load bills');
      }
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setBills(prev => prev.filter(bill => bill.id !== billId));
      } else {
        alert('Failed to delete bill');
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert('Error deleting bill');
    }
  };

  const createExpenseFromBill = (bill: BillData) => {
    router.push(`/chat?message=${encodeURIComponent(`Split $${bill.totalAmount} from ${bill.merchantName} with friends`)}`);
  };

  const filteredAndSortedBills = bills
    .filter(bill => {
      const merchantName = bill.merchantName || '';
      const filename = bill.filename || '';
      const matchesSearch = merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          filename.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterBy === 'recent') {
        const billDate = new Date(bill.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return billDate > weekAgo;
      }
      
      if (filterBy === 'high-amount') {
        return bill.totalAmount > 50;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'merchant':
          const merchantA = a.merchantName || '';
          const merchantB = b.merchantName || '';
          return merchantA.localeCompare(merchantB);
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading your bills...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8">
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
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Uploaded Bills
          </h1>
          <p className="text-gray-400">Manage and view all your uploaded receipts and bills</p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/80 backdrop-blur-lg rounded-lg shadow-xl border border-gray-700/50 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search bills by merchant or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-100 placeholder-gray-400"
              />
            </div>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-100"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="merchant">Sort by Merchant</option>
            </select>
            
            {/* Filter */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-100"
            >
              <option value="all">All Bills</option>
              <option value="recent">Recent (7 days)</option>
              <option value="high-amount">High Amount (&gt;$50)</option>
            </select>
          </div>
        </motion.div>

        {/* Bills Grid */}
        {filteredAndSortedBills.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">No bills found</h3>
            <p className="text-gray-400 mb-6">
              {bills.length === 0 
                ? "You haven't uploaded any bills yet. Start by using the chat to upload your first receipt!"
                : "No bills match your current search or filter criteria."
              }
            </p>
            {bills.length === 0 && (
              <button
                onClick={() => router.push('/chat')}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                Go to Chat & Upload Bills
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedBills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gray-800/80 backdrop-blur-lg rounded-lg shadow-xl border border-gray-700/50 overflow-hidden hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 group"
              >
                {/* Bill Image Preview */}
                <div className="aspect-video bg-gray-700/50 border-b border-gray-600/50 relative group cursor-pointer"
                     onClick={() => setSelectedBill(bill)}>
                  <BillImage
                    filename={bill.filename}
                    alt={`Bill from ${bill.merchantName}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-200 mb-1">
                        {bill.merchantName || 'Unknown Merchant'}
                      </h3>
                      <p className="text-sm text-gray-400">{bill.filename}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">
                        ${bill.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    <div className="flex justify-between">
                      <span>Bill Date:</span>
                      <span className="text-gray-300">{bill.billDate || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span className="text-gray-300">{new Date(bill.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => createExpenseFromBill(bill)}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-lg"
                    >
                      Create Split
                    </button>
                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                      title="Delete bill"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Summary */}
        {bills.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-gray-800/80 backdrop-blur-lg rounded-lg shadow-xl border border-gray-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">{bills.length}</p>
                <p className="text-sm text-gray-400">Total Bills</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  ${bills.reduce((sum, bill) => sum + bill.totalAmount, 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">Total Amount</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {new Set(bills.map(bill => bill.merchantName)).size}
                </p>
                <p className="text-sm text-gray-400">Unique Merchants</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bill Preview Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700"
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-200">
                {selectedBill.merchantName || 'Bill Preview'}
              </h3>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-gray-400 hover:text-gray-200 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Bill Image */}
                <div className="flex-1">
                  <BillImage
                    filename={selectedBill.filename}
                    alt="Bill preview"
                    className="w-full max-h-[50vh] object-contain rounded-lg"
                  />
                </div>
                
                {/* Bill Details */}
                <div className="lg:w-80">
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Merchant</label>
                      <p className="text-lg text-gray-200">{selectedBill.merchantName || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Amount</label>
                      <p className="text-2xl font-bold text-emerald-400">
                        ${selectedBill.totalAmount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Bill Date</label>
                      <p className="text-gray-200">{selectedBill.billDate ? new Date(selectedBill.billDate).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Uploaded</label>
                      <p className="text-gray-200">{new Date(selectedBill.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Filename</label>
                      <p className="text-sm text-gray-300 break-all">{selectedBill.filename}</p>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button
                        onClick={() => {
                          setSelectedBill(null);
                          createExpenseFromBill(selectedBill);
                        }}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg"
                      >
                        Create Split from This Bill
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this bill?')) {
                            deleteBill(selectedBill.id);
                            setSelectedBill(null);
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 inline mr-2" />
                        Delete Bill
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
