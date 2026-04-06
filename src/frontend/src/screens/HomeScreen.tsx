import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { TabName } from "../App";
import CommentsDrawer from "../components/CommentsDrawer";
import PostCard from "../components/PostCard";
import StoriesRow from "../components/StoriesRow";
import { useActor } from "../hooks/useActor";
import type { FullBackendInterface, PostView, Story } from "../types/backend";

const SAMPLE_POSTS: PostView[] = [
  {
    id: BigInt(1),
    author: {} as any,
    imageBlobKey: "https://picsum.photos/seed/insta1/600/600",
    caption:
      "Golden hour magic in the Dolomites ✨ Every sunset is a masterpiece.",
    createdAt: BigInt((Date.now() - 3600000) * 1e6),
    likeCount: BigInt(842),
    commentCount: BigInt(34),
    likedByMe: false,
    authorUsername: "sofia.travels",
    authorAvatarBlobKey: "",
  },
  {
    id: BigInt(2),
    author: {} as any,
    imageBlobKey: "https://picsum.photos/seed/insta2/600/600",
    caption:
      "Morning rituals ☕ There's nothing better than a perfect espresso to start the day.",
    createdAt: BigInt((Date.now() - 7200000) * 1e6),
    likeCount: BigInt(1204),
    commentCount: BigInt(67),
    likedByMe: true,
    authorUsername: "kai.eats",
    authorAvatarBlobKey: "",
  },
  {
    id: BigInt(3),
    author: {} as any,
    imageBlobKey: "https://picsum.photos/seed/insta3/600/600",
    caption:
      "Street art never disappoints 🎨 Tokyo has the most vibrant walls I've ever seen.",
    createdAt: BigInt((Date.now() - 86400000) * 1e6),
    likeCount: BigInt(576),
    commentCount: BigInt(22),
    likedByMe: false,
    authorUsername: "nora.creates",
    authorAvatarBlobKey: "",
  },
];

interface HomeScreenProps {
  onNavigate?: (tab: TabName) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const [activeCommentPostId, setActiveCommentPostId] = useState<bigint | null>(
    null,
  );

  const {
    data: feed = [],
    isLoading: feedLoading,
    refetch,
  } = useQuery<PostView[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed(BigInt(20));
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: stories = [] } = useQuery<Story[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveStories();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });

  const displayPosts = feed.length > 0 ? feed : SAMPLE_POSTS;

  return (
    <div className="flex flex-col min-h-full">
      {/* Top App Bar */}
      <header
        className="sticky top-0 z-40 flex items-center px-4 h-14"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        <h1
          className="text-xl font-bold flex-1"
          style={{
            color: "#F2F4F7",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
          }}
        >
          InstaClone
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="home.secondary_button"
            className="relative p-1"
            aria-label="Messages"
            onClick={() => onNavigate?.("messages")}
          >
            <MessageCircle
              size={26}
              strokeWidth={1.8}
              style={{ color: "#F2F4F7" }}
            />
          </button>
          <button
            type="button"
            data-ocid="home.activity.button"
            className="relative p-1"
            aria-label="Notifications"
            onClick={() => onNavigate?.("notifications")}
          >
            <Bell size={26} strokeWidth={1.8} style={{ color: "#F2F4F7" }} />
            <span
              className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
              style={{ background: "#FF3B5C" }}
            >
              3
            </span>
          </button>
          <button
            type="button"
            data-ocid="home.refresh.button"
            onClick={() => void refetch()}
            className="p-1"
            aria-label="Refresh feed"
          >
            <RefreshCw size={20} style={{ color: "#A8B0BA" }} />
          </button>
        </div>
      </header>

      {/* Stories Row */}
      <StoriesRow stories={stories} />

      {/* Divider */}
      <div
        style={{ height: 1, background: "oklch(0.27 0.01 250)", margin: "0" }}
      />

      {/* Feed */}
      <div className="flex-1 pt-3">
        {feedLoading ? (
          <div
            data-ocid="feed.loading_state"
            className="flex flex-col gap-3 px-3"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "oklch(0.175 0.008 250)",
                  height: 400,
                  border: "1px solid oklch(0.27 0.01 250)",
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  <div
                    className="w-9 h-9 rounded-full"
                    style={{ background: "oklch(0.22 0.008 250)" }}
                  />
                  <div className="flex-1">
                    <div
                      className="h-3 w-24 rounded-full mb-1.5"
                      style={{ background: "oklch(0.22 0.008 250)" }}
                    />
                    <div
                      className="h-2.5 w-16 rounded-full"
                      style={{ background: "oklch(0.22 0.008 250)" }}
                    />
                  </div>
                </div>
                <div
                  className="h-64"
                  style={{ background: "oklch(0.22 0.008 250)" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {displayPosts.map((post, idx) => (
              <PostCard
                key={String(post.id)}
                post={post}
                index={idx + 1}
                onCommentClick={setActiveCommentPostId}
              />
            ))}
            {displayPosts.length === 0 && (
              <div
                data-ocid="feed.empty_state"
                className="flex flex-col items-center justify-center py-20"
              >
                <span className="text-5xl mb-4">📷</span>
                <p
                  className="text-base font-semibold"
                  style={{ color: "#F2F4F7" }}
                >
                  No posts yet
                </p>
                <p className="text-sm mt-1" style={{ color: "#A8B0BA" }}>
                  Follow people to see their posts here
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comments Drawer */}
      <CommentsDrawer
        postId={activeCommentPostId}
        open={activeCommentPostId !== null}
        onClose={() => setActiveCommentPostId(null)}
      />
    </div>
  );
}
