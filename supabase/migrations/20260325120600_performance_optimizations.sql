-- SUPABASE BEST PRACTICES: PERFORMANCE OPTIMIZATIONS
--
-- This migration implements optimizations based on the supabase-postgres-best-practices skill.
-- It adds indexes for RLS policies, foreign keys (where applicable), and TTL cleanups,
-- as well as unique constraints to support idempotent caching (upsert).

BEGIN;

-- 1. Index for RLS-filtered queries on trophies
-- Rule: security-rls-performance (Add index on columns used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_trophies_user_id ON public.trophies (user_id);

-- 2. Indexes for TTL cleanups (search cache)
-- Rule: query-missing-indexes (Add index on columns used in WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_tcg_locations_created_at ON public.tcg_locations (created_at);
CREATE INDEX IF NOT EXISTS idx_tcg_plugs_created_at ON public.tcg_plugs (created_at);

-- 3. Unique constraints to support upsert (preventing duplicate cache entries)
-- Rule: data-upsert (Use upsert instead of insert for idempotent caching)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tcg_games_unique 
  ON public.tcg_games (query_key, title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tcg_locations_unique 
  ON public.tcg_locations (query_key, location_key, title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tcg_plugs_unique 
  ON public.tcg_plugs (query_key, location_key, title);

-- 4. Update table statistics
-- Rule: monitor-vacuum-analyze (Maintain table statistics with ANALYZE)
ANALYZE public.trophies;
ANALYZE public.tcg_games;
ANALYZE public.tcg_locations;
ANALYZE public.tcg_plugs;

COMMIT;
