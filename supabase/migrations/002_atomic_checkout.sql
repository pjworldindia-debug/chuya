-- Atomic Checkout RPC
-- Provides an idempotent, race-condition-free way to mark an order as paid and decrement stock.

CREATE OR REPLACE FUNCTION mark_order_paid_and_decrement_stock(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_items jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_timeline jsonb;
BEGIN
  -- 1. Lock the order row to prevent concurrent webhooks from processing the same order
  SELECT payment_status, items, timeline
  INTO v_current_status, v_items, v_timeline
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Idempotency check: if already paid, return true (success, but nothing to do)
  IF v_current_status = 'paid' THEN
    RETURN 'already_paid';
  END IF;

  -- 3. Decrement stock for each item atomically
  -- By using GREATEST(0, ...), we prevent negative stock while allowing the paid order to succeed
  IF v_items IS NOT NULL AND jsonb_typeof(v_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      IF v_item->>'productId' IS NOT NULL THEN
        v_product_id := (v_item->>'productId')::uuid;
        v_quantity := COALESCE((v_item->>'quantity')::integer, 1);
        
        UPDATE products
        SET stock = GREATEST(0, stock - v_quantity)
        WHERE id = v_product_id;
      END IF;
    END LOOP;
  END IF;

  -- 4. Update order status and append to timeline
  v_timeline := COALESCE(v_timeline, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'status', 'confirmed',
      'timestamp', to_jsonb(now()),
      'note', 'Payment confirmed'
    )
  );

  UPDATE orders
  SET 
    payment_status = 'paid',
    fulfilment_status = 'confirmed',
    timeline = v_timeline
  WHERE id = p_order_id;

  RETURN 'processed';
END;
$$;
