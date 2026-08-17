# Service Role Key Rotation

## Why

If the Supabase `service_role` key has been exposed (e.g., in logs, chat history, or version control), it must be rotated immediately. The service role key bypasses Row Level Security and has full database access.

## Steps

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → select the AnonEmote project
2. Navigate to **Project Settings** → **API**
3. Under "Project API keys", find the `service_role` key
4. Click **Regenerate** to create a new key
5. Update the key in all deployment environments:
   - **Render**: Dashboard → Environment → `SUPABASE_SERVICE_KEY`
   - **Local development**: `backend/.env` → `SUPABASE_SERVICE_KEY`
6. Restart the backend service after updating

## Important Notes

- This is a **manual action item** — there is no code-level fix for key exposure
- The old key is immediately invalidated after regeneration
- All active backend instances will lose database access until the new key is deployed
- Consider rotating during low-traffic periods to minimize disruption
