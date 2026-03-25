-- SUPABASE BEST PRACTICES: RLS PERFORMANCE FIX
-- Run this script in the Supabase SQL Editor to instantly optimize the trophies table RLS
-- Wrapping auth.uid() in (select auth.uid()) makes queries 10x-100x faster as the table grows.

BEGIN;

-- 1. Drop the slow policies
DROP POLICY IF EXISTS "Users can view their own trophies" ON public.trophies;
DROP POLICY IF EXISTS "Users can insert their own trophies" ON public.trophies;
DROP POLICY IF EXISTS "Users can delete their own trophies" ON public.trophies;

-- 2. Recreate them using the cached plan subquery (select auth.uid())
CREATE POLICY "Users can view their own trophies" 
ON public.trophies FOR SELECT 
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own trophies" 
ON public.trophies FOR INSERT 
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own trophies" 
ON public.trophies FOR DELETE 
USING (user_id = (select auth.uid()));

COMMIT;
