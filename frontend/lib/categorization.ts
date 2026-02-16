import { ExpenseCategory } from './supabase';

// Vendor patterns for auto-categorization
const CATEGORY_PATTERNS: Record<ExpenseCategory, string[]> = {
  'Food & Dining': [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'mcdonald', 'kfc', 'subway',
    'starbucks', 'domino', 'zomato', 'swiggy', 'uber eats', 'dine', 'food', 'kitchen',
    'biryani', 'chicken', 'bakery', 'tea', 'snack', 'dhaba', 'hotel', 'canteen',
    'mess', 'tiffin', 'juice', 'ice cream', 'dessert', 'sweet'
  ],
  'Groceries': [
    'grocery', 'supermarket', 'mart', 'bigbasket', 'blinkit', 'dmart', 'reliance fresh',
    'more', 'spencer', 'grofers', 'zepto', 'instamart', 'vegetable', 'fruit',
    'kirana', 'provisions', 'store', 'bazaar', 'market'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'shopping',
    'mall', 'cloth', 'fashion', 'shoe', 'watch', 'jewel', 'electronics', 'mobile',
    'phone', 'laptop', 'appliance', 'furniture', 'decor', 'gift', 'retail', 'brand'
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'petrol', 'diesel', 'fuel', 'gas station', 'parking',
    'toll', 'metro', 'bus', 'train', 'irctc', 'railway', 'auto', 'taxi', 'cab',
    'transport', 'travel', 'car wash', 'service station', 'repair', 'tyre'
  ],
  'Utilities': [
    'electricity', 'electric', 'power', 'water', 'gas', 'internet', 'wifi', 'broadband',
    'phone bill', 'mobile bill', 'airtel', 'jio', 'vodafone', 'bsnl', 'dth', 'tata sky',
    'dish tv', 'cable', 'utility', 'bill payment', 'recharge'
  ],
  'Healthcare': [
    'hospital', 'clinic', 'doctor', 'pharmacy', 'medical', 'medicine', 'health',
    'diagnostic', 'lab', 'pathology', 'apollo', 'fortis', 'max', 'medplus', 'netmeds',
    'pharmeasy', '1mg', 'dentist', 'dental', 'eye', 'optical', 'therapy'
  ],
  'Entertainment': [
    'movie', 'cinema', 'pvr', 'inox', 'netflix', 'prime video', 'hotstar', 'spotify',
    'game', 'gaming', 'playstation', 'xbox', 'concert', 'event', 'show', 'ticket',
    'bookmyshow', 'amusement', 'park', 'club', 'pub', 'bar', 'entertainment'
  ],
  'Education': [
    'school', 'college', 'university', 'tuition', 'coaching', 'course', 'education',
    'book', 'stationery', 'udemy', 'coursera', 'unacademy', 'byju', 'library',
    'exam', 'test', 'certification', 'training', 'workshop', 'class'
  ],
  'Travel': [
    'flight', 'airline', 'indigo', 'spicejet', 'air india', 'vistara', 'goair',
    'hotel', 'oyo', 'airbnb', 'booking', 'makemytrip', 'goibibo', 'yatra',
    'cleartrip', 'resort', 'vacation', 'tour', 'travel', 'luggage'
  ],
  'Personal Care': [
    'salon', 'spa', 'beauty', 'parlour', 'parlor', 'haircut', 'grooming',
    'cosmetic', 'skincare', 'makeup', 'bodycare', 'gym', 'fitness', 'yoga',
    'wellness', 'therapy', 'massage'
  ],
  'Other': []
};

/**
 * Auto-categorize a receipt based on vendor name using pattern matching
 */
export function autoCategorize(vendorName: string): ExpenseCategory {
  if (!vendorName) return 'Other';
  
  const lowerVendor = vendorName.toLowerCase().trim();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'Other') continue;
    
    for (const pattern of patterns) {
      if (lowerVendor.includes(pattern)) {
        return category as ExpenseCategory;
      }
    }
  }
  
  return 'Other';
}

/**
 * Get a confidence score for the categorization (0-100)
 */
export function getCategoryConfidence(vendorName: string, category: ExpenseCategory): number {
  if (!vendorName || category === 'Other') return 0;
  
  const lowerVendor = vendorName.toLowerCase().trim();
  const patterns = CATEGORY_PATTERNS[category];
  
  if (!patterns) return 0;
  
  // Check for exact matches (higher confidence)
  for (const pattern of patterns) {
    if (lowerVendor === pattern) return 95;
    if (lowerVendor.startsWith(pattern)) return 85;
    if (lowerVendor.includes(pattern)) return 75;
  }
  
  return 50; // Default confidence for manual categorization
}

/**
 * Get suggested categories for a vendor (returns top 3 likely categories)
 */
export function getSuggestedCategories(vendorName: string): ExpenseCategory[] {
  if (!vendorName) return ['Other'];
  
  const lowerVendor = vendorName.toLowerCase().trim();
  const matches: { category: ExpenseCategory; score: number }[] = [];
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'Other') continue;
    
    let score = 0;
    for (const pattern of patterns) {
      if (lowerVendor === pattern) score = Math.max(score, 100);
      else if (lowerVendor.startsWith(pattern)) score = Math.max(score, 80);
      else if (lowerVendor.includes(pattern)) score = Math.max(score, 60);
    }
    
    if (score > 0) {
      matches.push({ category: category as ExpenseCategory, score });
    }
  }
  
  // Sort by score descending and take top 3
  matches.sort((a, b) => b.score - a.score);
  const suggestions = matches.slice(0, 3).map(m => m.category);
  
  // Always include 'Other' as fallback if less than 3 suggestions
  if (suggestions.length < 3) {
    suggestions.push('Other');
  }
  
  return suggestions;
}
