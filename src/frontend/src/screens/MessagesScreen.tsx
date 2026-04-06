import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Phone,
  Search,
  Send,
  UserPlus,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type {
  ConversationPreview,
  FullBackendInterface,
  Message,
  Profile,
} from "../types/backend";

// ─── Colour helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#FF2D95",
  "#FF6A00",
  "#2F80FF",
  "#7B2FFF",
  "#00C896",
  "#FFC700",
  "#FF3B5C",
  "#00B4D8",
];
function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(ts: Date | bigint): string {
  const date = typeof ts === "bigint" ? new Date(Number(ts) / 1e6) : ts;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ─── Live conversation type ────────────────────────────────────────────────────
interface LiveConversation {
  principal: Principal;
  username: string;
  avatarColor: string;
  online: boolean;
  lastMessage?: string;
  lastTs?: bigint;
}

// ─── Chat Thread ───────────────────────────────────────────────────────────────
interface ChatThreadProps {
  conversation: LiveConversation;
  onBack: () => void;
}

function ChatThread({ conversation, onBack }: ChatThreadProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const myPrincipal = identity?.getPrincipal().toString();

  const convKey = conversation.principal.toString();

  // Poll messages every 5 s
  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["messages", convKey],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessagesWithUser(conversation.principal);
    },
    enabled: !!actor,
    staleTime: 3_000,
    refetchInterval: 5_000,
  });

  // Auto-scroll to bottom when messages change (no deps needed - ref access only)
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }); // intentionally no deps array - runs after every render to scroll new messages

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.sendMessage(conversation.principal, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", convKey] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err) => {
      console.error("sendMessage failed:", err);
      toast.error("Failed to send message.");
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    setText("");
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-3 h-14 flex-shrink-0"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        <button
          type="button"
          data-ocid="messages.back.button"
          onClick={onBack}
          className="p-1"
          aria-label="Back"
        >
          <ArrowLeft size={22} style={{ color: "#F2F4F7" }} />
        </button>
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ background: conversation.avatarColor }}
        >
          {conversation.username.slice(0, 1).toUpperCase()}
          {conversation.online && (
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
              style={{
                background: "#00C896",
                border: "2px solid oklch(0.13 0.005 250)",
              }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: "#F2F4F7" }}
          >
            {conversation.username}
          </p>
          <p className="text-[11px]" style={{ color: "#A8B0BA" }}>
            {conversation.online ? "Active now" : "Offline"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full"
            aria-label="Voice call"
          >
            <Phone size={20} style={{ color: "#F2F4F7" }} />
          </button>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full"
            aria-label="Video call"
          >
            <Video size={20} style={{ color: "#F2F4F7" }} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ background: "oklch(0.13 0.005 250)" }}
      >
        {msgsLoading ? (
          <div data-ocid="messages.loading_state" className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <Skeleton
                  className="h-9 rounded-2xl"
                  style={{
                    width: `${100 + i * 40}px`,
                    background: "oklch(0.22 0.008 250)",
                  }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            data-ocid="messages.empty_state"
            className="flex flex-col items-center justify-center h-full py-16"
          >
            <MessageCircle size={48} style={{ color: "#A8B0BA" }} />
            <p
              className="mt-3 text-sm font-semibold"
              style={{ color: "#F2F4F7" }}
            >
              No messages yet
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
              Say hello to {conversation.username}!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const fromMe = msg.sender.toString() === myPrincipal;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showTime =
              !prevMsg ||
              Number(msg.timestamp) / 1e6 - Number(prevMsg.timestamp) / 1e6 >
                5 * 60_000;
            return (
              <div key={String(msg.id)}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span
                      className="text-[11px] px-3 py-1 rounded-full"
                      style={{
                        color: "#A8B0BA",
                        background: "oklch(0.175 0.008 250)",
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      background: fromMe ? "#2F80FF" : "oklch(0.22 0.008 250)",
                      color: "#F2F4F7",
                      borderBottomRightRadius: fromMe ? 4 : undefined,
                      borderBottomLeftRadius: !fromMe ? 4 : undefined,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderTop: "1px solid oklch(0.27 0.01 250)",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Input
          data-ocid="messages.input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full text-sm"
          style={{
            background: "oklch(0.175 0.008 250)",
            border: "1px solid oklch(0.27 0.01 250)",
            color: "#F2F4F7",
            fontSize: 16,
            height: 40,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          data-ocid="messages.submit_button"
          size="icon"
          className="rounded-full flex-shrink-0 w-10 h-10"
          style={{
            background: text.trim() ? "#2F80FF" : "oklch(0.22 0.008 250)",
            transition: "background 0.2s",
          }}
          disabled={!text.trim() || sendMutation.isPending}
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send size={16} color="white" />
        </Button>
      </div>
    </div>
  );
}

// ─── New Conversation Sheet ─────────────────────────────────────────────────────
interface NewConvSheetProps {
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  myPrincipal?: string;
  onSelect: (profile: Profile) => void;
}

function NewConvSheet({
  open,
  onClose,
  profiles,
  myPrincipal,
  onSelect,
}: NewConvSheetProps) {
  const [search, setSearch] = useState("");
  const filtered = profiles.filter(
    (p) =>
      p.owner.toString() !== myPrincipal &&
      (search === "" ||
        p.username.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl"
        style={{
          background: "oklch(0.13 0.005 250)",
          border: "1px solid oklch(0.27 0.01 250)",
          maxHeight: "80dvh",
          overflowY: "auto",
        }}
      >
        <SheetHeader className="mb-3">
          <SheetTitle style={{ color: "#F2F4F7" }}>New Message</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 rounded-xl h-10 mb-4"
          style={{ background: "oklch(0.175 0.008 250)" }}
        >
          <Search size={16} style={{ color: "#A8B0BA" }} />
          <input
            data-ocid="messages.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#F2F4F7" }}
          />
        </div>

        {/* User list */}
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 flex flex-col items-center">
              <UserPlus size={32} style={{ color: "#A8B0BA" }} />
              <p className="mt-2 text-sm" style={{ color: "#A8B0BA" }}>
                {search ? "No users found" : "No other users yet"}
              </p>
            </div>
          ) : (
            filtered.map((profile, idx) => {
              const color = getAvatarColor(profile.username);
              return (
                <button
                  key={profile.owner.toString()}
                  type="button"
                  data-ocid={`messages.item.${idx + 1}`}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left"
                  style={{ background: "transparent" }}
                  onClick={() => {
                    onSelect(profile);
                    onClose();
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ background: color }}
                  >
                    {profile.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "#F2F4F7" }}
                    >
                      {profile.username}
                    </p>
                    {profile.bio && (
                      <p
                        className="text-xs truncate"
                        style={{ color: "#A8B0BA" }}
                      >
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── MessagesScreen ─────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const [selectedConv, setSelectedConv] = useState<LiveConversation | null>(
    null,
  );
  const [newConvOpen, setNewConvOpen] = useState(false);

  // Fetch conversations (polled every 10s)
  const { data: conversations = [] } = useQuery<ConversationPreview[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Fetch all profiles for Principal → username mapping
  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProfiles();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });

  // Build a principal → profile map
  const profileMap = new Map<string, Profile>();
  for (const p of profiles) {
    profileMap.set(p.owner.toString(), p);
  }

  // Map raw ConversationPreview → LiveConversation
  const liveConversations: LiveConversation[] = conversations.map((c) => {
    const principalStr = c.user.toString();
    const profile = profileMap.get(principalStr);
    const username = profile?.username || `${principalStr.slice(0, 8)}...`;
    return {
      principal: c.user,
      username,
      avatarColor: getAvatarColor(username),
      online: false,
      lastMessage: c.lastMessage?.content,
      lastTs: c.lastMessage?.timestamp,
    };
  });

  const handleSelectFromNew = (profile: Profile) => {
    const username = profile.username;
    setSelectedConv({
      principal: profile.owner,
      username,
      avatarColor: getAvatarColor(username),
      online: false,
    });
  };

  if (selectedConv) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedConv.principal.toString()}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
        >
          <ChatThread
            conversation={selectedConv}
            onBack={() => setSelectedConv(null)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "#F2F4F7" }}>
          Messages
        </h1>
        <button
          type="button"
          data-ocid="messages.open_modal_button"
          className="p-1"
          aria-label="New message"
          onClick={() => setNewConvOpen(true)}
        >
          <Edit size={22} style={{ color: "#F2F4F7" }} />
        </button>
      </header>

      {/* Search bar (static UI) */}
      <div
        className="px-4 py-2"
        style={{ borderBottom: "1px solid oklch(0.22 0.008 250)" }}
      >
        <div
          className="flex items-center gap-2 px-3 rounded-xl h-9"
          style={{ background: "oklch(0.175 0.008 250)" }}
        >
          <Search size={14} style={{ color: "#A8B0BA" }} />
          <span className="text-sm" style={{ color: "#A8B0BA" }}>
            Search messages...
          </span>
        </div>
      </div>

      {/* Conversation list */}
      <div data-ocid="messages.list" className="flex-1">
        {liveConversations.length === 0 ? (
          <div
            data-ocid="messages.empty_state"
            className="flex flex-col items-center justify-center py-20"
          >
            <MessageCircle size={48} style={{ color: "#A8B0BA" }} />
            <p
              className="mt-3 text-base font-semibold"
              style={{ color: "#F2F4F7" }}
            >
              No messages yet
            </p>
            <p className="text-sm mt-1" style={{ color: "#A8B0BA" }}>
              Start a conversation with someone
            </p>
            <button
              type="button"
              data-ocid="messages.primary_button"
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: "#2F80FF", color: "white" }}
              onClick={() => setNewConvOpen(true)}
            >
              <UserPlus size={16} />
              New Message
            </button>
          </div>
        ) : (
          liveConversations.map((conv, idx) => (
            <motion.button
              key={conv.principal.toString()}
              type="button"
              data-ocid={`messages.item.${idx + 1}`}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{
                background: "transparent",
                borderBottom: "1px solid oklch(0.175 0.008 250)",
              }}
              onClick={() => setSelectedConv(conv)}
              whileTap={{ backgroundColor: "oklch(0.22 0.008 250)" }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: conv.avatarColor }}
                >
                  {conv.username.slice(0, 1).toUpperCase()}
                </div>
                {conv.online && (
                  <span
                    className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full"
                    style={{
                      background: "#00C896",
                      border: "2px solid oklch(0.13 0.005 250)",
                    }}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "#F2F4F7" }}
                  >
                    {conv.username}
                  </span>
                  {conv.lastTs && (
                    <span className="text-xs" style={{ color: "#A8B0BA" }}>
                      {formatTime(conv.lastTs)}
                    </span>
                  )}
                </div>
                <p className="text-sm truncate" style={{ color: "#A8B0BA" }}>
                  {conv.lastMessage || "Start a conversation"}
                </p>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* New conversation sheet */}
      <NewConvSheet
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        profiles={profiles}
        myPrincipal={myPrincipal}
        onSelect={handleSelectFromNew}
      />
    </div>
  );
}
