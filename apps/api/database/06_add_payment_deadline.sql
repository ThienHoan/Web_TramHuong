-- Add payment deadline tracking for order expiration
-- This enables automatic cancellation of unpaid QR payment orders

-- Step 1: Add new status values to the enum (if using enum type)
-- Check if order_status enum exists and add new values
DO $$
BEGIN
    -- Add AWAITING_PAYMENT if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'AWAITING_PAYMENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
        ALTER TYPE order_status ADD VALUE 'AWAITING_PAYMENT';
    END IF;
    
    -- Add EXPIRED if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EXPIRED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
        ALTER TYPE order_status ADD VALUE 'EXPIRED';
    END IF;
END$$;

-- Step 2: Add new columns with timezone support
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

-- Step 3: Add index for cleanup job performance
-- Note: Removed WHERE clause to avoid using uncommitted enum value
-- The cron job will still be efficient with this index
CREATE INDEX IF NOT EXISTS idx_orders_payment_deadline 
ON orders(status, payment_deadline);

-- Step 4: Add comments to document the feature
COMMENT ON COLUMN orders.payment_deadline IS 'Deadline for payment completion (15 minutes for QR payments)';
COMMENT ON COLUMN orders.expired_at IS 'Timestamp when order was automatically expired due to non-payment';

-- Step 5: Set deadline for existing SePay orders (if any)
-- This is optional and only applies to historical data
UPDATE orders 
SET payment_deadline = created_at + INTERVAL '15 minutes'
WHERE payment_method = 'sepay' 
  AND status = 'PENDING'
  AND payment_deadline IS NULL;
