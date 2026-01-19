# Changelog

## [1.0.0] - 2026-01-19

### Added
- Initial release of LocalAdmin SEO management interface
- Admin authentication system with session management
- SEO management tabs for:
  - Catégories
  - Sous-catégories
  - Gouvernorats
  - Villes
  - Landing Pages
  - Marques
- Export/Import JSON functionality for all tables
- Row Level Security (RLS) policies for Supabase tables
- Backup tables created for data recovery

### Features
- Responsive sidebar navigation
- Real-time data fetching from Supabase
- Form-based SEO editing interface
- JSON import validation
- Session-based admin authentication

### Database
- RLS enabled on all production tables
- Backup tables created: categories_copy, sous_categories_copy, gouvernorats_tn_copy, villes_tn_copy, landing_pages_copy, marques_copy
- Admin table secured with RLS policies

### Security
- Admin session verification API
- Service role key usage for admin operations
- Table whitelist in API routes
- SQL injection prevention via table validation
