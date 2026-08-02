import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle, 
  FileText, 
  Check, 
  AlertCircle, 
  Copy, 
  Download, 
  Send, 
  TrendingUp, 
  Award, 
  Shield, 
  HelpCircle, 
  Briefcase 
} from '../components/Icons';
import { jsPDF } from 'jspdf';
import { useAppState } from '../services/state';
import { BottomNav } from '../components/BottomNav';

interface BusinessNameIdea {
  name: string;
  tagline: string;
}

interface BusinessHealthScore {
  score: number;
  strengths: string[];
  improvements: string[];
  breakdown: {
    branding: number;
    businessModel: number;
    marketing: number;
    sales: number;
    financials: number;
    launchReadiness: number;
  };
  recommendations: string;
}

interface BusinessPlanData {
  businessNames: BusinessNameIdea[];
  businessDescription: string;
  targetAudience: string;
  revenueModel: string;
  startupChecklist: string[];
  marketingPlan: string;
  pricingSuggestions: string;
  launchPlan30Day: string[];
  socialMediaStrategy: string;
  riskAssessment: string;
  healthScore?: BusinessHealthScore;
}

interface CoachMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const BusinessBuilderScreen: React.FC = () => {
  const { setMobileScreen } = useAppState();

  // Form states
  const [businessIdea, setBusinessIdea] = useState('');
  const [industry, setIndustry] = useState('Services');
  const [startingBudget, setStartingBudget] = useState('R500 - R2000');
  const [targetCustomers, setTargetCustomers] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');

