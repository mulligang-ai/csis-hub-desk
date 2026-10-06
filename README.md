# CSIS Hub Desk

A help desk (tickets, shared inbox, customers, canned responses, help docs, customer portal).
Agent app: `/desk`. Customer portal: `/support`. Help docs: `/support/docs`.

## 1. Supabase
1. Create a project, then run `supabase/migrations/0001_csis.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the URL, anon key and service-role key.
3. Open `/desk/login` → **Create an account**. The first account becomes the admin; later sign-ups
   stay inactive until an admin ticks *Active* under **Team**.
   (Optional: turn off email confirmation in Supabase Auth settings to sign in straight away.)

## 2. Receiving tickets by email
Supabase can't receive email, so use an inbound-email provider that POSTs to a webhook. Recommended: **Postmark inbound**.
1. Pick the support address (e.g. `support@agenticireland.ie`) and set `CSIS_SUPPORT_EMAIL`.
2. In Postmark → Inbound, set the webhook to `https://agenticireland.ie/api/inbound-email?secret=<CSIS_INBOUND_SECRET>`
   and point the MX record for the inbound domain (or forward `support@` to Postmark's inbound address).
3. Mailgun/SendGrid inbound routes (form posts) and a plain JSON body also work.

New mail opens a ticket. Replies whose subject contains `[CSIS-1234]` (or reply to a known message) join that ticket.
Auto-replies and our own address are ignored; attachments (≤10 MB) are saved to private storage.

## 3. Sending replies
Set `RESEND_API_KEY` and `CSIS_FROM_EMAIL` (verify the domain in Resend). Without a key, replies are saved but not emailed.
