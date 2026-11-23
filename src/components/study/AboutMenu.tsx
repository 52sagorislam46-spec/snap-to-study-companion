import { useState } from "react";
import { Info, Smartphone, UserRound, ArrowLeft } from "lucide-react";
import sagorPhoto from "@/assets/sagor_profile.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type View = "menu" | "app" | "creator";

export function AboutMenu() {
  const [view, setView] = useState<View>("menu");
  return (
    <Dialog onOpenChange={(open) => !open && setView("menu")}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="পরিচিতি" className="shrink-0 rounded-full">
          <Info className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {view === "menu" ? "পরিচিতি" : view === "app" ? "অ্যাপ পরিচিতি" : "নির্মাতা"}
          </DialogTitle>
          <DialogDescription>
            {view === "menu" ? "যেকোনো একটি আইকনে চাপ দিন" : "পরীক্ষাসাথী"}
          </DialogDescription>
        </DialogHeader>

        {view === "menu" && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setView("app")} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary p-4 text-sm font-semibold transition hover:border-primary">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Smartphone /></span>
              অ্যাপ পরিচিতি
            </button>
            <button type="button" onClick={() => setView("creator")} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary p-4 text-sm font-semibold transition hover:border-primary">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserRound /></span>
              নির্মাতা
            </button>
          </div>
        )}

        {view === "app" && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>পরীক্ষার শেষ মুহূর্তে সাজেশনের অনেক ছবি থেকে সব প্রশ্ন গুছিয়ে উত্তরসহ সাজিয়ে দেয়, আর বাংলা কণ্ঠে উত্তর পড়ে শোনায়।</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>বিষয়, শ্রেণি ও পরীক্ষার সময় লিখুন।</li>
              <li>সাজেশনের ছবি দিন (১–২০টি)। ছবি না থাকলেও চলবে।</li>
              <li>বোতাম চাপলেই সংক্ষিপ্ত, মাঝারি ও বর্ণনামূলক প্রশ্ন আলাদা আলাদা উত্তরসহ পাবেন। 🔊 চাপলে শুনতে পারবেন।</li>
            </ol>
          </div>
        )}

        {view === "creator" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <img src={sagorPhoto.url} alt="সাগর (Sagor)" className="size-28 rounded-full object-cover ring-4 ring-accent shadow-[var(--shadow-elegant)]" />
            <p className="text-lg font-bold">সাগর (Sagor)</p>
            <p className="text-sm text-muted-foreground">শিক্ষার্থীরা যেন পরীক্ষার শেষ মুহূর্তে সহজে ও দ্রুত প্রস্তুতি নিতে পারে, সেজন্য এই অ্যাপটি তৈরি করেছেন।</p>
          </div>
        )}

        {view !== "menu" && (
          <Button variant="ghost" onClick={() => setView("menu")} className="gap-2">
            <ArrowLeft className="size-4" /> ফিরে যান
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
