# AMVEX - Automated Financial Receipt Management

A modern full-stack web application for managing financial receipts with automated OCR analysis.

## Tech Stack

**Frontend:**
- Next.js 13 (App Router)
- React 18
- Tailwind CSS
- shadcn/ui components

**Backend:**
- Next.js API Routes
- Supabase (Database & Storage)
- Supabase Auth (Authentication)

**Database:**
- PostgreSQL (via Supabase)
- Row Level Security (RLS) enabled

## Features

### Authentication
- Email and password registration
- Secure login system
- Protected routes
- Session management with Supabase Auth

### Dashboard
- Overview statistics:
  - Total receipts count
  - Total paid amount
  - Total unpaid amount
- Quick action cards
- Modern sidebar navigation

### Receipt Upload
- Drag-and-drop file upload
- Image preview
- OCR analysis (placeholder for future FastAPI integration)
- Automatic field extraction:
  - Merchant name
  - Date
  - Total amount
  - Payment status

### Receipt Management
- Table view with all receipts
- Image thumbnails
- Search by merchant name
- Filter by payment status (Paid/Unpaid)
- Delete receipts
- Status badges with color coding

## Database Schema

### receipts table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- merchant (text)
- date (date)
- total (numeric)
- status (text: 'PAID' or 'UNPAID')
- image_path (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Storage
- Bucket: `receipts`
- Public access for viewing
- User-specific upload permissions
- Images organized by user_id

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Environment variables are already configured in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Database is already set up with:
   - receipts table with RLS policies
   - Storage bucket for images
   - Proper indexes for performance

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
/app
  /dashboard        - Dashboard with statistics
  /login           - Login page
  /register        - Registration page
  /receipts        - All receipts table view
  /upload          - Upload and analyze receipts
  layout.tsx       - Root layout with AuthProvider

/components
  /ui              - shadcn/ui components
  protected-route.tsx   - Protected route wrapper
  sidebar-layout.tsx    - Dashboard sidebar layout

/lib
  auth-context.tsx      - Authentication context
  ocr.ts               - OCR placeholder function
  supabase.ts          - Server-side Supabase client
  supabase-browser.ts  - Client-side Supabase client
  utils.ts             - Utility functions
```

## OCR Integration

The OCR functionality is currently a placeholder that returns mock data. To integrate with a real OCR backend:

### Current Implementation (`lib/ocr.ts`):
```typescript
export async function analyzeReceipt(image: File): Promise<OCRResult> {
  // Returns mock data
}
```

### Future FastAPI Integration:
Replace the placeholder function with an API call to your FastAPI OCR service:

```typescript
export async function analyzeReceipt(image: File): Promise<OCRResult> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await fetch('http://your-fastapi-url/analyze', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
```

## Usage Guide

### First Time Setup

1. **Register**: Navigate to `/register` and create an account
2. **Login**: Sign in with your credentials
3. **Upload Receipt**: Go to "Upload Receipt" and:
   - Drag and drop an image or click to browse
   - Click "Analyze Receipt" to extract data
   - Review the extracted information
   - Click "Save Receipt" to store it

### Managing Receipts

- **View Dashboard**: See overview statistics on the dashboard
- **Browse Receipts**: Go to "All Receipts" to see your receipt table
- **Search**: Use the search bar to find receipts by merchant name
- **Filter**: Filter by payment status (All, Paid, Unpaid)
- **Delete**: Click the trash icon to remove a receipt

## Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only access their own receipts
- Secure authentication with Supabase Auth
- Protected API routes
- Session-based authorization
- Storage policies restrict access to user's own files

## API Endpoints

### Authentication
- Handled by Supabase Auth
- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`

### Receipts
- Database operations via Supabase client
- Direct queries with RLS enforcement
- Real-time updates available

## Styling

The application uses a clean, modern design with:
- Neutral color palette (slate tones)
- Professional dashboard layout
- Responsive design for mobile and desktop
- Status badges (Green for Paid, Red for Unpaid)
- Hover states and transitions
- Loading states for async operations

## Future Enhancements

- Connect to FastAPI OCR backend
- Add receipt editing functionality
- Export receipts to CSV/PDF
- Advanced filtering (date range, amount range)
- Receipt categories/tags
- Multi-currency support
- Receipt analytics and insights
- Email notifications
- Mobile app version

## Troubleshooting

### Common Issues

**Build Errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that Node.js version is 18 or higher

**Authentication Issues:**
- Verify Supabase credentials in `.env`
- Check that Supabase project is active
- Ensure email confirmation is disabled in Supabase settings

**Image Upload Issues:**
- Verify storage bucket exists in Supabase
- Check storage policies are configured
- Ensure file size is within limits

## License

This project is for demonstration purposes.

## Support

For issues or questions, please refer to:
- Next.js Documentation: https://nextjs.org/docs
- Supabase Documentation: https://supabase.io/docs
- Tailwind CSS: https://tailwindcss.com/docs
