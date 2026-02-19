'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt as ReceiptType, Budget } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Receipt, 
  IndianRupee, 
  CheckCircle, 
  XCircle, 
  X, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  BarChart3,
  Wallet,
  ArrowRight,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, differenceInDays } from 'date-fns';

type Stats = {
  totalReceipts: number;
  totalPaid: number;
  totalUnpaid: number;
};

type Insight = {
  type: 'warning' | 'success' | 'info' | 'tip';
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReceipts: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [unpaidReceipts, setUnpaidReceipts] = useState<ReceiptType[]>([]);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      const [receiptsRes, budgetsRes] = await Promise.all([
        supabaseBrowser
          .from('receipts')
          .select('*')
          .eq('user_id', user?.id),
        supabaseBrowser
          .from('budgets')
          .select('*')
          .eq('user_id', user?.id)
          .eq('month', currentMonth),
      ]);

      if (receiptsRes.error) throw receiptsRes.error;

      const allReceipts = receiptsRes.data || [];
      setReceipts(allReceipts);
      setBudgets(budgetsRes.data || []);

      const totalReceipts = allReceipts.length;
      const paidReceipts = allReceipts.filter((r) => r.status === 'PAID');
      const unpaidReceiptsList = allReceipts.filter((r) => r.status === 'UNPAID');
      
      const totalPaid = paidReceipts.reduce((sum, r) => sum + Number(r.total), 0);
      const totalUnpaid = unpaidReceiptsList.reduce((sum, r) => sum + Number(r.total), 0);

      setStats({ totalReceipts, totalPaid, totalUnpaid });
      setUnpaidReceipts(unpaidReceiptsList);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate insights based on spending patterns
  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // This month's spending
    const thisMonthReceipts = receipts.filter((r) => {
      if (!r.date) return false;
      const date = parseISO(r.date);
      return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
    });
    const thisMonthTotal = thisMonthReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);

    // Last month's spending
    const lastMonthReceipts = receipts.filter((r) => {
      if (!r.date) return false;
      const date = parseISO(r.date);
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });
    const lastMonthTotal = lastMonthReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);

    // Spending trend insight
    if (lastMonthTotal > 0) {
      const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      if (percentChange > 20) {
        result.push({
          type: 'warning',
          icon: <TrendingUp className="h-5 w-5 text-red-500" />,
          title: `Spending up ${percentChange.toFixed(0)}%`,
          description: `You've spent ₹${thisMonthTotal.toFixed(0)} this month vs ₹${lastMonthTotal.toFixed(0)} last month`,
          action: { label: 'View Analytics', href: '/analytics' },
        });
      } else if (percentChange < -10) {
        result.push({
          type: 'success',
          icon: <TrendingDown className="h-5 w-5 text-green-500" />,
          title: `Great job! Spending down ${Math.abs(percentChange).toFixed(0)}%`,
          description: `You've saved ₹${(lastMonthTotal - thisMonthTotal).toFixed(0)} compared to last month`,
        });
      }
    }

    // Unpaid bills reminder
    if (unpaidReceipts.length > 0) {
      const oldestUnpaid = unpaidReceipts
        .filter((r) => r.date)
        .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
      
      if (oldestUnpaid?.date) {
        const daysOld = differenceInDays(now, parseISO(oldestUnpaid.date));
        if (daysOld > 30) {
          result.push({
            type: 'warning',
            icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
            title: `${unpaidReceipts.length} unpaid bills pending`,
            description: `Oldest bill is ${daysOld} days old. Total: ₹${stats.totalUnpaid.toFixed(0)}`,
            action: { label: 'Pay Now', href: '#' },
          });
        }
      }
    }

    // Budget alerts
    const currentMonth = format(now, 'yyyy-MM');
    budgets.forEach((budget) => {
      const categorySpent = thisMonthReceipts
        .filter((r) => r.category === budget.category)
        .reduce((sum, r) => sum + Number(r.total || 0), 0);
      
      const percentage = (categorySpent / budget.amount) * 100;
      
      if (percentage >= 100) {
        result.push({
          type: 'warning',
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          title: `${budget.category} budget exceeded!`,
          description: `You've spent ₹${categorySpent.toFixed(0)} of ₹${budget.amount.toFixed(0)} budget`,
          action: { label: 'View Budgets', href: '/budgets' },
        });
      } else if (percentage >= 80) {
        result.push({
          type: 'info',
          icon: <Wallet className="h-5 w-5 text-orange-500" />,
          title: `${budget.category} budget at ${percentage.toFixed(0)}%`,
          description: `Only ₹${(budget.amount - categorySpent).toFixed(0)} remaining`,
        });
      }
    });

    // Category insight
    const categoryTotals: Record<string, number> = {};
    thisMonthReceipts.forEach((r) => {
      const cat = r.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(r.total || 0);
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && thisMonthTotal > 0) {
      const percentage = (topCategory[1] / thisMonthTotal) * 100;
      if (percentage > 50) {
        result.push({
          type: 'tip',
          icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
          title: `${topCategory[0]} is ${percentage.toFixed(0)}% of spending`,
          description: 'Consider setting a budget for this category to track better',
          action: { label: 'Set Budget', href: '/budgets' },
        });
      }
    }

    // Recurring expense detection
    const vendorCounts: Record<string, number> = {};
    receipts.forEach((r) => {
      if (r.vendor) {
        vendorCounts[r.vendor] = (vendorCounts[r.vendor] || 0) + 1;
      }
    });
    
    const frequentVendors = Object.entries(vendorCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (frequentVendors.length > 0 && result.length < 4) {
      result.push({
        type: 'info',
        icon: <RefreshCw className="h-5 w-5 text-blue-500" />,
        title: 'Recurring expense detected',
        description: `${frequentVendors[0][0]} appears ${frequentVendors[0][1]} times in your expenses`,
      });
    }

    // No budgets set tip
    if (budgets.length === 0 && receipts.length > 5) {
      result.push({
        type: 'tip',
        icon: <Sparkles className="h-5 w-5 text-purple-500" />,
        title: 'Start tracking with budgets',
        description: 'Set monthly budgets to keep your spending in check',
        action: { label: 'Create Budget', href: '/budgets' },
      });
    }

    return result.slice(0, 4); // Max 4 insights
  }, [receipts, budgets, unpaidReceipts, stats.totalUnpaid]);

  // This month stats
  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    
    const thisMonthReceipts = receipts.filter((r) => {
      if (!r.date) return false;
      const date = parseISO(r.date);
      return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
    });
    
    return {
      count: thisMonthReceipts.length,
      total: thisMonthReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0),
    };
  }, [receipts]);

  const getImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    const { data } = supabaseBrowser.storage
      .from('receipts')
      .getPublicUrl(imagePath);
    return data?.publicUrl || null;
  };

  const handleMarkAsPaid = async (receiptId: string) => {
    try {
      const { error } = await supabaseBrowser
        .from('receipts')
        .update({ status: 'PAID' })
        .eq('id', receiptId);

      if (error) throw error;

      // Refresh data
      await loadStats();
    } catch (error) {
      console.error('Error marking receipt as paid:', error);
      alert('Failed to update receipt status');
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Overview of your receipt management
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading statistics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Receipts
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReceipts}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    {thisMonthStats.count} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Paid
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{stats.totalPaid.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Paid receipts amount
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
                onClick={() => setShowUnpaidModal(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Unpaid
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{stats.totalUnpaid.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Click to view unpaid bills
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* This Month Summary */}
          {!loading && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {format(new Date(), 'MMMM yyyy')}
                    </CardTitle>
                    <CardDescription>Your spending this month</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-700">₹{thisMonthStats.total.toFixed(2)}</p>
                    <p className="text-sm text-blue-600">{thisMonthStats.count} receipts</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Insights */}
          {!loading && insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  Insights
                </CardTitle>
                <CardDescription>Recommendations based on your spending patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                        insight.type === 'success' ? 'bg-green-50 border-green-200' :
                        insight.type === 'tip' ? 'bg-purple-50 border-purple-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{insight.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{insight.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                          {insight.action && (
                            <a
                              href={insight.action.href}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                            >
                              {insight.action.label}
                              <ArrowRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <a
                  href="/upload"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors text-center"
                >
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-900">Upload Receipt</p>
                  <p className="text-sm text-slate-600">
                    Add with OCR analysis
                  </p>
                </a>
                <a
                  href="/receipts"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors text-center"
                >
                  <IndianRupee className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-900">All Receipts</p>
                  <p className="text-sm text-slate-600">
                    Browse & manage
                  </p>
                </a>
                <a
                  href="/analytics"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
                >
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium text-slate-900">Analytics</p>
                  <p className="text-sm text-slate-600">
                    View insights
                  </p>
                </a>
                <a
                  href="/budgets"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                >
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium text-slate-900">Budgets</p>
                  <p className="text-sm text-slate-600">
                    Track limits
                  </p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unpaid Bills Modal */}
        <Dialog open={showUnpaidModal} onOpenChange={setShowUnpaidModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Unpaid Bills ({unpaidReceipts.length})
              </DialogTitle>
              <DialogDescription>
                Total outstanding: ₹{stats.totalUnpaid.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            
            {unpaidReceipts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-slate-600">No unpaid bills at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {unpaidReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50"
                  >
                    {receipt.image_url ? (
                      <img
                        src={getImageUrl(receipt.image_url) || ''}
                        alt={receipt.vendor || 'Receipt'}
                        className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(getImageUrl(receipt.image_url))}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded border flex items-center justify-center">
                        <Receipt className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">
                        {receipt.vendor || 'Unknown Vendor'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {receipt.date
                          ? new Date(receipt.date).toLocaleDateString()
                          : 'No date'}
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        ₹{Number(receipt.total || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleMarkAsPaid(receipt.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Receipt"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
