import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartProjects.length === 0) return;
    if (!phone || !address) {
      setOrderStatus('error');
      return;
    }

    setIsOrdering(true);
    addLog(`Creating custom ERP order checkout process for ${currentUser?.username || 'Guest'}...`, 'info');

    // Create concatenation of product names
    const orderItemsName = cartProjects.map(p => lang === 'ar' ? p.nameAr : p.nameEn).join(', ');

    setTimeout(() => {
      try {
        db.createOrder({
          username: currentUser?.username || 'guest_user',
          email: currentUser?.email || 'guest@digitalvisioncenter.hosteday.com',
          phone,
          address,
          orderName: orderItemsName,
          totalPrice: totalSum
        });

        setIsOrdering(false);
        setOrderStatus('success');
        addLog(`Successfully registered checkout order for [${orderItemsName}] costing ${totalSum} IQD.`, 'success');
        
        setTimeout(() => {
          onOrderPlaced();
        }, 2000);
      } catch (e: any) {
        setIsOrdering(false);
        setOrderStatus('error');
        addLog(`Failed to compile order structure: ${e?.message}`, 'error');
      }
    }, 1200);
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

            {/* Placing Order Button */}
            <button
              type="submit"
              disabled={isOrdering}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
            >
              {isOrdering ? (
                <span>{lang === 'ar' ? 'جاري إرسال الطلب...' : 'Processing Transaction...'}</span>
              ) : (
                <>
                  <span>{t.checkoutBtn}</span>
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
