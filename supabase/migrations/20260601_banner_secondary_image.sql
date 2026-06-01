-- Add secondary_image_url to banners table
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS secondary_image_url TEXT;
