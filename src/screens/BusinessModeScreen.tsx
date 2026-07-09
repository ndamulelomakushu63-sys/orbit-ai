import React, { useState, useEffect } from 'react';
import { useAppState } from '../services/state';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle, 
  X, 
  Building,
  Info,
  Check,
  Navigation,
  Tag,
  Share2,
  Globe
} from 'lucide-react';
import { 
  dbFetchApprovedBusinesses, 
  dbRegisterBusinessDraft,
  dbRegisterBusiness,
  dbUpsertObdiLead
} from '../services/supabase';
import { Business, ObdiLead } from '../types';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';

// High-quality South African small business listings as fallback default directory data
const MOCK_BUSINESSES: Business[] = [];

const CATEGORY_GALLERIES: Record<string, string[]> = {
  'Services': [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'
  ],
  'Retail': [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80'
  ],
  'Food & Beverage': [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80'
  ],
  'Technology': [
    'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1597872200969-2b65dffc0e35?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=600&q=80'
  ],
  'Automotive': [
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'
  ],
  'Health & Beauty': [
    'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=600&q=80'
  ],
  'Education': [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80'
  ],
  'Entertainment': [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1486591978090-58e619d37fe7?auto=format&fit=crop&w=600&q=80'
  ],
  'Construction & Trades': [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1541535650810-10d26f5c2ab3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80'
  ],
  'Other': [
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80'
  ]
};

