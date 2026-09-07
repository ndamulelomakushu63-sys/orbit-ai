import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ScrollView } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Search, Briefcase, GraduationCap, Award, Building2, 
  FileText, CheckCircle2, Clock, MapPin, DollarSign, Calendar, 
  Upload, Eye, Plus, ChevronRight, X, ExternalLink, Filter, 
  UserCheck, AlertCircle, Share2, Sparkles, Send, Download,
  Phone, Mail, Check, MessageSquare, Navigation, Locate, LocateFixed,
  Target, Info, Image as ImageIcon, ShieldCheck, Compass
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
  calculateDistanceKm, DEFAULT_OPPORTUNITIES
} from '../services/supabase';

interface OpportunitiesScreenProps {
  onBack?: () => void;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ onBack }) => {
  const { setMobileScreen, currentUser } = useAppState();

  // Navigation / View Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'internships' | 'learnerships' | 'scholarships' | 'university' | 'applications' | 'employer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('All');

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
  const [newWorkplace, setNewWorkplace] = useState<OpportunityWorkplace>('Hybrid');
  const [newLocation, setNewLocation] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newLocationPrecision, setNewLocationPrecision] = useState<'exact' | 'approximate' | 'remote'>('exact');
  const [newCoordinates, setNewCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingEmployerGps, setIsCapturingEmployerGps] = useState(false);
  const [employerGpsStatus, setEmployerGpsStatus] = useState<string | null>(null);

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

  // Filtered Opportunities List
  const filteredOpportunities = useMemo(() => {
    let list = opportunities.filter(opp => {
      // Category Tab Filter
      if (activeTab === 'jobs' && opp.category !== 'job') return false;
      if (activeTab === 'internships' && opp.category !== 'internship') return false;
      if (activeTab === 'learnerships' && opp.category !== 'learnership') return false;
      if (activeTab === 'scholarships' && opp.category !== 'scholarship') return false;
      if (activeTab === 'university' && opp.category !== 'university') return false;

      // Location Filter
      if (selectedLocation !== 'All') {
        const qLoc = selectedLocation.toLowerCase();
        const matchesLoc = 
          opp.location.toLowerCase().includes(qLoc) ||
          (opp.city && opp.city.toLowerCase().includes(qLoc)) ||
          (opp.province && opp.province.toLowerCase().includes(qLoc)) ||
          (opp.address && opp.address.toLowerCase().includes(qLoc));
        if (!matchesLoc) return false;
      }

      // Workplace Filter
      if (selectedWorkplace !== 'All' && opp.workplaceType !== selectedWorkplace) {
        return false;
      }

      // Search Query
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
        if (!inTitle && !inCompany && !inLoc && !inAddress && !inCity && !inProvince && !inDesc && !inReqs && !inCourse) return false;
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
  }, [opportunities, activeTab, searchQuery, selectedLocation, selectedWorkplace, nearMeActive, userLocation]);

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

  // Employer GPS Capture
  const handleCaptureEmployerGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturingEmployerGps(true);
    setEmployerGpsStatus("Detecting exact coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) };
        setNewCoordinates(coords);
        setIsCapturingEmployerGps(false);
        setEmployerGpsStatus(`GPS Captured: ${coords.lat}, ${coords.lng}`);
        setNewLocationPrecision('exact');
      },
      (err) => {
        setIsCapturingEmployerGps(false);
        setEmployerGpsStatus(null);
        alert("Could not automatically retrieve GPS. You can select a business hub preset below or enter address manually.");
      },
      { timeout: 8000, enableHighAccuracy: true }
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
        setApplicantLocationStatus(`📍 Location Verified: ${coords.lat}, ${coords.lng}${distNotice}`);
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
      setSubmissionSuccessNotice(true);
      setTimeout(() => setSubmissionSuccessNotice(false), 5000);
      setActiveTab('applications');
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
      alert("Please fill in Title, Company/Institution, and Description.");
      return;
    }

    const reqArray = newRequirements
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const docArray = newRequiredDocs
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const finalLocation = newAddress.trim() 
      ? `${newAddress.trim()}, ${newCity.trim() || 'South Africa'}`
      : newLocation.trim() || `${newCity ? newCity.trim() + ', ' : ''}${newProvince || 'South Africa'}`;

    const newOpp: Opportunity = {
      id: `opp-custom-${Date.now()}`,
      creatorId: currentUser?.uid || 'recruiter',
      creatorName: newCompany.trim(),
      creatorEmail: currentUser?.email || 'recruiter@orbitai.co.za',
      title: newTitle.trim(),
      companyOrInstitution: newCompany.trim(),
      category: newCategory,
      opportunityType: newType,
      workplaceType: newWorkplace,
      location: finalLocation,
      address: newAddress.trim() || undefined,
      city: newCity.trim() || undefined,
      province: newProvince.trim() || undefined,
      country: 'South Africa',
      locationPrecision: newLocationPrecision || 'exact',
      coordinates: newCoordinates || undefined,
      posterImage: newPosterImage.trim() || undefined,
      logoUrl: newLogoUrl.trim() || undefined,
      proofOfResidenceRequired: newProofOfResRequired,
      qualificationRequired: newQualificationRequired,
      description: newDescription.trim(),
      requirements: reqArray.length > 0 ? reqArray : ['Relevant Qualification', 'Reliable Work Ethic'],
      compensationOrGrant: newCompensation.trim() || 'Market Related',
      deadline: newDeadline || '2026-12-31',
      institutionFaculty: newCategory === 'university' ? newFaculty.trim() : undefined,
      institutionCourse: newCategory === 'university' ? newCourse.trim() : undefined,
      minApsScore: newMinAps ? Number(newMinAps) : undefined,
      requiredDocuments: docArray.length > 0 ? docArray : ['CV / Resume'],
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
    setNewPosterImage('');
    setNewLogoUrl('');
    setAiGeneratedPosterPreview('');
    alert("Vacancy published successfully with exact location and media configuration!");
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

  // Category Badge Helper
  const renderCategoryBadge = (category: OpportunityCategory) => {
    switch (category) {
      case 'job':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-blue-600" />
            Job
          </span>
        );
      case 'internship':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-600" />
            Internship
          </span>
        );
      case 'learnership':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
            <Target className="w-3 h-3 text-indigo-600" />
            Learnership
          </span>
        );
      case 'scholarship':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            Scholarship
          </span>
        );
      case 'university':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-100 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-amber-700" />
            Admissions
          </span>
        );
    }
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
      {/* 1. TOP BAR */}
      <View className="h-[56px] px-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none relative z-20">
        <View className="flex flex-row items-center gap-2.5">
          <TouchableOpacity
            onClick={() => onBack ? onBack() : setMobileScreen('chat')}
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            title="Back to Chat"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </TouchableOpacity>
          <View className="flex flex-col">
            <Text className="font-bold text-[17px] text-[#1F1F1F] font-sans tracking-tight">Opportunities</Text>
            <Text className="text-[11px] text-slate-500 font-sans">Jobs, Internships, Scholarships & Higher Ed</Text>
          </View>
        </View>

        {/* Quick Mode Toggle: Explorer vs Employer */}
        <View className="flex flex-row items-center gap-1.5">
          <TouchableOpacity
            onClick={() => setActiveTab(activeTab === 'employer' ? 'all' : 'employer')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'employer'
                ? 'bg-black text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{activeTab === 'employer' ? 'Back to Opportunities' : 'Employer Portal'}</span>
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

      {/* 2. PRIMARY CATEGORY NAV BAR */}
      {activeTab !== 'employer' && (
        <View className="bg-white border-b border-slate-100 px-4 py-2 flex flex-row items-center gap-1.5 select-none overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'jobs', label: 'Jobs' },
            { id: 'internships', label: 'Internships' },
            { id: 'learnerships', label: 'Learnerships' },
            { id: 'scholarships', label: 'Scholarships' },
            { id: 'university', label: 'University & TVET' },
            { id: 'applications', label: `My Applications (${applications.length})` }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 3. MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 bg-white">
        {/* ========================================================================= */}
        {/* EXPLORER / CANDIDATE VIEW */}
        {/* ========================================================================= */}
        {activeTab !== 'employer' && activeTab !== 'applications' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {/* Search & Location Filter Bar (Flat, Clean, Minimalist) */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs, internships, scholarships, courses, skills..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Prominent Near Me Button */}
                <button
                  type="button"
                  onClick={handleToggleNearMe}
                  disabled={isLocating}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
                    nearMeActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLocating
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                  title="Discover opportunities closest to your physical location"
                >
                  {isLocating ? (
                    <>
                      <Locate className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Locating...</span>
                    </>
                  ) : nearMeActive ? (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>Near Me (Active)</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Near Me</span>
                    </>
                  )}
                </button>

                {/* Location and Workplace Dropdowns */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none cursor-pointer flex-1 sm:flex-initial"
                  >
                    <option value="All">All Locations</option>
                    <option value="Johannesburg">Johannesburg</option>
                    <option value="Pretoria">Pretoria</option>
                    <option value="Cape Town">Cape Town</option>
                    <option value="Durban">Durban</option>
                    <option value="Midrand">Midrand</option>
                    <option value="Sandton">Sandton</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="Remote">Remote</option>
                  </select>

                  <select
                    value={selectedWorkplace}
                    onChange={(e) => setSelectedWorkplace(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none cursor-pointer flex-1 sm:flex-initial"
                  >
                    <option value="All">All Modes</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              {/* Near Me Active Notice */}
              {nearMeActive && (
                <div className="px-3 py-1.5 bg-blue-50/90 border border-blue-100 rounded-lg flex items-center justify-between text-xs text-blue-900">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
                    Showing opportunities closest to your current location
                  </span>
                  <button
                    onClick={() => setNearMeActive(false)}
                    className="text-[11px] text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer"
                  >
                    Turn off
                  </button>
                </div>
              )}

              {/* Geolocation Feedback / Error Message */}
              {locationError && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-center justify-between text-xs text-amber-900">
                  <span className="text-[11px]">{locationError}</span>
                  <button onClick={() => setLocationError(null)} className="text-amber-800 hover:text-amber-950 font-bold cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Task Mode CV Connection Bar (Flat, Clean, Minimalist) */}
            <div className="py-2.5 px-3.5 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Task Mode CV:</span>{' '}
                  {taskModeCv ? (
                    <span className="text-slate-600">
                      Connected to <strong>{taskModeCv.name}</strong> ({taskModeCv.position || 'Ready to apply'})
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Create your CV in Task Mode to auto-fill applications
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {taskModeCv && (
                  <button
                    onClick={() => setShowCvViewerModal({ title: `${taskModeCv.name} - CV`, text: taskModeCv.text })}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Preview
                  </button>
                )}
                <button
                  onClick={() => setMobileScreen('task-mode')}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 cursor-pointer flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3 h-3" />
                  {taskModeCv ? 'Edit CV' : 'Create CV in Task Mode'}
                </button>
              </div>
            </div>

            {/* Opportunities List Header */}
            <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-2">
              <Text className="text-xs font-bold text-slate-700 font-sans">
                {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Available
              </Text>
              <div className="flex items-center gap-2">
                {activeTab === 'university' && (
                  <button
                    onClick={() => setShowApsCalc(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    APS Calculator
                  </button>
                )}
              </div>
            </div>

            {/* Opportunities List (Spacious, Flat, Clean - Similar to ChatGPT/Claude/WhatsApp) */}
            {filteredOpportunities.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                <Search className="w-8 h-8 text-slate-300" />
                <Text className="font-bold text-sm text-slate-800 font-sans">No opportunities found</Text>
                <Text className="text-xs text-slate-500 font-sans">Try modifying your search keywords or location filters.</Text>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedLocation('All'); setSelectedWorkplace('All'); setNearMeActive(false); }}
                  className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {filteredOpportunities.map(opp => {
                  const dist = getOppDistance(opp);
                  return (
                    <div
                      key={opp.id}
                      className="py-5 sm:py-6 first:pt-1 text-left flex flex-col gap-3 group transition-colors"
                    >
                      {/* Optional Poster/Banner Image */}
                      {opp.posterImage && (
                        <div className="w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-slate-100 relative">
                          <img
                            src={opp.posterImage}
                            alt={opp.title}
                            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            {renderCategoryBadge(opp.category)}
                            {opp.workplaceType && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                                {opp.workplaceType}
                              </span>
                            )}
                          </div>
                          {opp.isPublicDirectory && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-800 backdrop-blur-xs border border-slate-200/60 shadow-xs">
                                Public Directory
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Header with Logo (if no poster) & Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {!opp.posterImage && opp.logoUrl && (
                            <img
                              src={opp.logoUrl}
                              alt={opp.companyOrInstitution}
                              className="w-11 h-11 rounded-xl object-contain p-1 bg-slate-50 border border-slate-200/80 shrink-0 mt-0.5"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {!opp.posterImage && renderCategoryBadge(opp.category)}
                              {!opp.posterImage && opp.workplaceType && (
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {opp.workplaceType}
                                </span>
                              )}
                              {opp.isPublicDirectory && !opp.posterImage && (
                                <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                                  Public Directory
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-base sm:text-[17px] text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                              {opp.title}
                            </h3>
                            <p className="text-xs sm:text-[13px] text-slate-600 font-medium mt-0.5">
                              {opp.companyOrInstitution}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Location & Distance Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                        {dist !== null && (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
                            {dist} km away
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {opp.address ? `${opp.address}, ` : ''}{opp.city ? `${opp.city}, ` : ''}{opp.province ? `${opp.province}` : opp.location}
                        </span>

                        {opp.locationPrecision && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            opp.locationPrecision === 'exact' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            opp.locationPrecision === 'approximate' ? 'bg-slate-100 text-slate-600' :
                            'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {opp.locationPrecision === 'exact' ? 'Exact Address' :
                             opp.locationPrecision === 'approximate' ? 'Approximate Area' : 'Remote'}
                          </span>
                        )}

                        {opp.compensationOrGrant && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                            {opp.compensationOrGrant}
                          </span>
                        )}

                        {opp.minApsScore && (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Min APS: {opp.minApsScore}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed line-clamp-2">
                        {opp.description}
                      </p>

                      {/* Institution Program (if university) */}
                      {opp.institutionCourse && (
                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                          <span><strong>Course / Programme:</strong> {opp.institutionCourse}</span>
                        </div>
                      )}

                      {/* Public Directory Disclaimer Notice (for university / TVET public listings) */}
                      {opp.isPublicDirectory && (
                        <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-amber-900 flex items-center gap-1.5 text-[11px]">
                              <Info className="w-3.5 h-3.5 text-amber-700" />
                              Public Institution Directory Listing
                            </span>
                            {opp.openingDate && (
                              <span className="text-[11px] text-slate-600 font-medium">
                                Applications Open: <strong>{opp.openingDate}</strong>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 italic leading-relaxed">
                            {opp.sourceDisclaimer || "Public admissions directory record. Orbit AI is an independent platform and is not partnered with, affiliated with, or endorsed by this institution."}
                          </p>
                        </div>
                      )}

                      {/* Key Requirements Tags */}
                      {opp.requirements && opp.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {opp.requirements.slice(0, 3).map((req, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] text-slate-600 font-sans">
                              {req}
                            </span>
                          ))}
                          {opp.requirements.length > 3 && (
                            <span className="px-2 py-1 text-[11px] text-slate-400 font-sans">
                              +{opp.requirements.length - 3} more criteria
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Deadlines & Action Buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Deadline: <strong>{opp.deadline || 'Ongoing'}</strong></span>
                          {opp.applicantCount !== undefined && opp.applicantCount > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>{opp.applicantCount} applied</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOpp(opp);
                              setShowDetailsModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                          >
                            Details
                          </button>

                          {/* If Public Directory with official application URL, show direct portal button */}
                          {opp.officialApplicationUrl && (
                            <a
                              href={opp.officialApplicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1"
                            >
                              <span>Official Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Orbit Application / Document Assistance Button */}
                          <button
                            onClick={() => {
                              setSelectedOpp(opp);
                              setApplicantName(currentUser?.name || '');
                              setApplicantEmail(currentUser?.email || '');
                              setShowApplyModal(true);
                            }}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-xs"
                          >
                            <span>{opp.category === 'university' ? 'Apply with Orbit' : 'Apply'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                onClick={() => setActiveTab('all')}
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
                  onClick={() => setActiveTab('all')}
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

                    {/* Details row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        {app.cvText && (
                          <button
                            onClick={() => setShowCvViewerModal({ title: `${app.applicantName} - Submitted CV`, text: app.cvText || '' })}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View CV
                          </button>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-400">ID: {app.id.substring(0, 10)}</span>
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
                              🎓 {app.qualificationType.replace('_', ' ')}
                            </span>
                          )}
                          {app.documents && app.documents.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                              📎 {app.documents.length} {app.documents.length === 1 ? 'doc' : 'docs'}
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
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* OPPORTUNITY DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && selectedOpp && (
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
                    {renderCategoryBadge(selectedOpp.category)}
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
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2">Required Documents</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOpp.requiredDocuments.map((doc, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 font-medium">
                        📄 {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Close
              </button>

              {selectedOpp.officialApplicationUrl && (
                <a
                  href={selectedOpp.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Official Application Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setApplicantName(currentUser?.name || '');
                  setApplicantEmail(currentUser?.email || '');
                  setShowApplyModal(true);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Apply with Orbit
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
                    {isCapturingApplicantGps ? 'Capturing GPS...' : applicantCoordinates ? '📍 GPS Verified' : 'Capture Current GPS / Location'}
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
      {/* POST NEW VACANCY MODAL (EMPLOYER SIDE) */}
      {/* ========================================================================= */}
      {showPostVacancyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-fade-in text-left">
          <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-sans">Post Opportunity / Vacancy</h3>
                <p className="text-[11px] text-slate-500 font-sans">Reach thousands of qualified job seekers, students, and graduates</p>
              </div>
              <button
                onClick={() => setShowPostVacancyModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3.5 text-xs font-sans">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Junior Software Engineer, Marketing Intern, STEM Bursary"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Institution *</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Apex Tech, Sasol Foundation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as OpportunityCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="job">Job</option>
                    <option value="internship">Internship</option>
                    <option value="learnership">Learnership</option>
                    <option value="scholarship">Scholarship / Bursary</option>
                    <option value="university">University / TVET Admissions</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Opportunity Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as OpportunityType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Learnership">Learnership</option>
                    <option value="Bursary">Bursary</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="TVET">TVET</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Workplace Mode</label>
                  <select
                    value={newWorkplace}
                    onChange={(e) => setNewWorkplace(e.target.value as OpportunityWorkplace)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              {/* Physical Location Details with Exact Address & GPS Capture */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Exact Vacancy Location & GPS Pinning *
                  </span>
                  <span className="text-[10px] text-slate-400">Enables applicant "Near Me" discovery</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Physical Street Address *</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. 15 Alice Lane, Sandton"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">City / Town *</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="e.g. Johannesburg"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Province / Region *</label>
                    <input
                      type="text"
                      value={newProvince}
                      onChange={(e) => setNewProvince(e.target.value)}
                      placeholder="e.g. Gauteng"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* GPS Capture Controls */}
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureEmployerGps}
                      disabled={isCapturingEmployerGps}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 self-start"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      {isCapturingEmployerGps ? 'Capturing GPS...' : newCoordinates ? '📍 GPS Captured' : 'Capture Exact GPS Location'}
                    </button>

                    {newCoordinates && (
                      <span className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {newCoordinates.lat.toFixed(4)}, {newCoordinates.lng.toFixed(4)} (Exact Pin)
                      </span>
                    )}
                  </div>

                  {employerGpsStatus && (
                    <span className="text-[11px] text-slate-500">{employerGpsStatus}</span>
                  )}

                  {/* Quick Hub Coordinates Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium">Quick Hubs:</span>
                    {[
                      { name: 'Sandton CBD', lat: -26.1076, lng: 28.0567, city: 'Sandton', prov: 'Gauteng' },
                      { name: 'Rosebank', lat: -26.1458, lng: 28.0433, city: 'Johannesburg', prov: 'Gauteng' },
                      { name: 'Cape Town Foreshore', lat: -33.9188, lng: 18.4233, city: 'Cape Town', prov: 'Western Cape' },
                      { name: 'Durban Central', lat: -29.8587, lng: 31.0218, city: 'Durban', prov: 'KwaZulu-Natal' },
                      { name: 'Pretoria CBD', lat: -25.7479, lng: 28.2293, city: 'Pretoria', prov: 'Gauteng' }
                    ].map(hub => (
                      <button
                        key={hub.name}
                        type="button"
                        onClick={() => {
                          setNewCoordinates({ lat: hub.lat, lng: hub.lng });
                          if (!newCity) setNewCity(hub.city);
                          if (!newProvince) setNewProvince(hub.prov);
                          setEmployerGpsStatus(`Pinned to ${hub.name} coordinates.`);
                        }}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition"
                      >
                        {hub.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Three Clear Image Options (Upload Poster / Upload Logo / Generate with Orbit AI) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Vacancy Media & Visual Branding
                  </span>
                  <span className="text-[10px] text-slate-500">Choose one of three presentation options</span>
                </div>

                {/* 3-Option Tab Segment */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVacancyImageMode('poster')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition text-center ${
                      vacancyImageMode === 'poster'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1. Upload Poster
                  </button>
                  <button
                    type="button"
                    onClick={() => setVacancyImageMode('logo')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition text-center ${
                      vacancyImageMode === 'logo'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2. Upload Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => setVacancyImageMode('ai_generate')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition text-center flex items-center justify-center gap-1 ${
                      vacancyImageMode === 'ai_generate'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    3. Orbit AI Poster
                  </button>
                </div>

                {/* Option 1: Poster / Banner Upload */}
                {vacancyImageMode === 'poster' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 text-xs">Upload Poster / Banner Image</label>
                      <span className="text-[10px] text-slate-400">PNG, JPG, or WebP</span>
                    </div>

                    <div className="flex gap-2">
                      <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setNewPosterImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        value={newPosterImage}
                        onChange={(e) => setNewPosterImage(e.target.value)}
                        placeholder="Or paste poster image URL..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                      />
                    </div>

                    {newPosterImage && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                        <img src={newPosterImage} alt="Poster preview" className="w-full h-36 object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPosterImage('')}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Company Logo Upload */}
                {vacancyImageMode === 'logo' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 text-xs">Upload Company Logo</label>
                      <span className="text-[10px] text-slate-400">Square or rectangular logo</span>
                    </div>

                    <div className="flex gap-2">
                      <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setNewLogoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        value={newLogoUrl}
                        onChange={(e) => setNewLogoUrl(e.target.value)}
                        placeholder="Or paste company logo URL..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                      />
                    </div>

                    {newLogoUrl && (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <img src={newLogoUrl} alt="Logo preview" className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-slate-200" />
                        <span className="text-xs text-slate-600 font-medium truncate">Logo uploaded successfully</span>
                        <button
                          type="button"
                          onClick={() => setNewLogoUrl('')}
                          className="text-xs text-rose-600 hover:underline ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 3: Generate Professional Poster with Orbit AI */}
                {vacancyImageMode === 'ai_generate' && (
                  <div className="bg-white p-3 rounded-xl border border-blue-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Orbit AI Poster Generator
                      </span>
                      <div className="flex items-center gap-1">
                        {(['navy', 'clean', 'slate'] as const).map(th => (
                          <button
                            key={th}
                            type="button"
                            onClick={() => setAiPosterTheme(th)}
                            className={`px-2 py-0.5 rounded text-[10px] capitalize font-medium cursor-pointer border ${
                              aiPosterTheme === th
                                ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {th}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Creates a studio-quality graphic poster with typography, badges, and company details.
                    </p>

                    <button
                      type="button"
                      onClick={handleTriggerAiPoster}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Professional Poster
                    </button>

                    {aiGeneratedPosterPreview && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 mt-1">
                        <img src={aiGeneratedPosterPreview} alt="AI Generated Poster" className="w-full h-40 object-cover" />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                          ✓ Orbit AI Generated
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Application Rules & Requirements */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-800 block">
                  Application Requirements & Screening
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Minimum Qualification Required</label>
                    <select
                      value={newQualificationRequired}
                      onChange={(e) => setNewQualificationRequired(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                    >
                      <option value="matric">Matric (Grade 12)</option>
                      <option value="grade_9">Grade 9 / General Certificate</option>
                      <option value="degree_diploma">Diploma / Degree</option>
                      <option value="other">Other / Not specified</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="font-bold text-slate-700 block mb-1">Proof of Residence Required?</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewProofOfResRequired(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                          !newProofOfResRequired
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewProofOfResRequired(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                          newProofOfResRequired
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Yes (Required)
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Additional Required Documents (Comma separated)</label>
                  <input
                    type="text"
                    value={newRequiredDocs}
                    onChange={(e) => setNewRequiredDocs(e.target.value)}
                    placeholder="e.g. Driver's License, Academic Transcript, Portfolio"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Compensation / Stipend / Grant</label>
                <input
                  type="text"
                  value={newCompensation}
                  onChange={(e) => setNewCompensation(e.target.value)}
                  placeholder="e.g. R25,000 / month or Full Tuition"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description & Role Responsibilities *</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide detailed description of the role, department, or academic program..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Requirements (One per line) *</label>
                <textarea
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="Grade 12 / Matric Certificate&#10;Diploma or Degree in Computer Science&#10;Proficiency in React / TypeScript&#10;2+ years experience"
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPostVacancyModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVacancy}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
              >
                Publish Opportunity
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
                  {dossierApplicant.applicantName.charAt(0).toUpperCase()}
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
                      📞 {dossierApplicant.applicantPhone}
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
    </SafeAreaView>
  );
};
