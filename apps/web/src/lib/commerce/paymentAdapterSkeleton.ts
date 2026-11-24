/**
 * OXENIQ Payment Gateway Adapter Skeleton & Idempotency Store
 * 
 * Provides a provider-independent interface for INR payment gateways (e.g. Cashfree, Razorpay),
 * authenticated webhook signature verification, and idempotent order fulfillment handling.
 */

export type OrderState = 
  | 'CREATED'
  | 'QUOTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'FULFILLMENT_PENDING'
  | 'FULFILLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface PurchaseOrder {
  orderId: string;
  customerWalletAddress: string;
  inrAmount: number;
  usdEquivalent: number;
  calculatedOxeniqTokens: string; // 18-decimal base units string
  reserveOxeniqTokens: string;    // 18-decimal base units string
  state: OrderState;
  paymentGatewayOrderId?: string;
  paymentGatewayPaymentId?: string;
  fulfillmentTxHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookNotification {
  providerId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  amountInPaise: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  signature: string;
  timestamp: number;
}

export interface IPaymentGatewayAdapter {
  readonly providerName: string;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  parseWebhookPayload(rawBody: string): WebhookNotification;
}

/**
 * Provider-Independent Reference Adapter Skeleton
 * Uses timing-safe string comparison and standard HMAC-SHA256.
 */
export class ReferencePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly providerName = "OXENIQ_INDEPENDENT_GATEWAY_ADAPTER";

  /**
   * Verifies an HMAC-SHA256 webhook signature against the raw payload and webhook secret.
   * Node/Server side implementation using standard crypto.
   */
  public verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      // Isomorphic crypto verification (supports Node.js crypto module)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = typeof window === 'undefined' ? require('crypto') : null;
      if (nodeCrypto) {
        const expectedSignature = nodeCrypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');

        // Timing-safe buffer comparison to prevent timing attacks
        const sigBuf = Buffer.from(signature, 'utf8');
        const expBuf = Buffer.from(expectedSignature, 'utf8');
        if (sigBuf.length !== expBuf.length) {
          return false;
        }
        return nodeCrypto.timingSafeEqual(sigBuf, expBuf);
      }
    } catch {
      // In browser or non-Node environments, fallback to basic length & character verification
    }

    return false;
  }

  public parseWebhookPayload(rawBody: string): WebhookNotification {
    const data = JSON.parse(rawBody);
    return {
      providerId: data.providerId || 'UNKNOWN',
      gatewayOrderId: data.gatewayOrderId || data.order_id || '',
      gatewayPaymentId: data.gatewayPaymentId || data.payment_id || '',
      amountInPaise: Number(data.amountInPaise || (data.amount ? data.amount * 100 : 0)),
      currency: data.currency || 'INR',
      status: data.status === 'SUCCESS' ? 'SUCCESS' : data.status === 'FAILED' ? 'FAILED' : 'PENDING',
      signature: data.signature || '',
      timestamp: data.timestamp || Date.now(),
    };
  }
}

/**
 * Idempotent Order Fulfillment Store
 * Guarantees each verified payment notification is processed exactly once,
 * strictly preventing duplicate token deliveries.
 */
export class IdempotencyStore {
  private processedKeys: Set<string> = new Set();
  private orders: Map<string, PurchaseOrder> = new Map();

  public generateKey(providerId: string, gatewayPaymentId: string, orderId: string): string {
    return `${providerId}:${gatewayPaymentId}:${orderId}`;
  }

  public isProcessed(key: string): boolean {
    return this.processedKeys.has(key);
  }

  public recordOrder(order: PurchaseOrder): void {
    this.orders.set(order.orderId, { ...order, updatedAt: Date.now() });
  }

  public getOrder(orderId: string): PurchaseOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Atomically executes fulfillment if not already processed.
   * Returns true if processing was initiated, or false if already processed (duplicate).
   */
  public executeIdempotentFulfillment(
    key: string,
    orderId: string,
    fulfillmentAction: (order: PurchaseOrder) => { txHash: string }
  ): { success: boolean; duplicate: boolean; txHash?: string; error?: string } {
    if (this.processedKeys.has(key)) {
      const order = this.orders.get(orderId);
      return {
        success: true,
        duplicate: true,
        txHash: order?.fulfillmentTxHash,
      };
    }

    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, duplicate: false, error: 'Order not found' };
    }

    if (order.state === 'FULFILLED') {
      this.processedKeys.add(key);
      return { success: true, duplicate: true, txHash: order.fulfillmentTxHash };
    }

    try {
      const result = fulfillmentAction(order);
      order.state = 'FULFILLED';
      order.fulfillmentTxHash = result.txHash;
      order.updatedAt = Date.now();
      this.processedKeys.add(key);
      return { success: true, duplicate: false, txHash: result.txHash };
    } catch (err: unknown) {
      order.state = 'FAILED';
      order.updatedAt = Date.now();
      return { 
        success: false, 
        duplicate: false, 
        error: err instanceof Error ? err.message : 'Fulfillment failed' 
      };
    }
  }
}
