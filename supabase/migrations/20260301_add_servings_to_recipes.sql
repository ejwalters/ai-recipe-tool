-- Add servings column to recipes table if it doesn't exist
-- Run this in Supabase Dashboard > SQL Editor if you don't use Supabase CLI migrations

ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS servings text;

COMMENT ON COLUMN public.recipes.servings IS 'Number of servings (e.g. "4")';
