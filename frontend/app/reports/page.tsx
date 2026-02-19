'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt, EXPENSE_CATEGORIES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  Printer,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

type ReportType = 'monthly' | 'category' | 'vendor' | 'custom';

export default function ReportsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [includeUnpaid, setIncludeUnpaid] = useState(true);
  const [includePaid, setIncludePaid] = useState(true);

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user]);

  const loadReceipts = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter receipts based on selections
  const filteredReceipts = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = endOfMonth(monthStart);

    return receipts.filter((r) => {
      // Date filter
      if (r.date) {
        const receiptDate = parseISO(r.date);
        if (!isWithinInterval(receiptDate, { start: monthStart, end: monthEnd })) {
          return false;
        }
      }
      
      // Category filter
      if (r.category && !selectedCategories.includes(r.category)) {
        return false;
      }
      
      // Status filter
      if (r.status === 'PAID' && !includePaid) return false;
      if (r.status === 'UNPAID' && !includeUnpaid) return false;
      
      return true;
    });
  }, [receipts, selectedMonth, selectedCategories, includePaid, includeUnpaid]);

  // Summary stats
  const summary = useMemo(() => {
    const total = filteredReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const paid = filteredReceipts
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    const unpaid = filteredReceipts
      .filter((r) => r.status === 'UNPAID')
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    
    // Category breakdown
    const byCategory: Record<string, number> = {};
    filteredReceipts.forEach((r) => {
      const cat = r.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + Number(r.total || 0);
    });
    
    return { total, paid, unpaid, byCategory, count: filteredReceipts.length };
  }, [filteredReceipts]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === EXPENSE_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...EXPENSE_CATEGORIES]);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = ['Date', 'Vendor', 'Category', 'Total', 'Status'];
      const rows = filteredReceipts.map((r) => [
        r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '',
        r.vendor || '',
        r.category || 'Other',
        r.total?.toFixed(2) || '0.00',
        r.status || '',
      ]);
      
      // Add summary
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Total Receipts', summary.count.toString()]);
      rows.push(['Total Amount', `₹${summary.total.toFixed(2)}`]);
      rows.push(['Paid', `₹${summary.paid.toFixed(2)}`]);
      rows.push(['Unpaid', `₹${summary.unpaid.toFixed(2)}`]);
      rows.push([]);
      rows.push(['By Category']);
      Object.entries(summary.byCategory).forEach(([cat, amount]) => {
        rows.push([cat, `₹${amount.toFixed(2)}`]);
      });
      
      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading reports...</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout>
        <div className="space-y-6 print:space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
              <p className="text-slate-600 mt-1">
                Generate and export expense reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={printReport}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={exportToCSV} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block">
            <h1 className="text-2xl font-bold">Expense Report</h1>
            <p className="text-slate-600">
              {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </p>
            <p className="text-sm text-slate-500">
              Generated on {format(new Date(), 'dd MMMM yyyy')}
            </p>
          </div>

          {/* Filters */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="mt-1">
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
                </div>

                <div>
                  <Label>Status</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includePaid}
                        onCheckedChange={(checked) => setIncludePaid(!!checked)}
                      />
                      <span className="text-sm">Paid</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeUnpaid}
                        onCheckedChange={(checked) => setIncludeUnpaid(!!checked)}
                      />
                      <span className="text-sm">Unpaid</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Categories</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleSelectAllCategories}
                    >
                      {selectedCategories.length === EXPENSE_CATEGORIES.length ? 'Clear All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <label
                        key={cat}
                        className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                          selectedCategories.includes(cat)
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => handleCategoryToggle(cat)}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Expenses</p>
                    <p className="text-2xl font-bold">₹{summary.total.toFixed(2)}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Receipts</p>
                    <p className="text-2xl font-bold">{summary.count}</p>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Paid</p>
                    <p className="text-2xl font-bold text-green-600">₹{summary.paid.toFixed(2)}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Unpaid</p>
                    <p className="text-2xl font-bold text-red-600">₹{summary.unpaid.toFixed(2)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Expenses by category for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(summary.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">{category}</p>
                      <p className="text-lg font-bold">₹{amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">
                        {((amount / summary.total) * 100).toFixed(0)}% of total
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Receipt Details */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
              <CardDescription>{filteredReceipts.length} receipts found</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No receipts match your filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell>
                            {receipt.date ? format(parseISO(receipt.date), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {receipt.vendor || '-'}
                          </TableCell>
                          <TableCell>{receipt.category || 'Other'}</TableCell>
                          <TableCell>₹{Number(receipt.total || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              receipt.status === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {receipt.status || 'Unknown'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Print Footer */}
          <div className="hidden print:block text-center text-sm text-slate-500 mt-8">
            <p>Generated by AMVEX Receipt Manager</p>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
