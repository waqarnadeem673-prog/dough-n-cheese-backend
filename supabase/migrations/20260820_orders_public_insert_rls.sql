-- ==============================================================================
-- Dough N Cheese — Public Pending Orders RLS Migration
-- Migration: 20260820_orders_public_insert_rls.sql
-- Enables secure unauthenticated order placement while strictly locking reads/updates
-- ==============================================================================

-- 1. Orders Public INSERT Policy
-- Only permits insertion with status = 'PENDING' and non-negative calculations
CREATE POLICY "Public can create pending orders"
    ON orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        status = 'PENDING'
        AND customer_name IS NOT NULL
        AND customer_phone IS NOT NULL
        AND subtotal >= 0
        AND discount_amount >= 0
        AND total >= 0
    );

-- 2. Order Items Public INSERT Policy
-- Only permits inserting line items with valid quantity and prices
CREATE POLICY "Public can insert order items"
    ON order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        quantity > 0
        AND unit_price >= 0
        AND line_total >= 0
    );
