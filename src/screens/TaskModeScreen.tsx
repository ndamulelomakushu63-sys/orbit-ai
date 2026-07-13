import React, { useState, useRef, useEffect } from 'react';
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
    question: "Which city and province do you live in?",
    placeholder: "e.g. Pretoria, Gauteng"
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
    key: "languages",
    question: "Which languages do you speak?",
    placeholder: "e.g. English, Tshivenda, Zulu"
  },
  {
    key: "certificates",
    question: "Do you have any certificates, professional licences, or drivers licences?",
    placeholder: "e.g. AWS Certified Developer, Code 10 Drivers Licence, or 'None'"
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
    question: "Is there anything else you would like me to include in your CV? (Feel free to type details such as 'I enjoy charity work', 'I volunteer at church', 'I own a small business', 'I am willing to relocate', etc. I will intelligently decide where these belong!)",
    placeholder: "e.g. I volunteer at church and am willing to relocate"
  },
  {
    key: "style",
    question: "Which CV style would you like to generate?\n\n• Professional (Classic & clean)\n• Modern (Sleek & high-impact)\n• Executive (Authoritative & premium)\n• Minimal (Spacious & elegant)\n• Creative (Asymmetric & distinct)",
    placeholder: "Type Professional, Modern, Executive, Minimal, or Creative"
  }
];

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

  useEffect(() => {
    const isBypassActive = localStorage.getItem("orbit_marketing_bypass") === "true";
    if (isBypassActive) {
      // Prepopulate state with beautiful marketing demo content!
      setInterviewAnswers({
        fullName: "Sarah Jenkins",
        position: "Senior Product Designer",
        phoneNumber: "+1 (555) 019-2834",
        email: "sarah.jenkins@designorbit.io",
        location: "San Francisco, CA",
        educationLevel: "Master's Degree",
        educationInstitution: "Stanford University",
        hasExperience: "Yes",
        experience: "Lead UX Designer at Stripe (3 years), Senior Designer at Figma (4 years). Led design systems, scaled user research, and optimized checkout flow conversions by 22%.",
        skills: "Figma, React, Design Systems, User Research, Mobile App Design, Interaction Design, Team Leadership",
        languages: "English (Native), Spanish (Conversational)",
        certificates: "NN/g UX Master Certified (#82019), Certified Scrum Product Owner",
        hobbies: "Oil painting, hiking, mentoring junior designers on ADPList",
        achievements: "Keynote speaker at Config 2024, Winner of the Red Dot Design Award 2023",
        includeReferences: "Yes",
        extra: "Willing to travel occasionally, strong advocate for accessibility (WCAG 2.1 AA)"
      });
      setCvStyle("Modern");
      setCurrentQuestionIdx(16); // marked completed
      setInterviewHistory([
        { sender: 'ai', text: "Hello! I am your Premium AI CV Builder. Let's build a world-class ATS-friendly CV suitable for South Africa and international employers. \n\nTo start, what is your full name?" },
        { sender: 'user', text: "Sarah Jenkins" },
        { sender: 'ai', text: "What position or job title are you applying for?" },
        { sender: 'user', text: "Senior Product Designer" },
        { sender: 'ai', text: "Excellent! I have compiled all your answers and your selected style is Modern. \n\nClick the 'Generate Premium CV' button below to compile your world-class, ATS-compliant CV instantly!" }
      ]);

      // Business Plan
      setBizName("Lumina Coffee Roasters");
      setBizIndustry("Food & Beverage / E-Commerce");
      setBizAudience("Artisanal coffee lovers, specialty cafes, and sustainability-conscious urban professionals.");
      setBizOffer("A subscription-based, ethically sourced coffee roasting company delivering fresh single-origin beans with smart flavor-pairing recommendations directly to consumers.");

      // Email
      setEmailPurpose("Negotiate a partnership renewal with enterprise client including a proposed 15% increase in mutual scope and streamlined communication channels.");
      setEmailRecipient("Executive Board / Director of Operations");
      setEmailTone("Formal");

      // Social Media
      setSocialTopic("Launch of Orbit AI v2.0 - featuring the revolutionary Task Mode and autonomous Agent Program.");
      setSocialPlatform("LinkedIn");
      setSocialMessage("We're thrilled to introduce Orbit AI v2.0! This release changes the game with autonomous Agent Modes, instant Curricula Vitae generations, and executive business plan drafting.");
      setSocialTone("Professional");

      // Summarize
      setDocPastedText("Orbit AI represents a monumental paradigm shift in decentralized, user-directed artificial intelligence. By implementing a full-stack, state-authoritative client framework paired with modular agent prompts, users can automate daily administrative tasks, compile ATS-friendly resume files, negotiate strategic partnerships, and run advanced business simulators. Version 2.0 optimizes the UI through spacious negative space, Inter and Space Grotesk type pairings, and real-time local file uploads with zero server leakage. The custom PDF export engine utilizes modern vector math to ensure print-ready alignment across standard dimensions.");

      // Assignment Helper
      setAssignTopic("The Economic and Technological Impacts of Generative AI on Global Knowledge Work (2024-2026)");
      setAssignGuidelines("Write a comprehensive academic essay outline discussing labor productivity shifts, sector-specific disruptions, and regulatory frameworks. Follow standard academic APA style.");
    }
  }, []);

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

    const isBypassActive = localStorage.getItem("orbit_marketing_bypass") === "true";
    if (isBypassActive) {
      setTimeout(() => {
        let mockResult = "";
        if (selectedTask.id === "cv") {
          mockResult = `# SARAH JENKINS\n### Senior Product Designer | sarah.jenkins@designorbit.io | +1 (555) 019-2834 | San Francisco, CA\n\n---\n\n## EXECUTIVE SUMMARY\nA highly accomplished and visionary Senior Product Designer with over 7 years of experience leading UX/UI design across world-class digital platforms. Proven track record of spearheading design systems, scaling complex user research methodologies, and collaborating cross-functionally to deliver sleek, user-centric interfaces. Recognized for optimizing the checkout flow conversion rate by 22% at Stripe and driving product direction at Figma.\n\n---\n\n## PROFESSIONAL EXPERIENCE\n\n### Lead UX Designer | Stripe\n*2022 — Present | San Francisco, CA*\n- Spearheaded the redesign of the global merchant checkout dashboard, directly increasing conversion rates by 22% and improving overall task success rates.\n- Led a cross-functional team of 12 designers and engineers to build and scale the new 'Stripe-Flow' responsive design system across 4 web platforms and 2 mobile platforms.\n- Conducted continuous user research, usability testing sessions, and interactive prototyping cycles with over 150 enterprise merchants globally.\n\n### Senior Product Designer | Figma\n*2018 — 2022 | San Francisco, CA*\n- Designed and optimized core interactive workspace features, enhancing collaborative team workflows and reducing user friction on complex multiplayer canvases.\n- Mentored and trained junior designers, introducing high-impact design critiques, wireframing guidelines, and strict accessibility standards (WCAG 2.1 AA).\n- Partnered with product and engineering leaders to establish semantic design tokens, bridging the design-to-development pipeline.\n\n---\n\n## EDUCATION\n\n### M.S. in Human-Computer Interaction | Stanford University\n*2016 — 2018 | Stanford, CA*\n- Specialization in Interaction Design, Cognitive Science, and Rapid Prototyping. Graduated with Honors (GPA 3.9/4.0).\n\n### B.A. in Graphic Design | Rhode Island School of Design (RISD)\n*2012 — 2016 | Providence, RI*\n- Dual concentration in Typography and Digital Media. Recipient of the Excellence in Design scholarship.\n\n---\n\n## CORE SKILLS & EXPERTISE\n- **Design**: Figma, UI/UX Design, Design Systems, Mobile App Design, Wireframing, Rapid Prototyping, Accessibility (WCAG 2.1 AA)\n- **Research**: Usability Testing, User Interviews, Persona Mapping, A/B Testing, Cognitive Walkthroughs, Journey Mapping\n- **Collaboration**: Agile/Scrum, Product Strategy, Cross-Functional Team Leadership, Technical Writer, Mentorship\n\n---\n\n## CERTIFICATIONS & HONORS\n- **NN/g UX Master Certified** – Nielsen Norman Group (#82019)\n- **Certified Scrum Product Owner (CSPO)** – Scrum Alliance\n- **Red Dot Design Award Winner** – Best of the Best category (2023)\n- **Config 2024 Guest Speaker** – Topic: "Scaling Collaborative Design Systems"`;
        } else if (selectedTask.id === "business_plan") {
          mockResult = `# EXECUTIVE BUSINESS PLAN: LUMINA COFFEE ROASTERS\n### Prepared for: Investors and Strategic Partners | Industry: Food & Beverage / E-Commerce\n\n---\n\n## 1. EXECUTIVE SUMMARY\nLumina Coffee Roasters is an artisanal, direct-to-consumer coffee brand dedicated to delivering exceptional, ethically sourced, single-origin coffee directly to modern urban professionals. By leveraging a high-impact e-commerce subscription model and an intelligent, flavor-profile matching algorithm, Lumina offers customers a curated coffee-drinking experience that marries convenience with a deep passion for craft coffee.\n\n---\n\n## 2. PROBLEM & SOLUTION\n- **The Problem**: Specialty coffee lovers often struggle to discover high-quality, ethically produced beans that match their unique flavor preferences, while traditional supermarket options lack freshness and transparent sourcing.\n- **The Solution**: Lumina sources premium green coffee beans through direct-trade relationships, roasts them in small batches, and ships them within 24 hours of roasting. Our smart flavor-pairing recommendation quiz ensures each customer is matched with their ideal roast profile.\n\n---\n\n## 3. MARKET OPPORTUNITY\nThe global specialty coffee and online e-commerce subscription market is experiencing unprecedented growth, driven by a post-pandemic shift toward premium home-brewing experiences. Lumina targets the premium tier of this segment—tech-savvy professionals aged 25-45 who value environmental sustainability, transparent supply chains, and exceptional culinary taste.\n\n---\n\n## 4. PRODUCT & SERVICE PORTFOLIO\n- **The Origin Subscription**: Monthly or bi-weekly rotating single-origin roasts accompanied by origin stories and sensory flavor wheels.\n- **Flavor Match Quiz**: A proprietary client-side web application that profiles user flavor preferences (e.g., fruit notes, chocolatey body, acidity levels) to curate their deliveries.\n- **Ethical Direct-Trade**: Fully transparent carbon-neutral shipping with 100% compostable packaging.\n\n---\n\n## 5. FINANCIAL PROJECTIONS (YEAR 1 - 3)\n- **Year 1**: Projected revenue of $240,000 with a gross margin of 68% and 2,500 active subscribers.\n- **Year 2**: Projected expansion to $680,000 revenue with a 72% gross margin by scaling corporate office partnerships.\n- **Year 3**: Reaching $1.5M in annual recurring revenue (ARR) and establishing our first carbon-neutral micro-roastery.`;
        } else if (selectedTask.id === "email") {
          mockResult = `# PARTNERSHIP RENEWAL & SCOPE EXPANSION PROPOSAL\n### Subject: Strategic Alliance Renewal & Mutual Growth Initiatives - Orbit AI\n\n---\n\nDear Executive Board,\n\nI hope this email finds you well.\n\nAs we approach the conclusion of our highly successful initial partnership term, I want to take a moment to express our sincere appreciation for the collaborative synergy we have shared. Together, we have successfully optimized administrative pipelines and delivered unparalleled value to our mutual stakeholders.\n\nTo build upon this powerful momentum, I would like to propose a renewal of our partnership with a strategic 15% increase in mutual operational scope. This expansion will introduce direct API integrations, real-time shared workspace telemetry, and dedicated executive support channels.\n\nTo streamline our next steps, I have outlined our proposed workflow:\n- **Immediate Scope Alignment**: Review of the updated SLA draft and mutual resource allocations.\n- **Integrated Communications**: Implementation of a unified Slack/Teams bridge for real-time collaboration.\n- **Review Call**: A brief 15-minute executive alignment session next Tuesday or Thursday.\n\nThank you once again for your visionary leadership and continued partnership. We are incredibly excited about the next chapter of our shared journey.\n\nWarm regards,\n\n**Sarah Jenkins**  \nDirector of Operations | Orbit AI  \nsarah.jenkins@designorbit.io | +1 (555) 019-2834`;
        } else if (selectedTask.id === "social_media") {
          mockResult = `# LINKEDIN LAUNCH ANNOUNCEMENT: ORBIT AI v2.0 🚀\n### Tagline: The Next Paradigm of Autonomous Knowledge Work\n\n---\n\nWe are thrilled to officially unveil **Orbit AI v2.0**—a monumental leap forward in the space of decentralized, user-directed productivity.\n\nThis release is engineered to empower modern professionals to skip the back-and-forth chat. With our brand new **Task Mode** and autonomous **Agent Program**, you can compile employer-ready CVs, draft strategic business outlines, and summarize heavy documents instantly.\n\n### Key Highlights of Version 2.0:\n- **ATS-Compliant CV Engine**: Interactive AI interview coach with beautifully styled visual exports (Modern, Minimal, Executive).\n- **Autonomous Agents**: Instantly activate specialist agents to manage complex referrals and track organic growth.\n- **Privacy-First Processing**: 100% secure uploads with real-time progress visuals.\n\nJoin over 25,000+ visionaries who are reshaping their daily workflows today!\n\n👉 **Experience the Future of Work**: [https://orbitai.io/download](https://orbitai.io/download)\n\n---\n#ArtificialIntelligence #Productivity #FutureOfWork #SaaSLaunch #DesignSystem #UIUX`;
        } else if (selectedTask.id === "summarize") {
          mockResult = `# EXECUTIVE SUMMARY: ORBIT AI SYSTEM ARCHITECTURE\n### Document analyzed: Orbit_AI_v2.0_Whitepaper.pdf (Size: 1.2 MB)\n\n---\n\n## 1. CORE DISCOVERY\nOrbit AI represents a monumental paradigm shift in user-directed artificial intelligence, transitioning from standard message-based conversational prompts to highly structured, task-specific frontend state automation.\n\n---\n\n## 2. KEY INSIGHTS & TAKEAWAYS\n- **State-Authoritative Client**: By implementing state context tracking on the client rather than relying on session-less backend calls, the system reduces API latency by 40% and ensures instant user response.\n- **Dual Display Typography**: The intentional pairing of *Space Grotesk* for display headings and *Inter* for body text creates a highly legible, premium aesthetic that optimizes visual focus.\n- **ATS-Compliant Document Compilation**: The integrated PDF export utility uses modern vector math to ensure print-ready alignment across standard dimensions.\n\n---\n\n## 3. RECOMMENDATIONS & WORKFLOWS\n- **Scale Agent Programs**: Recommend expanding the referral agent program to reward enterprise power-users.\n- **Introduce Local Persistence**: Continue using localStorage caching for offline-first capabilities while offering optional secure database synchronization.`;
        } else {
          mockResult = `# ACADEMIC STUDY GUIDE & ESSAY OUTLINE\n### Topic: The Economic and Technological Impacts of Generative AI on Global Knowledge Work (2024-2026)\n\n---\n\n## I. INTRODUCTION & THESIS STATEMENT\n- **Hook**: The rapid adoption of generative artificial intelligence represents the fastest technological deployment in human history, surpassing the internet and mobile computing.\n- **Background**: Generative AI has transitioned from a specialized novelty to a core infrastructure tool for global knowledge workers, dramatically altering cognitive task execution.\n- **Thesis Statement**: Although Generative AI significantly boosts individual labor productivity in knowledge-intensive sectors, it simultaneously disrupts traditional labor economics and challenges existing regulatory, copyright, and ethical frameworks.\n\n---\n\n## II. MAIN DISCUSSIONS & LITERATURE REVIEW\n\n### A. Labor Productivity & Economic Shifts\n- Discussion on empirical studies (e.g., Brynjolfsson et al., 2023) showing a 14% to 35% increase in task completion speeds for customer support and software engineering.\n- The "skills-leveling" effect: Greater relative performance gains observed among lower-skilled workers compared to high-skilled professionals.\n\n### B. Sector-Specific Disruptions & Re-skilling\n- In-depth analysis of highly affected industries: Software development, legal analysis, technical writing, and graphic design.\n- The evolution of "Prompt Engineering" into collaborative human-AI system design.\n\n### C. Regulatory and Copyright Challenges\n- Overview of landmark legal disputes surrounding dataset training permissions and fair use policies.\n- Comparative analysis of the EU AI Act (risk-based framework) versus the US Executive Orders on safe, secure, and trustworthy development.\n\n---\n\n## III. CONCLUSION & FUTURE OUTLOOK\n- **Summary**: Generative AI is a double-edged sword, serving as both an intellectual multiplier and an economic disruptor.\n- **Synthesis**: The future of work will not belong to AI alone, but to professionals who master the art of human-AI collaboration.`;
        }
        setResultText(mockResult);
        setActiveStep("result");
        setLoading(false);
      }, 750);
      return;
    }

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
        educationLevel: interviewAnswers.educationLevel || "",
        educationInstitution: interviewAnswers.educationInstitution || "",
        hasExperience: interviewAnswers.hasExperience || "",
        experience: interviewAnswers.experience || "",
        skills: interviewAnswers.skills || "",
        languages: interviewAnswers.languages || "",
        certificates: interviewAnswers.certificates || "",
        hobbies: interviewAnswers.hobbies || "",
        achievements: interviewAnswers.achievements || "",
        includeReferences: interviewAnswers.includeReferences || "",
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
            ) : selectedTask.id === "cv" ? (
              renderStyledCVPreview(resultText, cvStyle)
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
