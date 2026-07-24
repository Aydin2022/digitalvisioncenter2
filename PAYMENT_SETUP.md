# Zain Cash Payment Integration Setup Guide

## Overview

This guide covers the secure integration of Zain Cash payments into your Digital Vision Center website.

## 🔐 Security Best Practices Implemented

### 1. **Environment Variables**
- Sensitive credentials stored in `.env.local` (never committed to git)
- `.env.example` provides structure without secrets
- `VITE_` prefix for client-side variables
- No prefix for server-side secrets

### 2. **Credential Separation**
| Credential | Scope | Visibility |
|---|---|---|
| `VITE_ZAINCASH_CLIENT_ID` | Client-side | Browser (OK - not sensitive) |
| `ZAINCASH_CLIENT_SECRET` | Server-side | Never exposed to client |
| `VITE_SUPABASE_ANON_KEY` | Client-side | Browser (limited permissions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side | Never exposed to client |

### 3. **API Architecture**
- All secret operations handled server-side
- Client communicates with backend API only
- Signatures generated on server with client secret
- Payment verification done securely on backend

## 📦 Setup Steps

### Step 1: Update Your Environment Variables

Create `.env.local` file in project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
VITE_ZAINCASH_CLIENT_ID=40374021812e459bb7bed6d7e555260d
VITE_ZAINCASH_MSISDN=9647708506036
VITE_ZAINCASH_API_URL=https://pg-api.zaincash.iq

ZAINCASH_CLIENT_SECRET=agnHrIFH8OIOt7YZADlf9VLMszNcbdoO

VITE_SUPABASE_URL=https://dhnzqfjchcupdnsiazfv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_IswO54XD_Y0QEs7ZnwPZeg_ASJGf_7f

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Verify `.gitignore` Configuration

Your `.gitignore` already includes:
```
.env*
!.env.example
```

✅ This ensures `.env.local` is never committed.

### Step 3: Install Dependencies

```bash
npm install
```

All required packages are already in `package.json`:
- `@supabase/supabase-js`
- `express`
- `dotenv` (for environment variables)

### Step 4: Start Development Server

```bash
npm run dev
```

The server runs on `http://localhost:3000` and automatically loads environment variables.

## 🛒 Usage Examples

### Using the Payment Button Component

```tsx
import { PaymentButton } from './components/PaymentButton'

export function CheckoutPage() {
  const handlePaymentSuccess = (orderId: string) => {
    console.log('Payment initiated for order:', orderId)
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error)
  }

  return (
    <div>
      <h1>Checkout</h1>
      <PaymentButton
        amount={50000}
        serviceType="consultation"
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      >
        Pay 50,000 IQD with Zain Cash
      </PaymentButton>
    </div>
  )
}
```

### Handling Payment Callbacks

The payment callback page automatically verifies payments:

```tsx
// Add route in your main app routing
import PaymentCallback from './pages/PaymentCallback'

// Route: /payment-callback
// Users are redirected here after Zain Cash payment
```

### Manual Payment Verification

```tsx
import { verifyPayment } from './services/zaincash'

async function checkPaymentStatus(transactionId: string) {
  const verification = await verifyPayment(transactionId)
  
  if (verification?.status === 'success') {
    console.log('Payment successful!')
  }
}
```

## 🔌 API Endpoints

### 1. Initiate Payment
**POST** `/api/payments/zaincash/initiate`

Request:
```json
{
  "amount": 50000,
  "serviceType": "consultation",
  "msisdn": "9647708506036",
  "redirectUrl": "http://localhost:3000/payment-callback",
  "orderId": "order-12345"
}
```

Response:
```json
{
  "success": true,
  "redirectUrl": "https://pg-api.zaincash.iq/payment/...",
  "orderId": "order-12345"
}
```

### 2. Verify Payment
**POST** `/api/payments/zaincash/verify`

Request:
```json
{
  "transactionId": "abc123xyz"
}
```

Response:
```json
{
  "success": true,
  "transactionId": "abc123xyz",
  "status": "success",
  "amount": 50000,
  "timestamp": "2026-07-24T10:30:00Z"
}
```

### 3. Check Payment Status
**GET** `/api/payments/zaincash/status/:orderId`

Response:
```json
{
  "success": true,
  "orderId": "order-12345",
  "status": "completed"
}
```

### 4. Webhook Endpoint
**POST** `/api/payments/zaincash/webhook`

Setup this URL in Zain Cash dashboard for payment notifications.

## 🚀 Deployment

### For Production:

1. **Set Environment Variables on Hosting Platform**
   - Vercel: Project Settings → Environment Variables
   - Heroku: Config Vars
   - AWS: Systems Manager Parameter Store
   - Or your hosting provider's equivalent

2. **Build for Production**
```bash
npm run build
npm run start
```

3. **Update Zain Cash Dashboard**
   - Production API endpoint
   - Webhook URL: `https://yourdomain.com/api/payments/zaincash/webhook`
   - Callback URL: `https://yourdomain.com/payment-callback`

4. **Database Setup**
   Create a payments table in Supabase to track orders:
   ```sql
   CREATE TABLE payments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id VARCHAR(255) UNIQUE NOT NULL,
     user_id UUID REFERENCES auth.users(id),
     amount INTEGER NOT NULL,
     service_type VARCHAR(255),
     status VARCHAR(50) DEFAULT 'pending',
     transaction_id VARCHAR(255),
     created_at TIMESTAMP DEFAULT now(),
     updated_at TIMESTAMP DEFAULT now()
   );
   ```

## ⚠️ Important Security Notes

### DO's ✅
- ✅ Store `ZAINCASH_CLIENT_SECRET` only on server
- ✅ Use `VITE_` prefix only for non-sensitive client config
- ✅ Regenerate keys immediately if exposed
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Validate all payment amounts on backend
- ✅ Verify signatures for webhooks

### DON'Ts ❌
- ❌ Never expose client secret in browser/frontend
- ❌ Never commit `.env.local` to git
- ❌ Never hardcode credentials in code
- ❌ Never trust client-side amount validation alone
- ❌ Never log complete credit card or secret information

## 🔄 Regenerating Credentials

If credentials are accidentally exposed:

1. **Immediately revoke** in your Zain Cash dashboard
2. **Generate new** Client ID and Secret
3. **Update** `.env.local` locally
4. **Deploy** new credentials to production
5. **Verify** all services are working with new credentials

## 📞 Support & Troubleshooting

### Common Issues

**"Zain Cash configuration missing"**
- Ensure `.env.local` exists in project root
- Verify `VITE_ZAINCASH_CLIENT_ID` is set
- Restart dev server after changing `.env.local`

**"Payment initiation failed"**
- Check Zain Cash API is accessible
- Verify client secret is correct on server
- Check API endpoint in `.env.local`
- Review server logs for detailed error

**"Payment verification failed"**
- Ensure transaction ID is valid
- Check Zain Cash webhook configuration
- Verify database connection
- Review payment logs

### Debug Mode

Enable detailed logging:
```typescript
// In zaincash.ts service
console.log('Payment request:', request)
console.log('Payment response:', result)
```

## 📚 Additional Resources

- [Zain Cash Documentation](https://zaincash.iq)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com)
- [Vite Configuration](https://vitejs.dev/config)

## 🎯 Next Steps

1. ✅ Setup environment variables
2. ✅ Test payment initiation in development
3. ✅ Create payment callback page
4. ✅ Setup database for payment tracking
5. ✅ Configure Zain Cash webhook
6. ✅ Test end-to-end payment flow
7. ✅ Deploy to production
8. ✅ Monitor payment logs

---

**Last Updated:** July 24, 2026
**Version:** 1.0.0
