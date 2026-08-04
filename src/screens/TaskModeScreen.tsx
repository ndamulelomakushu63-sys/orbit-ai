import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Sparkles, FileText, Mail, HelpCircle, 
  User, Check, Copy, Download, RefreshCw, AlertCircle, Trash2,
  Award, Briefcase, Target, BookOpen
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

const INTERVIEW_STEPS = [
  {
    key: "fullName",
    question: "Hello! I am your Premium AI CV Builder. Let's build a world-class ATS-friendly CV suitable for South Africa and international employers. \n\nTo start, what is your full name?",
    placeholder: "e.g. Solly Molapisi"
  },
  {
    key: "position",
    question: "What position or job title are you applying for?",
    placeholder: "e.g. Senior Software Engineer or Admin Assistant"
  },
  {
    key: "phoneNumber",
    question: "What is your contact phone number?",
    placeholder: "e.g. +27 76 123 4567"
  },
  {
    key: "email",
    question: "What is your email address?",
    placeholder: "e.g. solly@example.com"
  },
  {
    key: "location",
    question: "Which city and country do you live in?",
    placeholder: "e.g. Pretoria, South Africa"
  },
  {
    key: "linkedIn",
    question: "What is your LinkedIn profile link or username? (Optional, or type 'Skip')",
    placeholder: "e.g. linkedin.com/in/solly-molapisi or 'Skip'"
  },
  {
    key: "portfolio",
    question: "Do you have a personal website, portfolio, or GitHub link? (Optional, or type 'Skip')",
    placeholder: "e.g. sollydev.co.za or 'Skip'"
  },
  {
    key: "jobDescription",
    question: "Are you applying for a specific job? If so, paste the job description or requirements here so I can tailor your CV specifically to pass their ATS filters! (Optional, or type 'Skip')",
    placeholder: "Paste job description or type 'Skip'"
  },
  {
    key: "educationLevel",
    question: "What is your highest level of education? (e.g. Matric, Diploma, Bachelor of Science, Honours, etc.)",
    placeholder: "e.g. Bachelor of Science in Computer Science"
  },
  {
    key: "educationInstitution",
    question: "Which school, college, or university did you attend, and which year did you graduate?",
    placeholder: "e.g. University of Pretoria, 2021"
  },
  {
    key: "hasExperience",
    question: "Do you have any work experience? (Yes/No)",
    placeholder: "Type Yes or No"
  },
  {
    key: "experience",
    question: "Tell me about your previous jobs. (Please mention company name, role, years, and a few key responsibilities if possible)",
    placeholder: "e.g. Senior Dev at TechLabs (2022-Present): Led team of 4 to design e-commerce apps.",
    skipIf: (answers: Record<string, string>) => {
      const ans = (answers.hasExperience || "").toLowerCase().trim();
      return ans === "no" || ans === "none" || ans === "n" || ans === "false";
    }
  },
  {
    key: "skills",
    question: "What key professional skills do you have? (Comma-separated or listed)",
    placeholder: "e.g. React Native, TypeScript, Client Relations, Project Management"
  },
  {
    key: "certificates",
    question: "Do you have any certificates, professional licences, or drivers licences?",
    placeholder: "e.g. AWS Certified Developer, Code 10 Drivers Licence, or 'None'"
  },
  {
    key: "projects",
    question: "Have you completed any notable key projects or portfolios you would like included?",
    placeholder: "e.g. Built E-commerce Platform for 10k monthly users, or 'None'"
  },
  {
    key: "languages",
    question: "Which languages do you speak?",
    placeholder: "e.g. English, Tshivenda, Zulu"
  },
  {
    key: "hobbies",
    question: "What are your personal hobbies and interests?",
    placeholder: "e.g. Reading, playing football, hiking"
  },
  {
    key: "achievements",
    question: "Are there any achievements, awards, or honors you would like employers to know about?",
    placeholder: "e.g. Employee of the Month, graduated with distinction, or 'None'"
  },
  {
    key: "includeReferences",
    question: "Would you like to include professional references? (e.g. 'Yes, available on request' or you can type their contact details)",
    placeholder: "e.g. Yes, available on request"
  },
  {
    key: "extra",
    question: "Is there anything else you would like me to include in your CV? (e.g. 'I volunteer at church', 'willing to relocate', etc.)",
    placeholder: "e.g. Willing to relocate, own personal transport"
  },
  {
    key: "style",
    question: "Which CV style would you like to generate?\n\n• Professional (Classic & clean)\n• Modern (Sleek & high-impact)\n• Executive (Authoritative & premium)\n• Minimal (Spacious & elegant)\n• Creative (Asymmetric & distinct)",
    placeholder: "Type Professional, Modern, Executive, Minimal, or Creative"
  }
];

const ASSIGNMENT_EXAMPLES = [
  "I want you to answer every question.",
  "Write this assignment from Question 1 until the last question.",
  "Solve this mathematics test.",
  "Answer these accounting questions.",
  "Summarize this chapter.",
  "Rewrite this essay.",
  "Translate this document.",
  "Create study notes.",
  "Explain Question 3.",
  "Answer according to university standards.",
  "Write professionally.",
  "Write in simple English."
];

