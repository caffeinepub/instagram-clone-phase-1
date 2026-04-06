import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthGate() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: "#0B0D10" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, #FF2D95 0%, #FF6A00 50%, #FFC700 100%)",
            }}
          >
            <span
              className="text-white font-bold text-4xl"
              style={{ fontFamily: "serif", fontStyle: "italic" }}
            >
              I
            </span>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "#F2F4F7" }}
          >
            InstaClone
          </h1>
          <p className="text-center text-sm" style={{ color: "#A8B0BA" }}>
            Share your moments with the world.
            <br />
            Connect, create, inspire.
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-2">
          {[
            { emoji: "📸", text: "Share photos and stories" },
            { emoji: "❤️", text: "Like and comment on posts" },
            { emoji: "🌍", text: "Follow people you love" },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#1A1F24" }}
            >
              <span className="text-xl">{f.emoji}</span>
              <span className="text-sm" style={{ color: "#F2F4F7" }}>
                {f.text}
              </span>
            </div>
          ))}
        </div>

        {/* Sign In Button */}
        <Button
          data-ocid="auth.primary_button"
          className="w-full h-12 rounded-xl text-base font-semibold"
          style={{
            background:
              "linear-gradient(135deg, #FF2D95 0%, #FF6A00 50%, #FFC700 100%)",
            color: "white",
            border: "none",
          }}
          onClick={login}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
            </>
          ) : (
            "Sign in with Internet Identity"
          )}
        </Button>

        <p className="text-xs text-center" style={{ color: "#A8B0BA" }}>
          Secure, decentralized login powered by the Internet Computer
        </p>
      </motion.div>
    </div>
  );
}
