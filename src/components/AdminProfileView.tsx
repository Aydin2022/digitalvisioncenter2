import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, ShoppingBag, PlusCircle, Settings, CheckCircle, XCircle, Search, Calendar, FileText, Phone, MapPin, DollarSign, Percent, Video, Image, Save, Upload, Link } from 'lucide-react';
import { Project, Order, User } from '../types';
import { Language } from '../useTranslation';
import { db } from '../dbManager';

interface AdminProfileViewProps {
  currentUser: User;
  projects: Project[];
  lang: Language;
  t: any;
  editingProject: Project | null;
  onClearEditingProject: () => void;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function AdminProfileView({
  currentUser,
  projects,
  lang,
  t,
  editingProject,
  onClearEditingProject,
  onAddProject,
  onUpdateProject,
  addLog
}: AdminProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'add_project' | 'settings'>('orders');

  // All orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderQuery, setOrderQuery] = useState('');

  // Add/Edit Project Form States
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [isDeal, setIsDeal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setMediaUrl(dataUrl);
      setIsVideo(file.type.startsWith('video/'));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Admin settings States
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [password, setPassword] = useState(currentUser.password || '');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Load orders
  const loadOrders = () => {
    setOrders(db.getOrders());
  };

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  // Handle editing project triggers
  useEffect(() => {
    if (editingProject) {
      setNameEn(editingProject.nameEn);
      setNameAr(editingProject.nameAr);
      setDescEn(editingProject.descriptionEn);
      setDescAr(editingProject.descriptionAr);
      setPrice(editingProject.price);
      setIsDeal(editingProject.isDeal);
      setDiscountPercent(
        editingProject.discountPrice
          ? Math.round(((editingProject.price - editingProject.discountPrice) / editingProject.price) * 100)
          : 0
      );
      setMediaUrl(editingProject.mediaUrl);
      setIsVideo(editingProject.isVideo);
      setActiveTab('add_project');
    }
  }, [editingProject]);

  const handleAddOrUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameAr || !descEn || !descAr || price <= 0) {
      alert(t.requiredFields);
      return;
    }

    // Calculate discounted price if applicable
    let calculatedDiscountPrice: number | undefined = undefined;
    if (isDeal && discountPercent > 0) {
      calculatedDiscountPrice = Math.round(price * (1 - discountPercent / 100));
    }

    const projectData = {
      nameEn,
      nameAr,
      descriptionEn: descEn,
      descriptionAr: descAr,
      price,
      isDeal,
      discountPrice: calculatedDiscountPrice,
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      isVideo
    };

    if (editingProject) {
      onUpdateProject(editingProject.id, projectData);
      setFormSuccess(lang === 'ar' ? 'تم تحديث المشروع بنجاح!' : 'Project updated successfully!');
      addLog(`Updated project: ${nameEn} in catalog.`, 'success');
      onClearEditingProject();
    } else {
      onAddProject(projectData);
      setFormSuccess(t.projectAddedSuccess);
      addLog(`Created new project: ${nameEn} in catalog.`, 'success');
    }

    // Reset Form
    setTimeout(() => {
      setFormSuccess('');
      setNameEn('');
      setNameAr('');
      setDescEn('');
      setDescAr('');
      setPrice(0);
      setIsDeal(false);
      setDiscountPercent(0);
      setMediaUrl('');
      setIsVideo(false);
    }, 1500);
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const result = db.updateUser(currentUser.username, {
      email,
      phone,
      address,
      password
    });
    if (result.success) {
      setSettingsSuccess(t.updateSuccess);
      addLog(`Administrator changed profile options securely.`, 'success');
      setTimeout(() => setSettingsSuccess(''), 2500);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: 'approved' | 'cancelled') => {
    const success = db.updateOrderStatus(orderId, status);
    if (success) {
      loadOrders();
      addLog(`Admin updated order [${orderId}] status to: ${status}`, 'success');
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = orderQuery.toLowerCase();
    const dateStr = new Date(o.created_at).toLocaleString().toLowerCase();
    return (
      o.username.toLowerCase().includes(q) ||
      o.orderName.toLowerCase().includes(q) ||
      dateStr.includes(q)
    );
  });

  const formatPrice = (num: number) => {
    return num.toLocaleString() + ' IQD';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Admin Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-amber-500 text-white rounded-full flex items-center justify-center text-xl font-bold font-mono mx-auto shadow-xl">
              AD
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight truncate">
                {currentUser.username}
              </h3>
              <p className="text-[10px] text-amber-500 font-bold font-mono uppercase tracking-wider mt-0.5">
                SYSTEM ADMINISTRATOR
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveTab('orders'); onClearEditingProject(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.allOrdersTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('add_project')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'add_project'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingProject ? t.editProjectTab : t.addProjectTab}</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); onClearEditingProject(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t.settingsTab}</span>
            </button>
          </div>
        </div>

        {/* Right Active Panel Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 min-h-[500px]">
            
            {/* 1. All Orders Panel */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {t.allOrdersTab}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'البحث في فواتير العملاء وأسماء المستخدمين وموافقة أو إلغاء التراخيص.' : 'Search customer license queues, view contact parameters, and toggle status.'}
                    </p>
                  </div>
                  
                  {/* Orders Search Input */}
                  <div className="relative max-w-xs w-full">
                    <input
                      type="text"
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      placeholder={t.searchOrdersPlaceholder}
                      className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2 pl-9 pr-3.5 text-xs outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 border border-slate-850 rounded-2xl max-w-md mx-auto space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-500">{lang === 'ar' ? 'لا توجد طلبات متطابقة.' : 'No customer orders match your query.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-slate-950/70 border border-slate-850 p-5 rounded-2xl space-y-4 hover:border-slate-800 transition-colors"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-850">
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-400 font-bold font-mono text-xs">
                              {order.id.replace('order-', '#')}
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                          </div>

                          {/* Approval / Cancellation Status Actions */}
                          <div className="flex items-center gap-2">
                            {/* Current Badge */}
                            <span className={`inline-flex px-2 py-0.5 border text-[9px] font-mono font-bold rounded-full uppercase ${
                              order.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              order.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {lang === 'ar' ? order.status === 'approved' ? 'معتمد' : order.status === 'cancelled' ? 'ملغي' : 'معلق' : order.status.toUpperCase()}
                            </span>

                            {/* Option triggers */}
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                              className={`p-1 border rounded-lg transition-all cursor-pointer ${
                                order.status === 'approved'
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-950'
                              }`}
                              title={lang === 'ar' ? 'موافقة' : 'Approve'}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className={`p-1 border rounded-lg transition-all cursor-pointer ${
                                order.status === 'cancelled'
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-950'
                              }`}
                              title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Order info details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Left Details: Products and totals */}
                          <div className="space-y-2 border-r border-slate-850/40 pr-2">
                            <div className="flex gap-2">
                              <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-bold text-slate-400 font-mono text-[10px] uppercase">ORDERED PROJECTS</span>
                                <span className="text-white text-xs font-semibold leading-relaxed">{order.orderName}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-bold text-slate-400 font-mono text-[10px] uppercase">TOTAL LICENSING FEES</span>
                                <span className="text-emerald-400 font-extrabold text-sm font-mono">{formatPrice(order.totalPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Details: Customer parameters */}
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Users className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-bold text-slate-400 font-mono text-[10px] uppercase">CUSTOMER USERNAME</span>
                                <span className="text-indigo-300 font-semibold">{order.username}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-bold text-slate-400 font-mono text-[10px] uppercase">PHONE NUMBER</span>
                                <span className="text-slate-300 font-mono">{order.phone}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-bold text-slate-400 font-mono text-[10px] uppercase">PHYSICAL ADDRESS</span>
                                <span className="text-slate-300">{order.address}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Add / Edit Projects Panel */}
            {activeTab === 'add_project' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {editingProject ? t.editProjectTab : t.addProjectTab}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'أضف منتج برمجيات جديد للكتالوج مع السعر ونسبة الخصم الخاصة بقسم العروض.' : 'Introduce new software licenses, manage price parameters, and set flash deal rates.'}
                  </p>
                </div>

                <form onSubmit={handleAddOrUpdateProject} className="space-y-4 max-w-2xl">
                  {/* Names (En/Ar) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        PROJECT NAME (ENGLISH) *
                      </label>
                      <input
                        type="text"
                        required
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder="e.g. Modern POS System"
                        className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        PROJECT NAME (ARABIC) *
                      </label>
                      <input
                        type="text"
                        required
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder="مثال: نظام المبيعات الحديث"
                        className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none text-right"
                      />
                    </div>
                  </div>

                  {/* Descriptions (En/Ar) */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      DESCRIPTION (ENGLISH) *
                    </label>
                    <textarea
                      required
                      value={descEn}
                      onChange={(e) => setDescEn(e.target.value)}
                      placeholder="Enter details of system modules, technologies, databases used..."
                      rows={3}
                      className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      DESCRIPTION (ARABIC) *
                    </label>
                    <textarea
                      required
                      value={descAr}
                      onChange={(e) => setDescAr(e.target.value)}
                      placeholder="أدخل ميزات النظام وقاعدة البيانات والتقنيات المستخدمة باللغة العربية..."
                      rows={3}
                      className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none resize-none text-right"
                    />
                  </div>

                  {/* Media uploads Dual Mode */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                      {lang === 'ar' ? 'وسائط المشروع (صورة أو فيديو)' : 'Project Media (Image or Video)'} *
                    </label>
                    <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl max-w-xs">
                      <button
                        type="button"
                        onClick={() => setUploadMode('upload')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          uploadMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'ar' ? 'رفع ملف' : 'Upload File'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('link')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          uploadMode === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'ar' ? 'رابط خارجي' : 'External Link'}
                      </button>
                    </div>

                    {uploadMode === 'upload' ? (
                      <div className="space-y-4">
                        {/* Drag and Drop Box */}
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                            dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-950 hover:bg-slate-950/80 hover:border-slate-700'
                          }`}
                          onClick={() => document.getElementById('media-file-input')?.click()}
                        >
                          <input
                            type="file"
                            id="media-file-input"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />

                          {mediaUrl ? (
                            <div className="space-y-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                              {/* Preview */}
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-850 mx-auto">
                                {isVideo ? (
                                  <video src={mediaUrl} controls className="w-full h-full object-cover" />
                                ) : (
                                  <img src={mediaUrl} className="w-full h-full object-cover" alt="Uploaded preview" referrerPolicy="no-referrer" />
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                                  {isVideo ? (lang === 'ar' ? 'فيديو مجهز' : 'Video loaded') : (lang === 'ar' ? 'صورة مجهزة' : 'Image loaded')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setMediaUrl(''); setIsVideo(false); }}
                                  className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                                >
                                  {lang === 'ar' ? 'إزالة الملف' : 'Remove File'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 pointer-events-none">
                              <div className="inline-flex p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 mb-1">
                                <Upload className="w-5 h-5 animate-bounce" />
                              </div>
                              <p className="text-xs text-white font-bold">
                                {lang === 'ar' ? 'اسحب الملف هنا أو اضغط للتصفح' : 'Drag and drop file here or click to browse'}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {lang === 'ar' ? 'يدعم الصور وملفات الفيديو (MP4, PNG, JPG...)' : 'Supports images and video files (MP4, PNG, JPG...)'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                            {t.uploadMedia} *
                          </label>
                          <div className="relative">
                            <input
                              type="url"
                              required={uploadMode === 'link'}
                              value={mediaUrl}
                              onChange={(e) => {
                                setMediaUrl(e.target.value);
                              }}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none"
                            />
                            <Link className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                          <input
                            type="checkbox"
                            id="isVideo"
                            checked={isVideo}
                            onChange={(e) => setIsVideo(e.target.checked)}
                            className="w-4 h-4 accent-indigo-600 rounded border-slate-850 cursor-pointer"
                          />
                          <label htmlFor="isVideo" className="text-xs font-semibold text-slate-300 cursor-pointer">
                            Is this a Video Demo link?
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing and discounts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850/40 pt-4">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        {t.priceInIqd} *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={price || ''}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          placeholder="1500000"
                          className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 pl-8 pr-3.5 text-xs outline-none font-mono"
                        />
                        <DollarSign className="absolute left-2.5 top-3 w-4 h-4 text-slate-500" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="isDeal"
                        checked={isDeal}
                        onChange={(e) => setIsDeal(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded border-slate-850"
                      />
                      <label htmlFor="isDeal" className="text-xs font-semibold text-slate-300">
                        Put on Special Deal? (Discount)
                      </label>
                    </div>

                    {isDeal && (
                      <div>
                        <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                          {t.discountRate} *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min={1}
                            max={99}
                            value={discountPercent || ''}
                            onChange={(e) => setDiscountPercent(Number(e.target.value))}
                            placeholder="20"
                            className="w-full bg-slate-950 text-white border border-slate-850 rounded-xl py-2.5 pl-8 pr-3.5 text-xs outline-none font-mono"
                          />
                          <Percent className="absolute left-2.5 top-3 w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculated summary */}
                  {isDeal && price > 0 && discountPercent > 0 && (
                    <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">Calculated Deal Price:</span>
                      <span className="text-emerald-400 font-extrabold">
                        {formatPrice(Math.round(price * (1 - discountPercent / 100)))}
                      </span>
                    </div>
                  )}

                  {/* Feedback Message */}
                  {formSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Form Submission */}
                  <div className="pt-3 flex gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingProject ? t.saveProjectBtn : t.addProjectBtn}</span>
                    </button>
                    {editingProject && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearEditingProject();
                          setNameEn('');
                          setNameAr('');
                          setDescEn('');
                          setDescAr('');
                          setPrice(0);
                          setIsDeal(false);
                          setDiscountPercent(0);
                          setMediaUrl('');
                          setIsVideo(false);
                          setActiveTab('orders');
                        }}
                        className="px-5 py-3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        {lang === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* 3. Settings Panel */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {lang === 'ar' ? 'إعدادات حساب المسؤول' : 'Administrator Credentials'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'تعديل البريد الإلكتروني للمسؤول، رقم الاتصال وكلمة المرور لخط الدعم.' : 'Modify administrative contact logs and system passwords.'}
                  </p>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-xl">
                  {/* Read-Only Username */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      ADMINISTRATOR USERNAME
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.username}
                      className="w-full bg-slate-950 text-slate-500 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        {t.email}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 px-3.5 text-xs outline-none"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                        {t.phone}
                      </label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 px-3.5 text-xs outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      {t.address}
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 px-3.5 text-xs outline-none"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase">
                      {t.password}
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 px-3.5 text-xs outline-none"
                    />
                  </div>

                  {settingsSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{settingsSuccess}</span>
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

          </div>
        </div>
      </div>
    </div>
  );
}
