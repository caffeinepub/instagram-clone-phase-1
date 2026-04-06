import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, Edit2, Grid, Loader2, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { TabName } from "../App";
import { LazyImage } from "../components/LazyImage";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
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

interface ProfileScreenProps {
  onNavigate?: (tab: TabName) => void;
}

export default function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const storageConfig = useStorageConfig();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const principal = identity?.getPrincipal();

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

  const myPosts = principal
    ? posts.filter((p) => p.author.toString() === principal.toString())
    : [];

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

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.upsertProfile(username, bio, "");
    },
    onSuccess: () => {
      toast.success("Profile saved!");
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      setEditing(false);
    },
    onError: () => {
      toast.error("Failed to save profile.");
    },
  });

  const handleStartEdit = () => {
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");
    setEditing(true);
  };

  const handleSave = () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    upsertMutation.mutate();
  };

  const displayName =
    profile?.username || principal?.toString().slice(0, 12) || "Anonymous";
  const avatarColor = getAvatarColor(displayName);
  const initial = displayName.slice(0, 1).toUpperCase();

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
          {!editing && (
            <Button
              data-ocid="profile.edit_button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              style={{ color: "#F2F4F7" }}
              onClick={handleStartEdit}
            >
              <Edit2 size={20} />
            </Button>
          )}
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
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: avatarColor }}
            >
              {initial}
            </div>
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

          {/* Profile Info / Edit Form */}
          {editing ? (
            <div data-ocid="profile.panel" className="space-y-3 mb-6">
              <div>
                <label
                  htmlFor="profile-username"
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "#A8B0BA" }}
                >
                  USERNAME
                </label>
                <Input
                  id="profile-username"
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
                  htmlFor="profile-bio"
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "#A8B0BA" }}
                >
                  BIO
                </label>
                <Textarea
                  id="profile-bio"
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
              <div className="flex gap-2">
                <Button
                  data-ocid="profile.cancel_button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  style={{
                    border: "1px solid oklch(0.27 0.01 250)",
                    color: "#A8B0BA",
                  }}
                  onClick={() => setEditing(false)}
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
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1" /> Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              {!profile ? (
                <div
                  className="p-4 rounded-xl mb-3"
                  style={{
                    background: "oklch(0.175 0.008 250)",
                    border: "1px solid #2F80FF40",
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#F2F4F7" }}
                  >
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
                    onClick={handleStartEdit}
                  >
                    Set up profile
                  </Button>
                </div>
              ) : (
                <>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "#F2F4F7" }}
                  >
                    {profile.username}
                  </p>
                  {profile.bio && (
                    <p className="text-sm mt-1" style={{ color: "#A8B0BA" }}>
                      {profile.bio}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Posts Grid */}
      <div style={{ borderTop: "1px solid oklch(0.27 0.01 250)" }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <Grid size={16} style={{ color: "#A8B0BA" }} />
          <span className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
            Posts
          </span>
        </div>
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
      </div>
    </div>
  );
}
