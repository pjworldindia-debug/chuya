// src/index.ts
import * as dotenv2 from "dotenv";
import path3 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
import express from "express";
import cors from "cors";

// src/routes/payment.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

// src/services/shiprocket.ts
var SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in";
var cachedToken = null;
var tokenExpiryTime = 0;
async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error("Shiprocket credentials are not configured in the environment");
  }
  const res = await fetch(`${SHIPROCKET_API_BASE}/v1/external/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Shiprocket Auth Failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.token;
  tokenExpiryTime = Date.now() + 24 * 60 * 60 * 1e3;
  return cachedToken;
}
async function createShiprocketOrder(supabaseAdmin, orderId) {
  try {
    const { data: rawOrder, error: orderError } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
    const order = rawOrder;
    if (orderError || !order) {
      throw new Error(`Order ${orderId} not found`);
    }
    const address = order.shipping_address;
    if (!address) {
      throw new Error("Shipping address missing in order");
    }
    const items = order.items;
    if (!items || !items.length) {
      throw new Error("Items missing in order");
    }
    const orderItems = [];
    let totalWeight = 0;
    let maxLength = 30;
    let maxWidth = 20;
    let maxHeight = 10;
    for (const item of items) {
      const { data: rawProduct } = await supabaseAdmin.from("products").select("weight_kg, length_cm, width_cm, height_cm, sku").eq("id", item.productId).single();
      const product = rawProduct;
      if (product) {
        totalWeight += (product.weight_kg || 1) * item.quantity;
        if (product.length_cm && product.length_cm > maxLength) maxLength = product.length_cm;
        if (product.width_cm && product.width_cm > maxWidth) maxWidth = product.width_cm;
        if (product.height_cm && product.height_cm > maxHeight) maxHeight = product.height_cm;
      } else {
        totalWeight += 1 * item.quantity;
      }
      orderItems.push({
        name: item.name,
        sku: product?.sku || item.slug || item.productId,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
        hsn: 0
      });
    }
    if (totalWeight === 0) totalWeight = 1;
    const dateObj = new Date(order.created_at || Date.now());
    const pad = (n) => n.toString().padStart(2, "0");
    const formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    const nameParts = (address.name || "Customer").trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : " ";
    const payload = {
      order_id: orderId,
      order_date: formattedDate,
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: address.line1,
      billing_address_2: address.line2 || "",
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: "India",
      billing_email: order.guest_email || "customer@chuya.in",
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: "Prepaid",
      sub_total: order.subtotal,
      length: maxLength,
      breadth: maxWidth,
      height: maxHeight,
      weight: totalWeight
    };
    const token = await getAuthToken();
    const response = await fetch(`${SHIPROCKET_API_BASE}/v1/external/orders/create/ad-hoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to create Shiprocket order: ${JSON.stringify(responseData)}`);
    }
    console.log(`Shiprocket order created successfully for ${orderId}:`, responseData.order_id);
    return responseData;
  } catch (error) {
    console.error(`Shiprocket API Error for order ${orderId}:`, error);
    return null;
  }
}

// src/routes/payment.ts
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
var router = Router();
var _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );
  }
  return _supabaseAdmin;
}
var _envLoaded = false;
function ensureEnvLoaded() {
  if (_envLoaded) return;
  _envLoaded = true;
  try {
    const __fn = fileURLToPath(import.meta.url);
    const __dn = path.dirname(__fn);
    dotenv.config({ path: path.resolve(__dn, "../.env") });
    dotenv.config({ path: path.resolve(__dn, "../../.env") });
  } catch {
  }
}
function getPhonePeConfig() {
  ensureEnvLoaded();
  const PHONEPE_MERCHANT_ID = (process.env.PHONEPE_MERCHANT_ID || "").trim();
  const PHONEPE_CLIENT_ID = (process.env.PHONEPE_CLIENT_ID || "").trim();
  const PHONEPE_CLIENT_SECRET = (process.env.PHONEPE_CLIENT_SECRET || "").trim();
  const PHONEPE_ENV = (process.env.PHONEPE_ENV || "production").trim();
  const IS_PROD = PHONEPE_ENV === "production";
  if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
    console.error("CRITICAL: PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET is missing or empty in environment variables.");
    console.error("Checked env keys:", Object.keys(process.env).filter((k) => k.startsWith("PHONEPE")));
  }
  return {
    PHONEPE_MERCHANT_ID,
    PHONEPE_CLIENT_ID,
    PHONEPE_CLIENT_SECRET,
    PHONEPE_ENV,
    IS_PROD,
    URLS: {
      token: IS_PROD ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token" : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
      checkout: IS_PROD ? "https://api.phonepe.com/apis/pg/checkout/v2/pay" : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
      status: IS_PROD ? "https://api.phonepe.com/apis/pg/checkout/v2/order" : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order"
    }
  };
}
var cachedToken2 = null;
var tokenExpiry = 0;
async function getPhonePeToken() {
  if (cachedToken2 && Date.now() < tokenExpiry) {
    return cachedToken2;
  }
  const { PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, URLS } = getPhonePeConfig();
  const params = new URLSearchParams();
  params.append("client_id", PHONEPE_CLIENT_ID);
  params.append("client_secret", PHONEPE_CLIENT_SECRET);
  params.append("client_version", "1");
  params.append("grant_type", "client_credentials");
  const res = await fetch(URLS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("OAuth failed: " + JSON.stringify(data));
  }
  cachedToken2 = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1e3 - 6e4;
  return cachedToken2;
}
router.post("/initiate", async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const {
      orderId,
      amount,
      items,
      shippingAddress,
      userId,
      couponCode,
      subtotal,
      gst,
      discount,
      redirectUrl,
      callbackUrl,
      customerPhone,
      customerEmail,
      paymentMethod
    } = req.body;
    if (!orderId || !amount || !items || !shippingAddress) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }
    const { error: orderError } = await supabaseAdmin.from("orders").insert({
      id: orderId,
      user_id: userId || null,
      guest_email: customerEmail || null,
      items,
      shipping_address: shippingAddress,
      subtotal,
      gst,
      discount: discount || 0,
      coupon_code: couponCode || null,
      total: amount,
      payment_status: paymentMethod === "cod" ? "pending_cod" : "pending",
      fulfilment_status: "placed",
      timeline: [{ status: "placed", timestamp: (/* @__PURE__ */ new Date()).toISOString(), note: paymentMethod === "cod" ? "Order placed (Cash on Delivery)" : "Order placed" }]
    });
    if (orderError) {
      console.error("Order creation error:", orderError);
      res.status(500).json({ success: false, error: "Failed to create order" });
      return;
    }
    if (couponCode) {
      const { error: couponError } = await supabaseAdmin.rpc("increment_coupon_used", { coupon_code: couponCode });
      if (couponError) {
        console.warn("Failed to increment coupon usage");
      }
    }
    if (paymentMethod === "cod") {
      createShiprocketOrder(supabaseAdmin, orderId).then(async (shiprocketRes) => {
        if (shiprocketRes) {
          const { data: currentOrder } = await supabaseAdmin.from("orders").select("timeline").eq("id", orderId).single();
          const timeline = Array.isArray(currentOrder?.timeline) ? currentOrder.timeline : [];
          const newTimeline = [...timeline, {
            status: "confirmed",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            note: `COD Order automatically pushed to Shiprocket (Shipment ID: ${shiprocketRes.shipment_id})`
          }];
          await supabaseAdmin.from("orders").update({ timeline: newTimeline }).eq("id", orderId);
        }
      }).catch((err) => {
        console.error("Shiprocket creation error for COD:", err);
      });
      res.json({
        success: true,
        paymentUrl: redirectUrl,
        // This will go straight to the success page
        transactionId: orderId
      });
      return;
    }
    const accessToken = await getPhonePeToken();
    const amountInPaise = Math.round(amount * 100);
    const payload = {
      merchantOrderId: orderId,
      amount: amountInPaise,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Order ${orderId.slice(0, 8)}`,
        merchantUrls: {
          redirectUrl,
          // User goes here after payment
          callbackUrl
          // Server-to-server webhook (optional in V2 if we use status check)
        }
      }
    };
    console.log("--- PHONEPE V2 INITIATE ---");
    console.log("Payload:", payload);
    const { URLS } = getPhonePeConfig();
    const response = await fetch(URLS.checkout, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `O-Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const phonePeData = await response.json();
    console.log("PhonePe Response:", phonePeData);
    if (phonePeData.redirectUrl) {
      res.json({
        success: true,
        paymentUrl: phonePeData.redirectUrl,
        transactionId: orderId
        // V2 maps orderId directly
      });
    } else {
      console.error("PhonePe error:", phonePeData);
      res.status(400).json({
        success: false,
        error: phonePeData.message || "Payment initiation failed"
      });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal server error" });
  }
});
async function checkAndUpdateStatus(orderId) {
  const supabaseAdmin = getSupabaseAdmin();
  const accessToken = await getPhonePeToken();
  const { URLS } = getPhonePeConfig();
  const statusUrl = `${URLS.status}/${orderId}/status`;
  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      "Authorization": `O-Bearer ${accessToken}`
    }
  });
  const phonePeData = await response.json();
  console.log(`PhonePe Status Response for ${orderId}:`, phonePeData);
  const state = phonePeData.data?.state || phonePeData.state;
  if (state) {
    const paymentStatus = state === "COMPLETED" ? "paid" : state === "FAILED" ? "failed" : "pending";
    if (paymentStatus === "paid") {
      const { data, error } = await supabaseAdmin.rpc("mark_order_paid_and_decrement_stock", { p_order_id: orderId });
      if (error) {
        console.error("RPC Error processing paid order:", error);
        throw new Error("Failed to process successful payment idempotently");
      }
      if (data === "processed") {
        createShiprocketOrder(supabaseAdmin, orderId).then(async (shiprocketRes) => {
          if (shiprocketRes) {
            const { data: currentOrder } = await supabaseAdmin.from("orders").select("timeline").eq("id", orderId).single();
            const timeline = Array.isArray(currentOrder?.timeline) ? currentOrder.timeline : [];
            const newTimeline = [...timeline, {
              status: "confirmed",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              note: `Order automatically pushed to Shiprocket (Shipment ID: ${shiprocketRes.shipment_id})`
            }];
            await supabaseAdmin.from("orders").update({ timeline: newTimeline }).eq("id", orderId);
          }
        }).catch((err) => {
          console.error("Shiprocket creation error:", err);
        });
      }
    } else {
      const { data: currentOrder } = await supabaseAdmin.from("orders").select("payment_status, timeline").eq("id", orderId).single();
      if (currentOrder && currentOrder.payment_status !== paymentStatus) {
        const timeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : [];
        timeline.push({
          status: paymentStatus,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          note: `Payment ${paymentStatus}`
        });
        const { error: updateError } = await supabaseAdmin.from("orders").update({
          payment_status: paymentStatus,
          timeline
        }).eq("id", orderId);
        if (updateError) {
          console.error("Order update error:", updateError);
          throw new Error("Failed to update order status");
        }
      }
    }
    return paymentStatus;
  }
  throw new Error("Could not fetch status from PhonePe");
}
router.get("/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ success: false, error: "Order ID required" });
      return;
    }
    const paymentStatus = await checkAndUpdateStatus(orderId);
    res.json({ success: true, status: paymentStatus });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
router.post("/callback", async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { response } = req.body;
    if (response) {
      const decodedResponse = Buffer.from(response, "base64").toString("utf-8");
      const payload = JSON.parse(decodedResponse);
      const orderId = payload.data?.merchantTransactionId || payload.data?.merchantOrderId;
      if (orderId) {
        await checkAndUpdateStatus(orderId);
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Callback error:", error);
    res.status(200).send("OK");
  }
});
router.all("/redirect/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const frontendUrl = req.query.frontend;
  try {
    await checkAndUpdateStatus(orderId);
  } catch (error) {
    console.error("Redirect status check error:", error.message || error);
  }
  const { PHONEPE_ENV } = getPhonePeConfig();
  const fallbackBase = PHONEPE_ENV === "production" ? "https://chuya.in" : process.env.STOREFRONT_URL || "http://localhost:3000";
  res.redirect(302, `${fallbackBase}/order-success/${orderId}`);
});

// src/routes/coupons.ts
import { Router as Router2 } from "express";
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/utils/cache.ts
var CacheService = class {
  cache = /* @__PURE__ */ new Map();
  /**
   * Get an item from the cache.
   * @param key The cache key
   * @returns The cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  /**
   * Set an item in the cache.
   * @param key The cache key
   * @param value The value to cache
   * @param ttlMs Time to live in milliseconds
   */
  set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }
  /**
   * Delete an item from the cache.
   * @param key The cache key
   */
  delete(key) {
    this.cache.delete(key);
  }
  /**
   * Clear the entire cache.
   */
  clear() {
    this.cache.clear();
  }
};
var cache = new CacheService();

// src/routes/coupons.ts
var router2 = Router2();
var _supabaseAdmin2 = null;
function getSupabaseAdmin2() {
  if (!_supabaseAdmin2) {
    _supabaseAdmin2 = createClient2(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );
  }
  return _supabaseAdmin2;
}
router2.post("/validate", async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin2();
  try {
    const { code, subtotal, paymentMethod } = req.body;
    if (!code || typeof subtotal !== "number") {
      res.status(400).json({ valid: false, error: "Code and subtotal are required" });
      return;
    }
    const upperCode = code.toUpperCase();
    const cacheKey = `coupon_${upperCode}`;
    let coupon = cache.get(cacheKey);
    if (!coupon) {
      const { data, error } = await supabaseAdmin.from("coupons").select("*").eq("code", upperCode).eq("is_active", true).single();
      if (error || !data) {
        res.json({ valid: false, discount: 0, error: "Coupon not found" });
        return;
      }
      coupon = data;
      cache.set(cacheKey, coupon, 5 * 60 * 1e3);
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < /* @__PURE__ */ new Date()) {
      res.json({ valid: false, discount: 0, error: "Coupon has expired" });
      return;
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      res.json({ valid: false, discount: 0, error: "Coupon usage limit reached" });
      return;
    }
    if (subtotal < coupon.min_order_value) {
      res.json({
        valid: false,
        discount: 0,
        error: `Minimum order value is \u20B9${coupon.min_order_value}`
      });
      return;
    }
    if (coupon.is_prepaid_only && paymentMethod === "cod") {
      res.json({
        valid: false,
        discount: 0,
        error: "This coupon is only valid for prepaid orders"
      });
      return;
    }
    let discount = 0;
    if (coupon.discount_type === "flat") {
      discount = coupon.discount_value;
    } else if (coupon.discount_type === "percent") {
      discount = Math.round(subtotal * coupon.discount_value / 100);
    }
    discount = Math.min(discount, subtotal);
    res.json({
      valid: true,
      discount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ valid: false, error: "Internal server error" });
  }
});

// src/routes/email.ts
import { Router as Router3 } from "express";
import { Resend } from "resend";
import { createClient as createClient3 } from "@supabase/supabase-js";
var router3 = Router3();
var resendInstance = null;
var getResend = () => {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY || "");
  }
  return resendInstance;
};
var getSupabaseAdmin3 = () => createClient3(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);
router3.post("/order-confirmation", async (req, res) => {
  try {
    const { to, orderId, items, total, shippingAddress, estimatedDelivery } = req.body;
    if (!to || !orderId) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }
    const itemsHtml = items.map(
      (item) => `<tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-family: 'DM Sans', sans-serif; font-size: 14px;">${item.name}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">\u20B9${(item.price * item.quantity).toLocaleString("en-IN")}</td>
          </tr>`
    ).join("");
    const address = shippingAddress;
    const { error } = await getResend().emails.send({
      from: "CHUYA <orders@chuya.in>",
      to: [to],
      subject: `Order Confirmed \u2014 #${orderId.slice(0, 8)}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'DM Sans', Arial, sans-serif; color: #1A1A1A; background: #F8F5F0; padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; letter-spacing: 0.15em; margin: 0;">CHUYA</h1>
          </div>
          <div style="background: white; padding: 30px;">
            <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; margin: 0 0 20px;">Thank you for your order!</h2>
            <p style="font-size: 14px; color: #8A8A8A; margin: 0 0 20px;">Order #${orderId.slice(0, 8)} has been confirmed.</p>
            <table style="width: 100%; border-collapse: collapse;">
              <thead><tr>
                <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Item</th>
                <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase;">Qty</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase;">Amount</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align: right; margin-top: 16px; font-size: 18px; font-weight: 600;">
              Total: \u20B9${Number(total).toLocaleString("en-IN")}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A8A8A; margin: 0 0 8px;">Shipping To</h3>
            <p style="font-size: 14px; line-height: 1.6; margin: 0;">${address.name}<br/>${address.line1}<br/>${address.city}, ${address.state} - ${address.pincode}</p>
            ${estimatedDelivery ? `<p style="font-size: 14px; color: #8A8A8A; margin-top: 12px;">Estimated delivery: ${estimatedDelivery}</p>` : ""}
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="font-size: 12px; color: #8A8A8A;">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} CHUYA. All rights reserved.</p>
          </div>
        </div>
      `
    });
    if (error) {
      console.error("Email error:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
router3.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: "Email is required" });
      return;
    }
    const supabaseAdmin = getSupabaseAdmin3();
    const { error: insertError } = await supabaseAdmin.from("subscribers").insert({ email });
    if (insertError) {
      console.warn("Subscriber insert failed (might already exist):", insertError);
    }
    const { error } = await getResend().emails.send({
      from: "CHUYA <orders@chuya.in>",
      to: ["pjworldindia@gmail.com"],
      subject: "New Newsletter Subscriber",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1A1A1A;">New Newsletter Subscription!</h2>
          <p>A new user has subscribed to the CHUYA newsletter.</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `
    });
    if (error) {
      console.error("Newsletter email error:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Newsletter route error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// src/routes/store.ts
import { Router as Router4 } from "express";
import { createClient as createClient4 } from "@supabase/supabase-js";
var router4 = Router4();
var _supabaseAdmin3 = null;
function getSupabaseAdmin4() {
  if (!_supabaseAdmin3) {
    _supabaseAdmin3 = createClient4(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );
  }
  return _supabaseAdmin3;
}
var CACHE_TTL = 5 * 60 * 1e3;
router4.get("/home", async (_req, res) => {
  const cacheKey = "store_home_data";
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    res.json({ success: true, data: cachedData });
    return;
  }
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const supabaseAdmin = getSupabaseAdmin4();
    const [
      { data: banners },
      { data: featuredProducts },
      { data: newArrivals },
      { data: categories },
      { count: totalProducts }
    ] = await Promise.all([
      supabaseAdmin.from("banners").select("*").eq("is_active", true).or(`start_date.is.null,start_date.lte.${now}`).or(`end_date.is.null,end_date.gte.${now}`).order("display_order", { ascending: true }),
      supabaseAdmin.from("products").select("*").eq("status", "active").eq("is_featured", true).limit(6),
      supabaseAdmin.from("products").select("*").eq("status", "active").eq("is_new_arrival", true).order("created_at", { ascending: false }).limit(4),
      supabaseAdmin.from("categories").select("*").order("display_order", { ascending: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("status", "active")
    ]);
    const responseData = {
      banners: banners || [],
      featuredProducts: featuredProducts || [],
      newArrivals: newArrivals || [],
      categories: categories || [],
      totalProducts: totalProducts || 0
    };
    cache.set(cacheKey, responseData, CACHE_TTL);
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error fetching home data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch home data" });
  }
});
router4.get("/shop", async (req, res) => {
  const { category, minPrice, maxPrice, sort, search, pageParam = "0", limit = "12" } = req.query;
  const cacheKey = `store_shop_${category}_${minPrice}_${maxPrice}_${sort}_${search}_${pageParam}_${limit}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    res.json({ success: true, data: cachedData });
    return;
  }
  try {
    const pageNum = parseInt(pageParam, 10) || 0;
    const limitNum = parseInt(limit, 10) || 12;
    const supabaseAdmin = getSupabaseAdmin4();
    let query = supabaseAdmin.from("products").select("*", { count: "exact" }).eq("status", "active");
    if (category) query = query.eq("category_id", category);
    if (minPrice) query = query.gte("price", parseFloat(minPrice));
    if (maxPrice) query = query.lte("price", parseFloat(maxPrice));
    if (search) query = query.ilike("name", `%${search}%`);
    switch (sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "name_asc":
        query = query.order("name", { ascending: true });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }
    const from = pageNum * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);
    const [productsResult, { data: categories }] = await Promise.all([
      query,
      supabaseAdmin.from("categories").select("*").order("display_order", { ascending: true })
    ]);
    const responseData = {
      products: productsResult.data || [],
      totalCount: productsResult.count || 0,
      categories: categories || []
    };
    cache.set(cacheKey, responseData, CACHE_TTL);
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch shop data" });
  }
});
router4.get("/product/:slug", async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `store_product_${slug}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    res.json({ success: true, data: cachedData });
    return;
  }
  try {
    const supabaseAdmin = getSupabaseAdmin4();
    const { data: rawProduct, error } = await supabaseAdmin.from("products").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!rawProduct) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }
    const product = rawProduct;
    const [
      { data: relatedProducts },
      { data: similarProducts }
    ] = await Promise.all([
      product.category_id ? supabaseAdmin.from("products").select("*").eq("status", "active").eq("category_id", product.category_id).neq("id", product.id).limit(4) : Promise.resolve({ data: [] }),
      product.related_product_slugs && product.related_product_slugs.length > 0 ? supabaseAdmin.from("products").select("*").eq("status", "active").in("slug", product.related_product_slugs) : Promise.resolve({ data: [] })
    ]);
    const responseData = {
      product,
      relatedProducts: relatedProducts || [],
      similarProducts: similarProducts || []
    };
    cache.set(cacheKey, responseData, CACHE_TTL);
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error(`Error fetching product ${slug}:`, error);
    res.status(404).json({ success: false, error: "Product not found" });
  }
});
router4.post("/clear-cache", (_req, res) => {
  cache.clear();
  res.json({ success: true, message: "Cache cleared successfully" });
});

