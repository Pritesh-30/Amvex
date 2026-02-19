'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt as ReceiptType } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Receipt, IndianRupee, CheckCircle, XCircle, X } from 'lucide-react';

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
      const { data: receipts, error } = await supabaseBrowser
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      const totalReceipts = receipts?.length || 0;
      const paidReceipts = receipts?.filter((r) => r.status === 'PAID') || [];
      const unpaidReceiptsList = receipts?.filter((r) => r.status === 'UNPAID') || [];
      
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
                  <IndianRupee className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-900">View All Receipts</p>
                  <p className="text-sm text-slate-600">
                    Browse and manage your receipts
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
