import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Heart, ShoppingCart, LogOut, Shield, User, Info, MapPin, Phone, MessageSquare, Sparkles, Star, Tag, ChevronRight, Compass } from 'lucide-react';
import { useTranslation, Language } from './useTranslation';
import { db } from './dbManager';
import { Project, Order, User as UserType, ConsoleLog } from './types';
import AuthScreen from './components/AuthScreen';
import ProjectsView from './components/ProjectsView';
import CartView from './components/CartView';
import UserProfileView from './components/UserProfileView';
import AdminProfileView from './components/AdminProfileView';
import RobotAssistant from './components/RobotAssistant';
// @ts-ignore
import logoImage from './assets/images/digital_vision_center_logo_1784451081564.jpg';

export default function App() {
  const { lang, toggleLanguage, t, isRtl } = useTranslation();
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('dvc_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'cart' | 'profile' | 'admin'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  
  // Admin Editing Project State
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Dynamic notification toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Developer activity console (kept for telemetry rules but isolated)
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const addLog = (message: string, type: ConsoleLog['type'] = 'info') => {
    setLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), type, message }, ...prev]);
  };

  // Initial loader
  useEffect(() => {
    // Fetch seed projects
    const allProjects = db.getProjects();
    setProjects(allProjects);

    // Load active user's settings if logged in
    if (currentUser) {
      setFavorites(db.getFavorites(currentUser.username));
      setCart(db.getCart(currentUser.username));
      addLog(`Session resumed for user: ${currentUser.username} with role ${currentUser.role}`, 'success');
    } else {
      addLog('Anonymous visitor session initialized.', 'info');
    }
  }, [currentUser]);

  const handleAuthSuccess = (authenticatedUser: UserType) => {
    setCurrentUser(authenticatedUser);
    localStorage.setItem('dvc_current_user', JSON.stringify(authenticatedUser));
    setFavorites(db.getFavorites(authenticatedUser.username));
    setCart(db.getCart(authenticatedUser.username));
    
    // Auto-navigate depending on user role
    if (authenticatedUser.role === 'admin') {
      setActiveTab('admin');
      showToast(lang === 'ar' ? 'مرحباً بك مجدداً يا مسؤول النظام!' : 'Welcome back, Administrator!');
    } else {
      setActiveTab('home');
      showToast(lang === 'ar' ? `أهلاً بك يا ${authenticatedUser.username}!` : `Welcome, ${authenticatedUser.username}!`);
    }
  };

  const handleSignOut = () => {
    if (currentUser) {
      addLog(`User signed out of the workspace session: ${currentUser.username}`, 'info');
    }
    setCurrentUser(null);
    localStorage.removeItem('dvc_current_user');
    setFavorites([]);
    setCart([]);
    setActiveTab('home');
    showToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Signed out successfully.', 'info');
  };

  const handleToggleFavorite = (projectId: string) => {
    if (!currentUser) {
      showToast(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً لإضافة المفضلة!' : 'Please sign in first to favorite products!', 'info');
      return;
    }

    const isAdded = db.toggleFavorite(currentUser.username, projectId);
    setFavorites(db.getFavorites(currentUser.username));

    if (isAdded) {
      showToast(lang === 'ar' ? 'تمت الإضافة للمفضلة!' : 'Added to favorites!');
    } else {
      showToast(lang === 'ar' ? 'تمت الإزالة من المفضلة.' : 'Removed from favorites.', 'info');
    }
  };

  const handleAddToCart = (projectId: string) => {
    if (!currentUser) {
      showToast(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً لإضافة السلة!' : 'Please sign in first to add to cart!', 'info');
      return;
    }

    db.addToCart(currentUser.username, projectId);
    setCart(db.getCart(currentUser.username));
    showToast(lang === 'ar' ? 'تمت إضافة البرمجيات للسلة!' : 'Software added to cart!');
  };

  const handleRemoveFromCart = (projectId: string) => {
    if (!currentUser) return;
    db.removeFromCart(currentUser.username, projectId);
    setCart(db.getCart(currentUser.username));
    showToast(lang === 'ar' ? 'تم حذف البرمجيات من السلة.' : 'Removed from cart.', 'info');
  };

  const handleOrderPlaced = () => {
    if (currentUser) {
      db.clearCart(currentUser.username);
      setCart([]);
    }
    showToast(lang === 'ar' ? 'تم إرسال الطلب للمركز بنجاح!' : 'Order submitted successfully!');
    setActiveTab('profile'); // Switch to their profile order history
  };

  // CRUD operations handled by admin
  const handleAddProject = (newProjectData: Omit<Project, 'id'>) => {
    const created = db.addProject(newProjectData);
    setProjects(db.getProjects());
    showToast(lang === 'ar' ? 'تمت إضافة المشروع الجديد!' : 'New project added to catalog!');
  };

  const handleUpdateProject = (id: string, updatedFields: Partial<Project>) => {
    const success = db.updateProject(id, updatedFields);
    if (success) {
      setProjects(db.getProjects());
      setEditingProject(null);
      showToast(lang === 'ar' ? 'تم تحديث تفاصيل المشروع بنجاح!' : 'Project parameters updated!');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const confirmDelete = window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع نهائياً؟' : 'Are you sure you want to permanently delete this project?');
    if (!confirmDelete) return;

    const success = db.deleteProject(projectId);
    if (success) {
      setProjects(db.getProjects());
      showToast(lang === 'ar' ? 'تم حذف المشروع من الكتالوج.' : 'Project removed from catalog.', 'info');
      addLog(`Admin deleted project ID: ${projectId}`, 'warning');
    }
  };

  const handleEditProjectTrigger = (project: Project) => {
    setEditingProject(project);
    setActiveTab('admin'); // Navigate to administrator profile panel where form loads
  };

  const formatPrice = (num: number) => {
    return num.toLocaleString() + ' IQD';
  };

  // Filter Deals/Discount items for the top section
  const dealProjects = projects.filter(p => p.isDeal).slice(0, 4);
  // Recently added (10 cards)
  const recentProjects = projects.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50 px-4.5 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900/95 border-slate-800 text-indigo-300'
            }`}
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-sans">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Glowing Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Modern Glass Nav Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3.5 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          
          {/* Logo Brand Brand picture */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/20 border-2 border-indigo-500/30 bg-slate-900">
                <img src={logoImage} alt="DVC Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white font-display">
                  {t.appName}
                </h1>
                <span className="text-[10px] text-indigo-400 font-bold font-mono tracking-wider uppercase block">
                  digitalvisioncenter
                </span>
              </div>
            </div>

            {/* Mobile language switch indicator */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold hover:text-indigo-400 transition-colors"
              >
                {lang === 'ar' ? 'EN' : 'عربي'}
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-wrap items-center gap-1.5 md:gap-3 justify-center md:justify-start">
            <button
              onClick={() => { setActiveTab('home'); setEditingProject(null); }}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t.navHome}
            </button>

            <button
              onClick={() => { setActiveTab('projects'); setEditingProject(null); }}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t.navProjects}
            </button>

            {!currentUser || currentUser.role !== 'admin' ? (
              <button
                onClick={() => { setActiveTab('cart'); setEditingProject(null); }}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'cart' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t.navCart}</span>
                {cart.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {cart.length}
                  </span>
                )}
              </button>
            ) : null}

            <a
              href="#about_section"
              onClick={(e) => {
                setActiveTab('home');
                setEditingProject(null);
                setTimeout(() => {
                  document.getElementById('about_section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
            >
              {t.navAbout}
            </a>
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3 justify-center">
            
            {/* Desktop Translation Button */}
            <button
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab(currentUser.role === 'admin' ? 'admin' : 'profile');
                    setEditingProject(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                    activeTab === 'profile' || activeTab === 'admin'
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="max-w-[100px] truncate">{currentUser.username}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                  title={t.navSignOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('profile')} // Renders AuthScreen inside
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.navSignIn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-16">
        
        {/* Render Views Dynamically */}
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-16"
              style={{ direction: isRtl ? 'rtl' : 'ltr' }}
            >
              
              {/* 1. Cinematic Brand Hero Section */}
              <section className="text-center space-y-6 max-w-3xl mx-auto py-10 relative">
                <div className="absolute inset-0 bg-indigo-500/[0.01] blur-3xl rounded-full" />
                
                {/* Visual Avatar Centerpiece */}
                <div className="relative inline-flex mb-2">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                  <div className="relative w-28 h-28 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 rounded-full p-1 shadow-2xl overflow-hidden">
                    <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center border border-indigo-400/20 overflow-hidden">
                      <img src={logoImage} alt="DVC Large Logo" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] md:text-xs font-black tracking-widest font-mono text-indigo-400 uppercase bg-indigo-950/50 border border-indigo-900/30 px-3.5 py-1.5 rounded-full inline-block">
                    {lang === 'ar' ? 'مركز التطبيقات المتكاملة' : 'PREMIUM APPLICATIONS STORE'}
                  </span>
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent font-display">
                    {t.appName}
                  </h1>
                  <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                    {t.brandDescription}
                  </p>
                </div>

                {/* Micro links for CTA */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
                  >
                    {lang === 'ar' ? 'تصفح البرامج' : 'Browse Catalog'}
                  </button>
                  <a
                    href="#about_section"
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {t.navAbout}
                  </a>
                </div>
              </section>

              {/* 2. Deals / Discount Projects section ("Deal Section") */}
              {dealProjects.length > 0 && (
                <section className="space-y-6 pt-4">
                  <div className={`space-y-1.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 text-rose-500">
                      <Tag className="w-5 h-5 shrink-0" />
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-display">
                        {t.dealsSection}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.dealSectionSub}
                    </p>
                  </div>

                  {/* Deal Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dealProjects.map((project) => {
                      const isFav = favorites.includes(project.id);
                      const inCart = cart.includes(project.id);
                      const name = lang === 'ar' ? project.nameAr : project.nameEn;
                      const hasDiscount = project.isDeal && project.discountPrice;

                      return (
                        <div
                          key={project.id}
                          className="group bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-between"
                        >
                          {/* Discount tape red tape */}
                          <div className="absolute top-2.5 left-2.5 z-20">
                            <span className="bg-rose-600 text-white text-[9px] font-black font-mono tracking-widest px-2.5 py-1 rounded-md uppercase shadow-lg border border-rose-400/20 flex items-center gap-1">
                              {lang === 'ar' ? 'عرض مذهل' : 'FLASH DEAL'}
                            </span>
                          </div>

                          {/* Media image (without description, just name and price) */}
                          <div className="relative aspect-video bg-slate-950 overflow-hidden">
                            <img
                              src={project.mediaUrl}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <h3 className="font-bold text-sm text-white tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {name}
                            </h3>

                            {/* Old Price Strikethrough line & New Price beside it */}
                            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                              {hasDiscount && (
                                <>
                                  <span className="text-slate-500 text-[10px] line-through font-mono">
                                    {formatPrice(project.price)}
                                  </span>
                                  <span className="text-rose-400 font-extrabold text-xs font-mono">
                                    {formatPrice(project.discountPrice!)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick trigger actions */}
                          <div className="p-4 pt-0 flex gap-2">
                            {currentUser?.role === 'admin' ? (
                              <button
                                onClick={() => handleEditProjectTrigger(project)}
                                className="w-full py-1.5 bg-slate-950 hover:bg-slate-850 text-indigo-400 border border-slate-850 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer"
                              >
                                {t.editProject}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleFavorite(project.id)}
                                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                    isFav ? 'bg-rose-950/30 border-rose-900/30 text-rose-400' : 'bg-slate-950 border-slate-850 text-slate-500'
                                  }`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleAddToCart(project.id)}
                                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-md shadow-rose-600/10"
                                >
                                  {inCart ? lang === 'ar' ? 'في السلة' : 'In Cart' : t.addToCart}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. Recently added section (10 projects) */}
              <section className="space-y-6">
                <div className={`space-y-1.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-2 text-indigo-500">
                    <Compass className="w-5 h-5 shrink-0" />
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-display">
                      {t.recentProjects}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'اكتشف حزمة الـ 10 برامج المميزة للتحول الرقمي المتكامل.' : 'Explore our prime assortment of 10 modern systems optimized for you.'}
                  </p>
                </div>

                {/* Projects grid using ProjectsView sub components */}
                <ProjectsView
                  projects={recentProjects}
                  currentUser={currentUser}
                  lang={lang}
                  t={t}
                  favorites={favorites}
                  cart={cart}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                  onEditProject={handleEditProjectTrigger}
                  onDeleteProject={handleDeleteProject}
                />
              </section>

              {/* 4. About Us Section */}
              <section id="about_section" className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                <div className="space-y-4 text-left">
                  <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">
                    {t.navAbout}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">
                    {t.aboutHeading}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-4xl">
                    {t.aboutText}
                  </p>
                </div>
              </section>

            </motion.div>
          )}

          {/* Catalog Tab */}
          {activeTab === 'projects' && (
            <motion.div
              key="projects_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProjectsView
                projects={projects}
                currentUser={currentUser}
                lang={lang}
                t={t}
                favorites={favorites}
                cart={cart}
                onToggleFavorite={handleToggleFavorite}
                onAddToCart={handleAddToCart}
                onEditProject={handleEditProjectTrigger}
                onDeleteProject={handleDeleteProject}
              />
            </motion.div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <motion.div
              key="cart_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CartView
                cartItemIds={cart}
                projects={projects}
                currentUser={currentUser}
                lang={lang}
                t={t}
                onRemoveFromCart={handleRemoveFromCart}
                onOrderPlaced={handleOrderPlaced}
                addLog={addLog}
              />
            </motion.div>
          )}

          {/* User/Auth Screen profile tab */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {currentUser ? (
                <UserProfileView
                  currentUser={currentUser}
                  projects={projects}
                  lang={lang}
                  t={t}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                  onUpdateUser={setCurrentUser}
                  addLog={addLog}
                />
              ) : (
                <AuthScreen
                  lang={lang}
                  onAuthSuccess={handleAuthSuccess}
                  onLanguageToggle={toggleLanguage}
                  addLog={addLog}
                />
              )}
            </motion.div>
          )}

          {/* Admin profile tab */}
          {activeTab === 'admin' && (
            <motion.div
              key="admin_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {currentUser && currentUser.role === 'admin' ? (
                <AdminProfileView
                  currentUser={currentUser}
                  projects={projects}
                  lang={lang}
                  t={t}
                  editingProject={editingProject}
                  onClearEditingProject={() => setEditingProject(null)}
                  onAddProject={handleAddProject}
                  onUpdateProject={handleUpdateProject}
                  addLog={addLog}
                />
              ) : (
                <div className="text-center py-20 space-y-4">
                  <Shield className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="font-bold text-white">Access Denied</h3>
                  <p className="text-xs text-slate-400">Please sign in as an administrator to access these tools.</p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Authenticate
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Robot Chat Assistant */}
      <RobotAssistant lang={lang} />

      {/* Cinematic Sticky Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-10 mt-20 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          
          {/* Logo brand and Location */}
          <div className="space-y-3 max-w-sm text-left">
            <h4 className="font-black text-white text-sm font-display tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              {t.appName}
            </h4>
            <div className="flex items-start gap-2.5 text-[11px] text-slate-500">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <a
                href="https://maps.app.goo.gl/HhALPQhLxCsVb5EL8?g_st=aw"
                target="_blank"
                referrerPolicy="no-referrer"
                className="hover:text-white transition-colors"
                title={t.locationMap}
              >
                {t.footerAddress}
              </a>
            </div>
          </div>

          {/* Socials Contact WhatsApp info */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="space-y-2">
              <span className="block font-bold text-white text-[10px] uppercase font-mono tracking-wider">{t.footerSocial}</span>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                
                <a
                  href="https://wa.me/9647708506036"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2"
                  title={t.whatsappHint}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.975 14.069.953 11.998.953c-5.44 0-9.866 4.371-9.87 9.8-.002 1.744.47 3.447 1.366 4.945l-1.01 3.684 3.773-.978zm11.567-7.447c-.29-.145-1.72-.848-1.987-.945-.266-.096-.46-.145-.654.145-.193.29-.747.945-.916 1.137-.168.193-.337.217-.627.072-2.935-1.463-4.743-4.002-5.428-5.174-.169-.29-.018-.447.126-.59.13-.13.29-.338.435-.507.145-.169.193-.29.29-.483.097-.193.048-.361-.024-.506-.072-.145-.654-1.57-.896-2.152-.236-.569-.475-.491-.654-.5-.169-.008-.362-.01-.556-.01-.193 0-.507.073-.772.362-.266.29-1.014.99-1.014 2.415 0 1.425 1.038 2.8 1.183 2.993.145.193 2.043 3.12 4.95 4.378.692.299 1.233.478 1.654.612.697.221 1.332.19 1.833.115.558-.084 1.72-.702 1.962-1.38.242-.678.242-1.258.17-1.38-.073-.122-.266-.193-.556-.338z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block font-bold text-white text-[10px] uppercase font-mono tracking-wider">{t.footerContact}</span>
              <a
                href="tel:+9647708506036"
                className="block text-indigo-400 font-bold font-mono hover:text-indigo-300 transition-colors"
              >
                +9647708506036
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900/60 mt-8 pt-8 text-center text-[10px] text-slate-600 font-mono flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>{t.footerCopyright}</span>
          <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850 text-slate-500">
            {lang === 'ar' ? 'كركوك، العراق' : 'Kirkuk, Iraq'}
          </span>
        </div>
      </footer>
    </div>
  );
}
