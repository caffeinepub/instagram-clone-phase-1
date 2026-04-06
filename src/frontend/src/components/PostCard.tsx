import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useStorageConfig } from "../hooks/useStorageConfig";
import type { FullBackendInterface, PostView } from "../types/backend";
import { resolveBlobUrl } from "../utils/blobUrl";
import { LazyImage } from "./LazyImage";

interface PostCardProps {
  post: PostView;
  index: number;
  onCommentClick: (postId: bigint) => void;
}

function timeAgo(ns: bigint): string {
  const ms = Number(ns) / 1e6;
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (weeks > 0) return `${weeks}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
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

export default function PostCard({
  post,
  index,
  onCommentClick,
}: PostCardProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const queryClient = useQueryClient();
  const storageConfig = useStorageConfig();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(Number(post.likeCount));
  const [showHeart, setShowHeart] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likePulse, setLikePulse] = useState(false);
  const lastTapRef = useRef(0);

  const imgSrc = resolveBlobUrl(
    post.imageBlobKey,
    storageConfig.storageGatewayUrl,
    storageConfig.backendCanisterId,
    storageConfig.projectId,
  );
  const avatarColor = getAvatarColor(
    post.authorUsername || post.author.toString(),
  );
  const initial = (post.authorUsername || "U").slice(0, 1).toUpperCase();

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!actor) return;
      await actor.toggleLike(post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const handleLike = useCallback(() => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));
    setLikePulse(true);
    setTimeout(() => setLikePulse(false), 300);
    toggleLikeMutation.mutate();
  }, [liked, toggleLikeMutation]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        toggleLikeMutation.mutate();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 700);
    }
    lastTapRef.current = now;
  }, [liked, toggleLikeMutation]);

  return (
    <article
      data-ocid={`feed.item.${index}`}
      className="mb-2"
      style={{
        background: "oklch(0.175 0.008 250)",
        border: "1px solid oklch(0.27 0.01 250)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 12px 0 rgba(0,0,0,0.35)",
        margin: "0 12px 12px",
      }}
    >
      {/* Post Header */}
      <header className="flex items-center px-3 py-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ background: avatarColor }}
        >
          {initial}
        </div>
        <div className="ml-2.5 flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "#F2F4F7" }}
          >
            {post.authorUsername || "Anonymous"}
          </p>
          <p className="text-[11px]" style={{ color: "#A8B0BA" }}>
            {timeAgo(post.createdAt)}
          </p>
        </div>
        <button
          type="button"
          className="p-1 rounded-full"
          style={{ color: "#A8B0BA" }}
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Post Image */}
      <button
        type="button"
        className="relative w-full block"
        style={{
          aspectRatio: "1 / 1",
          background: "#1A1F24",
          border: "none",
          padding: 0,
          cursor: "default",
        }}
        onClick={handleDoubleTap}
        aria-label="Double-tap to like"
      >
        {imgSrc ? (
          <LazyImage
            src={imgSrc}
            alt={post.caption}
            className="w-full h-full"
            style={{ position: "absolute", inset: 0 }}
            placeholder={
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg, ${avatarColor}33, ${avatarColor}11)`,
                }}
              />
            }
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}33, ${avatarColor}11)`,
            }}
          >
            <span className="text-6xl opacity-30">📷</span>
          </div>
        )}

        {/* Double-tap heart overlay */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              className="absolute top-1/2 left-1/2 pointer-events-none"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <Heart size={80} fill="#FF3B5C" color="#FF3B5C" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Actions */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            data-ocid={`feed.item.${index}.toggle`}
            onClick={handleLike}
            className={`transition-transform ${likePulse ? "scale-125" : "scale-100"}`}
            aria-label="Like post"
          >
            <Heart
              size={26}
              strokeWidth={1.8}
              fill={liked ? "#FF3B5C" : "none"}
              color={liked ? "#FF3B5C" : "#F2F4F7"}
            />
          </button>
          <button
            type="button"
            data-ocid={`feed.item.${index}.open_modal_button`}
            onClick={() => onCommentClick(post.id)}
            aria-label="View comments"
          >
            <MessageCircle size={26} strokeWidth={1.8} color="#F2F4F7" />
          </button>
          <button type="button" aria-label="Share">
            <Send size={24} strokeWidth={1.8} color="#F2F4F7" />
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setBookmarked((b) => !b)}
            aria-label="Bookmark"
          >
            <Bookmark
              size={26}
              strokeWidth={1.8}
              fill={bookmarked ? "#F2F4F7" : "none"}
              color="#F2F4F7"
            />
          </button>
        </div>

        {/* Likes */}
        {likeCount > 0 && (
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: "#F2F4F7" }}
          >
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mb-1" style={{ color: "#F2F4F7" }}>
            <span className="font-semibold mr-1.5">
              {post.authorUsername || "user"}
            </span>
            {post.caption}
          </p>
        )}

        {/* View comments */}
        {Number(post.commentCount) > 0 && (
          <button
            type="button"
            data-ocid={`feed.item.${index}.link`}
            className="text-sm mb-1"
            style={{ color: "#A8B0BA" }}
            onClick={() => onCommentClick(post.id)}
          >
            View all {Number(post.commentCount)} comments
          </button>
        )}
      </div>
    </article>
  );
}
