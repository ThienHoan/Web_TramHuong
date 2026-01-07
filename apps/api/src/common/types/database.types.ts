export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          slug: string;
          price: number;
          original_price: number | null;
          images: string[];
          category_id: string | null;
          quantity: number;
          style: string;
          is_active: boolean;
          is_featured: boolean;
          featured_section: string | null;
          variants: any | null;
          discount_percentage: number;
          discount_start_date: string | null;
          discount_end_date: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          slug: string;
          price: number;
          original_price?: number | null;
          images: string[];
          category_id?: string | null;
          quantity?: number;
          style?: string;
          is_active?: boolean;
          is_featured?: boolean;
          featured_section?: string | null;
          variants?: any | null;
          discount_percentage?: number;
          discount_start_date?: string | null;
          discount_end_date?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          slug?: string;
          price?: number;
          original_price?: number | null;
          images?: string[];
          category_id?: string | null;
          quantity?: number;
          style?: string;
          is_active?: boolean;
          is_featured?: boolean;
          featured_section?: string | null;
          variants?: any | null;
          discount_percentage?: number;
          discount_start_date?: string | null;
          discount_end_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      product_translations: {
        Row: {
          id: number;
          product_id: string;
          locale: string;
          title: string;
          description: string;
          specifications: string | null;
          story: string | null;
          seo_title: string | null;
          seo_description: string | null;
        };
        Insert: {
          id?: number;
          product_id: string;
          locale: string;
          title: string;
          description: string;
          specifications?: string | null;
          story?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
        };
        Update: {
          id?: number;
          product_id?: string;
          locale?: string;
          title?: string;
          description?: string;
          specifications?: string | null;
          story?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_translations_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      category_translations: {
        Row: {
          category_id: string;
          locale: string;
          name: string;
          description: string | null;
        };
        Insert: {
          category_id: string;
          locale: string;
          name: string;
          description?: string | null;
        };
        Update: {
          category_id?: string;
          locale?: string;
          name?: string;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'category_translations_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          status: string;
          payment_status: string;
          payment_method: string;
          total: number;
          user_id: string | null;
          shipping_info: any | null;
          items: any | null;
          payment_deadline: string | null;
          tracking_code: string | null;
          voucher_code: string | null;
          voucher_discount_amount: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          status?: string;
          payment_status?: string;
          payment_method: string;
          total: number;
          user_id?: string | null;
          shipping_info?: any | null;
          items: any | null;
          payment_deadline?: string | null;
          tracking_code?: string | null;
          voucher_code?: string | null;
          voucher_discount_amount?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          status?: string;
          payment_status?: string;
          payment_method?: string;
          total?: number;
          user_id?: string | null;
          shipping_info?: any | null;
          items?: any | null;
          payment_deadline?: string | null;
          tracking_code?: string | null;
          voucher_code?: string | null;
          voucher_discount_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          variant_id: string | null;
          variant_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity: number;
          variant_id?: string | null;
          variant_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          variant_id?: string | null;
          variant_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cart_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: string;
          is_banned: boolean;
          full_name: string | null;
          phone_number: string | null;
          province: string | null;
          district: string | null;
          ward: string | null;
          street_address: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: string;
          is_banned?: boolean;
          full_name?: string | null;
          phone_number?: string | null;
          province?: string | null;
          district?: string | null;
          ward?: string | null;
          street_address?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          is_banned?: boolean;
          full_name?: string | null;
          phone_number?: string | null;
          province?: string | null;
          district?: string | null;
          ward?: string | null;
          street_address?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          excerpt: string | null;
          featured_image: string | null;
          category: string | null;
          status: string;
          seo_title: string | null;
          seo_description: string | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content: string;
          excerpt?: string | null;
          featured_image?: string | null;
          category?: string | null;
          status?: string;
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string;
          excerpt?: string | null;
          featured_image?: string | null;
          category?: string | null;
          status?: string;
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string | null;
          product_id: string;
          rating: number;
          comment: string;
          is_verified: boolean;
          reviewer_name: string | null;
          reviewer_avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_id: string;
          rating: number;
          comment: string;
          is_verified?: boolean;
          reviewer_name?: string | null;
          reviewer_avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_id?: string;
          rating?: number;
          comment?: string;
          is_verified?: boolean;
          reviewer_name?: string | null;
          reviewer_avatar?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          topic: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          topic: string;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          topic?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlists_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      vouchers: {
        Row: {
          id: string;
          code: string;
          usage_limit: number | null;
          usage_count: number;
          discount_amount: number;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          usage_limit?: number | null;
          usage_count?: number;
          discount_amount: number;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          usage_limit?: number | null;
          usage_count?: number;
          discount_amount?: number;
          created_at?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
