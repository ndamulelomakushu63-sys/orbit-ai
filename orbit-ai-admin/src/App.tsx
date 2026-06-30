import React, { useState, useEffect } from 'react';
import { 
  Shield, Sliders, Users, DollarSign, TrendingUp, Activity, Bell, Settings, 
  LogIn, LogOut, ChevronRight, RefreshCw, AlertCircle, FileText, CheckCircle, 
  XCircle, Trash2, Edit, Plus, Search, HelpCircle, Mail, MapPin, Calendar, 
  Check, Play, UserPlus, ArrowUpRight, ArrowDownRight, BadgeAlert, AlertTriangle, MessageSquare, ExternalLink
} from 'lucide-react';
import { dbFetchRegistrations } from './services/supabase';

// Real or realistic default presets
interface UserRecord {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Pro Monthly' | 'Pro Yearly';
  status: 'Active' | 'Suspended';
  joinDate: string;
}

interface PaymentRecord {
  id: string;
  user: string;
  amount: number;
  plan: string;
  date: string;
  status: 'Successful' | 'Pending Approval' | 'Failed';
  method: string;
}

interface SupportTicket {
  id: string;
  user: string;
  email: string;
  subject: string;
  message: string;
  status: 'Open' | 'Resolved';
  date: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  admin_user: string;
  timestamp: string;
}

const INITIAL_USERS: UserRecord[] = [
  { id: "usr-1", name: "Takalani Nemudzivhadi", email: "takalani@nemudz.co.za", plan: "Pro Monthly", status: "Active", joinDate: "2026-05-12" },
  { id: "usr-2", name: "Lerato Mokoena", email: "lerato@kasicoffee.com", plan: "Pro Yearly", status: "Active", joinDate: "2026-04-18" },
  { id: "usr-3", name: "Mulalo Ramabulana", email: "hub@vendatech.io", plan: "Pro Monthly", status: "Active", joinDate: "2026-06-01" },
  { id: "usr-4", name: "Anesu Moyo", email: "anesu@orbitai.co.za", plan: "Free", status: "Active", joinDate: "2026-06-20" },
  { id: "usr-5", name: "Thabo Ndlovu", email: "thabo@orbitai.co.za", plan: "Free", status: "Active", joinDate: "2026-06-22" },
  { id: "usr-6", name: "Sipho Khumalo", email: "sipho.k@gmail.com", plan: "Pro Monthly", status: "Active", joinDate: "2026-06-25" },
  { id: "usr-7", name: "Nomvula Gumede", email: "nomvula.g@outlook.com", plan: "Free", status: "Suspended", joinDate: "2026-03-10" }
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  { id: "tx-201", user: "Takalani Nemudzivhadi", amount: 199.00, plan: "Pro Monthly", date: "2026-06-29", status: "Successful", method: "Credit Card" },
  { id: "tx-202", user: "Lerato Mokoena", amount: 1990.00, plan: "Pro Yearly", date: "2026-06-28", status: "Successful", method: "EFT Payout" },
  { id: "tx-203", user: "Mulalo Ramabulana", amount: 199.00, plan: "Pro Monthly", date: "2026-06-25", status: "Successful", method: "Credit Card" },
  { id: "tx-204", user: "Sipho Khumalo", amount: 199.00, plan: "Pro Monthly", date: "2026-06-25", status: "Pending Approval", method: "Bank EFT Transfer" },
  { id: "tx-205", user: "Ndamulelo Glen", amount: 450.00, plan: "Custom Agency", date: "2026-06-24", status: "Pending Approval", method: "Bank EFT Transfer" }
];

const INITIAL_TICKETS: SupportTicket[] = [
  { id: "tkt-101", user: "Takalani Nemudzivhadi", email: "takalani@nemudz.co.za", subject: "API Integration Inquiry", message: "How do we connect the custom Venda story feed to our external website widget?", status: "Open", date: "2026-06-29" },
  { id: "tkt-102", user: "Lerato Mokoena", email: "lerato@kasicoffee.com", subject: "Billing Query", message: "My premium billing invoice isn't reflecting the VAT component properly for corporate filing.", status: "Open", date: "2026-06-28" },
  { id: "tkt-103", user: "Sipho Khumalo", email: "sipho.k@gmail.com", subject: "GPS Pin Update", message: "I submitted the wrong coordinate for Kasi Coffee Soweto branch. Can we change it?", status: "Resolved", date: "2026-06-24" }
];

