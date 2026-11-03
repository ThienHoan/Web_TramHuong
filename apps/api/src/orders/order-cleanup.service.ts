import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  /**
   * Auto-cancel expired payment orders
   * Runs every 5 minutes to find and process orders past their payment deadline
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredPayments() {
    this.logger.log('[OrderCleanup] Running expired payment cleanup...');

    const now = new Date().toISOString();

    // Find orders that are awaiting payment and past their deadline
    const { data: expiredOrders, error } = await this.client
      .from('orders')
      .select('*')
      .eq('status', 'AWAITING_PAYMENT')
      .lt('payment_deadline', now); // Only process orders not yet expired

    if (error) {
      // Handle specific network errors gracefully
      if (
        JSON.stringify(error).includes('EAI_AGAIN') ||
        JSON.stringify(error).includes('fetch failed')
      ) {
        this.logger.warn(
          '[OrderCleanup] Network connectivity issue (DNS/Timeout). Will retry next cycle.',
        );
        return;
      }
      this.logger.error('[OrderCleanup] Error fetching expired orders:', error);
      return;
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      this.logger.log('[OrderCleanup] No expired orders found');
      return;
    }

    this.logger.log(
      `[OrderCleanup] Found ${expiredOrders.length} expired order(s) to process`,
    );

    for (const order of expiredOrders) {
      await this.expireOrder(order);
    }

    this.logger.log('[OrderCleanup] Cleanup completed');
  }

  /**
   * Process a single expired order:
   * 1. Restore stock for all items
   * 2. Update order status to EXPIRED
   */
  private async expireOrder(
    order: import('../common/types/database.types').Database['public']['Tables']['orders']['Row'],
  ) {
    const orderId = order.id;

    try {
      this.logger.log(`[OrderCleanup] Processing expired order: ${orderId}`);

      // The database trigger restores stock inside this status update.
      // 2. Update order status to EXPIRED
      const { error: updateOrderError } = await this.client.rpc('transition_order', {
        p_id: orderId, p_status: 'EXPIRED', p_expected_status: 'AWAITING_PAYMENT',
      });

      if (updateOrderError) {
        throw updateOrderError;
      }

      this.logger.log(`[OrderCleanup] Successfully expired order: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `[OrderCleanup] Failed to process expired order ${orderId}:`,
        error,
      );
    }
  }
}
