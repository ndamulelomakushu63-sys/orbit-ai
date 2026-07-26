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
    <SafeAreaView id="business_builder_screen" className="bg-slate-50 flex flex-col h-full justify-between">
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen('chat')}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">AI Business Builder</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-6 pb-8">
        {/* HERO TITLE BLOCK */}
        <View className="space-y-1 text-left px-1">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            AI Business Builder
          </Text>
          <Text className="text-sm text-slate-500 leading-relaxed font-sans font-medium">
            Describe your business idea and Orbit AI will generate a complete launch plan.
          </Text>
        </View>

        {/* INPUT FORM */}
        <View className="bg-white p-6 border border-slate-200/50 rounded-3xl space-y-4 shadow-sm">
          {errorMessage && (
            <View className="p-3 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <Text className="text-xs text-red-700 font-semibold leading-tight">{errorMessage}</Text>
            </View>
          )}

          {/* Business Idea */}
          <View className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Business Idea</label>
            <textarea
              value={businessIdea}
              onChange={(e) => setBusinessIdea(e.target.value)}
              placeholder="What product or service are you planning to offer? Detail your main concept..."
              className="w-full h-24 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans resize-none"
            />
          </View>

          {/* Industry Selection */}
          <View className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans cursor-pointer"
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
          <View className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Startup Budget</label>
            <select
              value={startingBudget}
              onChange={(e) => setStartingBudget(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans cursor-pointer"
            >
              <option value="Minimal (R0 - R500)">Minimal (R0 - R500)</option>
              <option value="R500 - R2000">R500 - R2000</option>
              <option value="R2000 - R10000">R2000 - R10000</option>
              <option value="R10000+">R10000+</option>
            </select>
          </View>

          {/* Target Customers */}
          <View className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Target Customers</label>
            <input
              type="text"
              value={targetCustomers}
              onChange={(e) => setTargetCustomers(e.target.value)}
              placeholder="e.g. Local students, coffee lovers, busy working parents..."
              className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans"
            />
          </View>

          {/* Experience Level */}
          <View className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Your Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans cursor-pointer"
            >
              <option value="Beginner">Beginner (No prior business experience)</option>
              <option value="Intermediate">Intermediate (Some project or management experience)</option>
              <option value="Expert">Expert (Have owned or launched a business before)</option>
            </select>
          </View>

          {/* Create Plan Button */}
          <TouchableOpacity
            onClick={handleBuildPlan}
            disabled={loading}
            className={`w-full py-4 rounded-full flex flex-row items-center justify-center gap-2 mt-4 transition cursor-pointer select-none ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                <Text className="text-white font-bold text-sm">Formulating Your Blueprint...</Text>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <Text className="text-white font-bold text-sm">Create Business Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* RESULTS SYSTEM */}
        {plan && (
          <View className="space-y-5">
            {/* ACTION BAR: COPY PLAN & DOWNLOAD PDF */}
            <View className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-2xs space-y-3">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Blueprint Actions</Text>
                {copySuccess && (
                  <View className="flex flex-row items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <Text className="text-[10px] font-bold">Copied to Clipboard!</Text>
                  </View>
                )}
              </View>

              <View className="grid grid-cols-2 gap-2.5">
                <TouchableOpacity
                  onClick={handleCopyPlan}
                  className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex flex-row items-center justify-center gap-2 cursor-pointer transition select-none"
                >
                  <Copy className="w-4 h-4 text-slate-700" />
                  <Text className="text-xs font-bold text-slate-800">Copy Business Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onClick={handleDownloadPDF}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl flex flex-row items-center justify-center gap-2 cursor-pointer transition select-none shadow-2xs"
                >
                  <Download className="w-4 h-4 text-white" />
                  <Text className="text-xs font-bold text-white">Download PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* BUSINESS HEALTH SCORE CARD */}
            <View className="bg-white border border-slate-200/50 rounded-3xl p-5 shadow-2xs space-y-4">
              <TouchableOpacity
                onClick={() => toggleCard('score')}
                className="flex flex-row justify-between items-center cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                    <Award className="w-5 h-5 text-blue-600" />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-slate-900 font-sans">Business Health Score</Text>
                    <Text className="text-xs text-slate-500 font-medium font-sans">Enterprise Viability &amp; Readiness Index</Text>
                  </View>
                </View>
                <View className="flex flex-row items-center gap-2">
                  <View className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full flex flex-row items-center gap-1">
                    <Text className="text-xs font-extrabold text-emerald-700">{healthScore.score}/100</Text>
                  </View>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.score ? 'rotate-90' : ''}`} />
                </View>
              </TouchableOpacity>

              {expandedCards.score && (
                <View className="pt-2 border-t border-slate-100 space-y-4">
                  {/* Category Breakdown Progress Bars */}
                  <View className="grid grid-cols-2 gap-3 pt-1">
                    <View className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                      <View className="flex flex-row justify-between text-[11px] font-bold text-slate-700">
                        <span>Branding</span>
                        <span>{healthScore.breakdown?.branding || 90}%</span>
                      </View>
                      <View className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <View className="bg-blue-600 h-full rounded-full" style={{ width: `${healthScore.breakdown?.branding || 90}%` }} />
                      </View>
                    </View>

                    <View className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                      <View className="flex flex-row justify-between text-[11px] font-bold text-slate-700">
                        <span>Business Model</span>
                        <span>{healthScore.breakdown?.businessModel || 94}%</span>
                      </View>
                      <View className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <View className="bg-indigo-600 h-full rounded-full" style={{ width: `${healthScore.breakdown?.businessModel || 94}%` }} />
                      </View>
                    </View>

                    <View className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                      <View className="flex flex-row justify-between text-[11px] font-bold text-slate-700">
                        <span>Marketing</span>
                        <span>{healthScore.breakdown?.marketing || 88}%</span>
                      </View>
                      <View className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <View className="bg-emerald-600 h-full rounded-full" style={{ width: `${healthScore.breakdown?.marketing || 88}%` }} />
                      </View>
                    </View>

                    <View className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                      <View className="flex flex-row justify-between text-[11px] font-bold text-slate-700">
                        <span>Launch Readiness</span>
                        <span>{healthScore.breakdown?.launchReadiness || 95}%</span>
                      </View>
                      <View className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <View className="bg-amber-600 h-full rounded-full" style={{ width: `${healthScore.breakdown?.launchReadiness || 95}%` }} />
                      </View>
                    </View>
                  </View>

                  {/* Strengths & Improvements */}
                  <View className="space-y-2.5">
                    <View className="space-y-1">
                      <Text className="text-xs font-bold text-slate-800 font-sans">Key Strengths:</Text>
                      {healthScore.strengths?.map((str, idx) => (
                        <View key={idx} className="flex flex-row items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <Text className="text-xs text-slate-600 font-sans">{str}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="space-y-1">
                      <Text className="text-xs font-bold text-slate-800 font-sans">Areas for Improvement:</Text>
                      {healthScore.improvements?.map((imp, idx) => (
                        <View key={idx} className="flex flex-row items-start gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <Text className="text-xs text-slate-600 font-sans">{imp}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Coach Recommendations */}
                  <View className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
                    <Text className="text-[11px] font-bold text-blue-900 font-sans">Coach Recommendation:</Text>
                    <Text className="text-xs text-blue-800 font-sans leading-relaxed">{healthScore.recommendations}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* COLLAPSIBLE BLUEPRINT PLAN CARDS */}
            <Text className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest pl-1 block">
              Generated Business Blueprint
            </Text>

            {/* 1. BUSINESS NAME SUGGESTIONS */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('names')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Business Name Suggestions</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.names ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.names && (
                <View className="px-5 pb-5 pt-1 space-y-3.5 border-t border-slate-50">
                  <View className="grid grid-cols-1 gap-2.5">
                    {plan.businessNames?.map((item, idx) => (
                      <View key={idx} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100/70">
                        <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                        <Text className="text-xs text-slate-500 italic mt-0.5">"{item.tagline}"</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* 2. BUSINESS SUMMARY */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('summary')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Business Summary</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.summary ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.summary && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.businessDescription}
                  </Text>
                </View>
              )}
            </View>

            {/* 3. TARGET AUDIENCE */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('audience')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Target Audience</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.audience ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.audience && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.targetAudience}
                  </Text>
                </View>
              )}
            </View>

            {/* 4. REVENUE MODEL */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('revenue')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Revenue Model &amp; Pricing</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.revenue ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.revenue && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50 space-y-3">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.revenueModel}
                  </Text>
                  {plan.pricingSuggestions && (
                    <View className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                      <Text className="text-xs font-bold text-emerald-900 mb-0.5 font-sans">Pricing Recommendations:</Text>
                      <Text className="text-xs text-emerald-800 leading-relaxed font-sans">{plan.pricingSuggestions}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 5. MARKETING STRATEGY */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('marketing')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Marketing &amp; Social Strategy</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.marketing ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.marketing && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50 space-y-3">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.marketingPlan}
                  </Text>
                  {plan.socialMediaStrategy && (
                    <View className="p-3 bg-orange-50/60 border border-orange-100 rounded-2xl">
                      <Text className="text-xs font-bold text-orange-900 mb-0.5 font-sans">Social Media Focus:</Text>
                      <Text className="text-xs text-orange-800 leading-relaxed font-sans">{plan.socialMediaStrategy}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 6. LAUNCH CHECKLIST */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('checklist')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-rose-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Launch Checklist</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.checklist ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.checklist && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <View className="mt-3 space-y-2">
                    {plan.startupChecklist?.map((item, idx) => (
                      <View key={idx} className="flex flex-row items-start gap-2.5 py-1">
                        <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-extrabold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <Text className="text-xs text-slate-600 leading-tight font-sans">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* 7. 30-DAY PLAN */}
            <View className="bg-white border border-slate-200/40 rounded-3xl overflow-hidden shadow-2xs">
              <TouchableOpacity
                onClick={() => toggleCard('timeline')}
                className="p-5 flex flex-row justify-between items-center hover:bg-slate-50/60 cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </View>
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">30-Day Plan</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.timeline ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.timeline && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <View className="mt-3 space-y-3.5">
                    {plan.launchPlan30Day?.map((item, idx) => (
                      <View key={idx} className="flex flex-row gap-3 items-start border-l-2 border-slate-100 pl-3">
                        <View className="flex flex-col">
                          <Text className="text-xs font-bold text-slate-800 font-sans">Step {idx + 1}</Text>
                          <Text className="text-xs text-slate-600 leading-normal font-sans mt-0.5">{item}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* ASK AI BUSINESS COACH SECTION */}
            <View className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-2xs space-y-4 p-5">
              <TouchableOpacity
                onClick={() => toggleCard('coach')}
                className="flex flex-row justify-between items-center cursor-pointer text-left w-full"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                    <Briefcase className="w-5 h-5 text-white" />
                  </View>
                  <View>
                    <Text className="text-base font-extrabold text-slate-900 font-sans">Ask AI Business Coach</Text>
                    <Text className="text-xs text-slate-500 font-medium font-sans">Unlimited follow-up advice for your generated business</Text>
                  </View>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.coach ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.coach && (
                <View className="pt-3 border-t border-slate-100 space-y-4">
                  {/* Quick Question Chips */}
                  <View className="space-y-1.5">
                    <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested Coach Topics:</Text>
                    <View className="flex flex-wrap gap-2">
                      <TouchableOpacity
                        onClick={() => handleAskCoach("How do I acquire my first 10 paying customers in South Africa?")}
                        className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-700 cursor-pointer transition select-none"
                      >
                        First 10 Customers
                      </TouchableOpacity>
                      <TouchableOpacity
                        onClick={() => handleAskCoach("Write 3 high-converting Facebook and Instagram ad captions for this business.")}
                        className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-700 cursor-pointer transition select-none"
                      >
                        Social Media Ad Copy
                      </TouchableOpacity>
                      <TouchableOpacity
                        onClick={() => handleAskCoach("Draft a professional cold email template for local clients.")}
                        className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-700 cursor-pointer transition select-none"
                      >
                        Cold Email Template
                      </TouchableOpacity>
                      <TouchableOpacity
                        onClick={() => handleAskCoach("Help me optimize my service pricing and profit margin.")}
                        className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-700 cursor-pointer transition select-none"
                      >
                        Optimize Pricing
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Chat Messages Log */}
                  <View className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {coachMessages.map((msg) => (
                      <View
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <View
                          className={`p-3.5 rounded-2xl max-w-[90%] text-xs font-sans leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-100/80 text-slate-800 border border-slate-200/50 rounded-tl-none whitespace-pre-line'
                          }`}
                        >
                          <Text className={msg.sender === 'user' ? 'text-white' : 'text-slate-800'}>
                            {msg.text}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</Text>
                      </View>
                    ))}

                    {coachLoading && (
                      <View className="flex flex-row items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <Text className="text-xs text-slate-500 font-medium">Coach is analyzing your business context...</Text>
                      </View>
                    )}
                  </View>

                  {/* Chat Input Field */}
                  <View className="flex flex-row gap-2 items-center pt-1">
                    <input
                      type="text"
                      value={coachInput}
                      onChange={(e) => setCoachInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskCoach();
                      }}
                      placeholder="Ask AI Coach (e.g. 'How do I scale sales?', 'Write my launch email')..."
                      className="flex-1 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                    <TouchableOpacity
                      onClick={() => handleAskCoach()}
                      disabled={coachLoading || !coachInput.trim()}
                      className={`p-3 rounded-2xl text-white flex items-center justify-center transition cursor-pointer select-none ${
                        coachLoading || !coachInput.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION WRAPPER */}
      <BottomNav />
    </SafeAreaView>
  );
};
