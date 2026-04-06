import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import type { FullBackendInterface, Profile } from "../types/backend";
import { StorageClient } from "../utils/StorageClient";

interface CreateScreenProps {
  onPostCreated: () => void;
}

export default function CreateScreen({ onPostCreated }: CreateScreenProps) {
  const { actor: rawActor, isFetching: actorFetching } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myProfile = null } = useQuery<Profile | null>({
    queryKey: ["myProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyProfile();
    },
    enabled: !!actor && !actorFetching,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleRemoveImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !file) throw new Error("No file or actor");

      // Load config to get storage credentials
      const config = await loadConfig();

      // Create an HttpAgent with the same host config
      const { HttpAgent } = await import("@icp-sdk/core/agent");
      const agent = new HttpAgent({
        host: config.backend_host,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(console.warn);
      }

      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      // Read file as Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Upload with progress tracking
      setUploadProgress(0);
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setUploadProgress(pct);
      });

      // Create post with the real blob hash
      await actor.createPost(hash, caption);
    },
    onSuccess: () => {
      toast.success("Post shared!");
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["listPosts"] });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setFile(null);
      setCaption("");
      setUploadProgress(null);
      onPostCreated();
    },
    onError: (err) => {
      console.error("Failed to create post:", err);
      toast.error("Failed to share post. Try again.");
      setUploadProgress(null);
    },
  });

  const handleSubmit = () => {
    if (!file) {
      toast.error("Please select an image first.");
      return;
    }
    createPostMutation.mutate();
  };

  const noProfile = !myProfile;
  const isUploading = createPostMutation.isPending;

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
          New Post
        </h1>
        <Button
          data-ocid="create.submit_button"
          size="sm"
          className="rounded-full px-4 text-sm font-semibold"
          style={{
            background:
              file && !isUploading ? "#2F80FF" : "oklch(0.27 0.01 250)",
            color: file && !isUploading ? "white" : "#A8B0BA",
            border: "none",
          }}
          onClick={handleSubmit}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            "Share"
          )}
        </Button>
      </header>

      {noProfile && (
        <div
          className="mx-4 mt-4 p-4 rounded-xl"
          style={{
            background: "oklch(0.22 0.008 250)",
            border: "1px solid #2F80FF40",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "#F2F4F7" }}>
            Set up your profile first
          </p>
          <p className="text-xs mt-1" style={{ color: "#A8B0BA" }}>
            Go to the Profile tab to set your username before posting.
          </p>
        </div>
      )}

      {/* Image Picker */}
      <div className="px-4 pt-4">
        {!preview ? (
          <button
            type="button"
            data-ocid="create.upload_button"
            className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "2px dashed oklch(0.27 0.01 250)",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={48} style={{ color: "#A8B0BA" }} />
            <p className="text-sm font-medium" style={{ color: "#A8B0BA" }}>
              Tap to select a photo
            </p>
            <p className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
              JPG, PNG, GIF up to 10MB
            </p>
          </button>
        ) : (
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!isUploading && (
              <button
                type="button"
                data-ocid="create.close_button"
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)" }}
                onClick={handleRemoveImage}
              >
                <X size={16} color="white" />
              </button>
            )}
            {/* Upload overlay */}
            {isUploading && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <div className="flex flex-col items-center gap-3 px-6 w-full">
                  <Loader2
                    size={36}
                    className="animate-spin"
                    style={{ color: "white" }}
                  />
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "white" }}
                  >
                    Uploading photo...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        <input
          data-ocid="create.dropzone"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="px-4 mt-3">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.175 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
              padding: "12px 14px",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-semibold"
                style={{ color: "#F2F4F7" }}
              >
                Uploading to storage
              </span>
              <span className="text-xs font-bold" style={{ color: "#2F80FF" }}>
                {uploadProgress}%
              </span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 6, background: "oklch(0.27 0.01 250)" }}
            >
              <div
                data-ocid="create.loading_state"
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress}%`,
                  background:
                    "linear-gradient(90deg, #FF2D95, #FF6A00, #FFC700)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Caption */}
      <div className="px-4 mt-4">
        <Textarea
          data-ocid="create.textarea"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={3}
          className="resize-none rounded-xl text-sm"
          style={{
            background: "oklch(0.175 0.008 250)",
            border: "1px solid oklch(0.27 0.01 250)",
            color: "#F2F4F7",
            fontSize: 16,
          }}
          maxLength={2200}
          disabled={isUploading}
        />
        <p className="text-right text-xs mt-1" style={{ color: "#A8B0BA" }}>
          {caption.length}/2200
        </p>
      </div>

      {/* Tips */}
      <div className="px-4 mt-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{
            background: "oklch(0.175 0.008 250)",
            border: "1px solid oklch(0.27 0.01 250)",
          }}
        >
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "#A8B0BA" }}
          >
            TIPS
          </p>
          <ul className="space-y-1">
            {[
              "Use natural lighting for better photos",
              "Square crops work best for the feed",
              "Add a meaningful caption to tell your story",
            ].map((tip) => (
              <li key={tip} className="text-xs" style={{ color: "#A8B0BA" }}>
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
