import { Input } from "@/components/ui/input";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LazyImage } from "../components/LazyImage";
import { useActor } from "../hooks/useActor";
import { useStorageConfig } from "../hooks/useStorageConfig";
import type { FullBackendInterface, PostView, Profile } from "../types/backend";
import { resolveBlobUrl } from "../utils/blobUrl";

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

type Tab = "explore" | "people";

interface PostDetailModalProps {
  post: PostView;
  imgSrc: string | null;
  onClose: () => void;
}

function PostDetailModal({ post, imgSrc, onClose }: PostDetailModalProps) {
  const avatarColor = getAvatarColor(
    post.authorUsername || post.author.toString(),
  );
  const initial = (post.authorUsername || "U").slice(0, 1).toUpperCase();

  return (
    <motion.div
      data-ocid="explore.modal"
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.92)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full flex flex-col"
        style={{ maxWidth: 480, marginTop: "auto", marginBottom: "auto" }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: "oklch(0.175 0.008 250)",
            borderBottom: "1px solid oklch(0.27 0.01 250)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: avatarColor }}
            >
              {initial}
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "#F2F4F7" }}
            >
              {post.authorUsername || "Anonymous"}
            </span>
          </div>
          <button
            type="button"
            data-ocid="explore.close_button"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.27 0.01 250)" }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} style={{ color: "#F2F4F7" }} />
          </button>
        </div>

        {/* Image */}
        <div
          className="w-full"
          style={{ aspectRatio: "1 / 1", background: "#0B0D10" }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={post.caption}
              className="w-full h-full object-cover"
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
        </div>

        {/* Post details */}
        <div
          className="px-4 py-3"
          style={{ background: "oklch(0.175 0.008 250)" }}
        >
          {Number(post.likeCount) > 0 && (
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "#F2F4F7" }}
            >
              {Number(post.likeCount).toLocaleString()}{" "}
              {Number(post.likeCount) === 1 ? "like" : "likes"}
            </p>
          )}
          {post.caption ? (
            <p className="text-sm" style={{ color: "#F2F4F7" }}>
              <span className="font-semibold mr-1.5">
                {post.authorUsername || "user"}
              </span>
              {post.caption}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "#A8B0BA" }}>
              No caption
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SearchScreen() {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const storageConfig = useStorageConfig();
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);

  const { data: posts = [], isLoading: postsLoading } = useQuery<PostView[]>({
    queryKey: ["listPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPosts();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<
    Profile[]
  >({
    queryKey: ["profiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProfiles();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Sort posts newest first
  const sortedPosts = [...posts].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  const filteredProfiles = profiles.filter(
    (p) =>
      !search ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.bio.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedPostImgSrc = selectedPost
    ? resolveBlobUrl(
        selectedPost.imageBlobKey,
        storageConfig.storageGatewayUrl,
        storageConfig.backendCanisterId,
        storageConfig.projectId,
      )
    : null;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "oklch(0.13 0.005 250)",
          borderBottom: "1px solid oklch(0.27 0.01 250)",
        }}
      >
        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#A8B0BA" }}
            />
            <Input
              data-ocid="search.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "explore" ? "Search..." : "Search people..."
              }
              className="pl-9 rounded-xl text-sm"
              style={{
                background: "oklch(0.175 0.008 250)",
                border: "1px solid oklch(0.27 0.01 250)",
                color: "#F2F4F7",
                fontSize: 16,
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-0">
          {(["explore", "people"] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                data-ocid={`search.${tab}.tab`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors relative"
                style={{
                  color: isActive ? "#F2F4F7" : "#A8B0BA",
                  borderBottom: isActive
                    ? "2px solid #FF2D95"
                    : "2px solid transparent",
                }}
                onClick={() => {
                  setActiveTab(tab);
                  setSearch("");
                }}
              >
                {tab === "people" && <Users size={14} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>
      </header>

      {/* Explore Tab - Photo Grid */}
      {activeTab === "explore" && (
        <div className="flex-1">
          {postsLoading ? (
            <div
              data-ocid="search.loading_state"
              className="grid grid-cols-3 gap-0.5"
            >
              {[
                "s1",
                "s2",
                "s3",
                "s4",
                "s5",
                "s6",
                "s7",
                "s8",
                "s9",
                "s10",
                "s11",
                "s12",
              ].map((sk) => (
                <div
                  key={sk}
                  className="aspect-square animate-pulse"
                  style={{ background: "oklch(0.175 0.008 250)" }}
                />
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div
              data-ocid="search.empty_state"
              className="flex flex-col items-center justify-center py-24"
            >
              <span className="text-5xl mb-4">🖼️</span>
              <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
                No posts yet
              </p>
              <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                Be the first to share a photo!
              </p>
            </div>
          ) : (
            <div data-ocid="search.table" className="grid grid-cols-3 gap-0.5">
              {sortedPosts.map((post, idx) => {
                const imgSrc = resolveBlobUrl(
                  post.imageBlobKey,
                  storageConfig.storageGatewayUrl,
                  storageConfig.backendCanisterId,
                  storageConfig.projectId,
                );
                const color = getAvatarColor(String(post.id));
                return (
                  <button
                    key={String(post.id)}
                    type="button"
                    data-ocid={`search.item.${idx + 1}`}
                    className="aspect-square overflow-hidden block"
                    style={{ background: `${color}22`, position: "relative" }}
                    onClick={() => setSelectedPost(post)}
                    aria-label={`View post by ${post.authorUsername || "user"}`}
                  >
                    {imgSrc ? (
                      <LazyImage
                        src={imgSrc}
                        alt=""
                        className="w-full h-full"
                        style={{ position: "absolute", inset: 0 }}
                        placeholder={
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: `linear-gradient(135deg, ${color}44, ${color}11)`,
                            }}
                          />
                        }
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${color}44, ${color}11)`,
                        }}
                      >
                        <span className="text-2xl opacity-40">📷</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* People Tab */}
      {activeTab === "people" && (
        <div className="flex-1 px-4 pt-4">
          {profilesLoading ? (
            <div data-ocid="search.people.loading_state" className="space-y-2">
              {["p1", "p2", "p3", "p4"].map((pk) => (
                <div
                  key={pk}
                  className="h-16 rounded-xl animate-pulse"
                  style={{ background: "oklch(0.175 0.008 250)" }}
                />
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div
              data-ocid="search.people.empty_state"
              className="flex flex-col items-center justify-center py-24"
            >
              {search ? (
                <>
                  <span className="text-5xl mb-4">🔍</span>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#F2F4F7" }}
                  >
                    No results for &ldquo;{search}&rdquo;
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                    Try a different search term
                  </p>
                </>
              ) : (
                <>
                  <span className="text-5xl mb-4">👥</span>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#F2F4F7" }}
                  >
                    No people yet
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                    Be the first to set up your profile!
                  </p>
                </>
              )}
            </div>
          ) : (
            <div data-ocid="search.list" className="space-y-1 pb-4">
              {filteredProfiles.map((profile, idx) => {
                const color = getAvatarColor(profile.username);
                return (
                  <div
                    key={profile.username}
                    data-ocid={`search.item.${idx + 1}`}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: "oklch(0.175 0.008 250)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0"
                      style={{ background: color }}
                    >
                      {profile.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "#F2F4F7" }}
                      >
                        {profile.username}
                      </p>
                      {profile.bio && (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: "#A8B0BA" }}
                        >
                          {profile.bio}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      data-ocid={`search.item.${idx + 1}.button`}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{
                        background: "oklch(0.22 0.008 250)",
                        color: "#F2F4F7",
                        border: "1px solid oklch(0.27 0.01 250)",
                      }}
                    >
                      Follow
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            imgSrc={selectedPostImgSrc}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
