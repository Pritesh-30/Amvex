'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { analyzeReceipt, type OCRResult } from '@/lib/ocr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'PAID' | 'UNPAID'>('PAID');


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setOcrResult(null);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setOcrResult(null);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };
function parseOCRDate(dateStr: string): string | null {
  if (!dateStr) return null;

  dateStr = dateStr.trim();

  // Case 1: already valid
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) {
    return direct.toISOString().split("T")[0];
  }

  // Case 2: formats like DD/MM/YYYY or DD-MM-YYYY
  let parts = dateStr.split(/[\/\-]/);

  if (parts.length === 3) {
    let [day, month, year] = parts;

    // Handle 2-digit year
    if (year.length === 2) {
      year = "20" + year;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError('');

    try {
      const result = await analyzeReceipt(file);
      setOcrResult(result);
    } catch (err) {
      setError('Failed to analyze receipt. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
  if (!file || !ocrResult) return;

  setSaving(true);
  setError('');

  try {
    // Get actual session user from Supabase
    const { data } = await supabaseBrowser.auth.getSession();
    const sessionUser = data.session?.user;
    console.log("Session user:", sessionUser);


    if (!sessionUser) {
      throw new Error("User not authenticated");
    }

    const fileName = `${sessionUser.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseBrowser.storage
      .from('receipts')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const formattedDate = parseOCRDate(ocrResult.date);

    const { error: insertError } = await supabaseBrowser
      .from('receipts')
      .insert({
        user_id: sessionUser.id,   // IMPORTANT
        vendor: ocrResult.merchant,
        date: formattedDate,
        total: ocrResult.total,
        status: status,
        image_url: fileName,
      });

    if (insertError) throw insertError;

    router.push('/receipts');
  } catch (err: any) {
    setError(err.message || 'Failed to save receipt');
  } finally {
    setSaving(false);
  }
};


  return (
    <ProtectedRoute>
      <SidebarLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Upload Receipt</h1>
            <p className="text-slate-600 mt-1">
              Upload a receipt image for automatic OCR analysis
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-medium text-slate-900">
                    Drop your receipt here or click to browse
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Supports JPG, PNG, and other image formats
                  </p>
                </label>
              </div>

              {preview && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4 text-slate-600" />
                      <span className="font-medium text-slate-900">Preview</span>
                    </div>
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-96 mx-auto rounded-lg border"
                    />
                  </div>

                  {!ocrResult && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Receipt'
                      )}
                    </Button>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {ocrResult && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Merchant Name</Label>
                    <Input value={ocrResult.merchant} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input value={ocrResult.date} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <Input
                      value={`$${ocrResult.total.toFixed(2)}`}
                      readOnly
                      className="mt-1"
                    />
                  </div>
                  <div>
  <Label>Payment Status</Label>
  <Select value={status} onValueChange={(val) => setStatus(val as 'PAID' | 'UNPAID')}>
    <SelectTrigger className="mt-1">
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="PAID">Paid</SelectItem>
      <SelectItem value="UNPAID">Unpaid</SelectItem>
    </SelectContent>  
  </Select>
</div>

                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Receipt'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
