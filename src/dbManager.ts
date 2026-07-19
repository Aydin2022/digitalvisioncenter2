import { Project, Order, User, SupabaseConfig } from './types';

// Seed data: 10 premium projects for Digital Vision Center
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    nameEn: 'Interactive Hospital Management ERP',
    nameAr: 'نظام إدارة المستشفيات التفاعلي',
    descriptionEn: 'A high-fidelity dashboard that automates clinical schedules, patient files, electronic prescriptions, and pharmacy checkout streams dynamically with full statistical visualization.',
    descriptionAr: 'لوحة تحكم عالية الدقة تعمل على أتمتة الجداول السريرية وملفات المرضى والوصفات الطبية الإلكترونية وتدفقات الصيدلة ديناميكيًا مع تمثيل إحصائي كامل.',
    mediaUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    price: 1500000,
    isDeal: true,
    discountPrice: 1200000, // 20% off
    isVideo: false
  },
  {
    id: 'proj-2',
    nameEn: 'AI-Powered E-Commerce Hub',
    nameAr: 'منصة التجارة الإلكترونية بالذكاء الاصطناعي',
    descriptionEn: 'A seamless multi-vendor marketplace featuring smart product recommendations, real-time analytics, visual inventory alerts, and instant payment integration.',
    descriptionAr: 'سوق متعدد البائعين يتميز بتوصيات ذكية للمنتجات، وتحليلات فورية، وتنبيهات بصرية للمخزون، وتكامل الدفع الفوري.',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    price: 2500000,
    isDeal: true,
    discountPrice: 1800000, // 28% off
    isVideo: false
  },
  {
    id: 'proj-3',
    nameEn: 'Automated School ERP Portal',
    nameAr: 'بوابة نظام إدارة المدارس المؤتمت',
    descriptionEn: 'A unified portal enabling academic administration, automated grading report generators, visual student attendance graphs, and parent-teacher communication channels.',
    descriptionAr: 'بوابة موحدة تتيح الإدارة الأكاديمية، ومولدات تقارير الدرجات الآلية، والرسوم البيانية لحضور الطلاب، وقنوات التواصل بين أولياء الأمور والمعلمين.',
    mediaUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    price: 1250000,
    isDeal: false,
    isVideo: false
  },
  {
    id: 'proj-4',
    nameEn: 'Cinematic Real Estate Explorer',
    nameAr: 'تطبيق معرض العقارات السينمائي',
    descriptionEn: 'Ultra-modern listings browser equipped with interactive map layers, dynamic filter builders, architectural galleries, and instant agent scheduling widgets.',
    descriptionAr: 'متصفح عقارات فائق الحداثة مجهز بطبقات خرائط تفاعلية، ومصمم فلاتر ديناميكي، ومعارض هندسية، وأدوات جدولة فورية للعملاء.',
    mediaUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    price: 3000000,
    isDeal: true,
    discountPrice: 2100000, // 30% off
    isVideo: false
  },
  {
    id: 'proj-5',
    nameEn: 'Modern Corporate Cloud ERP',
    nameAr: 'نظام تخطيط موارد المؤسسات السحابي',
    descriptionEn: 'Comprehensive cloud enterprise suite unifying human resources database trackers, automated billing streams, expense reporting, and active payroll databases.',
    descriptionAr: 'مجموعة مؤسسات سحابية شاملة توحد متتبعات قواعد بيانات الموارد البشرية، وتدفقات الفواتير الآلية، وتقارير المصروفات، وقواعد بيانات الرواتب النشطة.',
    mediaUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    price: 4500000,
    isDeal: false,
    isVideo: false
  },
  {
    id: 'proj-6',
    nameEn: 'Smart Restaurant POS System',
    nameAr: 'نظام نقاط البيع الذكي للمطاعم',
    descriptionEn: 'Fast-paced restaurant server client supporting visual dining room layout builders, direct-to-kitchen printer notifications, and live checkout streams.',
    descriptionAr: 'نظام كاشير سريع للمطاعم يدعم تصميم صالات الطعام بوضعها الفعلي، وتنبيهات الطابعة المباشرة للمطبخ، وتدفقات الحساب الفوري.',
    mediaUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
    price: 950000,
    isDeal: false,
    isVideo: false
  },
  {
    id: 'proj-7',
    nameEn: 'Bilingual Logistics & Route Tracker',
    nameAr: 'متتبع الخدمات اللوجستية والشحن ثنائي اللغة',
    descriptionEn: 'Global shipping dashboard tracking vehicle coordinates, active fuel parameters, delivery schedules, and customer-facing delivery state loops.',
    descriptionAr: 'لوحة تحكم شحن عالمية تتبع إحداثيات المركبات، ومعايير الوقود النشطة، وجداول التسليم، وحالة التسليم الموجهة للعملاء.',
    mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    price: 1800000,
    isDeal: false,
    isVideo: false
  },
  {
    id: 'proj-8',
    nameEn: 'Fitness & Gym Membership Tracker',
    nameAr: 'نظام إدارة اشتراكات الأندية الرياضية',
    descriptionEn: 'Sleek application recording individual member barcodes, monthly subscription deadlines, workout schedulers, and secure front-desk check-in logs.',
    descriptionAr: 'تطبيق أنيق يسجل باركود الأعضاء الفرديين، ومواعيد الاشتراكات الشهرية، ومجدول التمارين، وسجلات تسجيل الدخول الآمنة للاستقبال.',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    price: 750000,
    isDeal: true,
    discountPrice: 550000, // ~26% off
    isVideo: false
  },
  {
    id: 'proj-9',
    nameEn: 'Modern Real-Time Chat Engine',
    nameAr: 'محرك الدردشة والتعاون الفوري',
    descriptionEn: 'Ultra-fast workspace messenger packing custom channel organizers, threaded message modules, drag-and-drop secure file hosting, and interactive statuses.',
    descriptionAr: 'تطبيق محادثات فائق السرعة يضم قنوات مخصصة، ومحادثات فرعية، واستضافة ملفات آمنة، وحالات تفاعلية للمستخدمين.',
    mediaUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
    price: 1100000,
    isDeal: false,
    isVideo: false
  },
  {
    id: 'proj-10',
    nameEn: 'Automated Pharmacy Stock System',
    nameAr: 'نظام إدارة مخازن الصيدليات المؤتمت',
    descriptionEn: 'High-compliance medical tracking software warning administrators of drug expiration dates, automated inventory refills, and custom barcode logging.',
    descriptionAr: 'برنامج تتبع طبي عالي الكفاءة يحذر المدراء من تواريخ انتهاء صلاحية الأدوية، وإعادة ملء المخزون تلقائيًا، وتسجيل الباركود المخصص للوصفات.',
    mediaUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
    price: 1400000,
    isDeal: false,
    isVideo: false
  }
];

