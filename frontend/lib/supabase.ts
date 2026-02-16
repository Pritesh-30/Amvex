export type Receipt = {
  id: string;
  user_id: string;
  vendor: string | null;
  total: number | null;
  tax: number | null;
  date: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string | null;
  status: 'PAID' | 'UNPAID' | null;
};
