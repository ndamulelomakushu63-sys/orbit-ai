import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Search, Building, Plus, Phone, MapPin, Clock, ExternalLink, 
  Check, CheckCircle, Info, Sparkles, Tag, Heart, Globe, MessageSquare, PlusCircle, Trash2, Edit3, X, RefreshCw
} from 'lucide-react';
import { useAppState } from '../services/state';
import { Business, BusinessRegistration, ObdiLead } from '../types';
import { dbUpsertObdiLead, supabase } from '../services/supabase';

export const BusinessModeScreen: React.FC = () => {
  const { 
    setMobileScreen, 
    businesses, 
    setBusinesses,
    businessRegistrations, 
    setBusinessRegistrations,
    categories,
    cardDetails,
    currentUser,
    notifications,
    setNotifications,
    obdiLeads,
    setObdiLeads
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'explore' | 'register'>('explore');
  
  // Explore state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTown, setSelectedTown] = useState<string>('All');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Register state
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: currentUser?.name || '',
    phoneNumber: '',
    whatsAppNumber: '',
    email: currentUser?.email || '',
    category: 'Restaurants',
    townCity: 'Polokwane',
    physicalAddress: '',
    description: '',
    preferredVisitDate: '',
    additionalNotes: ''
  });

  const uniqueTowns = ['All', ...Array.from(new Set(businesses.map(b => b.townCity)))];
  const uniqueCategories = ['All', ...categories.map(c => c.name)];

  const filteredBusinesses = businesses.filter(b => {
    // Only approved/public ones
    if (!b.isPublic) return false;

    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.townCity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    const matchesTown = selectedTown === 'All' || b.townCity === selectedTown;

    return matchesSearch && matchesCategory && matchesTown;
  });

  const handleInputChange = (field: string, val: string) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.ownerName.trim() || !formData.phoneNumber.trim() || !formData.physicalAddress.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields to register your business.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Get authenticated Supabase user ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUser?.uid || null;

      const businessId = 'biz-' + Date.now();

      // Real Supabase insert only
      const insertData = {
        id: businessId,
        user_id: userId,
        business_name: formData.businessName,
        category: formData.category,
        description: formData.description,
        location: formData.physicalAddress,
        contact_phone: formData.phoneNumber,
        status: "pending_review"
      };

      const { error } = await supabase
        .from('businesses')
        .insert(insertData);

      if (error) {
        throw error;
      }

      // Sync local AppState to reflect the pending submission
      const newBiz: Business = {
        id: businessId,
        name: formData.businessName,
        ownerName: formData.ownerName,
        description: formData.description,
        category: formData.category,
        townCity: formData.townCity,
        physicalAddress: formData.physicalAddress,
        phoneNumber: formData.phoneNumber,
        whatsAppNumber: formData.whatsAppNumber || formData.phoneNumber,
        email: formData.email,
        openingHours: 'Mon - Fri: 08:00 - 17:00',
        socialMediaLinks: {},
        photos: ['https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60'],
        specials: [],
        isPublic: false, // Wait for review
        isPaid: false,
        createdAt: new Date().toISOString()
      };

      setBusinesses(prev => [newBiz, ...prev]);

      // Add dynamic administrative alert
      const adminNotif = {
        id: 'notif-biz-' + Date.now(),
        title: "New Business Submitted",
        message: `${formData.businessName} has been submitted and is pending review.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'system' as const
      };
      setNotifications(prev => [adminNotif, ...prev]);

      setRegisterSuccess(true);
      
      // Reset form
      setFormData({
        businessName: '',
        ownerName: currentUser?.name || '',
        phoneNumber: '',
        whatsAppNumber: '',
        email: currentUser?.email || '',
        category: 'Restaurants',
        townCity: 'Polokwane',
        physicalAddress: '',
        description: '',
        preferredVisitDate: '',
        additionalNotes: ''
      });
    } catch (err: any) {
      console.error("Error inserting business to Supabase: ", err);
      setErrorMessage(err.message || "Failed to submit business registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayAndConfirm = () => {
    // Unused since we perform a direct insert upon form submission, but kept to prevent compile-time errors
  };

  return (
    <SafeAreaView id="business_mode_screen" className="bg-slate-50 flex flex-col h-full justify-between">
      {/* HEADER BAR */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => {
              if (selectedBusiness) {
                setSelectedBusiness(null);
              } else {
                setMobileScreen('chat');
              }
            }}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">
            {selectedBusiness ? 'Business Profile' : 'Business Mode'}
          </Text>
        </View>
      </View>

      {!selectedBusiness && (
        <View className="bg-white border-b border-slate-100 flex flex-row justify-around py-2">
          <TouchableOpacity 
            onClick={() => { setActiveTab('explore'); setRegisterSuccess(false); }}
            className={`flex-1 text-center py-2 border-b-2 font-bold text-xs transition-all duration-150 ${activeTab === 'explore' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Explore Businesses
          </TouchableOpacity>
          <TouchableOpacity 
            onClick={() => setActiveTab('register')}
            className={`flex-1 text-center py-2 border-b-2 font-bold text-xs transition-all duration-150 ${activeTab === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Register My Business
          </TouchableOpacity>
        </View>
      )}

      {selectedBusiness ? (
        <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="pb-6">
          <div className="w-full h-48 bg-slate-200 relative overflow-hidden">
            {selectedBusiness.photos && selectedBusiness.photos.length > 0 ? (
              <img 
                src={selectedBusiness.photos[0]} 
                alt={selectedBusiness.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50">
                <Building className="w-12 h-12 text-blue-200" />
              </div>
            )}
            <div className="absolute top-3 right-3 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shadow-3xs">
              {selectedBusiness.category}
            </div>
          </div>

          <View className="p-5 space-y-5 bg-white border-b border-slate-150 shadow-3xs">
            <View className="space-y-1">
              <Text className="text-xl font-black text-slate-900 leading-tight">{selectedBusiness.name}</Text>
              <Text className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>{selectedBusiness.physicalAddress}</span>
              </Text>
            </View>

            <View className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
              <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Description</Text>
              <Text className="text-xs text-slate-700 leading-relaxed font-sans">{selectedBusiness.description}</Text>
            </View>

            {/* Specials */}
            {selectedBusiness.specials && selectedBusiness.specials.length > 0 && (
              <View className="bg-amber-50/70 p-4 border border-amber-200 rounded-2xl space-y-2">
                <Text className="text-[10px] text-amber-700 font-black tracking-widest uppercase flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Current Specials</span>
                </Text>
                <ul className="list-disc pl-4 space-y-1.5">
                  {selectedBusiness.specials.map((s, idx) => (
                    <li key={idx} className="text-xs text-amber-900 font-bold leading-relaxed">{s}</li>
                  ))}
                </ul>
              </View>
            )}

            <View className="grid grid-cols-2 gap-4">
              <View className="space-y-1">
                <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Opening Hours</Text>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{selectedBusiness.openingHours}</span>
                </div>
              </View>

              <View className="space-y-1">
                <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Town / City</Text>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Building className="w-4 h-4 text-blue-500" />
                  <span>{selectedBusiness.townCity}</span>
                </div>
              </View>
            </View>

            {/* Quick action Call and WhatsApp */}
            <View className="flex flex-row gap-3 pt-2">
              <a 
                href={`tel:${selectedBusiness.phoneNumber}`}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Phone className="w-4 h-4" />
                <span>Call Business</span>
              </a>

              <a 
                href={`https://wa.me/${selectedBusiness.whatsAppNumber.replace(/\+/g, '').replace(/\s/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-center font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Chat</span>
              </a>
            </View>
          </View>
        </ScrollView>
      ) : activeTab === 'explore' ? (
        <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-16">
          {/* SEARCH & FILTERS */}
          <View className="space-y-3">
            <View className="px-4 py-3 border border-slate-200 bg-white rounded-2xl flex flex-row items-center gap-2.5 shadow-3xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search registered businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-800 outline-none w-full border-none p-0"
              />
            </View>

            {/* Category selection horizontal list */}
            <View className="space-y-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">Browse by Category</Text>
              <div className="flex flex-row gap-1.5 overflow-x-auto pb-1.5 no-scrollbar select-none">
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-3xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </View>

            {/* Town Selection */}
            <View className="space-y-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">Town / City</Text>
              <div className="flex flex-row gap-1.5 overflow-x-auto pb-1.5 no-scrollbar select-none">
                {uniqueTowns.map(town => (
                  <button
                    key={town}
                    onClick={() => setSelectedTown(town)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${selectedTown === town ? 'bg-slate-800 text-white shadow-3xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {town}
                  </button>
                ))}
              </div>
            </View>
          </View>

          {/* BUSINESSES LIST */}
          <View className="space-y-3">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Results ({filteredBusinesses.length})
            </Text>

            {filteredBusinesses.length === 0 ? (
              <View className="p-8 bg-white border border-slate-200/50 rounded-3xl items-center text-center select-none">
                <Building className="w-8 h-8 text-slate-300 mb-2" />
                <Text className="text-xs font-bold text-slate-400 font-sans">No matching businesses found</Text>
                <Text className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Be the first to register in this category or town! Tap "Register My Business" to launch yours.
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {filteredBusinesses.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    onClick={() => setSelectedBusiness(b)}
                    className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-3xl flex flex-row gap-4 items-center shadow-3xs transition cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 overflow-hidden shrink-0 relative">
                      {b.photos && b.photos.length > 0 ? (
                        <img src={b.photos[0]} alt={b.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Building className="w-6 h-6 text-blue-500 m-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-start gap-1">
                        <Text className="text-sm font-black text-slate-850 truncate leading-snug">{b.name}</Text>
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase shrink-0">
                          {b.category}
                        </span>
                      </div>
                      <Text className="text-[11px] text-slate-450 mt-1 flex items-center gap-1 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{b.townCity} - {b.physicalAddress}</span>
                      </Text>
                      {b.specials && b.specials.length > 0 && (
                        <Text className="text-[9.5px] text-amber-600 font-black flex items-center gap-1.5 mt-1">
                          <Tag className="w-3 h-3 shrink-0" />
                          <span className="truncate font-sans">{b.specials[0]}</span>
                        </Text>
                      )}
                    </div>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-16">
          {registerSuccess ? (
            <View className="bg-white border border-slate-200 p-6 rounded-3xl space-y-5 shadow-xs text-left">
              <View className="w-12 h-12 rounded-full bg-green-50 border border-green-150 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </View>
              <div className="space-y-2">
                <Text className="text-base font-black text-slate-900 leading-tight">Your business has been submitted. Our team will contact you.</Text>
              </div>

              <TouchableOpacity 
                onClick={() => { setRegisterSuccess(false); setActiveTab('explore'); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-2xs transition select-none flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Browse Directory</span>
              </TouchableOpacity>
            </View>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <View className="bg-blue-600 p-5 rounded-3xl text-white space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  <Text className="text-sm font-black text-white uppercase tracking-wider">Premium Feature</Text>
                </div>
                <Text className="text-base font-bold text-white leading-snug">Register and promote your business inside Orbit AI directory!</Text>
                <Text className="text-xs text-white/90 leading-relaxed font-sans">
                  Get premium visibility. Orbit AI will recommend your business directly to hundreds of local users asking for suggestions in your town.
                </Text>
                <div className="pt-2 flex justify-between items-center border-t border-white/20">
                  <Text className="text-xs text-white/80 font-bold font-sans">Full Directory Package:</Text>
                  <span className="text-sm font-black bg-white text-blue-700 px-3 py-1 rounded-full border border-white">
                    R159 Once-off
                  </span>
                </div>
              </View>

              <View className="bg-white p-5 border border-slate-200 rounded-3xl space-y-3 shadow-3xs text-left">
                <Text className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">Business Details</Text>

                <View className="space-y-1">
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Business Name *</Text>
                  <TextInput 
                    placeholder="e.g. Polokwane Car Wash"
                    value={formData.businessName}
                    onChange={(e: any) => handleInputChange('businessName', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                    required
                  />
                </View>

                <View className="grid grid-cols-2 gap-3">
                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Owner Name *</Text>
                    <TextInput 
                      placeholder="Your Name"
                      value={formData.ownerName}
                      onChange={(e: any) => handleInputChange('ownerName', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                      required
                    />
                  </View>

                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Category *</Text>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans h-[42px]"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </View>
                </View>

                <View className="grid grid-cols-2 gap-3">
                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Town / City *</Text>
                    <TextInput 
                      placeholder="e.g. Polokwane"
                      value={formData.townCity}
                      onChange={(e: any) => handleInputChange('townCity', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                      required
                    />
                  </View>

                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Preferred Visit Date *</Text>
                    <TextInput 
                      type="date"
                      value={formData.preferredVisitDate}
                      onChange={(e: any) => handleInputChange('preferredVisitDate', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                      required
                    />
                  </View>
                </View>

                <View className="space-y-1">
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Physical Address *</Text>
                  <TextInput 
                    placeholder="e.g. 15 Landros Mare Street, Polokwane"
                    value={formData.physicalAddress}
                    onChange={(e: any) => handleInputChange('physicalAddress', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                    required
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Phone Number *</Text>
                  <TextInput 
                    placeholder="e.g. 015 291 1234"
                    value={formData.phoneNumber}
                    onChange={(e: any) => handleInputChange('phoneNumber', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                    required
                  />
                </View>

                <View className="grid grid-cols-2 gap-3">
                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">WhatsApp Number</Text>
                    <TextInput 
                      placeholder="WhatsApp Chat"
                      value={formData.whatsAppNumber}
                      onChange={(e: any) => handleInputChange('whatsAppNumber', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                    />
                  </View>

                  <View className="space-y-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Email Address</Text>
                    <TextInput 
                      placeholder="e.g. mail@domain.com"
                      value={formData.email}
                      onChange={(e: any) => handleInputChange('email', e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                    />
                  </View>
                </View>

                <View className="space-y-1">
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Brief Description *</Text>
                  <textarea 
                    placeholder="Describe your services, products, or offers..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans h-20"
                    required
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Additional Notes</Text>
                  <TextInput 
                    placeholder="E.g. specific access details or request"
                    value={formData.additionalNotes}
                    onChange={(e: any) => handleInputChange('additionalNotes', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
                  />
                </View>

                {errorMessage && (
                  <Text className="text-red-500 text-xs font-semibold font-sans mt-2 block">{errorMessage}</Text>
                )}

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-2xs transition select-none flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Submit Business</span>
                    </>
                  )}
                </button>
              </View>
            </form>
          )}
        </ScrollView>
      )}

      {/* SECURE DIRECTORY PAYMENT GATEWAY MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl relative text-left">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-left">
              <Text className="text-base font-black text-slate-900 leading-tight">Secure Payment Vault</Text>
              <Text className="text-[11px] text-slate-400 font-sans">Complete once-off directory registration payment.</Text>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
              <Text className="text-xs text-blue-800 font-bold font-sans">Registration Total:</Text>
              <span className="text-sm font-black text-blue-900 font-sans">R159.00</span>
            </div>

            <div className="space-y-3">
              <View className="space-y-1">
                <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Saved Bank Card Details</Text>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <Text className="font-bold text-slate-800 block truncate">{cardDetails.cardholderName}</Text>
                  <Text className="text-slate-500 font-mono block truncate">{cardDetails.cardNumber}</Text>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1 font-mono">
                    <span>Expiry: {cardDetails.expiry}</span>
                    <span>CVV: ***</span>
                  </div>
                </div>
              </View>

              <button 
                onClick={handlePayAndConfirm}
                disabled={paymentProcessing}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-3xs transition flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                {paymentProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white">Authorizing Payment...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span className="text-white">Confirm Payment of R159</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </SafeAreaView>
  );
};
