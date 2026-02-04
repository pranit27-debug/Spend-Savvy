'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Child {
  relationship_id: string;
  child_id: string;
  child_name: string;
  child_email: string;
  child_phone: string;
  threshold_amount: number | string; // Can be either from DB
  relationship_created: string;
}

interface ChildWithSpending extends Child {
  totalSpending: number;
  progressPercentage: number;
}

export default function ChildMonitoringPage() {
  const [children, setChildren] = useState<ChildWithSpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addChildForm, setAddChildForm] = useState({
    childEmail: '',
    childPhone: '',
    thresholdAmount: 0
  });
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [newThreshold, setNewThreshold] = useState<number>(0);

  // Utility function to safely convert threshold to number
  const getThresholdAmount = (threshold: number | string): number => {
    return typeof threshold === 'number' ? threshold : parseFloat(threshold.toString()) || 0;
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const childrenWithSpending = await Promise.all(
          data.children.map(async (child: Child) => {
            const analyticsResponse = await fetch(`/api/parent/analytics/${child.child_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            let totalSpending = 0;
            if (analyticsResponse.ok) {
              const analyticsData = await analyticsResponse.json();
              totalSpending = analyticsData.analytics.totalSpending;
            }
            
            // Ensure threshold_amount is a number
            const thresholdAmount = getThresholdAmount(child.threshold_amount);
            const progressPercentage = thresholdAmount > 0 
              ? Math.min((totalSpending / thresholdAmount) * 100, 100)
              : 0;
            
            return {
              ...child,
              threshold_amount: thresholdAmount,
              totalSpending,
              progressPercentage
            };
          })
        );
        
        setChildren(childrenWithSpending);
      } else {
        toast.error('Failed to fetch children');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Error fetching children');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addChildForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Child added successfully');
        setShowAddForm(false);
        setAddChildForm({ childEmail: '', childPhone: '', thresholdAmount: 0 });
        fetchChildren(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to add child');
      }
    } catch (error) {
      console.error('Error adding child:', error);
      toast.error('Error adding child');
    }
  };

  const handleUpdateThreshold = async (relationshipId: string, newAmount: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/parent/children/${relationshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ thresholdAmount: newAmount })
      });

      if (response.ok) {
        toast.success('Threshold updated successfully');
        setEditingThreshold(null);
        fetchChildren(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update threshold');
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast.error('Error updating threshold');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertLevel = (percentage: number) => {
    if (percentage >= 100) return { level: 'Critical', color: 'text-red-600' };
    if (percentage >= 90) return { level: 'High', color: 'text-orange-600' };
    if (percentage >= 50) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Normal', color: 'text-green-600' };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Child Monitoring</h1>
          <p className="text-gray-600 mt-2">Monitor your children's spending and set limits</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Notifications Button */}
          <a
            href="/parent-notifications"
            className="relative bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-3.5-3.5a5.97 5.97 0 001.5-4c0-3.31-2.69-6-6-6S6 6.19 6 9.5c0 1.46.53 2.79 1.4 3.83L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>View Notifications</span>
            {/* Notification badge - you can add logic to show actual count */}
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-800 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              !
            </span>
          </a>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Child</span>
          </button>
        </div>
      </div>

      {/* Safety Notifications Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl">🚨</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🔔 Safety Notification System Active</h3>
            <div className="text-gray-700 space-y-2">
              <p><strong>📧 Email Alerts:</strong> You'll receive instant email notifications when your child purchases potentially harmful items (alcohol, tobacco, drugs, weapons, etc.)</p>
              <p><strong>📱 WhatsApp Notifications:</strong> Real-time messages sent to your phone for immediate awareness</p>
              <p><strong>💸 Spending Threshold Alerts:</strong> Get notified at 50%, 90%, and 100% of spending limits</p>
              <p><strong>📊 View All Notifications:</strong> Click the "View Notifications" button above to see complete alert history</p>
            </div>
            <div className="mt-4 flex items-center space-x-4">
              <a
                href="/parent-notifications"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold shadow-lg"
              >
                <span>🔔</span>
                <span>View All Notifications</span>
              </a>
              <a
                href="/test-email"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-semibold shadow-lg"
              >
                <span>📧</span>
                <span>Test Email Alerts</span>
              </a>
              <span className="text-sm text-gray-600">✅ System is monitoring all child transactions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Child</h2>
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child's Email
                </label>
                <input
                  type="email"
                  required
                  value={addChildForm.childEmail}
                  onChange={(e) => setAddChildForm(prev => ({ ...prev, childEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="child@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child's Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={addChildForm.childPhone}
                  onChange={(e) => setAddChildForm(prev => ({ ...prev, childPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spending Threshold ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addChildForm.thresholdAmount}
                  onChange={(e) => setAddChildForm(prev => ({ ...prev, thresholdAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="100.00"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Add Child
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Children List */}
      {children.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No children added yet</h3>
          <p className="text-gray-600 mb-4">Add your first child to start monitoring their spending</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {children.map((child) => {
            const alertLevel = getAlertLevel(child.progressPercentage);
            
            return (
              <div key={child.relationship_id} className="bg-white rounded-lg shadow-md border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{child.child_name}</h3>
                    <p className="text-gray-600">{child.child_email}</p>
                    <p className="text-gray-600">{child.child_phone}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${alertLevel.color}`}>
                      {alertLevel.level}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${child.totalSpending.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      of ${getThresholdAmount(child.threshold_amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Spending Progress</span>
                    <span>{child.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(child.progressPercentage)}`}
                      style={{ width: `${Math.min(child.progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Threshold Management */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Threshold:</span>
                    {editingThreshold === child.relationship_id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateThreshold(child.relationship_id, newThreshold)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingThreshold(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">${getThresholdAmount(child.threshold_amount).toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setEditingThreshold(child.relationship_id);
                            setNewThreshold(getThresholdAmount(child.threshold_amount));
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Added {new Date(child.relationship_created).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
