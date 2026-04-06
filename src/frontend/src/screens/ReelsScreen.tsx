import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Plus,
  Send,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReelView } from "../backend.d";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import type { FullBackendInterface } from "../types/backend";
import { StorageClient } from "../utils/StorageClient";

// ─── Sample/mock reels for fallback ────────────────────────────────────────────
const SAMPLE_REELS = [
  {
    id: -1,
    username: "sofia.travels",
    caption:
      "Chasing waterfalls in Iceland 🌊 The sound of rushing water is therapy ✨ #iceland #nature #travel",
    likes: 42800,
    comments: 312,
    audio: "Original Audio - sofia.travels",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatarColor: "#FF2D95",
    likedByMe: false,
    isReal: false,
  },
  {
    id: -2,
    username: "kai.eats",
    caption:
      "Tokyo ramen at 2AM hits different 🍜🔥 Best bowl I've ever had, no contest #tokyofood #ramen #foodie",
    likes: 18500,
    comments: 204,
    audio: "Lofi Chill Beats - Playlist",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    avatarColor: "#FF6A00",
    likedByMe: false,
    isReal: false,
  },
  {
    id: -3,
    username: "nora.creates",
    caption:
      "Time-lapse of my latest mural 🎨 72 hours of work in 60 seconds #streetart #mural #timelapse",
    likes: 97300,
    comments: 1402,
    audio: "Trending Sound - #viral",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatarColor: "#7B2FFF",
    likedByMe: false,
    isReal: false,
  },
];

