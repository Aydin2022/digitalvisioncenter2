import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Trash2, CreditCard, MapPin, Phone, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Project, User as UserType } from '../types';
import { Language } from '../useTranslation';
import { db } from '../dbManager';

interface CartViewProps {
  cartItemIds: string[];
  projects: Project[];
  currentUser: UserType | null;
  lang: Language;
  t: any;
  onRemoveFromCart: (projectId: string) => void;
  onOrderPlaced: () => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function CartView({
  cartItemIds,
  projects,
  currentUser,
  lang,
  t,
  onRemoveFromCart,
  onOrderPlaced,
  addLog
}: CartViewProps) {
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [fullName, setFullName] = useState(currentUser?.username || '');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Payment methods: 'zaincash_auto' | 'invoice'
  const [paymentMethod, setPaymentMethod] = useState<'zaincash_auto' | 'invoice'>('zaincash_auto');
  const [zaincashError, setZaincashError] = useState<string | null>(null);

  // Filter project items in cart
  const cartProjects = projects.filter(p => cartItemIds.includes(p.id));

  // Compute total sum correctly (use discountPrice if isDeal is true)
  const totalSum = cartProjects.reduce((sum, project) => {
    const itemPrice = project.isDeal && project.discountPrice ? project.discountPrice : project.price;
    return sum + itemPrice;
  }, 0);

  const formatPrice = (num: number) => {
    return num.toLocaleString() + ' IQD';
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartProjects.length === 0) return;
    if (!phone || !address || !fullName) {
      setOrderStatus('error');
      return;
    }

    setIsOrdering(true);
    setZaincashError(null);
    const orderItemsName = cartProjects.map(p => lang === 'ar' ? p.nameAr : p.nameEn).join(', ');

    if (paymentMethod === 'invoice') {
      addLog(`Creating manual contract invoice for ${fullName}...`, 'info');
      setTimeout(() => {
        try {
          db.createOrder({
            username: fullName,
            email: currentUser?.email || `${fullName}@digitalvisioncenter.hosteday.com`,
            phone,
            address,
            orderName: orderItemsName,
            totalPrice: totalSum,
            paymentMethod: 'invoice'
          });

          setIsOrdering(false);
          setOrderStatus('success');
          addLog(`Successfully registered invoice order for [${orderItemsName}] costing ${totalSum} IQD.`, 'success');
          
          setTimeout(() => {
            onOrderPlaced();
          }, 2000);
        } catch (err: any) {
          setIsOrdering(false);
          setOrderStatus('error');
          addLog(`Failed to compile order structure: ${err?.message}`, 'error');
        }
      }, 1200);
    } else {
      addLog(`Initiating secure ZainCash gateway checkout...`, 'info');
      try {
        // First register order in localStorage as pending (marked as auto)
        const newOrder = db.createOrder({
          username: fullName,
          email: currentUser?.email || `${fullName}@digitalvisioncenter.hosteday.com`,
          phone,
          address,
          orderName: orderItemsName,
          totalPrice: totalSum,
          paymentMethod: 'zaincash_auto'
        });

        // Request ZainCash transaction ID from Express backend
        const response = await fetch('/api/zaincash/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalSum,
            orderId: newOrder.id,
            customerPhone: phone,
            serviceType: 'DVC Premium Software License',
            lang: lang
          })
        });

