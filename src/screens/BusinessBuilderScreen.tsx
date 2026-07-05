import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, Sparkles, RefreshCw, ChevronRight, CheckCircle, FileText, Check, AlertCircle } from '../components/Icons';
import { useAppState } from '../services/state';
import { BottomNav } from '../components/BottomNav';

interface BusinessNameIdea {
  name: string;
  tagline: string;
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

  // Collapsible cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    names: true,
    summary: true,
    audience: false,
    revenue: false,
    marketing: false,
    checklist: false,
    timeline: false,
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
        // Expand top ones by default
        setExpandedCards({
          names: true,
          summary: true,
          audience: true,
          revenue: true,
          marketing: true,
          checklist: true,
          timeline: true,
        });
      } else {
        throw new Error(data.error || 'Failed to construct plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A communication problem occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {/* RESULTS SYSTEM COLLAPSIBLE CARDS */}
        {plan && (
          <View className="space-y-4">
            <Text className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest pl-1 block">
              Generated Blueprint Plan
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
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Revenue Model</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.revenue ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.revenue && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.revenueModel}
                  </Text>
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
                  <Text className="text-sm font-extrabold text-slate-850 font-sans">Marketing Strategy</Text>
                </View>
                <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${expandedCards.marketing ? 'rotate-90' : ''}`} />
              </TouchableOpacity>

              {expandedCards.marketing && (
                <View className="px-5 pb-5 pt-1 border-t border-slate-50">
                  <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-2 whitespace-pre-line">
                    {plan.marketingPlan}
                  </Text>
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
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION WRAPPER */}
      <BottomNav />
    </SafeAreaView>
  );
};
