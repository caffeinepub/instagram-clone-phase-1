import { Plus } from "lucide-react";
import { useRef } from "react";
import type { StoryView } from "../types/backend";
import { resolveBlobUrl } from "../utils/blobUrl";

interface StoriesRowProps {
  stories: StoryView[];
  myUsername?: string;
  storageGatewayUrl?: string;
  backendCanisterId?: string;
  projectId?: string;
  onStoryClick?: (story: StoryView, index: number) => void;
  onAddStory?: () => void;
}

const SAMPLE_STORIES = [
  { id: BigInt(1), username: "sofia.m", color: "#FF2D95" },
  { id: BigInt(2), username: "kai.lens", color: "#FF6A00" },
  { id: BigInt(3), username: "nora.art", color: "#7B2FFF" },
  { id: BigInt(4), username: "leo.photo", color: "#2F80FF" },
  { id: BigInt(5), username: "mia.vibes", color: "#00C896" },
];

function getInitials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

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

export default function StoriesRow({
  stories,
  myUsername,
  storageGatewayUrl = "",
  backendCanisterId = "",
  projectId = "",
  onStoryClick,
  onAddStory,
}: StoriesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasRealStories = stories.length > 0;

  return (
    <div
      ref={scrollRef}
      data-ocid="stories.panel"
      className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {/* Your Story */}
      <button
        type="button"
        data-ocid="stories.open_modal_button"
        className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none"
        style={{ scrollSnapAlign: "start" }}
        onClick={onAddStory}
        aria-label="Add your story"
      >
        <div className="relative">
          <div
            className="w-[62px] h-[62px] rounded-full flex items-center justify-center text-white font-semibold text-lg"
            style={{ background: "#1A1F24", border: "2px solid #2A3139" }}
          >
            {myUsername ? getInitials(myUsername) : "Y"}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#2F80FF", border: "2px solid #0B0D10" }}
          >
            <Plus size={11} color="white" strokeWidth={3} />
          </div>
        </div>
        <span
          className="text-[11px] font-medium truncate w-16 text-center"
          style={{ color: "#A8B0BA" }}
        >
          Your story
        </span>
      </button>

      {/* Real or Sample stories */}
      {hasRealStories
        ? stories.map((story, idx) => {
            const username =
              story.authorUsername || story.author.toString().slice(0, 8);
            const color = getAvatarColor(username);
            const avatarUrl = story.authorAvatarBlobKey
              ? resolveBlobUrl(
                  story.authorAvatarBlobKey,
                  storageGatewayUrl,
                  backendCanisterId,
                  projectId,
                )
              : null;
            return (
              <button
                key={String(story.id)}
                type="button"
                data-ocid={`stories.item.${idx + 1}`}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => onStoryClick?.(story, idx)}
                aria-label={`View ${username}'s story`}
              >
                <div className="story-ring">
                  <div
                    className="w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center text-white font-semibold text-lg"
                    style={{ background: color }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(username)
                    )}
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium truncate w-16 text-center"
                  style={{ color: "#A8B0BA" }}
                >
                  {username}
                </span>
              </button>
            );
          })
        : SAMPLE_STORIES.map((s, idx) => (
            <div
              key={String(s.id)}
              data-ocid={`stories.item.${idx + 1}`}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="story-ring">
                <div
                  className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-semibold text-lg"
                  style={{ background: s.color }}
                >
                  {getInitials(s.username)}
                </div>
              </div>
              <span
                className="text-[11px] font-medium truncate w-16 text-center"
                style={{ color: "#A8B0BA" }}
              >
                {s.username}
              </span>
            </div>
          ))}
    </div>
  );
}
