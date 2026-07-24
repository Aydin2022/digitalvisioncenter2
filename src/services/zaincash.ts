/**
 * Zain Cash Payment Service
 * 
 * Handles all Zain Cash payment operations
 */

import { zaincashConfig } from '../config/environment'

export interface PaymentRequest {
  amount: number
  serviceType: string
  msisdn: string
  redirectUrl: string
  orderId?: string
}

export interface PaymentResponse {
  success: boolean
  redirectUrl?: string
  error?: string
  message?: string
}

export interface PaymentVerification {
  transactionId: string
  status: 'success' | 'failed' | 'pending'
  amount: number
  timestamp: string
}

/**
 * Initialize a payment request with Zain Cash
 */
export async function initiatePayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  try {
    // Send payment request to your backend API
    // The backend will use ZAINCASH_CLIENT_SECRET (not exposed to client)
    const response = await fetch('/api/payments/zaincash/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        serviceType: request.serviceType,
        msisdn: request.msisdn,
        redirectUrl: request.redirectUrl,
        orderId: request.orderId || `order-${Date.now()}`,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Payment initiation failed',
      }
    }

    return {
      success: true,
      redirectUrl: data.redirectUrl,
      message: 'Payment initiated successfully',
    }
  } catch (error) {
    console.error('Payment initiation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(
  transactionId: string
): Promise<PaymentVerification | null> {
  try {
    const response = await fetch('/api/payments/zaincash/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Payment verification failed:', data.error)
      return null
    }

    return data
  } catch (error) {
    console.error('Payment verification error:', error)
    return null
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(orderId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/payments/zaincash/status/${orderId}`)
    const data = await response.json()

    if (!response.ok) {
      return null
    }

    return data.status
  } catch (error) {
    console.error('Status check error:', error)
    return null
  }
}

export default {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
}
