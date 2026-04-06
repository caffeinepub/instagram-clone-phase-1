import { Heart, MessageCircle, UserPlus } from "lucide-react";

const SAMPLE_ACTIVITIES = [
  {
    id: 1,
    type: "like" as const,
    user: "sofia.travels",
    action: "liked your photo",
    time: "2m",
    color: "#FF2D95",
  },
  {
    id: 2,
    type: "follow" as const,
    user: "kai.eats",
    action: "started following you",
    time: "15m",
    color: "#FF6A00",
  },
  {
    id: 3,
    type: "comment" as const,
    user: "nora.creates",
    action: 'commented: "Absolutely gorgeous!" 😍',
    time: "1h",
    color: "#7B2FFF",
  },
  {
    id: 4,
    type: "like" as const,
    user: "leo.lens",
    action: "liked your photo",
    time: "3h",
    color: "#2F80FF",
  },
  {
    id: 5,
    type: "follow" as const,
    user: "mia.wellness",
    action: "started following you",
    time: "1d",
    color: "#00C896",
  },
  {
    id: 6,
    type: "comment" as const,
    user: "jake.builds",
    action: 'commented: "This is incredible work!"',
    time: "2d",
    color: "#FFC700",
  },
];

const iconForType = (type: "like" | "follow" | "comment") => {
  switch (type) {
    case "like":
      return <Heart size={14} fill="#FF3B5C" color="#FF3B5C" />;
    case "follow":
      return <UserPlus size={14} color="#2F80FF" />;
    case "comment":
      return <MessageCircle size={14} color="#A8B0BA" />;
  }
};

export default function ActivityScreen() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center px-4 h-14"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "#F2F4F7" }}>
          Activity
        </h1>
      </header>

      <div className="px-4 pt-4">
        <p className="text-xs font-semibold mb-3" style={{ color: "#A8B0BA" }}>
          THIS WEEK
        </p>
        <div data-ocid="activity.list" className="space-y-0">
          {SAMPLE_ACTIVITIES.map((activity, idx) => (
            <div
              key={activity.id}
              data-ocid={`activity.item.${idx + 1}`}
              className="flex items-center gap-3 py-3"
              style={{
                borderBottom:
                  idx < SAMPLE_ACTIVITIES.length - 1
                    ? "1px solid oklch(0.22 0.008 250)"
                    : "none",
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0 relative"
                style={{ background: activity.color }}
              >
                {activity.user.slice(0, 1).toUpperCase()}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "oklch(0.175 0.008 250)",
                    border: "2px solid oklch(0.13 0.005 250)",
                  }}
                >
                  {iconForType(activity.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "#F2F4F7" }}>
                  <span className="font-semibold">{activity.user}</span>{" "}
                  <span style={{ color: "#A8B0BA" }}>{activity.action}</span>
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "oklch(0.45 0.01 250)" }}
                >
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
