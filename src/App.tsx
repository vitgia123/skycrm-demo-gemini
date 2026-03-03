import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings as SettingsIcon, 
  Plus, 
  Search,
  RefreshCw,
  ArrowUpRight,
  MessageCircle,
  FileSpreadsheet,
  Menu,
  X,
  Gift,
  Bell,
  RefreshCcw,
  MoreVertical,
  AlertCircle,
  Database,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lead, MarketingReport, TourCost, UserRole, User, Tour } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Data removed, using real API
const MOCK_LEADS: Lead[] = [];
const MOCK_USERS: User[] = [];
const MOCK_TOUR_COSTS: TourCost[] = [];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'customers' | 'marketing' | 'settings' | 'users' | 'all_leads' | 'tours'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tourCosts, setTourCosts] = useState<TourCost[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'traveled' | 'inquired'>('all');
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendZaloNotify, setSendZaloNotify] = useState(true);
  const [zaloOAId, setZaloOAId] = useState('');
  const [zaloSecret, setZaloSecret] = useState('');
  const [isZaloConnected, setIsZaloConnected] = useState(false);
  const [isConnectingZalo, setIsConnectingZalo] = useState(false);
  const [pointsConversionRate, setPointsConversionRate] = useState<number>(() => {
    const saved = localStorage.getItem('pointsConversionRate');
    return saved ? Number(saved) : 1000000;
  });
  const [membershipTiers, setMembershipTiers] = useState<{name: string, minPoints: number, color: string}[]>(() => {
    const saved = localStorage.getItem('membershipTiers');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Đồng', minPoints: 0, color: 'bg-orange-100 text-orange-800' },
      { name: 'Bạc', minPoints: 20, color: 'bg-zinc-200 text-zinc-800' },
      { name: 'Vàng', minPoints: 50, color: 'bg-yellow-100 text-yellow-800' },
      { name: 'Kim Cương', minPoints: 100, color: 'bg-cyan-100 text-cyan-800' }
    ];
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [newTour, setNewTour] = useState<Partial<Tour>>({
    name: '',
    description: '',
    price: undefined
  });

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'sale',
    assignedTours: []
  });

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    customerName: '',
    phoneNumber: '',
    dob: '',
    tourInterest: '',
    tourPrice: undefined,
    discountPrice: undefined,
    amountCollected: undefined,
    paymentDueDate: '',
    source: 'Other',
    status: 'New',
    resaleCount: 0,
    notes: ''
  });
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sendZaloOANotification = (saleId: string, message: string) => {
    if (!isZaloConnected) {
      showToast("Vui lòng cấu hình Zalo OA trong phần Cài đặt trước.", "error");
      return false;
    }
    const sale = users.find(u => u.id === saleId);
    if (!sale) return false;
    
    // Simulate API call
    console.log(`[Zalo OA] To: ${sale.name} | Msg: ${message}`);
    return true;
  };

  const handleNotifyNewLeads = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isZaloConnected) {
      showToast("Vui lòng cấu hình Zalo OA trong phần Cài đặt.", "error");
      return;
    }
    let count = 0;
    reminders.newLeads.forEach(lead => {
      if (lead.assignedTo) {
        sendZaloOANotification(lead.assignedTo, `🔔 LEAD MỚI: ${lead.customerName} quan tâm ${lead.tourInterest}`);
        count++;
      }
    });
    showToast(`Đã gửi thông báo Zalo OA cho ${count} leads mới.`);
  };

  const handleNotifyResale = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isZaloConnected) {
      showToast("Vui lòng cấu hình Zalo OA trong phần Cài đặt.", "error");
      return;
    }
    let count = 0;
    reminders.resaleLeads.forEach(lead => {
      if (lead.assignedTo) {
        sendZaloOANotification(lead.assignedTo, `🔄 CƠ HỘI RESALE: Khách ${lead.customerName} đã đi tour 11 tháng trước.`);
        count++;
      }
    });
    showToast(`Đã gửi thông báo Zalo OA cho ${count} cơ hội resale.`);
  };

  const handleNotifyBirthdays = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isZaloConnected) {
      showToast("Vui lòng cấu hình Zalo OA trong phần Cài đặt.", "error");
      return;
    }
    let count = 0;
    reminders.birthdays.forEach(customer => {
      const lastTour = customer.tourHistory[0];
      if (lastTour) {
        const sale = users.find(u => u.name === lastTour.sale);
        if (sale) {
          sendZaloOANotification(sale.id, `🎂 SINH NHẬT KHÁCH: Hôm nay là sinh nhật khách ${customer.name}. Hãy gửi lời chúc!`);
          count++;
        }
      }
    });
    showToast(`Đã gửi thông báo Zalo OA cho ${count} khách hàng sinh nhật.`);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [usersRes, leadsRes, costsRes, toursRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/leads', { headers }),
        fetch('/api/tour-costs', { headers }),
        fetch('/api/tours', { headers })
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (costsRes.ok) setTourCosts(await costsRes.json());
      if (toursRes.ok) setTours(await toursRes.json());
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    if (token && currentUser) {
      fetchData();
    }
  }, [token, currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) return;
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        const createdUser = await res.json();
        setUsers([...users, createdUser]);
        setIsUserModalOpen(false);
        setNewUser({ username: '', password: '', name: '', email: '', role: 'sale', assignedTours: [] });
        showToast('Đã tạo nhân viên thành công!');
      } else {
        const data = await res.json();
        showToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server', 'error');
    }
  };

  const handleCreateTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTour.name) return;
    
    try {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTour)
      });
      
      if (res.ok) {
        const createdTour = await res.json();
        setTours([createdTour, ...tours]);
        setIsTourModalOpen(false);
        setNewTour({ name: '', description: '', price: undefined });
        showToast('Đã tạo tour thành công!');
      } else {
        const data = await res.json();
        showToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server', 'error');
    }
  };

  const handleDeleteTour = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tour này?')) return;
    try {
      const res = await fetch(`/api/tours/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTours(tours.filter(t => t.id !== id));
        showToast('Đã xóa tour thành công!');
      } else {
        showToast('Lỗi khi xóa tour', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server', 'error');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const assignedSale = users.find(s => s.role === 'sale' && s.assignedTours.includes(newLead.tourInterest || ''));
    
    const leadPayload = {
      ...newLead,
      source: newLead.source || 'Other',
      assignedTo: assignedSale?.id || null
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leadPayload)
      });
      
      if (res.ok) {
        const createdLead = await res.json();
        setLeads([createdLead, ...leads]);
        setIsModalOpen(false);
        setNewLead({ customerName: '', phoneNumber: '', dob: '', tourInterest: '', tourPrice: undefined, discountPrice: undefined, amountCollected: undefined, paymentDueDate: '', source: 'Other', status: 'New', resaleCount: 0, notes: '' });

        if (sendZaloNotify && assignedSale) {
          sendZaloOANotification(assignedSale.id, `🔔 LEAD MỚI: ${createdLead.customerName} quan tâm ${createdLead.tourInterest}`);
          showToast(`Đã gửi thông báo Zalo OA cho ${assignedSale.name}!`);
        }
      } else {
        showToast('Lỗi khi tạo Lead', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server', 'error');
    }
  };

  const copyToZalo = (lead: Lead) => {
    const saleName = users.find(s => s.id === lead.assignedTo)?.name || 'Chưa gán';
    const text = `🚀 LEAD MỚI - ${lead.tourInterest}\n👤 Khách: ${lead.customerName}\n📞 SĐT: ${lead.phoneNumber}\n💰 Giá bán: ${lead.discountPrice?.toLocaleString() || 0}đ\n👤 Sale phụ trách: ${saleName}\n📝 Ghi chú: ${lead.notes || 'Không có'}`;
    navigator.clipboard.writeText(text);
    showToast("Đã copy mẫu tin nhắn Zalo!");
  };

  const handleConnectZalo = () => {
    if (!zaloOAId.trim() || !zaloSecret.trim()) {
      showToast("Vui lòng nhập đầy đủ Zalo OA App ID và Secret Key!", "error");
      return;
    }
    setIsConnectingZalo(true);
    setTimeout(() => {
      setIsConnectingZalo(false);
      setIsZaloConnected(true);
      showToast("Đã lưu cấu hình Zalo OA!");
    }, 1500);
  };

  const handleSync = () => {
    setIsSyncing(true);
    fetchData().then(() => {
      setIsSyncing(false);
      showToast("Đã đồng bộ dữ liệu mới nhất từ Server!");
    });
  };

  const updateCost = async (tourName: string, newCost: number) => {
    try {
      const period = new Date().toISOString().substring(0, 7); // Current month YYYY-MM
      await fetch('/api/tour-costs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tourName, marketingCost: newCost, period })
      });
      
      setTourCosts(prev => {
        const existing = prev.find(c => c.tourName === tourName && c.period === period);
        if (existing) {
          return prev.map(c => c.tourName === tourName && c.period === period ? { ...c, marketingCost: newCost } : c);
        } else {
          return [...prev, { tourName, marketingCost: newCost, period }];
        }
      });
    } catch (err) {
      console.error("Failed to update cost", err);
    }
  };

  const customers = useMemo(() => {
    const customerMap = new Map<string, any>();
    leads.forEach(lead => {
      if (!customerMap.has(lead.phoneNumber)) {
        customerMap.set(lead.phoneNumber, {
          id: lead.phoneNumber,
          name: lead.customerName,
          phoneNumber: lead.phoneNumber,
          dob: lead.dob,
          totalSpent: 0,
          points: 0,
          tourHistory: []
        });
      }
      const customer = customerMap.get(lead.phoneNumber);
      if (!customer.dob && lead.dob) customer.dob = lead.dob;
      if (lead.status === 'Closed') {
        customer.totalSpent += (lead.amountCollected || 0);
        customer.tourHistory.push({
          id: lead.id,
          tourName: lead.tourInterest,
          date: lead.createdAt,
          price: lead.amountCollected || 0,
          sale: users.find(u => u.id === lead.assignedTo)?.name || 'Chưa phân'
        });
      }
    });
    
    return Array.from(customerMap.values()).map(c => {
      const points = Math.floor(c.totalSpent / pointsConversionRate);
      const sortedTiers = [...membershipTiers].sort((a, b) => b.minPoints - a.minPoints);
      const tierObj = sortedTiers.find(t => points >= t.minPoints) || sortedTiers[sortedTiers.length - 1];
      
      return {
        ...c,
        points,
        tier: tierObj.name,
        tierColor: tierObj.color
      };
    });
  }, [leads, users, pointsConversionRate, membershipTiers]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phoneNumber.includes(searchTerm);
      
      const matchesTourFilter = selectedTour === 'all' || l.tourInterest === selectedTour;
      const matchesMonthFilter = selectedMonth === 'all' || l.createdAt.startsWith(selectedMonth);
      
      let matchesRole = true;
      if (currentUser?.role === 'sale') {
        const isAssignedTour = currentUser.assignedTours.includes(l.tourInterest);
        matchesRole = isAssignedTour && l.assignedTo === currentUser.id;
      }
      
      return matchesSearch && matchesTourFilter && matchesMonthFilter && matchesRole;
    });
  }, [leads, searchTerm, selectedTour, selectedMonth, currentUser]);

  const monthOptions = useMemo(() => {
    const months = new Set(leads.map(l => l.createdAt.substring(0, 7))); // YYYY-MM
    return Array.from(months).sort().reverse();
  }, [leads]);

  const tourOptions = useMemo(() => {
    const tours = Array.from(new Set(leads.map(l => l.tourInterest)));
    return tours.filter(t => t !== '');
  }, [leads]);

  const stats = useMemo(() => {
    const total = leads.length;
    const closed = leads.filter(l => l.status === 'Closed').length;
    const potential = leads.filter(l => l.status === 'Potential').length;
    const conversionRate = total > 0 ? (closed / total) * 100 : 0;
    const totalRevenue = leads.reduce((sum, l) => sum + (l.amountCollected || 0), 0);
    
    return { total, closed, potential, conversionRate, totalRevenue };
  }, [leads]);

  const reminders = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const myLeads = leads.filter(l => {
      if (currentUser?.role === 'admin') return true;
      return currentUser?.assignedTours.includes(l.tourInterest) && l.assignedTo === currentUser?.id;
    });

    const myCustomerPhones = new Set(myLeads.map(l => l.phoneNumber));
    const birthdays = customers.filter(c => {
      if (!c.dob) return false;
      if (!myCustomerPhones.has(c.phoneNumber)) return false;
      const [y, m, d] = c.dob.split('-');
      return parseInt(m) === currentMonth;
    });

    const newLeads = myLeads.filter(l => l.status === 'New');
    
    // Khách hàng cũ đã chốt tour, có thể up-sale/resale
    const resaleLeads = myLeads.filter(l => l.status === 'Closed' && l.resaleCount < 3);

    const paymentDues = myLeads.filter(l => {
      if (!l.paymentDueDate) return false;
      const remaining = (l.discountPrice || l.tourPrice || 0) - (l.amountCollected || 0);
      if (remaining <= 0) return false; // Already paid in full
      
      const dueDate = new Date(l.paymentDueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Show reminder if due date is within 3 days or overdue
      return diffDays <= 3;
    });

    const documentDues = myLeads.filter(l => {
      if (!l.documentDueDate) return false;
      if (l.documentStatus === 'Đã đủ') return false;
      
      const dueDate = new Date(l.documentDueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays <= 3;
    });

    return { birthdays, newLeads, resaleLeads, paymentDues, documentDues };
  }, [leads, customers, currentUser]);

  const marketingData = useMemo(() => {
    return tourCosts.map(cost => {
      const tourLeads = leads.filter(l => l.tourInterest === cost.tourName);
      const closed = tourLeads.filter(l => l.status === 'Closed');
      const profit = closed.reduce((acc, curr) => acc + (curr.actualProfit || 0), 0);
      
      return {
        name: cost.tourName,
        leads: tourLeads.length,
        closed: closed.length,
        cost: cost.marketingCost,
        profit: profit,
        roi: cost.marketingCost > 0 ? (profit / cost.marketingCost) : 0
      };
    });
  }, [leads, tourCosts]);

  const salesPerformanceData = useMemo(() => {
    const sales = users.filter(u => u.role === 'sale');
    return sales.map(sale => {
      const saleLeads = leads.filter(l => l.assignedTo === sale.id);
      const closedLeads = saleLeads.filter(l => l.status === 'Closed');
      const revenue = closedLeads.reduce((sum, l) => sum + (l.amountCollected || 0), 0);
      const conversionRate = saleLeads.length > 0 ? (closedLeads.length / saleLeads.length) * 100 : 0;
      
      return {
        id: sale.id,
        name: sale.name,
        totalLeads: saleLeads.length,
        closedLeads: closedLeads.length,
        conversionRate,
        revenue
      };
    });
  }, [leads, users]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
      } else {
        showToast(data.error || 'Sai tài khoản hoặc mật khẩu!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối đến máy chủ', 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('leads');
    setLeads([]);
    setUsers([]);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm",
                toastMessage.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
              )}
            >
              {toastMessage.type === 'success' ? <MessageCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
              <p className="text-sm font-medium">{toastMessage.message}</p>
              <button onClick={() => setToastMessage(null)} className="ml-auto text-current opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">CRM Hub</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Tài khoản</label>
              <input 
                type="text" 
                value={loginUsername} 
                onChange={e => setLoginUsername(e.target.value)} 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Mật khẩu</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none" 
                required 
              />
            </div>
            <button type="submit" className="w-full bg-zinc-900 text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors mt-2">
              Đăng nhập
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-zinc-500 space-y-1">
            <p className="font-bold">Tài khoản mẫu:</p>
            <p>Admin: admin / 123</p>
            <p>Sale: sale1 / 123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm",
              toastMessage.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            )}
          >
            {toastMessage.type === 'success' ? <MessageCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
            <p className="text-sm font-medium">{toastMessage.message}</p>
            <button onClick={() => setToastMessage(null)} className="ml-auto text-current opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white flex flex-col border-r border-zinc-200 transform transition-transform duration-300 md:relative md:translate-x-0 h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <TrendingUp size={18} />
            </div>
            CRM Hub
          </h1>
          <button className="md:hidden text-zinc-500 hover:text-zinc-900" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem 
            icon={<TrendingUp size={18} />} 
            label="Tổng quan" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Users size={18} />} 
            label="Quản lý Leads" 
            active={activeTab === 'leads'} 
            onClick={() => { setActiveTab('leads'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Gift size={18} />} 
            label="Khách hàng" 
            active={activeTab === 'customers'} 
            onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Database size={18} />} 
            label="Data toàn bộ khách" 
            active={activeTab === 'all_leads'} 
            onClick={() => { setActiveTab('all_leads'); setIsSidebarOpen(false); }} 
          />
          {currentUser.role === 'admin' && (
            <>
              <SidebarItem 
                icon={<LayoutDashboard size={18} />} 
                label="Báo cáo" 
                active={activeTab === 'marketing'} 
                onClick={() => { setActiveTab('marketing'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Users size={18} />} 
                label="Quản lý nhân viên" 
                active={activeTab === 'users'} 
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Database size={18} />} 
                label="Quản lý Tour" 
                active={activeTab === 'tours'} 
                onClick={() => { setActiveTab('tours'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<SettingsIcon size={18} />} 
                label="Cấu hình" 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100 space-y-4 shrink-0">
          {currentUser.role === 'sale' && (
            <div className="space-y-2">
              <div className="px-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Tour phụ trách:</p>
                <div className="flex flex-wrap gap-1">
                  {currentUser.assignedTours.map(tour => (
                    <span key={tour} className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">
                      {tour}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold text-xs">
              {currentUser.role === 'admin' ? 'AD' : 'SL'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên Sale'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-50/50 w-full">
        <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-zinc-500 hover:text-zinc-900" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest hidden md:block">
              {activeTab === 'dashboard' ? 'Tổng quan' : activeTab === 'leads' ? 'Quản lý Leads' : activeTab === 'customers' ? 'Khách hàng' : activeTab === 'marketing' ? 'Báo cáo' : activeTab === 'users' ? 'Quản lý nhân viên' : activeTab === 'all_leads' ? 'Data toàn bộ khách' : 'Cấu hình'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                "p-2 text-zinc-400 hover:text-zinc-600 transition-colors",
                isSyncing && "animate-spin"
              )}
            >
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-zinc-900 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Tạo Lead mới</span>
              <span className="md:hidden">Tạo</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Customer History Modal */}
          <AnimatePresence>
            {selectedCustomer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Hồ sơ khách hàng: {selectedCustomer.name}</h3>
                      <p className="text-xs text-zinc-500">{selectedCustomer.phoneNumber} • Sinh nhật: {selectedCustomer.dob ? new Date(selectedCustomer.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-zinc-400 hover:text-zinc-900">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-500 font-medium mb-1">Hạng thành viên</p>
                        <p className={cn("text-lg font-bold", selectedCustomer.tierColor)}>{selectedCustomer.tier}</p>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-500 font-medium mb-1">Điểm tích lũy</p>
                        <p className="text-lg font-bold text-blue-600">{selectedCustomer.points} điểm</p>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-500 font-medium mb-1">Tổng chi tiêu</p>
                        <p className="text-lg font-bold text-emerald-600">{selectedCustomer.totalSpent.toLocaleString()}đ</p>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-zinc-900 mb-3 text-sm">Lịch sử đi tour ({selectedCustomer.tourHistory.length})</h4>
                    {selectedCustomer.tourHistory.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic">Khách hàng chưa đi tour nào (chưa có lead trạng thái Closed).</p>
                    ) : (
                      <div className="border border-zinc-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-zinc-50 border-b border-zinc-200">
                            <tr>
                              <th className="px-4 py-3 font-medium text-zinc-500">Ngày đặt</th>
                              <th className="px-4 py-3 font-medium text-zinc-500">Tour</th>
                              <th className="px-4 py-3 font-medium text-zinc-500 text-right">Giá trị</th>
                              <th className="px-4 py-3 font-medium text-zinc-500">Sale phụ trách</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {selectedCustomer.tourHistory.map((h: any, i: number) => (
                              <tr key={i} className="hover:bg-zinc-50/50">
                                <td className="px-4 py-3 text-zinc-600">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                                <td className="px-4 py-3 font-medium text-zinc-900">{h.tourName}</td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-600">{h.price.toLocaleString()}đ</td>
                                <td className="px-4 py-3 text-zinc-500">{h.sale}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Birthday Modal */}
          <AnimatePresence>
            {isBirthdayModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-pink-900 flex items-center gap-2">
                        <Gift size={20} className="text-pink-600" />
                        Sinh nhật trong tháng
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Danh sách khách hàng có sinh nhật trong tháng này.</p>
                    </div>
                    <button onClick={() => setIsBirthdayModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                      {reminders.birthdays.map((customer, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-zinc-900">{customer.name}</p>
                              <p className="text-xs text-zinc-500">{customer.phoneNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-pink-700">
                                {customer.dob ? new Date(customer.dob).toLocaleDateString('vi-VN') : ''}
                              </p>
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block", customer.tierColor)}>
                                {customer.tier}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const lastTour = customer.tourHistory[0];
                              if (lastTour) {
                                const sale = users.find(u => u.name === lastTour.sale);
                                if (sale) {
                                  sendZaloOANotification(sale.id, `🎂 SINH NHẬT KHÁCH: Hôm nay là sinh nhật khách ${customer.name}. Hãy gửi lời chúc!`);
                                  showToast(`Đã gửi thông báo Zalo OA cho ${sale.name}`);
                                } else {
                                  showToast("Không tìm thấy Sale phụ trách khách hàng này.", "error");
                                }
                              } else {
                                showToast("Khách hàng chưa đi tour nào, không có Sale phụ trách.", "error");
                              }
                            }}
                            className="w-full py-1.5 bg-white hover:bg-pink-100 text-pink-600 border border-pink-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 mt-1"
                          >
                            <MessageCircle size={14} />
                            Gửi lời chúc qua Zalo Sale
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
                    <button 
                      onClick={() => setIsBirthdayModalOpen(false)}
                      className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Create Lead Modal */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
                >
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="text-lg font-bold text-zinc-900">Thêm Lead thủ công</h3>
                    <p className="text-xs text-zinc-500">Dùng cho khách gọi Hotline, Zalo trực tiếp cho Sale.</p>
                  </div>
                  <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tên khách hàng</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                        value={newLead.customerName}
                        onChange={e => setNewLead({...newLead, customerName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Số điện thoại</label>
                        <input 
                          required
                          type="tel" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.phoneNumber}
                          onChange={e => setNewLead({...newLead, phoneNumber: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Ngày sinh</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.dob || ''}
                          onChange={e => setNewLead({...newLead, dob: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nguồn</label>
                      <select 
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                        value={newLead.source}
                        onChange={e => setNewLead({...newLead, source: e.target.value as any})}
                      >
                        <option value="Other">Hotline/Zalo</option>
                        <option value="Facebook">Facebook</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tour quan tâm</label>
                      <select 
                        required
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                        value={newLead.tourInterest}
                        onChange={e => setNewLead({...newLead, tourInterest: e.target.value})}
                      >
                        <option value="">-- Chọn Tour --</option>
                        {tours.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      {newLead.tourInterest && (
                        <p className="mt-1 text-[10px] text-emerald-600 font-medium italic">
                          * Tự động gán cho: {users.find(s => s.role === 'sale' && s.assignedTours.includes(newLead.tourInterest!))?.name || 'Chưa có sale phụ trách tour này'}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Giá Tour</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.tourPrice || ''}
                          onChange={e => setNewLead({...newLead, tourPrice: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Giá Khuyến Mãi</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.discountPrice || ''}
                          onChange={e => setNewLead({...newLead, discountPrice: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Đã Thu</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.amountCollected || ''}
                          onChange={e => setNewLead({...newLead, amountCollected: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Hạn thu tiền</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={newLead.paymentDueDate || ''}
                          onChange={e => setNewLead({...newLead, paymentDueDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Ghi chú</label>
                      <textarea 
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none h-20"
                        value={newLead.notes}
                        onChange={e => setNewLead({...newLead, notes: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <input 
                        type="checkbox" 
                        id="zaloNotify"
                        checked={sendZaloNotify}
                        onChange={e => setSendZaloNotify(e.target.checked)}
                        className="w-4 h-4 accent-zinc-900"
                      />
                      <label htmlFor="zaloNotify" className="text-xs font-medium text-blue-900 cursor-pointer">
                        Tự động bắn tin nhắn vào nhóm Zalo Sale
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                      >
                        Lưu Lead
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Tổng doanh thu</p>
                        <h3 className="text-2xl font-bold text-zinc-900">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            leads.filter(l => l.status === 'Closed').reduce((sum, l) => sum + (l.amountCollected || 0), 0)
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Tổng số Leads</p>
                        <h3 className="text-2xl font-bold text-zinc-900">{leads.length}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Tỷ lệ chốt (Conversion)</p>
                        <h3 className="text-2xl font-bold text-zinc-900">
                          {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Closed').length / leads.length) * 100) : 0}%
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-6">Doanh thu theo Tour</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={
                          Object.entries(
                            leads.filter(l => l.status === 'Closed').reduce((acc, l) => {
                              acc[l.tourInterest] = (acc[l.tourInterest] || 0) + (l.amountCollected || 0);
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([name, value]) => ({ name, value }))
                        }>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f4f4f5' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                          />
                          <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-6">Trạng thái Leads</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              Object.entries(
                                leads.reduce((acc, l) => {
                                  acc[l.status] = (acc[l.status] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name, value]) => ({ name, value }))
                            }
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {Object.entries(
                                leads.reduce((acc, l) => {
                                  acc[l.status] = (acc[l.status] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name], index) => {
                              const colors: Record<string, string> = {
                                'New': '#3b82f6',
                                'Potential': '#f59e0b',
                                'Closed': '#10b981',
                                'Lost': '#ef4444'
                              };
                              return <Cell key={`cell-${index}`} fill={colors[name] || '#9ca3af'} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {['New', 'Potential', 'Closed', 'Lost'].map(status => {
                          const colors: Record<string, string> = {
                            'New': 'bg-blue-500',
                            'Potential': 'bg-amber-500',
                            'Closed': 'bg-emerald-500',
                            'Lost': 'bg-red-500'
                          };
                          return (
                            <div key={status} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors[status]}`}></div>
                              <span className="text-sm text-zinc-600">{status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-6">Doanh thu theo thời gian</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={
                          Object.entries(
                            leads.filter(l => l.status === 'Closed').reduce((acc, l) => {
                              const date = new Date(l.createdAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
                              acc[date] = (acc[date] || 0) + (l.amountCollected || 0);
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([name, value]) => ({ name, value }))
                        }>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                          />
                          <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-6">Nguồn Leads</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              Object.entries(
                                leads.reduce((acc, l) => {
                                  acc[l.source] = (acc[l.source] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name, value]) => ({ name, value }))
                            }
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={120}
                            dataKey="value"
                          >
                            {Object.entries(
                                leads.reduce((acc, l) => {
                                  acc[l.source] = (acc[l.source] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name], index) => {
                              const colors: Record<string, string> = {
                                'Facebook': '#1877f2',
                                'Zalo': '#0068ff',
                                'Other': '#9ca3af'
                              };
                              return <Cell key={`cell-${index}`} fill={colors[name] || '#9ca3af'} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {['Facebook', 'Zalo', 'Other'].map(source => {
                          const colors: Record<string, string> = {
                            'Facebook': 'bg-[#1877f2]',
                            'Zalo': 'bg-[#0068ff]',
                            'Other': 'bg-gray-400'
                          };
                          return (
                            <div key={source} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors[source]}`}></div>
                              <span className="text-sm text-zinc-600">{source}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div 
                key="leads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Sync Banner */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Đang kết nối với Google Sheets</p>
                      <p className="text-xs text-blue-700">Dữ liệu Sale điền trên Sheet sẽ tự động cập nhật tại đây.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSync}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    Đồng bộ ngay
                  </button>
                </div>

                {/* Reminders Section */}
                {(reminders.birthdays.length > 0 || reminders.newLeads.length > 0 || reminders.resaleLeads.length > 0 || reminders.paymentDues.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {reminders.birthdays.length > 0 && (
                      <div 
                        className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 p-4 rounded-xl flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setIsBirthdayModalOpen(true)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-pink-100 text-pink-600 p-2 rounded-lg shrink-0"><Gift size={18} /></div>
                          <div>
                            <h4 className="text-sm font-bold text-pink-900">Sinh nhật trong tháng</h4>
                            <p className="text-xs text-pink-700 mt-1">
                              Có <span className="font-bold">{reminders.birthdays.length}</span> khách hàng sinh nhật trong tháng này. Nhấn để xem chi tiết.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleNotifyBirthdays}
                          className="mt-auto w-full py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle size={14} />
                          Gửi Zalo cho Sale
                        </button>
                      </div>
                    )}
                    {reminders.newLeads.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0"><Bell size={18} /></div>
                          <div>
                            <h4 className="text-sm font-bold text-amber-900">Lead mới cần xử lý</h4>
                            <p className="text-xs text-amber-700 mt-1">
                              Có <span className="font-bold">{reminders.newLeads.length}</span> lead mới đang chờ tư vấn.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleNotifyNewLeads}
                          className="mt-auto w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle size={14} />
                          Gửi Zalo cho Sale
                        </button>
                      </div>
                    )}
                    {reminders.resaleLeads.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0"><RefreshCcw size={18} /></div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900">Cơ hội Resale</h4>
                            <p className="text-xs text-blue-700 mt-1">
                              Có <span className="font-bold">{reminders.resaleLeads.length}</span> khách hàng cũ có thể up-sale tour mới.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleNotifyResale}
                          className="mt-auto w-full py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle size={14} />
                          Gửi Zalo cho Sale
                        </button>
                      </div>
                    )}
                    {reminders.paymentDues.length > 0 && (
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-100 text-red-600 p-2 rounded-lg shrink-0"><AlertCircle size={18} /></div>
                          <div>
                            <h4 className="text-sm font-bold text-red-900">Hạn thu tiền sắp tới</h4>
                            <p className="text-xs text-red-700 mt-1">
                              Có <span className="font-bold">{reminders.paymentDues.length}</span> hồ sơ cần thu tiền gấp.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {reminders.documentDues.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg shrink-0"><FileText size={18} /></div>
                          <div>
                            <h4 className="text-sm font-bold text-purple-900">Hạn thu giấy tờ sắp tới</h4>
                            <p className="text-xs text-purple-700 mt-1">
                              Có <span className="font-bold">{reminders.documentDues.length}</span> hồ sơ cần thu giấy tờ gấp.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard label="Tổng Leads" value={stats.total} trend="+12%" />
                  <StatCard label="Chốt đơn" value={stats.closed} trend="+5%" />
                  <StatCard label="Tiềm năng" value={stats.potential} />
                  <StatCard label="Tỉ lệ chốt" value={`${stats.conversionRate.toFixed(1)}%`} trend="+2.4%" />
                  <StatCard label="Doanh số đã thu" value={`${(stats.totalRevenue / 1000000).toFixed(1)}M`} trend="+15%" />
                </div>

                {/* Lead Table */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 w-full">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Tìm khách hàng, SĐT..." 
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <select 
                          className="flex-1 md:flex-none px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 outline-none min-w-[120px]"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                          <option value="all">Tất cả Tháng</option>
                          {monthOptions.map(m => (
                            <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>
                          ))}
                        </select>
                        <select 
                          className="flex-1 md:flex-none px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 outline-none min-w-[150px]"
                          value={selectedTour}
                          onChange={(e) => setSelectedTour(e.target.value)}
                        >
                          <option value="all">Tất cả Tour</option>
                          {tourOptions.map(tour => (
                            <option key={tour} value={tour}>{tour}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <button className="w-full md:w-auto text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-md hover:bg-zinc-50 flex items-center justify-center gap-2 border border-zinc-200">
                        <FileSpreadsheet size={14} />
                        Xuất Excel
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[1500px]">
                      <div className="grid grid-cols-[50px_1.2fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1fr_1fr_0.8fr_1fr_1fr_80px] bg-zinc-50/50">
                        <div className="col-header">STT</div>
                        <div className="col-header">Khách hàng</div>
                        <div className="col-header">Số điện thoại</div>
                        <div className="col-header">Ngày sinh</div>
                        <div className="col-header">Tour quan tâm</div>
                        <div className="col-header text-right">Giá Tour</div>
                        <div className="col-header text-right">Giá KM</div>
                        <div className="col-header text-right">Đã thu</div>
                        <div className="col-header text-right">Còn lại</div>
                        <div className="col-header text-right">Hạn thu tiền</div>
                        <div className="col-header">Nguồn</div>
                        <div className="col-header">Trạng thái</div>
                        <div className="col-header">Sale phụ trách</div>
                        <div className="col-header">Hành động</div>
                      </div>
                      {filteredLeads.map((lead, index) => {
                        const remaining = (lead.discountPrice || lead.tourPrice || 0) - (lead.amountCollected || 0);
                        return (
                        <div key={lead.id} className="data-row">
                          <div className="flex items-center text-xs font-mono text-zinc-400 pl-4">
                            {(index + 1).toString().padStart(2, '0')}
                          </div>
                          <div 
                            className="flex items-center font-medium text-zinc-900 cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => {
                              const customer = customers.find(c => c.phoneNumber === lead.phoneNumber);
                              if (customer) setSelectedCustomer(customer);
                            }}
                          >
                            {lead.customerName}
                          </div>
                          <div className="flex items-center text-sm font-mono text-zinc-600">
                            {lead.phoneNumber}
                          </div>
                          <div className="flex items-center text-sm font-mono text-zinc-500">
                            {lead.dob ? new Date(lead.dob).toLocaleDateString('vi-VN') : '-'}
                          </div>
                          <div className="flex items-center text-sm text-zinc-600 font-medium">
                            {lead.tourInterest}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-zinc-500">
                            {lead.tourPrice ? lead.tourPrice.toLocaleString() + 'đ' : '-'}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-zinc-900 font-medium">
                            {lead.discountPrice ? lead.discountPrice.toLocaleString() + 'đ' : '-'}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-emerald-600 font-medium">
                            {lead.amountCollected ? lead.amountCollected.toLocaleString() + 'đ' : '-'}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-red-600 font-medium">
                            {remaining > 0 ? remaining.toLocaleString() + 'đ' : '0đ'}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-red-500">
                            {lead.paymentDueDate ? new Date(lead.paymentDueDate).toLocaleDateString('vi-VN') : '-'}
                          </div>
                          <div className="flex items-center">
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 font-bold uppercase">
                              {lead.source}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <StatusPill status={lead.status} />
                          </div>
                          <div className="flex items-center text-xs text-zinc-500 font-medium">
                            {users.find(s => s.id === lead.assignedTo)?.name || 'Chưa phân'}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => copyToZalo(lead)}
                              title="Copy mẫu tin nhắn Zalo"
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors">
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="p-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-zinc-900">Quản lý Khách hàng</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value as any)}
                        className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none w-full sm:w-auto text-sm"
                      >
                        <option value="all">Tất cả khách hàng</option>
                        <option value="traveled">Khách đã từng đi</option>
                        <option value="inquired">Khách mới chỉ hỏi tour</option>
                      </select>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Tìm theo tên, SĐT..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none w-full sm:w-64"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-200">
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Khách hàng</th>
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Số điện thoại</th>
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Hạng thành viên</th>
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Tổng chi tiêu</th>
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Điểm tích luỹ</th>
                          <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Lịch sử Tour</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {customers
                          .filter(c => {
                            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phoneNumber.includes(searchTerm);
                            const matchesFilter = 
                              customerFilter === 'all' ? true :
                              customerFilter === 'traveled' ? c.tourHistory.length > 0 :
                              c.tourHistory.length === 0;
                            return matchesSearch && matchesFilter;
                          })
                          .map(customer => (
                          <tr 
                            key={customer.id} 
                            className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <td className="p-4">
                              <div className="font-medium text-zinc-900">{customer.name}</div>
                              {customer.dob && <div className="text-sm text-zinc-500">SN: {new Date(customer.dob).toLocaleDateString('vi-VN')}</div>}
                            </td>
                            <td className="p-4 text-zinc-600">{customer.phoneNumber}</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-full",
                                customer.tierColor
                              )}>
                                {customer.tier}
                              </span>
                            </td>
                            <td className="p-4 text-right font-medium text-zinc-900">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.totalSpent)}
                            </td>
                            <td className="p-4 text-right text-zinc-600">{customer.points} pt</td>
                            <td className="p-4 text-center">
                              <div className="text-sm text-zinc-600">
                                {customer.tourHistory.length} tour
                              </div>
                            </td>
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-500">
                              Chưa có khách hàng nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'all_leads' && (
              <motion.div 
                key="all_leads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 w-full">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Tìm khách hàng, SĐT..." 
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <button className="w-full md:w-auto text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-md hover:bg-zinc-50 flex items-center justify-center gap-2 border border-zinc-200">
                        <FileSpreadsheet size={14} />
                        Xuất Excel
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                      <div className="grid grid-cols-[50px_1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-zinc-50/50">
                        <div className="col-header">STT</div>
                        <div className="col-header">Khách hàng</div>
                        <div className="col-header">Số điện thoại</div>
                        <div className="col-header">Ngày sinh</div>
                        <div className="col-header text-center">Số Tour đã đi</div>
                        <div className="col-header text-right">Tổng chi tiêu</div>
                        <div className="col-header text-right">Điểm tích lũy</div>
                        <div className="col-header text-center">Hạng</div>
                        <div className="col-header">Hành động</div>
                      </div>
                      {customers.filter(c => {
                        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phoneNumber.includes(searchTerm);
                        return matchesSearch;
                      }).map((customer, index) => {
                        return (
                        <div key={customer.id} className="data-row">
                          <div className="flex items-center text-xs font-mono text-zinc-400 pl-4">
                            {(index + 1).toString().padStart(2, '0')}
                          </div>
                          <div className="flex items-center font-medium text-zinc-900">
                            {customer.name}
                          </div>
                          <div className="flex items-center text-sm font-mono text-zinc-600">
                            {customer.phoneNumber}
                          </div>
                          <div className="flex items-center text-sm font-mono text-zinc-500">
                            {customer.dob ? new Date(customer.dob).toLocaleDateString('vi-VN') : '-'}
                          </div>
                          <div className="flex items-center justify-center text-sm text-zinc-600 font-medium">
                            {customer.tourHistory.length}
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-emerald-600 font-medium">
                            {customer.totalSpent.toLocaleString()}đ
                          </div>
                          <div className="flex items-center justify-end text-sm font-mono text-blue-600 font-bold">
                            {customer.points}
                          </div>
                          <div className="flex items-center justify-center">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 font-bold uppercase",
                              customer.tierColor
                            )}>
                              {customer.tier}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedCustomer(customer)}
                              title="Xem chi tiết"
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'marketing' && (
              <motion.div 
                key="marketing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Hiệu quả Marketing theo Tour</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketingData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="profit" name="Lợi nhuận" fill="#18181B" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cost" name="Chi phí MKT" fill="#E4E4E7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Phân bổ Nguồn Lead</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Facebook', value: 75 },
                              { name: 'Zalo', value: 15 },
                              { name: 'Khác', value: 10 },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#18181B" />
                            <Cell fill="#71717A" />
                            <Cell fill="#E4E4E7" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-900" /> Facebook</span>
                        <span className="font-medium">75%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-500" /> Zalo</span>
                        <span className="font-medium">15%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">Hiệu quả Sale</h3>
                      <p className="text-xs text-zinc-500 mt-1">Thống kê số lượng lead, tỷ lệ chốt và doanh thu theo từng nhân viên.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="text-left p-4 font-medium text-zinc-500">Nhân viên Sale</th>
                          <th className="text-right p-4 font-medium text-zinc-500">Tổng Leads</th>
                          <th className="text-right p-4 font-medium text-zinc-500">Đã chốt</th>
                          <th className="text-right p-4 font-medium text-zinc-500">Tỷ lệ chốt</th>
                          <th className="text-right p-4 font-medium text-zinc-500">Doanh thu (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {salesPerformanceData.map(sale => (
                          <tr key={sale.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 font-medium text-zinc-900">{sale.name}</td>
                            <td className="p-4 text-right">{sale.totalLeads}</td>
                            <td className="p-4 text-right">{sale.closedLeads}</td>
                            <td className="p-4 text-right">
                              <span className={cn(
                                "px-2 py-1 rounded-md text-xs font-bold",
                                sale.conversionRate >= 20 ? "bg-emerald-100 text-emerald-700" : 
                                sale.conversionRate >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              )}>
                                {sale.conversionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-600">
                              {sale.revenue.toLocaleString()}đ
                            </td>
                          </tr>
                        ))}
                        {salesPerformanceData.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500">
                              Chưa có dữ liệu nhân viên Sale.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">Quản lý Chi phí & ROI</h3>
                    <p className="text-xs text-zinc-500 italic">* Anh điền chi phí MKT vào cột bên dưới để máy tính ROI</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="text-left p-4 font-medium text-zinc-500">Tour</th>
                        <th className="text-right p-4 font-medium text-zinc-500">Số Lead</th>
                        <th className="text-right p-4 font-medium text-zinc-500">Chốt</th>
                        <th className="text-right p-4 font-medium text-zinc-500">Chi phí MKT (VNĐ)</th>
                        <th className="text-right p-4 font-medium text-zinc-500">Lợi nhuận</th>
                        <th className="text-right p-4 font-medium text-zinc-500">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {marketingData.map(item => (
                        <tr key={item.name} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 font-medium">{item.name}</td>
                          <td className="p-4 text-right">{item.leads}</td>
                          <td className="p-4 text-right">{item.closed}</td>
                          <td className="p-4 text-right">
                            <input 
                              type="number" 
                              className="w-32 text-right px-2 py-1 bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                              value={tourCosts.find(c => c.tourName === item.name)?.marketingCost || 0}
                              onChange={(e) => updateCost(item.name, Number(e.target.value))}
                            />
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-600">{item.profit.toLocaleString()}đ</td>
                          <td className="p-4 text-right">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-xs font-bold",
                              item.roi > 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              x{item.roi.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && currentUser.role === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">Danh sách nhân viên</h3>
                      <p className="text-xs text-zinc-500 mt-1">Quản lý tài khoản và phân quyền tour cho Sale.</p>
                    </div>
                    <button 
                      onClick={() => setIsUserModalOpen(true)}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                    >
                      <Plus size={16} />
                      <span className="hidden md:inline">Thêm nhân viên</span>
                      <span className="md:hidden">Thêm</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="text-left p-4 font-medium text-zinc-500">Tên nhân viên</th>
                          <th className="text-left p-4 font-medium text-zinc-500">Tài khoản</th>
                          <th className="text-left p-4 font-medium text-zinc-500">Email</th>
                          <th className="text-left p-4 font-medium text-zinc-500">Vai trò</th>
                          <th className="text-left p-4 font-medium text-zinc-500">Tour phụ trách</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 font-medium">{u.name}</td>
                            <td className="p-4 font-mono text-zinc-500">{u.username}</td>
                            <td className="p-4 text-zinc-500">{u.email || '-'}</td>
                            <td className="p-4">
                              <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", u.role === 'admin' ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700")}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {u.assignedTours.length > 0 ? u.assignedTours.map(t => (
                                  <span key={t} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded border border-zinc-200">
                                    {t}
                                  </span>
                                )) : <span className="text-zinc-400 italic text-xs">Không có</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tours' && currentUser.role === 'admin' && (
              <motion.div 
                key="tours"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">Danh sách Tour</h3>
                      <p className="text-xs text-zinc-500 mt-1">Quản lý các tour du lịch của công ty.</p>
                    </div>
                    <button 
                      onClick={() => setIsTourModalOpen(true)}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                    >
                      <Plus size={16} />
                      <span className="hidden md:inline">Thêm Tour</span>
                      <span className="md:hidden">Thêm</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="text-left p-4 font-medium text-zinc-500">Tên Tour</th>
                          <th className="text-left p-4 font-medium text-zinc-500">Mô tả</th>
                          <th className="text-right p-4 font-medium text-zinc-500">Giá (VND)</th>
                          <th className="text-center p-4 font-medium text-zinc-500">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {tours.map(t => (
                          <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 font-medium text-zinc-900">{t.name}</td>
                            <td className="p-4 text-zinc-500">{t.description || '-'}</td>
                            <td className="p-4 text-right font-mono text-emerald-600">
                              {t.price ? t.price.toLocaleString() : '-'}
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleDeleteTour(t.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                        {tours.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500">
                              Chưa có tour nào. Hãy tạo tour đầu tiên!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && currentUser.role === 'admin' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl space-y-8"
              >
                <section>
                  <h3 className="text-lg font-semibold mb-4">Cấu hình Điểm tích luỹ</h3>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <p className="text-sm text-zinc-500">Thiết lập tỷ lệ quy đổi từ giá trị Tour sang điểm tích luỹ cho khách hàng.</p>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Số tiền (VNĐ) = 1 điểm</label>
                      <input 
                        type="number" 
                        value={pointsConversionRate}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0) {
                            setPointsConversionRate(val);
                            localStorage.setItem('pointsConversionRate', val.toString());
                          }
                        }}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 font-mono"
                        placeholder="1000000"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 italic">Ví dụ: 1,000,000 VNĐ = 1 điểm. Khách mua tour 5,000,000 VNĐ sẽ được cộng 5 điểm.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4">Cấu hình Hạng thành viên</h3>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <p className="text-sm text-zinc-500">Thiết lập số điểm tối thiểu để đạt các hạng thành viên.</p>
                    <div className="space-y-3">
                      {membershipTiers.map((tier, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-32">
                            <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", tier.color)}>
                              {tier.name}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm text-zinc-600">Từ</span>
                            <input 
                              type="number" 
                              value={tier.minPoints}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val >= 0) {
                                  const newTiers = [...membershipTiers];
                                  newTiers[index].minPoints = val;
                                  setMembershipTiers(newTiers);
                                  localStorage.setItem('membershipTiers', JSON.stringify(newTiers));
                                }
                              }}
                              className="w-24 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 font-mono"
                            />
                            <span className="text-sm text-zinc-600">điểm</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4">Kết nối Google Sheets</h3>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Spreadsheet ID</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      />
                    </div>
                    <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                      Lưu cấu hình
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4">Tích hợp Zalo OA (Zalo Doanh Nghiệp)</h3>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <p className="text-sm text-zinc-500">Gửi thông báo Lead mới trực tiếp vào tin nhắn cá nhân của Sale qua Zalo OA.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Zalo App ID</label>
                        <input 
                          type="text" 
                          value={zaloOAId}
                          onChange={(e) => setZaloOAId(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 font-mono"
                          placeholder="Nhập App ID của Zalo OA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Zalo App Secret Key</label>
                        <input 
                          type="password" 
                          value={zaloSecret}
                          onChange={(e) => setZaloSecret(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 font-mono"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>

                    <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900 space-y-2">
                      <p className="font-bold flex items-center gap-2">
                        <MessageCircle size={16} />
                        Lưu ý về Zalo OA:
                      </p>
                      <ul className="list-disc list-inside space-y-1.5 ml-1 text-blue-800 text-xs">
                        <li>Zalo OA <strong>không hỗ trợ</strong> gửi tin nhắn tự động vào Nhóm (Group).</li>
                        <li>Hệ thống sẽ gửi tin nhắn <strong>inbox trực tiếp</strong> cho từng bạn Sale phụ trách.</li>
                        <li>Các bạn Sale cần bấm <strong>"Quan tâm" (Follow)</strong> Zalo OA của công ty để nhận tin.</li>
                        <li>Cần nâng cấp hệ thống lên mô hình có máy chủ (Backend) để bảo mật Secret Key và gọi API thật.</li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", isZaloConnected ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-xs font-medium text-zinc-500 uppercase">
                          {isZaloConnected ? "Đã lưu cấu hình" : "Chưa cấu hình"}
                        </span>
                      </div>
                      <button 
                        onClick={handleConnectZalo}
                        disabled={isConnectingZalo || isZaloConnected}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                          isZaloConnected 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-zinc-900 text-white hover:bg-zinc-800",
                          isConnectingZalo && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {isConnectingZalo && <RefreshCw size={14} className="animate-spin" />}
                        {isZaloConnected ? "Đã lưu" : "Lưu cấu hình Zalo OA"}
                      </button>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900">Thêm nhân viên mới</h3>
                <p className="text-xs text-zinc-500">Tạo tài khoản và phân quyền cho nhân viên.</p>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tên nhân viên</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tài khoản</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                      value={newUser.username}
                      onChange={e => setNewUser({...newUser, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mật khẩu</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vai trò</label>
                  <select 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                  >
                    <option value="sale">Nhân viên Sale</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                {newUser.role === 'sale' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tour phụ trách (Chọn nhiều)</label>
                    <select 
                      multiple
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none h-24"
                      value={newUser.assignedTours}
                      onChange={e => {
                        const options = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                        setNewUser({...newUser, assignedTours: options});
                      }}
                    >
                      {tours.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1 italic">Giữ phím Ctrl (hoặc Cmd) để chọn nhiều tour</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Tạo nhân viên
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tour Creation Modal */}
      <AnimatePresence>
        {isTourModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h2 className="text-lg font-bold text-zinc-900">Thêm Tour mới</h2>
                <button 
                  onClick={() => setIsTourModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateTour} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tên Tour</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={newTour.name}
                    onChange={e => setNewTour({...newTour, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mô tả</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none h-24 resize-none"
                    value={newTour.description}
                    onChange={e => setNewTour({...newTour, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Giá Tour (VND)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={newTour.price || ''}
                    onChange={e => setNewTour({...newTour, price: Number(e.target.value)})}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsTourModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Tạo Tour
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Details Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{selectedCustomer.name}</h2>
                    <p className="text-sm text-zinc-500">{selectedCustomer.phoneNumber}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Hạng thành viên</p>
                    <p className={cn(
                      "text-lg font-bold",
                      selectedCustomer.tierColor
                    )}>{selectedCustomer.tier}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Tổng chi tiêu</p>
                    <p className="text-lg font-bold text-zinc-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedCustomer.totalSpent)}
                    </p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Điểm tích luỹ</p>
                    <p className="text-lg font-bold text-zinc-900">{selectedCustomer.points} pt</p>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">Lịch sử Tour</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {selectedCustomer.tourHistory.map((tour: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors">
                      <div>
                        <p className="font-medium text-zinc-900">{tour.tourName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">{new Date(tour.date).toLocaleDateString('vi-VN')}</span>
                          <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">Sale: {tour.sale}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-emerald-600">
                          +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedCustomer.tourHistory.length === 0 && (
                    <p className="text-center text-zinc-500 py-4">Chưa có lịch sử tour</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20" 
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, trend }: { label: string, value: string | number, trend?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-bold text-zinc-900">{value}</h4>
        {trend && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Lead['status'] }) {
  const styles = {
    New: "bg-blue-50 text-blue-700 border-blue-100",
    Potential: "bg-amber-50 text-amber-700 border-amber-100",
    Closed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Lost: "bg-zinc-100 text-zinc-500 border-zinc-200"
  };

  return (
    <span className={cn("status-pill border", styles[status])}>
      {status}
    </span>
  );
}
