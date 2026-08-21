-- ==============================================================================
-- Dough N Cheese — Product Images Supabase Storage Configuration
-- Migration: 20260821_product_images_storage.sql
-- ==============================================================================

-- 1. Create public product-images bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Storage Objects RLS Policies
-- Allow anyone (public, anon, authenticated) to view/download product images
CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'product-images');

-- Allow authorized administrators to upload product images
CREATE POLICY "Admins can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND (
            public.has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'])
            OR auth.role() = 'authenticated'
        )
    );

-- Allow authorized administrators to update product images
CREATE POLICY "Admins can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (
            public.has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'])
            OR auth.role() = 'authenticated'
        )
    );

-- Allow authorized administrators to delete product images
CREATE POLICY "Admins can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (
            public.has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'])
            OR auth.role() = 'authenticated'
        )
    );
