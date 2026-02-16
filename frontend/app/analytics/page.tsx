'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#FF6B6B',
  'Shopping': '#4ECDC4',
  'Transportation': '#45B7D1',
  'Utilities': '#96CEB4',
  'Healthcare': '#FFEAA7',
  'Entertainment': '#DDA0DD',
  'Groceries': '#98D8C8',
  'Other': '#B8B8B8',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3' | '6' | '12'>('6');

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
        .order('date', { ascending: true });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly spending data for line chart
  const monthlyData = useMemo(() => {
    const months = parseInt(timeRange);
    const data: { month: string; amount: number; count: number }[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthReceipts = receipts.filter((r) => {
        if (!r.date) return false;
        const receiptDate = parseISO(r.date);
        return isWithinInterval(receiptDate, { start: monthStart, end: monthEnd });
      });
      
      const total = monthReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
      
      data.push({
        month: format(monthDate, 'MMM yyyy'),
        amount: total,
        count: monthReceipts.length,
      });
    }
    
    return data;
  }, [receipts, timeRange]);

  // Calculate category breakdown for pie chart
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    receipts.forEach((r) => {
      const category = r.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(r.total || 0);
    });
    
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [receipts]);

  // Calculate top vendors for bar chart
  const topVendors = useMemo(() => {
    const vendorTotals: Record<string, number> = {};
    
    receipts.forEach((r) => {
      const vendor = r.vendor || 'Unknown';
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + Number(r.total || 0);
    });
    
    return Object.entries(vendorTotals)
      .map(([name, total]) => ({ name: name.slice(0, 15), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [receipts]);

  // Calculate insights
  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    const thisMonthTotal = receipts
      .filter((r) => {
        if (!r.date) return false;
        const date = parseISO(r.date);
        return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
      })
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    
    const lastMonthTotal = receipts
      .filter((r) => {
        if (!r.date) return false;
        const date = parseISO(r.date);
        return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
      })
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    
    const percentChange = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;
    
    const totalSpent = receipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const avgPerReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;
    
    const topCategory = categoryData.length > 0 ? categoryData[0] : null;
    
    return {
      thisMonthTotal,
      lastMonthTotal,
      percentChange,
      totalSpent,
      avgPerReceipt,
      topCategory,
      totalReceipts: receipts.length,
    };
  }, [receipts, categoryData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-sm text-slate-600">
            Amount: <span className="font-bold text-slate-900">₹{payload[0].value.toFixed(2)}</span>
          </p>
          {payload[0].payload.count !== undefined && (
            <p className="text-sm text-slate-600">
              Receipts: <span className="font-bold text-slate-900">{payload[0].payload.count}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
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
              <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
              <p className="text-slate-600 mt-1">
                Deep insights into your spending patterns
              </p>
            </div>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '3' | '6' | '12')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">This Month</p>
                    <p className="text-2xl font-bold">₹{insights.thisMonthTotal.toFixed(2)}</p>
                  </div>
                  <div className={`p-3 rounded-full ${insights.percentChange >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    {insights.percentChange >= 0 ? (
                      <TrendingUp className={`h-6 w-6 ${insights.percentChange >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                </div>
                <div className={`flex items-center mt-2 text-sm ${insights.percentChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {insights.percentChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  <span>{Math.abs(insights.percentChange).toFixed(1)}% vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Spent</p>
                    <p className="text-2xl font-bold">₹{insights.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <IndianRupee className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">{insights.totalReceipts} receipts total</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Avg per Receipt</p>
                    <p className="text-2xl font-bold">₹{insights.avgPerReceipt.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">Average transaction</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Top Category</p>
                    <p className="text-2xl font-bold truncate">
                      {insights.topCategory?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <ShoppingBag className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                {insights.topCategory && (
                  <p className="text-sm text-slate-500 mt-2">
                    ₹{insights.topCategory.value.toFixed(2)} spent
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                <CardDescription>Monthly spending over time</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }} 
                        stroke="#94A3B8"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        stroke="#94A3B8"
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Where your money goes</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Vendors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors</CardTitle>
              <CardDescription>Where you spend the most</CardDescription>
            </CardHeader>
            <CardContent>
              {topVendors.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topVendors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 12 }} 
                      stroke="#94A3B8"
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      stroke="#94A3B8"
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Total Spent']}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#3B82F6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Legend */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categoryData.map((category, index) => (
                    <div key={category.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[category.name] || COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{category.name}</p>
                        <p className="text-sm text-slate-600">₹{category.value.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