        let data: any = null;
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("ZainCash initiate response is not valid JSON:", jsonErr);
        }

        if (response.ok && data && data.success) {
          if (data.fallbackToClient) {
            addLog(`Connecting directly to ZainCash payment portal...`, 'info');
            const isTest = data.mode === 'sandbox' || !data.clientId || data.clientId === '5c649264111a345c7e8b4567' || data.clientId.startsWith('5c649264');
            const targetBase = data.apiUrl 
              ? data.apiUrl.replace(/\/+$/, '') 
              : (isTest ? 'https://pg-api-uat.zaincash.iq' : 'https://api.zaincash.iq');

            let transactionId = '';
            let payBaseUrl = targetBase;
            let initErrorMsg = '';

            // Attempt 1: Fetch transaction ID directly from client
            try {
              const res = await fetch(`${targetBase}/transaction/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ token: data.token, merchantId: data.clientId, lang: lang || 'en' }).toString()
              });
              const parsed = await res.json().catch(() => null);
              if (parsed && parsed.id) {
                transactionId = parsed.id;
              } else if (parsed && parsed.err) {
                initErrorMsg = typeof parsed.err === 'string' ? parsed.err : parsed.err.msg || JSON.stringify(parsed.err);
              }
            } catch (e) {}

            // Attempt 2: If primary failed, try sandbox endpoint
            if (!transactionId && targetBase !== 'https://test.zaincash.iq') {
              try {
                const res = await fetch(`https://test.zaincash.iq/transaction/init`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ token: data.token, merchantId: data.clientId, lang: lang || 'en' }).toString()
                });
                const parsed = await res.json().catch(() => null);
                if (parsed && parsed.id) {
                  transactionId = parsed.id;
                  payBaseUrl = 'https://test.zaincash.iq';
                }
              } catch (e) {}
            }

            // If transaction ID was retrieved
            if (transactionId) {
              const payUrl = `${payBaseUrl}/transaction/pay?id=${transactionId}`;
              addLog(`ZainCash transaction created! Redirecting to payment portal...`, 'success');
              const win = window.open(payUrl, '_blank');
              if (!win) {
                window.location.href = payUrl;
              }
            } else {
              // Direct browser POST form submission to ZainCash portal in new tab
              try {
                addLog(`Submitting checkout form to ZainCash portal in new tab...`, 'info');
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = `${targetBase}/transaction/init`;
                form.target = '_blank';

                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'token';
                tokenInput.value = data.token;
                form.appendChild(tokenInput);

                const merchantInput = document.createElement('input');
                merchantInput.type = 'hidden';
                merchantInput.name = 'merchantId';
                merchantInput.value = data.clientId;
                form.appendChild(merchantInput);

                const langInput = document.createElement('input');
                langInput.type = 'hidden';
                langInput.name = 'lang';
                langInput.value = lang || 'en';
                form.appendChild(langInput);

                document.body.appendChild(form);
                form.submit();

                setTimeout(() => {
                  try {
                    if (document.body.contains(form)) {
                      document.body.removeChild(form);
                    }
                  } catch (e) {}
                }, 1000);

                if (initErrorMsg && (initErrorMsg.includes('invalid_merchant') || initErrorMsg.includes('merchant_not_found') || initErrorMsg.includes('معرف التاجر'))) {
                  const notice = lang === 'ar'
                    ? `ملاحظة: معرّف التاجر (${data.clientId}) غير مفعّل لحساب الإنتاج لدى زين كاش. يرجى إدخال معرّف التاجر المفعّل في لوحة تحكم المسؤول (Admin).`
                    : `Notice: ZainCash rejected Merchant ID (${data.clientId}). Please update your active Merchant ID in Admin Settings.`;
                  setZaincashError(notice);
                }

                addLog(`Redirected to ZainCash payment portal in new tab.`, 'success');
              } catch (formErr: any) {
                console.error("Client checkout failed:", formErr);
                setIsOrdering(false);
                setZaincashError(lang === 'ar' 
                  ? 'فشل الاتصال ببوابة زين كاش.'
                  : 'Could not connect to ZainCash payment portal.');
                addLog(`Gateway connection error: ${formErr?.message}`, 'error');
                db.updateOrderStatus(newOrder.id, 'cancelled');
              }
            }
          } else if (data.redirectUrl) {
            addLog(`ZainCash checkout initialized successfully. Redirecting in new tab...`, 'success');
            const paymentWindow = window.open(data.redirectUrl, '_blank');
            if (!paymentWindow) {
              // Fallback if popup blocked
              try {
                if (window.top) {
                  window.top.location.href = data.redirectUrl;
                } else {
                  window.location.href = data.redirectUrl;
                }
              } catch (e) {
                window.location.href = data.redirectUrl;
              }
            }
          } else {
            setIsOrdering(false);
            setZaincashError('Failed to initialize ZainCash gateway transaction.');
            addLog(`ZainCash gateway error: No redirect URL or token provided.`, 'error');
            db.updateOrderStatus(newOrder.id, 'cancelled');
          }
        } else {
          setIsOrdering(false);
          const errMsg = data.error || (lang === 'ar' ? 'فشل الاتصال ببوابة الدفع الإلكتروني.' : 'Failed to initialize ZainCash gateway transaction.');
          setZaincashError(errMsg);
          addLog(`ZainCash gateway error: ${errMsg}.`, 'error');
          db.updateOrderStatus(newOrder.id, 'cancelled');
        }
      } catch (err: any) {
        setIsOrdering(false);
        const errMsg = err?.message || 'Network error connecting to payment gateway.';
        setZaincashError(lang === 'ar'
          ? 'خطأ في الاتصال بالشبكة مع بوابة الدفع.'
          : `${errMsg}`);
        addLog(`Payment failure: ${errMsg}.`, 'error');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-3">
          <ShoppingBag className="w-8 h-8 text-indigo-500" />
          <span>{t.navCart}</span>
        </h2>
        <p className="text-xs text-slate-400">
          {lang === 'ar' ? 'راجع البرمجيات المحددة وقدم طلب ترخيص تشغيل فوري.' : 'Review selected software products and checkout secure licenses.'}
        </p>
      </div>

      {orderStatus === 'success' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto"
        >
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {lang === 'ar' ? 'تم تسجيل الطلب بنجاح!' : 'Order Placed Successfully!'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'لقد تم ترحيل طلبك بنجاح إلى لوحة المبيعات. سينظر مدير الأنظمة بالطلب وسيتصل بك أحد موظفينا قريباً على رقم هاتفك.'
              : 'Your transaction was securely compiled. Our administrator will review your requested software packages and contact you very shortly.'}
          </p>
        </motion.div>
      ) : cartProjects.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl max-w-md mx-auto space-y-4">
          <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {t.cartEmpty}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart items list (left on desktop) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-500 tracking-wider uppercase">
              {lang === 'ar' ? 'المنتجات المختارة' : 'Selected Products'} ({cartProjects.length})
            </h3>
            <div className="space-y-3">
              {cartProjects.map((project) => {
                const name = lang === 'ar' ? project.nameAr : project.nameEn;
                const price = project.isDeal && project.discountPrice ? project.discountPrice : project.price;

                return (
                  <motion.div
                    key={project.id}
                    layout
                    className="flex items-center gap-4 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl"
                  >
                    <img
                      src={project.mediaUrl}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{name}</h4>
                      <p className="text-xs text-indigo-400 font-semibold font-mono mt-1">
                        {formatPrice(price)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(project.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Checkout Info (right on desktop) */}
          <form
            onSubmit={handleCheckout}
            className="lg:col-span-5 bg-slate-900 border border-slate-800/90 rounded-2xl p-6 space-y-6 relative overflow-hidden h-fit"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {lang === 'ar' ? 'تفاصيل الاتصال والاستلام' : 'Licensing & Order Information'}
            </h3>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                  {t.fullName} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
                  />
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                  {t.phone} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9647708506036"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
                  />
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                  {t.address} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kirkuk - Baghdad Road"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
                  />
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase">
                {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </label>
              <div className="space-y-2.5">
                {/* 1. ZainCash Auto Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('zaincash_auto')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    paymentMethod === 'zaincash_auto'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                  }`}
                  style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-white">
                        {lang === 'ar' ? 'زين كاش (بوابة إلكترونية سريعة)' : 'ZainCash (Instant Gateway)'}
                      </span>
                      <span className="block text-[9px] text-slate-500">
                        {lang === 'ar' ? 'الدفع التلقائي الآمن عبر التطبيق أو المتصفح' : 'Automatic instant checkouts and license delivery'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-indigo-500/15 px-2 py-0.5 rounded-md font-mono text-indigo-400 border border-indigo-500/25 shrink-0 uppercase">API</span>
                </button>

                {/* 2. Direct Invoice Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('invoice')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    paymentMethod === 'invoice'
                      ? 'bg-slate-850/50 border-slate-700 text-slate-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                  }`}
                  style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-white">
                        {lang === 'ar' ? 'فاتورة مباشرة / عقد مؤسسي' : 'Direct Invoice / Corporate Contract'}
                      </span>
                      <span className="block text-[9px] text-slate-500">
                        {lang === 'ar' ? 'إصدار فاتورة دفع عند التسليم أو عقد رسمي للمستشفيات' : 'Pay on project delivery or request corporate quote'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-md font-mono text-slate-400 shrink-0 uppercase">Billing</span>
                </button>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>{lang === 'ar' ? 'سعر المنتجات' : 'Subtotal'}</span>
                <span>{formatPrice(totalSum)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>{lang === 'ar' ? 'رسوم التفعيل والشحن' : 'Deployment fee'}</span>
                <span className="text-emerald-400 font-semibold">{lang === 'ar' ? 'مـجـاني' : 'FREE'}</span>
              </div>
              <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                <span className="text-xs font-bold text-white">{t.sumTotal}</span>
                <span className="text-base font-black font-mono text-indigo-400">{formatPrice(totalSum)}</span>
              </div>
            </div>

            {/* Error handling */}
            {orderStatus === 'error' && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة!' : 'Please complete all details first!'}</span>
              </div>
            )}

            {/* ZainCash API Error handling */}
            {zaincashError && (
              <div className="flex items-start gap-2 text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span className="leading-normal">{zaincashError}</span>
              </div>
            )}

            {/* Placing Order Button */}
            <button
              type="submit"
              disabled={isOrdering}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
            >
              {isOrdering ? (
                <span>
                  {paymentMethod === 'zaincash_auto'
                    ? (lang === 'ar' ? 'جاري تحويلك إلى زين كاش...' : 'Redirecting to ZainCash...')
                    : (lang === 'ar' ? 'جاري تسجيل الطلب...' : 'Processing Transaction...')}
                </span>
              ) : (
                <>
                  <span>
                    {paymentMethod === 'zaincash_auto'
                      ? (lang === 'ar' ? 'الدفع الإلكتروني (ZainCash)' : 'Pay via ZainCash (API)')
                      : t.checkoutBtn}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