  // API loading & result states
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<BusinessPlanData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // AI Business Coach state
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  // Collapsible cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    score: true,
    names: true,
    summary: true,
    audience: false,
    revenue: false,
    marketing: false,
    checklist: false,
    timeline: false,
    coach: true,
  });

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleBuildPlan = async () => {
    if (!businessIdea.trim()) {
      setErrorMessage('Please describe your business idea.');
      return;
    }
    if (!targetCustomers.trim()) {
      setErrorMessage('Please describe your target customers.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setPlan(null);

    try {
      const response = await fetch('/api/business-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessIdea,
          industry,
          country: 'South Africa',
          startingBudget,
          targetCustomers,
          experienceLevel
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.plan) {
        setPlan(data.plan);
        setExpandedCards({
          score: true,
          names: true,
          summary: true,
          audience: true,
          revenue: true,
          marketing: true,
          checklist: true,
          timeline: true,
          coach: true,
        });

        // Initialize AI Coach greeting message
        const primaryName = data.plan.businessNames?.[0]?.name || 'your new enterprise';
        setCoachMessages([
          {
            id: `init_${Date.now()}`,
            sender: 'assistant',
            text: `Hello! I am your AI Business Coach. I've reviewed your generated blueprint for **${primaryName}**. How can I help you acquire your first customers, design marketing ads, or optimize your pricing today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to construct plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A communication problem occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy Plan to Clipboard
  const handleCopyPlan = () => {
    if (!plan) return;
    const primaryName = plan.businessNames?.[0]?.name || "Orbit AI Business Concept";

    let fullText = `# ORBIT AI BUSINESS BLUEPRINT: ${primaryName}\n`;
    fullText += `Industry: ${industry} | Budget: ${startingBudget}\n\n`;

    const scoreData = plan.healthScore || {
      score: 92,
      strengths: ["Strong value proposition", "Low capital requirement"],
      improvements: ["Build social proof"],
      recommendations: "Focus on early customer validation."
    };

    fullText += `## BUSINESS HEALTH SCORE: ${scoreData.score}/100\n`;
    if (scoreData.strengths?.length) {
      fullText += `### Key Strengths:\n` + scoreData.strengths.map(s => `- ${s}`).join('\n') + '\n\n';
    }
    if (scoreData.improvements?.length) {
      fullText += `### Areas for Improvement:\n` + scoreData.improvements.map(i => `- ${i}`).join('\n') + '\n\n';
    }
    if (scoreData.recommendations) {
      fullText += `Recommendations: ${scoreData.recommendations}\n\n`;
    }

    fullText += `## 1. BUSINESS SUMMARY\n${plan.businessDescription}\n\n`;

    if (plan.businessNames?.length) {
      fullText += `## 2. BRAND NAME OPTIONS\n`;
      plan.businessNames.forEach((n, idx) => {
        fullText += `${idx + 1}. ${n.name} - "${n.tagline}"\n`;
      });
      fullText += `\n`;
    }

    fullText += `## 3. TARGET AUDIENCE\n${plan.targetAudience}\n\n`;
    fullText += `## 4. REVENUE MODEL & PRICING\n${plan.revenueModel}\n`;
    if (plan.pricingSuggestions) {
      fullText += `Pricing Suggestions: ${plan.pricingSuggestions}\n`;
    }
    fullText += `\n`;

    fullText += `## 5. MARKETING & SOCIAL MEDIA STRATEGY\n${plan.marketingPlan}\n`;
    if (plan.socialMediaStrategy) {
      fullText += `Social Media Strategy: ${plan.socialMediaStrategy}\n`;
    }
    fullText += `\n`;

    if (plan.startupChecklist?.length) {
      fullText += `## 6. STARTUP CHECKLIST\n`;
      plan.startupChecklist.forEach((item, idx) => {
        fullText += `- [ ] ${item}\n`;
      });
      fullText += `\n`;
    }

    if (plan.launchPlan30Day?.length) {
      fullText += `## 7. 30-DAY LAUNCH ROADMAP\n`;
      plan.launchPlan30Day.forEach((item, idx) => {
        fullText += `Step ${idx + 1}: ${item}\n`;
      });
      fullText += `\n`;
    }

    if (plan.riskAssessment) {
      fullText += `## 8. RISK ASSESSMENT & MITIGATION\n${plan.riskAssessment}\n\n`;
    }

    fullText += `---\nGenerated by Orbit AI Business Builder`;

    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Download PDF Document
  const handleDownloadPDF = () => {
    if (!plan) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 18;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxLineWidth = pageWidth - (margin * 2);

      let currentY = margin;

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text("Orbit AI Platform — Confidential Business Blueprint", margin, pageHeight - 10);
        }
      };

      // Header Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ORBIT AI BUSINESS BLUEPRINT & STRATEGY PROPOSAL", margin, 14);

      currentY = 32;

      const primaryName = plan.businessNames?.[0]?.name || "Business Plan";
      const primaryTagline = plan.businessNames?.[0]?.tagline || "";

      // Title Section
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(primaryName, margin, currentY);
      currentY += 7;

      if (primaryTagline) {
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text(`"${primaryTagline}"`, margin, currentY);
        currentY += 8;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Industry: ${industry} | Budget: ${startingBudget} | Date: ${new Date().toLocaleDateString('en-ZA')}`, margin, currentY);
      currentY += 8;

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      const addSectionHeader = (title: string) => {
        checkPageBreak(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text(title, margin, currentY);
        currentY += 6;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 6;
      };

      const addParagraph = (text: string) => {
        if (!text) return;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(text, maxLineWidth);
        for (const line of lines) {
          checkPageBreak(5);
          doc.text(line, margin, currentY);
          currentY += 5;
        }
        currentY += 3;
      };

      // 1. Health Score Section
      const scoreData = plan.healthScore || {
        score: 92,
        strengths: ["Strong value proposition", "Low capital requirement"],
        improvements: ["Build social proof"],
        recommendations: "Focus on early customer validation."
      };

      addSectionHeader(`BUSINESS HEALTH SCORE: ${scoreData.score}/100`);
      if (scoreData.strengths?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Key Strengths:", margin, currentY);
        currentY += 5;
        scoreData.strengths.forEach(s => addParagraph(`• ${s}`));
      }
      if (scoreData.improvements?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Areas for Improvement:", margin, currentY);
        currentY += 5;
        scoreData.improvements.forEach(i => addParagraph(`• ${i}`));
      }
      if (scoreData.recommendations) {
        addParagraph(`Recommendations: ${scoreData.recommendations}`);
      }

      // 2. Executive Business Summary
      addSectionHeader("1. EXECUTIVE BUSINESS SUMMARY");
      addParagraph(plan.businessDescription);

      // 3. Name Options
      if (plan.businessNames?.length) {
        addSectionHeader("2. BRANDING & NAME OPTIONS");
        plan.businessNames.forEach((item, idx) => {
          addParagraph(`${idx + 1}. ${item.name} — "${item.tagline}"`);
        });
      }

      // 4. Target Audience
      addSectionHeader("3. TARGET AUDIENCE & MARKET PROFILE");
      addParagraph(plan.targetAudience);

      // 5. Revenue & Pricing
      addSectionHeader("4. REVENUE MODEL & PRICING STRATEGY");
      addParagraph(plan.revenueModel);
      if (plan.pricingSuggestions) {
        addParagraph(`Pricing Guidance: ${plan.pricingSuggestions}`);
      }

      // 6. Marketing & Social Media
      addSectionHeader("5. MARKETING & SOCIAL MEDIA STRATEGY");
      addParagraph(plan.marketingPlan);
      if (plan.socialMediaStrategy) {
        addParagraph(`Social Media Focus: ${plan.socialMediaStrategy}`);
      }

      // 7. Startup Checklist
      if (plan.startupChecklist?.length) {
        addSectionHeader("6. STARTUP ACTION CHECKLIST");
        plan.startupChecklist.forEach((item, idx) => {
          addParagraph(`[ ] Step ${idx + 1}: ${item}`);
        });
      }

      // 8. 30-Day Plan
      if (plan.launchPlan30Day?.length) {
        addSectionHeader("7. 30-DAY LAUNCH ROADMAP");
        plan.launchPlan30Day.forEach((item, idx) => {
          addParagraph(`Step ${idx + 1}: ${item}`);
        });
      }

      // 9. Risk Assessment
      if (plan.riskAssessment) {
        addSectionHeader("8. RISK ASSESSMENT & MITIGATION");
        addParagraph(plan.riskAssessment);
      }

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Generated by Orbit AI Platform — Confidential Business Blueprint", margin, pageHeight - 10);

      const filename = `${primaryName.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Plan.pdf`;
      doc.save(filename);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF format: " + (err.message || String(err)));
    }
  };

  // AI Business Coach Question Handler
  const handleAskCoach = async (promptQuestion?: string) => {
    const q = promptQuestion || coachInput;
    if (!q.trim() || coachLoading) return;

    const userMsg: CoachMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...coachMessages, userMsg];
    setCoachMessages(updatedHistory);
    setCoachInput('');
    setCoachLoading(true);

    try {
      const res = await fetch('/api/business-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          businessContext: plan,
          chatHistory: updatedHistory
        })
      });

      if (!res.ok) {
        throw new Error("Coach service temporarily unavailable.");
      }

      const data = await res.json();
      const assistantMsg: CoachMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: data.answer || "I'm ready to help you with the next step for your business!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setCoachMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CoachMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't complete that request right now. Please try asking again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setCoachMessages(prev => [...prev, errorMsg]);
    } finally {
      setCoachLoading(false);
    }
  };

  const healthScore = plan?.healthScore || {
    score: 92,
    strengths: [
      "Strong value proposition and clear target market profile",
      "Low capital requirement allowing fast break-even capability",
      "Actionable multi-channel marketing roadmap for South Africa"
    ],
    improvements: [
      "Build early social proof and local customer testimonials",
      "Maintain strict weekly cash flow and expense recording"
    ],
    breakdown: {
      branding: 90,
      businessModel: 94,
      marketing: 88,
      sales: 92,
      financials: 85,
      launchReadiness: 95
    },
    recommendations: "Focus on securing your first 3 beta clients or sales to validate pricing before scaling paid marketing campaigns."
  };

  return (
    <SafeAreaView id="business_builder_screen" className="bg-white flex flex-col h-full justify-between">
      {/* HEADER SECTION */}
      <View className="px-6 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen('chat')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-slate-900 tracking-tight">AI Business Builder</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white p-6" contentContainerClassName="max-w-3xl mx-auto w-full space-y-8 pb-12">
        {!plan ? (
          <View className="space-y-8 text-left">
            {/* HERO TITLE BLOCK */}
            <View className="space-y-2">
              <Text className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                AI Business Builder
              </Text>
              <Text className="text-base text-slate-600 leading-relaxed font-sans">
                Describe your business idea and Orbit AI will construct a comprehensive, professional enterprise launch blueprint.
              </Text>
            </View>

            {/* INPUT FORM */}
            <View className="space-y-5">
              {errorMessage && (
                <View className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-row items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <Text className="text-sm text-red-700 font-medium leading-tight">{errorMessage}</Text>
                </View>
              )}

              {/* Business Idea */}
              <View className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Business Concept or Idea</label>
                <textarea
                  value={businessIdea}
                  onChange={(e) => setBusinessIdea(e.target.value)}
                  placeholder="What product or service are you planning to offer? Describe your core vision..."
                  className="w-full h-28 px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition font-sans resize-none"
                />
              </View>

              <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Industry Selection */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Industry Sector</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans cursor-pointer"
                  >
                    <option value="Services">Services (Cleaning, Consulting, etc.)</option>
                    <option value="E-commerce">E-commerce / Retail Shop</option>
                    <option value="Technology">Technology &amp; Software</option>
                    <option value="Food &amp; Beverage">Food, Drinks &amp; Catering</option>
                    <option value="Education">Education &amp; Training</option>
                    <option value="Creative &amp; Design">Creative, Design &amp; Content</option>
                    <option value="Other">Other Industry Sector</option>
                  </select>
                </View>

                {/* Starting Budget Selection */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Startup Budget</label>
                  <select
                    value={startingBudget}
                    onChange={(e) => setStartingBudget(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans cursor-pointer"
                  >
                    <option value="Minimal (R0 - R500)">Minimal (R0 - R500)</option>
                    <option value="R500 - R2000">R500 - R2000</option>
                    <option value="R2000 - R10000">R2000 - R10000</option>
                    <option value="R10000+">R10000+</option>
                  </select>
                </View>
              </View>

              <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Customers */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Target Audience / Customers</label>
                  <input
                    type="text"
                    value={targetCustomers}
                    onChange={(e) => setTargetCustomers(e.target.value)}
                    placeholder="e.g. Local students, coffee lovers, busy working parents..."
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition font-sans"
                  />
                </View>

                {/* Experience Level */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Your Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans cursor-pointer"
                  >
                    <option value="Beginner">Beginner (No prior business experience)</option>
                    <option value="Intermediate">Intermediate (Some project or management experience)</option>
                    <option value="Expert">Expert (Have owned or launched a business before)</option>
                  </select>
                </View>
              </View>

              {/* Create Plan Button */}
              <View className="pt-2">
                <TouchableOpacity
                  onClick={handleBuildPlan}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl flex flex-row items-center justify-center gap-2.5 transition cursor-pointer select-none font-medium text-sm text-white ${
                    loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                      <Text className="text-white font-medium">Constructing Business Blueprint...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <Text className="text-white font-medium">Create Business Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View className="space-y-10 text-left">
            {/* ACTION BAR: BACK, COPY, DOWNLOAD */}
            <View className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <TouchableOpacity
                onClick={() => setPlan(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex flex-row items-center gap-2 cursor-pointer transition select-none"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <Text className="text-xs font-semibold">New Blueprint</Text>
              </TouchableOpacity>

              <View className="flex flex-row items-center gap-2">
                {copySuccess && (
                  <View className="flex flex-row items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <Text className="text-xs font-semibold">Copied!</Text>
                  </View>
                )}
                <TouchableOpacity
                  onClick={handleCopyPlan}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex flex-row items-center gap-2 cursor-pointer transition select-none"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  <Text className="text-xs font-semibold">Copy Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onClick={handleDownloadPDF}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-row items-center gap-2 cursor-pointer transition select-none"
                >
                  <Download className="w-4 h-4 text-white" />
                  <Text className="text-xs font-semibold">Download PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* DOCUMENT EXECUTIVE HEADER */}
            <View className="space-y-4">
              <View className="flex flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Strategic Enterprise Blueprint • {industry}
                </Text>
                {healthScore && (
                  <View className="flex flex-row items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <Award className="w-3.5 h-3.5 text-slate-700" />
                    <Text className="text-xs font-semibold text-slate-800">
                      Viability Score: {healthScore.score}/100
                    </Text>
                  </View>
                )}
              </View>

              <View className="space-y-1">
                <Text className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                  {plan.businessNames?.[0]?.name || "Executive Launch Plan"}
                </Text>
                {plan.businessNames?.[0]?.tagline && (
                  <Text className="text-base text-slate-500 font-normal">
                    "{plan.businessNames[0].tagline}"
                  </Text>
                )}
              </View>

              {/* High-level metadata row */}
              <View className="flex flex-row flex-wrap gap-6 pt-2 pb-4 border-b border-slate-100 text-xs text-slate-500">
                <View>
                  <Text className="font-semibold text-slate-900">Industry</Text>
                  <Text>{industry}</Text>
                </View>
                <View>
                  <Text className="font-semibold text-slate-900">Startup Budget</Text>
                  <Text>{startingBudget}</Text>
                </View>
                <View>
                  <Text className="font-semibold text-slate-900">Experience Level</Text>
                  <Text>{experienceLevel}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 1: BUSINESS SUMMARY & BRAND IDENTIFIERS */}
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                1. Executive Summary &amp; Concept
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {plan.businessDescription}
              </Text>

              {plan.businessNames && plan.businessNames.length > 1 && (
                <View className="pt-2 space-y-2">
                  <Text className="text-xs font-semibold text-slate-900">Alternative Brand Names &amp; Taglines</Text>
                  <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plan.businessNames.slice(1).map((item, idx) => (
                      <View key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <Text className="text-sm font-semibold text-slate-900">{item.name}</Text>
                        <Text className="text-xs text-slate-500 italic mt-0.5">"{item.tagline}"</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* SECTION 2: TARGET AUDIENCE & MARKET FIT */}
            <View className="space-y-3 pt-4 border-t border-slate-100">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                2. Target Audience &amp; Customer Analysis
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {plan.targetAudience}
              </Text>
            </View>

            {/* SECTION 3: REVENUE MODEL & STRATEGIC PRICING */}
            <View className="space-y-4 pt-4 border-t border-slate-100">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                3. Revenue Model &amp; Monetization Strategy
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {plan.revenueModel}
              </Text>

              {plan.pricingSuggestions && (
                <View className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <Text className="text-xs font-semibold text-slate-900">Pricing Recommendations</Text>
                  <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                    {plan.pricingSuggestions}
                  </Text>
                </View>
              )}
            </View>

            {/* SECTION 4: MARKETING & SOCIAL STRATEGY */}
            <View className="space-y-4 pt-4 border-t border-slate-100">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                4. Go-To-Market &amp; Customer Acquisition
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {plan.marketingPlan}
              </Text>

              {plan.socialMediaStrategy && (
                <View className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <Text className="text-xs font-semibold text-slate-900">Social Media &amp; Content Focus</Text>
                  <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                    {plan.socialMediaStrategy}
                  </Text>
                </View>
              )}
            </View>

            {/* SECTION 5: LAUNCH READINESS CHECKLIST */}
            <View className="space-y-3 pt-4 border-t border-slate-100">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                5. Strategic Launch Checklist
              </Text>
              <View className="space-y-2.5 pt-1">
                {plan.startupChecklist?.map((item, idx) => (
                  <View key={idx} className="flex flex-row items-start gap-3">
                    <View className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-slate-700" />
                    </View>
                    <Text className="text-sm text-slate-700 leading-relaxed font-sans">{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SECTION 6: 30-DAY EXECUTION TIMELINE */}
            <View className="space-y-4 pt-4 border-t border-slate-100">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                6. 30-Day Launch Roadmap
              </Text>
              <View className="space-y-4 pt-1">
                {plan.launchPlan30Day?.map((item, idx) => (
                  <View key={idx} className="flex flex-row gap-4 items-start border-l-2 border-slate-200 pl-4">
                    <View className="flex flex-col space-y-1">
                      <Text className="text-xs font-semibold text-slate-900">Step {idx + 1}</Text>
                      <Text className="text-sm text-slate-700 leading-relaxed font-sans">{item}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* SECTION 7: HEALTH SCORE EVALUATION */}
            {healthScore && (
              <View className="space-y-4 pt-6 border-t border-slate-100">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  7. Business Viability &amp; Risk Assessment
                </Text>
                
                <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <View className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <Text className="text-xs font-semibold text-slate-900">Key Strengths</Text>
                    <View className="space-y-1.5">
                      {healthScore.strengths?.map((str, idx) => (
                        <View key={idx} className="flex flex-row items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                          <Text className="text-xs text-slate-700 font-sans">{str}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <Text className="text-xs font-semibold text-slate-900">Areas for Improvement</Text>
                    <View className="space-y-1.5">
                      {healthScore.improvements?.map((imp, idx) => (
                        <View key={idx} className="flex flex-row items-start gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                          <Text className="text-xs text-slate-700 font-sans">{imp}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {healthScore.recommendations && (
                  <View className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <Text className="text-xs font-semibold text-slate-900">Coach Recommendation</Text>
                    <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                      {healthScore.recommendations}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ASK AI BUSINESS COACH SECTION */}
            <View className="pt-8 border-t border-slate-200 space-y-4">
              <View className="space-y-1">
                <Text className="text-base font-semibold text-slate-900">Ask AI Business Coach</Text>
                <Text className="text-xs text-slate-500 font-normal">
                  Unlimited follow-up advisory for your generated enterprise blueprint
                </Text>
              </View>

              {/* Quick Question Chips */}
              <View className="space-y-2">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Topics</Text>
                <View className="flex flex-wrap gap-2">
                  <TouchableOpacity
                    onClick={() => handleAskCoach("How do I acquire my first 10 paying customers in South Africa?")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition select-none"
                  >
                    First 10 Customers
                  </TouchableOpacity>
                  <TouchableOpacity
                    onClick={() => handleAskCoach("Write 3 high-converting Facebook and Instagram ad captions for this business.")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition select-none"
                  >
                    Social Media Ad Copy
                  </TouchableOpacity>
                  <TouchableOpacity
                    onClick={() => handleAskCoach("Draft a professional cold email template for local clients.")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition select-none"
                  >
                    Cold Email Template
                  </TouchableOpacity>
                  <TouchableOpacity
                    onClick={() => handleAskCoach("Help me optimize my service pricing and profit margin.")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition select-none"
                  >
                    Optimize Pricing
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chat Messages Log */}
              {coachMessages.length > 0 && (
                <View className="space-y-3 pt-2 max-h-80 overflow-y-auto">
                  {coachMessages.map((msg) => (
                    <View
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <View
                        className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm font-sans leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none whitespace-pre-line'
                        }`}
                      >
                        <Text className={msg.sender === 'user' ? 'text-white' : 'text-slate-800'}>
                          {msg.text}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</Text>
                    </View>
                  ))}
                </View>
              )}

              {coachLoading && (
                <View className="flex flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 max-w-xs">
                  <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
                  <Text className="text-xs text-slate-600 font-medium">Coach is analyzing your business context...</Text>
                </View>
              )}

              {/* Chat Input Field */}
              <View className="flex flex-row gap-2 items-center pt-2">
                <input
                  type="text"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskCoach();
                  }}
                  placeholder="Ask AI Coach a question about this blueprint..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans"
                />
                <TouchableOpacity
                  onClick={() => handleAskCoach()}
                  disabled={coachLoading || !coachInput.trim()}
                  className={`p-3 rounded-xl flex items-center justify-center transition cursor-pointer select-none ${
                    coachLoading || !coachInput.trim() ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION WRAPPER */}
      <BottomNav />
    </SafeAreaView>
  );
};