// ─── Unified reel shape for the player ─────────────────────────────────────────
interface CombinedReel {
  /** Negative = mock, positive = real backend ID (as number for key) */
  key: number;
  /** Real bigint ID, undefined for mocks */
  realId?: bigint;
  username: string;
  caption: string;
  audio: string;
  likes: number;
  comments: number;
  videoUrl: string;
  avatarColor: string;
  likedByMe: boolean;
  isReal: boolean;
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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── Build StorageClient helper ─────────────────────────────────────────────────
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

// ─── Resolve a videoBlobKey to a URL ────────────────────────────────────────────
async function resolveVideoUrl(
  blobKey: string,
  storageClient: StorageClient,
): Promise<string> {
  if (!blobKey) return "";
  if (
    blobKey.startsWith("http") ||
    blobKey.startsWith("blob:") ||
    blobKey.startsWith("data:")
  ) {
    return blobKey;
  }
  if (blobKey.startsWith("sha256:")) {
    return storageClient.getDirectURL(blobKey);
  }
  return "";
}

// ─── ReelCard ───────────────────────────────────────────────────────────────────
interface ReelCardProps {
  reel: CombinedReel;
  isActive: boolean;
  onToggleLike: (reel: CombinedReel) => void;
}

function ReelCard({ reel, isActive, onToggleLike }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [showHeart, setShowHeart] = useState(false);
  const [muted, setMuted] = useState(true);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setLiked(reel.likedByMe);
    setLikeCount(reel.likes);
  }, [reel.likedByMe, reel.likes]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const triggerLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    onToggleLike({ ...reel, likedByMe: liked, likes: likeCount });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikeCount((c) => c + 1);
        onToggleLike({ ...reel, likedByMe: false, likes: likeCount });
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    lastTapRef.current = now;
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: touch-based double-tap interaction
    <div
      className="relative w-full flex-shrink-0"
      style={{ height: "100dvh", background: "#000" }}
      onClick={handleDoubleTap}
    >
      {/* Video */}
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          autoPlay={isActive}
          preload="auto"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "#111" }}
        >
          <Video size={48} color="#555" />
        </div>
      )}

      {/* Gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Heart size={80} fill="white" color="white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute toggle */}
      <button
        type="button"
        className="absolute top-14 right-4 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX size={18} color="white" />
        ) : (
          <Volume2 size={18} color="white" />
        )}
      </button>

      {/* Right actions */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation wrapper only */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{ bottom: 120 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            type="button"
            data-ocid="reel.like.button"
            whileTap={{ scale: 0.8 }}
            className="w-11 h-11 flex items-center justify-center"
            onClick={triggerLike}
            aria-label="Like"
          >
            <Heart
              size={28}
              fill={liked ? "#FF2D95" : "none"}
              color={liked ? "#FF2D95" : "white"}
              strokeWidth={1.8}
            />
          </motion.button>
          <span className="text-white text-xs font-semibold">
            {formatCount(likeCount)}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            type="button"
            data-ocid="reel.comment.button"
            whileTap={{ scale: 0.85 }}
            className="w-11 h-11 flex items-center justify-center"
            aria-label="Comment"
          >
            <MessageCircle size={28} color="white" strokeWidth={1.8} />
          </motion.button>
          <span className="text-white text-xs font-semibold">
            {formatCount(reel.comments)}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            type="button"
            data-ocid="reel.share.button"
            whileTap={{ scale: 0.85 }}
            className="w-11 h-11 flex items-center justify-center"
            aria-label="Share"
          >
            <Send size={26} color="white" strokeWidth={1.8} />
          </motion.button>
          <span className="text-white text-xs font-semibold">Share</span>
        </div>

        {/* Save */}
        <motion.button
          type="button"
          data-ocid="reel.save.button"
          whileTap={{ scale: 0.85 }}
          className="w-11 h-11 flex items-center justify-center"
          aria-label="Save"
        >
          <Bookmark size={26} color="white" strokeWidth={1.8} />
        </motion.button>

        {/* More */}
        <motion.button
          type="button"
          data-ocid="reel.more.button"
          whileTap={{ scale: 0.85 }}
          className="w-11 h-11 flex items-center justify-center"
          aria-label="More options"
        >
          <MoreHorizontal size={26} color="white" strokeWidth={1.8} />
        </motion.button>

        {/* Avatar */}
        <div className="relative mt-1">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base"
            style={{
              background: reel.avatarColor,
              border: "2px solid white",
            }}
          >
            {reel.username.slice(0, 1).toUpperCase()}
          </div>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#FF2D95", border: "2px solid black" }}
          >
            <span className="text-white text-[10px] font-bold">+</span>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation wrapper only */}
      <div
        className="absolute bottom-0 left-0 right-16 px-4"
        style={{
          paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-[15px]">
            @{reel.username}
          </span>
          <button
            type="button"
            className="px-3 py-0.5 rounded-full border border-white/70 text-white text-xs font-semibold"
          >
            Follow
          </button>
        </div>

        <p
          className="text-white text-sm leading-snug mb-3"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
        >
          {reel.caption.length > 80
            ? `${reel.caption.slice(0, 80)}...`
            : reel.caption}
        </p>

        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <Music2 size={11} color="white" />
          </div>
          <span className="text-white text-xs opacity-90">{reel.audio}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Sheet ───────────────────────────────────────────────────────────────
interface UploadSheetProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  actor: FullBackendInterface | null;
}

function UploadSheet({ open, onClose, onUploaded, actor }: UploadSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [audioLabel, setAudioLabel] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(f));
  };

  const handleClose = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setFile(null);
    setVideoPreviewUrl(null);
    setCaption("");
    setAudioLabel("");
    setUploadProgress(null);
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !file) throw new Error("Missing actor or file");

      const storageClient = await buildStorageClient();
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      setUploadProgress(0);
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setUploadProgress(pct);
      });

      await actor.createReel(
        hash,
        caption.trim(),
        audioLabel.trim() || "Original Audio",
      );
    },
    onSuccess: () => {
      toast.success("Reel uploaded! 🎬");
      onUploaded();
      handleClose();
    },
    onError: (err) => {
      console.error("Reel upload failed:", err);
      toast.error("Failed to upload reel. Try again.");
      setUploadProgress(null);
    },
  });

  const isUploading = uploadMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl"
        style={{
          background: "oklch(0.13 0.005 250)",
          border: "1px solid oklch(0.27 0.01 250)",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <SheetHeader className="mb-4">
          <SheetTitle style={{ color: "#F2F4F7" }}>Upload a Reel</SheetTitle>
        </SheetHeader>

        {/* Video picker */}
        <div className="mb-4">
          {!videoPreviewUrl ? (
            <button
              type="button"
              data-ocid="reel.upload_button"
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-colors"
              style={{
                background: "oklch(0.175 0.008 250)",
                border: "2px dashed oklch(0.27 0.01 250)",
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Video size={40} style={{ color: "#A8B0BA" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#A8B0BA" }}
              >
                Tap to select a video
              </span>
              <span
                className="text-xs"
                style={{ color: "oklch(0.45 0.01 250)" }}
              >
                MP4, MOV, WebM
              </span>
            </button>
          ) : (
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ aspectRatio: "9/16", maxHeight: 280 }}
            >
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                controls
              />
            </div>
          )}
          <input
            data-ocid="reel.dropzone"
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Caption */}
        <div className="mb-3">
          <label
            htmlFor="reel-caption"
            className="text-xs font-semibold mb-1 block"
            style={{ color: "#A8B0BA" }}
          >
            CAPTION
          </label>
          <Textarea
            id="reel-caption"
            data-ocid="reel.textarea"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={2}
            className="resize-none rounded-xl text-sm"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
              color: "#F2F4F7",
              fontSize: 16,
            }}
            disabled={isUploading}
            maxLength={2200}
          />
        </div>

        {/* Audio label */}
        <div className="mb-4">
          <label
            htmlFor="reel-audio-label"
            className="text-xs font-semibold mb-1 block"
            style={{ color: "#A8B0BA" }}
          >
            AUDIO LABEL
          </label>
          <Input
            id="reel-audio-label"
            data-ocid="reel.input"
            value={audioLabel}
            onChange={(e) => setAudioLabel(e.target.value)}
            placeholder="e.g. Original Audio - username"
            className="rounded-xl text-sm"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
              color: "#F2F4F7",
              fontSize: 16,
            }}
            disabled={isUploading}
          />
        </div>

        {/* Progress bar */}
        {uploadProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-semibold"
                style={{ color: "#F2F4F7" }}
              >
                Uploading video
              </span>
              <span className="text-xs font-bold" style={{ color: "#2F80FF" }}>
                {uploadProgress}%
              </span>
            </div>
            <Progress
              data-ocid="reel.loading_state"
              value={uploadProgress}
              className="h-1.5 rounded-full"
              style={{ background: "oklch(0.27 0.01 250)" }}
            />
          </div>
        )}

        {/* Submit */}
        <Button
          data-ocid="reel.submit_button"
          className="w-full rounded-full font-semibold"
          style={{
            background:
              file && !isUploading ? "#2F80FF" : "oklch(0.27 0.01 250)",
            color: file && !isUploading ? "white" : "#A8B0BA",
            border: "none",
          }}
          disabled={!file || isUploading}
          onClick={() => uploadMutation.mutate()}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" /> Share Reel
            </>
          )}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main ReelsScreen ────────────────────────────────────────────────────────────
