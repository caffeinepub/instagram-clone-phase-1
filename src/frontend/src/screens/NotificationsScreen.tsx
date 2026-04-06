import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActor } from "../hooks/useActor";
import type {
  FullBackendInterface,
  Notification,
  NotificationType,
} from "../types/backend";

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

interface MockNotification {
  id: number;
  type: "like" | "follow" | "comment" | "mention";
  username: string;
  text: string;
  time: string;
  timeGroup: "today" | "week" | "earlier";
  read: boolean;
  postThumb?: string;
}

const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 1,
    type: "like",
    username: "sofia.travels",
    text: "liked your photo",
    time: "2m",
    timeGroup: "today",
    read: false,
    postThumb: "https://picsum.photos/seed/thumb1/60/60",
  },
  {
    id: 2,
    type: "follow",
    username: "kai.eats",
    text: "started following you",
    time: "15m",
    timeGroup: "today",
    read: false,
  },
  {
    id: 3,
    type: "comment",
    username: "nora.creates",
    text: 'commented: "Absolutely gorgeous! 😍"',
    time: "1h",
    timeGroup: "today",
    read: false,
    postThumb: "https://picsum.photos/seed/thumb2/60/60",
  },
  {
    id: 4,
    type: "mention",
    username: "leo.lens",
    text: "mentioned you in a comment",
    time: "3h",
    timeGroup: "today",
    read: true,
    postThumb: "https://picsum.photos/seed/thumb3/60/60",
  },
  {
    id: 5,
    type: "like",
    username: "mia.wellness",
    text: "liked your photo",
    time: "5h",
    timeGroup: "today",
    read: true,
    postThumb: "https://picsum.photos/seed/thumb4/60/60",
  },
  {
    id: 6,
    type: "follow",
    username: "jake.builds",
    text: "started following you",
    time: "1d",
    timeGroup: "week",
    read: true,
  },
  {
    id: 7,
    type: "comment",
    username: "zara.art",
    text: 'commented: "This is incredible work!"',
    time: "2d",
    timeGroup: "week",
    read: true,
    postThumb: "https://picsum.photos/seed/thumb5/60/60",
  },
  {
    id: 8,
    type: "like",
    username: "tom.photo",
    text: "liked your reel",
    time: "3d",
    timeGroup: "week",
    read: true,
    postThumb: "https://picsum.photos/seed/thumb6/60/60",
  },
  {
    id: 9,
    type: "follow",
    username: "luna.style",
    text: "started following you",
    time: "1w",
    timeGroup: "earlier",
    read: true,
  },
  {
    id: 10,
    type: "mention",
    username: "alex.dev",
    text: "mentioned you in their story",
    time: "2w",
    timeGroup: "earlier",
    read: true,
  },
];

function notifIcon(type: MockNotification["type"]) {
  switch (type) {
    case "like":
      return { icon: Heart, color: "#FF2D95", bg: "#FF2D9522" };
    case "follow":
      return { icon: UserPlus, color: "#2F80FF", bg: "#2F80FF22" };
    case "comment":
      return { icon: MessageCircle, color: "#A8B0BA", bg: "#A8B0BA22" };
    case "mention":
      return { icon: AtSign, color: "#7B2FFF", bg: "#7B2FFF22" };
  }
}

function formatBackendNotif(n: Notification): MockNotification {
  const typeMap: Record<string, MockNotification["type"]> = {
    like: "like",
    follow: "follow",
    comment: "comment",
    mention: "mention",
  };
  const type = typeMap[n.notificationType as unknown as string] || "like";
  return {
    id: Number(n.id),
    type,
    username: n.from.toString().slice(0, 12),
    text:
      n.text ||
      (type === "like"
        ? "liked your photo"
        : type === "follow"
          ? "started following you"
          : "interacted with you"),
    time: formatRelativeTime(Number(n.timestamp)),
    timeGroup: getTimeGroup(Number(n.timestamp)),
    read: n.read,
  };
}

function formatRelativeTime(tsNanos: number): string {
  const diffMs = Date.now() - tsNanos / 1e6;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return `${Math.floor(diffD / 7)}w`;
}

