import React from 'react';
import { Bot, CheckSquare, Building2, ShoppingBag, User } from 'lucide-react';
import { useAppState } from '../services/state';

interface BottomNavProps {
  id?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ id }) => {
  const { mobileScreen, setMobileScreen } = useAppState();

  const tabs = [
    { id: 'chat', label: 'Orbit AI', Icon: Bot },
    { id: 'task-mode', label: 'Tasks', Icon: CheckSquare },
    { id: 'business-mode', label: 'Business', Icon: Building2 },
    { id: 'market', label: 'Market', Icon: ShoppingBag },
    { id: 'profile', label: 'Profile', Icon: User },
  ];

  return (
    <nav 
      id={id || "orbit_bottom_nav"}
      className="bg-white/95 backdrop-blur-md border-t border-slate-200 fixed md:absolute bottom-0 left-0 right-0 z-30 flex items-center justify-around py-1.5 pb-2 shadow-xs select-none max-w-lg mx-auto pointer-events-auto"
    >
      {tabs.map((tab) => {
        const isActive = mobileScreen === tab.id || 
          (tab.id === 'chat' && mobileScreen === 'home') ||
          (tab.id === 'market' && (
            mobileScreen === 'market-home' || 
            mobileScreen === 'market-checkout' || 
            mobileScreen === 'market-orders' || 
            mobileScreen === 'market-seller'
          ));
        const IconComponent = tab.Icon;

        return (
          <button
            key={tab.id}
            id={`bottom_nav_tab_${tab.id}`}
            onClick={() => setMobileScreen(tab.id)}
            className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition active:scale-95 text-slate-400 group relative"
          >
            <div className={`p-1 rounded-xl transition-all duration-150 relative ${
              isActive 
                ? 'text-blue-600' 
                : 'text-slate-400 group-hover:text-slate-700'
            }`}>
              <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 font-bold tracking-tight select-none ${
              isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
