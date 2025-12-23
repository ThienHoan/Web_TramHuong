-- Add payment columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending', -- pending, paid, failed, refunded
ADD COLUMN IF NOT EXISTS transaction_code text;

-- Index for transaction_code for faster lookup if needed
CREATE INDEX IF NOT EXISTS idx_orders_transaction_code ON public.orders(transaction_code);

-- Check constraints (Drop if exists first to avoid error)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE public.orders 
ADD CONSTRAINT check_payment_method CHECK (payment_method IN ('cod', 'sepay'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders 
ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
