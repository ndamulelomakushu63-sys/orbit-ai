import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ScrollView } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Search, Briefcase, GraduationCap, Award, Building2, 
  FileText, CheckCircle2, Clock, MapPin, DollarSign, Calendar, 
  Upload, Eye, Plus, ChevronRight, X, ExternalLink, Filter, 
  UserCheck, AlertCircle, Share2, Send, Download,
  Phone, Mail, Check, MessageSquare, Navigation, Locate, LocateFixed,
  Target, Info, Image as ImageIcon, ShieldCheck, Compass, HelpCircle, Users,
  Sparkles
} from '../components/Icons';
import { generateProfessionalVacancyPoster } from '../utils/posterGenerator';
import { useAppState } from '../services/state';
import { 
  Opportunity, OpportunityApplication, OpportunityCategory, 
  ApplicationStatus, ApplicationDocument, OpportunityType, OpportunityWorkplace 
} from '../types';
import { 
  dbFetchOpportunities, dbUpsertOpportunity, dbDeleteOpportunity,
  dbFetchOpportunityApplications, dbUpsertOpportunityApplication,
  dbUpdateApplicationStatus, dbUploadOpportunityDocument,
  dbFetchUserStoredDocuments, dbSaveUserStoredDocument,
  calculateDistanceKm, DEFAULT_OPPORTUNITIES, isDirectOrbitOpportunity,
  dbFetchEmployerConversations, dbFetchEmployerUnreadCount, dbFetchApplicantUnreadCount,
  EmployerConversationSummary
} from '../services/supabase';
import { OpportunityProfileView } from '../components/OpportunityProfileView';
import { OpportunityChatModal } from '../components/OpportunityChatModal';

