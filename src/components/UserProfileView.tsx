import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Heart, Settings, ShoppingBag, Eye, Lock, Mail, Phone, MapPin, UserCheck, Trash2 } from 'lucide-react';
import { Project, Order, User as UserType } from '../types';
import { Language } from '../useTranslation';
import { db } from '../dbManager';

interface UserProfileViewProps {
  currentUser: UserType;
  projects: Project[];
  lang: Language;
  t: any;
  favorites: string[];
  onToggleFavorite: (projectId: string) => void;
  onAddToCart: (projectId: string) => void;
  onUpdateUser: (updatedUser: UserType) => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function UserProfileView({
  currentUser,
  projects,
  lang,
  t,
  favorites,
  onToggleFavorite,
  onAddToCart,
  onUpdateUser,
  addLog
}: UserProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'favorites' | 'orders'>('settings');
  
  // Settings fields
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [password, setPassword] = useState(currentUser.password || '');
  const [updateMsg, setUpdateMsg] = useState('');

  // Favorites list
  const favProjects = projects.filter(p => favorites.includes(p.id));

  // Orders list
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Get orders from local DB filtered by current username
    const allOrders = db.getOrders();
    const userOrders = allOrders.filter(o => o.username.toLowerCase() === currentUser.username.toLowerCase());
    setMyOrders(userOrders);
  }, [currentUser, activeTab]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = db.updateUser(currentUser.username, {
      email,
      phone,
      address,
      password
    });

    if (result.success && result.user) {
      onUpdateUser(result.user);
      setUpdateMsg(t.updateSuccess);
      addLog(`Updated profile parameters for username: ${currentUser.username}`, 'success');
      setTimeout(() => setUpdateMsg(''), 2500);
    }
  };

  const formatPrice = (num: number) => {
    return num.toLocaleString() + ' IQD';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    if (lang === 'ar') {
      if (status === 'approved') return 'موافق عليه';
      if (status === 'cancelled') return 'ملغي';
      return 'قيد المراجعة';
    }
    return status.toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Profile Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          {/* Avatar and Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold font-mono mx-auto shadow-xl">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight truncate">
                {currentUser.username}
              </h3>
              <p className="text-[10px] text-indigo-400 font-bold font-mono uppercase tracking-wider mt-0.5">
                {currentUser.role === 'admin' ? t.role + ': Admin' : t.role + ': Member'}
              </p>
            </div>
          </div>

          {/* Navigation Sidebar List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t.settingsTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>{t.favoritesTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.ordersTab}</span>
            </button>
          </div>
        </div>

        {/* Right Active Panel Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 min-h-[400px]">
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {lang === 'ar' ? 'تحديث إعدادات الحساب' : 'Edit Account Parameters'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'تحديث كلمة المرور والعنوان ورقم الهاتف لتلقي عروض الأسعار.' : 'Maintain your contact details, physical delivery address, and credentials.'}
                  </p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4 max-w-xl">
                  {/* Read-Only Username */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.username}
                      className="w-full bg-slate-950 text-slate-500 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        {t.email}
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none"
                        />
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        {t.phone}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none"
                        />
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      {t.address}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none"
                      />
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      {t.password}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none"
                      />
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Feedback Msg */}
                  {updateMsg && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>{updateMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    <span>{t.saveChanges}</span>
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {t.favoritesTab}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'قائمة المنتجات المفضلة لديك للوصول السريع.' : 'Your hand-picked catalog of premium systems.'}
                  </p>
                </div>

                {favProjects.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 border border-slate-850 rounded-2xl max-w-md mx-auto space-y-2">
                    <Heart className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-500">{t.noFavs}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {favProjects.map((project) => {
                      const name = lang === 'ar' ? project.nameAr : project.nameEn;
                      const hasDiscount = project.isDeal && project.discountPrice;

                      return (
                        <div
                          key={project.id}
                          className="flex items-center gap-4 bg-slate-950 border border-slate-850 p-4 rounded-xl relative"
                        >
                          <img
                            src={project.mediaUrl}
                            alt={name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">{name}</h4>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              {hasDiscount ? (
                                <span className="text-emerald-400 font-bold text-[10px] font-mono">
                                  {formatPrice(project.discountPrice!)}
                                </span>
                              ) : (
                                <span className="text-indigo-400 font-bold text-[10px] font-mono">
                                  {formatPrice(project.price)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => onToggleFavorite(project.id)}
                            className="p-2 text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer"
                            title="Remove favorite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {t.ordersTab}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'تاريخ الطلبات وفواتير التراخيص المرسلة للمركز.' : 'Track development status, license invoices, and active review timelines.'}
                  </p>
                </div>

                {myOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 border border-slate-850 rounded-2xl max-w-md mx-auto space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-500">{t.noOrders}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 min-w-[500px]">
                      <thead className="text-[10px] font-mono text-slate-500 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">{t.orderId}</th>
                          <th className="py-3 px-4">{t.items}</th>
                          <th className="py-3 px-4">{t.total}</th>
                          <th className="py-3 px-4">{t.date}</th>
                          <th className="py-3 px-4 text-center">{t.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {myOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-950/40">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                              {order.id.replace('order-', '#')}
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate" title={order.orderName}>
                              {order.orderName}
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-300">
                              {formatPrice(order.totalPrice)}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 border text-[10px] font-black rounded-full uppercase ${getStatusBadgeClass(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
