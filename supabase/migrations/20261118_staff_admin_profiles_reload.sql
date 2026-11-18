-- Optional: after running 20261118_staff_admin_profiles.sql, reload PostgREST
-- schema cache if you still see "Could not find the 'portfolio' column".
-- Safe to run anytime in the Supabase SQL editor.

notify pgrst, 'reload schema';
