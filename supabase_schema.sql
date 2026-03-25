-- TCG Persistent Database Schema
-- Run this in your Supabase SQL Editor to create the tables for the persistent Knowledge DB

-- 1. Games Table
CREATE TABLE IF NOT EXISTS public.tcg_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_key TEXT NOT NULL, -- e.g. "for 6 players chill party game rules how to play"
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    rules_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tcg_games_query ON public.tcg_games(query_key);

-- 2. Locations Table
CREATE TABLE IF NOT EXISTS public.tcg_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_key TEXT NOT NULL,
    location_key TEXT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tcg_locations_query ON public.tcg_locations(query_key, location_key);

-- 3. Plugs Table
CREATE TABLE IF NOT EXISTS public.tcg_plugs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_key TEXT NOT NULL,
    location_key TEXT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tcg_plugs_query ON public.tcg_plugs(query_key, location_key);

-- Enable RLS (Public read, service-role write)
ALTER TABLE public.tcg_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_plugs ENABLE ROW LEVEL SECURITY;

-- Create policies for anon read access
CREATE POLICY "Allow public read access to games" ON public.tcg_games FOR SELECT USING (true);
CREATE POLICY "Allow public read access to locations" ON public.tcg_locations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to plugs" ON public.tcg_plugs FOR SELECT USING (true);

-- Insert policies (Anon can insert if they hit the Edge Function, but we rely on the API doing it securely via service role or anon key with permissive insert for caching)
CREATE POLICY "Allow anon insert to games" ON public.tcg_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert to locations" ON public.tcg_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert to plugs" ON public.tcg_plugs FOR INSERT WITH CHECK (true);