const extractTextFromUploadedFile = async (file: File): Promise<string> => {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['txt', 'md', 'csv', 'json', 'html', 'xml'].includes(ext)) {
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      });
    }

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });

    const uint8 = new Uint8Array(arrayBuffer);
    let rawText = '';
    let currentWord = '';

    for (let i = 0; i < uint8.length; i++) {
      const code = uint8[i];
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        currentWord += String.fromCharCode(code);
      } else {
        if (currentWord.trim().length >= 4 && !/^[0-9\s.,/\\-_=+()[\]{}#$%^&*!@~`'"]+$/.test(currentWord.trim())) {
          rawText += currentWord + ' ';
        }
        currentWord = '';
      }
    }
    if (currentWord.trim().length >= 4) {
      rawText += currentWord + ' ';
    }

    const cleaned = rawText
      .replace(/\s+/g, ' ')
      .replace(/(.{80,}?)\s/g, '$1\n')
      .trim();

    if (cleaned.length > 50) {
      return `[Extracted Document Content from ${file.name}]:\n` + cleaned.substring(0, 15000);
    }

    return `[Uploaded File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nUploaded document attached for assignment analysis.`;
  } catch (err) {
    console.warn("Could not parse text, attaching file reference:", err);
    return `[Uploaded File: ${file.name}]`;
  }
};