export default function ReelsScreen() {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  // Fetch real reels and resolve their video URLs in one query
  const { data: realReels = [] } = useQuery<CombinedReel[]>({
    queryKey: ["reels"],
    queryFn: async () => {
      if (!actor) return [];
      const rawReels: ReelView[] = await actor.listReels();
      if (rawReels.length === 0) return [];

      // Resolve video URLs in parallel
      const storageClient = await buildStorageClient();
      const resolved = await Promise.all(
        rawReels.map(async (r): Promise<CombinedReel> => {
          const videoUrl = await resolveVideoUrl(
            r.videoBlobKey,
            storageClient,
          ).catch(() => "");
          return {
            key: Number(r.id),
            realId: r.id,
            username: r.authorUsername || r.author.toString().slice(0, 8),
            caption: r.caption,
            audio: r.audioLabel || "Original Audio",
            likes: Number(r.likeCount),
            comments: 0,
            videoUrl,
            avatarColor: getAvatarColor(
              r.authorUsername || r.author.toString(),
            ),
            likedByMe: r.likedByMe,
            isReal: true,
          };
        }),
      );
      return resolved;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
  });

  // Merge: real reels first, then mock fill-out
  const mockFallback: CombinedReel[] = SAMPLE_REELS.map((s) => ({
    key: s.id,
    username: s.username,
    caption: s.caption,
    audio: s.audio,
    likes: s.likes,
    comments: s.comments,
    videoUrl: s.videoUrl,
    avatarColor: s.avatarColor,
    likedByMe: s.likedByMe,
    isReal: false,
  }));

  const allReels: CombinedReel[] = [
    ...realReels,
    ...(realReels.length < 3 ? mockFallback : []),
  ];

  // Optimistic like toggle
  const handleToggleLike = async (reel: CombinedReel) => {
    if (!reel.isReal || reel.realId === undefined || !actor) return;
    try {
      await actor.toggleReelLike(reel.realId);
      queryClient.invalidateQueries({ queryKey: ["reels"] });
    } catch (e) {
      console.error("toggleReelLike failed:", e);
    }
  };

  // Snap scroll tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const idx = Math.round(scrollTop / height);
      setCurrentIndex(Math.min(idx, allReels.length - 1));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [allReels.length]);

  return (
    <div style={{ position: "relative" }}>
      {/* Scrollable reel container */}
      <div
        ref={containerRef}
        data-ocid="reels.list"
        className="w-full overflow-y-scroll"
        style={{
          height: "calc(100dvh - 64px)",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {allReels.map((reel, idx) => (
          <div
            key={reel.key}
            data-ocid={`reels.item.${idx + 1}`}
            style={{
              height: "calc(100dvh - 64px)",
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
            }}
          >
            <ReelCard
              reel={reel}
              isActive={currentIndex === idx}
              onToggleLike={handleToggleLike}
            />
          </div>
        ))}
      </div>

      {/* Upload FAB */}
      <motion.button
        type="button"
        data-ocid="reels.open_modal_button"
        className="absolute flex items-center justify-center rounded-full shadow-lg"
        style={{
          top: 12,
          right: 12,
          width: 40,
          height: 40,
          background: "rgba(0,0,0,0.55)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          zIndex: 20,
        }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setUploadSheetOpen(true)}
        aria-label="Upload reel"
      >
        <Plus size={22} color="white" />
      </motion.button>

      {/* Upload sheet */}
      <UploadSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onUploaded={() =>
          queryClient.invalidateQueries({ queryKey: ["reels"] })
        }
        actor={actor}
      />
    </div>
  );
}