// src/routes/upload.ts
import { Router as Router5 } from "express";
import multer from "multer";
import fs from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var router5 = Router5();
var __filename = fileURLToPath2(import.meta.url);
var __dirname = path2.dirname(__filename);
var isRoutesDir = __dirname.endsWith("routes");
var baseDir = isRoutesDir ? path2.join(__dirname, "..") : __dirname;
var uploadsDir = path2.join(baseDir, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB limit
});
router5.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const publicUrl = `/api/uploads/${req.file.filename}`;
  res.json({ publicUrl });
});
router5.delete("/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!filename) return res.status(400).json({ error: "Filename required" });
  const filepath = path2.join(uploadsDir, filename);
  if (fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// src/utils/logger.ts
import pino from "pino";
import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";
var logger = pino({
  level: process.env.LOG_LEVEL || "info"
});
var loggerMiddleware = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || uuidv4();
    res.setHeader("X-Request-Id", id);
    return id;
  }
});

// src/index.ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
var __filename2 = fileURLToPath3(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
dotenv2.config({ path: path3.resolve(__dirname2, "../.env") });
var app = express();
app.use(loggerMiddleware);
var PORT = process.env.PORT || 4e3;
app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
var globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 150,
  // Limit each IP to 150 requests per `window`
  message: { success: false, error: "Too many requests, please try again later." },
  standardHeaders: "draft-7",
  legacyHeaders: false
});
var strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 20,
  // Stricter limit for critical endpoints
  message: { success: false, error: "Too many requests, please try again later." },
  standardHeaders: "draft-7",
  legacyHeaders: false
});
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:8081",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5173",
      process.env.STOREFRONT_URL,
      process.env.ADMIN_URL,
      "https://chuya.in",
      "https://www.chuya.in",
      "https://admin.chuya.in"
    ].filter(Boolean);
    const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    const isAllowed = allowedOrigins.some((allowed) => {
      const normalizedAllowed = allowed.endsWith("/") ? allowed.slice(0, -1) : allowed;
      return normalizedAllowed === normalizedOrigin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Request from origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-VERIFY", "Accept", "Origin", "X-Requested-With"]
}));
app.use(express.json({ limit: "10kb" }));
var uploadsPath = path3.join(__dirname2, "../uploads");
app.use("/api/uploads", express.static(uploadsPath));
app.use("/api", globalLimiter);
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api/payment", strictLimiter, router);
app.use("/api/coupons", router2);
app.use("/api/email", strictLimiter, router3);
app.use("/api/store", router4);
app.use("/api/upload", router5);
app.use((err, req, res, _next) => {
  if (err.message && err.message.includes("Not allowed by CORS")) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  req.log ? req.log.error(err, "Unhandled error") : logger.error(err, "Unhandled error");
  res.status(500).json({ success: false, error: "Internal server error" });
});
app.listen(PORT, () => {
  logger.info(`\u{1F680} CHUYA API running on http://localhost:${PORT}`);
});