export const db = {
  getProjects: (): Project[] => {
    const data = localStorage.getItem('dvc_projects');
    if (!data) {
      localStorage.setItem('dvc_projects', JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(data);
  },

  saveProjects: (projects: Project[]) => {
    localStorage.setItem('dvc_projects', JSON.stringify(projects));
  },

  addProject: (project: Omit<Project, 'id'>): Project => {
    const projects = db.getProjects();
    const newProject: Project = {
      ...project,
      id: `proj-${Date.now()}`
    };
    projects.push(newProject);
    db.saveProjects(projects);
    return newProject;
  },

  updateProject: (id: string, updated: Partial<Project>): boolean => {
    const projects = db.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...updated };
      db.saveProjects(projects);
      return true;
    }
    return false;
  },

  deleteProject: (id: string): boolean => {
    const projects = db.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length !== projects.length) {
      db.saveProjects(filtered);
      return true;
    }
    return false;
  },

  getOrders: (): Order[] => {
    const data = localStorage.getItem('dvc_orders');
    return data ? JSON.parse(data) : [];
  },

  saveOrders: (orders: Order[]) => {
    localStorage.setItem('dvc_orders', JSON.stringify(orders));
  },

  createOrder: (order: Omit<Order, 'id' | 'created_at' | 'status'>): Order => {
    const orders = db.getOrders();
    const newOrder: Order = {
      ...order,
      id: `order-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    orders.push(newOrder);
    db.saveOrders(orders);
    return newOrder;
  },

  updateOrderStatus: (id: string, status: 'pending' | 'approved' | 'cancelled'): boolean => {
    const orders = db.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx].status = status;
      db.saveOrders(orders);
      return true;
    }
    return false;
  },

  getFavorites: (username: string): string[] => {
    const data = localStorage.getItem(`dvc_favs_${username}`);
    return data ? JSON.parse(data) : [];
  },

  toggleFavorite: (username: string, projectId: string): boolean => {
    const favs = db.getFavorites(username);
    const idx = favs.indexOf(projectId);
    let isAdded = false;
    if (idx !== -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(projectId);
      isAdded = true;
    }
    localStorage.setItem(`dvc_favs_${username}`, JSON.stringify(favs));
    return isAdded;
  },

  getCart: (username: string): string[] => {
    const data = localStorage.getItem(`dvc_cart_${username}`);
    return data ? JSON.parse(data) : [];
  },

  addToCart: (username: string, projectId: string) => {
    const cart = db.getCart(username);
    if (!cart.includes(projectId)) {
      cart.push(projectId);
      localStorage.setItem(`dvc_cart_${username}`, JSON.stringify(cart));
    }
  },

  removeFromCart: (username: string, projectId: string) => {
    const cart = db.getCart(username);
    const filtered = cart.filter(id => id !== projectId);
    localStorage.setItem(`dvc_cart_${username}`, JSON.stringify(filtered));
  },

  clearCart: (username: string) => {
    localStorage.removeItem(`dvc_cart_${username}`);
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem('dvc_users');
    if (!data) {
      // Default admin and demo users
      const defaultUsers: User[] = [
        {
          id: 'user-admin',
          username: 'admin',
          password: 'admin1234',
          email: 'admin@digitalvisioncenter.hosteday.com',
          phone: '+9647708506036',
          address: 'كركوك - طريق بغداد - عمارة مافي مول',
          role: 'admin'
        },
        {
          id: 'user-demo',
          username: 'demo',
          password: 'user1234',
          email: 'user@digitalvisioncenter.hosteday.com',
          phone: '+9640000000000',
          address: 'Iraq, Kirkuk',
          role: 'user'
        }
      ];
      localStorage.setItem('dvc_users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(data);
  },

  registerUser: (user: Omit<User, 'id' | 'role'> & { role?: 'admin' | 'user' }): { success: boolean; error?: string; user?: User } => {
    const users = db.getUsers();
    if (users.some(u => u.username === user.username)) {
      return { success: false, error: 'Username is already taken.' };
    }
    if (users.some(u => u.email === user.email)) {
      return { success: false, error: 'Email is already registered.' };
    }

    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      role: user.role || 'user'
    };

    users.push(newUser);
    localStorage.setItem('dvc_users', JSON.stringify(users));
    return { success: true, user: newUser };
  },

  loginUser: (username: string, password: string): { success: boolean; error?: string; user?: User } => {
    const users = db.getUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!found) {
      return { success: false, error: 'Invalid username or password.' };
    }
    return { success: true, user: found };
  },

  updateUser: (username: string, updatedFields: Partial<Omit<User, 'id' | 'role' | 'username'>>): { success: boolean; user?: User } => {
    const users = db.getUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedFields };
      localStorage.setItem('dvc_users', JSON.stringify(users));
      return { success: true, user: users[idx] };
    }
    return { success: false };
  }
};
