# Deployment checklist

## 1. Prepare Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
3. Configure Supabase Auth if cloud authentication is enabled.
4. Configure Row Level Security and policies for authenticated shop staff.
5. Copy the project URL and anonymous key.

The current browser sync adapter uses the anonymous key. Never put a Supabase service-role
key in this application.

## 2. Configure Vercel

Import the repository into Vercel and add these environment variables for Production,
Preview, and Development as appropriate:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
AUTH_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

Use a long random value for `AUTH_SECRET` and a unique password for `ADMIN_PASSWORD`.
Do not paste secrets into source files or commit `.env.local`.

## 3. Build verification

Run locally before deploying:

```bash
npm ci
npm run lint
npm test
npm run build
```

## 4. First production smoke test

After deployment:

1. Open the public catalog.
2. Add a product to the public cart.
3. Submit an order and confirm it appears in Admin > Online Orders.
4. Sign in with the configured admin credentials.
5. Create a test invoice with a small quantity.
6. Confirm stock decreases exactly once.
7. Test a split Cash + UPI payment.
8. Confirm the daily Galla totals.
9. Download a backup.
10. Test cloud sync only after checking the Supabase tables.
11. Remove any test records before handing over the system.

## 5. Operational safety

- Keep a regular downloaded backup.
- Never expose `ADMIN_PASSWORD`, `AUTH_SECRET`, Gmail app passwords, or Supabase service keys.
- Do not enable anonymous Supabase writes for business tables.
- Verify email and WhatsApp delivery separately from invoice creation.
- Tax is disabled; do not represent generated receipts as GST invoices.
