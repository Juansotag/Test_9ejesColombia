-- Fix RLS policies to allow anon reads on the new master tables

-- We must explicitly ALLOW public reads because enabling RLS without policies denies everything by default.
-- However, we only enable RLS for user-driven tables (sessions, responses, etc) per our migration script.
-- But wait! The migration script had:
-- ALTER TABLE questions         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE question_options  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidates        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidate_answers DISABLE ROW LEVEL SECURITY;

-- For v2, we didn't disable RLS for axes or candidate_positions explicitly, but they default to disabled in Postgres anyway unless enabled.
-- Let's explicitly DISABLE RLS for all readable tables just in case, which makes them public.

ALTER TABLE axes DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_positions DISABLE ROW LEVEL SECURITY;


-- Since we are here and Supabase usually requires permissions to insert, Let's ensure the RPC can be called anonymously.
-- But RPCs run with SECURITY DEFINER so we just need to make sure anon has usage on schema public (default).
-- We also need to allow inserting into sessions, responses, etc. or trust the RPC to bypass RLS (since it's SECURITY DEFINER).

-- However, the error is at load time (GET request to tables). The public select policies will fix this:
