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

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string; // format: '2024-01'
  created_at: string | null;
};

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Groceries',
  'Education',
  'Travel',
  'Personal Care',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
