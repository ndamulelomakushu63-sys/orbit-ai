import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, Sparkles, RefreshCw, ChevronRight, Briefcase, CheckCircle, Info, AlertCircle, Calendar } from '../components/Icons';
import { useAppState } from '../services/state';
import { BottomNav } from '../components/BottomNav';

interface SideHustleIdea {
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  startupCost: string;
  timeRequired: string;
  whyMatches: string;
  steps: string[];
  challenges: string;
  resources: string;
}

export const SideHustleScreen: React.FC = () => {
  const { setMobileScreen } = useAppState();

  // Form input states
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('10');
  const [budget, setBudget] = useState('R0 - R500');
  const [country, setCountry] = useState('South Africa');

  // App UI states
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<SideHustleIdea[]>([]);
  const [selectedHustle, setSelectedHustle] = useState<SideHustleIdea | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerate = async () => {
    if (!skills.trim()) {
      setErrorMessage('Please describe your skills.');
      return;
    }
    if (!interests.trim()) {
      setErrorMessage('Please describe your interests.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setIdeas([]);
    setSelectedHustle(null);

    try {
      const response = await fetch('/api/side-hustles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills,
          interests,
          hoursPerWeek: `${hoursPerWeek} hours per week`,
          budget,
          country,
          internetAccess: 'Yes',
          smartphoneAccess: 'Yes',
          laptopAccess: 'Yes'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas);
      } else {
        throw new Error(data.error || 'Failed to generate ideas.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during generation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView id="side_hustle_screen" className="bg-white flex flex-col h-full justify-between">
      {/* HEADER BAR */}
      <View className="px-6 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => {
              if (selectedHustle) {
                setSelectedHustle(null);
              } else {
                setMobileScreen('chat');
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-slate-900 tracking-tight">
            {selectedHustle ? 'Side Hustle Report' : 'AI Side Hustle Generator'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white p-6" contentContainerClassName="max-w-3xl mx-auto w-full space-y-8 pb-12">
        {selectedHustle ? (
          /* FULL DETAIL PLAN SCREEN - CHATGPT/CLAUDE CLEAN DOCUMENT LAYOUT */
          <View className="space-y-8 animate-fade-in text-left">
            {/* Header section */}
            <View className="space-y-3 pb-6 border-b border-slate-100">
              <Text className="text-3xl font-bold text-slate-900 font-sans tracking-tight leading-tight">
                {selectedHustle.name}
              </Text>
              
              {/* Subtle Metadata bar */}
              <View className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                <View className="flex flex-row items-center gap-2">
                  <span className="font-medium text-slate-400">Difficulty:</span>
                  <span className="font-semibold text-slate-900">{selectedHustle.difficulty}</span>
                </View>
                <View className="flex flex-row items-center gap-2">
                  <span className="font-medium text-slate-400">Startup Cost:</span>
                  <span className="font-semibold text-slate-900">{selectedHustle.startupCost}</span>
                </View>
                <View className="flex flex-row items-center gap-2">
                  <span className="font-medium text-slate-400">Time Commitment:</span>
                  <span className="font-semibold text-slate-900">{selectedHustle.timeRequired}</span>
                </View>
              </View>
            </View>

            {/* Document Section 1: Why It Fits You */}
            <View className="space-y-2">
              <Text className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Why This Fits Your Profile
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                {selectedHustle.whyMatches}
              </Text>
            </View>

            {/* Document Section 2: Step-by-Step Action Plan */}
            <View className="space-y-4 pt-4 border-t border-slate-100">
              <Text className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Step-by-Step Launch Plan
              </Text>
              <View className="space-y-4 pl-1">
                {selectedHustle.steps?.map((step, idx) => (
                  <View key={idx} className="flex flex-row items-start gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <Text className="text-sm text-slate-700 leading-relaxed font-sans flex-1">
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Document Section 3: Core Challenges & Mitigation */}
            <View className="space-y-2 pt-4 border-t border-slate-100">
              <Text className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Key Challenges to Anticipate
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                {selectedHustle.challenges}
              </Text>
            </View>

            {/* Document Section 4: Resources */}
            <View className="space-y-2 pt-4 border-t border-slate-100">
              <Text className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Recommended Resources & Tools
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                {selectedHustle.resources}
              </Text>
            </View>

            {/* Document Section 5: Best Practices / Pro Tips */}
            <View className="space-y-3 pt-4 border-t border-slate-100">
              <Text className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Execution Principles
              </Text>
              <View className="space-y-2 pl-2 border-l-2 border-slate-200">
                <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                  • <strong className="text-slate-900">Consistency over intensity</strong>: Dedicating {hoursPerWeek} hours every week reliably yields better results than sporadic bursts.
                </Text>
                <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                  • <strong className="text-slate-900">Track initial unit economics</strong>: Keep a clear record of every expense and reinvest your first earnings immediately into customer acquisition.
                </Text>
                <Text className="text-sm text-slate-700 leading-relaxed font-sans">
                  • <strong className="text-slate-900">Validate with local demand</strong>: Secure your first 3 paying clients using direct community outreach before investing in formal branding.
                </Text>
              </View>
            </View>

            {/* Document Actions */}
            <View className="pt-6 border-t border-slate-100 flex flex-row items-center justify-between gap-4">
              <TouchableOpacity
                onClick={() => setSelectedHustle(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-full font-medium text-slate-800 text-sm cursor-pointer transition select-none"
              >
                ← Back to Ideas
              </TouchableOpacity>
              <TouchableOpacity
                onClick={() => {
                  const docText = `${selectedHustle.name}\n\nDifficulty: ${selectedHustle.difficulty} | Cost: ${selectedHustle.startupCost} | Time: ${selectedHustle.timeRequired}\n\nWHY IT FITS:\n${selectedHustle.whyMatches}\n\nACTION PLAN:\n${selectedHustle.steps?.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nCHALLENGES:\n${selectedHustle.challenges}\n\nRESOURCES:\n${selectedHustle.resources}`;
                  navigator.clipboard?.writeText(docText);
                  alert('Plan copied to clipboard');
                }}
                className="px-6 py-3 border border-slate-200 hover:border-slate-300 rounded-full font-medium text-slate-700 text-sm cursor-pointer transition select-none"
              >
                Copy Report
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* MAIN SEARCH & RESULTS SCREEN - SLEEK & MINIMAL */
          <View className="space-y-8 text-left">
            {/* HERO TITLE BLOCK */}
            <View className="space-y-2">
              <Text className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                AI Side Hustle Generator
              </Text>
              <Text className="text-base text-slate-600 leading-relaxed font-sans">
                Tell us about your background, availability, and resources to receive a tailored, realistic venture blueprint.
              </Text>
            </View>

            {/* INPUT PANEL - APPLE / CHATGPT CLEAN FORM STYLE */}
            <View className="space-y-5">
              {errorMessage && (
                <View className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-row items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <Text className="text-sm text-red-700 font-medium leading-tight">{errorMessage}</Text>
                </View>
              )}

              {/* Skills Input */}
              <View className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">What are your skills or strengths?</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Writing, basic accounting, graphic design, tutoring, driving..."
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition font-sans"
                />
              </View>

              {/* Interests Input */}
              <View className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">What interests or topics do you enjoy?</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Fitness, gaming, fashion, food, technology, education..."
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition font-sans"
                />
              </View>

              <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hours Available Per Week */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Time available per week</label>
                  <select
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans cursor-pointer"
                  >
                    <option value="5">5 hours per week (Minimal)</option>
                    <option value="10">10 hours per week (Part-time)</option>
                    <option value="20">20 hours per week (Medium)</option>
                    <option value="40">40+ hours per week (Full-time)</option>
                  </select>
                </View>

                {/* Startup Budget */}
                <View className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Available startup budget</label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition font-sans cursor-pointer"
                  >
                    <option value="R0 - R500">R0 - R500 (No/Low cost)</option>
                    <option value="R500 - R2000">R500 - R2000 (Low investment)</option>
                    <option value="R2000 - R10000">R2000 - R10000 (Moderate)</option>
                    <option value="R10000+">R10000+ (High investment)</option>
                  </select>
                </View>
              </View>

              {/* Country */}
              <View className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Country or Region</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. South Africa, Kenya, Nigeria..."
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition font-sans"
                />
              </View>

              {/* Generate Button - SLEEK ORBIT BLUE BUTTON */}
              <View className="pt-2">
                <TouchableOpacity
                  onClick={handleGenerate}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl flex flex-row items-center justify-center gap-2.5 transition cursor-pointer select-none font-medium text-sm text-white ${
                    loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                      <Text className="text-white font-medium">Analyzing opportunities...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <Text className="text-white font-medium">Generate Side Hustle Ideas</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* RESULTS LIST OF HUSTLES - APPLE/LINEAR CLEAN CARDS */}
            {ideas.length > 0 && (
              <View className="space-y-4 pt-6 border-t border-slate-100">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Recommended Opportunities ({ideas.length})
                </Text>

                <View className="space-y-3">
                  {ideas.map((hustle, idx) => (
                    <View key={idx} className="bg-white p-6 border border-slate-200 hover:border-slate-300 rounded-2xl space-y-3 transition">
                      <View className="flex flex-row items-start justify-between gap-4">
                        <Text className="text-lg font-semibold text-slate-900 tracking-tight block">
                          {hustle.name}
                        </Text>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium text-slate-700 shrink-0">
                          {hustle.difficulty}
                        </span>
                      </View>

                      {/* Subtle Metadata row */}
                      <View className="flex flex-row items-center gap-6 text-xs text-slate-500">
                        <Text>
                          Est. Cost: <span className="font-semibold text-slate-800">{hustle.startupCost}</span>
                        </Text>
                        <Text>
                          Time: <span className="font-semibold text-slate-800">{hustle.timeRequired}</span>
                        </Text>
                      </View>

                      {/* Rationale description */}
                      <Text className="text-sm text-slate-600 leading-relaxed font-sans">
                        {hustle.whyMatches}
                      </Text>

                      {/* Action Link */}
                      <View className="pt-2 flex flex-row justify-end">
                        <TouchableOpacity
                          onClick={() => setSelectedHustle(hustle)}
                          className="flex flex-row items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer select-none"
                        >
                          <Text>View Full Blueprint</Text>
                          <ChevronRight className="w-4 h-4" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION WRAPPER */}
      <BottomNav />
    </SafeAreaView>
  );
};
