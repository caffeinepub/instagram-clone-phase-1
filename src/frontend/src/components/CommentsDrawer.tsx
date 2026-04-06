import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import type { Comment, FullBackendInterface } from "../types/backend";

interface CommentsDrawerProps {
  postId: bigint | null;
  open: boolean;
  onClose: () => void;
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

const SAMPLE_COMMENTS: Comment[] = [
  {
    id: BigInt(1),
    postId: BigInt(0),
    author: {} as any,
    text: "Absolutely stunning! 😍",
    createdAt: BigInt(Date.now() * 1e6 - 3600000 * 1e6),
  },
  {
    id: BigInt(2),
    postId: BigInt(0),
    author: {} as any,
    text: "Love this shot! 🔥",
    createdAt: BigInt(Date.now() * 1e6 - 7200000 * 1e6),
  },
  {
    id: BigInt(3),
    postId: BigInt(0),
    author: {} as any,
    text: "Where was this taken?",
    createdAt: BigInt(Date.now() * 1e6 - 86400000 * 1e6),
  },
];

export default function CommentsDrawer({
  postId,
  open,
  onClose,
}: CommentsDrawerProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackendInterface | null;
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!actor || !postId) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !!postId && open,
  });

  const displayComments =
    comments.length > 0 ? comments : open ? SAMPLE_COMMENTS : [];

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!actor || !postId) return;
      await actor.addComment(postId, text);
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: ["comments", postId?.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const handleSubmit = () => {
    const text = commentText.trim();
    if (!text) return;
    addCommentMutation.mutate(text);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DrawerContent
        data-ocid="comments.sheet"
        style={{
          background: "oklch(0.175 0.008 250)",
          border: "none",
          borderTop: "1px solid oklch(0.27 0.01 250)",
          maxHeight: "80vh",
        }}
      >
        <DrawerHeader className="pb-2 px-4">
          <div className="flex items-center justify-between">
            <DrawerTitle style={{ color: "#F2F4F7" }}>Comments</DrawerTitle>
            <DrawerClose asChild>
              <Button
                data-ocid="comments.close_button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                style={{ color: "#A8B0BA" }}
                onClick={onClose}
              >
                <X size={20} />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "oklch(0.27 0.01 250)",
            margin: "0 16px",
          }}
        />

        {/* Comments List */}
        <div
          className="overflow-y-auto flex-1 px-4 py-3"
          style={{ maxHeight: "50vh" }}
        >
          {displayComments.length === 0 ? (
            <div
              data-ocid="comments.empty_state"
              className="text-center py-8"
              style={{ color: "#A8B0BA" }}
            >
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayComments.map((comment, idx) => {
                const authorStr = comment.author.toString();
                const avatarColor = getAvatarColor(authorStr);
                const initial = authorStr.slice(0, 1).toUpperCase();
                return (
                  <div
                    key={String(comment.id)}
                    data-ocid={`comments.item.${idx + 1}`}
                    className="flex gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ background: avatarColor }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-semibold mr-2"
                        style={{ color: "#F2F4F7" }}
                      >
                        {authorStr.slice(0, 10)}
                      </span>
                      <span className="text-sm" style={{ color: "#F2F4F7" }}>
                        {comment.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 flex gap-2 items-center"
          style={{ borderTop: "1px solid oklch(0.27 0.01 250)" }}
        >
          <Input
            data-ocid="comments.input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-full text-sm"
            style={{
              background: "oklch(0.22 0.008 250)",
              border: "1px solid oklch(0.27 0.01 250)",
              color: "#F2F4F7",
              fontSize: 16,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <Button
            data-ocid="comments.submit_button"
            size="icon"
            className="rounded-full flex-shrink-0 w-9 h-9"
            style={{ background: "#2F80FF" }}
            onClick={handleSubmit}
            disabled={!commentText.trim() || addCommentMutation.isPending}
          >
            <Send size={16} color="white" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
