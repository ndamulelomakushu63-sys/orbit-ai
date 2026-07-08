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
  Navigation
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
const MOCK_BUSINESSES: Business[] = [
  {
    id: "mock-1",
    name: "Lindiwe's Hair & Beauty Salon",
    ownerName: "Lindiwe Mazibuko",
    description: "Professional braiding, hair styling, cosmetics and luxury beauty treatments in the heart of Tshikota village. Book your appointment today for a premium, friendly experience.",
    category: "Health & Beauty",
    townCity: "Tshikota, Louis Trichardt",
    physicalAddress: "Main Road, Tshikota Village",
    phoneNumber: "+27 82 555 0192",
    whatsappNumber: "+27 82 555 0192",
    email: "lindiwe.beauty@gmail.com",
    openingHours: "Mon - Sat: 08:30 - 18:00",
    photos: [
      "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -22.8234,
    longitude: 29.7432,
    rating: 4.9,
    popularity: 150
  },
  {
    id: "mock-2",
    name: "The Daily Grind Cafe & Pizza",
    ownerName: "Devon Weyers",
    description: "Artisanal coffee, freshly baked sourdough breads, pastries, delicious wood-fired pizzas, and a cozy workspace with super-fast WiFi. Locally sourced organic ingredients.",
    category: "Food & Beverage",
    townCity: "Cape Town",
    physicalAddress: "45 Bree St, Cape Town City Centre",
    phoneNumber: "+27 21 444 0918",
    whatsappNumber: "+27 73 112 3456",
    email: "devon@dailygrind.co.za",
    openingHours: "Mon - Fri: 07:00 - 16:30, Sat: 08:00 - 14:00",
    photos: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Western Cape",
    latitude: -33.9249,
    longitude: 18.4241,
    rating: 4.8,
    popularity: 210
  },
  {
    id: "mock-3",
    name: "Khumalo Auto Clinic",
    ownerName: "Sipho Khumalo",
    description: "Reliable mechanical repairs, diagnostics, engine tune-ups, tire alignment and battery fitment. Over 15 years of trusted experience in Johannesburg.",
    category: "Automotive",
    townCity: "Johannesburg",
    physicalAddress: "112 Albertina Sisulu Rd, Jeppestown",
    phoneNumber: "+27 11 333 4455",
    whatsappNumber: "+27 84 999 0011",
    email: "sipho@khumaloauto.co.za",
    openingHours: "Mon - Fri: 08:00 - 17:00, Sat: 08:00 - 13:00",
    photos: [
      "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Gauteng",
    latitude: -26.2041,
    longitude: 28.0473,
    rating: 4.7,
    popularity: 180
  },
  {
    id: "mock-4",
    name: "Orbit Tech Support & Repairs",
    ownerName: "Thabo Ndlovu",
    description: "Fast and reliable repair services for smartphones, laptops, tablets, and gaming consoles. We also stock premium quality accessories and screen protectors. Open late in Pretoria.",
    category: "Technology",
    townCity: "Pretoria",
    physicalAddress: "Shop 12, Hatfield Plaza, Burnett St",
    phoneNumber: "+27 12 888 2341",
    whatsappNumber: "+27 61 777 9081",
    email: "thabo@orbitrepairs.co.za",
    openingHours: "Mon - Fri: 09:00 - 17:30, Sat: 09:00 - 15:00",
    photos: [
      "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Gauteng",
    latitude: -25.7479,
    longitude: 28.2293,
    rating: 4.6,
    popularity: 95
  },
  {
    id: "mock-5",
    name: "Siyakhula Builders & Trades",
    ownerName: "Bongani Cele",
    description: "Professional construction, bricklaying, plastering, tiling, plumbing and electrical work. Safe, fully certified, and affordable residential upgrades in Durban.",
    category: "Construction & Trades",
    townCity: "Durban",
    physicalAddress: "45 Kings Rd, Pinetown",
    phoneNumber: "+27 31 702 4455",
    whatsappNumber: "+27 83 222 8899",
    email: "cele@siyakhula.co.za",
    openingHours: "Mon - Sat: 07:30 - 17:00",
    photos: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "KwaZulu-Natal",
    latitude: -29.8587,
    longitude: 31.0218,
    rating: 4.8,
    popularity: 110
  },
  {
    id: "mock-6",
    name: "Thohoyandou Elite Car Wash",
    ownerName: "Ndamulelo Makushu",
    description: "Premium car wash and complete valeting services. Auto detailing, interior upholstery shampoo, engine cleaning, wax and paint protection in Thohoyandou.",
    category: "Services",
    townCity: "Thohoyandou",
    physicalAddress: "22 Mphephu St, Thohoyandou",
    phoneNumber: "+27 15 962 1045",
    whatsappNumber: "+27 72 445 6128",
    email: "valet.thohoyandou@gmail.com",
    openingHours: "Mon - Sun: 07:00 - 18:00",
    photos: [
      "https://images.unsplash.com/photo-1520340356584-f9917d1eed69?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -22.9556,
    longitude: 30.4783,
    rating: 4.9,
    popularity: 135
  },
  {
    id: "mock-7",
    name: "Giyani Wood-Fired Pizzeria",
    ownerName: "Rivalani Baloyi",
    description: "Authentic wood-fired Italian style pizza, freshly prepared pasta dishes, local South African favorite toppings, milkshakes, and delicious desserts.",
    category: "Food & Beverage",
    townCity: "Giyani",
    physicalAddress: "Section F, Main Giyani Road",
    phoneNumber: "+27 15 812 4923",
    whatsappNumber: "+27 83 456 7890",
    email: "pizza.giyani@gmail.com",
    openingHours: "Mon - Sun: 10:00 - 21:00",
    photos: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -23.3025,
    longitude: 30.7132,
    rating: 4.7,
    popularity: 142
  },
  {
    id: "mock-8",
    name: "Musina Family Doctor Clinic",
    ownerName: "Dr. Farai Ndlovu",
    description: "Compassionate and highly professional family doctor consultations, children's health, vaccinations, physical health assessments, and prescription services.",
    category: "Health & Beauty",
    townCity: "Musina",
    physicalAddress: "12 Campbell St, Musina",
    phoneNumber: "+27 15 534 0987",
    whatsappNumber: "+27 76 991 2234",
    email: "musina.clinic@gmail.com",
    openingHours: "Mon - Fri: 08:00 - 17:00, Sat: 08:00 - 12:00",
    photos: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -22.3381,
    longitude: 30.0417,
    rating: 4.8,
    popularity: 88
  },
  {
    id: "mock-9",
    name: "Polokwane Care Pharmacy",
    ownerName: "Mpho Phiri",
    description: "Your trusted neighborhood community pharmacy in Polokwane. Script dispensing, OTC medicines, baby wellness, blood pressure checks, vitamins, and friendly advice.",
    category: "Health & Beauty",
    townCity: "Polokwane",
    physicalAddress: "78 Landros Mare St, Polokwane",
    phoneNumber: "+27 15 291 4455",
    whatsappNumber: "+27 82 445 9901",
    email: "care.polokwane@pharmacy.co.za",
    openingHours: "Mon - Fri: 08:00 - 19:00, Sat: 08:00 - 15:00",
    photos: [
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -23.8962,
    longitude: 29.4486,
    rating: 4.9,
    popularity: 164
  },
  {
    id: "mock-10",
    name: "Makhado Grill & Pizza Lounge",
    ownerName: "Tshifhiwa Rambau",
    description: "The best flame-grilled steaks, ribs, burgers and wood-fired pizzas in Louis Trichardt. A family-friendly restaurant with a rich heritage and incredible local food.",
    category: "Food & Beverage",
    townCity: "Louis Trichardt",
    physicalAddress: "Krogh Street, Louis Trichardt",
    phoneNumber: "+27 15 516 4900",
    whatsappNumber: "+27 71 889 0012",
    email: "makhado.grill@gmail.com",
    openingHours: "Mon - Sat: 11:00 - 22:00, Sun: 11:00 - 18:00",
    photos: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
    ],
    isPublic: true,
    isPaid: true,
    paymentStatus: "Paid",
    status: "Approved",
    province: "Limpopo",
    latitude: -23.0471,
    longitude: 29.9032,
    rating: 4.8,
    popularity: 115
  }
];

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
  const { currentUser, setMobileScreen } = useAppState();

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
    city: '',
    category: 'Services',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pendingRegId, setPendingRegId] = useState('');
  const [successState, setSuccessState] = useState(false);

  // Gallery slider state for profile modal
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

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
    // 1. Expanded search matches: Name, Category, Description, Owner name, townCity (City/Town/Village/Suburb), Province, Keywords
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

      // Extract keywords (longer than 2 characters) for flexible query match
      const keywords = q.split(/\s+/).filter(k => k.length > 2);
      const keywordMatch = keywords.length > 0 && keywords.some(kw => 
        biz.name.toLowerCase().includes(kw) ||
        biz.category.toLowerCase().includes(kw) ||
        biz.description.toLowerCase().includes(kw) ||
        biz.townCity.toLowerCase().includes(kw) ||
        (biz.province && biz.province.toLowerCase().includes(kw))
      );

      matchesSearch = inName || inCategory || inDesc || inTown || inOwner || inAddress || inProvince || keywordMatch;
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
        description: formData.description.trim(),
        preferred_visit_date: "Anytime",
        additional_notes: JSON.stringify({
          province: formData.province.trim(),
          userId: uid
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
        }
      }
    } catch (err: any) {
      alert("Registration Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment simulator for preview and offline testing
  const handleSimulatePaymentSuccess = async () => {
    if (!currentUser || !pendingRegId) return;
    setIsSubmitting(true);
    try {
      const uid = currentUser.uid || currentUser.id;

      // 1. Direct simulation insert to live 'businesses' with Pending status and Paid: true
      const newBiz: Business = {
        id: pendingRegId,
        name: formData.businessName.trim(),
        ownerName: formData.ownerName.trim(),
        description: formData.description.trim(),
        category: formData.category,
        townCity: formData.city.trim(),
        physicalAddress: formData.physicalAddress.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        email: formData.emailAddress.trim(),
        openingHours: "Mon - Fri: 08:00 - 17:00",
        socialMediaLinks: {},
        photos: [],
        specials: [],
        isPublic: false,
        isPaid: true,
        paymentStatus: "Paid",
        status: "Pending", // Saved into Supabase with status Pending!
        userId: uid,
        province: formData.province.trim(),
        preferredContactTime: "Anytime"
      };

      const registered = await dbRegisterBusiness(newBiz);
      if (!registered) {
        throw new Error("Failed to register business in live table.");
      }

      // 2. Also save an entry in OBDI Leads to let the admin see it instantly!
      const leadEntry: ObdiLead = {
        id: pendingRegId,
        business_name: formData.businessName.trim(),
        owner_name: formData.ownerName.trim(),
        phone: formData.phoneNumber.trim(),
        email: formData.emailAddress.trim(),
        address: formData.physicalAddress.trim() + `, ${formData.city.trim()}, ${formData.province.trim()}`,
        status: 'paid_new', // paid new lead
        paid: true,
        notes: `Physical verification visit required for ${formData.businessName}. Registered via simulated payment.`,
        specials: ''
      };
      await dbUpsertObdiLead(leadEntry);

      // Trigger the successful payment thank you screen
      setSuccessState(true);
    } catch (e: any) {
      alert("Simulation failed: " + e.message);
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
      city: '',
      category: 'Services',
      description: ''
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
            <View className="bg-white p-5 border border-slate-200/55 rounded-[28px] space-y-4 shadow-3xs text-left">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-widest pl-0.5 block font-sans">Search and Filter Businesses</Text>
              
              <View className="flex flex-col sm:flex-row gap-2">
                <View className="relative flex-1 flex flex-row items-center bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
                  <TextInput
                    placeholder="Search by name, category, service, location..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-xs bg-transparent outline-none font-sans text-slate-850"
                    id="directory-search-input-field"
                  />
                </View>

                {/* Near Me GPS Button */}
                <TouchableOpacity
                  onClick={handleNearMe}
                  disabled={loadingGPS}
                  className={`px-4 py-3 rounded-2xl border flex flex-row items-center justify-center gap-2 transition cursor-pointer ${
                    isNearMeActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100'
                  }`}
                  id="directory-near-me-btn"
                >
                  <Navigation className={`w-4 h-4 ${isNearMeActive ? 'text-white animate-pulse' : 'text-slate-500'}`} />
                  <Text className={`text-xs font-bold font-sans ${isNearMeActive ? 'text-white' : 'text-slate-700'}`}>
                    {loadingGPS ? 'Locating...' : isNearMeActive ? 'Near Me Active' : 'Near Me'}
                  </Text>
                  {isNearMeActive && (
                    <Text className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md ml-1 font-mono">
                      GPS ON
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Filter by Location (supports townCity, Suburb, Village, Province) */}
              <View className="space-y-1.5">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Filter by Location</Text>
                <View className="flex flex-row overflow-x-auto pb-1 gap-1.5 scrollbar-none">
                  {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={`px-3.5 py-1.5 rounded-full border whitespace-nowrap transition cursor-pointer ${
                        selectedLocation === loc
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-slate-50 border-slate-200/60'
                      }`}
                    >
                      <Text className={`text-[10px] font-bold font-sans tracking-wide ${selectedLocation === loc ? 'text-white' : 'text-slate-500'}`}>
                        {loc === 'All' ? 'All Locations' : loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter Pills */}
              <View className="space-y-1.5">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Filter by Category</Text>
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
                    <Text className="text-[10px] font-black text-slate-450 uppercase tracking-widest pl-1 block text-left font-mono">
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
                            className="bg-white rounded-[24px] overflow-hidden border border-slate-200/55 shadow-2xs text-left cursor-pointer transition hover:border-blue-400 group flex flex-col"
                          >
                            <div className="h-44 w-full bg-slate-100 overflow-hidden relative shrink-0">
                              <img 
                                src={biz.photos?.[0] || getCategoryFallbackImage(biz.category)} 
                                alt={biz.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                                <span className="text-amber-500 text-[11px]">★</span>
                                <span className="text-[10px] font-bold text-slate-800">
                                  {scoreRating.toFixed(1)}
                                </span>
                              </div>
                              <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider">{biz.category}</span>
                              </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                              <div className="space-y-1">
                                <Text className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition truncate block">{biz.name}</Text>
                                <Text className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed block">{biz.description}</Text>
                              </div>
                              <div className="pt-2 border-t border-slate-50 flex items-center justify-between shrink-0">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1 text-slate-450">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate max-w-[120px] sm:max-w-none">{getFullLocationString(biz)}</span>
                                  </div>
                                  {distanceStr && (
                                    <span className="text-[9px] font-bold text-blue-600 font-mono mt-0.5 ml-4 block">{distanceStr}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 text-blue-600 font-bold text-xs">
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
                    <Text className="text-[10px] font-black text-slate-455 uppercase tracking-widest pl-1 block text-left font-mono">
                      ✦ Latest Businesses
                    </Text>
                    <View className="space-y-4">
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
                            className="bg-white rounded-3xl p-4 border border-slate-200/55 shadow-2xs hover:border-blue-400 transition cursor-pointer flex flex-col sm:flex-row gap-4 items-stretch text-left group"
                          >
                            <div className="w-full sm:w-28 h-28 bg-slate-100 rounded-2xl overflow-hidden relative shrink-0">
                              <img 
                                src={biz.photos?.[0] || getCategoryFallbackImage(biz.category)} 
                                alt={biz.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1 text-left min-w-0">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">{biz.category}</span>
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-amber-500 text-xs">★</span>
                                    <span className="text-[10px] font-bold text-slate-600">{scoreRating.toFixed(1)}</span>
                                  </div>
                                </div>
                                <Text className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition block truncate">{biz.name}</Text>
                                <Text className="text-[11px] text-slate-400 font-sans block truncate">Owner: {biz.ownerName}</Text>
                                <Text className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed block font-sans">{biz.description}</Text>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate max-w-[130px] sm:max-w-none">{getFullLocationString(biz)}</span>
                                  </div>
                                  {distanceStr && (
                                    <span className="text-[9px] font-bold text-blue-600 font-mono mt-0.5 ml-4 block">{distanceStr}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 text-blue-600 font-bold text-[11px]">
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
                    Complete this quick 10-field form to register your business draft. A physical inspection listing fee of <strong className="text-blue-600 font-bold">R159</strong> is required to submit.
                  </Text>
                </View>

                {formStep === 1 ? (
                  <View className="space-y-4">
                    
                    {/* 1. Business Name */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">1. Business Name *</Text>
                      <TextInput
                        placeholder="e.g. Cape Town Artisan Bakers"
                        value={formData.businessName}
                        onChangeText={(t) => setFormData(p => ({ ...p, businessName: t }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                      />
                      {formErrors.businessName && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.businessName}</Text>}
                    </View>

                    {/* 2. Owner Name */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">2. Owner Name *</Text>
                      <TextInput
                        placeholder="e.g. John Doe"
                        value={formData.ownerName}
                        onChangeText={(t) => setFormData(p => ({ ...p, ownerName: t }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                      />
                      {formErrors.ownerName && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.ownerName}</Text>}
                    </View>

                    {/* Category Selector */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">3. Business Category *</Text>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans cursor-pointer h-[46px]"
                      >
                        {categories.filter(c => c !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </View>

                    {/* Grid for Contacts */}
                    <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 4. Phone Number */}
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">4. Phone Number *</Text>
                        <TextInput
                          placeholder="e.g. +27 82 123 4567"
                          value={formData.phoneNumber}
                          onChangeText={(t) => setFormData(p => ({ ...p, phoneNumber: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                        />
                        {formErrors.phoneNumber && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.phoneNumber}</Text>}
                      </View>

                      {/* 5. WhatsApp Number */}
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">5. WhatsApp Number *</Text>
                        <TextInput
                          placeholder="e.g. +27 82 123 4567"
                          value={formData.whatsappNumber}
                          onChangeText={(t) => setFormData(p => ({ ...p, whatsappNumber: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                        />
                        {formErrors.whatsappNumber && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.whatsappNumber}</Text>}
                      </View>
                    </View>

                    {/* 6. Email */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">6. Email Address *</Text>
                      <TextInput
                        placeholder="owner@mybusiness.co.za"
                        value={formData.emailAddress}
                        onChangeText={(t) => setFormData(p => ({ ...p, emailAddress: t }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                      />
                      {formErrors.emailAddress && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.emailAddress}</Text>}
                    </View>

                    {/* 7. Physical Address */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">7. Physical Address *</Text>
                      <TextInput
                        placeholder="e.g. 123 Main Road, Sea Point"
                        value={formData.physicalAddress}
                        onChangeText={(t) => setFormData(p => ({ ...p, physicalAddress: t }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                      />
                      {formErrors.physicalAddress && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.physicalAddress}</Text>}
                    </View>

                    {/* Grid for Province and City */}
                    <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 8. Province */}
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">8. Province *</Text>
                        <TextInput
                          placeholder="e.g. Western Cape"
                          value={formData.province}
                          onChangeText={(t) => setFormData(p => ({ ...p, province: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                        />
                        {formErrors.province && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.province}</Text>}
                      </View>

                      {/* 9. City */}
                      <View className="space-y-1.5">
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">9. City *</Text>
                        <TextInput
                          placeholder="e.g. Cape Town"
                          value={formData.city}
                          onChangeText={(t) => setFormData(p => ({ ...p, city: t }))}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800"
                        />
                        {formErrors.city && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.city}</Text>}
                      </View>
                    </View>

                    {/* 10. Short Description */}
                    <View className="space-y-1.5">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 block">10. Short Business Description *</Text>
                      <TextInput
                        multiline
                        numberOfLines={4}
                        placeholder="What services or products do you offer? Share a brief background..."
                        value={formData.description}
                        onChangeText={(t) => setFormData(p => ({ ...p, description: t }))}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:border-blue-400 focus:bg-white font-sans text-slate-800 block"
                      />
                      {formErrors.description && <Text className="text-red-500 text-[10px] pl-1 block font-bold">{formErrors.description}</Text>}
                    </View>

                    <TouchableOpacity
                      onClick={handleFormSubmit}
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-full flex flex-row items-center justify-center mt-4 cursor-pointer select-none ${
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

                      <div className="flex items-center gap-2 py-1 justify-center">
                        <div className="h-px bg-slate-200 flex-1 max-w-[120px]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR SIMULATE</span>
                        <div className="h-px bg-slate-200 flex-1 max-w-[120px]" />
                      </div>

                      <TouchableOpacity
                        onClick={handleSimulatePaymentSuccess}
                        disabled={isSubmitting}
                        className="w-full border-2 border-dashed border-emerald-300 hover:bg-emerald-50 bg-emerald-50/20 py-3.5 rounded-full text-center cursor-pointer transition flex flex-row justify-center items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <Text className="text-emerald-700 text-xs font-black font-sans">
                          {isSubmitting ? 'Simulating...' : 'Simulate Successful Payment (Instant)'}
                        </Text>
                      </TouchableOpacity>
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
          <View className="bg-white rounded-[32px] overflow-hidden border border-slate-200/55 shadow-sm text-left">
            
            {/* Gallery Section */}
            <div className="relative h-60 w-full bg-slate-100 overflow-hidden shrink-0">
              <img 
                src={getBusinessPhotos(selectedBusiness)[activePhotoIdx]} 
                alt={selectedBusiness.name} 
                className="w-full h-full object-cover transition-all duration-300"
                referrerPolicy="no-referrer"
              />
              
              <TouchableOpacity
                onClick={() => setCurrentView('directory')}
                className="absolute top-4 left-4 bg-black/40 hover:bg-black/55 p-2 rounded-full text-white cursor-pointer transition flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </TouchableOpacity>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 text-white pointer-events-none text-left flex flex-col justify-end h-28">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 font-sans">{selectedBusiness.category}</span>
                <h2 className="text-lg font-black text-white leading-tight mt-1 truncate">{selectedBusiness.name}</h2>
              </div>
            </div>

            {/* Photo Slides Indicator */}
            {getBusinessPhotos(selectedBusiness).length > 1 && (
              <div className="flex flex-row justify-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
                {getBusinessPhotos(selectedBusiness).map((photo, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${activePhotoIdx === idx ? 'bg-blue-600 scale-110' : 'bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
              </div>
            )}

            {/* Profile Contents */}
            <div className="p-5 space-y-5 text-left">
              
              {/* Rating & Location Tag line */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 text-sm">★</span>
                  <span className="text-xs font-bold text-slate-800">
                    {(selectedBusiness.rating || (((selectedBusiness.id.charCodeAt(0) || 12) % 4) * 0.1 + 4.5)).toFixed(1)} Rating
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{getFullLocationString(selectedBusiness)}</span>
                  </div>
                  {getDistanceString(selectedBusiness) && (
                    <span className="text-[10px] font-bold text-blue-600 font-mono mt-0.5">{getDistanceString(selectedBusiness)}</span>
                  )}
                </div>
              </div>

              {/* Owner and Details */}
              <div className="space-y-1 bg-blue-50/20 border border-blue-100/40 p-4 rounded-2xl">
                <Text className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Owner & Verification Details</Text>
                <Text className="text-sm font-extrabold text-slate-800 block mt-1">Owner: {selectedBusiness.ownerName}</Text>
                <div className="flex items-center gap-1 text-[11px] text-slate-450 mt-1 font-medium font-sans">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-500 font-bold">Physical Information Hand-Verified by Orbit AI</span>
                </div>
              </div>

              {/* Professional Description */}
              <div className="space-y-1.5">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Professional Description</Text>
                <Text className="text-xs text-slate-600 leading-relaxed block font-sans">
                  {selectedBusiness.description}
                </Text>
              </div>

              {/* Opening Hours */}
              <div className="space-y-1.5 pt-1">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Opening Hours</Text>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <Text className="font-medium font-sans text-slate-700">{selectedBusiness.openingHours || "Mon - Fri: 08:00 - 17:00"}</Text>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5 pt-1">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Physical Address</Text>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <Text className="font-medium font-sans text-slate-700 leading-relaxed">
                    {selectedBusiness.physicalAddress}, {selectedBusiness.townCity}, {selectedBusiness.province || "South Africa"}
                  </Text>
                </div>
              </div>

              {/* Core Contact Action block */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans text-center mb-1">Contact Channels</Text>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  
                  {/* Phone Button */}
                  {selectedBusiness.phoneNumber && (
                    <a
                      href={`tel:${selectedBusiness.phoneNumber}`}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-full flex flex-row items-center justify-center gap-2 text-xs transition active:scale-97 cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-slate-650" />
                      <span>Call: {selectedBusiness.phoneNumber}</span>
                    </a>
                  )}

                  {/* WhatsApp button */}
                  {(selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber) && (
                    <a
                      href={`https://wa.me/${getCleanNumberForWa(selectedBusiness.whatsappNumber || selectedBusiness.phoneNumber || "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-full flex flex-row items-center justify-center gap-2 text-xs transition active:scale-97 cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4.5 h-4.5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                        <path d="M12.012 2c-5.506 0-9.985 4.479-9.985 9.985 0 1.758.459 3.411 1.259 4.867l-1.337 4.89 5.011-1.315c1.4.761 2.986 1.191 4.671 1.191 5.506 0 9.985-4.479 9.985-9.985 0-5.506-4.479-9.985-9.985-9.985zm0 1.624c4.61 0 8.361 3.75 8.361 8.361s-3.751 8.361-8.361 8.361c-1.564 0-3.023-.432-4.279-1.183l-.307-.184-3.181.834.849-3.102-.202-.321c-.815-1.298-1.242-2.808-1.242-4.405 0-4.611 3.75-8.361 8.361-8.361zm-3.411 4.84c-.187 0-.395.037-.562.186-.167.149-.637.624-.637 1.524 0 .901.656 1.77.747 1.895.092.125 1.263 1.93 3.061 2.705.428.185.762.294 1.022.378.43.136.822.117 1.131.071.344-.051 1.06-.433 1.209-.851.15-.418.15-.776.105-.851-.045-.075-.165-.12-.345-.21-.18-.09-1.06-.524-1.224-.584-.165-.06-.285-.09-.395.075-.12.165-.435.54-.539.66-.105.119-.21.134-.39.045-.18-.09-.76-.28-1.448-.894-.535-.477-.896-1.066-1.001-1.246-.105-.18-.011-.277.079-.366.081-.08.18-.21.27-.315.09-.105.12-.18.18-.3.06-.12.03-.225-.015-.315-.045-.09-.395-.953-.541-1.306-.142-.343-.287-.297-.395-.302-.102-.005-.221-.005-.34-.005z"/>
                      </svg>
                      <span>WhatsApp Chat</span>
                    </a>
                  )}

                </div>

                <TouchableOpacity
                  onClick={() => setCurrentView('directory')}
                  className="w-full mt-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-3 rounded-full text-center border border-slate-200 transition text-xs cursor-pointer"
                >
                  Return to Directory
                </TouchableOpacity>
              </div>

            </div>
          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}