export default function BusinessModeScreen() {
  const { currentUser, setMobileScreen, businessPaymentStatus, setBusinessPaymentStatus } = useAppState();

  // Screen layout state: 'directory' | 'profile' | 'register'
  const [currentView, setCurrentView] = useState<'directory' | 'profile' | 'register'>('directory');

  // Directory variables
  const [approvedBusinesses, setApprovedBusinesses] = useState<Business[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Sorting and Pagination variables
  const [sortBy, setSortBy] = useState<'nearest' | 'rating' | 'popular' | 'newest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // GPS Coordinates variables
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);

  // Form registration state
  const [formStep, setFormStep] = useState<1 | 2>(1); // 1 = Form fields, 2 = PayFast Checkout redirect / simulation
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    phoneNumber: '',
    whatsappNumber: '',
    emailAddress: '',
    physicalAddress: '',
    province: '',
    villageSuburb: '',
    city: '',
    category: 'Services',
    description: '',
    startingPrice: '',
    openingHours: '',
    specials: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pendingRegId, setPendingRegId] = useState('');
  const [successState, setSuccessState] = useState(false);

  // Gallery slider state for profile modal
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);

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

  const LOCATIONS = [
    'All',
    'Tshikota',
    'Louis Trichardt',
    'Thohoyandou',
    'Giyani',
    'Musina',
    'Polokwane',
    'Pretoria',
    'Johannesburg',
    'Cape Town',
    'Durban'
  ];

  useEffect(() => {
    loadLiveBusinesses();
  }, []);

  useEffect(() => {
    if (businessPaymentStatus === "success") {
      setCurrentView('register');
      setSuccessState(true);
      setBusinessPaymentStatus(null);
    } else if (businessPaymentStatus === "cancelled") {
      setCurrentView('register');
      setFormStep(1);
      setSuccessState(false);
      setBusinessPaymentStatus(null);
      alert("Your business registration listing fee payment was cancelled. Your application draft remains saved in an unpaid state, so you can review and try again!");
    }
  }, [businessPaymentStatus]);

  const loadLiveBusinesses = async () => {
    setLoadingDirectory(true);
    try {
      const liveData = await dbFetchApprovedBusinesses();
      if (liveData && liveData.length > 0) {
        setApprovedBusinesses(liveData);
      } else {
        setApprovedBusinesses([]);
      }
    } catch (err) {
      console.error("Error loading approved businesses:", err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Helper function to calculate GPS distance in km (Haversine Formula)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleNearMe = () => {
    if (isNearMeActive) {
      disableNearMe();
      return;
    }

    setLoadingGPS(true);
    if (!navigator.geolocation) {
      // Fallback to default Louis Trichardt coordinate if not supported
      setUserCoords({
        lat: -23.0471,
        lng: 29.9032
      });
      setIsNearMeActive(true);
      setSortBy('nearest');
      setLoadingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsNearMeActive(true);
        setSortBy('nearest'); // Automatically switch sorting to nearest
        setLoadingGPS(false);
      },
      (error) => {
        console.warn("GPS retrieval error (using Louis Trichardt fallback):", error);
        // Graceful fallback to Louis Trichardt center so distance sorting works perfectly in sandboxed iframe previews
        setUserCoords({
          lat: -23.0471,
          lng: 29.9032
        });
        setIsNearMeActive(true);
        setSortBy('nearest');
        setLoadingGPS(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const disableNearMe = () => {
    setIsNearMeActive(false);
    setUserCoords(null);
    if (sortBy === 'nearest') {
      setSortBy('newest');
    }
  };

  const handleShareBusiness = () => {
    if (!selectedBusiness) return;
    const shareText = `Check out "${selectedBusiness.name}" on Orbit AI!\nCategory: ${selectedBusiness.category}\nAddress: ${selectedBusiness.physicalAddress}, ${selectedBusiness.townCity}\nPhone: ${selectedBusiness.phoneNumber || 'N/A'}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText)
        .then(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 3000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    } else {
      // Fallback for older browsers or sandboxed iframes where clipboard API is not available
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 3000);
      } catch (err) {
        console.error("Fallback copy failed: ", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Reset page number on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedLocation, sortBy]);

  // Merge loaded approved listings with our beautiful fallback mock listings
  const allBusinesses = [...approvedBusinesses];
  for (const mockBiz of MOCK_BUSINESSES) {
    if (!allBusinesses.some(b => b.id === mockBiz.id || b.name.toLowerCase() === mockBiz.name.toLowerCase())) {
      allBusinesses.push(mockBiz);
    }
  }

  // Filter listings based on multi-field search query, category, and location
  const filteredBusinesses = allBusinesses.filter(biz => {
    // 1. Expanded search matches: Name, Category, Description, Owner name, townCity (City/Town/Village/Suburb), Province, Village/Suburb, Full Address, Specials
    let matchesSearch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const inName = biz.name.toLowerCase().includes(q);
      const inCategory = biz.category.toLowerCase().includes(q);
      const inDesc = biz.description.toLowerCase().includes(q);
      const inTown = biz.townCity.toLowerCase().includes(q);
      const inOwner = biz.ownerName.toLowerCase().includes(q);
      const inAddress = biz.physicalAddress.toLowerCase().includes(q);
      const inProvince = biz.province ? biz.province.toLowerCase().includes(q) : false;
      const inVillage = biz.villageSuburb ? biz.villageSuburb.toLowerCase().includes(q) : false;
      const inSpecials = biz.specials ? biz.specials.some(spec => spec.toLowerCase().includes(q)) : false;

      // Extract keywords (longer than 2 characters) for flexible query match
      const keywords = q.split(/\s+/).filter(k => k.length > 2);
      const keywordMatch = keywords.length > 0 && keywords.some(kw => 
        biz.name.toLowerCase().includes(kw) ||
        biz.category.toLowerCase().includes(kw) ||
        biz.description.toLowerCase().includes(kw) ||
        biz.townCity.toLowerCase().includes(kw) ||
        (biz.province && biz.province.toLowerCase().includes(kw)) ||
        (biz.villageSuburb && biz.villageSuburb.toLowerCase().includes(kw)) ||
        (biz.specials && biz.specials.some(s => s.toLowerCase().includes(kw)))
      );

      matchesSearch = inName || inCategory || inDesc || inTown || inOwner || inAddress || inProvince || inVillage || inSpecials || keywordMatch;
    }

    // 2. Category Pill Filter
    const matchesCategory = selectedCategory === 'All' || biz.category === selectedCategory;

    // 3. Location Pill Filter
    const matchesLocation = selectedLocation === 'All' || 
      biz.townCity.toLowerCase().includes(selectedLocation.toLowerCase()) ||
      (biz.province && biz.province.toLowerCase().includes(selectedLocation.toLowerCase()));

    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Sort listings based on the user's preference
  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    const ratingA = a.rating || (((a.id.charCodeAt(0) || 7) % 5) * 0.1 + 4.5);
    const ratingB = b.rating || (((b.id.charCodeAt(0) || 7) % 5) * 0.1 + 4.5);

    const popA = a.popularity || ((a.id.charCodeAt(0) || 10) * 2);
    const popB = b.popularity || ((b.id.charCodeAt(0) || 10) * 2);

    if (sortBy === 'nearest') {
      if (userCoords) {
        const latA = a.latitude !== undefined ? a.latitude : -26.2041;
        const lngA = a.longitude !== undefined ? a.longitude : 28.0473;
        const latB = b.latitude !== undefined ? b.latitude : -26.2041;
        const lngB = b.longitude !== undefined ? b.longitude : 28.0473;
        
        const distA = getDistance(userCoords.lat, userCoords.lng, latA, lngA);
        const distB = getDistance(userCoords.lat, userCoords.lng, latB, lngB);
        return distA - distB;
      }
      return b.id.localeCompare(a.id);
    }

    if (sortBy === 'rating') {
      return ratingB - ratingA;
    }

    if (sortBy === 'popular') {
      return popB - popA;
    }

    // Newest default
    return b.id.localeCompare(a.id);
  });

  // Paginated Results Engine
  const totalItems = sortedBusinesses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedBusinesses = sortedBusinesses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Split paginated items for page 1 visual separation, or default list on page 2+
  const pageFeatured = currentPage === 1 ? paginatedBusinesses.slice(0, 2) : [];
  const pageLatest = currentPage === 1 ? paginatedBusinesses.slice(2) : paginatedBusinesses;

  const getDistanceString = (biz: Business): string | null => {
    if (!userCoords) return null;
    const lat = biz.latitude !== undefined ? biz.latitude : -26.2041;
    const lng = biz.longitude !== undefined ? biz.longitude : 28.0473;
    const dist = getDistance(userCoords.lat, userCoords.lng, lat, lng);
    return dist < 1 ? `${(dist * 1000).toFixed(0)}m away` : `${dist.toFixed(1)}km away`;
  };

  const getFullLocationString = (biz: Business): string => {
    const parts = [];
    if (biz.villageSuburb) parts.push(biz.villageSuburb);
    if (biz.townCity) parts.push(biz.townCity);
    if (biz.province) parts.push(biz.province);
    return parts.join(", ") || "South Africa";
  };

  // Helper for slider
  const getBusinessPhotos = (biz: Business) => {
    if (biz.photos && biz.photos.length > 0) {
      return biz.photos;
    }
    return CATEGORY_GALLERIES[biz.category] || CATEGORY_GALLERIES['Services'];
  };

  const getCategoryFallbackImage = (category: string) => {
    const gallery = CATEGORY_GALLERIES[category] || CATEGORY_GALLERIES['Services'];
    return gallery[0];
  };

  // Form submission logic
  const handleFormSubmit = async () => {
    if (!currentUser) {
      alert("Please sign in to list your business.");
      return;
    }

    // Validate exactly the 10 requested fields
    const errors: Record<string, string> = {};
    if (!formData.businessName.trim()) errors.businessName = "Business Name is required";
    if (!formData.ownerName.trim()) errors.ownerName = "Owner Name is required";
    
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone Number is required";
    }
    if (!formData.whatsappNumber.trim()) {
      errors.whatsappNumber = "WhatsApp Number is required";
    }
    
    if (!formData.emailAddress.trim()) {
      errors.emailAddress = "Email Address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress.trim())) {
      errors.emailAddress = "Invalid email format";
    }
    
    if (!formData.physicalAddress.trim()) errors.physicalAddress = "Physical Address is required";
    if (!formData.province.trim()) errors.province = "Province is required";
    if (!formData.villageSuburb.trim()) errors.villageSuburb = "Village / Suburb is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.category) errors.category = "Category is required";
    if (!formData.description.trim()) errors.description = "Short Description is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // scroll to top of error list
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const businessId = 'biz-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
      const uid = currentUser.uid || currentUser.id;

      // Prepare payload draft
      const draftRegistration = {
        id: businessId,
        business_name: formData.businessName.trim(),
        owner_name: formData.ownerName.trim(),
        phone_number: formData.phoneNumber.trim(),
        whatsapp_number: formData.whatsappNumber.trim(),
        email: formData.emailAddress.trim(),
        category: formData.category,
        town_city: formData.city.trim(),
        physical_address: formData.physicalAddress.trim(),
        village_suburb: formData.villageSuburb.trim(),
        description: formData.description.trim(),
        preferred_visit_date: "Anytime",
        additional_notes: JSON.stringify({
          province: formData.province.trim(),
          villageSuburb: formData.villageSuburb.trim(),
          userId: uid,
          startingPrice: formData.startingPrice.trim() || undefined,
          openingHours: formData.openingHours.trim() || undefined,
          specials: formData.specials.trim() || undefined,
          latitude: userCoords?.lat || -23.0471,
          longitude: userCoords?.lng || 29.9032
        }),
        is_paid: false,
        status: 'pending'
      };

      // Save draft into business_registrations table
      const saved = await dbRegisterBusinessDraft(draftRegistration);
      if (!saved) {
        throw new Error("Failed to save business draft in Supabase database.");
      }

      setPendingRegId(businessId);
      setFormStep(2); // Go to payfast checkout page

      // Fetch checkout session from backend
      const res = await fetch("/api/payfast/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          plan: "business-registration",
          email: formData.emailAddress.trim(),
          name: formData.ownerName.trim(),
          businessId: businessId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
          // Auto-redirect to the secure PayFast payment gateway
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (err: any) {
      alert("Registration Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getCleanNumberForWa = (num: string) => {
    // Sanitizes number to keep only digits
    const cleaned = num.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      return "27" + cleaned.substring(1);
    }
    return cleaned;
  };

  const resetFormState = () => {
    setFormData({
      businessName: '',
      ownerName: '',
      phoneNumber: '',
      whatsappNumber: '',
      emailAddress: '',
      physicalAddress: '',
      province: '',
      villageSuburb: '',
      city: '',
      category: 'Services',
      description: '',
      startingPrice: '',
      openingHours: '',
      specials: ''
    });
    setFormStep(1);
    setPendingRegId('');
    setCheckoutUrl('');
    setFormErrors({});
    setSuccessState(false);
    setCurrentView('directory');
  };

  return (
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between" id="business-mode-container">
      
      {/* HEADER ACTION BAR */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none shrink-0 shadow-3xs">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => {
              if (currentView !== 'directory') {
                setCurrentView('directory');
              } else {
                setMobileScreen('chat');
              }
            }}
            className="p-1.5 hover:bg-slate-100 active:scale-95 rounded-full text-slate-700 cursor-pointer transition"
            id="back-arrow-btn"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </TouchableOpacity>
          <View className="text-left">
            <Text className="text-base font-extrabold text-slate-900 tracking-tight block">Business Mode</Text>
            <Text className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Orbit AI Directory</Text>
          </View>
        </View>

        {currentView === 'directory' && (
          <TouchableOpacity
            onClick={() => {
              setFormStep(1);
              setSuccessState(false);
              setCurrentView('register');
            }}
            className="bg-blue-600 hover:bg-blue-700 active:scale-97 text-white px-4 py-2 rounded-full flex flex-row items-center gap-1.5 shadow-2xs cursor-pointer transition"
            id="list-my-business-header-btn"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <Text className="text-white text-xs font-bold font-sans">List My Business</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CORE SCREENS SCROLL AREA */}
      <ScrollView 
        className="flex-1"
        contentContainerClassName="p-4 space-y-6"
        showsVerticalScrollIndicator={false}
      >
        
        {/* VIEW 1: DIRECTORY HOMEPAGE */}
        {currentView === 'directory' && (
          <View className="space-y-6">
            
            {/* Search Input Bar & Advanced Filters */}
            <View className="space-y-4 text-left">
              <View className="flex flex-col sm:flex-row gap-2.5">
                <View className="relative flex-1 flex flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-2xs">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
                  <TextInput
                    placeholder="Search by name, category, service, location..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-xs bg-transparent outline-none font-sans text-slate-800 placeholder-slate-400"
                    id="directory-search-input-field"
                  />
                </View>

                {/* Near Me GPS Button */}
                <TouchableOpacity
                  onClick={handleNearMe}
                  disabled={loadingGPS}
                  className={`px-5 py-2.5 rounded-xl border flex flex-row items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-2xs ${
                    isNearMeActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  id="directory-near-me-btn"
                >
                  <Navigation className={`w-4 h-4 ${isNearMeActive ? 'text-white animate-pulse' : 'text-slate-450'}`} />
                  <Text className={`text-xs font-semibold font-sans ${isNearMeActive ? 'text-white' : 'text-slate-700'}`}>
                    {loadingGPS ? 'Locating...' : isNearMeActive ? 'Near Me Active' : 'Near Me'}
                  </Text>
                  {isNearMeActive && (
                    <Text className="text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md ml-1 font-mono">
                      GPS ON
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Filter by Location (supports townCity, Suburb, Village, Province) */}
              <View className="space-y-2">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 block">Filter by Location</Text>
                <View className="flex flex-row overflow-x-auto pb-1 gap-2 scrollbar-none">
                  {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={`px-4 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150 cursor-pointer ${
                        selectedLocation === loc
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Text className={`text-xs font-medium font-sans ${selectedLocation === loc ? 'text-white' : 'text-slate-600'}`}>
                        {loc === 'All' ? 'All Locations' : loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter Pills */}
              <View className="space-y-2">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 block">Filter by Category</Text>
                <View className="flex flex-row overflow-x-auto pb-1 gap-2 scrollbar-none">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Text className={`text-xs font-medium font-sans ${selectedCategory === cat ? 'text-white' : 'text-slate-600'}`}>
                        {cat === 'All' ? 'Browse All' : cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Sorting & Stats bar */}
            <View className="flex flex-row items-center justify-between px-1 select-none">
              <Text className="text-[11px] font-bold text-slate-500 font-sans block">
                {totalItems} {totalItems === 1 ? 'listing' : 'listings'} found
              </Text>
              
              <View className="flex flex-row items-center gap-1.5">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sort by:</Text>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-2.5 rounded-xl outline-none focus:border-blue-400 cursor-pointer"
                  id="directory-sort-select"
                >
                  <option value="newest">Newest Listings</option>
                  <option value="rating">Highest Rated</option>
                  <option value="popular">Most Popular</option>
                  <option value="nearest">Nearest First</option>
                </select>
              </View>
            </View>

            {/* DIRECTORY EMPTY STATE */}
            {totalItems === 0 ? (
              <View className="bg-white rounded-[32px] border border-slate-200/55 p-12 items-center justify-center space-y-4 shadow-3xs text-center">
                <View className="bg-slate-50 p-4 rounded-full border border-slate-100">
                  <Building className="w-8 h-8 text-slate-400" />
                </View>
                <Text className="text-sm font-extrabold text-slate-800 block">No listings match filters</Text>
                <Text className="text-xs text-slate-400 max-w-[280px] leading-relaxed block">
                  There are currently no published listings matching this search. Try selecting another location or category.
                </Text>
              </View>
            ) : (
              <View className="space-y-6">
                
                {/* FEATURED BUSINESSES */}
                {pageFeatured.length > 0 && (
                  <View className="space-y-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block text-left font-mono">
                      ✦ Featured Businesses
                    </Text>
                    <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pageFeatured.map((biz) => {
                        const scoreRating = biz.rating || (((biz.id.charCodeAt(0) || 7) % 5) * 0.1 + 4.5);
                        const distanceStr = getDistanceString(biz);
                        return (
                          <TouchableOpacity
                            key={biz.id}
                            onClick={() => {
                              setSelectedBusiness(biz);
                              setActivePhotoIdx(0);
                              setCurrentView('profile');
                            }}
                            className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-350 hover:-translate-y-0.5 text-left cursor-pointer group flex flex-col"
                          >
                            <div className="h-44 w-full bg-slate-100 overflow-hidden relative shrink-0">
                              <img 
                                src={biz.photos?.[0] || getCategoryFallbackImage(biz.category)} 
                                alt={biz.name} 
                                className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-3 right-3 bg-blue-600 text-white px-2.5 py-1 rounded-lg shadow-sm">
                                <span className="text-[9px] font-bold uppercase tracking-wider">{biz.category}</span>
                              </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <Text className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition truncate block">{biz.name}</Text>
                                <Text className="text-xs text-slate-500 line-clamp-2 leading-relaxed block">{biz.description}</Text>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[120px] sm:max-w-none">{getFullLocationString(biz)}</span>
                                  </div>
                                  {distanceStr && (
                                    <span className="text-[9.5px] font-bold text-blue-600 font-mono mt-0.5 ml-4.5 block">{distanceStr}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 text-blue-600 font-semibold text-xs group-hover:translate-x-0.5 transition-all">
                                  <span>View Profile</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                              </div>
                            </div>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* LATEST BUSINESSES */}
                {pageLatest.length > 0 && (
                  <View className="space-y-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block text-left font-mono">
                      ✦ Latest Businesses
                    </Text>
                    <View className="space-y-3">
                      {pageLatest.map((biz) => {
                        const scoreRating = biz.rating || (((biz.id.charCodeAt(0) || 12) % 4) * 0.1 + 4.5);
                        const distanceStr = getDistanceString(biz);
                        return (
                          <TouchableOpacity
                            key={biz.id}
                            onClick={() => {
                              setSelectedBusiness(biz);
                              setActivePhotoIdx(0);
                              setCurrentView('profile');
                            }}
                            className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col sm:flex-row gap-4 items-stretch text-left group"
                          >
                            <div className="w-full sm:w-32 h-24 bg-slate-50 rounded-lg overflow-hidden relative shrink-0">
                              <img 
                                src={biz.photos?.[0] || getCategoryFallbackImage(biz.category)} 
                                alt={biz.name} 
                                className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-0.5 text-left min-w-0">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 uppercase tracking-wider">{biz.category}</span>
                                </div>
                                <Text className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition block truncate">{biz.name}</Text>
                                <Text className="text-[11px] text-slate-400 font-sans block truncate">Owner: {biz.ownerName}</Text>
                                <Text className="text-xs text-slate-500 line-clamp-1 leading-relaxed block font-sans">{biz.description}</Text>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[130px] sm:max-w-none">{getFullLocationString(biz)}</span>
                                  </div>
                                  {distanceStr && (
                                    <span className="text-[9.5px] font-bold text-blue-600 font-mono mt-0.5 ml-4.5 block">{distanceStr}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 text-blue-600 font-semibold text-xs group-hover:translate-x-0.5 transition-all">
                                  <span>View Profile</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <View className="flex flex-row items-center justify-between bg-white border border-slate-150 p-3 rounded-2xl shadow-3xs select-none">
                    <TouchableOpacity
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={`px-3 py-1.5 rounded-xl border transition flex flex-row items-center gap-1 ${
                        currentPage === 1
                          ? 'bg-slate-50 border-slate-150 text-slate-300 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <Text className={`text-[10px] font-extrabold ${currentPage === 1 ? 'text-slate-300' : 'text-slate-600'}`}>Previous</Text>
                    </TouchableOpacity>

                    <Text className="text-[11px] font-bold text-slate-500 font-sans">
                      Page <strong className="text-slate-800">{currentPage}</strong> of {totalPages}
                    </Text>

                    <TouchableOpacity
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={`px-3 py-1.5 rounded-xl border transition flex flex-row items-center gap-1 ${
                        currentPage === totalPages
                          ? 'bg-slate-50 border-slate-150 text-slate-300 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <Text className={`text-[10px] font-extrabold ${currentPage === totalPages ? 'text-slate-300' : 'text-slate-600'}`}>Next</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            )}

          </View>
        )}

        {/* VIEW 2: BUSINESS APPLICATION FORM */}
        {currentView === 'register' && (
          <View className="space-y-4">
            
            {!successState ? (
              <View className="bg-white p-5 border border-slate-200/55 rounded-[28px] space-y-5 shadow-3xs text-left">
                <View className="border-b border-slate-100 pb-3">
                  <Text className="text-base font-extrabold text-slate-900 block">List My Business Application</Text>
                  <Text className="text-xs text-slate-400 mt-1 block leading-relaxed font-sans">
                    Complete this quick form to register your business draft. A physical inspection listing fee of <strong className="text-blue-600 font-bold">R159</strong> is required to submit.
                  </Text>
                </View>

                {formStep === 1 ? (
                  <View className="space-y-6">
                    
                    {/* SECTION 1: Business Information */}
                    <View className="bg-slate-50/50 p-5 border border-slate-200/60 rounded-[20px] space-y-4">
                      <View className="border-b border-slate-200 pb-2 mb-2">
                        <Text className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">SECTION 1</Text>
                        <Text className="text-sm font-black text-slate-850 block mt-0.5">Business Information</Text>
                      </View>
                      
                      {/* Business Name */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Business Name *</Text>
                        <TextInput
                          placeholder="e.g. Cape Town Artisan Bakers"
                          value={formData.businessName}
                          onChangeText={(t) => setFormData(p => ({ ...p, businessName: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                        {formErrors.businessName && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.businessName}</Text>}
                      </View>

                      {/* Business Category */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Business Category *</Text>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans cursor-pointer h-[46px] text-slate-800"
                        >
                          {categories.filter(c => c !== 'All').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </View>

                      {/* Description */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Short Business Description *</Text>
                        <TextInput
                          multiline
                          numberOfLines={4}
                          placeholder="What services or products do you offer? Share a brief background..."
                          value={formData.description}
                          onChangeText={(t) => setFormData(p => ({ ...p, description: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800 block"
                        />
                        {formErrors.description && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.description}</Text>}
                      </View>
                    </View>

                    {/* SECTION 2: Owner Information */}
                    <View className="bg-slate-50/50 p-5 border border-slate-200/60 rounded-[20px] space-y-4">
                      <View className="border-b border-slate-200 pb-2 mb-2">
                        <Text className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">SECTION 2</Text>
                        <Text className="text-sm font-black text-slate-850 block mt-0.5">Owner Information</Text>
                      </View>

                      {/* Owner Name */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Owner Name *</Text>
                        <TextInput
                          placeholder="e.g. John Doe"
                          value={formData.ownerName}
                          onChangeText={(t) => setFormData(p => ({ ...p, ownerName: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                        {formErrors.ownerName && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.ownerName}</Text>}
                      </View>

                      {/* Grid for Contacts */}
                      <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Number */}
                        <View className="space-y-1.5">
                          <Text className="text-xs font-bold text-slate-700 block">Phone Number *</Text>
                          <TextInput
                            placeholder="e.g. +27 82 123 4567"
                            value={formData.phoneNumber}
                            onChangeText={(t) => setFormData(p => ({ ...p, phoneNumber: t }))}
                            className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                          />
                          {formErrors.phoneNumber && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.phoneNumber}</Text>}
                        </View>

                        {/* WhatsApp Number */}
                        <View className="space-y-1.5">
                          <Text className="text-xs font-bold text-slate-700 block">WhatsApp Number *</Text>
                          <TextInput
                            placeholder="e.g. +27 82 123 4567"
                            value={formData.whatsappNumber}
                            onChangeText={(t) => setFormData(p => ({ ...p, whatsappNumber: t }))}
                            className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                          />
                          {formErrors.whatsappNumber && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.whatsappNumber}</Text>}
                        </View>
                      </View>

                      {/* Email */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Email Address *</Text>
                        <TextInput
                          placeholder="owner@mybusiness.co.za"
                          value={formData.emailAddress}
                          onChangeText={(t) => setFormData(p => ({ ...p, emailAddress: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                        {formErrors.emailAddress && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.emailAddress}</Text>}
                      </View>
                    </View>

                    {/* SECTION 3: Business Location */}
                    <View className="bg-slate-50/50 p-5 border border-slate-200/60 rounded-[20px] space-y-4">
                      <View className="border-b border-slate-200 pb-2 mb-2">
                        <Text className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">SECTION 3</Text>
                        <Text className="text-sm font-black text-slate-850 block mt-0.5">Business Location</Text>
                      </View>

                      {/* Grid for Province and City */}
                      <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Province */}
                        <View className="space-y-1.5">
                          <Text className="text-xs font-bold text-slate-700 block">Province *</Text>
                          <TextInput
                            placeholder="e.g. Limpopo"
                            value={formData.province}
                            onChangeText={(t) => setFormData(p => ({ ...p, province: t }))}
                            className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                          />
                          {formErrors.province && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.province}</Text>}
                        </View>

                        {/* City / Town */}
                        <View className="space-y-1.5">
                          <Text className="text-xs font-bold text-slate-700 block">Town / City *</Text>
                          <TextInput
                            placeholder="e.g. Makhado"
                            value={formData.city}
                            onChangeText={(t) => setFormData(p => ({ ...p, city: t }))}
                            className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                          />
                          {formErrors.city && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.city}</Text>}
                        </View>
                      </View>

                      {/* Village / Suburb */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Village / Suburb *</Text>
                        <TextInput
                          placeholder="e.g. Madombidzha"
                          value={formData.villageSuburb}
                          onChangeText={(t) => setFormData(p => ({ ...p, villageSuburb: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                        {formErrors.villageSuburb && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.villageSuburb}</Text>}
                      </View>

                      {/* Full Address */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Full Address *</Text>
                        <TextInput
                          placeholder="e.g. Stand 123, Madombidzha, Makhado"
                          value={formData.physicalAddress}
                          onChangeText={(t) => setFormData(p => ({ ...p, physicalAddress: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                        {formErrors.physicalAddress && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.physicalAddress}</Text>}
                      </View>

                      {/* GPS Location Indicator */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">GPS Location</Text>
                        <View className="bg-white p-3.5 border border-slate-200/75 rounded-xl flex flex-row items-center justify-between">
                          <View className="flex flex-row items-center gap-2">
                            <Navigation className="w-4 h-4 text-blue-500 shrink-0" />
                            <Text className="text-[11px] text-slate-550 font-sans">
                              {userCoords ? `Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}` : "Click capture to secure GPS coords"}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onClick={handleNearMe}
                            className="bg-blue-50 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded-lg active:scale-97 cursor-pointer"
                          >
                            <Text className="text-[10px] text-blue-700 font-bold font-sans">
                              {loadingGPS ? "Fetching GPS..." : userCoords ? "Re-fetch GPS" : "Capture Location"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* SECTION 4: Business Details */}
                    <View className="bg-slate-50/50 p-5 border border-slate-200/60 rounded-[20px] space-y-4">
                      <View className="border-b border-slate-200 pb-2 mb-2">
                        <Text className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">SECTION 4</Text>
                        <Text className="text-sm font-black text-slate-850 block mt-0.5">Business Details</Text>
                      </View>

                      {/* Opening Hours */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Opening Hours (Optional)</Text>
                        <TextInput
                          placeholder="e.g. Monday–Friday: 08:00–17:00, Saturday: 08:00–14:00"
                          value={formData.openingHours}
                          onChangeText={(t) => setFormData(p => ({ ...p, openingHours: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                      </View>

                      {/* Starting Price */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Starting Price (Optional)</Text>
                        <TextInput
                          placeholder="e.g. Starting from R150"
                          value={formData.startingPrice}
                          onChangeText={(t) => setFormData(p => ({ ...p, startingPrice: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                      </View>

                      {/* Current Specials */}
                      <View className="space-y-1.5">
                        <Text className="text-xs font-bold text-slate-700 block">Current Specials (Optional)</Text>
                        <TextInput
                          placeholder="e.g. Hair wash + braids from R350"
                          value={formData.specials}
                          onChangeText={(t) => setFormData(p => ({ ...p, specials: t }))}
                          className="w-full text-xs p-3.5 bg-white border border-slate-200/70 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-slate-800"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onClick={handleFormSubmit}
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-xl flex flex-row items-center justify-center mt-4 cursor-pointer select-none ${
                        isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
                      }`}
                      id="form-submit-next-btn"
                    >
                      <Text className="text-white font-bold text-xs font-sans">
                        {isSubmitting ? 'Saving Draft...' : 'Proceed to Payment (R159)'}
                      </Text>
                    </TouchableOpacity>

                  </View>
                ) : (
                  
                  /* GATEWAY AND SIMULATOR SCREEN */
                  <View className="py-8 items-center justify-center space-y-6 text-center">
                    <View className="bg-blue-50 p-4 rounded-full">
                      <Building className="w-10 h-10 text-blue-600" />
                    </View>
                    <View className="space-y-2">
                      <Text className="text-lg font-black text-slate-900 block font-sans">Business Listing Fee</Text>
                      <Text className="text-xs text-slate-400 leading-normal max-w-sm block font-sans">
                        Your application for <strong className="text-slate-700 font-bold">{formData.businessName}</strong> has been registered. Listing is priced at <strong className="text-blue-600 font-black">R159</strong> one-off.
                      </Text>
                    </View>

                    <View className="w-full space-y-3 pt-3">
                      {checkoutUrl ? (
                        <TouchableOpacity
                          onClick={() => { window.location.href = checkoutUrl; }}
                          className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-full text-center cursor-pointer flex flex-row justify-center items-center gap-2"
                        >
                          <Text className="text-white text-xs font-bold font-sans">Redirect to PayFast Gate</Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex flex-row items-center justify-center gap-2 py-2">
                          <View className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <Text className="text-xs text-slate-500 font-medium font-sans">Creating secure PayFast gateway...</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onClick={() => setFormStep(1)}
                      className="pt-2 text-slate-400 hover:text-slate-650 cursor-pointer"
                    >
                      <Text className="text-xs font-bold underline font-sans">Edit application details</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              
              /* SUCCESS MESSAGE SCREEN */
              <View className="bg-white p-6 border border-slate-250/60 rounded-[32px] shadow-md text-center py-10 space-y-6">
                <div className="mx-auto bg-emerald-50 border border-emerald-100 p-4 rounded-full w-16 h-16 flex items-center justify-center shadow-2xs">
                  <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
                </div>
                
                <View className="space-y-4">
                  <Text className="text-lg font-black text-slate-900 block leading-tight font-sans">
                    Thank you for listing your business.
                  </Text>
                  
                  <View className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-left">
                    <Text className="text-xs text-slate-600 leading-relaxed block font-sans">
                      Our Orbit AI Business Team will contact you within 24 hours.
                    </Text>
                    <Text className="text-xs text-slate-600 leading-relaxed block font-sans mt-3">
                      We will personally visit your business, interview you, take professional photographs, verify your business information and prepare your listing before publishing it.
                    </Text>
                  </View>

                  <div className="bg-amber-50/65 border border-amber-200 p-4 rounded-xl text-left flex gap-2.5 items-start">
                    <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-amber-800 block">Verification Status: Pending</Text>
                      <Text className="text-[11px] text-amber-700 mt-0.5 leading-relaxed block font-sans">
                        As requested, photos are not uploaded by owners. The Orbit staff team will take care of all media, copywriting, and geolocating before making it public.
                      </Text>
                    </View>
                  </div>
                </View>

                <TouchableOpacity
                  onClick={resetFormState}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-full text-center cursor-pointer shadow-2xs transition"
                >
                  <Text className="text-white text-xs font-bold font-sans">Return to Business Directory</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        )}
                {/* VIEW 3: DETAILED BUSINESS PROFILE SCREEN */}
        {currentView === 'profile' && selectedBusiness && (
          <View className="space-y-6 text-left" id="detailed-business-profile-view">
            
            {/* Top Navigation Bar / Breadcrumb */}
            <View className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 select-none">
              <TouchableOpacity
                onClick={() => {
                  setCurrentView('directory');
                  setActivePhotoIdx(0);
                }}
                className="flex flex-row items-center gap-1.5 text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <Text className="text-xs font-semibold text-blue-600 font-sans">Back to Directory</Text>
              </TouchableOpacity>
              
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Business ID: {selectedBusiness.id}
              </Text>
            </View>

            {/* Photo Gallery & Main Hero Image */}
            <View className="space-y-3">
              <div className="relative h-72 w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-2xs">
                <img 
                  src={getBusinessPhotos(selectedBusiness)[activePhotoIdx]} 
                  alt={selectedBusiness.name} 
                  className="w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay with subtle category tag */}
                <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{selectedBusiness.category}</span>
                </div>
              </div>

              {/* Photo Gallery Thumbnail Row */}
              {getBusinessPhotos(selectedBusiness).length > 1 && (
                <div className="flex flex-row gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {getBusinessPhotos(selectedBusiness).map((photo, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition ${activePhotoIdx === idx ? 'border-blue-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </TouchableOpacity>
                  ))}
                </div>
              )}
            </View>

            {/* Business Header Info */}
            <View className="space-y-2 text-left">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 font-mono">
                    {selectedBusiness.category} Directory
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans leading-tight">
                    {selectedBusiness.name}
                  </h2>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-sans">Verified Listing</span>
                </div>
              </div>
            </View>

            {/* Profile Grid Section */}
            <View className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Left Column: Description, Pricing, Specials & Hours */}
              <View className="space-y-6 text-left">
                
                {/* Description */}
                <div className="space-y-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">About the Business</Text>
                  <Text className="text-sm text-slate-650 leading-relaxed block font-sans">
                    {selectedBusiness.description}
                  </Text>
                  <div className="flex flex-row items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
                    <span className="font-semibold text-slate-500">Representative:</span>
                    <span>{selectedBusiness.ownerName}</span>
                  </div>
                </div>

                {/* Contact Information Summary */}
                <div className="space-y-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Contact Information</Text>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-3xs text-left">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <Text className="text-xs text-slate-700 font-sans font-semibold">
                        Phone: <span className="font-bold text-slate-900">{selectedBusiness.phoneNumber}</span>
                      </Text>
                    </div>
                    {(selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber) && (
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 fill-current text-emerald-600 shrink-0" viewBox="0 0 24 24">
                          <path d="M12.012 2c-5.506 0-9.985 4.479-9.985 9.985 0 1.758.459 3.411 1.259 4.867l-1.337 4.89 5.011-1.315c1.4.761 2.986 1.191 4.671 1.191 5.506 0 9.985-4.479 9.985-9.985 0-5.506-4.479-9.985-9.985-9.985zm0 1.624c4.61 0 8.361 3.75 8.361 8.361s-3.751 8.361-8.361 8.361c-1.564 0-3.023-.432-4.279-1.183l-.307-.184-3.181.834.849-3.102-.202-.321c-.815-1.298-1.242-2.808-1.242-4.405 0-4.611 3.75-8.361 8.361-8.361zm-3.411 4.84c-.187 0-.395.037-.562.186-.167.149-.637.624-.637 1.524 0 .901.656 1.77.747 1.895.092.125 1.263 1.93 3.061 2.705.428.185.762.294 1.022.378.43.136.822.117 1.131.071.344-.051 1.06-.433 1.209-.851.15-.418.15-.776.105-.851-.045-.075-.165-.12-.345-.21-.18-.09-1.06-.524-1.224-.584-.165-.06-.285-.09-.395.075-.12.165-.435.54-.539.66-.105.119-.21.134-.39.045-.18-.09-.76-.28-1.448-.894-.535-.477-.896-1.066-1.001-1.246-.105-.18-.011-.277.079-.366.081-.08.18-.21.27-.315.09-.105.12-.18.18-.3.06-.12.03-.225-.015-.315-.045-.09-.395-.953-.541-1.306-.142-.343-.287-.297-.395-.302-.102-.005-.221-.005-.34-.005z"/>
                        </svg>
                        <Text className="text-xs text-slate-700 font-sans font-semibold">
                          WhatsApp: <span className="font-bold text-slate-900">{selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber}</span>
                        </Text>
                      </div>
                    )}
                    {selectedBusiness.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                        <Text className="text-xs text-slate-700 font-sans font-semibold">
                          Email: <span className="font-bold text-slate-900">{selectedBusiness.email}</span>
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Hours */}
                <div className="space-y-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Business Hours</Text>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 shadow-3xs text-left">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-2 mb-1">
                      <Clock className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                      <Text className="text-xs font-bold text-slate-850 font-sans">Weekly Schedule</Text>
                    </div>
                    {(() => {
                      const hoursStr = selectedBusiness.openingHours || "Monday–Friday: 08:00–17:00, Saturday: 08:00–14:00, Sunday: Closed";
                      const lines = hoursStr.split(/[,\n]/).map(l => l.trim()).filter(Boolean);
                      return (
                        <div className="space-y-1.5 pl-7">
                          {lines.map((line, lidx) => (
                            <Text key={lidx} className="text-xs font-semibold text-slate-650 block font-sans">
                              {line}
                            </Text>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Pricing: Starting From Price (Optional) */}
                {selectedBusiness.startingPrice && (
                  <div className="space-y-2 animate-fade-in">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Pricing</Text>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-3xs">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                        <Text className="text-xs font-bold text-slate-800 font-sans">Starting From</Text>
                      </div>
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        {selectedBusiness.startingPrice.toUpperCase().includes("R") 
                          ? selectedBusiness.startingPrice 
                          : `R${selectedBusiness.startingPrice}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Current Specials */}
                {selectedBusiness.specials && selectedBusiness.specials.length > 0 && (
                  <div className="space-y-2 animate-fade-in">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Current Specials</Text>
                    <View className="space-y-2">
                      {selectedBusiness.specials.map((special, index) => (
                        <div key={index} className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl flex items-start gap-3 shadow-3xs">
                          <Tag className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                          <Text className="text-xs font-semibold text-amber-950 leading-relaxed block font-sans">{special}</Text>
                        </div>
                      ))}
                    </View>
                  </div>
                )}

              </View>

              {/* Right Column: Map, Address, Sharing & Action Buttons */}
              <View className="space-y-6 text-left">
                
                {/* Physical Location Address & Directions Map */}
                <div className="space-y-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Directions & Map Location</Text>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {/* Visual map simulation */}
                    <div className="h-44 w-full relative bg-blue-50/30 overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                        backgroundImage: "radial-gradient(#2563eb 1.2px, transparent 1.2px), radial-gradient(#2563eb 1.2px, transparent 1.2px)",
                        backgroundSize: "24px 24px",
                        backgroundPosition: "0 0, 12px 12px"
                      }} />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-blue-100/30" />
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-blue-100/30" />
                      
                      {/* Sleek Pin visual */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="absolute -top-1 w-8 h-8 bg-blue-500/20 rounded-full animate-ping" />
                        <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                          <MapPin className="w-5.5 h-5.5 text-white" />
                        </div>
                        <span className="mt-2 text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md shadow-xs border border-blue-100">
                          {selectedBusiness.villageSuburb ? `${selectedBusiness.villageSuburb}, ${selectedBusiness.townCity}` : selectedBusiness.townCity}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 text-left">
                        <Text className="text-xs font-bold text-slate-800 block truncate">Address</Text>
                        <Text className="text-[11px] text-slate-500 font-medium block truncate mt-0.5 text-left">
                          {[selectedBusiness.physicalAddress, selectedBusiness.villageSuburb, selectedBusiness.townCity, selectedBusiness.province].filter(Boolean).join(", ")}
                        </Text>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          [selectedBusiness.name, selectedBusiness.physicalAddress, selectedBusiness.villageSuburb, selectedBusiness.townCity, selectedBusiness.province].filter(Boolean).join(', ')
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-semibold px-4 py-2 rounded-xl text-xs transition flex flex-row items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5 text-white" />
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Contact Channels */}
                <div className="space-y-3 pt-1">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Contact & Actions</Text>
                  
                  <div className="flex flex-col gap-2.5">
                    {/* Phone button */}
                    {selectedBusiness.phoneNumber && (
                      <a
                        href={`tel:${selectedBusiness.phoneNumber}`}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-3 px-4 rounded-xl flex flex-row items-center justify-center gap-2.5 text-xs transition active:scale-97 cursor-pointer"
                      >
                        <Phone className="w-4.5 h-4.5 text-slate-500" />
                        <span>Call Business: {selectedBusiness.phoneNumber}</span>
                      </a>
                    )}

                    {/* WhatsApp button */}
                    {(selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber) && (
                      <a
                        href={`https://wa.me/${getCleanNumberForWa(selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber || "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl flex flex-row items-center justify-center gap-2.5 text-xs transition active:scale-97 cursor-pointer shadow-xs"
                      >
                        <svg className="w-4.5 h-4.5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                          <path d="M12.012 2c-5.506 0-9.985 4.479-9.985 9.985 0 1.758.459 3.411 1.259 4.867l-1.337 4.89 5.011-1.315c1.4.761 2.986 1.191 4.671 1.191 5.506 0 9.985-4.479 9.985-9.985 0-5.506-4.479-9.985-9.985-9.985zm0 1.624c4.61 0 8.361 3.75 8.361 8.361s-3.751 8.361-8.361 8.361c-1.564 0-3.023-.432-4.279-1.183l-.307-.184-3.181.834.849-3.102-.202-.321c-.815-1.298-1.242-2.808-1.242-4.405 0-4.611 3.75-8.361 8.361-8.361zm-3.411 4.84c-.187 0-.395.037-.562.186-.167.149-.637.624-.637 1.524 0 .901.656 1.77.747 1.895.092.125 1.263 1.93 3.061 2.705.428.185.762.294 1.022.378.43.136.822.117 1.131.071.344-.051 1.06-.433 1.209-.851.15-.418.15-.776.105-.851-.045-.075-.165-.12-.345-.21-.18-.09-1.06-.524-1.224-.584-.165-.06-.285-.09-.395.075-.12.165-.435.54-.539.66-.105.119-.21.134-.39.045-.18-.09-.76-.28-1.448-.894-.535-.477-.896-1.066-1.001-1.246-.105-.18-.011-.277.079-.366.081-.08.18-.21.27-.315.09-.105.12-.18.18-.3.06-.12.03-.225-.015-.315-.045-.09-.395-.953-.541-1.306-.142-.343-.287-.297-.395-.302-.102-.005-.221-.005-.34-.005z"/>
                        </svg>
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}

                    {/* Email button (optional) */}
                    {selectedBusiness.email && (
                      <a
                        href={`mailto:${selectedBusiness.email}`}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-3 px-4 rounded-xl flex flex-row items-center justify-center gap-2.5 text-xs transition active:scale-97 cursor-pointer"
                      >
                        <Mail className="w-4.5 h-4.5 text-slate-500" />
                        <span>Email Business: {selectedBusiness.email}</span>
                      </a>
                    )}

                    {/* Visit Website (if available) */}
                    {selectedBusiness.socialMediaLinks?.website && (
                      <a
                        href={selectedBusiness.socialMediaLinks.website}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex flex-row items-center justify-center gap-2.5 text-xs transition active:scale-97 cursor-pointer shadow-xs animate-fade-in"
                      >
                        <Globe className="w-4.5 h-4.5 text-white" />
                        <span>Visit Official Website</span>
                      </a>
                    )}

                    {/* Share Business */}
                    <TouchableOpacity
                      onClick={handleShareBusiness}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 font-semibold py-3 px-4 rounded-xl flex flex-row items-center justify-center gap-2.5 text-xs transition active:scale-97 cursor-pointer"
                    >
                      <Share2 className="w-4.5 h-4.5 text-blue-600" />
                      <span>{copiedShare ? "Details Copied to Clipboard!" : "Share Business Listing"}</span>
                    </TouchableOpacity>
                  </div>
                </div>

                {/* Back to directory button */}
                <TouchableOpacity
                  onClick={() => {
                    setCurrentView('directory');
                    setActivePhotoIdx(0);
                  }}
                  className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold py-3.5 rounded-xl text-center transition text-xs cursor-pointer border border-slate-200/50"
                >
                  Return to Directory
                </TouchableOpacity>

              </View>

            </View>

          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}
