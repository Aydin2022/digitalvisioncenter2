/**
 * Zain Cash Payment Button Component
 */

import React, { useState } from 'react'
import { initiatePayment } from '../services/zaincash'
import { zaincashConfig } from '../config/environment'

interface PaymentButtonProps {
  amount: number
  serviceType: string
  orderId?: string
  onSuccess?: (transactionId: string) => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  serviceType,
  orderId,
  onSuccess,
  onError,
  className = '',
  children = 'Pay with Zain Cash',
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate configuration
      if (!zaincashConfig.clientId || !zaincashConfig.msisdn) {
        throw new Error('Zain Cash configuration is incomplete')
      }

      // Get current page URL for redirect after payment
      const redirectUrl = `${window.location.origin}/payment-callback`

      // Initiate payment
      const result = await initiatePayment({
        amount,
        serviceType,
        msisdn: zaincashConfig.msisdn,
        redirectUrl,
        orderId,
      })

      if (result.success && result.redirectUrl) {
        // Redirect to Zain Cash payment page
        window.location.href = result.redirectUrl
        onSuccess?.(orderId || `order-${Date.now()}`)
      } else {
        const errorMessage = result.error || 'Payment initiation failed'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('Payment error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="payment-button-container">
      <button
        onClick={handlePayment}
        disabled={isLoading || !zaincashConfig.clientId}
        className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 ${className}`}
      >
        {isLoading ? 'Processing...' : children}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!zaincashConfig.clientId && (
        <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="text-sm">⚠️ Zain Cash configuration missing. Please check environment variables.</p>
        </div>
      )}
    </div>
  )
}

export default PaymentButton
