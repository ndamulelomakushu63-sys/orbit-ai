import React, { useState, useRef } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Sparkles, FileText, Mail, HelpCircle, 
  User, Check, Copy, Download, RefreshCw, AlertCircle, Trash2
} from '../components/Icons';
import { useAppState } from '../services/state';
import { BottomNav } from '../components/BottomNav';
import { jsPDF } from 'jspdf';

interface TaskCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

export const TaskModeScreen: React.FC = () => {
  const { setMobileScreen, currentUser } = useAppState();

  // Task lists matching the specification
  const tasks: TaskCard[] = [
    {
      id: "cv",
      title: "Write CV",
      description: "Create a complete, professional, employer-ready curriculum vitae.",
      icon: User,
      color: "bg-blue-50 text-blue-600 border-blue-100"
    },
    {
      id: "business_plan",
      title: "Business Plan",
      description: "Draft an executive Business Plan outline with full structural sections.",
      icon: Sparkles, // reusing Sparkles for professional feel
      color: "bg-amber-50 text-amber-600 border-amber-100"
    },
    {
      id: "email",
      title: "Professional Email",
      description: "Compose polished, persuasive, and grammatically flawless emails.",
      icon: Mail,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    },
    {
      id: "social_media",
      title: "Social Media Post",
      description: "Draft engaging, high-converting social media posts with hashtags.",
      icon: Sparkles,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100"
    },
    {
      id: "summarize",
      title: "Summarize Document",
      description: "Upload a PDF or document and receive a concise executive summary.",
      icon: FileText,
      color: "bg-rose-50 text-rose-600 border-rose-100"
    },
    {
      id: "assignment",
      title: "Assignment Helper",
      description: "Get structured academic assignment guidelines, definitions, and templates.",
      icon: HelpCircle,
      color: "bg-teal-50 text-teal-600 border-teal-100"
    }
  ];

  // Screen state machine
  const [activeStep, setActiveStep] = useState<"grid" | "input" | "result">("grid");
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Input States
  const [cvName, setCvName] = useState("");
  const [cvSkills, setCvSkills] = useState("");
  const [cvExperience, setCvExperience] = useState("");
  const [cvEducation, setCvEducation] = useState("");

  const [bizName, setBizName] = useState("");
  const [bizIndustry, setBizIndustry] = useState("Technology");
  const [bizAudience, setBizAudience] = useState("");
  const [bizOffer, setBizOffer] = useState("");

  const [emailPurpose, setEmailPurpose] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("Client");
  const [emailTone, setEmailTone] = useState("Formal");

  const [socialTopic, setSocialTopic] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("LinkedIn");
  const [socialMessage, setSocialMessage] = useState("");
  const [socialTone, setSocialTone] = useState("Professional");

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPastedText, setDocPastedText] = useState("");

  const [assignTopic, setAssignTopic] = useState("");
  const [assignGuidelines, setAssignGuidelines] = useState("");
  const [assignFile, setAssignFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTask = (task: TaskCard) => {
    setSelectedTask(task);
    setActiveStep("input");
    setErrorMessage("");
    setResultText("");
    setIsEditingResult(false);
  };

  const handleGoBack = () => {
    if (activeStep === "result") {
      setActiveStep("input");
    } else if (activeStep === "input") {
      setActiveStep("grid");
      setSelectedTask(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'doc' | 'assign') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'doc') {
        setDocFile(file);
      } else {
        setAssignFile(file);
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedTask) return;
    setErrorMessage("");
    setLoading(true);

    // Prepare custom payload based on task
    let inputs: any = {};
    if (selectedTask.id === "cv") {
      if (!cvName.trim()) { setErrorMessage("Full Name is required."); setLoading(false); return; }
      inputs = { fullName: cvName, skills: cvSkills, experience: cvExperience, education: cvEducation };
    } else if (selectedTask.id === "business_plan") {
      if (!bizName.trim()) { setErrorMessage("Business Name is required."); setLoading(false); return; }
      inputs = { businessName: bizName, industry: bizIndustry, targetAudience: bizAudience, productService: bizOffer };
    } else if (selectedTask.id === "email") {
      if (!emailPurpose.trim()) { setErrorMessage("Purpose of email is required."); setLoading(false); return; }
      inputs = { purpose: emailPurpose, recipient: emailRecipient, tone: emailTone };
    } else if (selectedTask.id === "social_media") {
      if (!socialTopic.trim()) { setErrorMessage("Topic/Product is required."); setLoading(false); return; }
      inputs = { topic: socialTopic, platform: socialPlatform, message: socialMessage, tone: socialTone };
    } else if (selectedTask.id === "summarize") {
      if (!docFile && !docPastedText.trim()) { 
        setErrorMessage("Please upload a PDF file or paste some text to summarize."); 
        setLoading(false); 
        return; 
      }
      inputs = { 
        fileName: docFile ? docFile.name : "Pasted_Text_Document", 
        fileSize: docFile ? `${(docFile.size / 1024 / 1024).toFixed(2)} MB` : "N/A", 
        pastedText: docPastedText 
      };
    } else if (selectedTask.id === "assignment") {
      if (!assignTopic.trim()) { setErrorMessage("Topic/Subject is required."); setLoading(false); return; }
      inputs = { 
        topic: assignTopic, 
        guidelines: assignGuidelines, 
        fileName: assignFile ? assignFile.name : null 
      };
    }

    try {
      const response = await fetch("/api/task-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: selectedTask.id,
          inputs: inputs
        })
      });

      const data = await response.json();
      if (response.ok && data.result) {
        setResultText(data.result);
        setActiveStep("result");
      } else {
        throw new Error(data.error || "Failed to generate result. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!selectedTask) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Margins
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxLineWidth = pageWidth - (margin * 2);

      // Title & Header setup
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55); // Slate 800
      
      const titleString = selectedTask.title;
      doc.text(titleString, margin, margin + 5);

      // Simple divider
      doc.setLineWidth(0.5);
      doc.setDrawColor(209, 213, 219); // Slate 300
      doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

      // Body text config
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81); // Slate 700

      const rawLines = resultText.split('\n');
      let currentY = margin + 20;
      const lineHeight = 6;

      rawLines.forEach(line => {
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }

        const trimmed = line.trim();
        if (!trimmed) {
          currentY += 4; // empty line spacing
          return;
        }

        if (line.startsWith('# ')) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(31, 41, 55);
          const text = line.substring(2);
          const split = doc.splitTextToSize(text, maxLineWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { doc.addPage(); currentY = margin; }
            doc.text(part, margin, currentY);
            currentY += lineHeight + 2;
          });
          currentY += 2;
        } else if (line.startsWith('## ')) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(31, 41, 55);
          const text = line.substring(3);
          const split = doc.splitTextToSize(text, maxLineWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { doc.addPage(); currentY = margin; }
            doc.text(part, margin, currentY);
            currentY += lineHeight + 1;
          });
          currentY += 1.5;
        } else if (line.startsWith('### ') || line.startsWith('#### ')) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11.5);
          doc.setTextColor(55, 65, 81);
          const text = line.replace(/^#{3,4}\s+/, '');
          const split = doc.splitTextToSize(text, maxLineWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { doc.addPage(); currentY = margin; }
            doc.text(part, margin, currentY);
            currentY += lineHeight;
          });
          currentY += 1;
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 81);
          const split = doc.splitTextToSize(line, maxLineWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { doc.addPage(); currentY = margin; }
            doc.text(part, margin, currentY);
            currentY += lineHeight;
          });
        }
      });

      // Save instantly
      doc.save(`OrbitAI_${selectedTask.id}_output.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF format directly on frontend.");
    }
  };

  return (
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between overflow-hidden relative">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center gap-3 select-none shrink-0 z-50">
        {activeStep !== "grid" && (
          <TouchableOpacity 
            onClick={handleGoBack}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
        )}
        <View className="text-left flex-1">
          <Text className="text-base font-bold text-slate-900 tracking-tight">
            {activeStep === "grid" ? "Task Mode" : selectedTask?.title}
          </Text>
          {activeStep === "grid" && (
            <Text className="text-[10.5px] text-slate-450 mt-0.5 block font-medium">Choose a task and get instant results</Text>
          )}
        </View>
      </View>

      {/* CORE DISPLAY WINDOW */}
      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="pb-10">
        
        {/* STEP 1: TASK SELECTION GRID */}
        {activeStep === "grid" && (
          <View className="space-y-4">
            <View className="bg-blue-600/5 border border-blue-100 p-4 rounded-3xl text-left">
              <Text className="text-xs font-bold text-blue-900 block font-sans">DO IT FOR ME</Text>
              <Text className="text-[11px] text-slate-600 mt-1 block leading-relaxed font-sans font-medium">
                Skip the back-and-forth chat. Provide simple criteria for your requested task, and our advanced AI generator will compile the completed file instantly.
              </Text>
            </View>

            <View className="grid grid-cols-1 gap-3">
              {tasks.map(task => {
                const IconComponent = task.icon;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className="bg-white p-4 border border-slate-200/50 hover:border-blue-400 rounded-3xl flex flex-row gap-4 items-center shadow-3xs cursor-pointer transition active:scale-99 text-left"
                  >
                    <View className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${task.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-bold text-slate-800 leading-tight block truncate font-sans">{task.title}</Text>
                      <Text className="text-[11px] text-slate-450 mt-1 block leading-tight font-medium font-sans">{task.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: FORM INPUT SCREEN */}
        {activeStep === "input" && selectedTask && (
          <View className="space-y-4 text-left">
            
            {errorMessage && (
              <View className="bg-red-50 border border-red-150 p-3 rounded-2xl flex flex-row items-center gap-2 text-red-900 select-none">
                <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
                <Text className="text-[11px] font-bold font-sans">{errorMessage}</Text>
              </View>
            )}

            {/* FORM SPECIFICS BY TASK */}
            
            {/* CV WRITE FORM */}
            {selectedTask.id === "cv" && (
              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Full Name</Text>
                  <TextInput 
                    placeholder="e.g. Solly Molapisi"
                    value={cvName}
                    onChange={(e: any) => setCvName(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Core Skills & Competencies</Text>
                  <textarea 
                    placeholder="e.g. React Native, TypeScript, Client Relations, Project Management"
                    value={cvSkills}
                    onChange={(e: any) => setCvSkills(e.target.value)}
                    className="w-full text-xs p-3 min-h-[70px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Professional Experience</Text>
                  <textarea 
                    placeholder="e.g. Senior Developer at TechLabs (2022-Present): Led a team of 4 to design e-commerce apps."
                    value={cvExperience}
                    onChange={(e: any) => setCvExperience(e.target.value)}
                    className="w-full text-xs p-3 min-h-[90px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Academic Education</Text>
                  <textarea 
                    placeholder="e.g. Bachelor of Science in Computer Science, University of Pretoria (2018-2021)"
                    value={cvEducation}
                    onChange={(e: any) => setCvEducation(e.target.value)}
                    className="w-full text-xs p-3 min-h-[70px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>
              </View>
            )}

            {/* BUSINESS PLAN FORM */}
            {selectedTask.id === "business_plan" && (
              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Business / Project Name</Text>
                  <TextInput 
                    placeholder="e.g. Pretoria AgriTech Solutions"
                    value={bizName}
                    onChange={(e: any) => setBizName(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Industry Sector</Text>
                  <select 
                    value={bizIndustry}
                    onChange={(e: any) => setBizIndustry(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  >
                    <option value="Agriculture">Agriculture</option>
                    <option value="Technology">Technology &amp; SaaS</option>
                    <option value="Retail & E-commerce">Retail &amp; E-commerce</option>
                    <option value="Services">Professional Services</option>
                    <option value="Food & Hospitality">Food &amp; Hospitality</option>
                    <option value="Education">Education &amp; Training</option>
                  </select>
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Target Audience</Text>
                  <TextInput 
                    placeholder="e.g. Local small-scale crop farmers in Gauteng"
                    value={bizAudience}
                    onChange={(e: any) => setBizAudience(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Main Product or Service</Text>
                  <textarea 
                    placeholder="e.g. Automated drip irrigation kits paired with a smart weather analytics mobile dashboard."
                    value={bizOffer}
                    onChange={(e: any) => setBizOffer(e.target.value)}
                    className="w-full text-xs p-3 min-h-[80px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>
              </View>
            )}

            {/* EMAIL WRITER FORM */}
            {selectedTask.id === "email" && (
              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Recipient Type</Text>
                  <TextInput 
                    placeholder="e.g. Prospective Client, Project Manager, Supplier"
                    value={emailRecipient}
                    onChange={(e: any) => setEmailRecipient(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Desired Tone</Text>
                  <select 
                    value={emailTone}
                    onChange={(e: any) => setEmailTone(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  >
                    <option value="Formal">Formal &amp; Professional</option>
                    <option value="Warm">Warm &amp; Collaborative</option>
                    <option value="Persuasive">Persuasive / Sales-oriented</option>
                    <option value="Apologetic">Apologetic &amp; Constructive</option>
                  </select>
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Purpose of the Email</Text>
                  <textarea 
                    placeholder="e.g. Request a follow-up meeting after sending our service proposal last week Tuesday."
                    value={emailPurpose}
                    onChange={(e: any) => setEmailPurpose(e.target.value)}
                    className="w-full text-xs p-3 min-h-[100px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>
              </View>
            )}

            {/* SOCIAL MEDIA POST FORM */}
            {selectedTask.id === "social_media" && (
              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Topic or Product</Text>
                  <TextInput 
                    placeholder="e.g. Launch of our new organic coffee blend"
                    value={socialTopic}
                    onChange={(e: any) => setSocialTopic(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Target Platform(s)</Text>
                  <select 
                    value={socialPlatform}
                    onChange={(e: any) => setSocialPlatform(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  >
                    <option value="LinkedIn">LinkedIn (Professional)</option>
                    <option value="Instagram">Instagram (Visual/Creative)</option>
                    <option value="X (Twitter)">X / Twitter (Concise/Punchy)</option>
                    <option value="Facebook">Facebook (General Audience)</option>
                  </select>
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Tone</Text>
                  <select 
                    value={socialTone}
                    onChange={(e: any) => setSocialTone(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  >
                    <option value="Professional">Professional &amp; Informative</option>
                    <option value="Exciting">Exciting &amp; Promotional</option>
                    <option value="Educational">Educational &amp; Thoughtful</option>
                    <option value="Conversational">Conversational &amp; Friendly</option>
                  </select>
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Core Message or Offer</Text>
                  <textarea 
                    placeholder="e.g. Hand-picked beans from organic farms in East Africa, roasted in Cape Town. Get 10% off using code MT10."
                    value={socialMessage}
                    onChange={(e: any) => setSocialMessage(e.target.value)}
                    className="w-full text-xs p-3 min-h-[90px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>
              </View>
            )}

            {/* SUMMARIZE DOCUMENT FORM */}
            {selectedTask.id === "summarize" && (
              <View className="space-y-4">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Upload PDF Document</Text>
                  
                  {/* Custom drag and drop / click box */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center cursor-pointer bg-white transition hover:bg-slate-50 flex flex-col items-center justify-center space-y-2 select-none"
                  >
                    <FileText className={`w-8 h-8 ${docFile ? 'text-blue-500' : 'text-slate-400'}`} />
                    <View>
                      <Text className="text-xs font-bold text-slate-800 block">
                        {docFile ? docFile.name : "Select or drag PDF file"}
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-1 block">
                        {docFile ? `${(docFile.size / 1024 / 1024).toFixed(2)} MB` : "Accepts PDF format (frontend simulated parsing)"}
                      </Text>
                    </View>
                    {docFile && (
                      <TouchableOpacity 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocFile(null);
                        }}
                        className="py-1 px-3 bg-red-50 hover:bg-red-100 rounded-lg text-red-650 text-[10px] font-bold border border-red-100 flex flex-row items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                        <span>Remove File</span>
                      </TouchableOpacity>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".pdf" 
                    onChange={(e) => handleFileUpload(e, 'doc')}
                    className="hidden" 
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Pasted Content or Topic Notes (Optional)</Text>
                  <textarea 
                    placeholder="e.g. Paste specific sections, copy-paste text, or describe what details you want summarized..."
                    value={docPastedText}
                    onChange={(e: any) => setDocPastedText(e.target.value)}
                    className="w-full text-xs p-3 min-h-[100px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>
              </View>
            )}

            {/* ASSIGNMENT HELPER FORM */}
            {selectedTask.id === "assignment" && (
              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Topic or Subject</Text>
                  <TextInput 
                    placeholder="e.g. Grade 11 Economics - Market failure and public goods"
                    value={assignTopic}
                    onChange={(e: any) => setAssignTopic(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Upload Reference Document (Optional)</Text>
                  <div 
                    onClick={() => assignFileInputRef.current?.click()}
                    className="border border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer bg-white transition hover:bg-slate-50 flex flex-row items-center justify-center gap-2 select-none"
                  >
                    <FileText className={`w-5 h-5 ${assignFile ? 'text-teal-500' : 'text-slate-400'}`} />
                    <Text className="text-xs font-bold text-slate-800 block truncate">
                      {assignFile ? assignFile.name : "Attach reference PDF"}
                    </Text>
                  </div>
                  <input 
                    type="file" 
                    ref={assignFileInputRef} 
                    accept=".pdf" 
                    onChange={(e) => handleFileUpload(e, 'assign')}
                    className="hidden" 
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Guidelines or Question</Text>
                  <textarea 
                    placeholder="e.g. Explain how market failure occurs in the South African electricity sector. Provide a detailed essay outline with references."
                    value={assignGuidelines}
                    onChange={(e: any) => setAssignGuidelines(e.target.value)}
                    className="w-full text-xs p-3 min-h-[110px] bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800 resize-none"
                  />
                </View>
              </View>
            )}

            {/* GENERATE BUTTON */}
            <TouchableOpacity 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-xs font-bold shadow-2xs border border-blue-500 transition active:scale-98 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <span>AI Writing Outcome...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Generate Result</span>
                </>
              )}
            </TouchableOpacity>

          </View>
        )}

        {/* STEP 3: RESULT SCREEN */}
        {activeStep === "result" && selectedTask && (
          <View className="space-y-4 text-left">
            
            <View className="bg-emerald-600/5 border border-emerald-100 p-3 rounded-2xl flex flex-row items-center gap-2 text-emerald-900 select-none">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <Text className="text-[11px] font-bold font-sans">Task Compiled Successfully!</Text>
            </View>

            {/* ACTION ROW */}
            <View className="flex flex-row gap-2 select-none">
              <TouchableOpacity 
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => setIsEditingResult(!isEditingResult)}
                className={`flex-1 py-2.5 border rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  isEditingResult 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                <span>{isEditingResult ? "Preview" : "Edit Outcome"}</span>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={handleDownloadPDF}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </TouchableOpacity>
            </View>

            {/* RESULT CONTENT CONTAINER */}
            {isEditingResult ? (
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                className="w-full min-h-[360px] p-4 bg-white border border-slate-200 rounded-3xl outline-none focus:border-blue-400 font-mono text-xs text-slate-800"
              />
            ) : (
              <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs overflow-auto">
                <Text className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap block text-left">
                  {resultText}
                </Text>
              </View>
            )}

            {/* OPTIONS PANEL */}
            <View className="flex flex-col gap-2 select-none pt-2">
              <TouchableOpacity 
                onClick={handleDownloadPDF}
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-center text-xs font-bold cursor-pointer transition flex flex-row items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Download Instant PDF Copy</span>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => {
                  setActiveStep("input");
                  setIsEditingResult(false);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-250 text-slate-500 rounded-xl text-center text-[11px] font-bold cursor-pointer transition"
              >
                Make Adjustments to Inputs
              </TouchableOpacity>
            </View>

          </View>
        )}

      </ScrollView>

      {/* CORE BOTTOM NAVIGATION */}
      <BottomNav />

    </SafeAreaView>
  );
};
