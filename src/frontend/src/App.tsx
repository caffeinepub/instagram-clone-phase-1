import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AuthGate from "./components/AuthGate";
import BottomNav from "./components/BottomNav";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import CreateScreen from "./screens/CreateScreen";
import HomeScreen from "./screens/HomeScreen";
import MessagesScreen from "./screens/MessagesScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ReelsScreen from "./screens/ReelsScreen";
import SearchScreen from "./screens/SearchScreen";
import SettingsScreen from "./screens/SettingsScreen";

export type TabName =
  | "home"
  | "search"
  | "create"
  | "reels"
  | "profile"
  | "messages"
  | "notifications"
  | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("home");
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B0D10" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FF2D95, #FF6A00, #FFC700)",
            }}
          >
            <span className="text-white font-bold text-xl">I</span>
          </div>
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <>
        <AuthGate />
        <Toaster />
      </>
    );
  }

  /** True when the bottom nav should be hidden (overlay screens) */
  const hideNav = activeTab === "messages" || activeTab === "settings";

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onNavigate={setActiveTab} />;
      case "search":
        return <SearchScreen />;
      case "create":
        return <CreateScreen onPostCreated={() => setActiveTab("home")} />;
      case "reels":
        return <ReelsScreen />;
      case "profile":
        return <ProfileScreen onNavigate={setActiveTab} />;
      case "messages":
        return <MessagesScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "settings":
        return <SettingsScreen onBack={() => setActiveTab("profile")} />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <div
      className="flex justify-center min-h-screen"
      style={{ background: "#060708" }}
    >
      <div
        className="relative flex flex-col w-full"
        style={{ maxWidth: 480, background: "oklch(0.13 0.005 250)" }}
      >
        <main className={`flex-1 overflow-y-auto ${hideNav ? "" : "pb-20"}`}>
          {renderScreen()}
        </main>
        {!hideNav && (
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        <Toaster />
      </div>
    </div>
  );
}
