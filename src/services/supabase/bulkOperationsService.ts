import { supabase } from '../../lib/supabase';
import { COLLECTIONS } from '../../constants/firebase';

export type BulkOperationType =
  | 'user_suspend'
  | 'user_verify'
  | 'user_activate'
  | 'video_approve'
  | 'video_reject'
  | 'video_flag'
  | 'event_activate'
  | 'event_deactivate';

export interface BulkSelectableItem {
  id: string;
  type: 'user' | 'video' | 'event';
  [key: string]: any;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string; }>;
  operationId: string;
}

export interface BulkOperationProgress {
  total: number;
  processed: number;
  failed: number;
  currentItem?: string;
}

class BulkOperationsService {
  private readonly BATCH_SIZE = 500;

  async executeBulkOperation(
    operation: BulkOperationType,
    items: BulkSelectableItem[],
    reason?: string,
    onProgress?: (progress: BulkOperationProgress) => void
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_${operation}_${Date.now()}`;
    const result: BulkOperationResult = {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: [],
      operationId
    };

    if (items.length === 0) {
      result.success = true;
      return result;
    }

    try {
      const batches = this.createBatches(items, this.BATCH_SIZE);
      
      for (const batch of batches) {
        try {
          await this.processBatch(operation, batch, reason);
          result.processedCount += batch.length;
        } catch (error) {
          console.error('Batch failed, processing individually:', error);
          // Fallback to individual
          for (const item of batch) {
            try {
              await this.processSingleItem(operation, item, reason);
              result.processedCount++;
            } catch (e: any) {
              result.failedCount++;
              result.errors.push({ itemId: item.id, error: e.message });
            }
          }
        }

        if (onProgress) {
          onProgress({
            total: items.length,
            processed: result.processedCount,
            failed: result.failedCount,
            currentItem: batch[batch.length - 1]?.id
          });
        }
      }

      result.success = result.processedCount > 0;
      await this.logBulkOperation(operationId, operation, items.length, result, reason);
      
      return result;
    } catch (error: any) {
      result.errors.push({ itemId: 'SYSTEM', error: error.message });
      return result;
    }
  }

  private async processBatch(
    operation: BulkOperationType,
    items: BulkSelectableItem[],
    reason?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const updates = this.getUpdateData(operation, reason, timestamp);
    const table = this.getTableForItem(items[0]); // Assume batch is uniform type
    const ids = items.map(i => i.id);

    const { error } = await supabase
      .from(table)
      .update(updates)
      .in('id', ids);

    if (error) throw error;
  }

  private async processSingleItem(
    operation: BulkOperationType,
    item: BulkSelectableItem,
    reason?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const updates = this.getUpdateData(operation, reason, timestamp);
    const table = this.getTableForItem(item);

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', item.id);

    if (error) throw error;
  }

  private getUpdateData(operation: BulkOperationType, reason?: string, timestamp?: string): any {
    const base = {
      updated_at: timestamp,
      // lastModifiedBy not easily available without context, skipping
    };

    const r = reason ? { operation_reason: reason } : {}; // Map to snake_case column? Assuming JSONB or specific cols

    // Note: Supabase columns are snake_case. 
    // I need to map the CamelCase updates from Firebase service to SnakeCase.
    
    switch (operation) {
      case 'user_suspend':
        return { ...base, is_active: false, status: 'suspended', suspended_at: timestamp, suspension_reason: reason };
      case 'user_verify':
        return { ...base, is_verified: true, verified_at: timestamp, verification_reason: reason };
      case 'user_activate':
        return { ...base, is_active: true, status: 'active', activated_at: timestamp };
      
      case 'video_approve':
        return { ...base, verification_status: 'approved', approved_at: timestamp, approval_reason: reason, is_active: true };
      case 'video_reject':
        return { ...base, verification_status: 'rejected', rejected_at: timestamp, rejection_reason: reason, is_active: false };
      case 'video_flag':
        return { ...base, is_flagged: true, flagged_at: timestamp, flag_reason: reason, verification_status: 'pending' };

      case 'event_activate':
        return { ...base, is_active: true, status: 'active', activated_at: timestamp };
      case 'event_deactivate':
        return { ...base, is_active: false, status: 'inactive', deactivated_at: timestamp, deactivation_reason: reason };
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private getTableForItem(item: BulkSelectableItem): string {
    if (item.type === 'user' || 'role' in item) return 'users';
    if (item.type === 'video' || 'verificationStatus' in item) return 'talent_videos';
    if (item.type === 'event' || ('title' in item && 'status' in item)) return 'events';
    throw new Error(`Unknown item type: ${item.id}`);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async logBulkOperation(
    operationId: string,
    operation: BulkOperationType,
    totalItems: number,
    result: BulkOperationResult,
    reason?: string
  ): Promise<void> {
    try {
      await supabase.from('bulk_operation_logs').insert({
        operation_id: operationId,
        operation,
        total_items: totalItems,
        processed_count: result.processedCount,
        failed_count: result.failedCount,
        success: result.success,
        reason: reason || null,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log bulk operation:', error);
    }
  }

  async getBulkOperationHistory(limit: number = 50): Promise<any[]> {
    const { data } = await supabase
      .from('bulk_operation_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    return data || [];
  }

  validateBulkOperation(operation: BulkOperationType, items: BulkSelectableItem[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (items.length === 0) errors.push('No items');
    if (items.length > 1000) errors.push('Max 1000 items');
    return { isValid: errors.length === 0, errors };
  }

  estimateOperationTime(operation: BulkOperationType, itemCount: number): { estimatedSeconds: number; estimatedMinutes: number } {
    const timePerItem = 0.1; // Faster with Supabase batch update
    const estimatedSeconds = Math.ceil(itemCount * timePerItem);
    return {
      estimatedSeconds,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60)
    };
  }
}

export default new BulkOperationsService();
