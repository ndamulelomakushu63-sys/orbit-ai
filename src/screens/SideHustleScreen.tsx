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

      const data = await response.json();
      if (response.ok && data.ideas && Array.isArray(data.ideas)) {
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
    <SafeAreaView id="side_hustle_screen" className="bg-slate-50 flex flex-col h-full justify-between">
      {/* HEADER BAR */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => {
              if (selectedHustle) {
                setSelectedHustle(null);
              } else {
                setMobileScreen('chat');
              }
            }}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">
            {selectedHustle ? 'Side Hustle Detail' : 'AI Side Hustle Generator'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-6 pb-8">
        {selectedHustle ? (
          /* FULL DETAIL PLAN SCREEN OVERLAY */
          <View className="space-y-5 animate-fade-in text-left">
            <View className="space-y-1 pl-1">
              <Text className="text-2xl font-black text-slate-950 font-sans tracking-tight leading-snug">
                {selectedHustle.name}
              </Text>
              <Text className="text-xs text-slate-400 font-bold tracking-wider uppercase font-sans">
                Full Blueprint Plan
              </Text>
            </View>

            {/* HIGH LEVEL METRICS */}
            <View className="grid grid-cols-3 gap-3 bg-white border border-slate-200/50 rounded-2xl p-4 shadow-3xs">
              <View className="items-center text-center">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Difficulty</Text>
                <Text className={`text-xs font-black mt-1 ${
                  selectedHustle.difficulty === 'Easy' ? 'text-green-600' :
                  selectedHustle.difficulty === 'Medium' ? 'text-amber-600' : 'text-rose-600'
                }`}>{selectedHustle.difficulty}</Text>
              </View>

              <View className="items-center text-center border-x border-slate-100">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Startup Cost</Text>
                <Text className="text-xs font-black text-slate-800 mt-1">{selectedHustle.startupCost}</Text>
              </View>

              <View className="items-center text-center">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Time Required</Text>
                <Text className="text-xs font-black text-slate-800 mt-1">{selectedHustle.timeRequired}</Text>
              </View>
            </View>

            {/* WHY IT FITS CARD */}
            <View className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-2 shadow-2xs">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest block pl-0.5">Why It Fits You</Text>
              <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                {selectedHustle.whyMatches}
              </Text>
            </View>

            {/* ACTION PLAN CARD */}
            <View className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-3 shadow-2xs">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest block pl-0.5">Step-by-Step Action Plan</Text>
              <View className="space-y-3 mt-1 pl-1">
                {selectedHustle.steps?.map((step, idx) => (
                  <View key={idx} className="flex flex-row items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-extrabold shrink-0 mt-0.5 font-sans">
                      {idx + 1}
                    </span>
                    <Text className="text-xs text-slate-600 leading-relaxed font-sans">{step}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* CHALLENGES CARD */}
            <View className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-2 shadow-2xs">
              <Text className="text-xs font-bold text-rose-550 uppercase tracking-widest block pl-0.5">Core Challenges</Text>
              <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                {selectedHustle.challenges}
              </Text>
            </View>

            {/* RESOURCES CARD */}
            <View className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-2 shadow-2xs">
              <Text className="text-xs font-bold text-emerald-600 uppercase tracking-widest block pl-0.5">Helpful Resources</Text>
              <Text className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                {selectedHustle.resources}
              </Text>
            </View>

            {/* LAUNCH TIPS CARD */}
            <View className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-2 shadow-2xs">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest block pl-0.5">Pro Tips</Text>
              <View className="space-y-1.5 mt-2 pl-1">
                <Text className="text-xs text-slate-600 leading-relaxed font-sans">
                  • <strong>Consistency is Key</strong>: Committing even {hoursPerWeek} hours every single week regularly beats intense, irregular bursts.
                </Text>
                <Text className="text-xs text-slate-600 leading-relaxed font-sans">
                  • <strong>Track Initial Cashflow</strong>: Keep a meticulous ledger of all expenses and startup capital spent. Reinvest initial returns early.
                </Text>
                <Text className="text-xs text-slate-600 leading-relaxed font-sans">
                  • <strong>Leverage Free Assets</strong>: Maximize the use of free marketing channels like social media reels or WhatsApp status updates to source your initial 3 local clients.
                </Text>
              </View>
            </View>

            {/* BACK TO IDEAS BUTTON */}
            <TouchableOpacity
              onClick={() => setSelectedHustle(null)}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700 text-xs cursor-pointer select-none"
            >
              Back to Side Hustle List
            </TouchableOpacity>
          </View>
        ) : (
          /* MAIN SEARCH & RESULTS SCREEN */
          <View className="space-y-6 text-left">
            {/* HERO TITLE BLOCK */}
            <View className="space-y-1 pl-1">
              <Text className="text-2xl font-extrabold text-slate-950 tracking-tight font-sans">
                AI Side Hustle Generator
              </Text>
              <Text className="text-sm text-slate-500 leading-relaxed font-sans font-medium">
                Discover side hustle ideas based on your situation.
              </Text>
            </View>

            {/* INPUT PANEL */}
            <View className="bg-white p-6 border border-slate-200/50 rounded-3xl space-y-4 shadow-sm">
              {errorMessage && (
                <View className="p-3 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <Text className="text-xs text-red-700 font-semibold leading-tight">{errorMessage}</Text>
                </View>
              )}

              {/* Skills Input */}
              <View className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Your Skills</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Writing, basic design, math tutor, driving..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans"
                />
              </View>

              {/* Interests Input */}
              <View className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Your Interests</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Fitness, video gaming, fashion, pets, food..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans"
                />
              </View>

              {/* Hours Available Per Week */}
              <View className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Hours Per Week</label>
                <select
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans cursor-pointer"
                >
                  <option value="5">5 hours per week (Minimal commitment)</option>
                  <option value="10">10 hours per week (Part-time dedication)</option>
                  <option value="20">20 hours per week (Medium commitment)</option>
                  <option value="40">40+ hours per week (Full-time / High availability)</option>
                </select>
              </View>

              {/* Startup Budget */}
              <View className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Startup Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans cursor-pointer"
                >
                  <option value="R0 - R500">R0 - R500 (No / very low cost)</option>
                  <option value="R500 - R2000">R500 - R2000 (Low investment)</option>
                  <option value="R2000 - R10000">R2000 - R10000 (Moderate investment)</option>
                  <option value="R10000+">R10000+ (High / serious investment)</option>
                </select>
              </View>

              {/* Country */}
              <View className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. South Africa, Nigeria..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans"
                />
              </View>

              {/* Generate Button */}
              <TouchableOpacity
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 rounded-full flex flex-row items-center justify-center gap-2 mt-4 transition cursor-pointer select-none ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    <Text className="text-white font-bold text-sm">Evaluating Options...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <Text className="text-white font-bold text-sm">Generate Ideas</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* RESULTS LIST OF HUSTLES */}
            {ideas.length > 0 && (
              <View className="space-y-4">
                <Text className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest pl-1 block">
                  Recommended Side Hustles
                </Text>

                <View className="space-y-4">
                  {ideas.map((hustle, idx) => (
                    <View key={idx} className="bg-white p-5 border border-slate-200/50 rounded-3xl space-y-3 shadow-2xs">
                      {/* Name */}
                      <Text className="text-sm font-extrabold text-slate-900 leading-tight block">
                        {hustle.name}
                      </Text>

                      {/* Small Info Grid */}
                      <View className="flex flex-row flex-wrap gap-x-4 gap-y-1 pt-1">
                        <View className="flex flex-row items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            hustle.difficulty === 'Easy' ? 'bg-green-500' :
                            hustle.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <Text className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wide">
                            {hustle.difficulty}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wide">
                          Cost: <span className="text-slate-700 font-extrabold">{hustle.startupCost}</span>
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wide">
                          Time: <span className="text-slate-700 font-extrabold">{hustle.timeRequired}</span>
                        </Text>
                      </View>

                      {/* Rationale description */}
                      <Text className="text-[11.5px] text-slate-500 leading-relaxed font-sans mt-1 pl-0.5">
                        {hustle.whyMatches}
                      </Text>

                      {/* Action Button */}
                      <TouchableOpacity
                        onClick={() => setSelectedHustle(hustle)}
                        className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 text-xs mt-2 cursor-pointer transition select-none"
                      >
                        View Full Plan
                      </TouchableOpacity>
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
