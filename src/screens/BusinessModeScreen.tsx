import React, { useState, useEffect } from 'react';
import { useAppState } from '../services/state';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  ExternalLink,
  MessageSquare,
  Building,
  AlertCircle,
  X,
  ChevronRight,
  ShieldCheck,
  Facebook,
  Instagram,
  Eye
} from 'lucide-react';
import { 
  dbFetchApprovedBusinesses, 
  dbFetchUserBusinesses, 
  dbRegisterBusiness,
  dbRegisterBusinessDraft,
  dbFetchUserRegistrations
} from '../services/supabase';
import { Business } from '../types';

export default function BusinessModeScreen() {
  const { currentUser, setMobileScreen } = useAppState();
  
  // Tabs: 'directory' | 'register'
  const [activeTab, setActiveTab] = useState<'directory' | 'register'>('directory');
  
  // Directory state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Registration Form state
  const [formStep, setFormStep] = useState<1 | 2>(1); // 1 = Form, 2 = PayFast checkout redirect
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    category: 'Services',
    phoneNumber: '',
    whatsappNumber: '',
    emailAddress: '',
    physicalAddress: '',
    city: '',
    province: '',
    website: '',
    facebook: '',
    instagram: '',
    description: '',
    preferredContactTime: 'Morning (08:00 - 12:00)'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  // User's own registered businesses state
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [loadingMyBusinesses, setLoadingMyBusinesses] = useState(true);

  // Success message after payment return
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Categories list
  const categories = [
    'All',
    'Services',
    'Retail',
    'Food & Beverage',
    'Technology',
    'Automotive',
    'Health & Beauty',
    'Education',
    'Entertainment',
    'Construction & Trades',
    'Other'
  ];

  const formCategories = categories.filter(c => c !== 'All');

  // Load directory and user's businesses
  useEffect(() => {
    loadDirectoryData();
    if (currentUser) {
      loadUserBusinesses();
    }
  }, [currentUser]);

  // Check query parameters for successful payment return
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('payment_success') === 'true') {
      setShowSuccessModal(true);
      setActiveTab('register'); // Go to register tab where they see their submission status
      // Clear URL params elegantly
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadDirectoryData = async () => {
    setLoadingDirectory(true);
    try {
      const data = await dbFetchApprovedBusinesses();
      if (data) {
        setBusinesses(data);
      }
    } catch (err) {
      console.error("Error loading directory businesses:", err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const loadUserBusinesses = async () => {
    if (!currentUser) return;
    setLoadingMyBusinesses(true);
    try {
      const uid = currentUser.uid || currentUser.id;
      const email = currentUser.email || "";

      // 1. Fetch paid/approved listings from 'businesses' table
      const dataBiz = await dbFetchUserBusinesses(uid) || [];

      // 2. Fetch unpaid registration drafts from 'business_registrations' table
      const dataReg = email ? await dbFetchUserRegistrations(email) : [];

      // Map registrations to Business interface for uniform rendering
      const draftBusinesses: Business[] = (dataReg || [])
        .filter((reg: any) => !reg.is_paid) // only unpaid ones
        .map((reg: any) => {
          let extra = { website: "", facebook: "", instagram: "", province: "" };
          try {
            if (reg.additional_notes) {
              const parsed = JSON.parse(reg.additional_notes);
              extra = { ...extra, ...parsed };
            }
          } catch (e) {}

          return {
            id: reg.id,
            name: reg.business_name,
            ownerName: reg.owner_name,
            description: reg.description,
            category: reg.category,
            townCity: reg.town_city,
            physicalAddress: reg.physical_address,
            phoneNumber: reg.phone_number,
            whatsappNumber: reg.whatsapp_number || "",
            email: reg.email || "",
            openingHours: "Mon - Fri: 08:00 - 17:00",
            socialMediaLinks: {
              website: extra.website || "",
              facebook: extra.facebook || "",
              instagram: extra.instagram || ""
            },
            photos: [],
            specials: [],
            isPublic: false,
            isPaid: false,
            paymentStatus: "Unpaid",
            status: "Pending",
            createdAt: reg.created_at || "",
            userId: uid,
            province: extra.province || "",
            preferredContactTime: reg.preferred_visit_date || ""
          };
        });

      // Combine, preventing duplicates where the registration draft has been converted to a real business
      const combined = [...dataBiz];
      for (const draft of draftBusinesses) {
        if (!combined.some(b => b.id === draft.id)) {
          combined.push(draft);
        }
      }

      setMyBusinesses(combined);
    } catch (err) {
      console.error("Error loading my businesses:", err);
    } finally {
      setLoadingMyBusinesses(false);
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.businessName.trim()) errors.businessName = 'Business Name is required';
    if (!formData.ownerName.trim()) errors.ownerName = 'Owner Name is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone Number is required';
    if (!formData.emailAddress.trim()) {
      errors.emailAddress = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress.trim())) {
      errors.emailAddress = 'Invalid email address format';
    }
    if (!formData.physicalAddress.trim()) errors.physicalAddress = 'Physical Address is required';
    if (!formData.city.trim()) errors.city = 'City/Town is required';
    if (!formData.province.trim()) errors.province = 'Province is required';
    if (!formData.description.trim()) errors.description = 'Short Business Description is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const generateUUID = () => {
    return 'biz-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  };

  // Submit registration form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in to register a business.");
      return;
    }
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const businessId = generateUUID();
      const uid = currentUser.uid || currentUser.id;

      // 1. Prepare draft payload for business_registrations table
      const draftRegistration = {
        id: businessId,
        business_name: formData.businessName.trim(),
        owner_name: formData.ownerName.trim(),
        phone_number: formData.phoneNumber.trim(),
        whatsapp_number: formData.whatsappNumber.trim() || null,
        email: formData.emailAddress.trim(),
        category: formData.category,
        town_city: formData.city.trim(),
        physical_address: formData.physicalAddress.trim(),
        description: formData.description.trim(),
        preferred_visit_date: formData.preferredContactTime,
        additional_notes: JSON.stringify({
          province: formData.province.trim(),
          website: formData.website.trim() || null,
          facebook: formData.facebook.trim() || null,
          instagram: formData.instagram.trim() || null,
          userId: uid
        }),
        is_paid: false,
        status: 'pending'
      };

      // Save as draft inside business_registrations (NOT businesses table)
      const saved = await dbRegisterBusinessDraft(draftRegistration);
      if (!saved) {
        throw new Error("Could not save registration draft. Please try again.");
      }

      // 2. Request PayFast Checkout URL from Server
      const res = await fetch("/api/payfast/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          plan: "business-registration",
          email: currentUser.email || formData.emailAddress.trim(),
          name: currentUser.name || formData.ownerName.trim(),
          businessId: businessId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate PayFast checkout gateway.");
      }

      // 3. Go to redirect step
      setCheckoutUrl(data.checkoutUrl);
      setFormStep(2);

      // Instantly open/redirect to PayFast
      window.location.href = data.checkoutUrl;

    } catch (err: any) {
      alert("Registration Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter approved businesses
  const filteredBusinesses = businesses.filter(biz => {
    const matchesQuery = 
      biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.townCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || biz.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans" id="business-mode-screen">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMobileScreen('chat')}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            id="back-to-home-btn"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              Business Mode
            </h1>
            <p className="text-xs text-slate-500">Discover or Register Local Businesses</p>
          </div>
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1">
          <button 
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'directory' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-directory-btn"
          >
            Directory
          </button>
          <button 
            onClick={() => {
              setActiveTab('register');
              loadUserBusinesses();
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-register-btn"
          >
            Register
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24">
        
        {/* DIRECTORY VIEW */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            
            {/* HERO INTRODUCTION */}
            <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-800/50 to-transparent pointer-events-none" />
              <div className="relative z-10 max-w-xl">
                <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Verified Local Partners
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
                  Connect with Verified Local Businesses
                </h2>
                <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
                  Every business in our directory has been physically visited, interviewed, and hand-verified by the Orbit AI Team. Trust-guaranteed.
                </p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="mt-4 bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  List Your Business for R159
                </button>
              </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search business name, category, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 text-sm"
                  id="directory-search-input"
                />
              </div>

              {/* HORIZONTAL CATEGORIES SLIDER */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* DIRECTORY GRID */}
            {loadingDirectory ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Loading approved business listings...</p>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
                <div className="bg-slate-100 p-4 rounded-full">
                  <Briefcase className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Businesses Found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  We couldn't find any approved businesses matching your search criteria. Be the first to register one!
                </p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="bg-indigo-600 text-white font-semibold text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Register a Business
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBusinesses.map((biz) => (
                  <motion.div
                    key={biz.id}
                    onClick={() => setSelectedBusiness(biz)}
                    layoutId={`biz-card-${biz.id}`}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {biz.category}
                        </span>
                        <div className="flex items-center space-x-1 text-slate-500 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{biz.townCity}</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-snug">
                          {biz.name}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 font-medium">
                          By {biz.ownerName}
                        </p>
                      </div>

                      <p className="text-slate-600 text-sm line-clamp-2 mt-1 leading-relaxed">
                        {biz.description}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-slate-500 font-normal">Verified Directory Member</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REGISTRATION & STATUS VIEW */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            
            {/* USER'S REGISTERED BUSINESS APPLICATIONS STATUS */}
            {loadingMyBusinesses ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex justify-center items-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-slate-500 text-sm">Fetching your applications...</span>
              </div>
            ) : myBusinesses.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-md font-bold text-slate-800 tracking-tight flex items-center gap-1.5 px-1">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Your Business Directory Listings
                </h2>

                <div className="space-y-4">
                  {myBusinesses.map((biz) => (
                    <div 
                      key={biz.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 leading-snug">{biz.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Category: {biz.category} • Location: {biz.townCity}, {biz.province}</p>
                        </div>
                        
                        {/* Status badge and Payment badge */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            biz.paymentStatus === 'Paid' || biz.isPaid
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {biz.paymentStatus === 'Paid' || biz.isPaid ? 'R159 Paid' : 'Unpaid'}
                          </span>
                          
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            biz.status === 'Approved'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : biz.status === 'Rejected'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}>
                            Status: {biz.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Prompt if Unpaid */}
                      {(!biz.isPaid && biz.paymentStatus !== 'Paid') && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-800">Payment Required</p>
                              <p className="text-xs text-amber-700">Please complete your R159 registration payment to start processing your listing.</p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const uid = currentUser?.uid || currentUser?.id;
                                const res = await fetch("/api/payfast/checkout", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    userId: uid,
                                    plan: "business-registration",
                                    email: currentUser?.email || biz.email,
                                    name: currentUser?.name || biz.ownerName,
                                    businessId: biz.id
                                  })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                window.location.href = data.checkoutUrl;
                              } catch (e: any) {
                                alert("Failed to initiate payment: " + e.message);
                              }
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                          >
                            Pay R159 Now
                          </button>
                        </div>
                      )}

                      {/* Display the beautiful specific success message if status is Pending and payment is successful */}
                      {(biz.status === 'Pending' && (biz.isPaid || biz.paymentStatus === 'Paid')) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 text-slate-700 text-sm leading-relaxed">
                          <p className="font-bold text-indigo-800 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Application Pending Verification
                          </p>
                          <div className="space-y-2 text-xs md:text-sm">
                            <p>Thank you for registering your business with Orbit AI.</p>
                            <p>Your payment has been received successfully.</p>
                            <p>Our Business Team will contact you shortly to schedule a visit.</p>
                            <p className="font-semibold pt-1">During our visit we will:</p>
                            <ul className="list-disc pl-5 space-y-1 text-slate-600">
                              <li>Meet you</li>
                              <li>Take professional business photos</li>
                              <li>Interview you</li>
                              <li>Write an attractive business description</li>
                              <li>Verify your business information</li>
                            </ul>
                            <p className="font-medium text-slate-700 pt-1">After approval your business will become visible inside Orbit AI Business Mode.</p>
                          </div>
                        </div>
                      )}

                      {/* If approved, let them view how it looks or edit details */}
                      {biz.status === 'Approved' && (
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-800">Your business directory listing is live on Orbit AI!</p>
                          </div>
                          <button
                            onClick={() => setSelectedBusiness(biz)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview Page
                          </button>
                        </div>
                      )}

                      {biz.status === 'Rejected' && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                          <div>
                            <p className="text-sm font-bold text-rose-800 font-sans">Listing Rejected</p>
                            <p className="text-xs text-rose-700">Your application was not approved. Please contact support if you believe this is an error.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setMyBusinesses([])} // Triggers showing the form by clearing local listing list temporarily
                    className="border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    Register Another Business
                  </button>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM (STEP 1) */
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm max-w-2xl mx-auto">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-950 flex items-center gap-1.5">
                    <Building className="w-5 h-5 text-indigo-600" />
                    Business Directory Application
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill out the registration details. Listing fee is a one-time <strong className="text-indigo-600 font-bold">R159</strong> which covers physical visit, verification, copywriting and listing hosting.
                  </p>
                </div>

                {formStep === 1 ? (
                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    
                    {/* Section: General Info */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                        1. Business Identity
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name *</label>
                          <input 
                            type="text" 
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleInputChange}
                            placeholder="e.g. Cape Town Artisan Bakers"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.businessName && <span className="text-rose-600 text-[10px]">{formErrors.businessName}</span>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name *</label>
                          <input 
                            type="text" 
                            name="ownerName"
                            value={formData.ownerName}
                            onChange={handleInputChange}
                            placeholder="e.g. John Doe"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.ownerName && <span className="text-rose-600 text-[10px]">{formErrors.ownerName}</span>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Business Category *</label>
                          <select 
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm bg-white"
                          >
                            {formCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Team Visit Contact Time</label>
                          <select 
                            name="preferredContactTime"
                            value={formData.preferredContactTime}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm bg-white"
                          >
                            <option value="Morning (08:00 - 12:00)">Morning (08:00 - 12:00)</option>
                            <option value="Afternoon (12:00 - 17:00)">Afternoon (12:00 - 17:00)</option>
                            <option value="Weekend (Saturday)">Weekend (Saturday)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section: Contact Details */}
                    <div className="pt-2">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                        2. Contact Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                          <input 
                            type="email" 
                            name="emailAddress"
                            value={formData.emailAddress}
                            onChange={handleInputChange}
                            placeholder="owner@mybusiness.co.za"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.emailAddress && <span className="text-rose-600 text-[10px]">{formErrors.emailAddress}</span>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                          <input 
                            type="tel" 
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. +27 82 123 4567"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.phoneNumber && <span className="text-rose-600 text-[10px]">{formErrors.phoneNumber}</span>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number (Optional)</label>
                          <input 
                            type="tel" 
                            name="whatsappNumber"
                            value={formData.whatsappNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. +27 82 123 4567"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Location */}
                    <div className="pt-2">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                        3. Location & Address
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address *</label>
                          <input 
                            type="text" 
                            name="physicalAddress"
                            value={formData.physicalAddress}
                            onChange={handleInputChange}
                            placeholder="123 Main Road, Sea Point"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.physicalAddress && <span className="text-rose-600 text-[10px]">{formErrors.physicalAddress}</span>}
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town *</label>
                          <input 
                            type="text" 
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Cape Town"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.city && <span className="text-rose-600 text-[10px]">{formErrors.city}</span>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Province *</label>
                          <input 
                            type="text" 
                            name="province"
                            value={formData.province}
                            onChange={handleInputChange}
                            placeholder="Western Cape"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formErrors.province && <span className="text-rose-600 text-[10px]">{formErrors.province}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Section: Social Links */}
                    <div className="pt-2">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                        4. Online Presence (Optional)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                          <input 
                            type="url" 
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            placeholder="https://mybusiness.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook URL</label>
                          <input 
                            type="url" 
                            name="facebook"
                            value={formData.facebook}
                            onChange={handleInputChange}
                            placeholder="https://facebook.com/mybusiness"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram URL</label>
                          <input 
                            type="url" 
                            name="instagram"
                            value={formData.instagram}
                            onChange={handleInputChange}
                            placeholder="https://instagram.com/mybusiness"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Description */}
                    <div className="pt-2">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                        5. Business Description
                      </h3>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description *</label>
                        <textarea 
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Tell us what you sell, what services you offer, or what makes your business unique."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                        />
                        {formErrors.description && <span className="text-rose-600 text-[10px]">{formErrors.description}</span>}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl shadow transition-all cursor-pointer text-center text-sm"
                      id="submit-registration-btn"
                    >
                      {isSubmitting ? 'Registering Draft...' : 'Proceed to Pay R159'}
                    </button>
                  </form>
                ) : (
                  /* STEP 2: REDIRECTING TO PAYFAST */
                  <div className="py-12 text-center space-y-4 flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <h3 className="text-lg font-bold text-slate-800">Redirecting to PayFast Secure Gateway</h3>
                    <p className="text-slate-500 text-sm max-w-sm">
                      Please do not close this window. We are opening PayFast to process your secure local payment of R159.00.
                    </p>
                    <a 
                      href={checkoutUrl}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer inline-block"
                    >
                      Click here if not redirected automatically
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAIL MODAL FOR BUSINESS DIRECTORY MEMBERS */}
      <AnimatePresence>
        {selectedBusiness && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layoutId={`biz-card-${selectedBusiness.id}`}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal header with image background placeholders */}
              <div className="relative h-44 bg-indigo-900 text-white p-6 flex flex-col justify-end">
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 p-1.5 rounded-full text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
                
                <div className="relative z-10 space-y-1">
                  <span className="bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {selectedBusiness.category}
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight leading-none pt-1">
                    {selectedBusiness.name}
                  </h2>
                  <p className="text-slate-300 text-xs flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedBusiness.townCity}, {selectedBusiness.province || 'South Africa'}
                  </p>
                </div>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About Business</h4>
                  <p className="text-slate-700 text-sm leading-relaxed">{selectedBusiness.description}</p>
                </div>

                {/* Directory Owner */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner / Founder</h5>
                    <p className="text-slate-800 text-sm font-semibold mt-0.5">{selectedBusiness.ownerName}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Hours</h5>
                    <p className="text-slate-800 text-sm font-semibold mt-0.5">{selectedBusiness.openingHours || 'Mon - Fri: 08:00 - 17:00'}</p>
                  </div>
                </div>

                {/* Verification Badge */}
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs text-emerald-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold">Orbit AI Verified Business</p>
                    <p className="text-[10px] text-emerald-700">All coordinates, contact metrics and ownership identities have been visited and verified by our staff.</p>
                  </div>
                </div>

                {/* Contact and address fields */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact & Location</h4>
                  
                  <div className="flex items-start space-x-3 text-slate-700">
                    <MapPin className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Physical Address</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{selectedBusiness.physicalAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 text-slate-700">
                    <Phone className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Phone Connection</p>
                      <a href={`tel:${selectedBusiness.phoneNumber}`} className="text-sm font-semibold text-indigo-600 hover:underline inline-block mt-0.5">
                        {selectedBusiness.phoneNumber}
                      </a>
                    </div>
                  </div>

                  {selectedBusiness.email && (
                    <div className="flex items-start space-x-3 text-slate-700">
                      <Mail className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Email Address</p>
                        <a href={`mailto:${selectedBusiness.email}`} className="text-sm font-semibold text-indigo-600 hover:underline inline-block mt-0.5">
                          {selectedBusiness.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedBusiness.whatsappNumber && (
                    <div className="flex items-start space-x-3 text-slate-700">
                      <MessageSquare className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500">WhatsApp Chat</p>
                        <a 
                          href={`https://wa.me/${selectedBusiness.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-sm font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          Chat on WhatsApp
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Social media connections */}
                {selectedBusiness.socialMediaLinks && (Object.values(selectedBusiness.socialMediaLinks).some(link => !!link)) && (
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Channels & Links</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBusiness.socialMediaLinks.website && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.website} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-all font-medium cursor-pointer"
                        >
                          <Globe className="w-4 h-4 text-slate-500" />
                          <span>Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      
                      {selectedBusiness.socialMediaLinks.facebook && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.facebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-all font-medium cursor-pointer"
                        >
                          <Facebook className="w-4 h-4 text-slate-500" />
                          <span>Facebook</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {selectedBusiness.socialMediaLinks.instagram && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.instagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-all font-medium cursor-pointer"
                        >
                          <Instagram className="w-4 h-4 text-slate-500" />
                          <span>Instagram</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button at bottom */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Close Business Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4" id="success-confirmation-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-6"
            >
              <div className="mx-auto bg-emerald-100 text-emerald-600 p-4 rounded-full w-16 h-16 flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Complete</h3>
                
                {/* Specific exact verification text required by prompt */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs md:text-sm text-slate-700 leading-relaxed space-y-3 font-medium">
                  <p>Thank you for registering your business with Orbit AI.</p>
                  <p>Your payment has been received successfully.</p>
                  <p>Our Business Team will contact you shortly to schedule a visit.</p>
                  <p className="font-bold text-slate-900 pt-1">During our visit we will:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 font-normal">
                    <li>Meet you</li>
                    <li>Take professional business photos</li>
                    <li>Interview you</li>
                    <li>Write an attractive business description</li>
                    <li>Verify your business information</li>
                  </ul>
                  <p className="font-semibold text-indigo-600 pt-1">After approval your business will become visible inside Orbit AI Business Mode.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  loadUserBusinesses();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow cursor-pointer text-sm"
                id="close-success-modal-btn"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
