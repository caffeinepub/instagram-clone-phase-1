import type { Principal } from "@icp-sdk/core/principal";
import { ChevronLeft, ChevronRight, Eye, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FullBackendInterface, StoryView } from "../types/backend";
import { resolveBlobUrl } from "../utils/blobUrl";

const STORY_DURATION = 5000; // ms per story
const PRESET_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👏"];

function timeAgo(nanos: bigint): string {
  const ms = Number(nanos) / 1_000_000;
  const diffMs = Date.now() - ms;
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

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

interface StoryViewerProps {
  stories: StoryView[];
  initialIndex: number;
  onClose: () => void;
  myPrincipal: Principal | undefined;
  actor: FullBackendInterface | null;
  storageConfig: {
    storageGatewayUrl: string;
    backendCanisterId: string;
    projectId: string;
  };
}

export default function StoryViewer({
  stories,
  initialIndex,
  onClose,
  myPrincipal,
  actor,
  storageConfig,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [reactedEmoji, setReactedEmoji] = useState<string | null>(null);
  const [viewerListOpen, setViewerListOpen] = useState(false);
  const [pollAnswer, setPollAnswer] = useState<"A" | "B" | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionSent, setQuestionSent] = useState(false);

  const progressRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const story = stories[currentIndex];

  const isOwnStory = useMemo(
    () =>
      myPrincipal && story
        ? story.author.toString() === myPrincipal.toString()
        : false,
    [story, myPrincipal],
  );

  const resolveUrl = useCallback(
    (key: string) =>
      resolveBlobUrl(
        key,
        storageConfig.storageGatewayUrl,
        storageConfig.backendCanisterId,
        storageConfig.projectId,
      ),
    [storageConfig],
  );

  const imageUrl = story?.imageBlobKey ? resolveUrl(story.imageBlobKey) : null;
  const videoUrl = story?.videoBlobKey ? resolveUrl(story.videoBlobKey) : null;
  const avatarUrl = story?.authorAvatarBlobKey
    ? resolveUrl(story.authorAvatarBlobKey)
    : null;

  // Mark story as viewed when it appears
  useEffect(() => {
    if (!story || !actor) return;
    actor.viewStory(story.id).catch(console.warn);
  }, [story, actor]);

  // Progress animation
  const advance = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
      progressRef.current = 0;
      setReactedEmoji(null);
      setPollAnswer(null);
      setQuestionAnswer("");
      setQuestionSent(false);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    startTimeRef.current = performance.now();
    cancelAnimationFrame(animFrameRef.current);

    const animate = (now: number) => {
      if (paused) {
        pausedAtRef.current = now;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed =
        now - startTimeRef.current - (pausedAtRef.current > 0 ? 0 : 0);
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      progressRef.current = pct;
      if (pct < 100) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        advance();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [paused, advance]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
      setReactedEmoji(null);
      setPollAnswer(null);
      setQuestionAnswer("");
      setQuestionSent(false);
    }
  };

  const goToNext = () => advance();

  const handleReact = async (emoji: string) => {
    if (!actor || !story) return;
    setReactedEmoji(emoji);
    try {
      await actor.reactToStory(story.id, emoji);
    } catch (e) {
      console.warn("reactToStory failed:", e);
    }
  };

  const handleReply = async () => {
    if (!actor || !story || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await actor.sendMessage(
        story.author,
        `Replied to story: ${replyText.trim()}`,
      );
      setReplyText("");
    } catch (e) {
      console.warn("sendMessage failed:", e);
    } finally {
      setSendingReply(false);
    }
  };

  const handleVotePoll = async (option: "A" | "B") => {
    if (!actor || !story || pollAnswer) return;
    setPollAnswer(option);
    try {
      await actor.votePoll(story.id, option);
    } catch (e) {
      console.warn("votePoll failed:", e);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!actor || !story || !questionAnswer.trim() || questionSent) return;
    setQuestionSent(true);
    try {
      await actor.answerQuestion(story.id, questionAnswer.trim());
    } catch (e) {
      console.warn("answerQuestion failed:", e);
    }
  };

  if (!story) return null;

  const username = story.authorUsername || story.author.toString().slice(0, 8);
  const avatarColor = getAvatarColor(username);
  const hasPoll = story.sticker?.__kind__ === "poll";
  const hasQuestion = story.sticker?.__kind__ === "question";
  const poll =
    hasPoll && story.sticker?.__kind__ === "poll" ? story.sticker.poll : null;
  const question =
    hasQuestion && story.sticker?.__kind__ === "question"
      ? story.sticker.question
      : null;

  const totalVotes = poll ? poll.votesA.length + poll.votesB.length : 0;
  const votePctA =
    totalVotes > 0 ? Math.round((poll!.votesA.length / totalVotes) * 100) : 50;
  const votePctB = 100 - votePctA;

  return (
    <AnimatePresence>
      <motion.div
        key="story-viewer"
        data-ocid="stories.modal"
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "#000", maxWidth: 480, margin: "0 auto" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Progress bars */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        >
          {stories.map((s, idx) => (
            <div
              key={String(s.id)}
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 2, background: "rgba(255,255,255,0.3)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: "white",
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                        ? `${progress}%`
                        : "0%",
                  transition: idx === currentIndex ? "none" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div
          className="absolute left-0 right-0 z-20 flex items-center gap-3 px-4"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
        >
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{
              background: avatarColor,
              border: "1.5px solid rgba(255,255,255,0.6)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(username)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {username}
            </p>
            <p className="text-white/60 text-xs">{timeAgo(story.createdAt)}</p>
          </div>
          {/* Close */}
          <button
            type="button"
            data-ocid="stories.close_button"
            className="p-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={onClose}
            aria-label="Close story"
          >
            <X size={20} color="white" />
          </button>
        </div>

        {/* Media */}
        <div
          className="absolute inset-0"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="story"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}44, #000)`,
              }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold text-white"
                style={{ background: avatarColor }}
              >
                {getInitials(username)}
              </div>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        {/* Tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <button
            type="button"
            className="flex-1 h-full focus:outline-none"
            aria-label="Previous story"
            onClick={goToPrev}
          />
          <button
            type="button"
            className="flex-1 h-full focus:outline-none"
            aria-label="Next story"
            onClick={goToNext}
          />
        </div>

        {/* Poll sticker */}
        {hasPoll && poll && (
          <div className="absolute z-20 left-4 right-4" style={{ top: "55%" }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
              }}
            >
              <p className="text-white font-semibold text-center mb-3">
                {poll.question}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="stories.toggle"
                  className="flex-1 rounded-xl py-3 font-semibold text-sm relative overflow-hidden transition-all"
                  style={{
                    background:
                      pollAnswer === "A" ? "#FF2D95" : "rgba(255,255,255,0.15)",
                    color: "white",
                    border:
                      pollAnswer === "A"
                        ? "none"
                        : "1.5px solid rgba(255,255,255,0.4)",
                  }}
                  onClick={() => handleVotePoll("A")}
                  disabled={!!pollAnswer}
                >
                  <span>{poll.optionA}</span>
                  {pollAnswer && (
                    <span className="block text-xs opacity-80 mt-0.5">
                      {votePctA}%
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  data-ocid="stories.toggle"
                  className="flex-1 rounded-xl py-3 font-semibold text-sm transition-all"
                  style={{
                    background:
                      pollAnswer === "B" ? "#2F80FF" : "rgba(255,255,255,0.15)",
                    color: "white",
                    border:
                      pollAnswer === "B"
                        ? "none"
                        : "1.5px solid rgba(255,255,255,0.4)",
                  }}
                  onClick={() => handleVotePoll("B")}
                  disabled={!!pollAnswer}
                >
                  <span>{poll.optionB}</span>
                  {pollAnswer && (
                    <span className="block text-xs opacity-80 mt-0.5">
                      {votePctB}%
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question sticker */}
        {hasQuestion && question && (
          <div className="absolute z-20 left-4 right-4" style={{ top: "50%" }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
              }}
            >
              <p className="text-white font-semibold text-center mb-3">
                🙋 {question.question}
              </p>
              {questionSent ? (
                <p className="text-center text-white/70 text-sm py-2">
                  Answer sent! ✓
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={questionAnswer}
                    onChange={(e) => setQuestionAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      fontSize: 16,
                      outline: "none",
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAnswerQuestion()
                    }
                  />
                  <button
                    type="button"
                    data-ocid="stories.submit_button"
                    className="px-4 rounded-xl font-semibold text-sm"
                    style={{ background: "#FF2D95", color: "white" }}
                    onClick={handleAnswerQuestion}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Own story: viewer count */}
        {isOwnStory && (
          <div className="absolute z-20 left-4 bottom-40">
            <button
              type="button"
              data-ocid="stories.secondary_button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setViewerListOpen((o) => !o)}
            >
              <Eye size={14} color="white" />
              <span className="text-white text-xs font-semibold">
                {story.viewerList.length} viewer
                {story.viewerList.length !== 1 ? "s" : ""}
              </span>
            </button>
            {viewerListOpen && story.viewerList.length > 0 && (
              <div
                className="mt-2 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(8px)",
                  maxHeight: 160,
                  overflowY: "auto",
                  minWidth: 180,
                }}
              >
                {story.viewerList.map((p) => (
                  <div
                    key={p.toString()}
                    className="px-3 py-1.5 text-white text-xs font-mono border-b last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    {p.toString().slice(0, 24)}…
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom: reactions + reply */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          }}
        >
          {/* Emoji reactions */}
          {!isOwnStory && (
            <div className="flex justify-center gap-2 mb-3">
              {PRESET_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  type="button"
                  data-ocid="stories.toggle"
                  whileTap={{ scale: 1.4 }}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all"
                  style={{
                    background:
                      reactedEmoji === emoji
                        ? "rgba(255,45,149,0.35)"
                        : "rgba(0,0,0,0.45)",
                    border:
                      reactedEmoji === emoji
                        ? "1.5px solid #FF2D95"
                        : "1px solid rgba(255,255,255,0.2)",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={() => handleReact(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          )}

          {/* Reply input */}
          {!isOwnStory && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                data-ocid="stories.input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${username}...`}
                className="flex-1 rounded-full px-4 py-2.5 text-sm text-white"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  fontSize: 16,
                  outline: "none",
                }}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <motion.button
                type="button"
                data-ocid="stories.submit_button"
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: replyText.trim()
                    ? "#FF2D95"
                    : "rgba(255,255,255,0.15)",
                }}
                onClick={handleReply}
                disabled={sendingReply || !replyText.trim()}
                aria-label="Send reply"
              >
                <Send size={16} color="white" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Prev / Next chevrons (optional visual hint) */}
        {currentIndex > 0 && (
          <div className="absolute z-20 left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <ChevronLeft size={24} color="white" />
          </div>
        )}
        {currentIndex < stories.length - 1 && (
          <div className="absolute z-20 right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <ChevronRight size={24} color="white" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
