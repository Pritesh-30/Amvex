'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt, Budget, EXPENSE_CATEGORIES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Edit2,
  Trash2,
  Target,
  IndianRupee,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

type BudgetWithSpending = Budget & {
  spent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
};

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Form state
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedMonth]);

  const loadData = async () => {
    try {
      const [budgetsRes, receiptsRes] = await Promise.all([
        supabaseBrowser
          .from('budgets')
          .select('*')
          .eq('user_id', user?.id)
          .eq('month', selectedMonth),
        supabaseBrowser
          .from('receipts')
          .select('*')
          .eq('user_id', user?.id),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (receiptsRes.error) throw receiptsRes.error;

      setBudgets(budgetsRes.data || []);
      setReceipts(receiptsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate spending per category for selected month
  const categorySpending = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = endOfMonth(monthStart);
    
    const spending: Record<string, number> = {};
    
    receipts.forEach((r) => {
      if (!r.date || !r.category) return;
      const receiptDate = parseISO(r.date);
      if (isWithinInterval(receiptDate, { start: monthStart, end: monthEnd })) {
        spending[r.category] = (spending[r.category] || 0) + Number(r.total || 0);
      }
    });
    
    return spending;
  }, [receipts, selectedMonth]);

  // Budgets with spending info
  const budgetsWithSpending: BudgetWithSpending[] = useMemo(() => {
    return budgets.map((budget) => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      
      let status: BudgetWithSpending['status'] = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'danger';
      else if (percentage >= 60) status = 'warning';
      
      return { ...budget, spent, percentage, status };
    });
  }, [budgets, categorySpending]);

  // Summary stats
  const stats = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);
    const exceededCount = budgetsWithSpending.filter((b) => b.status === 'exceeded').length;
    const onTrackCount = budgetsWithSpending.filter((b) => b.status === 'safe').length;
    
    return { totalBudget, totalSpent, exceededCount, onTrackCount };
  }, [budgets, budgetsWithSpending]);

  const handleAddBudget = async () => {
    if (!formCategory || !formAmount) return;
    
    setSaving(true);
    try {
      const { error } = await supabaseBrowser.from('budgets').insert({
        user_id: user?.id,
        category: formCategory,
        amount: parseFloat(formAmount),
        month: selectedMonth,
      });
      
      if (error) throw error;
      
      setShowAddDialog(false);
      setFormCategory('');
      setFormAmount('');
      loadData();
    } catch (error: any) {
      console.error('Error adding budget:', error);
      alert(error.message || 'Failed to add budget');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBudget = async () => {
    if (!editingBudget || !formAmount) return;
    
    setSaving(true);
    try {
      const { error } = await supabaseBrowser
        .from('budgets')
        .update({ amount: parseFloat(formAmount) })
        .eq('id', editingBudget.id);
      
      if (error) throw error;
      
      setShowEditDialog(false);
      setEditingBudget(null);
      setFormAmount('');
      loadData();
    } catch (error: any) {
      console.error('Error updating budget:', error);
      alert(error.message || 'Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      const { error } = await supabaseBrowser
        .from('budgets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormAmount(budget.amount.toString());
    setShowEditDialog(true);
  };

  const getStatusColor = (status: BudgetWithSpending['status']) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-orange-600 bg-orange-100';
      case 'exceeded': return 'text-red-600 bg-red-100';
    }
  };

  const getProgressColor = (status: BudgetWithSpending['status']) => {
    switch (status) {
      case 'safe': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-orange-500';
      case 'exceeded': return 'bg-red-500';
    }
  };

  // Get categories not yet budgeted
  const availableCategories = EXPENSE_CATEGORIES.filter(
    (cat) => !budgets.some((b) => b.category === cat)
  );

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -3; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading budgets...</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Budgets</h1>
              <p className="text-slate-600 mt-1">
                Set spending limits and track your progress
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddDialog(true)} disabled={availableCategories.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Budget</p>
                    <p className="text-2xl font-bold">₹{stats.totalBudget.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Spent</p>
                    <p className="text-2xl font-bold">₹{stats.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <IndianRupee className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {stats.totalBudget > 0 
                    ? `${((stats.totalSpent / stats.totalBudget) * 100).toFixed(0)}% of budget`
                    : 'No budgets set'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">On Track</p>
                    <p className="text-2xl font-bold text-green-600">{stats.onTrackCount}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">Categories under 60%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Over Budget</p>
                    <p className="text-2xl font-bold text-red-600">{stats.exceededCount}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">Categories exceeded</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget List */}
          {budgetsWithSpending.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wallet className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No budgets set</h3>
                <p className="text-slate-600 mt-1 mb-4">
                  Create your first budget to start tracking your spending
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetsWithSpending.map((budget) => (
                <Card key={budget.id} className={budget.status === 'exceeded' ? 'border-red-300' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{budget.category}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}>
                          {budget.status === 'exceeded' ? 'Over Budget' : 
                           budget.status === 'danger' ? 'Near Limit' :
                           budget.status === 'warning' ? 'Caution' : 'On Track'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(budget)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBudget(budget.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          ₹{budget.spent.toFixed(2)} of ₹{budget.amount.toFixed(2)}
                        </span>
                        <span className={`font-medium ${
                          budget.status === 'exceeded' ? 'text-red-600' :
                          budget.status === 'danger' ? 'text-orange-600' :
                          budget.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {budget.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(budget.status)}`}
                          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                        />
                      </div>
                      {budget.status === 'exceeded' && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Over by ₹{(budget.spent - budget.amount).toFixed(2)}</span>
                        </div>
                      )}
                      {budget.status === 'safe' && budget.amount > budget.spent && (
                        <div className="text-sm text-slate-600">
                          ₹{(budget.amount - budget.spent).toFixed(2)} remaining
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Overall Progress */}
          {stats.totalBudget > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Overall Budget Progress
                </CardTitle>
                <CardDescription>
                  Your total spending vs total budget for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg font-medium">
                    <span>₹{stats.totalSpent.toFixed(2)} spent</span>
                    <span>₹{stats.totalBudget.toFixed(2)} budgeted</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.totalSpent > stats.totalBudget ? 'bg-red-500' :
                        stats.totalSpent > stats.totalBudget * 0.8 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((stats.totalSpent / stats.totalBudget) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-slate-600">
                    {stats.totalSpent <= stats.totalBudget 
                      ? `₹${(stats.totalBudget - stats.totalSpent).toFixed(2)} remaining until budget limit`
                      : `₹${(stats.totalSpent - stats.totalBudget).toFixed(2)} over budget`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Budget Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Budget</DialogTitle>
              <DialogDescription>
                Set a spending limit for a category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBudget} disabled={saving || !formCategory || !formAmount}>
                {saving ? 'Saving...' : 'Add Budget'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Budget Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Budget</DialogTitle>
              <DialogDescription>
                Update budget for {editingBudget?.category}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Budget Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditBudget} disabled={saving || !formAmount}>
                {saving ? 'Saving...' : 'Update Budget'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