const INITIAL_LOGS: ActivityLog[] = [
  { id: "log-1", action: "User Created", details: "Added new staff account Thabo Ndlovu", admin_user: "Ndamulelo Glen", timestamp: "2026-06-30T10:14:00.000Z" },
  { id: "log-2", action: "EFT Approved", details: "EFT Bank Clearance completed for Lerato Mokoena", admin_user: "Ndamulelo Glen", timestamp: "2026-06-30T11:22:00.000Z" }
];

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("orbit_admin_logged_in") === "true";
  });
  const [adminUser, setAdminUser] = useState<string>(() => {
    return localStorage.getItem("orbit_admin_user_name") || "Ndamulelo Makushu Glen";
  });
  const [passcode, setPasscode] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const superAdminEmail = "ndamulelo@orbitai.co.za";
    const acceptedPasscode = "7733"; // Secure admin authorization passcode

    if (
      (loginEmail.toLowerCase() === superAdminEmail || loginEmail.toLowerCase() === "admin@orbitai.co.za" || loginEmail.includes("@orbitai.co.za")) && 
      passcode === acceptedPasscode
    ) {
      setIsAdminLoggedIn(true);
      setAdminUser("Ndamulelo Makushu Glen");
      localStorage.setItem("orbit_admin_logged_in", "true");
      localStorage.setItem("orbit_admin_user_name", "Ndamulelo Makushu Glen");
      setLoginError("");
    } else {
      setLoginError("Access Denied. Invalid Administrator credentials or passcode.");
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("orbit_admin_logged_in");
    localStorage.removeItem("orbit_admin_user_name");
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg border border-blue-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-display">Orbit AI Admin</h1>
              <p className="text-xs text-slate-400 mt-1">Authorized Professional Workstation Panel</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Corporate Email</label>
              <div className="flex items-center gap-2 px-3.5 py-3 bg-slate-950/70 border border-slate-800 rounded-xl focus-within:border-blue-500 transition-all">
                <Mail className="w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  placeholder="admin@orbitai.co.za" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none w-full border-none p-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Admin Master Passcode</label>
              <div className="flex items-center gap-2 px-3.5 py-3 bg-slate-950/70 border border-slate-800 rounded-xl focus-within:border-blue-500 transition-all">
                <LogIn className="w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  placeholder="Enter token" 
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none w-full border-none p-0 focus:ring-0"
                />
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-1">
                Demo Credentials: <span className="text-blue-400">admin@orbitai.co.za</span> & passcode <span className="text-blue-400">7733</span>
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-xs font-medium leading-relaxed animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg active:scale-98 transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Verify and Login</span>
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-slate-500 text-[11px] max-w-xs leading-normal">
          <p className="font-bold">SYSTEM WARNING</p>
          <p className="mt-0.5">This terminal connects directly to the system database. Unauthorized access is strictly prohibited and logged.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminPanelLayout adminUser={adminUser} handleLogout={handleLogout} />
  );
}

interface AdminPanelLayoutProps {
  adminUser: string;
  handleLogout: () => void;
}

