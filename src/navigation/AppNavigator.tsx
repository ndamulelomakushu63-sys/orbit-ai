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
import { BusinessModeScreen } from '../screens/BusinessModeScreen';
import { PremiumLockScreen } from '../components/PremiumLockScreen';

export const AppNavigator: React.FC = () => {
  const { mobileScreen, currentUser } = useAppState();

  const subStatus = currentUser?.subscription_status;
  const isPro = subStatus === "pro_monthly" || subStatus === "pro_yearly";

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
    case "business":
      return <BusinessModeScreen />;
    default:
      return <SplashScreen />;
  }
};
