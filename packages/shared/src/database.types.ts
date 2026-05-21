export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          compare_at_price: number | null
          category_id: string | null
          tags: string[] | null
          images: string[] | null
          stock: number
          sku: string | null
          is_featured: boolean
          is_new_arrival: boolean
          status: 'active' | 'draft' | 'archived'
          material: string | null
          dimensions: string | null
          care_instructions: string | null
          seo_title: string | null
          seo_description: string | null
          related_product_slugs: string[] | null
          color_variants: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          compare_at_price?: number | null
          category_id?: string | null
          tags?: string[] | null
          images?: string[] | null
          stock?: number
          sku?: string | null
          is_featured?: boolean
          is_new_arrival?: boolean
          status?: 'active' | 'draft' | 'archived'
          material?: string | null
          dimensions?: string | null
          care_instructions?: string | null
          seo_title?: string | null
          seo_description?: string | null
          related_product_slugs?: string[] | null
          color_variants?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          compare_at_price?: number | null
          category_id?: string | null
          tags?: string[] | null
          images?: string[] | null
          stock?: number
          sku?: string | null
          is_featured?: boolean
          is_new_arrival?: boolean
          status?: 'active' | 'draft' | 'archived'
          material?: string | null
          dimensions?: string | null
          care_instructions?: string | null
          seo_title?: string | null
          seo_description?: string | null
          related_product_slugs?: string[] | null
          color_variants?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          image_url: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_url?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          image_url?: string | null
          display_order?: number
          created_at?: string
        }
      }
      banners: {
        Row: {
          id: string
          image_url: string
          title: string | null
          subtitle: string | null
          cta_label: string | null
          cta_url: string | null
          text_color: 'light' | 'dark'
          overlay_opacity: number
          display_order: number
          is_active: boolean
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          title?: string | null
          subtitle?: string | null
          cta_label?: string | null
          cta_url?: string | null
          text_color?: 'light' | 'dark'
          overlay_opacity?: number
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          title?: string | null
          subtitle?: string | null
          cta_label?: string | null
          cta_url?: string | null
          text_color?: 'light' | 'dark'
          overlay_opacity?: number
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          guest_email: string | null
          items: Json
          shipping_address: Json
          subtotal: number
          gst: number
          discount: number
          coupon_code: string | null
          total: number
          phonepe_transaction_id: string | null
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          fulfilment_status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          timeline: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_email?: string | null
          items: Json
          shipping_address: Json
          subtotal: number
          gst: number
          discount?: number
          coupon_code?: string | null
          total: number
          phonepe_transaction_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          fulfilment_status?: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          timeline?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          guest_email?: string | null
          items?: Json
          shipping_address?: Json
          subtotal?: number
          gst?: number
          discount?: number
          coupon_code?: string | null
          total?: number
          phonepe_transaction_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          fulfilment_status?: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          timeline?: Json
          created_at?: string
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'flat' | 'percent'
          discount_value: number
          min_order_value: number
          max_uses: number | null
          used_count: number
          expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'flat' | 'percent'
          discount_value: number
          min_order_value?: number
          max_uses?: number | null
          used_count?: number
          expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          discount_type?: 'flat' | 'percent'
          discount_value?: number
          min_order_value?: number
          max_uses?: number | null
          used_count?: number
          expires_at?: string | null
          is_active?: boolean
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          added_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          added_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          line1: string
          line2: string | null
          city: string
          state: string
          pincode: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          line1: string
          line2?: string | null
          city: string
          state: string
          pincode: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          line1?: string
          line2?: string | null
          city?: string
          state?: string
          pincode?: string
          is_default?: boolean
          created_at?: string
        }
      }
      subscribers: {
        Row: {
          email: string
          subscribed_at: string
        }
        Insert: {
          email: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          subscribed_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: 'customer' | 'owner'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          role?: 'customer' | 'owner'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          role?: 'customer' | 'owner'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
