'use client';

import { useState } from 'react';

interface BillMetadata {
  id: string;
  filename: string;
  merchantName: string;
  totalAmount: number;
  date: string;
  items: Array<{name: string, price: number, quantity: number}>;
  confidence: number;
  status: 'processing' | 'completed' | 'error';
  ocrText?: string;
}

interface Props {
  bills: BillMetadata[];
  onClose: () => void;
  onCreateExpense: (bill: BillMetadata) => void;
  onDeleteBill: (billId: string) => void;
}

export default function BillUploadSidebar({ bills, onClose, onCreateExpense, onDeleteBill }: Props) {
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<string | null>(null);

  const getStatusIcon = (status: BillMetadata['status']) => {
    switch (status) {
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: BillMetadata['status']) => {
    switch (status) {
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <span>📄</span>
            <span>Uploaded Bills</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bills List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {bills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No bills uploaded yet</p>
            <p className="text-sm">Upload a receipt to get started</p>
          </div>
        ) : (
          bills.map((bill) => (
            <div
              key={bill.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedBill === bill.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedBill(selectedBill === bill.id ? null : bill.id)}
            >
              {/* Bill Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getStatusIcon(bill.status)}</span>
                    <h3 className="font-medium text-gray-800 truncate">
                      {bill.merchantName || bill.filename}
                    </h3>
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(bill.status)}`}>
                    {bill.status === 'processing' && 'Processing...'}
                    {bill.status === 'completed' && `${bill.confidence}% confidence`}
                    {bill.status === 'error' && 'Failed to process'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBill(bill.id);
                  }}
                  className="p-1 hover:bg-red-100 text-red-500 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Bill Summary */}
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium text-gray-800">${bill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{bill.date || 'Not detected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{bill.items.length} items</span>
                </div>
              </div>

              {/* Action Buttons */}
              {bill.status === 'completed' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateExpense(bill);
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                >
                  Create Expense
                </button>
              )}

              {/* Expanded Details */}
              {selectedBill === bill.id && bill.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {/* Items List */}
                  {bill.items.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Items:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {bill.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="truncate mr-2">{item.name}</span>
                            <span className="font-medium">${item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw OCR Text Toggle */}
                  {bill.ocrText && (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRawText(showRawText === bill.id ? null : bill.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {showRawText === bill.id ? 'Hide' : 'Show'} Raw OCR Text
                      </button>
                      
                      {showRawText === bill.id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-h-24 overflow-y-auto">
                          {bill.ocrText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          📱 Tip: Upload receipts to automatically create expenses
        </div>
      </div>
    </div>
  );
}
