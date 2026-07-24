/**
 * Zain Cash Payment API Handlers
 * 
 * This file contains server-side payment handling
 * It uses ZAINCASH_CLIENT_SECRET which is never exposed to the client
 */

import express from 'express'
import crypto from 'crypto'

const router = express.Router()

// Get server-side secrets
const ZAINCASH_CLIENT_SECRET = process.env.ZAINCASH_CLIENT_SECRET || ''
const ZAINCASH_CLIENT_ID = process.env.VITE_ZAINCASH_CLIENT_ID || ''
const ZAINCASH_MSISDN = process.env.VITE_ZAINCASH_MSISDN || ''
const ZAINCASH_API_URL = process.env.VITE_ZAINCASH_API_URL || 'https://pg-api.zaincash.iq'

interface PaymentInitRequest {
  amount: number
  serviceType: string
  msisdn: string
  redirectUrl: string
  orderId: string
}

/**
 * Helper: Generate Zain Cash signature
 */
function generateSignature(
  clientId: string,
  amount: number,
  serviceType: string,
  msisdn: string,
  clientSecret: string
): string {
  const data = `${clientId}${amount}${serviceType}${msisdn}`
  return crypto
    .createHmac('sha256', clientSecret)
    .update(data)
    .digest('hex')
}

/**
 * POST /api/payments/zaincash/initiate
 * Initiate a payment with Zain Cash
 */
router.post('/initiate', async (req, res) => {
  try {
    const { amount, serviceType, msisdn, redirectUrl, orderId }: PaymentInitRequest = req.body

    // Validate input
    if (!amount || !serviceType || !msisdn || !redirectUrl || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment information',
      })
    }

    // Validate secrets are configured
    if (!ZAINCASH_CLIENT_SECRET || !ZAINCASH_CLIENT_ID) {
      console.error('Zain Cash credentials not configured')
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured',
      })
    }

    // Generate signature
    const signature = generateSignature(
      ZAINCASH_CLIENT_ID,
      amount,
      serviceType,
      msisdn,
      ZAINCASH_CLIENT_SECRET
    )

    // Prepare payment parameters
    const paymentParams = {
      clientId: ZAINCASH_CLIENT_ID,
      amount,
      serviceType,
      msisdn,
      redirectUrl,
      orderId,
      signature,
    }

    // Call Zain Cash API to get payment URL
    // This is a simplified example - adjust based on Zain Cash documentation
    const zaincashResponse = await fetch(`${ZAINCASH_API_URL}/payment/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentParams),
    })

    if (!zaincashResponse.ok) {
      const errorData = await zaincashResponse.json()
      console.error('Zain Cash API error:', errorData)
      return res.status(400).json({
        success: false,
        error: 'Failed to initiate payment with Zain Cash',
      })
    }

    const paymentData = await zaincashResponse.json()

    // Log payment initiation (for audit trail)
    console.log(`[Payment] Initiated payment for order ${orderId}: ${amount} IQD`)

    res.json({
      success: true,
      redirectUrl: paymentData.redirectUrl || paymentData.paymentUrl,
      orderId,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    res.status(500).json({
      success: false,
      error: 'An error occurred during payment initiation',
    })
  }
})

/**
 * POST /api/payments/zaincash/verify
 * Verify a completed payment
 */
router.post('/verify', async (req, res) => {
  try {
    const { transactionId } = req.body

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required',
      })
    }

    // Verify with Zain Cash API
    // This is a simplified example - adjust based on Zain Cash documentation
    const verifyResponse = await fetch(`${ZAINCASH_API_URL}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: ZAINCASH_CLIENT_ID,
        transactionId,
        clientSecret: ZAINCASH_CLIENT_SECRET,
      }),
    })

    if (!verifyResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
      })
    }

    const verificationData = await verifyResponse.json()

    console.log(`[Payment] Verified transaction ${transactionId}: ${verificationData.status}`)

    res.json({
      success: true,
      transactionId,
      status: verificationData.status,
      amount: verificationData.amount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    res.status(500).json({
      success: false,
      error: 'An error occurred during payment verification',
    })
  }
})

/**
 * GET /api/payments/zaincash/status/:orderId
 * Check payment status by order ID
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required',
      })
    }

    // Query your database or payment system for order status
    // This is a placeholder - implement based on your database schema
    res.json({
      success: true,
      orderId,
      status: 'pending', // or 'completed', 'failed'
    })
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      success: false,
      error: 'An error occurred during status check',
    })
  }
})

/**
 * POST /api/payments/zaincash/webhook
 * Zain Cash webhook for payment notifications
 * (Setup this endpoint in your Zain Cash dashboard)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { orderId, status, transactionId, amount } = req.body

    // Verify webhook signature if provided
    console.log(`[Webhook] Payment update received - Order: ${orderId}, Status: ${status}`)

    // Update your database with payment status
    // This is where you'd mark the order as completed, failed, etc.

    res.json({
      success: true,
      received: true,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    })
  }
})

export default router
