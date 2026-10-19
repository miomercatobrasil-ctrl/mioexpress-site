"use client";

import { useEffect, useRef, useState } from "react";

/** Vídeo vertical: carrega só perto da tela, toca sem som em loop; botão para assistir com som. */
export function VideoCard({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setNear(true);
        if (!e.isIntersecting) v.pause();
        else if (!reduced || sound) v.play().catch(() => {});
      },
      { rootMargin: "200px 0px", threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [sound]);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    const next = !sound;
    setSound(next);
    v.muted = !next;
    if (next) v.currentTime = 0;
    v.play().catch(() => {});
  };

  return (
    <div className={`video-card${sound ? " has-sound" : ""}`}>
      <video
        ref={ref}
        src={near ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onClick={toggleSound}
      />
      <button type="button" className="video-card__btn" onClick={toggleSound} aria-pressed={sound}>
        <span className="video-card__icon" aria-hidden>
          {sound ? "❚❚" : "▶"}
        </span>
        {sound ? "Sem som" : "Assistir com som"}
      </button>
    </div>
  );
}
