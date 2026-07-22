import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from '../components/ReactNativeShim';
import { Sparkles, User, Send, RefreshCw, AlertCircle, Plus, Shield, Check, Image, Camera, FileText, MoreVertical, Orbit, Info } from '../components/Icons';
import { FormattedMessage } from '../components/FormattedMessage';
import { useAppState } from '../services/state';
import { UserPlan, ChatMessage } from '../types';
import { Reply, Trash2, X, Download, Share2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface MessageWithParsedAttachments {
  text: string;
  attachments: { id: string; name: string; type: 'image' | 'file'; url: string; sizeStr: string }[];
}

const parseMessageAttachments = (rawMessage: string): MessageWithParsedAttachments => {
  const delimiterStart = "|||ATTACHMENTS_JSON_START|||";
  const delimiterEnd = "|||ATTACHMENTS_JSON_END|||";
  
  if (rawMessage.includes(delimiterStart) && rawMessage.includes(delimiterEnd)) {
    const parts = rawMessage.split(delimiterStart);
    const textPart = parts[0].trim();
    const attachmentsPart = parts[1].split(delimiterEnd)[0];
    try {
      const attachments = JSON.parse(attachmentsPart);
      return { text: textPart, attachments };
    } catch (e) {
      console.error("Failed to parse attachments JSON", e);
    }
  }
  return { text: rawMessage, attachments: [] };
};

const serializeMessageAttachments = (text: string, attachments: any[]): string => {
  if (attachments.length === 0) return text;
  const delimiterStart = "|||ATTACHMENTS_JSON_START|||";
  const delimiterEnd = "|||ATTACHMENTS_JSON_END|||";
  return `${text}\n\n${delimiterStart}${JSON.stringify(attachments)}${delimiterEnd}`;
};

export const HomeChatScreen: React.FC = () => {
  const { 
    currentUser, 
    chatMessages, 
    setChatMessages,
    setConversations,
    activeConversationId, 
    isAiTyping, 
    setMobileScreen, 
    triggerChatMessage,
    incrementUsageLimit,
    limitModalType,
    setLimitModalType
  } = useAppState();

  const [inputText, setInputText] = useState("");
  
  // Real device attachments & camera integrations
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [localAttachments, setLocalAttachments] = useState<{ id: string; name: string; type: 'image' | 'file'; url: string; sizeStr: string }[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const [showAttachments, setShowAttachments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Custom interactive modal states
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // AI Image Generation states
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingPromptText, setGeneratingPromptText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for Reply and Delete features
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const pressTimer = useRef<any>(null);

  const handlePressStart = (msg: ChatMessage) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setSelectedMessageForMenu(msg);
      setShowActionMenu(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeMessages = chatMessages.filter(m => m.conversationId === activeConversationId);

  // Auto scroll to latest replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    // Dismiss dropdown menu when clicking elsewhere
    const handleClickOutside = () => {
      // Small timeout to allow target clicks
      setTimeout(() => {
        // Just empty callback
      }, 100);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() && localAttachments.length === 0) return;

    const replyId = replyingToMessage?.id;
    setReplyingToMessage(null);

    const attachmentsToSend = [...localAttachments];
    const textToSend = inputText.trim();

    setInputText("");
    setLocalAttachments([]);

    if (attachmentsToSend.length > 0) {
      // Show upload progress indicator
      setIsUploading(true);
      setUploadProgress(0);
      setUploadingFileName(attachmentsToSend.length === 1 ? attachmentsToSend[0].name : `${attachmentsToSend.length} files`);

      // Run progress animation
      let currentProgress = 0;
      const interval = setInterval(async () => {
        currentProgress += 15;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploadProgress(100);
          setTimeout(async () => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadingFileName("");

            // Create formatted descriptions for the AI model
            const descriptions = attachmentsToSend.map(att => 
              `[Attached ${att.type === 'image' ? 'Image' : 'File'}: ${att.name} (${att.sizeStr})]`
            ).join('\n');

            // Caption text with description
            const captionWithDesc = textToSend 
              ? `${textToSend}\n\n${descriptions}`
              : descriptions;

            // Serialize full high-res attachment data for the UI
            const finalMessage = serializeMessageAttachments(captionWithDesc, attachmentsToSend);

            await triggerChatMessage(finalMessage, replyId);
          }, 450);
        } else {
          setUploadProgress(currentProgress);
        }
      }, 80);
    } else {
      await triggerChatMessage(textToSend, replyId);
    }
  };

  const subStatus = currentUser?.subscription_status;
  const isPro = subStatus === "pro_monthly" || subStatus === "pro_yearly";

  const handlePremiumRoute = (screen: string) => {
    setShowMenu(false);
    if (isPro) {
      setMobileScreen(screen);
    } else {
      setLimitModalType('premium');
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputText("");
    await triggerChatMessage(suggestion);
  };

  // Cleanup camera streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    setCameraError(null);
    // Brief timeout to ensure the modal container rendering completes
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn("Camera facingMode:environment failed, trying default: ", err);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (fallbackErr: any) {
          console.error("Camera getUserMedia failed completely: ", fallbackErr);
          setCameraError("Camera access failed or was denied. Iframe security constraints may block media access. Use the native file picker fallback below instead.");
        }
      }
    }, 100);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        stopCamera();

        const newAttachment = {
          id: `capture-${Date.now()}`,
          name: `capture_${new Date().toISOString().replace(/[:.]/g, '')}.jpg`,
          type: 'image' as const,
          url: dataUrl,
          sizeStr: '120 KB'
        };
        setLocalAttachments(prev => [...prev, newAttachment]);
      }
    } catch (err) {
      console.error("Capture photo error: ", err);
      alert("Failed to capture snapshot from camera stream.");
    }
  };

  const simulateUpload = (file: File, callback: (url: string) => void) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultUrl = event.target?.result as string || "";
      
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadingFileName("");
            callback(resultUrl);
          }, 300);
        } else {
          setUploadProgress(currentProgress);
        }
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = incrementUsageLimit('camera');
    if (!check.allowed) {
      setLimitModalType('camera');
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeMB} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string || "";
      const newAttachment = {
        id: `photo-${Date.now()}`,
        name: file.name,
        type: 'image' as const,
        url,
        sizeStr
      };
      setLocalAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = incrementUsageLimit('file');
    if (!check.allowed) {
      setLimitModalType('file');
      return;
    }

    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeStr = parseInt(sizeKB) > 1024 ? `${(parseInt(sizeKB)/1024).toFixed(1)} MB` : `${sizeKB} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string || "";
      const newAttachment = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: 'file' as const,
        url,
        sizeStr
      };
      setLocalAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleFallbackCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = incrementUsageLimit('camera');
    if (!check.allowed) {
      setLimitModalType('camera');
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeMB} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string || "";
      const newAttachment = {
        id: `capture-${Date.now()}`,
        name: file.name || `capture_${Date.now()}.jpg`,
        type: 'image' as const,
        url,
        sizeStr
      };
      setLocalAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleAttachment = (type: string) => {
    setShowAttachments(false);

    if (type === "Camera") {
      const check = incrementUsageLimit('camera');
      if (!check.allowed) {
        setLimitModalType('camera');
        return;
      }
      startCamera();
    } else if (type === "Photos") {
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
        photoInputRef.current.click();
      }
    } else if (type === "Document") {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    } else if (type === "AI Image") {
      const check = incrementUsageLimit('image');
      if (!check.allowed) {
        setLimitModalType('image');
        return;
      }

      setImagePrompt("");
      setShowImageModal(true);
    }
  };

  const handleDownloadImage = async (url: string, fileName?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || `orbit-ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handleShareImage = async (url: string, promptText: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Orbit AI Generated Image',
          text: promptText ? `AI Image: "${promptText}"` : 'Check out this AI image from Orbit AI!',
          url: url
        });
        return;
      } catch (e) {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToastMessage("Image link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      setToastMessage("Image link: " + url);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleRegenerateImage = (promptText: string) => {
    const textToUse = promptText || "";
    setImagePrompt(textToUse);
    setShowImageModal(true);
  };

  const handleGenerateImageSubmit = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || imagePrompt).trim();
    if (!promptToUse) return;

    setShowImageModal(false);
    setImagePrompt("");

    const convId = activeConversationId;
    const nowIso = new Date().toISOString();

    // Add User Message to Chat
    const userMsgId = `user-img-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      conversationId: convId,
      message: `Create AI Image: "${promptToUse}"`,
      role: "user",
      timestamp: nowIso
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsGeneratingImage(true);
    setGeneratingPromptText(promptToUse);

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(promptToUse);
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

      // Preload image to ensure generation completion
      await new Promise((resolve) => {
        const img = new Image();
        img.src = generatedUrl;
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(true), 8000);
      });

      const aiMsgId = `ai-img-${Date.now()}`;
      const attachment = [{
        id: `att-img-${Date.now()}`,
        name: `Orbit_AI_${Date.now()}.png`,
        type: 'image' as const,
        url: generatedUrl,
        prompt: promptToUse,
        sizeStr: "1024x1024",
        isAiGenerated: true
      }];

      const aiMsgText = serializeMessageAttachments(
        `Here is your generated image for: "${promptToUse}"`,
        attachment
      );

      const aiMsg: ChatMessage = {
        id: aiMsgId,
        conversationId: convId,
        message: aiMsgText,
        role: "model",
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMsg]);

      // Update conversation last message
      setConversations(c => c.map(item => {
        if (item.id === convId) {
          return {
            ...item,
            lastMessage: `Generated AI Image for "${promptToUse}"`,
            timestamp: new Date().toISOString()
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Image generation error:", err);
      const errorMsgId = `ai-img-err-${Date.now()}`;
      const errorMsg: ChatMessage = {
        id: errorMsgId,
        conversationId: convId,
        message: "Image generation failed. Please try again.",
        role: "model",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGeneratingImage(false);
      setGeneratingPromptText("");
    }
  };

  const handleClearThread = () => {
    if (confirm("Clear all active messages in this chat conversation?")) {
      setChatMessages(prev => prev.filter(m => m.conversationId !== activeConversationId));
      setConversations(c => c.map(item => {
        if (item.id === activeConversationId) {
          return {
            ...item,
            lastMessage: "Conversation cleared.",
            timestamp: new Date().toISOString()
          };
        }
        return item;
      }));
      setShowMenu(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden justify-between relative">
      
      {/* WHATSAPP-STYLE HEADER BAR */}
      <View className="h-[52px] px-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none relative z-50">
        <Text className="font-bold text-[18px] text-[#1F1F1F] font-sans">Orbit AI</Text>

        {/* 3-DOT MENU TRIGGER */}
        <div className="relative">
          <TouchableOpacity 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            title="Menu Options"
          >
            <MoreVertical className="w-5 h-5" />
          </TouchableOpacity>

          {/* Absolute Popup Menu - drops directly below the 3-dot icon and is right-aligned */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-[4px] w-[260px] bg-white border border-slate-200/85 rounded-2xl shadow-xl py-1 z-50 animate-fade-in text-left">
              <TouchableOpacity 
                onClick={() => handlePremiumRoute("agents")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Agent Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("profile"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("upgrade"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Payment / Billing</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handlePremiumRoute("side-hustle")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">AI Side Hustle Generator</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handlePremiumRoute("business-builder")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">AI Business Builder</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("business-mode"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Business Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handlePremiumRoute("task-mode")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Task Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); handleClearThread(); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Clear Workspace</Text>
              </TouchableOpacity>
            </div>
          )}
        </div>
      </View>

      {/* FOOTER TO HEADER LAYOUT: 6 links above the chat window in a single horizontal scrollable row */}
      <View className="w-full bg-slate-50 border-b border-slate-100 select-none">
        <div className="flex flex-row overflow-x-auto whitespace-nowrap scrollbar-none py-2 px-4 items-center justify-start sm:justify-center gap-4">
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(true);
              setShowPrivacy(false);
              setShowTerms(false);
              setShowRefund(false);
              setShowCancellation(false);
              setShowContact(false);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showAbout ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>About</Text>
          </TouchableOpacity>
          
          <Text className="text-[10px] text-slate-300">|</Text>
          
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(false);
              setShowPrivacy(true);
              setShowTerms(false);
              setShowRefund(false);
              setShowCancellation(false);
              setShowContact(false);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showPrivacy ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <Text className="text-[10px] text-slate-300">|</Text>
          
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(false);
              setShowPrivacy(false);
              setShowTerms(true);
              setShowRefund(false);
              setShowCancellation(false);
              setShowContact(false);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showTerms ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>Terms of Use</Text>
          </TouchableOpacity>
          
          <Text className="text-[10px] text-slate-300">|</Text>
          
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(false);
              setShowPrivacy(false);
              setShowTerms(false);
              setShowRefund(true);
              setShowCancellation(false);
              setShowContact(false);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showRefund ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>Refund Policy</Text>
          </TouchableOpacity>
          
          <Text className="text-[10px] text-slate-300">|</Text>
          
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(false);
              setShowPrivacy(false);
              setShowTerms(false);
              setShowRefund(false);
              setShowCancellation(true);
              setShowContact(false);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showCancellation ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>Cancellation Policy</Text>
          </TouchableOpacity>
          
          <Text className="text-[10px] text-slate-300">|</Text>
          
          <TouchableOpacity 
            onClick={() => {
              setShowAbout(false);
              setShowPrivacy(false);
              setShowTerms(false);
              setShowRefund(false);
              setShowCancellation(false);
              setShowContact(true);
            }} 
            className="py-0.5 px-1 hover:opacity-80"
          >
            <Text className={`text-[11px] font-sans font-medium ${showContact ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>Contact Us</Text>
          </TouchableOpacity>
        </div>
      </View>

      {/* WHATSAPP-STYLE PLAIN WHITE CHAT STREAM AREA */}
      <ScrollView 
         id="chat-scroll-wrapper"
         ref={scrollRef}
         className="bg-white flex-1 px-4 pt-1.5 pb-2"
         contentContainerClassName="space-y-2.5 pb-4"
         showsVerticalScrollIndicator={false}
       >
         {activeMessages.length === 0 ? (
           <View className="flex items-center justify-center text-center p-4 space-y-4 my-auto pt-4">
             <View className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
               <Orbit className="w-6 h-6 text-blue-500" />
             </View>
             <View className="space-y-1">
               <Text className="text-slate-900 font-bold text-sm">Orbit AI Chat Companion</Text>
               <Text className="text-slate-400 text-xs text-center px-4 leading-relaxed font-sans font-medium">
                 Ask coding questions, draft professional emails, analyze legal text, or plan business milestones. South Africa's dedicated companion engine is ready.
               </Text>
             </View>
             
             {/* Quick Starters / Suggestions without emojis */}
             <View className="grid grid-cols-2 gap-2 w-full pt-2 max-w-xs text-left">
              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Draft a professional POPIA compliance checklist")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">POPIA quick list</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Write a python class for compounding interest rates")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">Write compound interest code</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Review a sample South African service level agreement outline")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">SLA document outline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Draft cold business letters for Pretoria retail space")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">Business sales letter</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          activeMessages.map((msg, idx) => {
            const isError = msg.id.includes("-error");
            return (
              <View 
                key={msg.id || idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full space-y-1`}
              >
                {/* WHATSAPP-STYLE MSG BUBBLE */}
                <View 
                  onMouseDown={() => handlePressStart(msg)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(msg)}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  onContextMenu={(e: any) => {
                    e.preventDefault();
                    setSelectedMessageForMenu(msg);
                    setShowActionMenu(true);
                  }}
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl relative shadow-3xs cursor-pointer select-none transition-all active:scale-[0.98] ${
                    msg.role === 'user' 
                      ? 'bg-[#d9fdd3] rounded-tr-none' // WhatsApp Light Green bubble 
                      : isError 
                        ? 'bg-red-50 border border-red-150 rounded-tl-none'
                        : 'bg-slate-100 rounded-tl-none' // Recipient standard grey bubble
                  }`}
                >
                  {(() => {
                    const { text: cleanText, attachments: msgAttachments } = parseMessageAttachments(msg.message);
                    
                    return (
                      <>
                        {msg.replyToMessageId && (() => {
                          const parentMsg = chatMessages.find(m => m.id === msg.replyToMessageId);
                          if (!parentMsg) return null;
                          const parentText = parseMessageAttachments(parentMsg.message).text;
                          return (
                            <View className="mb-2.5 p-2 bg-black/5 rounded-xl border-l-4 border-blue-500 text-left select-none max-w-full">
                              <Text className="text-[9px] font-bold text-blue-600 block">
                                {parentMsg.role === 'user' ? 'You' : 'Orbit AI'}
                              </Text>
                              <Text className="text-[10px] text-slate-600 truncate block">
                                {parentText}
                              </Text>
                            </View>
                          );
                        })()}

                        {isError && (
                          <View className="flex flex-row items-center gap-1.5 mb-1.5 font-semibold text-red-900 border-b border-red-100 pb-1 align-middle">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <Text className="text-red-900 font-bold text-xs select-none font-sans">API Alert</Text>
                          </View>
                        )}

                        {/* RENDER RICH ATTACHMENTS LARGE INSIDE BUBBLE */}
                        {msgAttachments && msgAttachments.length > 0 && (
                          <View className="flex flex-col gap-2 mb-2 w-full max-w-[280px]">
                            {msgAttachments.map((att: any) => {
                              if (att.type === 'image') {
                                const isAiGenerated = msg.role === 'model' || att.isAiGenerated || att.prompt;
                                return (
                                  <View key={att.id} className="flex flex-col gap-2 w-full">
                                    <TouchableOpacity
                                      onClick={() => setZoomImageUrl(att.url)}
                                      className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-black/5 bg-slate-50 shadow-3xs cursor-pointer active:scale-[0.99] transition"
                                    >
                                      <img 
                                        src={att.url} 
                                        className="w-full h-full object-cover" 
                                        alt={att.name || "AI Generated Image"} 
                                        referrerPolicy="no-referrer"
                                      />
                                    </TouchableOpacity>

                                    {/* Action buttons under AI generated image */}
                                    {isAiGenerated && (
                                      <View className="flex flex-row items-center gap-1.5 pt-1 border-t border-slate-200/60 w-full select-none">
                                        <TouchableOpacity
                                          onClick={() => handleDownloadImage(att.url, att.name)}
                                          className="flex-1 flex flex-row items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer active:scale-95 shadow-3xs"
                                        >
                                          <Download className="w-3 h-3 text-slate-500 shrink-0" />
                                          <span>Download</span>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          onClick={() => handleShareImage(att.url, att.prompt || cleanText)}
                                          className="flex-1 flex flex-row items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer active:scale-95 shadow-3xs"
                                        >
                                          <Share2 className="w-3 h-3 text-slate-500 shrink-0" />
                                          <span>Share</span>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          onClick={() => handleRegenerateImage(att.prompt || cleanText)}
                                          className="flex-1 flex flex-row items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl text-[10px] font-bold text-blue-600 transition cursor-pointer active:scale-95 shadow-3xs"
                                        >
                                          <RefreshCw className="w-3 h-3 text-blue-600 shrink-0" />
                                          <span>Regenerate</span>
                                        </TouchableOpacity>
                                      </View>
                                    )}
                                  </View>
                                );
                              } else {
                                return (
                                  <div 
                                    key={att.id} 
                                    className="flex flex-row items-center gap-2.5 p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-3xs text-left"
                                  >
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                      <FileText className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-800 truncate leading-tight block">{att.name}</span>
                                      <span className="text-[9px] text-slate-400 font-mono leading-none mt-1">{att.sizeStr}</span>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </View>
                        )}

                        {/* RENDER MAIN MESSAGE TEXT */}
                        {cleanText && (
                          <FormattedMessage text={cleanText} isUser={msg.role === 'user'} />
                        )}
                      </>
                    );
                  })()}
                  
                  <Text className={`text-[8px] mt-1 block text-right font-mono ${msg.role === 'user' ? 'text-slate-500' : isError ? 'text-red-400' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {isError && (
                  <TouchableOpacity
                    onClick={() => {
                      const lastUser = [...activeMessages].slice(0, activeMessages.indexOf(msg)).reverse().find(m => m.role === 'user');
                      if (lastUser) {
                        triggerChatMessage(lastUser.message);
                      } else {
                        const firstUser = activeMessages.find(m => m.role === 'user');
                        if (firstUser) triggerChatMessage(firstUser.message);
                      }
                    }}
                    className="flex flex-row items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-150 text-slate-700 rounded-full border border-slate-200 transition text-[9px] font-bold cursor-pointer ml-1 select-none font-sans active:opacity-75"
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                    <span>Retry sending last prompt</span>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {isGeneratingImage && (
          <View className="flex flex-col items-start w-full my-2 animate-fade-in">
            <View className="max-w-[85%] bg-slate-50 border border-slate-200/80 p-4 rounded-2xl rounded-tl-none shadow-3xs flex flex-col gap-3">
              <View className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <View className="flex flex-col text-left">
                  <Text className="text-xs font-bold text-slate-900 font-sans block">
                    Generating your image...
                  </Text>
                  <Text className="text-[11px] text-slate-500 font-sans block mt-0.5">
                    Please wait while Orbit AI creates your image.
                  </Text>
                </View>
              </View>
              
              {/* Animated loading progress bar */}
              <View className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden relative">
                <div className="h-full bg-blue-600 rounded-full animate-pulse w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
              </View>
            </View>
          </View>
        )}

        {isAiTyping && (
          <View className="flex flex-row justify-start w-full">
            <View className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex flex-row gap-1 items-center shadow-3xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* FLOATING ATTACHMENT ACTION MENU */}
      {showAttachments && (
        <View className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-4 gap-2 animate-slide-up select-none shadow-inner">
          <TouchableOpacity 
            onClick={() => handleAttachment("Camera")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Camera className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Camera Roll</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("Photos")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Image className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Photo Library</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("Document")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Browse Files</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("AI Image")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-blue-500" />
            <Text className="text-[9px] font-bold text-slate-600">AI Image</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WHATSAPP-STYLE REPLY PREVIEW BAR */}
      {replyingToMessage && (
        <View className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-row items-center justify-between animate-fade-in select-none">
          <View className="border-l-4 border-blue-500 pl-2.5 text-left flex-1 max-w-[85%]">
            <Text className="text-[10px] font-black text-blue-600 block uppercase tracking-wider">
              {replyingToMessage.role === 'user' ? 'Replying to you' : 'Replying to Orbit AI'}
            </Text>
            <Text className="text-xs text-slate-600 truncate block mt-0.5 font-sans font-medium">
              {replyingToMessage.message}
            </Text>
          </View>
          <TouchableOpacity 
            onClick={() => setReplyingToMessage(null)}
            className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </TouchableOpacity>
        </View>
      )}

      {/* Hidden File Inputs for Device Integration */}
      <input 
        type="file" 
        ref={photoInputRef} 
        style={{ display: "none" }} 
        accept="image/*" 
        onChange={handlePhotoChange} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        onChange={handleFileChange} 
      />
      <input 
        type="file" 
        ref={cameraFallbackInputRef} 
        style={{ display: "none" }} 
        accept="image/*" 
        capture="environment" 
        onChange={handleFallbackCameraChange} 
      />

      {/* LOCAL ATTACHMENTS PREVIEW ROW */}
      {localAttachments.length > 0 && (
        <View className="bg-slate-50 border-t border-slate-200/60 py-3.5 px-4 animate-fade-in select-none">
          <View className="flex flex-row overflow-x-auto gap-3 scrollbar-none pb-1">
            {localAttachments.map(att => {
              if (att.type === 'image') {
                return (
                  <View 
                    key={att.id} 
                    className="relative shrink-0 w-[240px] h-[150px] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-3xs"
                  >
                    <img 
                      src={att.url} 
                      className="w-full h-full object-cover" 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                    />
                    {/* Small X button top-right */}
                    <TouchableOpacity
                      onClick={() => setLocalAttachments(prev => prev.filter(a => a.id !== att.id))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/85 rounded-full flex items-center justify-center text-white transition active:scale-90 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-white font-bold" />
                    </TouchableOpacity>
                    {/* Size and name label overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                      <span className="text-[10px] font-semibold text-white truncate block">{att.name}</span>
                      <span className="text-[8px] text-white/80 font-mono block mt-0.5">{att.sizeStr}</span>
                    </div>
                  </View>
                );
              } else {
                return (
                  <View 
                    key={att.id} 
                    className="relative shrink-0 w-[200px] h-[150px] p-3.5 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-3xs text-left"
                  >
                    <div className="flex flex-row items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 truncate block">{att.name}</span>
                        <span className="text-[8px] text-slate-400 font-mono block mt-0.5">{att.sizeStr}</span>
                      </div>
                    </div>
                    
                    {/* Size badge and bottom design */}
                    <div className="flex flex-row items-center justify-between mt-auto">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document File</span>
                      <TouchableOpacity
                        onClick={() => setLocalAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </TouchableOpacity>
                    </div>
                  </View>
                );
              }
            })}
          </View>
        </View>
      )}

      {/* DETAILED UPLOAD PROGRESS DIALOG */}
      {isUploading && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-5 w-full max-w-xs border border-slate-200/85 shadow-2xl flex flex-col space-y-4">
            <View className="text-left">
              <Text className="text-sm font-bold text-slate-900 truncate block">Uploading {uploadingFileName}</Text>
              <Text className="text-[10px] text-slate-500 mt-1 block">Uploading file directly to secure channel...</Text>
            </View>
            <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-150" 
                style={{ width: `${uploadProgress}%` }}
              />
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-[10px] text-slate-400 font-mono">{uploadProgress}% Complete</Text>
              <TouchableOpacity 
                onClick={() => {
                  setIsUploading(false);
                  setUploadProgress(0);
                  setUploadingFileName("");
                }}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
              >
                Cancel
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

      {/* FULL SCREEN WEB CAMERA CONTROLLER */}
      {cameraActive && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-between z-[9999] select-none animate-fade-in">
          {/* Header */}
          <View className="p-4 flex flex-row items-center justify-between border-b border-white/10 bg-black/40">
            <Text className="text-white font-bold text-xs tracking-tight font-sans">Device Camera Stream</Text>
            <TouchableOpacity 
              onClick={stopCamera}
              className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </TouchableOpacity>
          </View>

          {/* Video stream container */}
          <View className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {cameraError ? (
              <View className="max-w-xs p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                <Text className="text-slate-300 text-xs font-medium leading-relaxed block">{cameraError}</Text>
                
                <TouchableOpacity 
                  onClick={() => {
                    if (cameraFallbackInputRef.current) {
                      cameraFallbackInputRef.current.value = "";
                      cameraFallbackInputRef.current.click();
                      stopCamera();
                    }
                  }}
                  className="py-3 px-5 bg-white hover:bg-slate-100 text-black rounded-xl font-bold text-xs cursor-pointer inline-block"
                >
                  Use Native Camera App
                </TouchableOpacity>
              </View>
            ) : (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover max-h-[80vh] md:max-w-md md:rounded-2xl md:border md:border-white/15"
              />
            )}
          </View>

          {/* Camera Controls */}
          {!cameraError && (
            <View className="p-6 bg-black/60 border-t border-white/5 flex flex-row items-center justify-around">
              <TouchableOpacity 
                onClick={stopCamera}
                className="px-4 py-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </TouchableOpacity>

              {/* Shutter Button */}
              <TouchableOpacity 
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/10 hover:bg-white/35 active:scale-90 transition flex items-center justify-center cursor-pointer relative"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </TouchableOpacity>

              {/* Fallback alternative */}
              <TouchableOpacity 
                onClick={() => {
                  if (cameraFallbackInputRef.current) {
                    cameraFallbackInputRef.current.value = "";
                    cameraFallbackInputRef.current.click();
                    stopCamera();
                  }
                }}
                className="px-4 py-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Fallback
              </TouchableOpacity>
            </View>
          )}
        </div>
      )}

      {/* WHATSAPP WHITESPACE-OPTIMIZED INPUT BAR */}
      <View className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex flex-row items-center gap-2 select-none shrink-0">
        
        {/* INPUT TIER CONTAINER */}
        <View className="flex-1 bg-white border border-slate-200/80 rounded-full px-3.5 py-1 flex flex-row items-center shadow-3xs">
          
          {/* Bottom-left INSIDE input bar: "+" plus icon */}
          <TouchableOpacity 
            onClick={() => setShowAttachments(!showAttachments)}
            className={`mr-2.5 p-1 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              showAttachments ? 'bg-slate-100 text-slate-800' : 'text-slate-450 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-5 h-5" />
          </TouchableOpacity>

          {/* INPUT ELEMENT */}
          <TextInput 
            value={inputText}
            placeholder={isAiTyping ? "Orbit companion typing..." : "Message Orbit companion..."}
            placeholderTextColor="#94a3b8"
            onChange={(e: any) => setInputText(e.target.value)}
            disabled={isAiTyping}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="text-xs w-full outline-none py-1 bg-transparent font-sans text-slate-800"
          />
        </View>

        {/* GREEN CIRCULAR SEND BUTTON */}
        <TouchableOpacity 
          onClick={handleSend}
          disabled={!inputText.trim() || isAiTyping}
          className={`w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            inputText.trim() && !isAiTyping ? 'bg-[#00a884] shadow-sm transform scale-100 active:scale-95' : 'bg-slate-250 select-none opacity-50'
          }`}
        >
          <Send className="w-4.5 h-4.5 text-white" />
        </TouchableOpacity>
      </View>

      {/* PORTAL TERMS OF USE MODAL */}
      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Terms of Use</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                You must be 13+ to use this app. Don't spam, harass, or post illegal stuff. Don't misuse the AI to break laws. Be respectful.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We can suspend accounts that break rules. AI responses may be inaccurate. The app is provided "as is" with no guarantees. Use at your own risk.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We may update these terms. Continued use means you accept changes. Contact support@orbitai.com for help.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowTerms(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL PRIVACY POLICY MODAL */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Privacy Policy</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We only collect your name, mobile number, and messages to run the app. We never sell your data. Your chats and AI prompts are yours.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We use basic security to protect your info. If you delete your account, we delete your data within 30 days.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                Questions? Email us at support@orbitai.com. By using the app, you agree to this policy.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowPrivacy(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL ABOUT SYSTEM MODAL */}
      {showAbout && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">About</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                Orbit AI is a smart assistant for daily tasks, quick answers, and creative help. Built to be fast, private, and always improving.
              </Text>

              <View className="mt-[24px]">
                <Text className="text-[12px] text-slate-500 font-sans font-medium block text-left">
                  Designed and founded by Ndamulelo Makushu Glen
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onClick={() => setShowAbout(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL REFUND POLICY MODAL */}
      {showRefund && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Refund Policy</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">7-Day Refund Window:</span> We offer a full refund for Orbit Pro subscription cancellations made within 7 days of the initial purchase or billing date.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Outside 7-Day Window:</span> Any cancellation requested after the 7-day period is not eligible for a refund. However, you will continue to have full access to Orbit Pro features until the end of your current billing cycle.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Processing Refunds:</span> Once requested and approved, refunds are processed back to the original payment method and may take 5–10 business days to reflect on your statement.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowRefund(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL CANCELLATION POLICY MODAL */}
      {showCancellation && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Cancellation Policy</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Easy Cancellations:</span> You can cancel your Orbit Pro subscription at any time directly through the Payment / Billing tab in the navigation menu.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Immediate Effect:</span> Upon cancellation, auto-renewal is immediately deactivated, ensuring you will not be charged again.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Access Until Expiry:</span> If you cancel outside the refund window, your subscription remains fully active and usable until your next scheduled renewal date, at which point it gracefully downgrades.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowCancellation(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL CONTACT US MODAL */}
      {showContact && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Contact Us</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Support Channels:</span> Need help, have questions about your subscription, or want to provide feedback? Our South African support team is here to assist you.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Email Support:</span> Drop us an email at <span className="font-bold text-blue-600">support@orbitai.com</span> for billing queries, technical support, or general enquiries. We typically respond within 24 hours.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                <span className="font-bold text-slate-900">Developer & Founder:</span> Designed and founded by Ndamulelo Makushu Glen. For partnerships, feedback, or direct enquiries, feel free to reach out to ndamulelomakushu63@gmail.com.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowContact(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* LIMITS AND PREMIUM LOCK POPUPS */}
      {(() => {
        if (!limitModalType) return null;
        let title = "";
        let message = "";
        if (limitModalType === 'chat') {
          title = "Daily Free Limit Reached";
          message = "You have used all 20 free AI messages for today. Upgrade to Orbit Pro for unlimited AI chat, unlimited uploads, AI Business Builder, AI Side Hustle Generator, and Agent access. You may continue using your free messages again after 24 hours if you choose not to upgrade.";
        } else if (limitModalType === 'image') {
          title = "Image Limit Reached";
          message = "You have used your 2 free image generations for today. Upgrade to Orbit Pro for unlimited image generation. You may try again after 24 hours.";
        } else if (limitModalType === 'file') {
          title = "File Upload Limit Reached";
          message = "You have used your free file uploads for today. Upgrade to Orbit Pro for unlimited file uploads. You may try again after 24 hours.";
        } else if (limitModalType === 'camera') {
          title = "Upload Limit Reached";
          message = "You have used your free camera/photo uploads for today. Upgrade to Orbit Pro for unlimited uploads. You may try again after 24 hours.";
        } else if (limitModalType === 'premium') {
          title = "Orbit Pro Required";
          message = "Upgrade to Orbit Pro to unlock premium business tools, referral earnings, and unlimited AI access.";
        } else if (limitModalType === 'guest') {
          title = "Create your free Orbit AI account";
          message = "You're enjoying Orbit AI.\n\nCreate a free account to continue chatting, save conversations, unlock more features, and upgrade to Pro whenever you're ready.";
        }

        const isGuestModal = limitModalType === 'guest';

        return (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
            <View className="bg-white rounded-3xl p-6 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col justify-between text-left space-y-5">
              <View className="text-left space-y-2.5">
                <Text className="text-lg font-black text-slate-950 tracking-tight block text-left font-sans">
                  {title}
                </Text>
                <Text className="text-xs text-slate-600 leading-relaxed block text-left font-sans font-medium whitespace-pre-wrap">
                  {message}
                </Text>
              </View>
              <View className="flex flex-col gap-2">
                {isGuestModal ? (
                  <>
                    <TouchableOpacity 
                      onClick={() => {
                        setLimitModalType(null);
                        setMobileScreen("register");
                      }}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer transition active:scale-98"
                    >
                      Create Free Account
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onClick={() => {
                        setLimitModalType(null);
                        setMobileScreen("login");
                      }}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition"
                    >
                      Sign In
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity 
                      onClick={() => {
                        setLimitModalType(null);
                        setMobileScreen("upgrade");
                      }}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer transition active:scale-98"
                    >
                      Upgrade to Pro
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onClick={() => setLimitModalType(null)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition"
                    >
                      Maybe Later
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </div>
        );
      })()}

      {/* WHATSAPP-STYLE ACTION OPTIONS MENU OVERLAY */}
      {showActionMenu && selectedMessageForMenu && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-5 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col space-y-4 text-left">
            <View className="border-b border-slate-100 pb-2.5">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Message Options</Text>
              <Text className="text-xs text-slate-600 truncate mt-1 block">
                "{selectedMessageForMenu.message}"
              </Text>
            </View>
            <View className="flex flex-col gap-2">
              <TouchableOpacity 
                onClick={() => {
                  setReplyingToMessage(selectedMessageForMenu);
                  setShowActionMenu(false);
                  setSelectedMessageForMenu(null);
                }}
                className="flex flex-row items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-xl cursor-pointer transition"
              >
                <Reply className="w-4 h-4 text-blue-500" />
                <Text className="text-xs font-bold text-slate-800">Reply</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => {
                  setShowActionMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="flex flex-row items-center gap-3 py-3 px-4 hover:bg-red-50 text-red-600 rounded-xl cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <Text className="text-xs font-bold text-red-600">Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => {
                  setShowActionMenu(false);
                  setSelectedMessageForMenu(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition mt-2"
              >
                Cancel
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && selectedMessageForMenu && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col justify-between text-left space-y-5">
            <View className="text-left space-y-2.5">
              <Text className="text-lg font-black text-slate-950 tracking-tight block text-left font-sans">
                Delete Message?
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed block text-left font-sans font-medium">
                {selectedMessageForMenu.role === 'user' 
                  ? "This message will be permanently removed from this conversation."
                  : "Delete this AI response from the conversation?"}
              </Text>
            </View>
            <View className="flex flex-col gap-2">
              <TouchableOpacity 
                onClick={() => {
                  const idToDelete = selectedMessageForMenu.id;
                  setChatMessages(prev => prev.filter(m => m.id !== idToDelete));
                  setShowDeleteConfirm(false);
                  setSelectedMessageForMenu(null);
                  if (replyingToMessage?.id === idToDelete) {
                    setReplyingToMessage(null);
                  }
                }}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer transition active:scale-98"
              >
                Delete
              </TouchableOpacity>
              <TouchableOpacity 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedMessageForMenu(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

      {/* FULL-SCREEN IMAGE VIEWER PINCH-TO-ZOOM MODAL */}
      {zoomImageUrl && (
        <div className="fixed inset-0 bg-black/95 flex flex-col justify-between z-[99999] select-none animate-fade-in p-4">
          {/* Zoom Header */}
          <div className="flex flex-row items-center justify-between w-full pb-2">
            <span className="text-white/60 text-xs">Image Viewer</span>
            <TouchableOpacity 
              onClick={() => setZoomImageUrl(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5 text-white" />
            </TouchableOpacity>
          </div>
          
          {/* Zoom Body */}
          <div className="flex-1 flex items-center justify-center p-2 relative overflow-auto">
            <img 
              src={zoomImageUrl} 
              className="max-w-full max-h-[80vh] rounded-xl object-contain select-none transition-transform duration-300" 
              style={{ transform: "scale(1)" }}
              alt="Zoomed attachment" 
            />
          </div>

          {/* Prompt/Caption or Info Footer */}
          <div className="text-center pb-4">
            <Text className="text-white/50 text-[10px] font-mono">Pinch to zoom / double tap supported natively</Text>
          </div>
        </div>
      )}

      {/* CREATE AI IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-200/80 shadow-2xl flex flex-col space-y-4 text-left">
            <View className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <View className="flex flex-col text-left">
                <Text className="text-xl font-black text-slate-900 tracking-tight block font-sans">
                  Create AI Image
                </Text>
                <Text className="text-xs text-slate-500 font-sans block mt-0.5">
                  Describe the image you want Orbit AI to generate.
                </Text>
              </View>
              <TouchableOpacity 
                onClick={() => setShowImageModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </TouchableOpacity>
            </View>

            <View className="flex flex-col space-y-2">
              <textarea 
                className="w-full h-32 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none font-sans"
                placeholder="Describe your image... e.g. A futuristic city at sunset with flying cars."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateImageSubmit();
                  }
                }}
                autoFocus
              />
            </View>

            <View className="flex flex-row items-center justify-end gap-2 pt-2">
              <TouchableOpacity 
                onClick={() => setShowImageModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </TouchableOpacity>
              <TouchableOpacity 
                onClick={() => handleGenerateImageSubmit()}
                disabled={!imagePrompt.trim()}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex flex-row items-center gap-1.5 ${
                  imagePrompt.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98 shadow-sm' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Image</span>
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 text-white text-xs font-semibold py-2 px-4 rounded-full shadow-lg animate-fade-in flex items-center gap-2 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

    </SafeAreaView>
  );
};
