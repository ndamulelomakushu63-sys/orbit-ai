import React, { useState, useEffect } from 'react';
import { AppStateProvider } from './services/state';
import { AppNavigator } from './navigation/AppNavigator';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { NATIVE_FILES } from './nativeCodeData';
import { generateZip, loadBinaryPixel, generatePngAsset } from './utils/zip';
import { 
  Compass, Smartphone, Shield, Code, ArrowUpRight, 
  Copy, Check, AlertTriangle, RefreshCw, Download 
} from 'lucide-react';

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<"simulator" | "admin" | "code">("simulator");
  const [selectedNativeFileIdx, setSelectedNativeFileIdx] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const [viewportHeight, setViewportHeight] = useState<number | string>("100dvh");
  const [offsetTop, setOffsetTop] = useState<number>(0);
  const [isMobileLayout, setIsMobileLayout] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      return;
    }

    // Lock body scroll on mobile layout to prevent bouncing/shifting
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        setOffsetTop(window.visualViewport.offsetTop);
      } else {
        setViewportHeight(window.innerHeight);
        setOffsetTop(0);
      }
    };

    const handleScrollReset = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }
    window.addEventListener("resize", handleViewportChange);
    
    // Initial call
    handleViewportChange();

    // Reset layout scroll when input is blurred to avoid blank whitespace gap
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          handleScrollReset();
          handleViewportChange();
        }, 120);
      }
    };

    document.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("focusout", handleFocusOut);
      
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isMobileLayout]);

  const handleCopyCode = () => {
    const codeToCopy = NATIVE_FILES[selectedNativeFileIdx].code;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      
      // Fetch all project files from the workspace server
      const res = await fetch("/api/project-files");
      if (!res.ok) {
        throw new Error("Failed to fetch project files from backend");
      }
      const data = await res.json();
      const workspaceFiles: { path: string; content: string }[] = data.files || [];

      const pixelBytes = loadBinaryPixel();

      // List of all file objects to go into the ZIP
      const allZipFiles: { name: string; content: string | Uint8Array }[] = [];

      // 1. Add genuine high-fidelity PNG binary assets matching Expo requirements
      allZipFiles.push({ name: "assets/icon.png", content: generatePngAsset(1024, 1024, 'icon') });
      allZipFiles.push({ name: "assets/splash.png", content: generatePngAsset(1242, 2436, 'splash') });
      allZipFiles.push({ name: "assets/adaptive-icon.png", content: generatePngAsset(1024, 1024, 'adaptive') });
      allZipFiles.push({ name: "assets/favicon.png", content: generatePngAsset(48, 48, 'favicon') });

      // 2. Prepare specialized Expo config files
      const configFilesMap = new Map<string, string>();
      
      configFilesMap.set("tsconfig.json", JSON.stringify({
        "extends": "expo/tsconfig.base",
        "compilerOptions": {
          "strict": true
        }
      }, null, 2));

      configFilesMap.set("babel.config.js", `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`);

      configFilesMap.set("package.json", JSON.stringify({
        "name": "orbit-ai-expo",
        "version": "1.0.0",
        "scripts": {
          "start": "expo start",
          "android": "expo start --android",
          "ios": "expo start --ios",
          "web": "expo start --web",
          "ts:check": "tsc"
        },
        "dependencies": {
          "expo": "~51.0.0",
          "expo-router": "~3.5.0",
          "expo-status-bar": "~1.12.1",
          "react": "18.2.0",
          "react-dom": "18.2.0",
          "react-native": "0.74.1",
          "react-native-safe-area-context": "4.10.1",
          "react-native-screens": "3.31.1",
          "react-native-web": "~0.19.10",
          "firebase": "^10.12.0",
          "@react-native-async-storage/async-storage": "1.23.1",
          "@expo/vector-icons": "^14.0.0"
        },
        "devDependencies": {
          "@babel/core": "^7.20.0",
          "@types/react": "~18.2.45",
          "typescript": "~5.3.3"
        },
        "private": true
      }, null, 2));

      configFilesMap.set("app.json", JSON.stringify({
        "expo": {
          "name": "Orbit AI",
          "slug": "orbit-ai",
          "version": "1.0.0",
          "orientation": "portrait",
          "icon": "./assets/icon.png",
          "userInterfaceStyle": "light",
          "splash": {
            "image": "./assets/splash.png",
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
          },
          "ios": {
            "supportsTablet": true,
            "bundleIdentifier": "com.orbitai.app"
          },
          "android": {
            "adaptiveIcon": {
              "foregroundImage": "./assets/adaptive-icon.png",
              "backgroundColor": "#ffffff"
            },
            "package": "com.orbitai.app"
          },
          "web": {
            "favicon": "./assets/favicon.png"
          },
          "plugins": [
            "expo-router"
          ],
          "scheme": "orbit-ai"
        }
      }, null, 2));

      // 3. Process all workspace files
      workspaceFiles.forEach(file => {
        // Skip files that we override or generate separately
        if (
          file.path === "package.json" ||
          file.path === "tsconfig.json" ||
          file.path === "vite.config.ts" ||
          file.path === "index.html" ||
          file.path === "server.ts" ||
          file.path.startsWith("dist/") ||
          file.path.startsWith("assets/") ||
          file.path.startsWith(".aistudio/")
        ) {
          return;
        }

        allZipFiles.push({
          name: file.path,
          content: file.content
        });
      });

      // 4. Inject specific native app entries (layout files & guides)
      const entryFiles = [
        {
          name: "app/_layout.tsx",
          content: `import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ title: "Subscription", presentation: "modal" }} />
    </Stack>
  );
}`
        },
        {
          name: "app/(tabs)/_layout.tsx",
          content: `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0080FF' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: "Agent",
          tabBarIcon: ({ color }) => <Ionicons name="ribbon-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}`
        }
      ];

      entryFiles.forEach(ef => {
        const idx = allZipFiles.findIndex(f => f.name === ef.name);
        if (idx !== -1) {
          allZipFiles[idx] = ef;
        } else {
          allZipFiles.push(ef);
        }
      });

      // 5. Merge config files
      configFilesMap.forEach((content, name) => {
        const idx = allZipFiles.findIndex(f => f.name === name);
        if (idx !== -1) {
          allZipFiles[idx] = { name, content };
        } else {
          allZipFiles.push({ name, content });
        }
      });

      // 6. Ensure native source files are included (with mapped config/rules/functions)
      NATIVE_FILES.forEach(nativeFile => {
        let pathName = nativeFile.path;
        if (pathName === "firebase/config.ts") {
          pathName = "src/services/firebase.ts";
        }
        
        const idx = allZipFiles.findIndex(f => f.name === pathName);
        if (idx !== -1) {
          allZipFiles[idx] = {
            name: pathName,
            content: nativeFile.code
          };
        } else {
          allZipFiles.push({
            name: pathName,
            content: nativeFile.code
          });
        }
      });

      // Compile and pack the zip
      const zipData = generateZip(allZipFiles);

      // Trigger download
      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'OrbitAI-Full.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting project zip: ", err);
      alert("Failed to compile project ZIP. Please try again.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleHardReset = () => {
    if (confirm("Are you sure you want to clear all simulated database memory? All user activities and rewards will be reset to default presets.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* GLOBAL HEADER BAR */}
      <header className="hidden md:flex border-b border-slate-200 bg-white px-6 py-4 flex-wrap justify-between items-center gap-4 shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center border border-blue-400">
            <Compass className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Orbit AI <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-mono">Mobile V1</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">South Africa's Premium Virtual Partner: React Native &amp; Cloud Sync Suite</p>
          </div>
        </div>

        {/* Tab switcher buttons & download pack */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab("simulator")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 ${activeTab === 'simulator' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50' : 'text-slate-450 hover:text-slate-900'}`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile Companion</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${activeTab === 'admin' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50' : 'text-slate-450 hover:text-slate-900'}`}
            >
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Admin Panel</span>
            </button>
          </div>

          <a 
            href="/download-project-zip"
            download="orbit-ai-project.zip"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-2xs border border-blue-500 transition-all active:scale-95 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Project ZIP</span>
          </a>
        </div>
      </header>

      {/* VIEWPORT AREA AND CONTROLLER ROUTING */}
      <main className="flex-1">

        {/* 1. PORTRAIT COMPANION VIEPORT */}
        {activeTab === "simulator" && (
          <div className="min-h-[100dvh] md:min-h-[calc(100vh-80px)] w-full flex bg-slate-100 justify-center items-center md:py-8 md:px-4 p-0 animate-fade-in">
            {/* 
              No Phone Mockups! No bezels or external borders.
              The application itself occupies the simulated native screen elegantly, adjusting beautifully to different widths.
              Fits portrait format on desktop, and goes full screen on mobile devices!
            */}
            <div 
              className="w-full h-[100dvh] md:h-[780px] md:aspect-[9/19] md:max-w-[420px] bg-white shadow-2xl rounded-none md:rounded-[42px] border-0 md:border-8 border-slate-900 overflow-hidden relative flex flex-col fixed inset-0 md:relative z-40"
              style={
                isMobileLayout 
                  ? { 
                      height: typeof viewportHeight === 'number' ? `${viewportHeight}px` : viewportHeight,
                      top: `${offsetTop}px`,
                      bottom: 'auto'
                    } 
                  : {}
              }
            >
              <AppNavigator />
            </div>
          </div>
        )}

        {/* 2. CLOUD ADMIN WORKING SHEET */}
        {activeTab === "admin" && (
          <div className="animate-fade-in">
            <AdminDashboardScreen />
          </div>
        )}

      </main>

      {/* FOOTER METRICS AND CONSOLE HARD RESET */}
      <footer className="hidden md:block border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400 mt-20 space-y-4">
        <p className="font-medium">&copy; 2026 Orbit AI - Compact Mobile AI Companion. Powered by OpenAI.</p>
        <p className="text-[11px] text-slate-350">Designed by Ndamulelo Makushu using premium React Native and Firebase modular components.</p>
        
        <div className="pt-2">
          <button 
            onClick={handleHardReset}
            className="text-xs font-mono font-bold text-red-500 hover:text-red-700 flex items-center justify-center gap-1.5 mx-auto hover:underline cursor-pointer border border-transparent hover:border-red-100 px-3.5 py-1.5 rounded-full"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
            <span>Hard Reset Database Memory</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
