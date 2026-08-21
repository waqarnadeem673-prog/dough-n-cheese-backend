-- ==============================================================================
-- Dough N Cheese — Orders Realtime Publication Migration
-- Migration: 20260820_orders_realtime.sql
-- Enables Supabase Realtime broadcast for orders table
-- ==============================================================================

-- Add orders table to supabase_realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
END $$;
