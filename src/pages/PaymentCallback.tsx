/**
 * Payment Callback Page
 * 
 * User is redirected here after completing payment on Zain Cash
 */

import React, { useEffect, useState } from 'react'
import { verifyPayment } from '../services/zaincash'

export const PaymentCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [transactionId, setTransactionId] = useState('')

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      try {
        // Get query parameters from URL
        const params = new URLSearchParams(window.location.search)
        const txnId = params.get('transactionId') || params.get('transaction_id') || ''
        const resultStatus = params.get('status') || 'pending'

        setTransactionId(txnId)

        if (!txnId) {
          setStatus('error')
          setMessage('No transaction ID provided. Payment verification failed.')
          return
        }

        // Verify payment with backend
        const verification = await verifyPayment(txnId)

        if (verification && verification.status === 'success') {
          setStatus('success')
          setMessage('✅ Payment successful! Thank you for your purchase.')
          
          // Store success in localStorage for reference
          localStorage.setItem('lastPaymentStatus', 'success')
          localStorage.setItem('lastTransactionId', txnId)
          
          // Optionally redirect to a success page after delay
          // setTimeout(() => {
          //   window.location.href = '/dashboard'
          // }, 3000)
        } else {
          setStatus('error')
          setMessage('❌ Payment verification failed. Please contact support.')
        }
      } catch (error) {
        setStatus('error')
        setMessage(
          error instanceof Error
            ? `Error: ${error.message}`
            : 'An unexpected error occurred'
        )
        console.error('Payment callback error:', error)
      }
    }

    verifyPaymentStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h1>
            <p className="text-gray-600">Please wait while we verify your transaction...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {transactionId && (
              <p className="text-sm text-gray-500 mb-6">
                Transaction ID: <span className="font-mono">{transactionId}</span>
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {transactionId && (
              <p className="text-sm text-gray-500 mb-6">
                Transaction ID: <span className="font-mono">{transactionId}</span>
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = '/checkout')}
                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Retry Payment
              </button>
              <button
                onClick={() => (window.location.href = '/contact')}
                className="w-full px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentCallback
