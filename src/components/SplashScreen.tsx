import { useEffect, useState } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 1800);
    const t2 = setTimeout(() => setPhase("gone"), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-500 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <img
          src="/icon-512.png"
          alt=""
          className="splash-logo h-28 w-28 rounded-[28%] shadow-2xl ring-2 ring-accent/60"
        />
        <h1 className="text-3xl font-bold tracking-wide">পরীক্ষাসাথী</h1>
        <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="splash-bar h-full rounded-full bg-accent" />
        </div>
        <p className="text-sm opacity-80">অ্যাপ প্রস্তুত হচ্ছে...</p>
      </div>
      <p className="pb-10 text-xs tracking-wider opacity-70">from সাগর</p>
    </div>
  );
}
