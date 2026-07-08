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
  dbRegisterBusinessDraft,
  dbFetchUserRegistrations
} from '../services/supabase';
import { Business } from '../types';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { BottomNav } from '../components/BottomNav';

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

  const generateUUID = () => {
    return 'biz-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  };

  // Submit registration form
  const handleRegisterSubmit = async () => {
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

      // Save as draft inside business_registrations
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
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between" id="business-mode-screen">
      
      {/* HEADER BAR */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen('chat')}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
            id="back-to-home-btn"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </TouchableOpacity>
          <View className="text-left">
            <Text className="text-base font-extrabold text-slate-900 tracking-tight block">Business Mode</Text>
            <Text className="text-[10px] text-slate-400 font-medium block">Discover Local Businesses</Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View className="flex flex-row bg-slate-100 p-0.5 rounded-xl border border-slate-200/55">
          <TouchableOpacity 
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'directory' 
                ? 'bg-white shadow-2xs border border-slate-200/30' 
                : ''
            }`}
            id="tab-directory-btn"
          >
            <Text className={`text-[11px] font-bold font-sans ${activeTab === 'directory' ? 'text-blue-600' : 'text-slate-450'}`}>Directory</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onClick={() => {
              setActiveTab('register');
              loadUserBusinesses();
            }}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-white shadow-2xs border border-slate-200/30' 
                : ''
            }`}
            id="tab-register-btn"
          >
            <Text className={`text-[11px] font-bold font-sans ${activeTab === 'register' ? 'text-blue-600' : 'text-slate-450'}`}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLL AREA */}
      <ScrollView 
        className="flex-1 px-4 pt-4"
        contentContainerClassName="pb-24 space-y-5"
        showsVerticalScrollIndicator={false}
      >
        
        {/* 1. DIRECTORY SCREEN */}
        {activeTab === 'directory' && (
          <View className="space-y-4 text-left">
            
            {/* Search Panel Card */}
            <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
              <View className="relative flex flex-row items-center bg-slate-50 border border-slate-200/60 rounded-2xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                <TextInput
                  placeholder="Search name, category, location..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 text-xs bg-transparent outline-none font-sans"
                  id="directory-search-input"
                />
              </View>

              {/* Horizontal scroll pills */}
              <View className="flex flex-row overflow-x-auto pb-1 gap-1.5 scrollbar-none">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full border whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-slate-50 border-slate-200/60'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold font-sans tracking-wide ${selectedCategory === cat ? 'text-white' : 'text-slate-500'}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* List Listings */}
            {loadingDirectory ? (
              <View className="py-12 items-center justify-center space-y-3">
                <View className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <Text className="text-xs text-slate-400 font-medium">Fetching verified directory...</Text>
              </View>
            ) : filteredBusinesses.length === 0 ? (
              <View className="bg-white rounded-3xl border border-slate-200/55 p-12 items-center justify-center space-y-3 shadow-2xs text-center">
                <View className="bg-slate-50 p-4 rounded-full border border-slate-100">
                  <Briefcase className="w-8 h-8 text-slate-400" />
                </View>
                <Text className="text-sm font-extrabold text-slate-800 block">No Listings Found</Text>
                <Text className="text-xs text-slate-400 max-w-[280px] leading-relaxed block">
                  We couldn't find any approved businesses matching this filter.
                </Text>
                <TouchableOpacity
                  onClick={() => {
                    setActiveTab('register');
                    loadUserBusinesses();
                  }}
                  className="bg-blue-600 px-4 py-2.5 rounded-xl mt-2 cursor-pointer"
                >
                  <Text className="text-white text-xs font-bold font-sans">Register a Business</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredBusinesses.map((biz) => (
                  <TouchableOpacity
                    key={biz.id}
                    onClick={() => setSelectedBusiness(biz)}
                    className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs text-left cursor-pointer transition hover:border-blue-400"
                  >
                    <View className="flex flex-row justify-between items-center">
                      <View className="bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                        <Text className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{biz.category}</Text>
                      </View>
                      <View className="flex flex-row items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{biz.townCity}</Text>
                      </View>
                    </View>

                    <View className="space-y-1">
                      <Text className="text-sm font-extrabold text-slate-900 leading-tight block">{biz.name}</Text>
                      <Text className="text-[11px] text-slate-400 font-medium block">Owner: {biz.ownerName}</Text>
                    </View>

                    <Text className="text-[11.5px] text-slate-500 leading-relaxed font-sans block line-clamp-3">
                      {biz.description}
                    </Text>

                    <View className="border-t border-slate-100 pt-3.5 flex flex-row items-center justify-between">
                      <View className="flex flex-row items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verified Listing</Text>
                      </View>
                      <View className="flex flex-row items-center gap-0.5">
                        <Text className="text-xs font-bold text-blue-600">View Profile</Text>
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 2. REGISTRATION & STATUS SCREEN */}
        {activeTab === 'register' && (
          <View className="space-y-4 text-left">
            
            {/* Status list if user has listings */}
            {loadingMyBusinesses ? (
              <View className="bg-white border border-slate-200/55 rounded-3xl p-6 flex flex-row items-center justify-center shadow-2xs">
                <View className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                <Text className="text-slate-500 text-xs font-medium">Loading your listings...</Text>
              </View>
            ) : myBusinesses.length > 0 ? (
              <View className="space-y-4">
                <Text className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest pl-1 block">Your Registered Listings</Text>

                <View className="space-y-4">
                  {myBusinesses.map((biz) => (
                    <View key={biz.id} className="bg-white border border-slate-200/55 rounded-3xl p-5 shadow-2xs space-y-4 text-left">
                      <View className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <View className="text-left">
                          <Text className="text-sm font-extrabold text-slate-900 leading-tight block">{biz.name}</Text>
                          <Text className="text-[10.5px] text-slate-400 mt-1 block">Category: {biz.category} • Location: {biz.townCity}, {biz.province}</Text>
                        </View>

                        <View className="flex flex-row items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            biz.paymentStatus === 'Paid' || biz.isPaid
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                            {biz.paymentStatus === 'Paid' || biz.isPaid ? 'Paid' : 'Unpaid'}
                          </span>

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            biz.status === 'Approved'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : biz.status === 'Rejected'
                              ? 'bg-rose-50 border-rose-100 text-rose-600'
                              : 'bg-blue-50 border-blue-100 text-blue-600'
                          }`}>
                            {biz.status || 'Pending'}
                          </span>
                        </View>
                      </View>

                      {/* Payment required block */}
                      {(!biz.isPaid && biz.paymentStatus !== 'Paid') && (
                        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                          <View className="flex flex-row gap-2.5 items-start">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <View className="flex-1 text-left">
                              <Text className="text-xs font-bold text-amber-800 block">Listing Fee Required</Text>
                              <Text className="text-[11px] text-amber-700 leading-normal block">
                                Complete your secure R159 registration payment to initiate verification.
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
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
                                alert("Failed to open gateway: " + e.message);
                              }
                            }}
                            className="w-full bg-amber-600 py-2.5 rounded-xl text-center cursor-pointer"
                          >
                            <Text className="text-white text-xs font-bold">Pay R159 Now</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Verification status block */}
                      {(biz.status === 'Pending' && (biz.isPaid || biz.paymentStatus === 'Paid')) && (
                        <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3 text-left">
                          <View className="flex flex-row items-center gap-1.5 text-blue-600 font-bold">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <Text className="text-xs font-extrabold text-blue-700">Verification Pending</Text>
                          </View>
                          <View className="space-y-2">
                            <Text className="text-xs text-slate-600 block leading-normal">
                              Our Business Team has received your submission and will contact you shortly to schedule a visit.
                            </Text>
                            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pt-1">During our physical visit we will:</Text>
                            <View className="space-y-1.5 pl-1.5">
                              <Text className="text-[11px] text-slate-500 block">• Meet you and take professional photos of your shop/activity</Text>
                              <Text className="text-[11px] text-slate-500 block">• Interview you regarding services and background</Text>
                              <Text className="text-[11px] text-slate-500 block">• Compose an attractive promotional description</Text>
                              <Text className="text-[11px] text-slate-500 block">• Hand-verify coordinate markers and physical information</Text>
                            </View>
                            <Text className="text-[11px] font-medium text-slate-600 block pt-1">
                              Once approved, your listing becomes instantly discoverable inside the local directory!
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Live listing actions */}
                      {biz.status === 'Approved' && (
                        <View className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-row items-center justify-between">
                          <View className="flex flex-row items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <Text className="text-xs font-bold text-emerald-800">Listing is currently Live</Text>
                          </View>
                          <TouchableOpacity
                            onClick={() => setSelectedBusiness(biz)}
                            className="bg-blue-600 px-3 py-1.5 rounded-lg flex flex-row items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                            <Text className="text-white text-[10px] font-bold">Preview Listing</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                <View className="pt-2 flex flex-row justify-center">
                  <TouchableOpacity
                    onClick={() => setMyBusinesses([])}
                    className="border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl flex flex-row items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <Text className="text-slate-700 text-xs font-bold">Register Another Business</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* REGISTRATION FORM */
              <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-5 shadow-2xs text-left">
                <View className="border-b border-slate-100 pb-3">
                  <Text className="text-sm font-extrabold text-slate-900 block">Business Directory Application</Text>
                  <Text className="text-[11px] text-slate-450 mt-1 block leading-relaxed">
                    Fill out the verification metrics below. The listing fee is a one-time <strong className="text-blue-600 font-bold">R159</strong> covering the visit, verification, photography, and hosting.
                  </Text>
                </View>

                {formStep === 1 ? (
                  <View className="space-y-4">
                    
                    {/* Section 1: Identity */}
                    <View className="space-y-3 pt-1">
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">1. Business Identity</Text>
                      
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Business Name *</Text>
                        <TextInput
                          placeholder="e.g. Cape Town Artisan Bakers"
                          value={formData.businessName}
                          onChangeText={(t) => setFormData(p => ({ ...p, businessName: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                        />
                        {formErrors.businessName && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.businessName}</Text>}
                      </View>

                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Owner Name *</Text>
                        <TextInput
                          placeholder="e.g. John Doe"
                          value={formData.ownerName}
                          onChangeText={(t) => setFormData(p => ({ ...p, ownerName: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                        />
                        {formErrors.ownerName && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.ownerName}</Text>}
                      </View>

                      <View className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <View className="space-y-1.5 text-left">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Category *</Text>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans cursor-pointer"
                          >
                            {formCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </View>

                        <View className="space-y-1.5 text-left">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Preferred Team Visit Time</Text>
                          <select
                            value={formData.preferredContactTime}
                            onChange={(e) => setFormData(p => ({ ...p, preferredContactTime: e.target.value }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-450 focus:bg-white font-sans cursor-pointer"
                          >
                            <option value="Morning (08:00 - 12:00)">Morning (08:00 - 12:00)</option>
                            <option value="Afternoon (12:00 - 17:00)">Afternoon (12:00 - 17:00)</option>
                            <option value="Weekend (Saturday)">Weekend (Saturday)</option>
                          </select>
                        </View>
                      </View>
                    </View>

                    {/* Section 2: Contact Details */}
                    <View className="space-y-3 pt-2">
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">2. Contact Details</Text>
                      
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Email Address *</Text>
                        <TextInput
                          placeholder="owner@mybusiness.co.za"
                          value={formData.emailAddress}
                          onChangeText={(t) => setFormData(p => ({ ...p, emailAddress: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          keyboardType="email-address"
                        />
                        {formErrors.emailAddress && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.emailAddress}</Text>}
                      </View>

                      <View className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <View className="space-y-1.5">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Phone Number *</Text>
                          <TextInput
                            placeholder="e.g. +27 82 123 4567"
                            value={formData.phoneNumber}
                            onChangeText={(t) => setFormData(p => ({ ...p, phoneNumber: t }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                            keyboardType="phone-pad"
                          />
                          {formErrors.phoneNumber && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.phoneNumber}</Text>}
                        </View>

                        <View className="space-y-1.5">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">WhatsApp Number</Text>
                          <TextInput
                            placeholder="e.g. +27 82 123 4567"
                            value={formData.whatsappNumber}
                            onChangeText={(t) => setFormData(p => ({ ...p, whatsappNumber: t }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Section 3: Location */}
                    <View className="space-y-3 pt-2">
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">3. Location & Address</Text>
                      
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Physical Address *</Text>
                        <TextInput
                          placeholder="123 Main Road, Sea Point"
                          value={formData.physicalAddress}
                          onChangeText={(t) => setFormData(p => ({ ...p, physicalAddress: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                        />
                        {formErrors.physicalAddress && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.physicalAddress}</Text>}
                      </View>

                      <View className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <View className="space-y-1.5">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">City / Town *</Text>
                          <TextInput
                            placeholder="Cape Town"
                            value={formData.city}
                            onChangeText={(t) => setFormData(p => ({ ...p, city: t }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          />
                          {formErrors.city && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.city}</Text>}
                        </View>

                        <View className="space-y-1.5">
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Province *</Text>
                          <TextInput
                            placeholder="Western Cape"
                            value={formData.province}
                            onChangeText={(t) => setFormData(p => ({ ...p, province: t }))}
                            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          />
                          {formErrors.province && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.province}</Text>}
                        </View>
                      </View>
                    </View>

                    {/* Section 4: Social */}
                    <View className="space-y-3 pt-2">
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">4. Online Presence (Optional)</Text>
                      <View className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <View className="space-y-1">
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Website URL</Text>
                          <TextInput
                            placeholder="https://..."
                            value={formData.website}
                            onChangeText={(t) => setFormData(p => ({ ...p, website: t }))}
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          />
                        </View>
                        <View className="space-y-1">
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Facebook</Text>
                          <TextInput
                            placeholder="https://..."
                            value={formData.facebook}
                            onChangeText={(t) => setFormData(p => ({ ...p, facebook: t }))}
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          />
                        </View>
                        <View className="space-y-1">
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Instagram</Text>
                          <TextInput
                            placeholder="https://..."
                            value={formData.instagram}
                            onChangeText={(t) => setFormData(p => ({ ...p, instagram: t }))}
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Section 5: Description */}
                    <View className="space-y-3 pt-2">
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">5. Business Description</Text>
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Short Description *</Text>
                        <TextInput
                          multiline
                          numberOfLines={3}
                          placeholder="What services or products do you offer? Tell local partners about your work."
                          value={formData.description}
                          onChangeText={(t) => setFormData(p => ({ ...p, description: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans block"
                        />
                        {formErrors.description && <Text className="text-red-500 text-[10px] pl-1 block">{formErrors.description}</Text>}
                      </View>
                    </View>

                    {/* Submit action */}
                    <TouchableOpacity
                      onClick={handleRegisterSubmit}
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-full flex flex-row items-center justify-center mt-4 cursor-pointer select-none ${
                        isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-750 active:scale-98'
                      }`}
                      id="submit-registration-btn"
                    >
                      <Text className="text-white font-bold text-xs font-sans">
                        {isSubmitting ? 'Registering Draft...' : 'Proceed to Pay R159'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="py-10 items-center justify-center space-y-4 text-center">
                    <View className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <Text className="text-sm font-extrabold text-slate-800 block">Connecting to PayFast Gateway</Text>
                    <Text className="text-xs text-slate-400 max-w-[280px] leading-relaxed block">
                      Please hold on. We are generating your secure local PayFast payment window of R159.00.
                    </Text>
                    <TouchableOpacity
                      onClick={() => { window.location.href = checkoutUrl; }}
                      className="bg-blue-50 border border-blue-250 px-4 py-2 rounded-xl mt-2 cursor-pointer"
                    >
                      <Text className="text-blue-700 text-xs font-bold font-sans">Click here if not redirected automatically</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedBusiness && (
          <View className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white rounded-[32px] max-w-[380px] w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <View className="relative bg-slate-900 text-white p-5 flex flex-col justify-end min-h-[140px]">
                <TouchableOpacity
                  onClick={() => setSelectedBusiness(null)}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full text-white cursor-pointer"
                >
                  <X className="w-4 h-4 text-white" />
                </TouchableOpacity>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                
                <View className="relative z-10 space-y-1 text-left">
                  <View className="bg-blue-600 self-start px-2 py-0.5 rounded-full">
                    <Text className="text-[8px] font-bold text-white uppercase tracking-widest">{selectedBusiness.category}</Text>
                  </View>
                  <Text className="text-lg font-extrabold tracking-tight leading-snug block pt-1 text-white">{selectedBusiness.name}</Text>
                  <View className="flex flex-row items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-300" />
                    <Text className="text-slate-300 text-xs font-medium block">
                      {selectedBusiness.townCity}, {selectedBusiness.province || 'South Africa'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Body */}
              <ScrollView className="flex-1 p-5" contentContainerClassName="space-y-5 pb-6">
                
                <View className="space-y-1.5 text-left">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">About Business</Text>
                  <Text className="text-xs text-slate-600 leading-relaxed block">{selectedBusiness.description}</Text>
                </View>

                <View className="grid grid-cols-2 gap-3.5 bg-slate-50 p-3.5 border border-slate-100 rounded-2xl">
                  <View className="text-left">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Owner / Founder</Text>
                    <Text className="text-xs text-slate-800 font-extrabold mt-0.5 block">{selectedBusiness.ownerName}</Text>
                  </View>
                  <View className="text-left">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Opening Hours</Text>
                    <Text className="text-xs text-slate-800 font-extrabold mt-0.5 block">{selectedBusiness.openingHours || 'Mon - Fri: 08:00 - 17:00'}</Text>
                  </View>
                </View>

                {/* Verification block */}
                <View className="flex flex-row gap-2.5 px-3.5 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl items-start">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <View className="flex-1 text-left">
                    <Text className="text-[10.5px] font-extrabold text-emerald-800 block">Orbit AI Verified Listing</Text>
                    <Text className="text-[9.5px] text-emerald-700 leading-normal block">
                      Identity metrics, location indexes, and trade coordinates have been physically inspected and verified.
                    </Text>
                  </View>
                </View>

                {/* Contacts list */}
                <View className="space-y-3 pt-1 text-left">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contact & Connect</Text>
                  
                  <View className="flex flex-row items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <View className="text-left">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Address</Text>
                      <Text className="text-xs text-slate-700 font-medium block mt-0.5">{selectedBusiness.physicalAddress}</Text>
                    </View>
                  </View>

                  <View className="flex flex-row items-start gap-2.5">
                    <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <View className="text-left">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</Text>
                      <a href={`tel:${selectedBusiness.phoneNumber}`} className="text-xs font-bold text-blue-600 hover:underline block mt-0.5">
                        {selectedBusiness.phoneNumber}
                      </a>
                    </View>
                  </View>

                  {selectedBusiness.email && (
                    <View className="flex flex-row items-start gap-2.5">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <View className="text-left">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</Text>
                        <a href={`mailto:${selectedBusiness.email}`} className="text-xs font-bold text-blue-600 hover:underline block mt-0.5">
                          {selectedBusiness.email}
                        </a>
                      </View>
                    </View>
                  )}

                  {selectedBusiness.whatsappNumber && (
                    <View className="flex flex-row items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <View className="text-left">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Chat</Text>
                        <a 
                          href={`https://wa.me/${selectedBusiness.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Text className="text-xs font-bold text-blue-600">Chat on WhatsApp</Text>
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                        </a>
                      </View>
                    </View>
                  )}
                </View>

                {/* Social media connections */}
                {selectedBusiness.socialMediaLinks && (Object.values(selectedBusiness.socialMediaLinks).some(link => !!link)) && (
                  <View className="space-y-3.5 pt-1 text-left">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Social Media</Text>
                    <View className="flex flex-row flex-wrap gap-2">
                      {selectedBusiness.socialMediaLinks.website && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.website} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex flex-row items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 transition font-bold"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          <span>Website</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      
                      {selectedBusiness.socialMediaLinks.facebook && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.facebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex flex-row items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 transition font-bold"
                        >
                          <Facebook className="w-3.5 h-3.5 text-slate-500" />
                          <span>Facebook</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      {selectedBusiness.socialMediaLinks.instagram && (
                        <a 
                          href={selectedBusiness.socialMediaLinks.instagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex flex-row items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 transition font-bold"
                        >
                          <Instagram className="w-3.5 h-3.5 text-slate-500" />
                          <span>Instagram</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View className="p-4 bg-slate-50 border-t border-slate-100">
                <TouchableOpacity
                  onClick={() => setSelectedBusiness(null)}
                  className="w-full bg-slate-900 py-3 rounded-xl text-center cursor-pointer"
                >
                  <Text className="text-white text-xs font-bold font-sans">Close Profile</Text>
                </TouchableOpacity>
              </View>
            </motion.div>
          </View>
        )}
      </AnimatePresence>

      {/* SUCCESS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <View className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" id="success-confirmation-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-[360px] w-full p-6 shadow-2xl border border-slate-100 text-center space-y-5"
            >
              <View className="mx-auto bg-emerald-100 text-emerald-600 p-3.5 rounded-full w-12 h-12 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </View>
              
              <View className="space-y-3.5 text-center">
                <Text className="text-base font-extrabold text-slate-900 block">Payment Complete</Text>
                
                <View className="bg-slate-50 border border-slate-250/60 rounded-2xl p-4.5 text-left space-y-2.5">
                  <Text className="text-xs text-slate-600 block leading-normal font-medium">Thank you for registering your business with Orbit AI.</Text>
                  <Text className="text-xs text-slate-600 block leading-normal font-medium">Your payment has been received successfully.</Text>
                  <Text className="text-xs text-slate-600 block leading-normal font-medium">Our Business Team will contact you shortly to schedule a visit.</Text>
                  
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pt-1">During our physical visit we will:</Text>
                  <View className="space-y-1 pl-1">
                    <Text className="text-[10.5px] text-slate-500 block">• Meet you</Text>
                    <Text className="text-[10.5px] text-slate-500 block">• Take professional business photos</Text>
                    <Text className="text-[10.5px] text-slate-500 block">• Interview you</Text>
                    <Text className="text-[10.5px] text-slate-500 block">• Write an attractive business description</Text>
                    <Text className="text-[10.5px] text-slate-500 block">• Verify your business information</Text>
                  </View>
                  <Text className="text-[10.5px] font-bold text-blue-600 block pt-1">
                    After approval your business will become visible inside Orbit AI Business Mode.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onClick={() => {
                  setShowSuccessModal(false);
                  loadUserBusinesses();
                }}
                className="w-full bg-blue-600 py-3 rounded-xl text-center shadow cursor-pointer"
                id="close-success-modal-btn"
              >
                <Text className="text-white text-xs font-bold font-sans">Got It</Text>
              </TouchableOpacity>
            </motion.div>
          </View>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV TABS WRAPPER */}
      <BottomNav />

    </SafeAreaView>
  );
}
