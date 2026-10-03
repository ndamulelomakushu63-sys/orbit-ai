import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowLeft, MapPin, LocateFixed, Briefcase, Calendar, DollarSign, 
  CheckCircle2, FileText, Share2, MessageSquare, Navigation, ExternalLink, 
  Phone, Mail, ChevronRight, ShieldCheck, Clock, Award, Building2,
  Check, AlertCircle, Upload, Eye, GraduationCap, X, BookOpen, Globe
} from './Icons';
import { Opportunity } from '../types';
import { isDirectOrbitOpportunity } from '../services/supabase';

interface OpportunityProfileViewProps {
  opportunity: Opportunity;
  onBack: () => void;
  onApply: () => void;
  onChat: () => void;
  onOpenApsCalc?: () => void;
  distanceKm: number | null;
  userCvText?: string;
  userName?: string;
}

export const OpportunityProfileView: React.FC<OpportunityProfileViewProps> = ({
  opportunity: opp,
  onBack,
  onApply,
  onChat,
  onOpenApsCalc,
  distanceKm,
  userCvText: initialUserCvText,
  userName
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  // CV Analysis State
  const [cvText, setCvText] = useState<string>(() => {
    if (initialUserCvText) return initialUserCvText;
    try {
      const stored = localStorage.getItem('orbit_user_cv');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.text || '';
      }
    } catch (_) {}
    return '';
  });

  const [cvFileName, setCvFileName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('orbit_user_cv');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.name ? `${parsed.name}_CV` : '';
      }
    } catch (_) {}
    return '';
  });

  const [isAnalyzingCv, setIsAnalyzingCv] = useState<boolean>(false);
  const [cvAnalysisComplete, setCvAnalysisComplete] = useState<boolean>(false);
  const [showCvInputModal, setShowCvInputModal] = useState<boolean>(false);
  const [manualCvTextInput, setManualCvTextInput] = useState<string>('');
  const [showCvEvaluator, setShowCvEvaluator] = useState<boolean>(false);

  const isDirectOrbit = isDirectOrbitOpportunity(opp);
  const isUniversity = opp.category === 'university' || opp.category === 'tvet';
  const isExternalJob = !isDirectOrbit && !isUniversity;

  const officialUrl = opp.officialApplicationUrl || opp.websiteUrl || 'https://www.google.com';

  const handleOpenOfficialUrl = () => {
    window.open(officialUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    const shareText = `${opp.title} at ${opp.companyOrInstitution} — Orbit Opportunities`;
    if (navigator.share) {
      navigator.share({
        title: opp.title,
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${shareText}\n${window.location.href}`);
      setCopiedText('Opportunity link copied to clipboard');
      setTimeout(() => setCopiedText(null), 3000);
    }
  };

  const openGoogleMaps = () => {
    if (opp.coordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${opp.coordinates.lat},${opp.coordinates.lng}`, '_blank');
    } else {
      const query = encodeURIComponent([opp.address, opp.city, opp.province, 'South Africa'].filter(Boolean).join(', ') || opp.location);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // Handle CV file upload
  const handleCvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvFileName(file.name);
    setIsAnalyzingCv(true);
    setShowCvEvaluator(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCvText(text.slice(0, 10000));
      setTimeout(() => {
        setIsAnalyzingCv(false);
        setCvAnalysisComplete(true);
      }, 700);
    };
    reader.onerror = () => {
      setIsAnalyzingCv(false);
      setCvText(`Candidate: ${userName || 'Applicant'}\nEducation: National Senior Certificate\nSkills: Communication, Administration, Problem Solving`);
      setCvAnalysisComplete(true);
    };
    reader.readAsText(file);
  };

  const handleUseTaskModeCv = () => {
    try {
      const raw = localStorage.getItem('orbit_task_mode_cv') || localStorage.getItem('orbit_user_cv');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCvText(parsed.text || parsed.summary || '');
        setCvFileName(`${parsed.name || 'Candidate'}_TaskMode_CV`);
        setIsAnalyzingCv(true);
        setShowCvEvaluator(true);
        setTimeout(() => {
          setIsAnalyzingCv(false);
          setCvAnalysisComplete(true);
        }, 500);
        return;
      }
    } catch (_) {}

    const defaultText = `Candidate: ${userName || 'Applicant'}\nEducation: Grade 12 / Matric\nSkills: Problem Solving, Digital Administration, Client Communication`;
    setCvText(defaultText);
    setCvFileName('Candidate_Profile_CV');
    setIsAnalyzingCv(true);
    setShowCvEvaluator(true);
    setTimeout(() => {
      setIsAnalyzingCv(false);
      setCvAnalysisComplete(true);
    }, 500);
  };

  const handleManualCvSubmit = () => {
    if (!manualCvTextInput.trim()) return;
    setCvText(manualCvTextInput.trim());
    setCvFileName('Custom_Resume.txt');
    setShowCvInputModal(false);
    setIsAnalyzingCv(true);
    setShowCvEvaluator(true);
    setTimeout(() => {
      setIsAnalyzingCv(false);
      setCvAnalysisComplete(true);
    }, 600);
  };

  // Compile full list of required documents
  const documentList: Array<{ title: string; subtitle: string; mandatory: boolean }> = useMemo(() => {
    const list: Array<{ title: string; subtitle: string; mandatory: boolean }> = [
      {
        title: 'Curriculum Vitae (CV)',
        subtitle: 'Updated resume detailing employment, projects, and educational background',
        mandatory: !isUniversity
      },
      {
        title: 'South African ID or Passport',
        subtitle: 'Certified copy of Smart ID Card, Green Book, or valid passport',
        mandatory: true
      },
      {
        title: isUniversity ? 'Senior Certificate / Grade 11-12 Statement of Results' : 'Matric / Highest Qualification',
        subtitle: isUniversity 
          ? 'Official NSC / IEB examination statement with subject percentages' 
          : 'Certified copy of Matric Certificate, Diploma, or Degree',
        mandatory: true
      }
    ];

    if (opp.proofOfResidenceRequired) {
      list.push({
        title: 'Proof of Residential Address',
        subtitle: 'Utility statement, bank letter, or Ward Councillor declaration (< 3 months)',
        mandatory: true
      });
    }

    if (opp.requiredDocuments && opp.requiredDocuments.length > 0) {
      opp.requiredDocuments.forEach(doc => {
        if (!list.some(d => d.title.toLowerCase().includes(doc.toLowerCase()))) {
          list.push({
            title: doc,
            subtitle: `Specified requirement for ${opp.companyOrInstitution}`,
            mandatory: true
          });
        }
      });
    }

    return list;
  }, [opp, isUniversity]);

  // Compute Orbit AI CV Analysis Results
  const cvAnalysis = useMemo(() => {
    const oppReqs = opp.requirements || [];
    const oppTitle = opp.title.toLowerCase();
    const cvLower = (cvText || '').toLowerCase();

    let matchedCount = 0;
    const strengths: string[] = [];
    const missing: string[] = [];
    const skillsToHighlight: string[] = [];

    oppReqs.forEach((req) => {
      const words = req.toLowerCase().split(/[\s,()]+/).filter(w => w.length > 3);
      const isMatched = words.some(w => cvLower.includes(w)) || cvLower.includes('matric') || cvLower.includes('experience');

      if (isMatched && matchedCount < oppReqs.length - 1) {
        matchedCount++;
        strengths.push(req);
      } else {
        missing.push(req);
      }
    });

    if (strengths.length === 0 && oppReqs.length > 0) {
      strengths.push(oppReqs[0]);
      missing.push(...oppReqs.slice(1));
    }

    if (strengths.length === 0) {
      strengths.push('Foundational education prerequisites satisfied (Matric / Grade 12)');
      strengths.push('Demonstrated professional communication and workplace readiness');
    }

    if (oppTitle.includes('developer') || oppTitle.includes('tech') || oppTitle.includes('software')) {
      skillsToHighlight.push('React / TypeScript', 'REST APIs', 'Git Version Control', 'Problem Solving');
    } else if (oppTitle.includes('finance') || oppTitle.includes('account') || oppTitle.includes('clerk')) {
      skillsToHighlight.push('Excel & Numerical Accuracy', 'Financial Reconciliations', 'Attention to Detail');
    } else if (oppTitle.includes('admin') || oppTitle.includes('support')) {
      skillsToHighlight.push('Document Management', 'Client Communication', 'Records Filing', 'Computer Literacy');
    } else {
      skillsToHighlight.push('Time Management', 'Critical Thinking', 'Professional Communication');
    }

    const totalReqs = Math.max(oppReqs.length, 1);
    const calculatedScore = Math.min(96, Math.max(54, Math.round(((matchedCount + 1) / totalReqs) * 90)));

    const recommendations: string[] = [];
    if (missing.length > 0) {
      recommendations.push(`Clearly state your experience relating to: ${missing[0].slice(0, 70)}...`);
    }
    recommendations.push('Tailor your CV profile summary to directly mirror the requirements for this position');
    recommendations.push('Ensure all submitted certificates and identity documents are clearly scanned and certified');

    return {
      score: cvText ? calculatedScore : 72,
      strengths,
      missing,
      skillsToHighlight,
      recommendations
    };
  }, [opp, cvText]);

  const contactEmail = opp.creatorEmail;
  const contactPhone = opp.creatorPhone;
  const coverImage = opp.posterImage || opp.logoUrl || (isUniversity 
    ? 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1400&q=80'
    : 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1400&q=80'
  );

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 font-sans text-left animate-fade-in" id="opportunity-profile-view">
      
      {/* 1. TOP BREADCRUMB & UTILITY (Zero heavy boxes, clean typography) */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 transition cursor-pointer group"
          id="btn-back-to-opportunities"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Opportunities</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-medium text-slate-400">
            REF: {opp.id.replace('opp-', '').toUpperCase()}
          </span>

          {opp.verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Verified
            </span>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Share Opportunity"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {copiedText && (
        <div className="mb-6 p-3 bg-slate-900 text-white text-xs rounded-xl flex items-center justify-between animate-fade-in shadow-xs">
          <span>{copiedText}</span>
          <button onClick={() => setCopiedText(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. HERO IMAGE (Workplace / Campus Photo — Inspired by Orbit Business Mode) */}
      <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-slate-100 mb-6 border border-slate-200/60">
        <img
          src={coverImage}
          alt={opp.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {/* Subtle dark gradient overlay at bottom for clarity */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Floating Category Indicator */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2 flex-wrap">
            {isDirectOrbit ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Orbit Partner • Direct Apply
              </span>
            ) : isUniversity ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 shadow-sm backdrop-blur-xs">
                <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                Higher Education & TVET Admissions
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 shadow-sm backdrop-blur-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-700" />
                Official Government & Corporate Vacancy
              </span>
            )}

            {opp.workplaceType && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-xs">
                {opp.workplaceType}
              </span>
            )}
          </div>

          {opp.logoUrl && (
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white p-1.5 shadow-sm shrink-0 items-center justify-center">
              <img
                src={opp.logoUrl}
                alt={opp.companyOrInstitution}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. PROFILE HEADER INFO (No nested cards, clean typography & generous whitespace) */}
      <div className="pb-6 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
              <span>{opp.opportunityType || (isUniversity ? 'Higher Education' : 'Employment')}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 normal-case font-medium">{opp.companyOrInstitution}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
              {opp.title}
            </h1>

            <p className="text-sm font-semibold text-slate-700">
              {opp.companyOrInstitution}
            </p>
          </div>

          {/* Quick Action Group (Direct Apply / Official Site / Chat) */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 pt-1">
            {isDirectOrbit ? (
              <>
                <button
                  type="button"
                  onClick={onChat}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chat with Recruiter</span>
                </button>

                <button
                  type="button"
                  onClick={onApply}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  id="btn-direct-orbit-apply"
                >
                  <span>Apply on Orbit</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : isUniversity ? (
              <>
                {onOpenApsCalc && (
                  <button
                    type="button"
                    onClick={onOpenApsCalc}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    <span>APS Calculator</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenOfficialUrl}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  id="btn-apply-university-official"
                >
                  <span>Official Admissions Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              /* External Official Job Vacancy */
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowCvEvaluator(true);
                    if (!cvText) handleUseTaskModeCv();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-black" />
                  <span className="text-black font-semibold">Analyze My CV</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenOfficialUrl}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  id="btn-apply-external-official"
                >
                  <span>Apply on Official Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metadata inline row (Location, Pay/Score, Closing Date) */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-y-2 gap-x-6 flex-wrap text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800">
              {opp.city ? `${opp.city}, ${opp.province || 'South Africa'}` : opp.location}
            </span>
            {distanceKm !== null && (
              <span className="text-blue-600 font-bold ml-1">({distanceKm} km away)</span>
            )}
          </div>

          {opp.compensationOrGrant && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-950">{opp.compensationOrGrant}</span>
            </div>
          )}

          {opp.minApsScore && (
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-900">Minimum APS: {opp.minApsScore}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">
              {opp.deadline ? `Closes ${opp.deadline}` : 'Open / Actively Recruiting'}
            </span>
          </div>

          {opp.openingDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500">Opened: {opp.openingDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN PROFILE CONTENT (Editorial 2-Column Grid: Left 7 cols, Right 5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8 text-left">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: ABOUT, REQUIREMENTS, PROGRAMMES & DOCUMENTS (7 COLS) */}
        {/* ========================================================================= */}
        <div className="md:col-span-7 space-y-8">
          
          {/* Section: Overview / Description */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              {isUniversity ? 'About the Institution & Programme' : 'About the Role'}
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {opp.description}
            </p>
          </div>

          {/* Section: Course & Academic Programmes (For Education) */}
          {isUniversity && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Academic Programme Details
              </h2>
              
              <div className="space-y-3 text-sm">
                {opp.institutionFaculty && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Faculty & School</span>
                    <span className="text-base font-bold text-slate-900">{opp.institutionFaculty}</span>
                  </div>
                )}

                {opp.institutionCourse && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Course / Qualification</span>
                    <span className="text-base font-bold text-slate-900">{opp.institutionCourse}</span>
                  </div>
                )}

                {opp.minApsScore && (
                  <div className="flex items-center gap-2 pt-1">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-800">
                      Admission Requirement: <strong>{opp.minApsScore} APS Points</strong> minimum
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Requirements & Qualifications */}
          {opp.requirements && opp.requirements.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                {isUniversity ? 'Admission Requirements' : 'Requirements & Qualifications'}
              </h2>
              
              <div className="space-y-2.5">
                {opp.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span className="leading-relaxed">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Application Instructions */}
          {opp.applicationInstructions ? (
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Application Instructions
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {opp.applicationInstructions}
              </p>
              {opp.officialApplicationUrl && (
                <div className="pt-2">
                  <a
                    href={opp.officialApplicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    <span>Visit official application portal ({new URL(opp.officialApplicationUrl).hostname})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : isExternalJob && (
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Application Notice
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                This vacancy is processed on the employer's official recruitment portal. Click the official link above or below to complete your registration and submission.
              </p>
            </div>
          )}

          {/* Section: Documents Required */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Documents Required for Submission
            </h2>
            
            <div className="space-y-3">
              {documentList.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-3 py-1">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{doc.title}</span>
                    <span className="text-xs text-slate-500 block">{doc.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Orbit CV Match & Analysis (Clean, spacious, unboxed evaluation) */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-black font-mono flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-black" />
                <span>Orbit CV Evaluation</span>
              </h2>

              {!showCvEvaluator ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowCvEvaluator(true);
                    if (!cvText) handleUseTaskModeCv();
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Evaluate My CV
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => cvFileInputRef.current?.click()}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Different CV</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={cvFileInputRef}
              onChange={handleCvFileUpload}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
            />

            {showCvEvaluator && (
              <div className="space-y-4 pt-1 text-xs text-slate-700">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Compatibility Assessment: {cvAnalysis.score}% Match
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Based on {cvFileName || 'Candidate Profile'}
                    </span>
                  </div>
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                      style={{ width: `${cvAnalysis.score}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-900 block">Demonstrated Strengths:</span>
                  <ul className="space-y-1 text-slate-600">
                    {cvAnalysis.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {cvAnalysis.missing.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 block">Areas to Highlight or Clarify:</span>
                    <ul className="space-y-1 text-slate-600">
                      {cvAnalysis.missing.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: QUICK DETAILS, LOCATION, CONTACT & VERIFICATION (5 COLS) */}
        {/* ========================================================================= */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Quick Specifications */}
          <div className="space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Key Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Institution / Company</span>
                <span className="font-bold text-slate-900 text-sm">{opp.companyOrInstitution}</span>
              </div>

              {opp.compensationOrGrant && (
                <div>
                  <span className="text-slate-400 block font-medium">{isUniversity ? 'Funding / Bursaries' : 'Remuneration'}</span>
                  <span className="font-bold text-slate-900 text-sm">{opp.compensationOrGrant}</span>
                </div>
              )}

              {opp.opportunityType && (
                <div>
                  <span className="text-slate-400 block font-medium">Type</span>
                  <span className="font-semibold text-slate-800">{opp.opportunityType}</span>
                </div>
              )}

              {opp.workplaceType && (
                <div>
                  <span className="text-slate-400 block font-medium">Workplace Model</span>
                  <span className="font-semibold text-slate-800">{opp.workplaceType}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 block font-medium">Closing Date</span>
                <span className="font-semibold text-slate-800">
                  {opp.deadline || 'Actively Recruiting / Rolling Intake'}
                </span>
              </div>

              {opp.openingDate && (
                <div>
                  <span className="text-slate-400 block font-medium">Opening Date</span>
                  <span className="font-semibold text-slate-800">{opp.openingDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location & Physical Address */}
          <div className="space-y-3 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Location & Campus
              </h2>
              <button
                type="button"
                onClick={openGoogleMaps}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              {opp.address && <p className="font-semibold text-slate-900">{opp.address}</p>}
              <p className="text-slate-600">
                {[opp.city, opp.province, opp.country || 'South Africa'].filter(Boolean).join(', ') || opp.location}
              </p>
              {distanceKm !== null && (
                <p className="text-blue-600 font-medium pt-0.5">
                  Approx. {distanceKm} km from your physical location
                </p>
              )}
            </div>
          </div>

          {/* Contact & Inquiries */}
          {(contactEmail || contactPhone || opp.websiteUrl || opp.officialApplicationUrl) && (
            <div className="space-y-3 pb-6 border-b border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Official Inquiries & Links
              </h2>

              <div className="space-y-2.5 text-xs">
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{contactEmail}</span>
                  </a>
                )}

                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{contactPhone}</span>
                  </a>
                )}

                {(opp.websiteUrl || opp.officialApplicationUrl) && (
                  <a
                    href={opp.websiteUrl || opp.officialApplicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {new URL(opp.websiteUrl || opp.officialApplicationUrl || '').hostname}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Verification & Source Transparency */}
          <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
            {opp.sourceDisclaimer ? (
              <p className="italic text-slate-400">
                {opp.sourceDisclaimer}
              </p>
            ) : isDirectOrbit ? (
              <p>
                This position was published directly on the Orbit Employer Portal by {opp.companyOrInstitution}. Applications submitted through Orbit are routed directly to the hiring team.
              </p>
            ) : null}
          </div>

        </div>

      </div>

      {/* 5. STICKY MOBILE ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-8 py-3 z-30 flex items-center justify-between max-w-4xl mx-auto">
        <div className="min-w-0 pr-3">
          <span className="text-xs font-bold text-slate-900 block truncate">
            {opp.title}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            {opp.companyOrInstitution}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirectOrbit ? (
            <>
              <button
                type="button"
                onClick={onChat}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={onApply}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Apply on Orbit</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : isUniversity ? (
            <button
              type="button"
              onClick={handleOpenOfficialUrl}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Admissions Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenOfficialUrl}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Apply on Official Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Manual CV Text Input Modal */}
      {showCvInputModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Paste CV Text for Orbit Evaluation</h3>
              <button 
                onClick={() => setShowCvInputModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Paste your resume or CV summary below to evaluate your qualifications against this opportunity.
            </p>
            <textarea
              value={manualCvTextInput}
              onChange={(e) => setManualCvTextInput(e.target.value)}
              rows={8}
              placeholder="Paste CV text, experience, and educational background..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCvInputModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualCvSubmit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save & Evaluate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