function getTimeGroup(tsNanos: number): "today" | "week" | "earlier" {
  const diffMs = Date.now() - tsNanos / 1e6;
  const diffH = diffMs / 3600000;
  if (diffH < 24) return "today";
  if (diffH < 168) return "week";
  return "earlier";
}

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  week: "This Week",
  earlier: "Earlier",
};

export default function NotificationsScreen() {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const queryClient = useQueryClient();

  const { data: backendNotifs = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) return;
      await actor.markNotificationRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications: MockNotification[] =
    backendNotifs.length > 0
      ? backendNotifs.map(formatBackendNotif)
      : MOCK_NOTIFICATIONS;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const grouped = notifications.reduce(
    (acc, n) => {
      if (!acc[n.timeGroup]) acc[n.timeGroup] = [];
      acc[n.timeGroup].push(n);
      return acc;
    },
    {} as Record<string, MockNotification[]>,
  );

  const groupOrder: Array<"today" | "week" | "earlier"> = [
    "today",
    "week",
    "earlier",
  ];

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
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold" style={{ color: "#F2F4F7" }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
              style={{ background: "#FF3B5C" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          data-ocid="notifications.primary_button"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "oklch(0.22 0.008 250)",
            color: "#A8B0BA",
          }}
          onClick={() => {
            // mark all read (mock)
          }}
          aria-label="Mark all as read"
        >
          <CheckCheck size={14} />
          <span>All read</span>
        </button>
      </header>

      {/* Notification list */}
      <div>
        {groupOrder.map((group) => {
          const items = grouped[group];
          if (!items || items.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-4 pt-4 pb-1" style={{ color: "#A8B0BA" }}>
                <span className="text-xs font-bold tracking-wider uppercase">
                  {GROUP_LABELS[group]}
                </span>
              </div>
              <AnimatePresence>
                {items.map((notif, idx) => {
                  const { icon: Icon, color, bg } = notifIcon(notif.type);
                  const avatarColor = getAvatarColor(notif.username);
                  const globalIdx =
                    MOCK_NOTIFICATIONS.findIndex((n) => n.id === notif.id) + 1;
                  return (
                    <motion.div
                      key={notif.id}
                      data-ocid={`notifications.item.${globalIdx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        background: notif.read
                          ? "transparent"
                          : "oklch(0.155 0.007 250)",
                        borderBottom: "1px solid oklch(0.175 0.008 250)",
                      }}
                      onClick={() => {
                        if (!notif.read && backendNotifs.length > 0) {
                          markReadMutation.mutate(BigInt(notif.id));
                        }
                      }}
                    >
                      {/* Avatar + type icon */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ background: avatarColor }}
                        >
                          {notif.username.slice(0, 1).toUpperCase()}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background: bg,
                            border: "2px solid oklch(0.13 0.005 250)",
                          }}
                        >
                          <Icon
                            size={11}
                            color={color}
                            fill={notif.type === "like" ? color : "none"}
                          />
                        </span>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm leading-snug"
                          style={{ color: "#F2F4F7" }}
                        >
                          <span
                            className="font-semibold"
                            style={{
                              color: notif.read ? "#A8B0BA" : "#F2F4F7",
                            }}
                          >
                            {notif.username}
                          </span>{" "}
                          <span style={{ color: "#A8B0BA" }}>{notif.text}</span>
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "oklch(0.45 0.01 250)" }}
                        >
                          {notif.time}
                        </p>
                      </div>

                      {/* Post thumbnail or unread dot */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {notif.postThumb ? (
                          <img
                            src={notif.postThumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                            style={{
                              border: "1px solid oklch(0.27 0.01 250)",
                            }}
                          />
                        ) : null}
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: "#2F80FF" }}
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <div
          data-ocid="notifications.empty_state"
          className="flex flex-col items-center justify-center py-20"
        >
          <Bell
            size={48}
            style={{ color: "oklch(0.27 0.01 250)" }}
            className="mb-4"
          />
          <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
            No notifications yet
          </p>
          <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
            When someone interacts with you, it'll show here.
          </p>
        </div>
      )}
    </div>
  );
}
