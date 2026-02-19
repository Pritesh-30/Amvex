'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Receipt } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Image as ImageIcon, Trash2, X, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user]);

  useEffect(() => {
    filterReceipts();
  }, [receipts, searchQuery]);

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

  const filterReceipts = () => {
    let filtered = [...receipts];

    if (searchQuery) {
      filtered = filtered.filter((receipt) =>
        (receipt.vendor || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReceipts(filtered);
  };

  const handleDelete = async (id: string, imagePath?: string | null) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      if (imagePath) {
        await supabaseBrowser.storage.from('receipts').remove([imagePath]);
      }

      const { error } = await supabaseBrowser
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReceipts(receipts.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
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

      setReceipts(receipts.map((r) =>
        r.id === receiptId ? { ...r, status: 'PAID' as const } : r
      ));
    } catch (error) {
      console.error('Error marking receipt as paid:', error);
      alert('Failed to update receipt status');
    }
  };

  const handleMarkAsUnpaid = async (receiptId: string) => {
    try {
      const { error } = await supabaseBrowser
        .from('receipts')
        .update({ status: 'UNPAID' })
        .eq('id', receiptId);

      if (error) throw error;

      setReceipts(receipts.map((r) =>
        r.id === receiptId ? { ...r, status: 'UNPAID' as const } : r
      ));
    } catch (error) {
      console.error('Error marking receipt as unpaid:', error);
      alert('Failed to update receipt status');
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">All Receipts</h1>
            <p className="text-slate-600 mt-1">
              Browse and manage your uploaded receipts
            </p>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by vendor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <ImageIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-medium text-slate-900">
                No receipts found
              </p>
              <p className="text-slate-600 mt-1">
                {receipts.length === 0
                  ? 'Upload your first receipt to get started'
                  : 'Try adjusting your search'}
              </p>
              {receipts.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => (window.location.href = '/upload')}
                >
                  Upload Receipt
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        {receipt.image_url && (
                          <img
                            src={getImageUrl(receipt.image_url) || ''}
                            alt={receipt.vendor || 'Receipt'}
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(getImageUrl(receipt.image_url))}
                          />
                        )}
                      </TableCell>

                      <TableCell className="font-medium">
                        {receipt.vendor}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {receipt.category || 'Other'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {receipt.date
                          ? new Date(receipt.date).toLocaleDateString()
                          : '-'}
                      </TableCell>

                      <TableCell>
                        ₹{Number(receipt.total || 0).toFixed(2)}
                      </TableCell>

                      <TableCell>
                        {receipt.status === 'PAID' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        {receipt.status === 'UNPAID' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsPaid(receipt.id)}
                            title="Mark as Paid"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsUnpaid(receipt.id)}
                            title="Mark as Unpaid"
                          >
                            <X className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDelete(receipt.id, receipt.image_url)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredReceipts.length > 0 && (
            <div className="text-center text-sm text-slate-600">
              Showing {filteredReceipts.length} of {receipts.length} receipts
            </div>
          )}
        </div>

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
