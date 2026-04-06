import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Archive,
  Bell,
  Bookmark,
  ChevronRight,
  Download,
  Fingerprint,
  Flag,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  Trash2,
  UserCircle,
  UserMinus,
  UserX,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface ToggleSetting {
  kind: "toggle";
  id: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  defaultOn?: boolean;
}

interface NavSetting {
  kind: "nav";
  id: string;
  icon: React.ElementType;
  label: string;
  value?: string;
}

type SettingItem = ToggleSetting | NavSetting;

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Account",
    items: [
      {
        kind: "nav",
        id: "edit_profile",
        icon: UserCircle,
        label: "Edit profile",
      },
      {
        kind: "nav",
        id: "username",
        icon: UserCircle,
        label: "Change username",
      },
      {
        kind: "toggle",
        id: "private_account",
        icon: Lock,
        label: "Private account",
        description: "Only your followers can see your posts",
        defaultOn: false,
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        kind: "toggle",
        id: "push_notifs",
        icon: Bell,
        label: "Push notifications",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "like_notifs",
        icon: Bell,
        label: "Like notifications",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "follow_notifs",
        icon: Bell,
        label: "Follow notifications",
        defaultOn: true,
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        kind: "nav",
        id: "2fa",
        icon: Fingerprint,
        label: "Two-factor authentication",
        value: "Off",
      },
      { kind: "nav", id: "sessions", icon: Monitor, label: "Active sessions" },
      { kind: "nav", id: "linked", icon: Users, label: "Linked accounts" },
    ],
  },
  {
    title: "Content",
    items: [
      { kind: "nav", id: "saved", icon: Bookmark, label: "Saved posts" },
      { kind: "nav", id: "archived", icon: Archive, label: "Archived posts" },
      { kind: "nav", id: "close_friends", icon: Users, label: "Close friends" },
    ],
  },
  {
    title: "Support",
    items: [
      { kind: "nav", id: "help", icon: HelpCircle, label: "Help center" },
      { kind: "nav", id: "report", icon: Flag, label: "Report a problem" },
      {
        kind: "nav",
        id: "privacy_policy",
        icon: Lock,
        label: "Privacy policy",
      },
      { kind: "nav", id: "terms", icon: Lock, label: "Terms of service" },
    ],
  },
  {
    title: "Danger Zone",
    items: [
      {
        kind: "nav",
        id: "download_data",
        icon: Download,
        label: "Download your data",
      },
      {
        kind: "nav",
        id: "disable",
        icon: UserMinus,
        label: "Temporarily disable account",
        value: "",
      },
    ],
  },
];

function ToggleItem({ item }: { item: ToggleSetting }) {
  const [enabled, setEnabled] = useState(item.defaultOn ?? false);
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "oklch(0.22 0.008 250)" }}
      >
        <Icon size={16} style={{ color: "#A8B0BA" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "#F2F4F7" }}>
          {item.label}
        </p>
        {item.description && (
          <p className="text-xs mt-0.5" style={{ color: "#A8B0BA" }}>
            {item.description}
          </p>
        )}
      </div>
      <Switch
        data-ocid={`settings.${item.id}.switch`}
        checked={enabled}
        onCheckedChange={setEnabled}
        className="flex-shrink-0"
      />
    </div>
  );
}

function NavItem({ item }: { item: NavSetting }) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      data-ocid={`settings.${item.id}.button`}
      whileTap={{ backgroundColor: "oklch(0.175 0.008 250)" }}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      onClick={() => toast.info("Coming soon!")}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "oklch(0.22 0.008 250)" }}
      >
        <Icon size={16} style={{ color: "#A8B0BA" }} />
      </div>
      <span className="flex-1 text-sm font-medium" style={{ color: "#F2F4F7" }}>
        {item.label}
      </span>
      {item.value !== undefined && (
        <span className="text-xs mr-1" style={{ color: "#A8B0BA" }}>
          {item.value}
        </span>
      )}
      <ChevronRight size={16} style={{ color: "oklch(0.45 0.01 250)" }} />
    </motion.button>
  );
}

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { clear } = useInternetIdentity();

  const handleLogout = () => {
    clear();
    toast.success("Logged out successfully");
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        <button
          type="button"
          data-ocid="settings.back.button"
          onClick={onBack}
          className="p-1"
          aria-label="Back"
        >
          <ChevronRight
            size={22}
            style={{ color: "#F2F4F7", transform: "rotate(180deg)" }}
          />
        </button>
        <h1 className="text-base font-bold" style={{ color: "#F2F4F7" }}>
          Settings
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-10">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="mt-4">
            {/* Section header */}
            <div className="px-4 pb-1.5">
              <span
                className="text-xs font-bold tracking-wider uppercase"
                style={{ color: "#A8B0BA" }}
              >
                {section.title}
              </span>
            </div>

            {/* Section items */}
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.175 0.008 250)",
                border: "1px solid oklch(0.27 0.01 250)",
              }}
            >
              {section.items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    borderBottom:
                      idx < section.items.length - 1
                        ? "1px solid oklch(0.22 0.008 250)"
                        : "none",
                  }}
                >
                  {item.kind === "toggle" ? (
                    <ToggleItem item={item} />
                  ) : (
                    <NavItem item={item} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Delete account */}
        <div className="mt-4">
          <div className="px-4 pb-1.5">
            <span
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: "#A8B0BA" }}
            >
              Account Actions
            </span>
          </div>
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
            }}
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.button
                  type="button"
                  data-ocid="settings.delete.open_modal_button"
                  whileTap={{ backgroundColor: "oklch(0.175 0.008 250)" }}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                  style={{
                    borderBottom: "1px solid oklch(0.22 0.008 250)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#FF2D9522" }}
                  >
                    <UserX size={16} style={{ color: "#FF2D95" }} />
                  </div>
                  <span
                    className="flex-1 text-sm font-medium text-left"
                    style={{ color: "#FF2D95" }}
                  >
                    Delete account
                  </span>
                  <ChevronRight
                    size={16}
                    style={{ color: "oklch(0.45 0.01 250)" }}
                  />
                </motion.button>
              </AlertDialogTrigger>
              <AlertDialogContent
                style={{
                  background: "oklch(0.175 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ color: "#F2F4F7" }}>
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription style={{ color: "#A8B0BA" }}>
                    This action is permanent and cannot be undone. All your
                    posts, followers, and data will be deleted forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="settings.delete.cancel_button"
                    style={{
                      background: "oklch(0.22 0.008 250)",
                      border: "1px solid oklch(0.27 0.01 250)",
                      color: "#F2F4F7",
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="settings.delete.confirm_button"
                    style={{ background: "#FF2D95", color: "white" }}
                    onClick={() => toast.error("Account deletion coming soon")}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Log out */}
        <div className="px-4 mt-6 mb-8">
          <motion.button
            type="button"
            data-ocid="settings.logout.button"
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
              color: "#FF3B5C",
            }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Log out
          </motion.button>
        </div>
      </div>
    </div>
  );
}
