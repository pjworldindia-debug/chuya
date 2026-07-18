-- Migration to add conditional coupon requirement for pre-paid only orders

ALTER TABLE coupons ADD COLUMN is_prepaid_only boolean NOT NULL DEFAULT false;
