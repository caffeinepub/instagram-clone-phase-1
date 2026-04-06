import { useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: React.ReactNode;
}

export function LazyImage({
  src,
  alt = "",
  className,
  style,
  placeholder,
}: LazyImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const defaultPlaceholder = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "oklch(0.175 0.008 250)",
        animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      }}
    />
  );

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, position: "relative" }}
    >
      {inView && src ? (
        <>
          {!loaded && (placeholder ?? defaultPlaceholder)}
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        (placeholder ?? defaultPlaceholder)
      )}
    </div>
  );
}
