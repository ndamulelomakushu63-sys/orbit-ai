import React from 'react';
import { useAppState } from '../services/state';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeChatScreen } from '../screens/HomeChatScreen';
import { ChatHistoryScreen } from '../screens/ChatHistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { WithdrawScreen } from '../screens/WithdrawScreen';
import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';
import { PaymentFailedScreen } from '../screens/PaymentFailedScreen';
import { SideHustleScreen } from '../screens/SideHustleScreen';
import { BusinessBuilderScreen } from '../screens/BusinessBuilderScreen';
import BusinessModeScreen from '../screens/BusinessModeScreen';
import { TaskModeScreen } from '../screens/TaskModeScreen';
import { PremiumLockScreen } from '../components/PremiumLockScreen';

export const AppNavigator: React.FC = () => {
  const { mobileScreen, currentUser } = useAppState();
  const [demoBypass, setDemoBypass] = React.useState(() => {
    return localStorage.getItem("orbit_marketing_bypass") === "true";
  });
  const [showControls, setShowControls] = React.useState(true);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setDemoBypass(localStorage.getItem("orbit_marketing_bypass") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    // Poll storage occasionally to update across tabs or context changes
    const interval = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const subStatus = currentUser?.subscription_status;
  const isPro = subStatus === "pro_monthly" || subStatus === "pro_yearly" || demoBypass;

  const renderScreen = () => {
    switch (mobileScreen) {
      case "splash":
        return <SplashScreen />;
      case "login":
        return <LoginScreen />;
      case "register":
        return <RegisterScreen />;
      case "chat":
        return <HomeChatScreen />;
      case "history":
        return <ChatHistoryScreen />;
      case "profile":
        return <ProfileScreen />;
      case "task-mode":
        if (!isPro) {
          return (
            <PremiumLockScreen 
              title="Premium Feature" 
              description="This feature is available only to Orbit Pro members." 
            />
          );
        }
        return <TaskModeScreen />;
      case "upgrade":
        return <SubscriptionScreen />;
      case "agents":
      case "agent":
        if (!isPro) {
          return (
            <PremiumLockScreen 
              title="Agent Program" 
              description="Upgrade to Orbit Pro to activate Agent Mode and earn referral commissions." 
            />
          );
        }
        return <AgentsScreen />;
      case "settings":
        return <SettingsScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "support":
        return <HelpSupportScreen />;
      case "payments":
        return <PaymentsScreen />;
      case "withdraw":
        return <WithdrawScreen />;
      case "success":
        return <PaymentSuccessScreen />;
      case "failed":
        return <PaymentFailedScreen />;
      case "side-hustle":
        if (!isPro) {
          return (
            <PremiumLockScreen 
              title="Premium Feature" 
              description="This feature is available only to Orbit Pro members." 
            />
          );
        }
        return <SideHustleScreen />;
      case "business-builder":
        if (!isPro) {
          return (
            <PremiumLockScreen 
              title="Premium Feature" 
              description="This feature is available only to Orbit Pro members." 
            />
          );
        }
        return <BusinessBuilderScreen />;
      case "business-mode":
        return <BusinessModeScreen />;
      default:
        return <SplashScreen />;
    }
  };

  return (
    <div className="relative h-full flex flex-col justify-between">
      <div className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </div>

      {demoBypass && (
        <>
          {showControls ? (
            <div className="absolute bottom-20 inset-x-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl flex flex-row items-center justify-between z-[99999] animate-fade-in text-left select-none">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white tracking-wide">Screenshot Preview Mode Active</span>
                  <span className="text-[9px] text-slate-400 font-medium">Bypass enabled & demo content pre-filled</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowControls(false)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer"
                  title="Hide controls to take screenshots"
                >
                  Hide Bar
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("orbit_marketing_bypass");
                    setDemoBypass(false);
                    window.dispatchEvent(new Event("storage"));
                  }}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer"
                >
                  Reactivate Lock
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowControls(true)}
              className="absolute bottom-20 right-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] text-emerald-400 font-bold tracking-wide shadow-lg z-[99999] opacity-40 hover:opacity-100 transition duration-300 cursor-pointer"
            >
              🛠️ Show Marketing Bar
            </button>
          )}
        </>
      )}
    </div>
  );
};
