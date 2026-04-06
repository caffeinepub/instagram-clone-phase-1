import { Plus } from "lucide-react";
import { useRef } from "react";
import type { Story } from "../types/backend";

interface StoriesRowProps {
  stories: Story[];
  myUsername?: string;
}

const SAMPLE_STORIES = [
  {
    id: BigInt(1),
    author: {} as any,
    imageBlobKey: "",
    createdAt: BigInt(0),
    username: "sofia.m",
  },
  {
    id: BigInt(2),
    author: {} as any,
    imageBlobKey: "",
    createdAt: BigInt(0),
    username: "kai.lens",
  },
  {
    id: BigInt(3),
    author: {} as any,
    imageBlobKey: "",
    createdAt: BigInt(0),
    username: "nora.art",
  },
  {
    id: BigInt(4),
    author: {} as any,
    imageBlobKey: "",
    createdAt: BigInt(0),
    username: "leo.photo",
  },
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

export default function StoriesRow({ stories, myUsername }: StoriesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayStories =
    stories.length > 0
      ? stories.map((s) => ({
          ...s,
          username: s.author.toString().slice(0, 8),
        }))
      : SAMPLE_STORIES;

  return (
    <div
      ref={scrollRef}
      data-ocid="stories.panel"
      className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {/* Your Story */}
      <div
        className="flex flex-col items-center gap-1.5 flex-shrink-0"
        style={{ scrollSnapAlign: "start" }}
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
      </div>

      {/* Other stories */}
      {displayStories.map((story, idx) => {
        const color = getAvatarColor(story.username);
        return (
          <div
            key={String(story.id)}
            data-ocid={`stories.item.${idx + 1}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="story-ring">
              <div
                className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ background: color }}
              >
                {getInitials(story.username)}
              </div>
            </div>
            <span
              className="text-[11px] font-medium truncate w-16 text-center"
              style={{ color: "#A8B0BA" }}
            >
              {story.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
