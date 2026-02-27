<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a6afe8e5-5599-42a0-b6af-a30ed88ddb46

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase setup

1. Provision a Supabase project and create the following tables (snake_case columns match the server data mapping):
   - `product_types` (`name` TEXT PRIMARY KEY)
   - `brands` (`name` TEXT PRIMARY KEY)
   - `users` (`id` TEXT PRIMARY KEY, `first_name` TEXT, `last_name` TEXT, `location` TEXT)
   - `movements` (`id` TEXT PRIMARY KEY, `type` TEXT, `product_name` TEXT, `brand` TEXT, `quantity` INTEGER, `is_new` BOOLEAN, `date` TEXT, `notes` TEXT, `supplier` TEXT, `assignee` TEXT)
   - `auth_users` (`username` TEXT PRIMARY KEY, `password` TEXT)
2. Store the Supabase connection credentials in `.env.local` (and in Vercel secrets if you deploy) as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. The server automatically seeds default product types, brands, users (`U-1`, `U-2`) and an admin user (`admin` / `admin1232`) when it starts with an empty database.
