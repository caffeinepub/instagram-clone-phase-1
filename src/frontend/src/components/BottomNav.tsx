import { Clapperboard, Home, PlusSquare, Search, User } from "lucide-react";
import { motion } from "motion/react";
import type { TabName } from "../App";

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const tabs: {
  id: TabName;
  icon: React.ElementType;
  label: string;
}[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "search", icon: Search, label: "Search" },
  { id: "create", icon: PlusSquare, label: "Create" },
  { id: "reels", icon: Clapperboard, label: "Reels" },
  { id: "profile", icon: User, label: "Profile" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      data-ocid="bottom_nav.panel"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full flex items-center justify-around px-2 py-2 z-50"
      style={{
        maxWidth: 480,
        background: "oklch(0.13 0.005 250)",
        borderTop: "1px solid oklch(0.27 0.01 250)",
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-ocid={`bottom_nav.${tab.id}.tab`}
            className="relative flex flex-col items-center justify-center flex-1 py-1 transition-all"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
          >
            <motion.div whileTap={{ scale: 0.85 }} className="relative">
              <Icon
                size={26}
                strokeWidth={isActive ? 2.2 : 1.6}
                style={{
                  color: isActive ? "#F2F4F7" : "#A8B0BA",
                  fill: isActive && tab.id === "home" ? "#F2F4F7" : "none",
                }}
              />
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}
