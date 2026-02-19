'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { analyzeReceipt, type OCRResult } from '@/lib/ocr';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/supabase';
import { autoCategorize } from '@/lib/categorization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2, Tag, CalendarIcon, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  
  // Editable fields state
  const [editableMerchant, setEditableMerchant] = useState('');
  const [editableDate, setEditableDate] = useState<Date | undefined>(undefined);
  const [editableTotal, setEditableTotal] = useState('');

  // Set editable fields when OCR result changes
  useEffect(() => {
    if (ocrResult) {
      // Set editable fields from OCR result
      setEditableMerchant(ocrResult.merchant || '');
      setEditableTotal(ocrResult.total?.toString() || '0');
      
      // Try to parse the date
      const parsedDate = parseOCRDateToDate(ocrResult.date);
      if (parsedDate) {
        setEditableDate(parsedDate);
      }
      
      // Set category based on vendor
      if (ocrResult.merchant) {
        const suggestedCategory = autoCategorize(ocrResult.merchant);
        setCategory(suggestedCategory);
      }
    }
  }, [ocrResult]);

  // Helper to parse OCR date string to Date object
  function parseOCRDateToDate(dateStr: string): Date | undefined {
    if (!dateStr || dateStr === 'Unknown') return undefined;
    
    const cleaned = dateStr.trim();
    
    // Try standard Date parse first
    const direct = new Date(cleaned);
    if (!isNaN(direct.getTime())) return direct;
    
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = cleaned.split(/[\/\-]/);
    if (parts.length === 3) {
      let [day, month, year] = parts;
      if (year.length === 2) year = '20' + year;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    
    // Try "DD MMM YYYY" format
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dmy = cleaned.toUpperCase().match(/(\d{1,2})\s*([A-Z]{3,9})\s*(\d{2,4})/);
    if (dmy) {
      const d = parseInt(dmy[1]);
      const mIdx = monthNames.findIndex(m => dmy[2].startsWith(m));
      let y = parseInt(dmy[3]);
      if (y < 100) y += 2000;
      if (mIdx >= 0) {
        const parsed = new Date(y, mIdx, d);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    
    return undefined;
  }


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

    // Use editable values instead of raw OCR
    const formattedDate = editableDate ? format(editableDate, 'yyyy-MM-dd') : null;
    const totalAmount = parseFloat(editableTotal) || 0;

    const { error: insertError } = await supabaseBrowser
      .from('receipts')
      .insert({
        user_id: sessionUser.id,
        vendor: editableMerchant || ocrResult.merchant,
        date: formattedDate,
        total: totalAmount,
        status: status,
        category: category,
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    All fields are editable. Please verify and correct the extracted data.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Merchant Name</Label>
                    <Input 
                      value={editableMerchant} 
                      onChange={(e) => setEditableMerchant(e.target.value)}
                      className="mt-1" 
                      placeholder="Enter merchant name"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !editableDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editableDate ? format(editableDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editableDate}
                          onSelect={setEditableDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {ocrResult.date && ocrResult.date !== 'Unknown' && (
                      <p className="text-xs text-slate-500 mt-1">Detected: {ocrResult.date}</p>
                    )}
                  </div>
                  <div>
                    <Label>Total Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editableTotal}
                      onChange={(e) => setEditableTotal(e.target.value)}
                      className="mt-1"
                      placeholder="0.00"
                    />
                    {ocrResult.total > 0 && (
                      <p className="text-xs text-slate-500 mt-1">Detected: ₹{ocrResult.total.toFixed(2)}</p>
                    )}
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

                {/* Category Selection */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Category
                      </Label>
                      <Select value={category} onValueChange={(val) => {
                        setCategory(val as ExpenseCategory);
                      }}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>  
                      </Select>
                    </div>
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
