-- Add mobile_video_url to banners table
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS mobile_video_url TEXT;