function AdminPanelLayout({ adminUser, handleLogout }: AdminPanelLayoutProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'payments' | 'analytics' | 'settings' | 'support'>('dashboard');
  
  // App-wide collections
  const [users, setUsers] = useState<UserRecord[]>(() => {
    const local = localStorage.getItem("orbit_admin_users");
    return local ? JSON.parse(local) : INITIAL_USERS;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const local = localStorage.getItem("orbit_admin_payments");
    return local ? JSON.parse(local) : INITIAL_PAYMENTS;
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const local = localStorage.getItem("orbit_admin_tickets");
    return local ? JSON.parse(local) : INITIAL_TICKETS;
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const local = localStorage.getItem("orbit_admin_logs");
    return local ? JSON.parse(local) : INITIAL_LOGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("orbit_admin_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("orbit_admin_payments", JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem("orbit_admin_tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem("orbit_admin_logs", JSON.stringify(logs));
  }, [logs]);

  const addLog = (action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      action,
      details,
      admin_user: adminUser,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleSyncData = async () => {
    setIsLoading(true);
    try {
      // Simulate real-time database sync with Supabase and backend pipelines
      await new Promise(resolve => setTimeout(resolve, 800));
      addLog("Database Sync", "Triggered real-time cloud data pipeline synchronization");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-500 shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white font-display tracking-wide uppercase">Orbit HQ</h2>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider">Control Panel</p>
            </div>
          </div>
        </div>

        {/* ADMIN CARD STICKER */}
        <div className="px-5 py-3.5 border-b border-slate-800/50 bg-slate-950/20 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-xs font-black text-blue-400 border border-blue-800/80 font-mono">
              NM
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate font-sans">{adminUser}</p>
              <span className="text-[9px] font-black text-blue-400 tracking-wider uppercase font-mono">Super Admin</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 text-left">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </div>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </div>
            <span className="text-[9px] font-bold font-mono bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'payments' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4" />
              <span>SaaS Payments</span>
            </div>
            <span className="text-[9px] font-bold font-mono bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">
              {payments.filter(p => p.status === 'Pending Approval').length > 0 && (
                <span className="text-amber-400 font-bold animate-pulse">!</span>
              )} {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4" />
              <span>SaaS Analytics</span>
            </div>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'support' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4" />
              <span>Support Desk</span>
            </div>
            <span className="text-[9px] font-bold font-mono bg-red-950 text-red-400 px-2 py-0.5 rounded-md border border-red-900/40">
              {tickets.filter(t => t.status === 'Open').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              <span>HQ Settings</span>
            </div>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </button>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950/40 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold cursor-pointer transition duration-150 active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN FRAME WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* HEADER BAR */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-8 flex items-center justify-between z-10">
          <div className="text-left">
            <h2 className="text-xs font-black text-white font-display uppercase tracking-wider flex items-center gap-2">
              <span className="text-slate-400">HQ /</span>
              <span>{activeTab} Management</span>
              {isLoading && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSyncData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700/50 cursor-pointer"
              title="Sync Corporate Pipelines"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-800"></div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              CORE WORKSTATION STATE: <span className="text-green-400">SECURE &amp; SYNCED</span>
            </span>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <DashboardView 
              users={users} 
              payments={payments} 
              tickets={tickets} 
              logs={logs} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'users' && (
            <UsersView 
              users={users} 
              setUsers={setUsers} 
              addLog={addLog} 
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView 
              payments={payments} 
              setPayments={setPayments} 
              addLog={addLog} 
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView 
              users={users} 
              payments={payments} 
            />
          )}

          {activeTab === 'support' && (
            <SupportDeskView 
              tickets={tickets} 
              setTickets={setTickets} 
              addLog={addLog} 
            />
          )}

          {activeTab === 'settings' && (
            <HQSettingsView 
              logs={logs} 
              setLogs={setLogs} 
              addLog={addLog} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD VIEW COMPONENT
// ==========================================
interface ViewProps {
  users: UserRecord[];
  payments: PaymentRecord[];
  tickets: SupportTicket[];
  logs: ActivityLog[];
  setActiveTab: (tab: any) => void;
}

function DashboardView({ users, payments, tickets, logs, setActiveTab }: ViewProps) {
  const activeUsersCount = users.filter(u => u.status === 'Active').length;
  const activeProCount = users.filter(u => u.plan !== 'Free' && u.status === 'Active').length;
  
  const totalRevenue = payments
    .filter(p => p.status === 'Successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingEFTs = payments.filter(p => p.status === 'Pending Approval').length;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* CORPORATE BANNER HERO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
          <Shield className="w-56 h-56 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl text-left">
          <span className="text-[9px] font-black text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-900/40 uppercase tracking-widest font-mono">
            SaaS Corporate Master Dashboard
          </span>
          <h1 className="text-xl font-black text-white font-display tracking-tight mt-3">Welcome Back, Executive Administrator</h1>
          <p className="text-xs text-slate-400 leading-relaxed mt-2 font-sans">
            Oversee user directory accounts, clear premium EFT bank subscriptions, review security analytical matrices, and answer direct enterprise customer support inquiries.
          </p>
        </div>
      </div>

      {/* METRIC CARD BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left relative">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Corporate Accounts</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-white font-mono">{users.length}</span>
            <span className="text-[10px] text-green-400 font-mono font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>{activeUsersCount} Active</span>
            </span>
          </div>
          <p className="text-[9px] text-slate-500 mt-2">Validated user profiles in global directory</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left relative">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Premium Subscriptions</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-blue-500 font-mono">{activeProCount}</span>
            <span className="text-[10px] text-blue-400 font-mono font-bold">Pro Seats</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-2">Paying Pro members currently active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left relative">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Cleared Revenue</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">R{totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">ZAR</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-2">Total settled transactions via SecurePay</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left relative">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">HQ EFT Payout Clearance</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-black font-mono ${pendingEFTs > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`}>
              {pendingEFTs}
            </span>
            {pendingEFTs > 0 && (
              <span className="text-[10px] text-amber-500 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-full font-mono font-bold ml-1">
                EFT Pending
              </span>
            )}
          </div>
          <p className="text-[9px] text-slate-500 mt-2">Awaiting EFT payout validation in Payments board</p>
        </div>
      </div>

      {/* QUICK WORKSPACE TABLES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT USERS */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-white uppercase tracking-widest font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Recent User Sign-ups</span>
            </h3>
            <button 
              onClick={() => setActiveTab('users')} 
              className="text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
            >
              Manage Users &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Plan</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right font-mono">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.slice(0, 4).map(user => (
                  <tr key={user.id} className="hover:bg-slate-950/20">
                    <td className="py-3 font-bold text-white">{user.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                        user.plan === 'Pro Yearly' ? 'bg-indigo-950 text-indigo-400 border-indigo-900/30' :
                        user.plan === 'Pro Monthly' ? 'bg-blue-950 text-blue-400 border-blue-900/30' :
                        'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[9px] font-sans font-bold ${user.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-500">{user.joinDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-white uppercase tracking-widest font-display flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Recent SaaS Payout Activity</span>
            </h3>
            <button 
              onClick={() => setActiveTab('payments')} 
              className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              Verify Payouts &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Method</th>
                  <th className="py-2.5 text-right">Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {payments.slice(0, 4).map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-950/20">
                    <td className="py-3 font-bold text-white">{pay.user}</td>
                    <td className="py-3 font-mono text-emerald-400">R{pay.amount.toFixed(2)}</td>
                    <td className="py-3 text-slate-400">{pay.method}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                        pay.status === 'Successful' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/30' :
                        pay.status === 'Pending Approval' ? 'bg-amber-950 text-amber-500 border-amber-900/30 animate-pulse' :
                        'bg-red-950 text-red-400 border-red-900/30'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

// ==========================================
// 2. USERS MANAGEMENT VIEW
// ==========================================
interface UsersViewProps {
  users: UserRecord[];
  setUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>;
  addLog: (action: string, details: string) => void;
}

function UsersView({ users, setUsers, addLog }: UsersViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("All");
  
  // Inline edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPlan, setEditPlan] = useState<'Free' | 'Pro Monthly' | 'Pro Yearly'>("Free");
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended'>("Active");

  // New user state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState<'Free' | 'Pro Monthly' | 'Pro Yearly'>("Free");

  const startEdit = (user: UserRecord) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPlan(user.plan);
    setEditStatus(user.status);
  };

  const saveEdit = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? {
      ...u,
      name: editName,
      email: editEmail,
      plan: editPlan,
      status: editStatus
    } : u));
    addLog("User Profile Modified", `Updated details for ${editName} (${editEmail})`);
    setEditingUserId(null);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    const newUser: UserRecord = {
      id: `usr-${Date.now()}`,
      name: newName,
      email: newEmail,
      plan: newPlan,
      status: "Active",
      joinDate: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
    addLog("User Created", `Registered manual profile for ${newName} on plan ${newPlan}`);
    setNewName("");
    setNewEmail("");
    setShowAddForm(false);
  };

  const deleteUser = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete profile: ${name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      addLog("User Deleted", `Terminated account file for ${name}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === "All" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white font-display uppercase tracking-tight">Active User Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Configure profile status, billing tier seats, and system permissions</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Manual Registration</span>
        </button>
      </div>

      {/* MANUAL USER ADD FORM */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 max-w-xl text-left animate-fade-in">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Manual User Creation Portal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Full Legal Name</label>
              <input 
                type="text" 
                required 
                placeholder="Takalani Glen" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">E-mail Address</label>
              <input 
                type="email" 
                required 
                placeholder="takalani@orbitai.co.za" 
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 justify-between">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Subscription Plan</label>
              <select 
                value={newPlan}
                onChange={e => setNewPlan(e.target.value as any)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="Free">Free Basic</option>
                <option value="Pro Monthly">Pro Monthly (R199/mo)</option>
                <option value="Pro Yearly">Pro Yearly (R1,990/yr)</option>
              </select>
            </div>
            <div className="flex gap-2 self-end">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                Confirm Add
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FILTER BAR CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search active profiles by name or email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none border-none w-full p-0 focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Filter Plan:</span>
          <select 
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:ring-0 focus:border-blue-500 outline-none"
          >
            <option value="All">All Tiers</option>
            <option value="Free">Free Basic</option>
            <option value="Pro Monthly">Pro Monthly</option>
            <option value="Pro Yearly">Pro Yearly</option>
          </select>
        </div>
      </div>

      {/* USER DIRECTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-300">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-4">Legal Name &amp; Contact</th>
                <th className="px-6 py-4">Subscription Plan</th>
                <th className="px-6 py-4">System Status</th>
                <th className="px-6 py-4 font-mono">Join Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map(user => {
                const isEditing = editingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-950/10 transition">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="space-y-2 max-w-xs">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                          <input 
                            type="email" 
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-white text-xs">{user.name}</p>
                          <p className="text-[10px] text-slate-400 font-sans mt-0.5">{user.email}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select 
                          value={editPlan}
                          onChange={e => setEditPlan(e.target.value as any)}
                          className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="Free">Free</option>
                          <option value="Pro Monthly">Pro Monthly</option>
                          <option value="Pro Yearly">Pro Yearly</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          user.plan === 'Pro Yearly' ? 'bg-indigo-950 text-indigo-400 border-indigo-900/30' :
                          user.plan === 'Pro Monthly' ? 'bg-blue-950 text-blue-400 border-blue-900/30' :
                          'bg-slate-950 text-slate-400 border-slate-800'
                        }`}>
                          {user.plan}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select 
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value as any)}
                          className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-sans font-bold ${
                          user.status === 'Active' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {user.status}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{user.joinDate}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => saveEdit(user.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingUserId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-350 rounded-md font-bold text-[10px] hover:bg-slate-700 transition cursor-pointer"
                            >
                              Undo
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEdit(user)}
                              className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id, user.name)}
                              className="p-1.5 hover:bg-red-950/40 rounded-lg text-slate-500 hover:text-red-400 transition cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 italic">No corresponding user files found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. SAAS PAYMENTS & CLEARANCE VIEW
// ==========================================
interface PaymentsViewProps {
  payments: PaymentRecord[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  addLog: (action: string, details: string) => void;
}

function PaymentsView({ payments, setPayments, addLog }: PaymentsViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'settled'>('all');

  const approvePayout = (id: string, user: string, amount: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Successful' } : p));
    addLog("EFT Approved", `EFT Bank Clearance completed for ${user} (R${amount})`);
    alert(`EFT Payment of R${amount} successfully cleared and approved for ${user}!`);
  };

  const rejectPayout = (id: string, user: string) => {
    if (window.confirm(`Are you sure you want to flag and fail payment tx: ${id}?`)) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Failed' } : p));
      addLog("Payment Failed", `EFT Bank Payout Rejected / Failed for ${user}`);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (activeTab === 'pending') return p.status === 'Pending Approval';
    if (activeTab === 'settled') return p.status === 'Successful';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-black text-white font-display uppercase tracking-tight">EFT Clearance &amp; Payments Panel</h1>
        <p className="text-xs text-slate-400 mt-1">Review manual bank EFT deposits, approve user withdrawals, and audit premium credit settled logs</p>
      </div>

      {/* FILTER BUTTON TABS */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${activeTab === 'all' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          All Payments ({payments.length})
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'pending' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          <span>EFT Approvals</span>
          <span className="bg-amber-950 border border-amber-900 text-amber-500 px-1.5 py-0.5 rounded-full text-[9px]">
            {payments.filter(p => p.status === 'Pending Approval').length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('settled')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${activeTab === 'settled' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Settled Revenue ({payments.filter(p => p.status === 'Successful').length})
        </button>
      </div>

      {/* PAYMENTS DIRECTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-300">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Payer / Subscriber</th>
                <th className="px-6 py-4">Subscription Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method / Channel</th>
                <th className="px-6 py-4">Settlement Status</th>
                <th className="px-6 py-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-slate-950/10 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-400">{pay.id}</td>
                  <td className="px-6 py-4 text-white font-bold text-xs">{pay.user}</td>
                  <td className="px-6 py-4 text-slate-300">{pay.plan}</td>
                  <td className="px-6 py-4 font-mono text-emerald-400 font-bold">R{pay.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-400">{pay.method}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-mono font-black uppercase border ${
                      pay.status === 'Successful' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/30' :
                      pay.status === 'Pending Approval' ? 'bg-amber-950/60 text-amber-500 border-amber-900/30 animate-pulse' :
                      'bg-red-950/60 text-red-400 border-red-900/30'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        pay.status === 'Successful' ? 'bg-emerald-500' :
                        pay.status === 'Pending Approval' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {pay.status === 'Pending Approval' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => approvePayout(pay.id, pay.user, pay.amount)}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer transition shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>Clear EFT</span>
                        </button>
                        <button 
                          onClick={() => rejectPayout(pay.id, pay.user)}
                          className="px-2 py-1 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/30 text-slate-400 rounded-lg text-[9px] font-black border border-slate-700 cursor-pointer transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono italic">Verified ({pay.date})</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">No corresponding payment files found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. ANALYTICS VIEW
// ==========================================
interface AnalyticsViewProps {
  users: UserRecord[];
  payments: PaymentRecord[];
}

function AnalyticsView({ users, payments }: AnalyticsViewProps) {
  const settledRev = payments.filter(p => p.status === 'Successful');
  const totalRevenue = settledRev.reduce((sum, p) => sum + p.amount, 0);
  
  const monthlyRevenue = settledRev
    .filter(p => p.plan === 'Pro Monthly')
    .reduce((sum, p) => sum + p.amount, 0);

  const yearlyRevenue = settledRev
    .filter(p => p.plan === 'Pro Yearly')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-black text-white font-display uppercase tracking-tight">SaaS Performance Matrices</h1>
        <p className="text-xs text-slate-400 mt-1">Real-time analytical graphs, token distributions, and performance logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* REVENUE CHART WIDGET */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl md:col-span-2 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-white uppercase tracking-widest block font-sans">Corporate Revenue Channels</h3>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">Settled: R{totalRevenue}</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 font-sans mb-1.5">
                <span>Yearly Subscriptions (Pro Yearly)</span>
                <span className="font-mono font-bold text-white">R{yearlyRevenue} ZAR</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-850">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${totalRevenue > 0 ? (yearlyRevenue/totalRevenue)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 font-sans mb-1.5">
                <span>Monthly Recurring Revenue (Pro Monthly)</span>
                <span className="font-mono font-bold text-white">R{monthlyRevenue} ZAR</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-850">
                <div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: `${totalRevenue > 0 ? (monthlyRevenue/totalRevenue)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 font-sans mb-1.5">
                <span>Other Corporate EFT Clearances</span>
                <span className="font-mono font-bold text-white">R{totalRevenue - monthlyRevenue - yearlyRevenue} ZAR</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-850">
                <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${totalRevenue > 0 ? ((totalRevenue - monthlyRevenue - yearlyRevenue)/totalRevenue)*100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* ACCOUNTS BREAKDOWN DOCK */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest block font-sans">Billing Allocations</h3>
            </div>

            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Pro Yearly
                </span>
                <span className="font-mono font-bold text-white">{users.filter(u=>u.plan === 'Pro Yearly').length} accounts</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Pro Monthly
                </span>
                <span className="font-mono font-bold text-white">{users.filter(u=>u.plan === 'Pro Monthly').length} accounts</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Free Basic
                </span>
                <span className="font-mono font-bold text-white">{users.filter(u=>u.plan === 'Free').length} accounts</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Conversion Ratio</span>
              <span className="text-xl font-black text-white font-mono">
                {users.length > 0 ? ((users.filter(u=>u.plan !== 'Free').length / users.length) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// ==========================================
// 5. CUSTOMER SUPPORT DESK VIEW
// ==========================================
interface SupportDeskViewProps {
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  addLog: (action: string, details: string) => void;
}

function SupportDeskView({ tickets, setTickets, addLog }: SupportDeskViewProps) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const handleResolve = (id: string, user: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    addLog("Support Resolved", `Closed support ticket ${id} for user ${user}`);
    setActiveTicketId(null);
    alert(`Ticket #${id} has been marked as Resolved.`);
  };

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage || !activeTicket) return;
    
    addLog("Support Replied", `Sent professional response to ${activeTicket.user} regarding ticket ${activeTicket.id}`);
    alert(`Your support message has been sent to ${activeTicket.email} successfully.`);
    setReplyMessage("");
    setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'Resolved' } : t));
    setActiveTicketId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-black text-white font-display uppercase tracking-tight">Active Customer Support Desk</h1>
        <p className="text-xs text-slate-400 mt-1">Answer, manage, and resolve enterprise support files from paying Orbit members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TICKETS LIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 lg:col-span-1 text-left">
          <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-2">Active Inboxes</h3>
          <div className="space-y-2.5">
            {tickets.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTicketId(t.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                  activeTicketId === t.id ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center w-full mb-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">#{t.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                    t.status === 'Open' ? 'bg-amber-950 text-amber-500 border-amber-900/40' : 'bg-green-950 text-green-400 border-green-900/40'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-white leading-normal truncate w-full">{t.subject}</p>
                <span className="text-[9px] text-slate-400 mt-1 block">From: {t.user}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONVERSATION VIEWER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2 text-left relative flex flex-col justify-between min-h-[400px]">
          {activeTicket ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white font-display uppercase tracking-tight">{activeTicket.subject}</h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">By {activeTicket.user} ({activeTicket.email})</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{activeTicket.date}</span>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">{activeTicket.message}</p>
                </div>
              </div>

              {/* REPLY FORM */}
              {activeTicket.status === 'Open' ? (
                <form onSubmit={submitReply} className="space-y-4 pt-4 border-t border-slate-800 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Executive Support Reply</label>
                    <textarea 
                      required 
                      rows={4}
                      placeholder="Type a professional corporate support response and resolution path here..."
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleResolve(activeTicket.id, activeTicket.user)}
                      className="px-3.5 py-2 bg-slate-850 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Close Ticket Directly
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Transmit Reply</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-green-950/20 border border-green-900/40 rounded-xl flex items-center gap-2 text-green-400 text-xs">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>This support inquiry has been verified, replied to, and closed successfully.</span>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
                <HelpCircle className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-300">Select a support ticket from the list</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">Choose any open inquiries from paying corporate or basic tier accounts to begin a response cycle.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// ==========================================
// 6. HQ SETTINGS & SYSTEM AUDIT VIEW
// ==========================================
interface HQSettingsViewProps {
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  addLog: (action: string, details: string) => void;
}

function HQSettingsView({ logs, setLogs, addLog }: HQSettingsViewProps) {
  const clearLogs = () => {
    if (window.confirm("Are you sure you want to clear system action audit logs?")) {
      setLogs([]);
      addLog("Logs Cleared", "Audit Action logs wiped clean by Super Admin");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-black text-white font-display uppercase tracking-tight">HQ Settings &amp; Security Audit</h1>
        <p className="text-xs text-slate-400 mt-1">Configure global server parameters, manage roles, and review audit trails</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SYSTEM CONFIGURATION */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl lg:col-span-1 space-y-4 text-left">
          <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-2">System Controls</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <div>
                <p className="text-xs font-bold text-white">EFT Autoclear</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Approve bank payments automatically</p>
              </div>
              <input type="checkbox" className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <div>
                <p className="text-xs font-bold text-white">Maintenance Mode</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Restrict client-side API calls</p>
              </div>
              <input type="checkbox" className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <div>
                <p className="text-xs font-bold text-white">Signups Enabled</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Allow public onboarding flows</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0" />
            </div>
          </div>
        </div>

        {/* SECURITY AUDIT TRAIL */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Corporate Security Audit Trail</h3>
            <button 
              onClick={clearLogs}
              className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
            >
              Clear Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2">Action</th>
                  <th className="py-2">Details</th>
                  <th className="py-2">User</th>
                  <th className="py-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-950/20">
                    <td className="py-3 font-mono font-bold text-blue-400">{log.action}</td>
                    <td className="py-3 text-slate-300">{log.details}</td>
                    <td className="py-3 text-slate-400 font-bold">{log.admin_user}</td>
                    <td className="py-3 text-right font-mono text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-500 italic">Audit trails are empty.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

function Text({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}
