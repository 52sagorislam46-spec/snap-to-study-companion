import { createFileRoute } from "@tanstack/react-router";

import { StudyApp } from "@/components/study/StudyApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "পরীক্ষা সহায়ক — সাজেশন থেকে প্রশ্ন-উত্তর" },
      { name: "description", content: "সাজেশনের ছবি দিন, গুরুত্ব অনুযায়ী প্রশ্ন-উত্তর পান এবং এআই ভয়েসে শুনুন।" },
      { property: "og:title", content: "পরীক্ষা সহায়ক — সাজেশন থেকে প্রশ্ন-উত্তর" },
      { property: "og:description", content: "সাজেশনের ছবি থেকে সংক্ষিপ্ত, মাঝারি ও বর্ণনামূলক প্রশ্ন-উত্তর ও ভয়েস।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyApp,
});
