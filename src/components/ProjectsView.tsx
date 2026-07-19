import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Heart, ShoppingCart, Edit2, Trash2, Tag, Eye, Info, Play, Film, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Project, User } from '../types';
import { Language } from '../useTranslation';

interface ProjectsViewProps {
  projects: Project[];
  currentUser: User | null;
  lang: Language;
  t: any;
  favorites: string[];
  cart: string[];
  onToggleFavorite: (projectId: string) => void;
  onAddToCart: (projectId: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function ProjectsView({
  projects,
  currentUser,
  lang,
  t,
  favorites,
  cart,
  onToggleFavorite,
  onAddToCart,
  onEditProject,
  onDeleteProject
}: ProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter projects by localized search query
  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    const name = lang === 'ar' ? p.nameAr : p.nameEn;
    const desc = lang === 'ar' ? p.descriptionAr : p.descriptionEn;
    return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  });

  const formatPrice = (num: number) => {
    return num.toLocaleString() + ' IQD';
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-12">
      {/* Header and Search */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-display">
          {t.projectsHeading}
        </h2>
        <p className="text-sm text-slate-400">
          {t.projectsSubtitle}
        </p>

        {/* Dynamic Search Bar */}
        <div className="relative max-w-md mx-auto pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-900/90 text-slate-100 border border-slate-800 focus:border-indigo-500/50 rounded-2xl py-3 pl-10 pr-10 text-sm outline-none transition-all shadow-xl"
            style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
          />
          <Search className={`absolute ${lang === 'ar' ? 'left-3.5' : 'right-3.5'} top-5.5 w-5 h-5 text-slate-500`} />
        </div>
      </div>

      {/* Grid of 3D-styled cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((project) => {
          const isFav = favorites.includes(project.id);
          const inCart = cart.includes(project.id);
          const name = lang === 'ar' ? project.nameAr : project.nameEn;
          const hasDiscount = project.isDeal && project.discountPrice;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="group bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-between"
            >
              {/* Deal Red Tape Badge */}
              {project.isDeal && (
                <div className={`absolute top-3.5 ${lang === 'ar' ? 'left-3.5' : 'right-3.5'} z-20`}>
                  <span className="flex items-center gap-1 bg-rose-600 text-white font-black font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg border border-rose-400/30 animate-pulse">
                    <Tag className="w-3 h-3 shrink-0" />
                    {t.dealTag}
                  </span>
                </div>
              )}

              {/* Media Section */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setSelectedProject(project)}>
                {project.mediaUrl ? (
                  project.isVideo ? (
                    <video
                      src={project.mediaUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={project.mediaUrl}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                    <Film className="w-8 h-8 text-slate-700" />
                    <span className="text-xs font-mono">NO MEDIA</span>
                  </div>
                )}
                
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Micro eye action indicator */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-indigo-600/90 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                    <Eye className="w-3.5 h-3.5" />
                    {t.viewDetails}
                  </span>
                </div>
              </div>

              {/* Info Body (NO description on project card as requested) */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {name}
                  </h3>
                </div>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-2">
                  {hasDiscount ? (
                    <>
                      <span className="text-slate-500 text-xs line-through font-mono">
                        {formatPrice(project.price)}
                      </span>
                      <span className="text-emerald-400 font-extrabold text-sm font-mono tracking-tight">
                        {formatPrice(project.discountPrice!)}
                      </span>
                    </>
                  ) : (
                    <span className="text-indigo-300 font-bold text-sm font-mono">
                      {formatPrice(project.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 bg-slate-900/40 flex items-center justify-between gap-3">
                {isAdmin ? (
                  <>
                    {/* Admin Actions: Edit & Delete */}
                    <button
                      onClick={() => onEditProject(project)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {t.editProject}
                    </button>
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 hover:border-rose-800/40 rounded-xl transition-all cursor-pointer"
                      title={t.deleteProject}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* User Actions: Favorite & Cart */}
                    <button
                      onClick={() => onToggleFavorite(project.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isFav
                          ? 'bg-rose-950/40 border-rose-800 text-rose-500'
                          : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-rose-400 hover:border-rose-950'
                      }`}
                      title={t.addToFav}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => onAddToCart(project.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                        inCart
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-800/50'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{inCart ? t.appName !== 'مركز الرؤية الرقمية' ? 'In Cart' : 'في السلة' : t.addToCart}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-3xl max-w-md mx-auto space-y-3">
          <Info className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">
            {lang === 'ar' ? 'لم يتم العثور على أي مشاريع مطابقة لبحثك.' : 'No projects matched your search criteria.'}
          </p>
        </div>
      )}

      {/* Cinematic Detail Screen Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
              style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
            >
              {/* Media banner */}
              <div className="relative aspect-video bg-slate-950">
                {selectedProject.mediaUrl && (
                  selectedProject.isVideo ? (
                    <video
                      src={selectedProject.mediaUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={selectedProject.mediaUrl}
                      alt={lang === 'ar' ? selectedProject.nameAr : selectedProject.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-950/65 hover:bg-slate-950 text-white rounded-full border border-slate-800/40 transition-colors cursor-pointer z-30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 md:p-8 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    {lang === 'ar' ? selectedProject.nameAr : selectedProject.nameEn}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-mono uppercase tracking-widest font-semibold text-indigo-400">
                      PROJECT DETAIL
                    </span>
                    {selectedProject.isDeal && (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded font-black font-mono">
                        DEAL
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4">
                  <h4 className="text-xs font-mono font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    {t.description}
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {lang === 'ar' ? selectedProject.descriptionAr : selectedProject.descriptionEn}
                  </p>
                </div>

                {/* Price and Add button */}
                <div className="border-t border-slate-800/80 pt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[11px] font-mono tracking-wider uppercase block">{t.priceLabel}</span>
                    <div className="flex items-baseline gap-2">
                      {selectedProject.isDeal && selectedProject.discountPrice ? (
                        <>
                          <span className="text-slate-500 text-xs line-through font-mono">
                            {formatPrice(selectedProject.price)}
                          </span>
                          <span className="text-emerald-400 font-extrabold text-base font-mono">
                            {formatPrice(selectedProject.discountPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-indigo-400 font-bold text-base font-mono">
                          {formatPrice(selectedProject.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          onAddToCart(selectedProject.id);
                          setSelectedProject(null);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{t.addToCart}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="px-5 py-3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      {lang === 'ar' ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline replacement of X button import since we don't import from Lucide directly to avoid duplicate names
const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