interface OpportunitiesScreenProps {
  onBack?: () => void;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ onBack }) => {
  const { setMobileScreen, currentUser } = useAppState();

  // Navigation / View Tabs - Vision 1: Focused exclusively on JOBS and COLLEGES & UNIVERSITIES
  const [activeTab, setActiveTab] = useState<'jobs' | 'colleges_universities' | 'applications' | 'employer'>('jobs');
  const [searchQuery, setSearchQuery] = useState('');

  // Business-Mode Style Profile View
  const [isProfileView, setIsProfileView] = useState(false);

  // In-App Chat State between Applicants and Employers
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetOpp, setChatTargetOpp] = useState<Opportunity | null>(null);
  const [chatTargetApp, setChatTargetApp] = useState<OpportunityApplication | null>(null);
  const [chatUserRole, setChatUserRole] = useState<'applicant' | 'employer'>('applicant');

  const openInAppChat = (opp: Opportunity, app?: OpportunityApplication | null, role: 'applicant' | 'employer' = 'applicant') => {
    setChatTargetOpp(opp);
    setChatTargetApp(app || null);
    setChatUserRole(role);
    setShowChatModal(true);
  };

  // Near Me / Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  
  // Data States
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDocs, setUserDocs] = useState<ApplicationDocument[]>([]);
  const [taskModeCv, setTaskModeCv] = useState<{ name: string; position: string; text: string; updatedAt: string } | null>(null);

  // Modals & Active Selections
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCvViewerModal, setShowCvViewerModal] = useState<{ title: string; text: string } | null>(null);
  const [selectedAppForReview, setSelectedAppForReview] = useState<OpportunityApplication | null>(null);
  
  // Employer / Recruiter State
  const [employerSelectedOppId, setEmployerSelectedOppId] = useState<string>('');
  const [applicantSearchQuery, setApplicantSearchQuery] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>('All');
  const [showPostVacancyModal, setShowPostVacancyModal] = useState(false);

  // New Vacancy Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newCategory, setNewCategory] = useState<OpportunityCategory>('job');
  const [newType, setNewType] = useState<OpportunityType>('Full-time');
  const [newWorkplace, setNewWorkplace] = useState<OpportunityWorkplace>('On-site');
  const [newLocation, setNewLocation] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newLocationPrecision, setNewLocationPrecision] = useState<'exact' | 'approximate' | 'remote'>('exact');
  const [newCoordinates, setNewCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingEmployerGps, setIsCapturingEmployerGps] = useState(false);
  const [employerGpsStatus, setEmployerGpsStatus] = useState<string | null>(null);
  const [newEmployerEmail, setNewEmployerEmail] = useState(currentUser?.email || '');
  const [newEmployerPhone, setNewEmployerPhone] = useState('');

  // Automatically request GPS location permission when opening the vacancy posting form
  useEffect(() => {
    if (showPostVacancyModal) {
      if (!newEmployerEmail && currentUser?.email) {
        setNewEmployerEmail(currentUser.email);
      }
      if (!newCoordinates && !isCapturingEmployerGps) {
        handleCaptureEmployerGps();
      }
    }
  }, [showPostVacancyModal]);

  // Vacancy Images (3 Options: Upload poster, Upload logo, Generate with Orbit AI)
  const [vacancyImageMode, setVacancyImageMode] = useState<'poster' | 'logo' | 'ai_generate'>('poster');
  const [newPosterImage, setNewPosterImage] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [aiPosterTheme, setAiPosterTheme] = useState<'navy' | 'light' | 'dark'>('navy');
  const [aiGeneratedPosterPreview, setAiGeneratedPosterPreview] = useState<string>('');
  const [isAiGeneratingPoster, setIsAiGeneratingPoster] = useState(false);

  // Requirements & Document rules
  const [newCompensation, setNewCompensation] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newRequiredDocs, setNewRequiredDocs] = useState('CV, ID Copy');
  const [newProofOfResRequired, setNewProofOfResRequired] = useState(false);
  const [newQualificationRequired, setNewQualificationRequired] = useState<'matric' | 'grade9' | 'diploma_degree' | 'other' | 'none'>('matric');
  const [newFaculty, setNewFaculty] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newMinAps, setNewMinAps] = useState('');

  // Application Submission Form State
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantResidentialAddress, setApplicantResidentialAddress] = useState('');
  const [applicantCoordinates, setApplicantCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [applicantLocationStatus, setApplicantLocationStatus] = useState<string | null>(null);
  const [isCapturingApplicantGps, setIsCapturingApplicantGps] = useState(false);
  const [applicantQualificationType, setApplicantQualificationType] = useState<string>('matric');
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [cvSource, setCvSource] = useState<'task_mode' | 'upload' | 'text'>('task_mode');
  const [uploadedCvFile, setUploadedCvFile] = useState<File | null>(null);
  const [applicantCoverNote, setApplicantCoverNote] = useState('');
  const [attachedDocs, setAttachedDocs] = useState<ApplicationDocument[]>([]);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [submissionSuccessNotice, setSubmissionSuccessNotice] = useState(false);
  const [showApplicationReceivedModal, setShowApplicationReceivedModal] = useState(false);
  const [submittedAppInfo, setSubmittedAppInfo] = useState<{
    id: string;
    title: string;
    company: string;
    submittedAt: string;
    docsCount: number;
    hasGps: boolean;
  } | null>(null);

  // Employer Candidate Review Dossier Modal
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierApplicant, setDossierApplicant] = useState<OpportunityApplication | null>(null);

  // Orbit AI University / College Assistant Modal & State
  const [showAiUniAssistant, setShowAiUniAssistant] = useState(false);
  const [uniTargetDegree, setUniTargetDegree] = useState('');
  const [uniStudentBackground, setUniStudentBackground] = useState('');
  const [uniAiGenerating, setUniAiGenerating] = useState(false);
  const [uniGeneratedLetter, setUniGeneratedLetter] = useState('');
  
  // APS Calculator State
  const [showApsCalc, setShowApsCalc] = useState(false);
  const [apsScores, setApsScores] = useState<Record<string, number>>({
    'English (HL/FAL)': 65,
    'Mathematics / Math Lit': 70,
    'Physical Sciences': 68,
    'Life Sciences / Accounting': 64,
    'Elective Subject 1': 60,
    'Elective Subject 2': 62
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterUploadInputRef = useRef<HTMLInputElement>(null);
  const logoUploadInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const qualDocInputRef = useRef<HTMLInputElement>(null);
  const resDocInputRef = useRef<HTMLInputElement>(null);
  const extraDocInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  useEffect(() => {
    loadData();
    loadStoredCvAndDocs();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const opps = await dbFetchOpportunities();
      setOpportunities(opps);
      
      const apps = await dbFetchOpportunityApplications(currentUser?.uid);
      setApplications(apps);
    } catch (e) {
      console.warn("Failed to load opportunities:", e);
      setOpportunities(DEFAULT_OPPORTUNITIES);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredCvAndDocs = () => {
    try {
      const rawCv = localStorage.getItem('orbit_user_cv');
      if (rawCv) {
        setTaskModeCv(JSON.parse(rawCv));
      }
      const docs = dbFetchUserStoredDocuments(currentUser?.uid || 'guest');
      setUserDocs(docs);
      setAttachedDocs(docs);
    } catch (e) {
      console.warn("Failed to load CV or documents:", e);
    }
  };

  // Helper: calculate distance for opportunity from user coords
  const getOppDistance = (opp: Opportunity): number | null => {
    if (!userLocation || !opp.coordinates) return null;
    return calculateDistanceKm(userLocation.lat, userLocation.lng, opp.coordinates.lat, opp.coordinates.lng);
  };

  // Helper: fallback image for categories
  const getCategoryFallbackImage = (category: OpportunityCategory): string => {
    switch (category) {
      case 'job':
        return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80';
      case 'internship':
        return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80';
      case 'learnership':
        return 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80';
      case 'scholarship':
        return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';
      case 'university':
        return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';
      default:
        return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';
    }
  };

  // Toggle Near Me
  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setNearMeActive(true);
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setIsLocating(false);
        setLocationError(
          error.code === 1
            ? "Location access was denied. You can still browse by city or province."
            : "Could not retrieve your physical location. Please check browser settings."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Category counts for Vision 1 main tabs
  const jobCount = useMemo(() => {
    return opportunities.filter(opp => 
      opp.category === 'job' || opp.category === 'government' || opp.category === 'training' || opp.category === 'learnership' || opp.category === 'internship'
    ).length;
  }, [opportunities]);

  const uniCount = useMemo(() => {
    return opportunities.filter(opp => opp.category === 'university' || opp.category === 'tvet').length;
  }, [opportunities]);

  // Filtered Opportunities List - Vision 1
  const filteredOpportunities = useMemo(() => {
    let list = opportunities.filter(opp => {
      // Vision 1: Only JOBS and COLLEGES & UNIVERSITIES
      if (activeTab === 'jobs') {
        const isJobCategory = 
          opp.category === 'job' || 
          opp.category === 'government' || 
          opp.category === 'training' ||
          opp.category === 'learnership' ||
          opp.category === 'internship';

        if (!isJobCategory) return false;
      } else if (activeTab === 'colleges_universities') {
        const isUniOrCollege = opp.category === 'university' || opp.category === 'tvet';
        if (!isUniOrCollege) return false;
      }

      // Search Query across title, company, department, course, institution, skills, etc.
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = opp.title.toLowerCase().includes(q);
        const inCompany = opp.companyOrInstitution.toLowerCase().includes(q);
        const inLoc = opp.location.toLowerCase().includes(q);
        const inAddress = opp.address ? opp.address.toLowerCase().includes(q) : false;
        const inCity = opp.city ? opp.city.toLowerCase().includes(q) : false;
        const inProvince = opp.province ? opp.province.toLowerCase().includes(q) : false;
        const inDesc = opp.description.toLowerCase().includes(q);
        const inReqs = opp.requirements.some(r => r.toLowerCase().includes(q));
        const inCourse = opp.institutionCourse ? opp.institutionCourse.toLowerCase().includes(q) : false;
        const inFaculty = opp.institutionFaculty ? opp.institutionFaculty.toLowerCase().includes(q) : false;
        const inWorkplace = opp.workplaceType ? opp.workplaceType.toLowerCase().includes(q) : false;
        const inType = opp.opportunityType ? opp.opportunityType.toLowerCase().includes(q) : false;
        if (!inTitle && !inCompany && !inLoc && !inAddress && !inCity && !inProvince && !inDesc && !inReqs && !inCourse && !inFaculty && !inWorkplace && !inType) return false;
      }

      return true;
    });

    // If Near Me is active and user coordinates are available, sort by distance
    if (nearMeActive && userLocation) {
      list = [...list].sort((a, b) => {
        const distA = a.coordinates 
          ? calculateDistanceKm(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng)
          : 999999;
        const distB = b.coordinates 
          ? calculateDistanceKm(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng)
          : 999999;
        return distA - distB;
      });
    }

    return list;
  }, [opportunities, activeTab, searchQuery, nearMeActive, userLocation]);

  // Employer Posted Opportunities
  const employerOpportunities = useMemo(() => {
    // Return all opportunities created by user, or default to all if test recruiter
    const userOpps = opportunities.filter(o => o.creatorId === currentUser?.uid);
    return userOpps.length > 0 ? userOpps : opportunities;
  }, [opportunities, currentUser]);

  // Set default selected opportunity for employer review
  useEffect(() => {
    if (!employerSelectedOppId && employerOpportunities.length > 0) {
      setEmployerSelectedOppId(employerOpportunities[0].id);
    }
  }, [employerOpportunities, employerSelectedOppId]);

  // Employer Applicants for selected opportunity
  const [currentOppApplicants, setCurrentOppApplicants] = useState<OpportunityApplication[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  useEffect(() => {
    if (!employerSelectedOppId) return;
    const fetchApplicants = async () => {
      setLoadingApplicants(true);
      try {
        const apps = await dbFetchOpportunityApplications(undefined, employerSelectedOppId);
        setCurrentOppApplicants(apps);
      } catch (err) {
        console.warn("Failed to load applicants for opp:", err);
      } finally {
        setLoadingApplicants(false);
      }
    };
    fetchApplicants();
  }, [employerSelectedOppId]);

  // Filtered applicants for employer dashboard
  const filteredApplicants = useMemo(() => {
    return currentOppApplicants.filter(app => {
      if (applicantStatusFilter !== 'All' && app.status !== applicantStatusFilter) {
        return false;
      }
      if (applicantSearchQuery.trim()) {
        const q = applicantSearchQuery.toLowerCase();
        const inName = app.applicantName.toLowerCase().includes(q);
        const inEmail = app.applicantEmail.toLowerCase().includes(q);
        const inNotes = app.coverNote ? app.coverNote.toLowerCase().includes(q) : false;
        const inCv = app.cvText ? app.cvText.toLowerCase().includes(q) : false;
        if (!inName && !inEmail && !inNotes && !inCv) return false;
      }
      return true;
    });
  }, [currentOppApplicants, applicantStatusFilter, applicantSearchQuery]);

  // Employer Conversations & Unread Message State
  const [employerPortalSubTab, setEmployerPortalSubTab] = useState<'candidates' | 'conversations'>('candidates');
  const [employerConversations, setEmployerConversations] = useState<EmployerConversationSummary[]>([]);
  const [unreadEmployerCount, setUnreadEmployerCount] = useState<number>(0);
  const [unreadApplicantCount, setUnreadApplicantCount] = useState<number>(0);
  const [applicantUnreadOppIds, setApplicantUnreadOppIds] = useState<string[]>([]);

  const refreshChatCountsAndThreads = useCallback(async () => {
    try {
      const oppIds = employerOpportunities.map(o => o.id);
      if (oppIds.length > 0) {
        const convs = await dbFetchEmployerConversations(oppIds);
        setEmployerConversations(convs);
        const empUnread = await dbFetchEmployerUnreadCount(oppIds);
        setUnreadEmployerCount(empUnread);
      }

      const applicantId = currentUser?.uid || currentUser?.email || localStorage.getItem('orbit_applicant_id') || 'applicant';
      const local = localStorage.getItem('orbit_opportunity_messages');
      const list = local ? JSON.parse(local) : [];
      const unreadForApplicant = list.filter((m: any) => 
        (m.applicantId === applicantId || m.applicantEmail === applicantId || m.recipientId === applicantId) &&
        m.senderRole === 'employer' &&
        !m.read
      );
      setUnreadApplicantCount(unreadForApplicant.length);
      setApplicantUnreadOppIds(Array.from(new Set(unreadForApplicant.map((m: any) => m.opportunityId))));
    } catch (e) {
      console.warn("Failed refreshing chat counts", e);
    }
  }, [employerOpportunities, currentUser]);

  useEffect(() => {
    refreshChatCountsAndThreads();
    const timer = setInterval(() => {
      refreshChatCountsAndThreads();
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshChatCountsAndThreads]);

  // APS Calculator Logic (South African NSC standard)
  const calculateTotalAps = () => {
    let total = 0;
    Object.values(apsScores).forEach(score => {
      if (score >= 80) total += 7;
      else if (score >= 70) total += 6;
      else if (score >= 60) total += 5;
      else if (score >= 50) total += 4;
      else if (score >= 40) total += 3;
      else if (score >= 30) total += 2;
      else total += 1;
    });
    return total;
  };

  // Document Upload Handler (ID, Proof of Residence, Matric, etc.)
  const handleFileUpload = async (file: File, docType: 'id' | 'residence' | 'matric' | 'qualification' | 'transcript' | 'cv' | 'other', customLabel?: string) => {
    const sizeStr = `${(file.size / 1024).toFixed(0)} KB`;
    const dataUrl = await dbUploadOpportunityDocument(file);
    const newDoc: ApplicationDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: customLabel ? `${customLabel} - ${file.name}` : file.name,
      type: docType,
      dataUrl: dataUrl || undefined,
      sizeStr,
      uploadedAt: new Date().toISOString()
    };

    // Save to user storage
    dbSaveUserStoredDocument(currentUser?.uid || 'guest', newDoc);
    setUserDocs(prev => [...prev.filter(d => d.type !== docType), newDoc]);
    setAttachedDocs(prev => [...prev.filter(d => !(d.type === docType && !customLabel)), newDoc]);
  };

  // Employer GPS Capture - requests real device GPS permission and coordinates
  const handleCaptureEmployerGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setEmployerGpsStatus("Location services are not available on this device. Please enter physical address or city below.");
      return;
    }
    setIsCapturingEmployerGps(true);
    setEmployerGpsStatus("Requesting device GPS permission...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) };
        setNewCoordinates(coords);
        setIsCapturingEmployerGps(false);
        setEmployerGpsStatus(`GPS Captured: ${coords.lat}, ${coords.lng}`);
        setNewLocationPrecision('exact');

        // Optional reverse geocode to automatically fill city or address if empty
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14`, {
            headers: { 'Accept': 'application/json' }
          });
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.suburb || addr.municipality || '';
            const detectedRoad = addr.road ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}` : '';
            if (detectedRoad && !newAddress) setNewAddress(detectedRoad);
            if (detectedCity && !newCity) setNewCity(detectedCity);
            if (!newLocation && (detectedRoad || detectedCity)) {
              setNewLocation([detectedRoad, detectedCity].filter(Boolean).join(', '));
            }
          }
        } catch (_) {}
      },
      (err) => {
        setIsCapturingEmployerGps(false);
        setNewCoordinates(null);
        if (err.code === 1) {
          setEmployerGpsStatus("Location permission was denied. Please enter the physical address or city below.");
        } else if (err.code === 2) {
          setEmployerGpsStatus("Device location is unavailable. Please enter the physical address or city below.");
        } else if (err.code === 3) {
          setEmployerGpsStatus("Location request timed out. Please enter the physical address or city below.");
        } else {
          setEmployerGpsStatus("GPS location unavailable. Please enter the physical address or city below.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Quick preset for major South African economic nodes
  const handleSelectHubPreset = (name: string, city: string, prov: string, lat: number, lng: number) => {
    setNewAddress(name);
    setNewCity(city);
    setNewProvince(prov);
    setNewLocation(`${city}, ${prov}`);
    setNewCoordinates({ lat, lng });
    setNewLocationPrecision('exact');
    setEmployerGpsStatus(`Pinned to ${name} (${lat}, ${lng})`);
  };

  // AI Poster Generator
  const handleTriggerAiPoster = (themeChoice?: 'navy' | 'light' | 'dark') => {
    const theme = themeChoice || aiPosterTheme;
    setIsAiGeneratingPoster(true);

    const reqArray = newRequirements
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    try {
      const generatedDataUrl = generateProfessionalVacancyPoster({
        title: newTitle.trim() || 'Job Opportunity',
        company: newCompany.trim() || 'Orbit Recruiter',
        category: newCategory,
        location: newCity.trim() || newLocation.trim() || 'South Africa',
        workplaceType: newWorkplace,
        compensation: newCompensation.trim() || undefined,
        requirements: reqArray.length > 0 ? reqArray : ['Relevant Qualification', 'Proactive Work Ethic', 'Clear Communication'],
        deadline: newDeadline || undefined,
        theme
      });

      setAiGeneratedPosterPreview(generatedDataUrl);
      setNewPosterImage(generatedDataUrl);
    } catch (e) {
      console.warn("Failed to generate poster:", e);
    } finally {
      setIsAiGeneratingPoster(false);
    }
  };

  // Applicant Location / GPS Capture
  const handleCaptureApplicantGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturingApplicantGps(true);
    setApplicantLocationStatus("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) };
        setApplicantCoordinates(coords);
        setIsCapturingApplicantGps(false);
        
        let distNotice = "";
        if (selectedOpp?.coordinates) {
          const dist = calculateDistanceKm(coords.lat, coords.lng, selectedOpp.coordinates.lat, selectedOpp.coordinates.lng);
          distNotice = ` (${dist} km from vacancy location)`;
        }
        setApplicantLocationStatus(`Location Verified: ${coords.lat}, ${coords.lng}${distNotice}`);
      },
      (err) => {
        setIsCapturingApplicantGps(false);
        setApplicantLocationStatus(null);
        alert("Could not access location. Please ensure your device location is enabled or enter your residential address.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Dynamic Required Documents for Selected Opportunity
  const currentOppDocRequirements = useMemo(() => {
    if (!selectedOpp) return [];
    const list: Array<{
      id: string;
      type: 'cv' | 'id' | 'matric' | 'qualification' | 'residence' | 'other';
      label: string;
      sublabel: string;
      required: boolean;
    }> = [];

    // 1. CV (always for job, internship, learnership; optional for direct university listings)
    list.push({
      id: 'doc-cv',
      type: 'cv',
      label: 'Curriculum Vitae (CV)',
      sublabel: 'Comprehensive resume with employment & education history',
      required: selectedOpp.category !== 'university'
    });

    // 2. ID / Passport (South African legal standard)
    list.push({
      id: 'doc-id',
      type: 'id',
      label: 'ID Document / Passport',
      sublabel: 'Clear certified copy of green ID book, smart card, or passport',
      required: true
    });

    // 3. Qualification: Matric OR Grade 9 OR Tertiary
    const reqText = (selectedOpp.requirements || []).join(' ').toLowerCase() + ' ' + selectedOpp.title.toLowerCase();
    const isGrade9 = selectedOpp.qualificationRequired === 'grade9' || /grade\s*9|standard\s*7|general\s*worker/i.test(reqText);
    const isDegree = selectedOpp.qualificationRequired === 'diploma_degree' || /degree|diploma|btech|bcom|bsc|honours/i.test(reqText);

    if (selectedOpp.category === 'university') {
      list.push({
        id: 'doc-matric',
        type: 'matric',
        label: 'Matric Certificate / Statement of Results',
        sublabel: 'Official NSC or IEB statement with final subject breakdown',
        required: true
      });
    } else if (isGrade9) {
      list.push({
        id: 'doc-qual',
        type: 'qualification',
        label: 'Grade 9 / Highest School Report',
        sublabel: 'Official school report or entry qualification document',
        required: true
      });
    } else if (isDegree) {
      list.push({
        id: 'doc-qual',
        type: 'qualification',
        label: 'Tertiary Qualification / Academic Record',
        sublabel: 'Certified diploma/degree certificate or full academic transcript',
        required: true
      });
    } else {
      list.push({
        id: 'doc-matric',
        type: 'matric',
        label: 'Matric Certificate / Grade 12',
        sublabel: 'Certified copy of Senior Certificate (NSC/SC)',
        required: true
      });
    }

    // 4. Proof of Residence (when required)
    const isResRequired = selectedOpp.proofOfResidenceRequired ||
      selectedOpp.category === 'learnership' ||
      selectedOpp.category === 'scholarship' ||
      /proof of res|municipal|residence|councillor|local resident/i.test(reqText);

    if (isResRequired) {
      list.push({
        id: 'doc-res',
        type: 'residence',
        label: 'Proof of Residence',
        sublabel: 'Utility bill, bank statement, or councillor letter (not older than 3 months)',
        required: true
      });
    }

    // 5. Additional Vacancy-Specific Documents
    if (selectedOpp.requiredDocuments && selectedOpp.requiredDocuments.length > 0) {
      selectedOpp.requiredDocuments.forEach((docName, idx) => {
        const lower = docName.toLowerCase();
        if (lower.includes('cv') || lower.includes('id') || lower.includes('matric') || lower.includes('residence')) return;
        list.push({
          id: `doc-custom-${idx}`,
          type: 'other',
          label: docName,
          sublabel: `Requested by ${selectedOpp.companyOrInstitution}`,
          required: true
        });
      });
    } else if (/driver|license|code\s*(8|10|14)/i.test(reqText)) {
      list.push({
        id: 'doc-driver',
        type: 'other',
        label: "Valid Driver's License Copy",
        sublabel: 'Certified front and back copy of driver’s card',
        required: true
      });
    }

    return list;
  }, [selectedOpp]);

  // Dynamic Screening Questions for Selected Opportunity
  const currentOppScreeningQuestions = useMemo(() => {
    if (!selectedOpp) return [];
    if (selectedOpp.screeningQuestions && selectedOpp.screeningQuestions.length > 0) {
      return selectedOpp.screeningQuestions;
    }

    const questions: Array<{
      id: string;
      question: string;
      type: 'text' | 'yes_no' | 'choice';
      options?: string[];
      required: boolean;
    }> = [];

    const reqCombined = (selectedOpp.requirements || []).join(' ').toLowerCase();

    // Driver's License check
    if (/driver|license|code\s*(8|10|14)/i.test(reqCombined)) {
      questions.push({
        id: 'sq_driver_license',
        question: 'Do you hold a valid, unendorsed South African Driver’s License?',
        type: 'yes_no',
        required: true
      });
    }

    // Commute check (if on-site or hybrid)
    if (selectedOpp.workplaceType === 'On-site' || selectedOpp.workplaceType === 'Hybrid') {
      const locLabel = selectedOpp.city || selectedOpp.location || 'the workplace';
      questions.push({
        id: 'sq_commute',
        question: `Are you able to reliably commute to ${locLabel} on scheduled working days?`,
        type: 'yes_no',
        required: true
      });
    }

    // Learnership check
    if (selectedOpp.category === 'learnership') {
      questions.push({
        id: 'sq_learnership_citizen_age',
        question: 'Are you a South African citizen between the ages of 18 and 35?',
        type: 'yes_no',
        required: true
      });
      questions.push({
        id: 'sq_learnership_unemployed',
        question: 'Are you currently unemployed and not enrolled in another SETA-funded learnership or full-time study?',
        type: 'yes_no',
        required: true
      });
    } else if (selectedOpp.category === 'university') {
      if (selectedOpp.minApsScore) {
        questions.push({
          id: 'sq_aps_score',
          question: `What is your final or provisional Grade 12 APS score? (Minimum required: ${selectedOpp.minApsScore} points)`,
          type: 'text',
          required: true
        });
      }
    } else if (selectedOpp.category === 'scholarship') {
      questions.push({
        id: 'sq_bursary_status',
        question: 'Are you currently receiving any other full bursary or NSFAS financial award for this academic year?',
        type: 'choice',
        options: ['No other funding', 'Partial grant', 'Full bursary / NSFAS', 'Awaiting outcome'],
        required: true
      });
    }

    // Experience question for standard jobs
    if (selectedOpp.category === 'job') {
      questions.push({
        id: 'sq_experience_years',
        question: 'How many years of relevant experience do you have in this field or role?',
        type: 'choice',
        options: ['0 - 1 year (Entry Level)', '1 - 3 years', '3 - 5 years', '5+ years (Senior)'],
        required: true
      });
    }

    // Earliest availability
    questions.push({
      id: 'sq_availability',
      question: 'What is your earliest available start date or required notice period?',
      type: 'choice',
      options: ['Immediately available', '1 to 2 weeks', '30 days / 1 calendar month', 'Specific start date'],
      required: true
    });

    return questions;
  }, [selectedOpp]);

  // Submit Application
  const handleSubmitApplication = async () => {
    if (!selectedOpp) return;
    if (!applicantName.trim()) {
      alert("Please provide your full name and surname.");
      return;
    }
    if (!applicantEmail.trim()) {
      alert("Please provide your contact email address.");
      return;
    }
    if (!applicantPhone.trim()) {
      alert("Please provide your phone / WhatsApp number so the recruiter can reach you.");
      return;
    }

    // Check mandatory document requirements
    const missingDocs: string[] = [];
    currentOppDocRequirements.forEach(req => {
      if (!req.required) return;
      if (req.type === 'cv') {
        const hasCv = (cvSource === 'task_mode' && taskModeCv) || (cvSource === 'upload' && uploadedCvFile) || attachedDocs.some(d => d.type === 'cv');
        if (!hasCv) missingDocs.push(req.label);
      } else if (req.type === 'id') {
        if (!attachedDocs.some(d => d.type === 'id')) missingDocs.push(req.label);
      } else if (req.type === 'matric') {
        if (!attachedDocs.some(d => d.type === 'matric')) missingDocs.push(req.label);
      } else if (req.type === 'qualification') {
        if (!attachedDocs.some(d => d.type === 'qualification' || d.type === 'matric' || d.type === 'transcript')) missingDocs.push(req.label);
      } else if (req.type === 'residence') {
        if (!attachedDocs.some(d => d.type === 'residence')) missingDocs.push(req.label);
      } else if (req.type === 'other') {
        if (!attachedDocs.some(d => d.name.toLowerCase().includes(req.label.toLowerCase().slice(0, 5)))) missingDocs.push(req.label);
      }
    });

    if (missingDocs.length > 0) {
      alert(`Please attach the required document(s):\n• ${missingDocs.join('\n• ')}`);
      return;
    }

    // Check mandatory screening questions
    const unansweredQuestions: string[] = [];
    currentOppScreeningQuestions.forEach(q => {
      if (q.required && (!screeningAnswers[q.id] || !screeningAnswers[q.id].trim())) {
        unansweredQuestions.push(q.question);
      }
    });

    if (unansweredQuestions.length > 0) {
      alert(`Please answer the following screening question(s):\n• ${unansweredQuestions.slice(0, 2).join('\n• ')}`);
      return;
    }

    setIsSubmittingApp(true);
    try {
      let finalCvText = "";
      let finalCvFileName = "";

      if (cvSource === 'task_mode' && taskModeCv) {
        finalCvText = taskModeCv.text;
        finalCvFileName = `${taskModeCv.name || 'Candidate'}_CV_TaskMode.pdf`;
      } else if (uploadedCvFile) {
        finalCvFileName = uploadedCvFile.name;
        finalCvText = `[Uploaded CV Document: ${uploadedCvFile.name} attached in application documents]`;
      } else if (taskModeCv) {
        finalCvText = taskModeCv.text;
        finalCvFileName = `${taskModeCv.name || 'Candidate'}_CV.pdf`;
      }

      // Calculate AI candidate criteria match summary to help employer
      const matchedCriteria: string[] = [];
      const combinedProfile = `${applicantCoverNote} ${finalCvText} ${applicantName} ${Object.values(screeningAnswers).join(' ')}`.toLowerCase();
      selectedOpp.requirements.forEach(req => {
        const words = req.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const matchFound = words.some(w => combinedProfile.includes(w));
        if (matchFound) matchedCriteria.push(req);
      });

      const matchRatio = selectedOpp.requirements.length > 0 
        ? matchedCriteria.length / selectedOpp.requirements.length 
        : 1;

      const matchRating = matchRatio >= 0.6 ? 'Strong Match' : matchRatio >= 0.3 ? 'Moderate Match' : 'Potential Match';

      const newApp: OpportunityApplication = {
        id: `app-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        opportunityId: selectedOpp.id,
        opportunityTitle: selectedOpp.title,
        opportunityCompany: selectedOpp.companyOrInstitution,
        opportunityCategory: selectedOpp.category,
        applicantId: currentUser?.uid || `guest-${Date.now()}`,
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        applicantPhone: applicantPhone.trim(),
        residentialAddress: applicantResidentialAddress.trim() || undefined,
        applicantCoordinates: applicantCoordinates || undefined,
        applicantLocationName: applicantLocationStatus || undefined,
        qualificationType: applicantQualificationType,
        screeningAnswers,
        cvText: finalCvText,
        cvFileName: finalCvFileName || 'Candidate_CV.pdf',
        coverNote: applicantCoverNote.trim() || undefined,
        documents: attachedDocs,
        selectedInstitution: selectedOpp.category === 'university' ? selectedOpp.companyOrInstitution : undefined,
        selectedCourse: selectedOpp.institutionCourse,
        apsCalculated: selectedOpp.category === 'university' ? calculateTotalAps() : undefined,
        status: 'Submitted',
        statusNotes: 'Application received and securely registered.',
        aiMatchEvaluation: {
          matchRating: matchRating as any,
          matchedRequirements: matchedCriteria,
          gapHighlights: selectedOpp.requirements.filter(r => !matchedCriteria.includes(r)),
          summary: `Applicant profile shows alignment with ${matchedCriteria.length} of ${selectedOpp.requirements.length} listed specifications.`
        },
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbUpsertOpportunityApplication(newApp);

      // Refresh applications list
      const updated = await dbFetchOpportunityApplications(currentUser?.uid);
      setApplications(updated);

      // Update local opportunity applicant count
      setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, applicantCount: (o.applicantCount || 0) + 1 } : o));

      setShowApplyModal(false);
      setSubmittedAppInfo({
        id: newApp.id,
        title: selectedOpp.title,
        company: selectedOpp.companyOrInstitution,
        submittedAt: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        docsCount: attachedDocs.length + (cvSource === 'task_mode' && taskModeCv ? 1 : 0),
        hasGps: !!applicantCoordinates
      });
      setShowApplicationReceivedModal(true);
      setSubmissionSuccessNotice(true);
      setTimeout(() => setSubmissionSuccessNotice(false), 6000);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Could not complete submission. Please try again.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Employer Vacancy Creation
  const handleCreateVacancy = async () => {
    if (!newTitle.trim() || !newCompany.trim() || !newDescription.trim()) {
      alert("Please fill in Job Title, Company or Business Name, and Job Description.");
      return;
    }

    const reqArray = newRequirements.trim()
      ? newRequirements
          .split('\n')
          .map(r => r.trim())
          .filter(r => r.length > 0)
      : [];

    const finalLocation = newAddress.trim() && newCity.trim()
      ? `${newAddress.trim()}, ${newCity.trim()}`
      : newAddress.trim() || newCity.trim() || newLocation.trim() || 'South Africa';

    const newOpp: Opportunity = {
      id: `opp-custom-${Date.now()}`,
      creatorId: currentUser?.uid || 'recruiter',
      creatorName: newCompany.trim(),
      creatorEmail: newEmployerEmail.trim() || currentUser?.email || 'recruiter@orbitai.co.za',
      creatorPhone: newEmployerPhone.trim() || undefined,
      title: newTitle.trim(),
      companyOrInstitution: newCompany.trim(),
      category: newCategory || 'job',
      opportunityType: newType || 'Full-time',
      workplaceType: newWorkplace || 'On-site',
      location: finalLocation,
      address: newAddress.trim() || undefined,
      city: newCity.trim() || undefined,
      province: newProvince.trim() || undefined,
      country: 'South Africa',
      locationPrecision: newCoordinates ? 'exact' : 'approximate',
      coordinates: newCoordinates || undefined,
      posterImage: undefined,
      logoUrl: undefined,
      proofOfResidenceRequired: false,
      qualificationRequired: 'matric',
      description: newDescription.trim(),
      requirements: reqArray.length > 0 ? reqArray : ['Relevant experience or qualification', 'Reliable work ethic'],
      compensationOrGrant: newCompensation.trim() || 'Market Related',
      deadline: newDeadline || '2026-12-31',
      requiredDocuments: ['CV / Resume'],
      createdAt: new Date().toISOString(),
      status: 'Open',
      applicantCount: 0
    };

    await dbUpsertOpportunity(newOpp);
    setOpportunities(prev => [newOpp, ...prev]);
    setShowPostVacancyModal(false);

    // Reset Form
    setNewTitle('');
    setNewCompany('');
    setNewDescription('');
    setNewRequirements('');
    setNewCompensation('');
    setNewLocation('');
    setNewAddress('');
    setNewCity('');
    setNewProvince('');
    setNewCoordinates(null);
    setEmployerGpsStatus(null);
    setNewEmployerPhone('');
    alert("Vacancy published successfully!");
  };

  // Orbit AI Motivation / Statement of Purpose Generator for Universities
  const handleGenerateUniMotivation = async () => {
    if (!uniTargetDegree.trim()) {
      alert("Please enter the degree or course you are applying for.");
      return;
    }

    setUniAiGenerating(true);
    try {
      const response = await fetch('/api/task-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'email',
          inputs: {
            purpose: `Draft a formal, inspiring, and persuasive Academic Personal Statement and Motivation Letter for university admissions for a South African student applying for ${uniTargetDegree}. Student background & passions: ${uniStudentBackground || 'Dedicated matric graduate with strong analytical mindset, committed to academic excellence and community impact'}. Follow South African university standards (e.g. UCT, Wits, UP, TUT).`,
            recipient: 'Admissions Committee & Dean of Faculty',
            tone: 'Formal, Academic, Inspiring and Professional'
          }
        })
      });

      const data = await response.json();
      if (data.result) {
        setUniGeneratedLetter(data.result);
        setApplicantCoverNote(data.result);
      }
    } catch (err) {
      console.warn("AI generation fallback:", err);
      const fallback = `Dear Admissions Committee,\n\nI am writing to formally express my profound enthusiasm for admission into the ${uniTargetDegree} program. Throughout my high school studies, I have cultivated a rigorous intellectual curiosity and a passionate commitment to this discipline.\n\nMy academic record in Mathematics and Sciences reflects my dedication to rigorous inquiry. Furthermore, I believe this institution's cutting-edge curriculum and esteemed faculty offer the ideal environment for me to advance my skills and contribute meaningfully to South Africa's technological and social landscape.\n\nThank you for considering my application. I look forward to the privilege of contributing to your academic community.\n\nSincerely,\n${applicantName || 'Applicant'}`;
      setUniGeneratedLetter(fallback);
      setApplicantCoverNote(fallback);
    } finally {
      setUniAiGenerating(false);
    }
  };

  // Badge Helper distinguishing Orbit Direct Apply vs Official Portals vs Higher Ed
  const renderCategoryBadge = (opp: Opportunity) => {
    if (isDirectOrbitOpportunity(opp)) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Orbit Direct Apply
        </span>
      );
    }
    if (opp.category === 'university' || opp.category === 'tvet') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-amber-900 border border-amber-200/80 backdrop-blur-xs flex items-center gap-1 shadow-2xs">
          <GraduationCap className="w-3 h-3 text-amber-700" />
          {opp.category === 'tvet' ? 'TVET College' : 'University Admissions'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-slate-800 border border-slate-200/80 backdrop-blur-xs flex items-center gap-1 shadow-2xs">
        <Building2 className="w-3 h-3 text-slate-600" />
        Official Portal
      </span>
    );
  };

  // Status Badge Helper for Application Tracking
  const renderStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'Submitted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Submitted</span>;
      case 'Under Review':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Under Review</span>;
      case 'Shortlisted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Shortlisted</span>;
      case 'Interview':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Interview Stage</span>;
      case 'Accepted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case 'Not Selected':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Not Selected</span>;
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden justify-between relative">
      {/* 1. TOP HEADER (Simple, Premium, Vision 1 - Top Left: Title + Tagline | Top Right: Employer Portal) */}
      <View className="h-[62px] px-4 sm:px-6 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none relative z-20">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity
            onClick={() => onBack ? onBack() : setMobileScreen('chat')}
            className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-full transition cursor-pointer"
            title="Back to Orbit AI"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </TouchableOpacity>
          <View className="flex flex-col text-left">
            <Text className="font-extrabold text-lg sm:text-xl text-black font-sans tracking-tight">
              OPPORTUNITIES
            </Text>
          </View>
        </View>

        {/* Top Right: Employer Portal Entry & Applications */}
        <View className="flex flex-row items-center gap-2">
          {applications.length > 0 && (
            <TouchableOpacity
              onClick={() => {
                setActiveTab('applications');
                setIsProfileView(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === 'applications'
                  ? 'bg-black text-white'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-black border border-neutral-200'
              }`}
            >
              <span>My Applications</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                {applications.length}
              </span>
              {unreadApplicantCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onClick={() => {
              setActiveTab(activeTab === 'employer' ? 'jobs' : 'employer');
              setIsProfileView(false);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs ${
              activeTab === 'employer'
                ? 'bg-black text-white'
                : 'bg-black hover:bg-neutral-800 text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-white" />
            <span>{activeTab === 'employer' ? 'Exit Employer Portal' : 'Employer Portal'}</span>
            {unreadEmployerCount > 0 && activeTab !== 'employer' && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                {unreadEmployerCount}
              </span>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SUBMISSION SUCCESS BANNER */}
      {submissionSuccessNotice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 font-medium flex items-center justify-between animate-fade-in z-30">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Application submitted successfully! Track status in "My Applications".
          </span>
          <button onClick={() => setSubmissionSuccessNotice(false)} className="text-white hover:text-emerald-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 bg-white">
        {/* ========================================================================= */}
        {/* EXPLORER / CANDIDATE VIEW */}
        {/* ========================================================================= */}
        {activeTab !== 'employer' && activeTab !== 'applications' && (
          isProfileView && selectedOpp ? (
            <OpportunityProfileView
              opportunity={selectedOpp}
              onBack={() => setIsProfileView(false)}
              onApply={() => {
                setApplicantName(currentUser?.name || '');
                setApplicantEmail(currentUser?.email || '');
                setShowApplyModal(true);
              }}
              onChat={() => openInAppChat(selectedOpp, undefined, 'applicant')}
              onOpenApsCalc={() => setShowApsCalc(true)}
              distanceKm={getOppDistance(selectedOpp)}
            />
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              {/* 1. Main Search Experience: Simple & Prominent */}
              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search opportunities by title, company, department, course, institution, skills, etc."
                    className="w-full pl-12 pr-10 py-3.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-sm text-black placeholder:text-neutral-500 outline-none focus:border-black focus:bg-white transition shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-black cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Directly underneath the search: Near Me */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={handleToggleNearMe}
                    disabled={isLocating}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      nearMeActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLocating
                        ? 'bg-neutral-100 text-black border border-neutral-300'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-200'
                    }`}
                    title="Use Near Me for location-based discovery/GPS functionality"
                  >
                    {isLocating ? (
                      <>
                        <Locate className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span className="text-black">Locating...</span>
                      </>
                    ) : nearMeActive ? (
                      <>
                        <LocateFixed className="w-3.5 h-3.5 text-white" />
                        <span>Near Me (Active)</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-black">Near Me</span>
                      </>
                    )}
                  </button>

                  {nearMeActive && (
                    <button
                      type="button"
                      onClick={() => setNearMeActive(false)}
                      className="text-xs text-neutral-500 hover:text-black underline cursor-pointer"
                    >
                      Reset location
                    </button>
                  )}
                </div>

                {/* Geolocation Feedback / Error Message */}
                {locationError && (
                  <div className="px-3.5 py-2 bg-neutral-100 border border-neutral-300 rounded-xl flex items-center justify-between text-xs text-black">
                    <span>{locationError}</span>
                    <button onClick={() => setLocationError(null)} className="text-black hover:text-neutral-700 font-bold cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ONLY AFTER THE SEARCH + NEAR ME AREA:
                  Place the two main sections:
                  EMPLOYMENT          EDUCATION
                  These must NOT be cards or large boxes.
                  They should look like clean navigation tabs/sections using typography and subtle spacing/dividers.
                  The user should immediately understand:
                  Employment = Jobs
                  Education = Colleges & Universities
              */}
              <div className="flex items-center justify-between border-b border-neutral-200 pt-2">
                <div className="flex items-center gap-8 sm:gap-12">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('jobs');
                      setIsProfileView(false);
                    }}
                    className={`pb-3 text-sm font-extrabold tracking-wider transition cursor-pointer flex items-center gap-2 relative ${
                      activeTab === 'jobs'
                        ? 'text-black'
                        : 'text-neutral-400 hover:text-black font-bold'
                    }`}
                    id="tab-employment"
                  >
                    <span className="text-black">EMPLOYMENT</span>
                    {activeTab === 'jobs' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('colleges_universities');
                      setIsProfileView(false);
                    }}
                    className={`pb-3 text-sm font-extrabold tracking-wider transition cursor-pointer flex items-center gap-2 relative ${
                      activeTab === 'colleges_universities'
                        ? 'text-black'
                        : 'text-neutral-400 hover:text-black font-bold'
                    }`}
                    id="tab-education"
                  >
                    <span className="text-black">EDUCATION</span>
                    {activeTab === 'colleges_universities' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                    )}
                  </button>
                </div>

                {activeTab === 'colleges_universities' && (
                  <button
                    type="button"
                    onClick={() => setShowApsCalc(true)}
                    className="pb-3 text-xs font-bold text-black hover:text-neutral-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <GraduationCap className="w-4 h-4 text-black" />
                    <span>APS Calculator</span>
                  </button>
                )}
              </div>

              {/* Opportunities Count Header */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-black">
                  {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Available
                </span>
              </div>

              {/* Opportunities List: Spacious, Editorial & Unboxed (Vision 1) */}
              {filteredOpportunities.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                  <Search className="w-8 h-8 text-neutral-300" />
                  <p className="font-bold text-sm text-black">No opportunities found</p>
                  <p className="text-xs text-neutral-500">Try modifying your search keywords or resetting your location.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setNearMeActive(false); }}
                    className="mt-3 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold cursor-pointer transition"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOpportunities.map(opp => {
                    const dist = getOppDistance(opp);
                    const isDirect = isDirectOrbitOpportunity(opp);
                    const isUni = opp.category === 'university' || opp.category === 'tvet';
                    const coverImage = opp.posterImage || opp.logoUrl || getCategoryFallbackImage(opp.category);
                    const officialUrl = opp.officialApplicationUrl || opp.websiteUrl || 'https://www.google.com';

                    return (
                      <div
                        key={opp.id}
                        onClick={() => {
                          setSelectedOpp(opp);
                          setIsProfileView(true);
                        }}
                        className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 py-6 sm:py-7 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/70 rounded-2xl p-3 sm:p-4 -mx-3 sm:-mx-4 transition cursor-pointer group text-left"
                      >
                        {/* Image / Visual Media */}
                        <div className="w-full sm:w-44 h-40 sm:h-32 rounded-xl overflow-hidden bg-neutral-100 shrink-0 relative border border-neutral-200/60">
                          <img
                            src={coverImage}
                            alt={opp.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          
                          {/* Status Label on image */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                            {isDirect ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                                Orbit Partner
                              </span>
                            ) : isUni ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/95 text-black shadow-xs backdrop-blur-xs">
                                {opp.category === 'tvet' ? 'TVET College' : 'Public University'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/95 text-black shadow-xs backdrop-blur-xs">
                                Official Notice
                              </span>
                            )}
                          </div>

                          {dist !== null && (
                            <div className="absolute bottom-2.5 right-2.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-white/95 px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                                <LocateFixed className="w-2.5 h-2.5 text-blue-600" />
                                {dist} km
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content & Details Column - ALL TEXT MUST BE BLACK */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
                            <span className="truncate">{opp.companyOrInstitution}</span>
                            {opp.workplaceType && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-neutral-700 font-normal normal-case">{opp.workplaceType}</span>
                              </>
                            )}
                            {opp.opportunityType && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-neutral-700 font-normal normal-case">{opp.opportunityType}</span>
                              </>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-black group-hover:text-neutral-700 transition-colors leading-snug">
                            {opp.title}
                          </h3>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-xs text-black">
                            <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="truncate font-medium text-black">
                              {opp.city ? `${opp.city}, ${opp.province || 'South Africa'}` : opp.location}
                            </span>
                          </div>

                          {/* Education: Faculty/Course & Min APS */}
                          {isUni && (opp.institutionCourse || opp.minApsScore) && (
                            <div className="text-xs text-black pt-0.5 flex items-center gap-2 flex-wrap">
                              {opp.institutionCourse && (
                                <span className="font-semibold text-black">
                                  {opp.institutionCourse}
                                </span>
                              )}
                              {opp.minApsScore && (
                                <span className="text-black bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-bold border border-neutral-300">
                                  Min APS: {opp.minApsScore}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Description excerpt */}
                          <p className="text-xs sm:text-sm text-neutral-700 line-clamp-2 leading-relaxed pt-0.5">
                            {opp.description}
                          </p>

                          {/* Bottom Row: Remuneration / Deadline + Action Button */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-xs text-black">
                              {opp.compensationOrGrant ? (
                                <span className="font-bold text-black">
                                  {opp.compensationOrGrant}
                                </span>
                              ) : opp.deadline ? (
                                <span className="text-black font-medium">
                                  Closes: {opp.deadline}
                                </span>
                              ) : (
                                <span className="text-black font-semibold">
                                  Actively Recruiting
                                </span>
                              )}

                              {opp.openingDate && (
                                <span className="text-neutral-500 hidden sm:inline">
                                  • Opened {opp.openingDate}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                              {isDirect ? (
                                /* DIRECT ORBIT VACANCY -> SHOW APPLY BUTTON */
                                <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOpp(opp);
                                  setApplicantName(currentUser?.name || '');
                                  setApplicantEmail(currentUser?.email || '');
                                  setShowApplyModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span>Apply</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : isUni ? (
                              /* EDUCATION -> SHOW OFFICIAL ADMISSIONS PORTAL */
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(officialUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <span>Admissions Portal</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              /* EXTERNAL / GOVERNMENT VACANCY -> SHOW OFFICIAL PORTAL (NO ORBIT APPLY BUTTON) */
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(officialUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <span>Official Portal</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}

                            <span className="text-xs font-bold text-black group-hover:text-neutral-700 transition-colors hidden sm:inline-flex items-center gap-0.5">
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

        {/* ========================================================================= */}
        {/* APPLICATION TRACKING TAB ("MY APPLICATIONS") */}
        {/* ========================================================================= */}
        {activeTab === 'applications' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <Text className="font-bold text-base text-slate-900 font-sans">My Submitted Applications</Text>
                <Text className="text-xs text-slate-500 font-sans">Track review progress, status updates, and employer responses</Text>
              </div>
              <button
                onClick={() => setActiveTab('jobs')}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Browse More
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <Text className="font-bold text-sm text-slate-800 font-sans">No applications submitted yet</Text>
                <Text className="text-xs text-slate-500 font-sans max-w-sm">
                  Discover jobs, internships, bursaries, and university admissions. When you apply, you can track your status right here.
                </Text>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Explore Opportunities
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {applications.map(app => (
                  <div
                    key={app.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Text className="font-bold text-sm text-slate-900 font-sans">
                          {app.opportunityTitle}
                        </Text>
                        <Text className="text-xs text-slate-600 font-medium font-sans">
                          {app.opportunityCompany}
                        </Text>
                      </div>
                      {renderStatusBadge(app.status)}
                    </div>

                    {/* Progress tracker bar */}
                    <div className="py-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className={app.status !== 'Not Selected' ? 'text-blue-600' : ''}>1. Submitted</span>
                        <span className={['Under Review', 'Shortlisted', 'Interview', 'Accepted'].includes(app.status) ? 'text-blue-600' : ''}>2. Review</span>
                        <span className={['Shortlisted', 'Interview', 'Accepted'].includes(app.status) ? 'text-blue-600' : ''}>3. Shortlist</span>
                        <span className={app.status === 'Accepted' ? 'text-emerald-600 font-extrabold' : ''}>4. Decision</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            app.status === 'Accepted'
                              ? 'bg-emerald-500 w-full'
                              : app.status === 'Interview'
                              ? 'bg-purple-600 w-3/4'
                              : app.status === 'Shortlisted'
                              ? 'bg-indigo-600 w-2/3'
                              : app.status === 'Under Review'
                              ? 'bg-amber-500 w-1/2'
                              : app.status === 'Not Selected'
                              ? 'bg-slate-400 w-full'
                              : 'bg-blue-600 w-1/4'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status note from employer / admissions */}
                    {app.statusNotes && (
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="font-sans">{app.statusNotes}</span>
                      </div>
                    )}

                    {/* Actions & Details row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* In-App Chat Action */}
                        {(() => {
                          const hasUnreadReply = applicantUnreadOppIds.includes(app.opportunityId) || applicantUnreadOppIds.includes(app.id);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                const linkedOpp = opportunities.find(o => o.id === app.opportunityId) || {
                                  id: app.opportunityId,
                                  title: app.opportunityTitle,
                                  companyOrInstitution: app.opportunityCompany,
                                  category: app.opportunityCategory
                                } as Opportunity;
                                openInAppChat(linkedOpp, app, 'applicant');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                                hasUnreadReply
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs animate-pulse'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                              }`}
                            >
                              <MessageSquare className={`w-3.5 h-3.5 ${hasUnreadReply ? 'text-white' : 'text-blue-600'}`} />
                              <span>{hasUnreadReply ? 'New Message from Employer' : 'Chat with Employer'}</span>
                              {hasUnreadReply && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                              )}
                            </button>
                          );
                        })()}

                        {/* View Vacancy Details Action */}
                        <button
                          type="button"
                          onClick={() => {
                            const linkedOpp = opportunities.find(o => o.id === app.opportunityId);
                            if (linkedOpp) {
                              setSelectedOpp(linkedOpp);
                              setIsProfileView(true);
                              setActiveTab(
                                linkedOpp.category === 'university' || linkedOpp.category === 'tvet'
                                  ? 'colleges_universities'
                                  : 'jobs'
                              );
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Vacancy</span>
                        </button>

                        {app.cvText && (
                          <button
                            type="button"
                            onClick={() => setShowCvViewerModal({ title: `${app.applicantName} - Submitted CV`, text: app.cvText || '' })}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                          >
                            <span>CV</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EMPLOYER / RECRUITER PORTAL (Minimal, Flat, Clean - ChatGPT/Claude/WhatsApp style) */}
        {/* ========================================================================= */}
        {activeTab === 'employer' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-5 text-left">
            {/* Minimal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-slate-900 font-sans tracking-tight">Employer Portal</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {employerOpportunities.length} Vacancies
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Review applicant profiles, verified documents, and screening responses.
                </p>
              </div>

              <button
                onClick={() => setShowPostVacancyModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Post Vacancy
              </button>
            </div>

            {/* Employer Portal Sub-Tabs: Candidates vs In-App Conversations */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setEmployerPortalSubTab('candidates')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                  employerPortalSubTab === 'candidates'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Candidate Pool ({filteredApplicants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setEmployerPortalSubTab('conversations')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                  employerPortalSubTab === 'conversations'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversations ({employerConversations.length})</span>
                {unreadEmployerCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-600 text-white animate-pulse">
                    {unreadEmployerCount} new
                  </span>
                )}
              </button>
            </div>

            {/* In-App Direct Conversations View */}
            {employerPortalSubTab === 'conversations' && (
              <div className="flex flex-col gap-3">
                {employerConversations.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                    <p className="font-bold text-xs text-slate-800 font-sans">No messages yet</p>
                    <p className="text-[11px] text-slate-400 font-sans max-w-sm">
                      When candidates message you from their application or vacancy page, direct threads will appear here with instant reply capabilities.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100 border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    {employerConversations.map(conv => {
                      const hasUnread = conv.unreadCount > 0;
                      return (
                        <div
                          key={`${conv.opportunityId}-${conv.applicantId}-${conv.applicationId || ''}`}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                            hasUnread ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              hasUnread ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {conv.applicantName ? conv.applicantName.charAt(0).toUpperCase() : 'A'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 font-sans">{conv.applicantName}</span>
                                {hasUnread && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                    {conv.unreadCount} new
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <span className="text-[11px] font-medium text-slate-500 block truncate">
                                {conv.opportunityTitle} • {conv.applicantEmail}
                              </span>

                              <p className="text-xs text-slate-700 mt-1 line-clamp-1">
                                <span className="font-semibold text-slate-500">
                                  {conv.lastMessageSenderRole === 'employer' ? 'You: ' : `${conv.applicantName.split(' ')[0]}: `}
                                </span>
                                {conv.lastMessageText}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const linkedOpp = opportunities.find(o => o.id === conv.opportunityId) || {
                                  id: conv.opportunityId,
                                  title: conv.opportunityTitle,
                                  companyOrInstitution: 'Employer'
                                } as Opportunity;

                                const linkedApp = currentOppApplicants.find(a => 
                                  a.id === conv.applicationId || 
                                  a.applicantId === conv.applicantId || 
                                  a.applicantEmail === conv.applicantEmail
                                ) || {
                                  id: conv.applicationId || 'app-chat',
                                  opportunityId: conv.opportunityId,
                                  applicantId: conv.applicantId,
                                  applicantName: conv.applicantName,
                                  applicantEmail: conv.applicantEmail
                                } as OpportunityApplication;

                                openInAppChat(linkedOpp, linkedApp, 'employer');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                                hasUnread
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{hasUnread ? 'Reply Now' : 'Open Chat'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Candidate Pool View */}
            {employerPortalSubTab === 'candidates' && (
              <>
            {/* Flat Vacancy Pill Selector (No heavy cards) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {employerOpportunities.map(opp => {
                const isSelected = employerSelectedOppId === opp.id;
                const candidateCount = currentOppApplicants.length > 0 && isSelected 
                  ? currentOppApplicants.length 
                  : (opp.applicantCount || 0);

                return (
                  <button
                    key={opp.id}
                    onClick={() => setEmployerSelectedOppId(opp.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition whitespace-nowrap flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{opp.title}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {candidateCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Minimal Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={applicantSearchQuery}
                  onChange={(e) => setApplicantSearchQuery(e.target.value)}
                  placeholder="Search candidate by name, contact, qualification, or cover note..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto self-end">
                <select
                  value={applicantStatusFilter}
                  onChange={(e) => setApplicantStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Not Selected">Not Selected</option>
                </select>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {filteredApplicants.length} applicants
                </span>
              </div>
            </div>

            {/* Flat Candidate List (Claude/WhatsApp Style) */}
            {loadingApplicants ? (
              <div className="py-12 text-center text-xs text-slate-500 font-sans">Loading applicant pool...</div>
            ) : filteredApplicants.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <UserCheck className="w-8 h-8 text-slate-300" />
                <p className="font-bold text-xs text-slate-800 font-sans">No applicants found</p>
                <p className="text-[11px] text-slate-400 font-sans">Submit a test application from the explorer tab to preview candidate review.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
                {filteredApplicants.map(app => {
                  const hasPhone = app.applicantPhone && app.applicantPhone !== 'N/A';
                  const cleanPhone = app.applicantPhone ? app.applicantPhone.replace(/[^0-9]/g, '') : '';
                  const answeredScreeningCount = app.screeningAnswers ? Object.keys(app.screeningAnswers).length : 0;

                  return (
                    <div
                      key={app.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                    >
                      {/* Candidate Column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{app.applicantName}</span>
                          {app.aiMatchEvaluation?.matchRating === 'Strong Match' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Strong Match
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            app.status === 'Shortlisted' || app.status === 'Accepted'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : app.status === 'Interview'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : app.status === 'Not Selected'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        {/* Location & Residential Address */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          {app.residentialAddress && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {app.residentialAddress}
                            </span>
                          )}
                          {app.applicantCoordinates && selectedOpp?.coordinates && (
                            <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                              {calculateDistanceKm(app.applicantCoordinates.lat, app.applicantCoordinates.lng, selectedOpp.coordinates.lat, selectedOpp.coordinates.lng)} km away
                            </span>
                          )}
                          <span>Applied {new Date(app.submittedAt).toLocaleDateString()}</span>
                        </div>

                        {/* Document & Screening Pills */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                          {app.qualificationType && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium capitalize">
                              {app.qualificationType.replace('_', ' ')}
                            </span>
                          )}
                          {app.documents && app.documents.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                              {app.documents.length} {app.documents.length === 1 ? 'doc' : 'docs'}
                            </span>
                          )}
                          {answeredScreeningCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                              ✓ {answeredScreeningCount} screening answered
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions & Status Control Column */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {/* In-App Orbit Chat Button */}
                        {(() => {
                          const candidateConv = employerConversations.find(c => 
                            (c.applicantId === app.applicantId || c.applicantEmail === app.applicantEmail || c.applicationId === app.id) &&
                            c.opportunityId === app.opportunityId
                          );
                          const hasUnreadFromCandidate = (candidateConv?.unreadCount || 0) > 0;

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                const currentOpp = opportunities.find(o => o.id === employerSelectedOppId) || selectedOpp;
                                if (currentOpp) {
                                  openInAppChat(currentOpp, app, 'employer');
                                }
                              }}
                              title="Chat inside Orbit"
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                hasUnreadFromCandidate 
                                  ? 'bg-blue-600 text-white shadow-xs animate-pulse' 
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <MessageSquare className={`w-3.5 h-3.5 ${hasUnreadFromCandidate ? 'text-white' : 'text-blue-600'}`} />
                              <span className="hidden md:inline">Orbit Chat</span>
                              {hasUnreadFromCandidate && (
                                <span className="bg-white text-blue-600 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                  {candidateConv?.unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        {/* WhatsApp Button */}
                        {hasPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat on WhatsApp"
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden md:inline">WhatsApp</span>
                          </a>
                        )}

                        {/* Email Button */}
                        <a
                          href={`mailto:${app.applicantEmail}?subject=Application for ${encodeURIComponent(app.opportunityTitle)}`}
                          title="Send Email"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden md:inline">Email</span>
                        </a>

                        {/* Status Select */}
                        <select
                          value={app.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as ApplicationStatus;
                            await dbUpdateApplicationStatus(app.id, newStatus, `Status updated to ${newStatus} by employer.`);
                            setCurrentOppApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview">Interview</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Not Selected">Not Selected</option>
                        </select>

                        {/* View Dossier Modal Button */}
                        <button
                          onClick={() => {
                            setDossierApplicant(app);
                            setShowDossierModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* OPPORTUNITY DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && selectedOpp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in text-left">
          <div className="bg-white w-full max-w-3xl max-h-[94vh] rounded-3xl overflow-y-auto shadow-2xl flex flex-col border border-slate-100">
            <OpportunityProfileView
              opportunity={selectedOpp}
              onBack={() => setShowDetailsModal(false)}
              onApply={() => {
                setShowDetailsModal(false);
                setApplicantName(currentUser?.name || '');
                setApplicantEmail(currentUser?.email || '');
                setShowApplyModal(true);
              }}
              onChat={() => {
                setShowDetailsModal(false);
                openInAppChat(selectedOpp, undefined, 'applicant');
              }}
              onOpenApsCalc={() => {
                setShowDetailsModal(false);
                setShowApsCalc(true);
              }}
              distanceKm={getOppDistance(selectedOpp)}
            />
          </div>
        </div>
      )}

      {false && showDetailsModal && selectedOpp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Optional Banner Image */}
            {selectedOpp.posterImage && (
              <div className="w-full h-44 sm:h-52 bg-slate-100 relative shrink-0">
                <img
                  src={selectedOpp.posterImage}
                  alt={selectedOpp.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white cursor-pointer transition backdrop-blur-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!selectedOpp.posterImage && selectedOpp.logoUrl && (
                  <img
                    src={selectedOpp.logoUrl}
                    alt={selectedOpp.companyOrInstitution}
                    className="w-12 h-12 rounded-xl object-contain p-1 bg-slate-50 border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderCategoryBadge(selectedOpp)}
                    {selectedOpp.isPublicDirectory && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Public Directory
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 font-sans leading-snug">{selectedOpp.title}</h3>
                  <p className="text-xs text-slate-600 font-medium font-sans mt-0.5">{selectedOpp.companyOrInstitution}</p>
                </div>
              </div>
              {!selectedOpp.posterImage && (
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs text-slate-700 font-sans">
              {/* Public Directory Disclaimer Notice */}
              {selectedOpp.isPublicDirectory && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs flex flex-col gap-1.5 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Public Institution Directory Record</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {selectedOpp.sourceDisclaimer || "This opportunity is compiled from public admissions information. Orbit AI is an independent platform and does NOT claim affiliation, endorsement, or formal partnership with this institution."}
                  </p>
                  {selectedOpp.openingDate && (
                    <div className="text-[11px] text-slate-600 mt-1">
                      Applications Open: <strong>{selectedOpp.openingDate}</strong> | Application Deadline: <strong>{selectedOpp.deadline || 'Ongoing'}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Location Details Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Location Information
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      {selectedOpp.address && (
                        <p className="font-bold text-slate-900 text-xs">{selectedOpp.address}</p>
                      )}
                      <p className="text-slate-600 text-xs">
                        {[selectedOpp.city, selectedOpp.province, selectedOpp.country || 'South Africa'].filter(Boolean).join(', ') || selectedOpp.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getOppDistance(selectedOpp) !== null && (
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md text-[11px]">
                        <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
                        {getOppDistance(selectedOpp)} km from you
                      </span>
                    )}

                    {selectedOpp.locationPrecision && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selectedOpp.locationPrecision === 'exact' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        selectedOpp.locationPrecision === 'approximate' ? 'bg-slate-200/70 text-slate-700' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {selectedOpp.locationPrecision === 'exact' ? 'Exact Address' :
                         selectedOpp.locationPrecision === 'approximate' ? 'Approximate Area' : 'Remote'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Workplace Mode</span>
                  <span className="font-semibold text-slate-800">{selectedOpp.workplaceType || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Compensation / Grant</span>
                  <span className="font-semibold text-slate-800">{selectedOpp.compensationOrGrant || 'Market Related'}</span>
                </div>
                {selectedOpp.minApsScore && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Minimum APS Score</span>
                    <span className="font-semibold text-amber-800">{selectedOpp.minApsScore} Points</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Deadline</span>
                  <span className="font-semibold text-slate-800">{selectedOpp.deadline || 'Open'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedOpp.category}</span>
                </div>
                {selectedOpp.institutionCourse && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Course</span>
                    <span className="font-semibold text-slate-800">{selectedOpp.institutionCourse}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-1.5">Overview & Description</h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedOpp.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2">Key Requirements & Criteria</h4>
                <ul className="flex flex-col gap-1.5">
                  {selectedOpp.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedOpp.requiredDocuments && selectedOpp.requiredDocuments.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2">Documents Needed</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOpp.requiredDocuments.map((doc, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 font-medium flex items-center gap-1">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact & Application Information */}
              {(selectedOpp.creatorEmail || selectedOpp.creatorPhone || selectedOpp.applicationInstructions) && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Contact & Application Information</h4>
                  {selectedOpp.applicationInstructions && (
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedOpp.applicationInstructions}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 pt-0.5">
                    {selectedOpp.creatorEmail && (
                      <a
                        href={`mailto:${selectedOpp.creatorEmail}?subject=Inquiry regarding ${encodeURIComponent(selectedOpp.title)}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedOpp.creatorEmail}</span>
                      </a>
                    )}
                    {selectedOpp.creatorPhone && (
                      <a
                        href={`tel:${selectedOpp.creatorPhone}`}
                        className="flex items-center gap-1.5 text-slate-700 hover:underline font-medium"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedOpp.creatorPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Map/GPS Action */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">Map & Navigation Directions</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedOpp.address ? `${selectedOpp.address}, ${selectedOpp.city || ''} ${selectedOpp.province || ''}` : selectedOpp.location
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 inline-flex items-center gap-1 transition"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </div>
            </div>

            {/* One Clear Apply Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setApplicantName(currentUser?.name || '');
                  setApplicantEmail(currentUser?.email || '');
                  setShowApplyModal(true);
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Apply</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPLICATION SUBMISSION MODAL */}
      {/* ========================================================================= */}
      {showApplyModal && selectedOpp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Submit Application</span>
                <h3 className="font-bold text-sm text-slate-900 font-sans line-clamp-1">{selectedOpp.title}</h3>
                <p className="text-[11px] text-slate-500 font-sans">{selectedOpp.companyOrInstitution}</p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs font-sans">
              {/* Applicant Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name and Surname *</label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Sipho Nkosi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="e.g. sipho.nkosi@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone / WhatsApp Number *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+27 82 123 4567"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Recruiters will use this number for direct WhatsApp or call interview invites.</span>
                </div>
              </div>

              {/* Residential Address & Location / GPS */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Residential Address & Location
                  </span>
                  <span className="text-[10px] text-slate-500">Helps employers assess proximity</span>
                </div>

                <div>
                  <input
                    type="text"
                    value={applicantResidentialAddress}
                    onChange={(e) => setApplicantResidentialAddress(e.target.value)}
                    placeholder="Physical residential address, suburb, town / city (e.g. 14 Sunnyside Ave, Soweto, Johannesburg)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={handleCaptureApplicantGps}
                    disabled={isCapturingApplicantGps}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    {isCapturingApplicantGps ? 'Capturing GPS...' : applicantCoordinates ? 'GPS Verified' : 'Capture Current GPS / Location'}
                  </button>

                  {applicantLocationStatus && (
                    <span className="text-[11px] text-emerald-700 font-medium truncate max-w-xs">
                      ✓ {applicantLocationStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* CV Selection (CV / Task Mode Connection) */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Curriculum Vitae (CV) *</span>
                  <span className="text-[10px] text-slate-400">PDF, DOCX, or TXT</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setCvSource('task_mode')}
                    className={`flex-1 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      cvSource === 'task_mode'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs">Use Task Mode CV</span>
                      {taskModeCv ? <Check className="w-3.5 h-3.5 text-blue-600" /> : null}
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      {taskModeCv ? `✓ "${taskModeCv.name}" ready` : 'No Task Mode CV found'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCvSource('upload');
                      fileInputRef.current?.click();
                    }}
                    className={`flex-1 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      cvSource === 'upload'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs">Upload CV File</span>
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal truncate">
                      {uploadedCvFile ? `✓ ${uploadedCvFile.name}` : 'Select PDF or DOCX file'}
                    </span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedCvFile(e.target.files[0]);
                      setCvSource('upload');
                    }
                  }}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />

                {!taskModeCv && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Need a professional South African CV?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplyModal(false);
                        setMobileScreen('task-mode');
                      }}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Generate in Task Mode →
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Document Uploads (Tailored strictly to the vacancy) */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Required Application Documents</span>
                  <span className="text-[10px] text-slate-500">PDF or Image uploads</span>
                </div>

                {/* Qualification Type Selector if qualification required */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Highest Completed Qualification:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'matric', label: 'Matric (Grade 12)' },
                      { id: 'grade_9', label: 'Grade 9 / ABET' },
                      { id: 'degree_diploma', label: 'Diploma / Degree' },
                      { id: 'other', label: 'Other / Nated' }
                    ].map(q => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setApplicantQualificationType(q.id as any)}
                        className={`p-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                          applicantQualificationType === q.id
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic document upload slots based on current vacancy requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentOppDocRequirements.map(req => {
                    const isAttached = attachedDocs.some(d => d.type === req.type);

                    return (
                      <label
                        key={req.id}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                          isAttached 
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' 
                            : 'bg-white border-slate-200 hover:border-blue-400 text-slate-800'
                        }`}
                      >
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], req.type)}
                          accept="image/*,.pdf"
                        />
                        <div className="flex items-center gap-2">
                          <Upload className={`w-4 h-4 shrink-0 ${isAttached ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <span className="text-[11px] font-bold block">{req.label}</span>
                            <span className="text-[9px] text-slate-500">
                              {req.required ? 'Mandatory' : 'Recommended'}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isAttached 
                            ? 'bg-emerald-200 text-emerald-900' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isAttached ? '✓ Attached' : 'Attach'}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {attachedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {attachedDocs.map(doc => (
                      <span key={doc.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-700 flex items-center gap-1">
                        ✓ {doc.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Vacancy Screening Questions (Tailored to this specific vacancy) */}
              {currentOppScreeningQuestions.length > 0 && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      Vacancy Screening Questions
                    </span>
                    <span className="text-[10px] text-slate-500">Specific to {selectedOpp.title}</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {currentOppScreeningQuestions.map(sq => (
                      <div key={sq.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5 text-left">
                        <label className="text-[11px] font-bold text-slate-800">
                          {sq.question} {sq.required && <span className="text-rose-500">*</span>}
                        </label>

                        {sq.type === 'yes_no' ? (
                          <div className="flex items-center gap-2">
                            {['Yes', 'No'].map(ans => (
                              <button
                                key={ans}
                                type="button"
                                onClick={() => setScreeningAnswers(prev => ({ ...prev, [sq.id]: ans }))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                  screeningAnswers[sq.id] === ans
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {ans}
                              </button>
                            ))}
                          </div>
                        ) : sq.type === 'choice' && sq.options ? (
                          <div className="flex flex-wrap gap-1.5">
                            {sq.options.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setScreeningAnswers(prev => ({ ...prev, [sq.id]: opt }))}
                                className={`px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                                  screeningAnswers[sq.id] === opt
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={screeningAnswers[sq.id] || ''}
                            onChange={(e) => setScreeningAnswers(prev => ({ ...prev, [sq.id]: e.target.value }))}
                            placeholder="Type your answer..."
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Note & Orbit AI University Application Assistant */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Cover Note / Motivation</label>
                  {selectedOpp.category === 'university' && (
                    <button
                      type="button"
                      onClick={() => {
                        setUniTargetDegree(selectedOpp.institutionCourse || selectedOpp.title);
                        setShowAiUniAssistant(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Draft with Orbit AI
                    </button>
                  )}
                </div>
                <textarea
                  value={applicantCoverNote}
                  onChange={(e) => setApplicantCoverNote(e.target.value)}
                  placeholder="Explain why you are an ideal fit for this vacancy, bursary, or degree..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingApp}
                onClick={handleSubmitApplication}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs"
              >
                {isSubmittingApp ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPLICATION RECEIVED MODAL */}
      {/* ========================================================================= */}
      {showApplicationReceivedModal && submittedAppInfo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in text-center">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Application Received</span>
              <h3 className="font-bold text-lg text-slate-900 font-sans mt-0.5">{submittedAppInfo.title}</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">{submittedAppInfo.company}</p>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Reference ID</span>
                <span className="font-mono font-bold text-slate-900">{submittedAppInfo.id.substring(0, 12)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Submitted</span>
                <span className="font-medium text-slate-900">{submittedAppInfo.submittedAt}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Attached Documents</span>
                <span className="font-bold text-emerald-700">{submittedAppInfo.docsCount} verified</span>
              </div>
              {submittedAppInfo.hasGps && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Proximity</span>
                  <span className="font-bold text-blue-700">GPS Location Attached</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-xs font-sans">
              Your application has been received and is currently being processed. You will receive real-time status updates and employer communications directly within <strong>My Applications</strong>.
            </p>

            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setShowApplicationReceivedModal(false);
                  if (selectedOpp) {
                    openInAppChat(selectedOpp, undefined, 'applicant');
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Employer / Admissions Now</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowApplicationReceivedModal(false);
                    setActiveTab('applications');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Track in My Applications
                </button>
                <button
                  onClick={() => {
                    setShowApplicationReceivedModal(false);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST NEW VACANCY MODAL (EMPLOYER SIDE) */}
      {/* ========================================================================= */}
      {showPostVacancyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 px-6 border-b border-neutral-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-base text-neutral-900 font-sans">Post Job Vacancy</h3>
                <p className="text-xs text-neutral-500 font-sans mt-0.5">Publish a vacancy to reach candidates across Orbit AI</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPostVacancyModal(false)}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean, Minimal Form */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Job Title */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Job Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sales Consultant, Software Developer, Office Administrator"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Company / Business Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Company or Business Name *</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Acme Logistics, TechForward"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Employment Type & Workplace Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Employment Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as OpportunityType)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Learnership">Learnership</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Workplace Mode</label>
                  <select
                    value={newWorkplace}
                    onChange={(e) => setNewWorkplace(e.target.value as OpportunityWorkplace)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              {/* Contact Details (Email & Phone) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Contact Email *</label>
                  <input
                    type="email"
                    value={newEmployerEmail}
                    onChange={(e) => setNewEmployerEmail(e.target.value)}
                    placeholder="e.g. careers@company.co.za"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    value={newEmployerPhone}
                    onChange={(e) => setNewEmployerPhone(e.target.value)}
                    placeholder="e.g. 011 234 5678 or 082 123 4567"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              {/* Location & Automatic GPS Capture */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-800">Job Location & GPS</label>
                  <button
                    type="button"
                    onClick={handleCaptureEmployerGps}
                    disabled={isCapturingEmployerGps}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{isCapturingEmployerGps ? 'Capturing GPS...' : newCoordinates ? 'Re-detect GPS' : 'Detect GPS Location'}</span>
                  </button>
                </div>

                {/* GPS Status feedback */}
                {newCoordinates ? (
                  <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      GPS captured: {newCoordinates.lat.toFixed(4)}, {newCoordinates.lng.toFixed(4)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Enabled for Near Me</span>
                  </div>
                ) : employerGpsStatus ? (
                  <p className="mb-2 text-[11px] text-neutral-500 font-sans">
                    {employerGpsStatus}
                  </p>
                ) : null}

                {/* Physical address or city entry (used as address or fallback when GPS denied) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Physical street address (e.g. 15 Alice Lane)"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="City / Town (e.g. Johannesburg or Cape Town)"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Job Description *</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the role, key responsibilities, and tasks..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Candidate Requirements */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Candidate Requirements (Optional)</label>
                <textarea
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="e.g. Grade 12 Matric Certificate, 2+ years experience, Valid Driver's License (one per line)"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Compensation & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Salary / Compensation (Optional)</label>
                  <input
                    type="text"
                    value={newCompensation}
                    onChange={(e) => setNewCompensation(e.target.value)}
                    placeholder="e.g. R18,000 - R25,000 / month or Market Related"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">Application Deadline (Optional)</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPostVacancyModal(false)}
                className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateVacancy}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Publish Vacancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORBIT AI UNIVERSITY APPLICATION ASSISTANT MODAL */}
      {/* ========================================================================= */}
      {showAiUniAssistant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-sans">Orbit AI Application Assistant</h3>
                  <p className="text-[11px] text-slate-500 font-sans">Draft a high-impact personal statement & motivation letter</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiUniAssistant(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 text-xs font-sans">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Degree or Program *</label>
                <input
                  type="text"
                  value={uniTargetDegree}
                  onChange={(e) => setUniTargetDegree(e.target.value)}
                  placeholder="e.g. BSc Computer Science (UCT), LLB Law (Wits), BCom Accounting (UP)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Key Highlights, Passions, or Background</label>
                <textarea
                  value={uniStudentBackground}
                  onChange={(e) => setUniStudentBackground(e.target.value)}
                  placeholder="e.g. Strong mathematical background, built high school robotics project, volunteer tutor, passionate about software engineering..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <button
                disabled={uniAiGenerating}
                onClick={handleGenerateUniMotivation}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-center gap-2"
              >
                {uniAiGenerating ? (
                  <span>Drafting with Orbit AI...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Personal Motivation Letter</span>
                  </>
                )}
              </button>

              {uniGeneratedLetter && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                  <span className="font-bold text-[11px] text-slate-800 block mb-1">Generated Letter:</span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{uniGeneratedLetter}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAiUniAssistant(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APS CALCULATOR MODAL (SOUTH AFRICAN ADMISSION POINT SCORE) */}
      {/* ========================================================================= */}
      {showApsCalc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 font-sans">Matric APS Calculator</h3>
              </div>
              <button
                onClick={() => setShowApsCalc(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 text-xs font-sans">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-800">Your Calculated APS:</span>
                <span className="text-xl font-extrabold text-blue-600">{calculateTotalAps()} Points</span>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {Object.entries(apsScores).map(([subject, score]) => (
                  <div key={subject} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-700 font-medium truncate flex-1">{subject}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          setApsScores(prev => ({ ...prev, [subject]: val }));
                        }}
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs font-bold outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Note: South African universities exclude Life Orientation from the official Faculty APS calculation. Level 7 (80-100%) = 7 pts, Level 6 (70-79%) = 6 pts, Level 5 (60-69%) = 5 pts.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowApsCalc(false)}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Apply Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANDIDATE REVIEW DOSSIER MODAL (EMPLOYER PORTAL) */}
      {/* ========================================================================= */}
      {showDossierModal && dossierApplicant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {(dossierApplicant.applicantName || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{dossierApplicant.applicantName}</h3>
                  <p className="text-[11px] text-slate-500">
                    Applying for <span className="font-semibold text-slate-700">{dossierApplicant.opportunityTitle}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowDossierModal(false);
                  setDossierApplicant(null);
                }}
                className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Top Contact Bar & Status Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* WhatsApp Action */}
                  {dossierApplicant.applicantPhone && (
                    <a
                      href={`https://wa.me/${dossierApplicant.applicantPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Candidate</span>
                    </a>
                  )}

                  {/* Email Action */}
                  <a
                    href={`mailto:${dossierApplicant.applicantEmail}?subject=Regarding your application for ${encodeURIComponent(dossierApplicant.opportunityTitle)}`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dossierApplicant.applicantEmail}</span>
                  </a>

                  {dossierApplicant.applicantPhone && (
                    <span className="text-slate-600 font-medium px-2 py-1 bg-white border border-slate-200 rounded-xl">
                      {dossierApplicant.applicantPhone}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Status:</span>
                  <select
                    value={dossierApplicant.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value as ApplicationStatus;
                      await dbUpdateApplicationStatus(dossierApplicant.id, newStatus, `Status updated to ${newStatus}`);
                      setDossierApplicant(prev => prev ? { ...prev, status: newStatus } : null);
                      setCurrentOppApplicants(prev => prev.map(a => a.id === dossierApplicant.id ? { ...a, status: newStatus } : a));
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-700 outline-none cursor-pointer"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interview">Interview</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Not Selected">Not Selected</option>
                  </select>
                </div>
              </div>

              {/* Residential Address & Location Profile */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Applicant Residential Address & Location
                </span>

                <p className="text-slate-700 font-medium">
                  {dossierApplicant.residentialAddress || "Address not provided by applicant"}
                </p>

                {dossierApplicant.applicantLocationName && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-semibold">
                      {dossierApplicant.applicantLocationName}
                    </span>
                  </div>
                )}
              </div>

              {/* Education & Qualification */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Highest Completed Qualification
                </span>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 capitalize">
                    {dossierApplicant.qualificationType 
                      ? dossierApplicant.qualificationType.replace('_', ' ').toUpperCase()
                      : 'Matric / Senior Certificate'}
                  </span>
                  {dossierApplicant.apsCalculated && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                      APS Score: {dossierApplicant.apsCalculated} Pts
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Screening Questions & Candidate Responses */}
              {dossierApplicant.screeningAnswers && Object.keys(dossierApplicant.screeningAnswers).length > 0 && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    Screening Questions & Answers
                  </span>

                  <div className="flex flex-col gap-2">
                    {Object.entries(dossierApplicant.screeningAnswers).map(([qKey, aVal], idx) => (
                      <div key={qKey} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {qKey.replace(/^sq_/, '').replace(/_/g, ' ').toUpperCase()}:
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {aVal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Documents (CV, ID, Matric/Qualification, Proof of Residence) */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Attached Application Documents
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* CV Document */}
                  {dossierApplicant.cvText && (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Curriculum Vitae</span>
                        <span className="text-[10px] text-slate-400">{dossierApplicant.cvFileName || 'Candidate_CV.pdf'}</span>
                      </div>
                      <button
                        onClick={() => setShowCvViewerModal({
                          title: `${dossierApplicant.applicantName} - Curriculum Vitae`,
                          text: dossierApplicant.cvText || ''
                        })}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        View CV
                      </button>
                    </div>
                  )}

                  {/* Uploaded Documents */}
                  {dossierApplicant.documents && dossierApplicant.documents.map(doc => (
                    <div key={doc.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs capitalize">{doc.type.replace('_', ' ')} Document</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px] block">{doc.name}</span>
                      </div>
                      {doc.dataUrl ? (
                        <a
                          href={doc.dataUrl}
                          download={doc.name}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Get</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cover Note / Motivation */}
              {dossierApplicant.coverNote && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-800">Cover Note / Motivation Letter</span>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {dossierApplicant.coverNote}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  setShowDossierModal(false);
                  setDossierApplicant(null);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CV VIEWER MODAL */}
      {/* ========================================================================= */}
      {showCvViewerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-sans">{showCvViewerModal.title}</h3>
              <button
                onClick={() => setShowCvViewerModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {showCvViewerModal.text}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowCvViewerModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP REALTIME OPPORTUNITY CHAT MODAL */}
      {/* ========================================================================= */}
      {showChatModal && chatTargetOpp && (
        <OpportunityChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatTargetOpp(null);
            setChatTargetApp(null);
            refreshChatCountsAndThreads();
          }}
          opportunity={chatTargetOpp}
          application={chatTargetApp}
          currentUser={currentUser}
          userRole={chatUserRole}
        />
      )}
    </SafeAreaView>
  );
};
