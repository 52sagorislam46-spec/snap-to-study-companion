import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [show, setShow] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || sessionStorage.getItem("install-hidden")) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    if (ios) setShow(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = window.setTimeout(() => setShow(true), 2500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  if (!show) return null;

  const install = async () => {
    if (evt) {
      await evt.prompt();
      const r = await evt.userChoice;
      if (r.outcome === "accepted") setShow(false);
      setEvt(null);
    } else {
      setHelp(true);
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border bg-card p-3 text-card-foreground shadow-lg">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">পরীক্ষাসাথী ফোনে রাখুন</p>
          <p className="text-muted-foreground">এক ট্যাপে অ্যাপের মতো খুলবে</p>
        </div>
        <Button size="sm" onClick={install}>
          <Download className="mr-1 h-4 w-4" /> অ্যাপ ইনস্টল করুন
        </Button>
        <button
          aria-label="বন্ধ করুন"
          className="text-muted-foreground"
          onClick={() => {
            sessionStorage.setItem("install-hidden", "1");
            setShow(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {help && (
        <p className="mt-2 text-sm text-muted-foreground">
          {isIos
            ? "Safari-তে নিচের শেয়ার (⬆) বোতাম চাপুন, তারপর “Add to Home Screen” বেছে নিন।"
            : "ব্রাউজারের উপরের ⋮ মেনু চাপুন, তারপর “Install app” বা “Add to Home screen” বেছে নিন।"}
        </p>
      )}
    </div>
  );
}
