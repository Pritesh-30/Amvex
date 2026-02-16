export type OCRResult = {
  merchant: string;
  date: string;
  total: number;
};

export async function analyzeReceipt(file: File): Promise<OCRResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/ocr", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("OCR request failed");
  }

  const data = await res.json();
  const structured = data.structured_data || {};

  return {
    merchant: structured.Merchant || "Unknown",
    date: structured.Date || "Unknown",
    total: parseFloat(structured.Total || "0"),
  };
}
