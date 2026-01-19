# LocalAdmin - SEO Management Interface

Admin dashboard for managing SEO content across the bulk-ichri classified ads platform.

## Features

- **Authentication**: Secure admin login with session management
- **SEO Management**: Edit meta tags, titles, descriptions for:
  - Categories
  - Sub-categories
  - Governorates
  - Cities
  - Landing Pages
  - Car Brands (Marques)
- **Import/Export**: JSON-based data import/export
- **Security**: Row Level Security (RLS) enabled on all tables

## Tech Stack

- Next.js 14
- TypeScript
- Supabase (PostgreSQL)
- TailwindCSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
cd localadmin
npm install
```

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
localadmin/
├── src/
│   ├── app/
│   │   ├── api/admin/     # Admin API routes
│   │   ├── page.tsx       # Main admin interface
│   │   └── layout.tsx     # Root layout
│   └── lib/
│       └── supabase.ts    # Supabase client
├── .env.local            # Environment variables
└── package.json
```

## Database

Tables with RLS policies:
- `admin` - Admin users
- `categories` - Ad categories
- `sous_categories` - Sub-categories
- `gouvernorats_tn` - Tunisia governorates
- `villes_tn` - Tunisia cities
- `landing_pages` - SEO landing pages
- `marques` - Car brands

Backup tables created for recovery:
- `categories_copy`
- `sous_categories_copy`
- `gouvernorats_tn_copy`
- `villes_tn_copy`
- `landing_pages_copy`
- `marques_copy`

## API Endpoints

### POST /api/admin

Admin operations for SEO data management.

**Headers:**
- `x-admin-session`: Admin session JSON

**Body:**
```json
{
  "action": "update|insert|select|delete",
  "table": "categories|sous_categories|gouvernorats_tn|villes_tn|landing_pages|marques",
  "id": number,
  "idField": string,
  "data": object
}
```

## Security

- Service role key used server-side only
- Admin session verification on every request
- Table whitelist prevents SQL injection
- RLS policies restrict database access