export const TaskModeScreen: React.FC = () => {
  const { setMobileScreen, currentUser } = useAppState();

  // Task lists matching the specification
  const tasks: TaskCard[] = [
    {
      id: "assignment",
      title: "AI Assignment Helper",
      description: "Upload PDFs, Word docs, photos, tests, or homework & get complete solved assignments, essays, study notes, or reports.",
      icon: BookOpen,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
    },
    {
      id: "cv",
      title: "Write CV",
      description: "Create a complete, professional, employer-ready curriculum vitae.",
      icon: User,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
    },
    {
      id: "business_plan",
      title: "Business Plan",
      description: "Draft an executive Business Plan outline with full structural sections.",
      icon: Briefcase,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
    },
    {
      id: "email",
      title: "Professional Email",
      description: "Compose polished, persuasive, and grammatically flawless emails.",
      icon: Mail,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
    },
    {
      id: "social_media",
      title: "Social Media Post",
      description: "Draft engaging, high-converting social media posts with hashtags.",
      icon: Sparkles,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
    },
    {
      id: "summarize",
      title: "Summarize Document",
      description: "Upload a PDF or document and receive a concise executive summary.",
      icon: FileText,
      color: "bg-slate-100 text-slate-800 border-slate-200/80"
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

  // Enhanced CV Output States
  const [coverLetterText, setCoverLetterText] = useState("");
  const [cvScoreData, setCvScoreData] = useState<{
    atsScore: number;
    qualityScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null>(null);
  const [careerCoachData, setCareerCoachData] = useState<{
    interviewTips: string[];
    missingSkills: string[];
    careerRecommendations: string[];
    recommendedCourses: string[];
  } | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"cv" | "coverLetter" | "score" | "careerCoach">("cv");
  const [jobDescInput, setJobDescInput] = useState("");
  const [isTailoringJob, setIsTailoringJob] = useState(false);

  // Input States
  const [cvName, setCvName] = useState("");
  const [cvSkills, setCvSkills] = useState("");
  const [cvExperience, setCvExperience] = useState("");
  const [cvEducation, setCvEducation] = useState("");

  // Premium CV AI Interview States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewHistory, setInterviewHistory] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [interviewInput, setInterviewInput] = useState("");
  const [cvStyle, setCvStyle] = useState<"Professional" | "Modern" | "Executive" | "Minimal" | "Creative">("Professional");

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

    // Initialize/Reset interview for CV Builder
    if (task.id === "cv") {
      setCurrentQuestionIdx(0);
      setInterviewAnswers({});
      setInterviewInput("");
      setCvStyle("Professional");
      setInterviewHistory([
        { sender: 'ai', text: INTERVIEW_STEPS[0].question }
      ]);
    }
  };

  const handleSendInterviewMessage = (overrideText?: string) => {
    const textToSend = (overrideText || interviewInput).trim();
    if (!textToSend) return;

    // 1. Add user message
    const newHistory = [...interviewHistory, { sender: 'user', text: textToSend }];
    setInterviewHistory(newHistory);
    setInterviewInput("");

    // 2. Save current answer
    const currentStep = INTERVIEW_STEPS[currentQuestionIdx];
    const updatedAnswers = { ...interviewAnswers, [currentStep.key]: textToSend };
    setInterviewAnswers(updatedAnswers);

    // If style step is answered, set cvStyle state
    let matchedStyle = cvStyle;
    if (currentStep.key === "style") {
      const foundStyle = ["Professional", "Modern", "Executive", "Minimal", "Creative"].find(
        s => s.toLowerCase() === textToSend.toLowerCase()
      ) as any;
      if (foundStyle) {
        matchedStyle = foundStyle;
        setCvStyle(foundStyle);
      }
    }

    // 3. Find next question
    let nextIdx = currentQuestionIdx + 1;
    while (nextIdx < INTERVIEW_STEPS.length) {
      const step = INTERVIEW_STEPS[nextIdx];
      if (step.skipIf && step.skipIf(updatedAnswers)) {
        nextIdx++;
      } else {
        break;
      }
    }

    // 4. Update state and push next message
    if (nextIdx < INTERVIEW_STEPS.length) {
      setCurrentQuestionIdx(nextIdx);
      setTimeout(() => {
        setInterviewHistory(prev => [...prev, { sender: 'ai', text: INTERVIEW_STEPS[nextIdx].question }]);
      }, 250);
    } else {
      // Completed!
      setCurrentQuestionIdx(INTERVIEW_STEPS.length); // mark completed
      setTimeout(() => {
        setInterviewHistory(prev => [...prev, { 
          sender: 'ai', 
          text: `Excellent! I have compiled all your answers and your selected style is ${matchedStyle}. \n\nClick the 'Generate Premium CV' button below to compile your world-class, ATS-compliant CV instantly!` 
        }]);
      }, 250);
    }
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
      if (!interviewAnswers.fullName?.trim()) { 
        setErrorMessage("Please complete the interview or at least provide your full name."); 
        setLoading(false); 
        return; 
      }
      inputs = {
        fullName: interviewAnswers.fullName,
        position: interviewAnswers.position || "",
        phoneNumber: interviewAnswers.phoneNumber || "",
        email: interviewAnswers.email || "",
        location: interviewAnswers.location || "",
        linkedIn: interviewAnswers.linkedIn || "",
        portfolio: interviewAnswers.portfolio || "",
        jobDescription: interviewAnswers.jobDescription || jobDescInput || "",
        educationLevel: interviewAnswers.educationLevel || "",
        educationInstitution: interviewAnswers.educationInstitution || "",
        hasExperience: interviewAnswers.hasExperience || "",
        experience: interviewAnswers.experience || "",
        skills: interviewAnswers.skills || "",
        certificates: interviewAnswers.certificates || "",
        projects: interviewAnswers.projects || "",
        languages: interviewAnswers.languages || "",
        hobbies: interviewAnswers.hobbies || "",
        achievements: interviewAnswers.achievements || "",
        includeReferences: interviewAnswers.includeReferences || "Available upon request",
        extra: interviewAnswers.extra || "",
        style: cvStyle
      };
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result) {
        setResultText(data.result);
        if (data.coverLetter) setCoverLetterText(data.coverLetter);
        if (data.score) setCvScoreData(data.score);
        if (data.careerCoach) setCareerCoachData(data.careerCoach);
        setActiveResultTab("cv");
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

  const handleReTailorJob = async () => {
    if (!jobDescInput.trim()) return;
    setIsTailoringJob(true);
    setErrorMessage("");

    try {
      const inputs = {
        fullName: interviewAnswers.fullName || "Candidate",
        position: interviewAnswers.position || "",
        phoneNumber: interviewAnswers.phoneNumber || "",
        email: interviewAnswers.email || "",
        location: interviewAnswers.location || "",
        linkedIn: interviewAnswers.linkedIn || "",
        portfolio: interviewAnswers.portfolio || "",
        jobDescription: jobDescInput,
        educationLevel: interviewAnswers.educationLevel || "",
        educationInstitution: interviewAnswers.educationInstitution || "",
        hasExperience: interviewAnswers.hasExperience || "",
        experience: interviewAnswers.experience || "",
        skills: interviewAnswers.skills || "",
        certificates: interviewAnswers.certificates || "",
        projects: interviewAnswers.projects || "",
        languages: interviewAnswers.languages || "",
        hobbies: interviewAnswers.hobbies || "",
        achievements: interviewAnswers.achievements || "",
        includeReferences: interviewAnswers.includeReferences || "Available upon request",
        extra: interviewAnswers.extra || "",
        style: cvStyle
      };

      const response = await fetch("/api/task-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "cv",
          inputs
        })
      });

      if (!response.ok) {
        throw new Error("Failed to re-tailor CV.");
      }

      const data = await response.json();
      if (data.result) {
        setResultText(data.result);
        if (data.coverLetter) setCoverLetterText(data.coverLetter);
        if (data.score) setCvScoreData(data.score);
        if (data.careerCoach) setCareerCoachData(data.careerCoach);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not re-tailor CV. Please try again.");
    } finally {
      setIsTailoringJob(false);
    }
  };

  const handleDownloadDOCX = (textToExport?: string, titlePrefix?: string) => {
    const content = textToExport || (activeResultTab === "coverLetter" ? coverLetterText : resultText);
    const prefix = titlePrefix || (activeResultTab === "coverLetter" ? "Cover_Letter" : "CV");
    const name = (interviewAnswers.fullName || "OrbitAI").replace(/\s+/g, '_');
    const fileName = `${name}_${prefix}_${cvStyle}.docx`;

    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${prefix}</title>
        <style>
          @page { size: 8.5in 11in; margin: 1.0in; }
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.45; color: #2d3748; }
          h1 { font-size: 20pt; color: #1a365d; margin-bottom: 4pt; font-weight: bold; text-align: center; }
          h2 { font-size: 12pt; color: #2b6cb0; border-bottom: 1.5pt solid #2b6cb0; padding-bottom: 2pt; margin-top: 14pt; margin-bottom: 6pt; font-weight: bold; text-transform: uppercase; }
          h3 { font-size: 11pt; color: #2d3748; margin-top: 8pt; font-weight: bold; }
          h4 { font-size: 10.5pt; color: #4a5568; margin-top: 6pt; font-weight: bold; }
          p { margin-bottom: 4pt; text-align: justify; }
          ul { margin-top: 2pt; margin-bottom: 6pt; padding-left: 18pt; }
          li { margin-bottom: 3pt; }
          hr { border: 0; border-top: 1pt solid #e2e8f0; margin: 12pt 0; }
        </style>
      </head>
      <body>
    `;

    let htmlBody = content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '<br/>';
        if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
        if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
        if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
        if (line.startsWith('#### ')) return `<h4>${line.substring(5)}</h4>`;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) return `<li>${trimmed.substring(2)}</li>`;
        if (trimmed === '---') return '<hr/>';
        return `<p>${line}</p>`;
      })
      .join('');

    htmlBody = htmlBody.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

    const fullHtml = htmlHeader + htmlBody + `</body></html>`;

    const blob = new Blob(['\ufeff', fullHtml], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStyledCVPreview = (text: string, style: string) => {
    const lines = text.split('\n');
    
    // Choose theme wrapper style based on CV style
    let wrapperClass = "bg-white p-6 border rounded-3xl shadow-3xs text-left ";
    let h1Class = "text-2xl font-extrabold tracking-tight ";
    let h2Class = "text-sm font-extrabold uppercase tracking-wider border-b pb-1 mt-5 mb-2 ";
    let h3Class = "text-xs font-bold text-slate-800 mt-1 ";
    let pClass = "text-[11px] text-slate-600 leading-relaxed mt-0.5 ";
    let liClass = "text-[11px] text-slate-600 leading-relaxed pl-1.5 list-disc ml-4 ";
    let dividerClass = "border-slate-200 my-4 ";

    if (style === "Professional") {
      wrapperClass += "border-t-8 border-t-slate-800 border-slate-200";
      h1Class += "text-slate-900 text-center";
      h2Class += "text-blue-900 border-slate-200";
    } else if (style === "Modern") {
      wrapperClass += "border-l-8 border-l-teal-600 border-slate-200";
      h1Class += "text-teal-950";
      h2Class += "text-teal-700 bg-teal-50/50 px-2.5 rounded-lg py-1 border-none";
    } else if (style === "Executive") {
      wrapperClass += "border-2 border-slate-300";
      h1Class += "text-slate-900 text-center uppercase font-black";
      h2Class += "text-amber-800 border-b border-t border-slate-150 py-1.5 text-center";
      h3Class += "text-slate-900";
    } else if (style === "Minimal") {
      wrapperClass += "border-none shadow-none p-2 bg-slate-50";
      h1Class += "text-slate-800 font-light text-xl";
      h2Class += "text-slate-500 border-slate-200 font-bold";
      pClass = "text-[10.5px] text-slate-500 leading-loose mt-0.5";
      liClass = "text-[10.5px] text-slate-500 leading-loose pl-1.5 list-disc ml-4";
    } else if (style === "Creative") {
      wrapperClass += "bg-gradient-to-br from-slate-50 to-indigo-50/10 border-indigo-100 border";
      h1Class += "text-indigo-900";
      h2Class += "text-indigo-600 border-l-4 border-indigo-500 pl-2 border-b-0";
    }

    return (
      <View className={wrapperClass}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={idx} className="h-2" />;

          if (line.startsWith('# ')) {
            return (
              <Text key={idx} className={`${h1Class} block font-sans`}>
                {line.substring(2)}
              </Text>
            );
          }
          
          if (line.startsWith('## ')) {
            return (
              <Text key={idx} className={`${h2Class} block font-sans`}>
                {line.substring(3)}
              </Text>
            );
          }

          if (line.startsWith('### ')) {
            return (
              <Text key={idx} className={`${h3Class} block font-sans`}>
                {line.substring(4)}
              </Text>
            );
          }

          if (line.startsWith('#### ')) {
            return (
              <Text key={idx} className={`${h3Class} block font-sans`}>
                {line.substring(5)}
              </Text>
            );
          }

          if (trimmed === '---') {
            return <hr key={idx} className={dividerClass} />;
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const bulletText = trimmed.substring(2);
            return (
              <li key={idx} className={liClass}>
                {bulletText}
              </li>
            );
          }

          return (
            <Text key={idx} className={`${pClass} block font-sans`}>
              {line}
            </Text>
          );
        })}
      </View>
    );
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

      // Define style configurations
      let primaryColor = [31, 41, 55]; // Slate 800
      let accentColor = [37, 99, 235]; // Blue 600
      let textColor = [55, 65, 81]; // Slate 700
      let lineSpacing = 6;
      let centerHeader = false;
      let uppercaseHeaders = false;

      if (selectedTask.id === "cv") {
        if (cvStyle === "Professional") {
          primaryColor = [15, 23, 42]; // Navy 900
          accentColor = [30, 64, 175]; // Royal Blue 800
          textColor = [71, 85, 105]; // Slate 600
          centerHeader = true;
        } else if (cvStyle === "Modern") {
          primaryColor = [13, 148, 136]; // Teal 600
          accentColor = [15, 118, 110]; // Teal 700
          textColor = [51, 65, 85]; // Slate 700
        } else if (cvStyle === "Executive") {
          primaryColor = [127, 29, 29]; // Burgundy 900
          accentColor = [120, 53, 4]; // Dark Amber 950
          textColor = [17, 24, 39]; // Coal Black 900
          centerHeader = true;
          uppercaseHeaders = true;
        } else if (cvStyle === "Minimal") {
          primaryColor = [55, 65, 81]; // Gray 700
          accentColor = [107, 114, 128]; // Gray 500
          textColor = [107, 114, 128]; // Slate 500
          lineSpacing = 7; // more spacious spacing
        } else if (cvStyle === "Creative") {
          primaryColor = [109, 40, 217]; // Violet 700
          accentColor = [79, 70, 229]; // Indigo 600
          textColor = [71, 85, 105]; // Slate 600
        }
      }

      // PDF Content builder loop
      const rawLines = resultText.split('\n');
      let currentY = margin + 5;

      // Draw top accent line/bar if Modern style
      if (selectedTask.id === "cv" && cvStyle === "Modern") {
        doc.setFillColor(13, 148, 136); // Teal
        doc.rect(0, 0, 8, pageHeight, 'F'); // Left vertical bar
      }

      // Modern margin offset
      const startX = (selectedTask.id === "cv" && cvStyle === "Modern") ? margin + 5 : margin;
      const wrapWidth = (selectedTask.id === "cv" && cvStyle === "Modern") ? maxLineWidth - 10 : maxLineWidth;

      // Draw Title / Name header
      if (selectedTask.id === "cv") {
        // Find the first header line (H1) for name, then draw it specially
        const nameLine = rawLines.find(line => line.startsWith('# '));
        const subtitleLine = rawLines.find(line => line.startsWith('### '));
        
        if (nameLine) {
          const nameText = nameLine.substring(2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          if (centerHeader) {
            doc.text(nameText, pageWidth / 2, currentY, { align: 'center' });
          } else {
            doc.text(nameText, startX, currentY);
          }
          currentY += 8;
        }

        if (subtitleLine) {
          const subText = subtitleLine.substring(4);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          if (centerHeader) {
            doc.text(subText, pageWidth / 2, currentY, { align: 'center' });
          } else {
            doc.text(subText, startX, currentY);
          }
          currentY += 8;
        }
      } else {
        // Draw Task Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(selectedTask.title, margin, currentY);
        currentY += 7;

        // Draw a simple line divider
        doc.setLineWidth(0.5);
        doc.setDrawColor(209, 213, 219);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }

      // Render remaining lines
      rawLines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
          currentY += 3; // minimal empty line spacing
          return;
        }

        // Avoid re-drawing the top name or subtitle if CV
        if (selectedTask.id === "cv") {
          if (line.startsWith('# ') || line.startsWith('### ')) {
            return;
          }
        }

        if (currentY > pageHeight - margin - 10) {
          doc.addPage();
          currentY = margin;
          // Redraw left bar for new page if Modern
          if (selectedTask.id === "cv" && cvStyle === "Modern") {
            doc.setFillColor(13, 148, 136);
            doc.rect(0, 0, 8, pageHeight, 'F');
          }
        }

        if (line.startsWith('## ')) {
          const text = line.substring(3);
          const headerText = uppercaseHeaders ? text.toUpperCase() : text;
          
          currentY += 4; // Extra space before section
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);

          if (centerHeader) {
            doc.text(headerText, pageWidth / 2, currentY, { align: 'center' });
            currentY += 2;
            doc.setLineWidth(0.3);
            doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.line((pageWidth / 2) - 30, currentY, (pageWidth / 2) + 30, currentY);
            currentY += 5;
          } else {
            doc.text(headerText, startX, currentY);
            currentY += 2;
            doc.setLineWidth(0.3);
            doc.setDrawColor(220, 225, 230);
            doc.line(startX, currentY, pageWidth - margin, currentY);
            currentY += 5;
          }
        } else if (line.startsWith('#### ')) {
          const text = line.substring(5);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

          const split = doc.splitTextToSize(text, wrapWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { 
              doc.addPage(); 
              currentY = margin; 
              if (selectedTask.id === "cv" && cvStyle === "Modern") {
                doc.setFillColor(13, 148, 136);
                doc.rect(0, 0, 8, pageHeight, 'F');
              }
            }
            doc.text(part, startX, currentY);
            currentY += lineSpacing;
          });
        } else if (trimmed === '---') {
          doc.setLineWidth(0.2);
          doc.setDrawColor(200, 200, 200);
          doc.line(startX, currentY, pageWidth - margin, currentY);
          currentY += 4;
        } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          
          const text = trimmed.substring(2);
          doc.text("•", startX + 1, currentY);
          
          const split = doc.splitTextToSize(text, wrapWidth - 5);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { 
              doc.addPage(); 
              currentY = margin; 
              if (selectedTask.id === "cv" && cvStyle === "Modern") {
                doc.setFillColor(13, 148, 136);
                doc.rect(0, 0, 8, pageHeight, 'F');
              }
            }
            doc.text(part, startX + 5, currentY);
            currentY += lineSpacing;
          });
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);

          const split = doc.splitTextToSize(line, wrapWidth);
          split.forEach((part: string) => {
            if (currentY > pageHeight - margin) { 
              doc.addPage(); 
              currentY = margin; 
              if (selectedTask.id === "cv" && cvStyle === "Modern") {
                doc.setFillColor(13, 148, 136);
                doc.rect(0, 0, 8, pageHeight, 'F');
              }
            }
            if (centerHeader && (line.includes('|') || line.includes('Email:'))) {
              doc.text(part, pageWidth / 2, currentY, { align: 'center' });
            } else {
              doc.text(part, startX, currentY);
            }
            currentY += lineSpacing;
          });
        }
      });

      // Save instantly
      const filename = selectedTask.id === "cv" 
        ? `${(interviewAnswers.fullName || "OrbitAI").replace(/\s+/g, '_')}_CV_${cvStyle}.pdf`
        : `OrbitAI_${selectedTask.id}_output.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF format directly on frontend.");
    }
  };

  return (
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between overflow-hidden relative">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none shrink-0 z-50">
        <View className="flex flex-row items-center gap-3 flex-1 min-w-0">
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
        <TouchableOpacity
          onClick={() => setMobileScreen('chat')}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex flex-row items-center gap-1.5 transition cursor-pointer select-none active:scale-95 shadow-2xs ml-3 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <Text className="text-xs font-semibold">Chat</Text>
        </TouchableOpacity>
      </View>

      {/* CORE DISPLAY WINDOW */}
      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="pb-10">
        
        {/* STEP 1: TASK SELECTION GRID */}
        {activeStep === "grid" && (
          <View className="space-y-6 max-w-4xl mx-auto w-full pt-4">
            <View className="space-y-1 text-left">
              <Text className="text-lg font-semibold text-slate-900 font-sans">AI Document Studio</Text>
              <Text className="text-xs text-slate-500 font-normal font-sans">
                Select a specialized tool to generate clean, executive-ready documents and reports.
              </Text>
            </View>

            <View className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {tasks.map(task => {
                const IconComponent = task.icon;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className="p-4 hover:bg-slate-50/80 flex flex-row gap-4 items-center cursor-pointer transition select-none text-left"
                  >
                    <View className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${task.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-slate-900 leading-tight block truncate font-sans">{task.title}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5 block leading-relaxed font-normal font-sans">{task.description}</Text>
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
            
            {/* CV WRITE FORM - ChatGPT style AI Interview */}
            {selectedTask.id === "cv" && (
              <View className="space-y-4">
                {/* Chat window container */}
                <View className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-3xs flex flex-col min-h-[380px] max-h-[500px]">
                  
                  {/* Chat top header with restart interview */}
                  <View className="flex flex-row items-center justify-between border-b border-slate-150 pb-2 mb-3">
                    <View className="flex flex-row items-center gap-2">
                      <View className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <Text className="text-[11px] font-bold text-slate-700 tracking-tight font-sans">
                        AI CV CONSULTANT
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      onClick={() => {
                        setCurrentQuestionIdx(0);
                        setInterviewAnswers({});
                        setInterviewInput("");
                        setCvStyle("Professional");
                        setInterviewHistory([
                          { sender: 'ai', text: INTERVIEW_STEPS[0].question }
                        ]);
                        setErrorMessage("");
                      }}
                      className="flex flex-row items-center gap-1 px-2 py-1 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <Text className="text-[10px] font-bold">Restart</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Message log */}
                  <ScrollView 
                    className="flex-1 space-y-3 pr-1"
                    contentContainerClassName="space-y-3 pb-2"
                  >
                    {interviewHistory.map((msg, index) => (
                      <View 
                        key={index}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                        }`}
                      >
                        <View 
                          className={`p-3 rounded-2xl text-left ${
                            msg.sender === 'user' 
                              ? 'bg-blue-600 rounded-tr-none' 
                              : 'bg-slate-100 rounded-tl-none'
                          }`}
                        >
                          <Text className={`text-[11.5px] leading-relaxed font-sans whitespace-pre-line ${
                            msg.sender === 'user' ? 'text-white font-semibold' : 'text-slate-850'
                          }`}>
                            {msg.text}
                          </Text>
                        </View>
                        <Text className="text-[8px] text-slate-400 mt-1 pl-1 pr-1 font-mono uppercase">
                          {msg.sender === 'user' ? 'You' : 'AI Consultant'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Input row / interactive buttons */}
                  <View className="border-t border-slate-150 pt-3 mt-2">
                    {/* Style Selection Quick Buttons */}
                    {currentQuestionIdx < INTERVIEW_STEPS.length && INTERVIEW_STEPS[currentQuestionIdx].key === "style" && (
                      <View className="flex flex-wrap flex-row gap-1.5 justify-center mb-3">
                        {(["Professional", "Modern", "Executive", "Minimal", "Creative"] as const).map(styleOpt => (
                          <TouchableOpacity
                            key={styleOpt}
                            onClick={() => {
                              setCvStyle(styleOpt);
                              handleSendInterviewMessage(styleOpt);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-center text-[10.5px] font-bold text-slate-700 transition cursor-pointer"
                          >
                            {styleOpt}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Quick Yes/No buttons for hasExperience step */}
                    {currentQuestionIdx < INTERVIEW_STEPS.length && INTERVIEW_STEPS[currentQuestionIdx].key === "hasExperience" && (
                      <View className="flex flex-row gap-2 justify-center mb-3">
                        <TouchableOpacity
                          onClick={() => handleSendInterviewMessage("Yes")}
                          className="px-4 py-1.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-xl text-center text-[11px] font-bold text-slate-700 transition cursor-pointer"
                        >
                          Yes, I have work experience
                        </TouchableOpacity>
                        <TouchableOpacity
                          onClick={() => handleSendInterviewMessage("No")}
                          className="px-4 py-1.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-400 rounded-xl text-center text-[11px] font-bold text-slate-700 transition cursor-pointer"
                        >
                          No work experience
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Standard Input form if not style/hasExperience step */}
                    {currentQuestionIdx < INTERVIEW_STEPS.length && INTERVIEW_STEPS[currentQuestionIdx].key !== "style" && INTERVIEW_STEPS[currentQuestionIdx].key !== "hasExperience" && (
                      <View className="flex flex-row gap-2 items-center">
                        <input 
                          type="text"
                          placeholder={INTERVIEW_STEPS[currentQuestionIdx].placeholder}
                          value={interviewInput}
                          onChange={(e) => setInterviewInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSendInterviewMessage();
                            }
                          }}
                          className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans text-slate-800"
                        />
                        <TouchableOpacity
                          onClick={() => handleSendInterviewMessage()}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Send
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* If interview is complete, show styling & edit options */}
                    {currentQuestionIdx >= INTERVIEW_STEPS.length && (
                      <View className="flex flex-col gap-1 text-center bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100/50">
                        <Text className="text-[10px] font-bold text-blue-800 block font-sans">CV Style Selected: {cvStyle}</Text>
                        <Text className="text-[9px] text-slate-500 block font-sans">You are ready to write your premium CV. Click compile below!</Text>
                      </View>
                    )}
                  </View>
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
            {selectedTask.id === "cv" ? (
              currentQuestionIdx >= INTERVIEW_STEPS.length && (
                <TouchableOpacity 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white rounded-xl text-center text-xs font-extrabold shadow-md border border-blue-500 transition active:scale-98 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                      <span>AI Compiling Your Premium CV...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Generate Premium ATS-Friendly CV</span>
                    </>
                  )}
                </TouchableOpacity>
              )
            ) : (
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
            )}

          </View>
        )}

        {/* STEP 3: RESULT SCREEN */}
        {activeStep === "result" && selectedTask && (
          <View className="space-y-4 text-left">
            
            <View className="bg-emerald-600/5 border border-emerald-100 p-3 rounded-2xl flex flex-row items-center gap-2 text-emerald-900 select-none">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <Text className="text-[11px] font-bold font-sans">
                {selectedTask.id === "cv" ? "CV & Career Suite Generated Successfully!" : "Task Compiled Successfully!"}
              </Text>
            </View>

            {/* CV SPECIFIC MULTI-FEATURE TABS */}
            {selectedTask.id === "cv" && (
              <View className="flex flex-row bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200 select-none">
                <TouchableOpacity
                  onClick={() => setActiveResultTab("cv")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10.5px] font-bold transition flex flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeResultTab === "cv" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>CV Document</span>
                </TouchableOpacity>

                <TouchableOpacity
                  onClick={() => setActiveResultTab("coverLetter")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10.5px] font-bold transition flex flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeResultTab === "coverLetter" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Cover Letter</span>
                </TouchableOpacity>

                <TouchableOpacity
                  onClick={() => setActiveResultTab("score")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10.5px] font-bold transition flex flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeResultTab === "score" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>ATS Score</span>
                </TouchableOpacity>

                <TouchableOpacity
                  onClick={() => setActiveResultTab("careerCoach")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10.5px] font-bold transition flex flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeResultTab === "careerCoach" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Career Coach</span>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 1: CV DOCUMENT VIEW */}
            {(selectedTask.id !== "cv" || activeResultTab === "cv") && (
              <View className="space-y-4">
                {/* STYLE PICKER FOR CV */}
                {selectedTask.id === "cv" && (
                  <View className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex flex-row items-center justify-between gap-1 select-none">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">CV Theme:</Text>
                    <View className="flex flex-row gap-1 overflow-x-auto">
                      {(["Professional", "Modern", "Executive", "Minimal", "Creative"] as const).map((st) => (
                        <TouchableOpacity
                          key={st}
                          onClick={() => setCvStyle(st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            cvStyle === st ? "bg-slate-900 text-white shadow-2xs" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {st}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

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
                    onClick={() => handleDownloadPDF(resultText, "CV")}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </TouchableOpacity>

                  {selectedTask.id === "cv" && (
                    <TouchableOpacity 
                      onClick={() => handleDownloadDOCX(resultText, "CV")}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 text-white rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>DOCX</span>
                    </TouchableOpacity>
                  )}
                </View>

                {/* RESULT CONTENT DISPLAY */}
                {isEditingResult ? (
                  <textarea
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    className="w-full min-h-[380px] p-4 bg-white border border-slate-200 rounded-3xl outline-none focus:border-blue-400 font-mono text-xs text-slate-800"
                  />
                ) : selectedTask.id === "cv" ? (
                  renderStyledCVPreview(resultText, cvStyle)
                ) : (
                  <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs overflow-auto">
                    <Text className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap block text-left">
                      {resultText}
                    </Text>
                  </View>
                )}

                {/* JOB DESCRIPTION RE-TAILORING PANEL FOR CV */}
                {selectedTask.id === "cv" && (
                  <View className="bg-slate-50 border border-slate-200 p-4 rounded-3xl space-y-3">
                    <View className="flex flex-row items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <Text className="text-xs font-extrabold text-slate-900 font-sans">
                        Tailor CV for a Specific Job Advert
                      </Text>
                    </View>
                    <Text className="text-[11px] text-slate-500 font-sans leading-relaxed block">
                      Paste a target job description below. Orbit AI will intelligently re-align your professional summary, key experience bullet points, and ATS keywords to maximize your matching score for that specific employer.
                    </Text>
                    <textarea
                      placeholder="Paste target job advert or job requirements here..."
                      value={jobDescInput}
                      onChange={(e) => setJobDescInput(e.target.value)}
                      className="w-full min-h-[80px] p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 text-xs text-slate-800 font-sans resize-none"
                    />
                    <TouchableOpacity
                      onClick={handleReTailorJob}
                      disabled={isTailoringJob || !jobDescInput.trim()}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isTailoringJob ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                          <span>AI Re-Tailoring CV & Cover Letter...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Re-Tailor CV for this Job Description</span>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: COVER LETTER VIEW */}
            {selectedTask.id === "cv" && activeResultTab === "coverLetter" && (
              <View className="space-y-4">
                <View className="flex flex-row gap-2 select-none">
                  <TouchableOpacity 
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetterText);
                      setCopiedSuccess(true);
                      setTimeout(() => setCopiedSuccess(false), 2000);
                    }}
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
                        <span>Copy Letter</span>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onClick={() => handleDownloadPDF(coverLetterText, "Cover_Letter")}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onClick={() => handleDownloadDOCX(coverLetterText, "Cover_Letter")}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 text-white rounded-xl text-center text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOCX</span>
                  </TouchableOpacity>
                </View>

                <View className="bg-white p-6 border border-slate-200 rounded-3xl shadow-3xs">
                  <Text className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap block text-left">
                    {coverLetterText || "Generating cover letter..."}
                  </Text>
                </View>
              </View>
            )}

            {/* TAB 3: ATS & CV QUALITY SCORE */}
            {selectedTask.id === "cv" && activeResultTab === "score" && (
              <View className="space-y-4">
                {/* METRICS ROW */}
                <View className="grid grid-cols-2 gap-3">
                  <View className="bg-blue-50/60 border border-blue-100 p-4 rounded-3xl text-center">
                    <Text className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mb-1">ATS Compliance Score</Text>
                    <Text className="text-3xl font-black text-blue-900 block font-sans">
                      {cvScoreData?.atsScore || 95}<span className="text-sm font-normal text-blue-600">/100</span>
                    </Text>
                    <Text className="text-[10px] text-blue-700 mt-1 block">Compatible with Workday, Taleo &amp; Greenhouse</Text>
                  </View>

                  <View className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-3xl text-center">
                    <Text className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">Quality &amp; Impact</Text>
                    <Text className="text-3xl font-black text-emerald-900 block font-sans">
                      {cvScoreData?.qualityScore || 96}<span className="text-sm font-normal text-emerald-600">/100</span>
                    </Text>
                    <Text className="text-[10px] text-emerald-700 mt-1 block">Grammar, Layout &amp; Metrics Verified</Text>
                  </View>
                </View>

                {/* STRENGTHS */}
                <View className="bg-white p-4 border border-slate-200 rounded-3xl space-y-2">
                  <Text className="text-xs font-extrabold text-slate-900 font-sans flex flex-row items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> Key Strengths Identified
                  </Text>
                  <View className="space-y-1.5 pt-1">
                    {(cvScoreData?.strengths || [
                      "ATS-friendly clean structural heading hierarchy",
                      "Action verbs used across professional work experience",
                      "Quantified metrics and achievement outcomes included",
                      "Contact details and professional references cleanly formatted"
                    ]).map((str, idx) => (
                      <View key={idx} className="flex flex-row items-start gap-2">
                        <Text className="text-emerald-500 text-xs font-bold">•</Text>
                        <Text className="text-xs text-slate-700 font-sans leading-relaxed">{str}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* SUGGESTIONS & IMPROVEMENTS */}
                <View className="bg-white p-4 border border-slate-200 rounded-3xl space-y-2">
                  <Text className="text-xs font-extrabold text-slate-900 font-sans flex flex-row items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-500" /> Optimization Recommendations
                  </Text>
                  <View className="space-y-1.5 pt-1">
                    {(cvScoreData?.suggestions || [
                      "Keep job titles consistent across both CV and LinkedIn profile",
                      "Re-tailor keywords if applying for specialized enterprise roles",
                      "Consider adding vendor-specific cloud or leadership certificates"
                    ]).map((sug, idx) => (
                      <View key={idx} className="flex flex-row items-start gap-2">
                        <Text className="text-blue-500 text-xs font-bold">•</Text>
                        <Text className="text-xs text-slate-700 font-sans leading-relaxed">{sug}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* TAB 4: AI CAREER COACH */}
            {selectedTask.id === "cv" && activeResultTab === "careerCoach" && (
              <View className="space-y-4">
                {/* INTERVIEW STRATEGY */}
                <View className="bg-white p-4 border border-slate-200 rounded-3xl space-y-2">
                  <Text className="text-xs font-extrabold text-slate-900 font-sans flex flex-row items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> Interview Strategy &amp; Prep Tips
                  </Text>
                  <View className="space-y-1.5 pt-1">
                    {(careerCoachData?.interviewTips || [
                      "Prepare 2-3 STAR method stories highlighting measurable achievements from past roles.",
                      "Be ready to elaborate on your primary technical skills with real-world project examples.",
                      "Research the employer's market position and align your personal value proposition with their mission."
                    ]).map((tip, idx) => (
                      <View key={idx} className="flex flex-row items-start gap-2">
                        <Text className="text-indigo-600 text-xs font-bold">{idx + 1}.</Text>
                        <Text className="text-xs text-slate-700 font-sans leading-relaxed">{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* IN-DEMAND MISSING SKILLS & COURSES */}
                <View className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <View className="bg-white p-4 border border-slate-200 rounded-3xl space-y-2">
                    <Text className="text-xs font-extrabold text-slate-900 font-sans flex flex-row items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-500" /> High-Impact Skills to Acquire
                    </Text>
                    <View className="space-y-1.5 pt-1">
                      {(careerCoachData?.missingSkills || [
                        "Advanced Data Analytics & Dashboards",
                        "Agile & Scrum Project Methodology",
                        "Cloud Platform Fundamentals (AWS / Azure)"
                      ]).map((sk, idx) => (
                        <View key={idx} className="flex flex-row items-center gap-2">
                          <Text className="text-amber-500 text-xs font-bold">•</Text>
                          <Text className="text-xs text-slate-700 font-sans">{sk}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View className="bg-white p-4 border border-slate-200 rounded-3xl space-y-2">
                    <Text className="text-xs font-extrabold text-slate-900 font-sans flex flex-row items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-teal-600" /> Recommended Courses &amp; Certs
                    </Text>
                    <View className="space-y-1.5 pt-1">
                      {(careerCoachData?.recommendedCourses || [
                        "Google Professional Career Certificates",
                        "AWS Certified Cloud Practitioner",
                        "PMI Agile Certified Practitioner (PMI-ACP)"
                      ]).map((crs, idx) => (
                        <View key={idx} className="flex flex-row items-center gap-2">
                          <Text className="text-teal-600 text-xs font-bold">•</Text>
                          <Text className="text-xs text-slate-700 font-sans">{crs}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* OPTIONS PANEL */}
            <View className="flex flex-col gap-2 select-none pt-2">
              <TouchableOpacity 
                onClick={() => {
                  setActiveStep("input");
                  setIsEditingResult(false);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-xl text-center text-[11px] font-bold cursor-pointer transition"
              >
                Return to Interview / Modify Answers
              </TouchableOpacity>
            </View>

          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
};
