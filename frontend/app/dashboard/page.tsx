'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, DollarSign, CheckCircle, XCircle } from 'lucide-react';

type Stats = {
  totalReceipts: number;
  totalPaid: number;
  totalUnpaid: number;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalReceipts: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data: receipts, error } = await supabaseBrowser
        .from('receipts')
        .select('total, status')
        .eq('user_id', user?.id);

      if (error) throw error;

      const totalReceipts = receipts?.length || 0;
      const totalPaid = receipts
        ?.filter((r) => r.status === 'PAID')
        .reduce((sum, r) => sum + Number(r.total), 0) || 0;
      const totalUnpaid = receipts
        ?.filter((r) => r.status === 'UNPAID')
        .reduce((sum, r) => sum + Number(r.total), 0) || 0;

      setStats({ totalReceipts, totalPaid, totalUnpaid });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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
                    All time receipts
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
                    ${stats.totalPaid.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Paid receipts amount
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Unpaid
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.totalUnpaid.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Outstanding amount
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/upload"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors text-center"
                >
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-900">Upload New Receipt</p>
                  <p className="text-sm text-slate-600">
                    Add a receipt with OCR analysis
                  </p>
                </a>
                <a
                  href="/receipts"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors text-center"
                >
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-900">View All Receipts</p>
                  <p className="text-sm text-slate-600">
                    Browse and manage your receipts
                  </p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
