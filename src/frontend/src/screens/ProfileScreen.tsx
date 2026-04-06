import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bookmark,
  Camera,
  Clapperboard,
  Globe,
  Grid3X3,
  Loader2,
  LogOut,
  MapPin,
  Play,
  Plus,
  Settings,
  Tag,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TabName } from "../App";
import { LazyImage } from "../components/LazyImage";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useStorageConfig } from "../hooks/useStorageConfig";
import type {
  FullBackendInterface,
  Highlight,
  PostView,
  Profile,
  ReelView,
} from "../types/backend";
import { StorageClient } from "../utils/StorageClient";
import { resolveBlobUrl } from "../utils/blobUrl";

async function buildStorageClient() {
  const config = await loadConfig();
  const { HttpAgent } = await import("@icp-sdk/core/agent");
  const agent = new HttpAgent({ host: config.backend_host });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(console.warn);
  }
  return new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
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

interface ProfileScreenProps {
  onNavigate?: (tab: TabName) => void;
}

export default function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const storageConfig = useStorageConfig();

  // Edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<
    number | null
  >(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Highlight dialog
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState("");
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(
    null,
  );
  const [highlightDetailOpen, setHighlightDetailOpen] = useState(false);

  const principal = identity?.getPrincipal();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: profile = null, isLoading: profileLoading } =
    useQuery<Profile | null>({
      queryKey: ["myProfile"],
      queryFn: async () => {
        if (!actor) return null;
        return actor.getMyProfile();
      },
      enabled: !!actor && !actorFetching,
      staleTime: 30_000,
    });

  const { data: posts = [] } = useQuery<PostView[]>({
    queryKey: ["listPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPosts();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: reels = [] } = useQuery<ReelView[]>({
    queryKey: ["listReels"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listReels();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["following", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowing(principal);
    },
    enabled: !!actor && !!principal && !actorFetching,
    staleTime: 30_000,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowers(principal);
    },
    enabled: !!actor && !!principal && !actorFetching,
    staleTime: 30_000,
  });

  const { data: highlights = [] } = useQuery<Highlight[]>({
    queryKey: ["myHighlights"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyHighlights();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const myPosts = principal
    ? posts.filter((p) => p.author.toString() === principal.toString())
    : [];

  const myReels = principal
    ? reels.filter((r) => r.author.toString() === principal.toString())
    : [];

  const displayName =
    profile?.username || principal?.toString().slice(0, 12) || "Anonymous";
  const avatarColor = getAvatarColor(displayName);
  const initial = displayName.slice(0, 1).toUpperCase();

  const avatarUrl = profile?.avatarBlobKey
    ? resolveBlobUrl(
        profile.avatarBlobKey,
        storageConfig.storageGatewayUrl,
        storageConfig.backendCanisterId,
        storageConfig.projectId,
      )
    : null;

  // ── Avatar upload ─────────────────────────────────────────────────────────────
  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;

    setAvatarUploading(true);
    setAvatarUploadProgress(0);
    try {
      const storageClient = await buildStorageClient();
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setAvatarUploadProgress(pct);
      });

      await actor.upsertProfile(
        profile?.username || "",
        profile?.bio || "",
        hash,
        profile?.website || "",
        profile?.location || "",
      );
      toast.success("Profile photo updated!");
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error("Failed to update profile photo.");
    } finally {
      setAvatarUploading(false);
      setAvatarUploadProgress(null);
      // Reset input
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Upsert profile ────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.upsertProfile(
        username.trim(),
        bio.trim(),
        profile?.avatarBlobKey || "",
        website.trim(),
        location.trim(),
      );
    },
    onSuccess: () => {
      toast.success("Profile saved!");
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      setEditSheetOpen(false);
    },
    onError: () => {
      toast.error("Failed to save profile.");
    },
  });

  const handleOpenEdit = () => {
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");
    setWebsite(profile?.website || "");
    setLocation(profile?.location || "");
    setEditSheetOpen(true);
  };

  const handleSave = () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    upsertMutation.mutate();
  };

  // ── Create highlight ──────────────────────────────────────────────────────────
  const createHighlightMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.createHighlight(highlightTitle.trim(), "");
    },
    onSuccess: () => {
      toast.success("Highlight created!");
      queryClient.invalidateQueries({ queryKey: ["myHighlights"] });
      setHighlightDialogOpen(false);
      setHighlightTitle("");
    },
    onError: () => {
      toast.error("Failed to create highlight.");
    },
  });

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
          {displayName}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="profile.settings.button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            style={{ color: "#F2F4F7" }}
            onClick={() => onNavigate?.("settings")}
            aria-label="Settings"
          >
            <Settings size={20} />
          </Button>
          <Button
            data-ocid="profile.logout.button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            style={{ color: "#A8B0BA" }}
            onClick={clear}
            aria-label="Log out"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {profileLoading ? (
        <div
          data-ocid="profile.loading_state"
          className="flex items-center justify-center py-20"
        >
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "#A8B0BA" }}
          />
        </div>
      ) : (
        <div className="px-4 pt-5">
          {/* Avatar + Stats */}
          <div className="flex items-center gap-6 mb-4">
            {/* Avatar with upload overlay */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: avatarColor }}
              >
                {avatarUploading ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <Loader2 size={24} className="animate-spin text-white" />
                    {avatarUploadProgress !== null && (
                      <span className="text-white text-[10px] mt-1">
                        {avatarUploadProgress}%
                      </span>
                    )}
                  </div>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              {/* Camera overlay */}
              <button
                type="button"
                data-ocid="profile.upload_button"
                className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Upload profile photo"
              >
                <Camera size={20} color="white" />
              </button>
              {/* Edit badge */}
              <button
                type="button"
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "#2F80FF",
                  border: "2px solid oklch(0.13 0.005 250)",
                }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Edit photo"
              >
                <Camera size={13} color="white" />
              </button>
              <input
                data-ocid="profile.dropzone"
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Stats */}
            <div className="flex gap-6 flex-1">
              {[
                { label: "Posts", value: myPosts.length },
                { label: "Followers", value: followers.length },
                { label: "Following", value: following.length },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span
                    className="text-base font-bold"
                    style={{ color: "#F2F4F7" }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs" style={{ color: "#A8B0BA" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile bio / info */}
          {!profile ? (
            <div
              className="p-4 rounded-xl mb-4"
              style={{
                background: "oklch(0.175 0.008 250)",
                border: "1px solid #2F80FF40",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
                Set up your profile
              </p>
              <p className="text-xs mt-1 mb-3" style={{ color: "#A8B0BA" }}>
                Add a username and bio to personalize your account.
              </p>
              <Button
                data-ocid="profile.primary_button"
                size="sm"
                className="rounded-full"
                style={{ background: "#2F80FF", color: "white" }}
                onClick={handleOpenEdit}
              >
                Set up profile
              </Button>
            </div>
          ) : (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-0.5">
                <p
                  className="font-semibold text-sm"
                  style={{ color: "#F2F4F7" }}
                >
                  {profile.username}
                </p>
                <button
                  type="button"
                  data-ocid="profile.edit_button"
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{
                    background: "oklch(0.22 0.008 250)",
                    color: "#F2F4F7",
                    border: "1px solid oklch(0.27 0.01 250)",
                  }}
                  onClick={handleOpenEdit}
                >
                  Edit profile
                </button>
              </div>
              {profile.bio && (
                <p className="text-sm" style={{ color: "#A8B0BA" }}>
                  {profile.bio}
                </p>
              )}
              {profile.website && (
                <a
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 text-sm"
                  style={{ color: "#2F80FF" }}
                >
                  <Globe size={13} />
                  {profile.website}
                </a>
              )}
              {profile.location && (
                <p
                  className="flex items-center gap-1 mt-0.5 text-xs"
                  style={{ color: "#A8B0BA" }}
                >
                  <MapPin size={12} />
                  {profile.location}
                </p>
              )}
            </div>
          )}

          {/* Story Highlights */}
          <div className="mb-4">
            <div
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-1"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {/* New highlight button */}
              <button
                type="button"
                data-ocid="profile.open_modal_button"
                className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none"
                onClick={() => setHighlightDialogOpen(true)}
                aria-label="Create highlight"
              >
                <div
                  className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                  style={{
                    background: "oklch(0.175 0.008 250)",
                    border: "2px dashed oklch(0.35 0.01 250)",
                  }}
                >
                  <Plus size={22} style={{ color: "#A8B0BA" }} />
                </div>
                <span
                  className="text-[11px] font-medium w-16 text-center truncate"
                  style={{ color: "#A8B0BA" }}
                >
                  New
                </span>
              </button>

              {/* Existing highlights */}
              {highlights.map((hl, idx) => {
                const coverUrl = hl.coverBlobKey
                  ? resolveBlobUrl(
                      hl.coverBlobKey,
                      storageConfig.storageGatewayUrl,
                      storageConfig.backendCanisterId,
                      storageConfig.projectId,
                    )
                  : null;
                return (
                  <button
                    key={String(hl.id)}
                    type="button"
                    data-ocid={`profile.item.${idx + 1}`}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none"
                    onClick={() => {
                      setSelectedHighlight(hl);
                      setHighlightDetailOpen(true);
                    }}
                    aria-label={`View ${hl.title} highlight`}
                  >
                    <div
                      className="w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center"
                      style={{
                        background: "oklch(0.22 0.008 250)",
                        border: "2px solid oklch(0.35 0.01 250)",
                      }}
                    >
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={hl.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">⭐</span>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-medium w-16 text-center truncate"
                      style={{ color: "#A8B0BA" }}
                    >
                      {hl.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="posts" className="flex-1">
        <TabsList
          className="w-full rounded-none h-10 gap-0"
          style={{
            background: "oklch(0.13 0.005 250)",
            borderBottom: "1px solid oklch(0.27 0.01 250)",
            borderTop: "1px solid oklch(0.27 0.01 250)",
          }}
        >
          {[
            {
              value: "posts",
              label: "Posts",
              icon: <Grid3X3 size={16} />,
            },
            {
              value: "reels",
              label: "Reels",
              icon: <Clapperboard size={16} />,
            },
            { value: "tagged", label: "Tagged", icon: <Tag size={16} /> },
            {
              value: "saved",
              label: "Saved",
              icon: <Bookmark size={16} />,
            },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-ocid={`profile.${tab.value}.tab`}
              className="flex-1 flex items-center justify-center gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              style={{ color: "#A8B0BA", fontSize: 11 }}
            >
              {tab.icon}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Posts grid */}
        <TabsContent value="posts" className="mt-0">
          {myPosts.length === 0 ? (
            <div
              data-ocid="profile.posts.empty_state"
              className="flex flex-col items-center justify-center py-16"
            >
              <span className="text-4xl mb-3">📷</span>
              <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
                No posts yet
              </p>
              <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                Share your first photo!
              </p>
            </div>
          ) : (
            <div
              data-ocid="profile.posts.table"
              className="grid grid-cols-3 gap-0.5"
            >
              {myPosts.map((post, idx) => {
                const imgSrc = resolveBlobUrl(
                  post.imageBlobKey,
                  storageConfig.storageGatewayUrl,
                  storageConfig.backendCanisterId,
                  storageConfig.projectId,
                );
                const color = getAvatarColor(
                  post.authorUsername || idx.toString(),
                );
                return (
                  <div
                    key={String(post.id)}
                    data-ocid={`profile.posts.item.${idx + 1}`}
                    className="aspect-square relative overflow-hidden"
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
                              background: `${color}33`,
                            }}
                          />
                        }
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: `${color}33` }}
                      >
                        <span className="text-3xl opacity-40">📷</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Reels grid */}
        <TabsContent value="reels" className="mt-0">
          {myReels.length === 0 ? (
            <div
              data-ocid="profile.reels.empty_state"
              className="flex flex-col items-center justify-center py-16"
            >
              <Clapperboard
                size={40}
                className="mb-3"
                style={{ color: "#A8B0BA" }}
              />
              <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
                No reels yet
              </p>
              <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                Create your first reel!
              </p>
            </div>
          ) : (
            <div
              data-ocid="profile.reels.table"
              className="grid grid-cols-3 gap-0.5"
            >
              {myReels.map((reel, idx) => {
                const color = getAvatarColor(
                  reel.authorUsername || idx.toString(),
                );
                return (
                  <div
                    key={String(reel.id)}
                    data-ocid={`profile.reels.item.${idx + 1}`}
                    className="aspect-square relative overflow-hidden"
                    style={{ background: `${color}22` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={20} fill="white" color="white" />
                    </div>
                    <div
                      className="absolute bottom-1 left-1 text-white text-[10px] font-semibold px-1 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                    >
                      🎬
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tagged tab */}
        <TabsContent value="tagged" className="mt-0">
          <div
            data-ocid="profile.tagged.empty_state"
            className="flex flex-col items-center justify-center py-16"
          >
            <Tag size={40} className="mb-3" style={{ color: "#A8B0BA" }} />
            <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
              No tagged posts yet
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
              Posts you're tagged in will appear here
            </p>
          </div>
        </TabsContent>

        {/* Saved tab */}
        <TabsContent value="saved" className="mt-0">
          <div
            data-ocid="profile.saved.empty_state"
            className="flex flex-col items-center justify-center py-16"
          >
            <Bookmark size={40} className="mb-3" style={{ color: "#A8B0BA" }} />
            <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
              No saved posts yet
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
              Tap the bookmark icon on any post to save it
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Edit Profile Sheet ────────────────────────────────────────────────── */}
      <Sheet
        open={editSheetOpen}
        onOpenChange={(o) => !o && setEditSheetOpen(false)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl"
          style={{
            background: "oklch(0.13 0.005 250)",
            border: "1px solid oklch(0.27 0.01 250)",
            maxHeight: "92dvh",
            overflowY: "auto",
          }}
        >
          <SheetHeader className="mb-5">
            <SheetTitle style={{ color: "#F2F4F7" }}>Edit Profile</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            {/* Avatar preview + upload */}
            <div className="flex items-center gap-4 mb-2">
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold text-xl"
                style={{ background: avatarColor }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <button
                type="button"
                data-ocid="profile.upload_button"
                className="text-sm font-semibold"
                style={{ color: "#2F80FF" }}
                onClick={() => avatarInputRef.current?.click()}
              >
                Change profile photo
              </button>
            </div>

            {avatarUploadProgress !== null && (
              <Progress
                data-ocid="profile.loading_state"
                value={avatarUploadProgress}
                className="h-1 rounded-full"
                style={{ background: "oklch(0.27 0.01 250)" }}
              />
            )}

            <div>
              <label
                htmlFor="edit-username"
                className="text-xs font-semibold mb-1 block"
                style={{ color: "#A8B0BA" }}
              >
                USERNAME
              </label>
              <Input
                id="edit-username"
                data-ocid="profile.input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="rounded-xl"
                style={{
                  background: "oklch(0.175 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="edit-bio"
                className="text-xs font-semibold mb-1 block"
                style={{ color: "#A8B0BA" }}
              >
                BIO
              </label>
              <Textarea
                id="edit-bio"
                data-ocid="profile.textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                rows={3}
                className="resize-none rounded-xl"
                style={{
                  background: "oklch(0.175 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
                maxLength={150}
              />
            </div>

            <div>
              <label
                htmlFor="edit-website"
                className="text-xs font-semibold mb-1 block"
                style={{ color: "#A8B0BA" }}
              >
                WEBSITE
              </label>
              <Input
                id="edit-website"
                data-ocid="profile.input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                type="url"
                className="rounded-xl"
                style={{
                  background: "oklch(0.175 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="edit-location"
                className="text-xs font-semibold mb-1 block"
                style={{ color: "#A8B0BA" }}
              >
                LOCATION
              </label>
              <Input
                id="edit-location"
                data-ocid="profile.input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="rounded-xl"
                style={{
                  background: "oklch(0.175 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="profile.cancel_button"
                variant="outline"
                className="flex-1 rounded-xl"
                style={{
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#A8B0BA",
                }}
                onClick={() => setEditSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                data-ocid="profile.save_button"
                className="flex-1 rounded-xl"
                style={{ background: "#2F80FF", color: "white" }}
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Create Highlight Dialog ───────────────────────────────────────────── */}
      <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
        <DialogContent
          data-ocid="profile.dialog"
          style={{
            background: "oklch(0.175 0.008 250)",
            border: "1px solid oklch(0.27 0.01 250)",
            color: "#F2F4F7",
            maxWidth: 360,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#F2F4F7" }}>
              New Highlight
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              data-ocid="profile.input"
              value={highlightTitle}
              onChange={(e) => setHighlightTitle(e.target.value)}
              placeholder="Highlight name (e.g. Travel, Food)..."
              style={{
                background: "oklch(0.22 0.008 250)",
                border: "1px solid oklch(0.27 0.01 250)",
                color: "#F2F4F7",
                fontSize: 16,
              }}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                highlightTitle.trim() &&
                createHighlightMutation.mutate()
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              data-ocid="profile.cancel_button"
              variant="outline"
              className="flex-1"
              style={{
                border: "1px solid oklch(0.27 0.01 250)",
                color: "#A8B0BA",
              }}
              onClick={() => {
                setHighlightDialogOpen(false);
                setHighlightTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="profile.confirm_button"
              className="flex-1"
              style={{ background: "#FF2D95", color: "white" }}
              disabled={
                !highlightTitle.trim() || createHighlightMutation.isPending
              }
              onClick={() => createHighlightMutation.mutate()}
            >
              {createHighlightMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Highlight Detail Sheet ────────────────────────────────────────────── */}
      <Sheet
        open={highlightDetailOpen}
        onOpenChange={(o) => !o && setHighlightDetailOpen(false)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl"
          style={{
            background: "oklch(0.13 0.005 250)",
            border: "1px solid oklch(0.27 0.01 250)",
            maxHeight: "70dvh",
            overflowY: "auto",
          }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle style={{ color: "#F2F4F7" }}>
              {selectedHighlight?.title || "Highlight"}
            </SheetTitle>
          </SheetHeader>
          {selectedHighlight && selectedHighlight.storyIds.length === 0 ? (
            <div
              data-ocid="profile.saved.empty_state"
              className="flex flex-col items-center justify-center py-12"
            >
              <span className="text-4xl mb-3">⭐</span>
              <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
                No stories yet
              </p>
              <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
                Add stories to this highlight from the Stories viewer
              </p>
            </div>
          ) : (
            <div data-ocid="profile.list" className="space-y-2">
              {selectedHighlight?.storyIds.map((id, idx) => (
                <div
                  key={String(id)}
                  data-ocid={`profile.item.${idx + 1}`}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl"
                  style={{ background: "oklch(0.175 0.008 250)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0.22 0.008 250)" }}
                  >
                    <span className="text-lg">📖</span>
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#F2F4F7" }}
                    >
                      Story #{idx + 1}
                    </p>
                    <p className="text-xs" style={{ color: "#A8B0BA" }}>
                      ID: {String(id)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
