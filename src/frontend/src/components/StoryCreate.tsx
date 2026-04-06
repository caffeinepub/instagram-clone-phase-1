import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, HelpCircle, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { loadConfig } from "../config";
import type { FullBackendInterface } from "../types/backend";
import { StorageClient } from "../utils/StorageClient";

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

type StickerType = "poll" | "question" | null;

interface StoryCreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  actor: FullBackendInterface | null;
}

export default function StoryCreate({
  open,
  onClose,
  onCreated,
  actor,
}: StoryCreateProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [stickerType, setStickerType] = useState<StickerType>(null);
  // Poll sticker fields
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionA, setPollOptionA] = useState("");
  const [pollOptionB, setPollOptionB] = useState("");
  // Question sticker field
  const [questionText, setQuestionText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setIsVideo(f.type.startsWith("video/"));
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setUploadProgress(null);
    setStickerType(null);
    setPollQuestion("");
    setPollOptionA("");
    setPollOptionB("");
    setQuestionText("");
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

      const imageBlobKey = isVideo ? "" : hash;
      const videoBlobKey = isVideo ? hash : "";

      await actor.createStory(imageBlobKey, videoBlobKey);
    },
    onSuccess: () => {
      toast.success("Story shared! ✨");
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      onCreated();
      handleClose();
    },
    onError: (err) => {
      console.error("Story upload failed:", err);
      toast.error("Failed to upload story. Try again.");
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
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        <SheetHeader className="mb-4">
          <SheetTitle style={{ color: "#F2F4F7" }}>Add to Story</SheetTitle>
        </SheetHeader>

        {/* File picker */}
        <div className="mb-4">
          {!previewUrl ? (
            <button
              type="button"
              data-ocid="stories.upload_button"
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-colors"
              style={{
                background: "oklch(0.175 0.008 250)",
                border: "2px dashed oklch(0.27 0.01 250)",
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera size={40} style={{ color: "#A8B0BA" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#A8B0BA" }}
              >
                Tap to pick photo or video
              </span>
              <span
                className="text-xs"
                style={{ color: "oklch(0.45 0.01 250)" }}
              >
                JPG, PNG, GIF, MP4, MOV
              </span>
            </button>
          ) : (
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ aspectRatio: "9/16", maxHeight: 300 }}
            >
              {isVideo ? (
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)" }}
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setFile(null);
                  setPreviewUrl(null);
                  setIsVideo(false);
                }}
                aria-label="Remove file"
              >
                <X size={14} color="white" />
              </button>
            </div>
          )}
          <input
            data-ocid="stories.dropzone"
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Sticker options */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            data-ocid="stories.toggle"
            className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background:
                stickerType === "poll" ? "#2F80FF" : "oklch(0.22 0.008 250)",
              color: stickerType === "poll" ? "white" : "#A8B0BA",
              border:
                stickerType === "poll"
                  ? "none"
                  : "1px solid oklch(0.27 0.01 250)",
            }}
            onClick={() =>
              setStickerType(stickerType === "poll" ? null : "poll")
            }
          >
            📊 Poll
          </button>
          <button
            type="button"
            data-ocid="stories.toggle"
            className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background:
                stickerType === "question"
                  ? "#FF2D95"
                  : "oklch(0.22 0.008 250)",
              color: stickerType === "question" ? "white" : "#A8B0BA",
              border:
                stickerType === "question"
                  ? "none"
                  : "1px solid oklch(0.27 0.01 250)",
            }}
            onClick={() =>
              setStickerType(stickerType === "question" ? null : "question")
            }
          >
            <HelpCircle size={13} className="inline mr-1" />
            Question
          </button>
        </div>

        {/* Poll fields */}
        {stickerType === "poll" && (
          <div
            className="rounded-2xl p-4 mb-4 space-y-3"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid #2F80FF40",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "#2F80FF" }}>
              📊 POLL STICKER
            </p>
            <Input
              data-ocid="stories.input"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask a question..."
              style={{
                background: "oklch(0.22 0.008 250)",
                border: "1px solid oklch(0.27 0.01 250)",
                color: "#F2F4F7",
                fontSize: 16,
              }}
            />
            <div className="flex gap-2">
              <Input
                data-ocid="stories.input"
                value={pollOptionA}
                onChange={(e) => setPollOptionA(e.target.value)}
                placeholder="Option A"
                style={{
                  background: "oklch(0.22 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
              />
              <Input
                data-ocid="stories.input"
                value={pollOptionB}
                onChange={(e) => setPollOptionB(e.target.value)}
                placeholder="Option B"
                style={{
                  background: "oklch(0.22 0.008 250)",
                  border: "1px solid oklch(0.27 0.01 250)",
                  color: "#F2F4F7",
                  fontSize: 16,
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
              Note: Poll sticker will display on your story (saved with next
              backend update)
            </p>
          </div>
        )}

        {/* Question fields */}
        {stickerType === "question" && (
          <div
            className="rounded-2xl p-4 mb-4 space-y-3"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid #FF2D9540",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "#FF2D95" }}>
              🙋 QUESTION STICKER
            </p>
            <Input
              data-ocid="stories.input"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask your followers..."
              style={{
                background: "oklch(0.22 0.008 250)",
                border: "1px solid oklch(0.27 0.01 250)",
                color: "#F2F4F7",
                fontSize: 16,
              }}
            />
            <p className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
              Note: Question sticker will display on your story (saved with next
              backend update)
            </p>
          </div>
        )}

        {/* Progress bar */}
        {uploadProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-semibold"
                style={{ color: "#F2F4F7" }}
              >
                Uploading story
              </span>
              <span className="text-xs font-bold" style={{ color: "#FF2D95" }}>
                {uploadProgress}%
              </span>
            </div>
            <Progress
              data-ocid="stories.loading_state"
              value={uploadProgress}
              className="h-1.5 rounded-full"
              style={{ background: "oklch(0.27 0.01 250)" }}
            />
          </div>
        )}

        {/* Submit */}
        <Button
          data-ocid="stories.submit_button"
          className="w-full rounded-full font-semibold"
          style={{
            background:
              file && !isUploading
                ? "linear-gradient(135deg, #FF2D95, #FF6A00)"
                : "oklch(0.27 0.01 250)",
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
              <Upload className="mr-2 h-4 w-4" /> Share Story
            </>
          )}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
