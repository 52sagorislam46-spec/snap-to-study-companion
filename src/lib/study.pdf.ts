import type { StudyPack, QuestionKind } from "@/lib/study.types";

const kindTitle: Record<QuestionKind, string> = {
  short: "সংক্ষিপ্ত প্রশ্ন (২ নম্বর)",
  medium: "মাঝারি প্রশ্ন",
  long: "বর্ণনামূলক প্রশ্ন (৩ নম্বর)",
  writing: "দরখাস্ত / পত্র / রচনা",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function block(html: string) {
  const el = document.createElement("div");
  el.style.cssText = "padding:10px 0;font-family:'Noto Sans Bengali',sans-serif;color:#1b2b24;font-size:15px;line-height:1.7";
  el.innerHTML = html;
  return el;
}

export async function buildStudyPdf(pack: StudyPack): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:720px;background:#ffffff;padding:0 24px";
  document.body.appendChild(host);

  const blocks: HTMLElement[] = [];
  blocks.push(block(`<div style="background:#0f3b2e;color:#f5e6b8;border-radius:12px;padding:20px"><div style="font-size:13px;opacity:.8">পরীক্ষাসাথী</div><div style="font-size:24px;font-weight:700">${esc(pack.title)}</div><div style="color:#e8efe9;margin-top:6px">${esc(pack.summary)}</div></div>`));
  (["short", "medium", "long", "writing"] as QuestionKind[]).forEach((k) => {
    const qs = pack.questions[k] ?? [];
    if (!qs.length) return;
    blocks.push(block(`<div style="font-size:19px;font-weight:700;color:#0f3b2e;border-bottom:2px solid #c9a24a;padding-bottom:4px">${kindTitle[k]} — ${qs.length}টি</div>`));
    qs.forEach((q, i) => {
      blocks.push(block(`<div style="border:1px solid #dfe7e2;border-radius:10px;padding:12px 14px"><div style="font-weight:700">${i + 1}. ${esc(q.question)}</div><div style="font-size:12px;color:#7a6a3a">${esc(q.topic)}</div><div style="white-space:pre-wrap;margin-top:6px">${esc(q.answer)}</div></div>`));
    });
  });
  if (pack.studyPlan.length) {
    blocks.push(block(`<div style="font-size:19px;font-weight:700;color:#0f3b2e;border-bottom:2px solid #c9a24a">পড়ার পরিকল্পনা</div>` + pack.studyPlan.map((p) => `<div><b>${esc(p.time)}:</b> ${esc(p.task)}</div>`).join("")));
  }
  blocks.forEach((b) => host.appendChild(b));
  await document.fonts?.ready;

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const m = 28;
  const usable = pw - m * 2;
  let y = m;
  try {
    for (const b of blocks) {
      const canvas = await html2canvas(b, { scale: 2, backgroundColor: "#ffffff" });
      const h = (canvas.height * usable) / canvas.width;
      const maxH = ph - m * 2;
      if (h <= maxH) {
        if (y + h > ph - m) { pdf.addPage(); y = m; }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", m, y, usable, h);
        y += h;
      } else {
        // very long answer: slice across pages
        const pxPerPt = canvas.width / usable;
        let off = 0;
        while (off < canvas.height) {
          if (y > m + 10) { pdf.addPage(); y = m; }
          const slicePx = Math.min(canvas.height - off, Math.floor(maxH * pxPerPt));
          const c = document.createElement("canvas");
          c.width = canvas.width; c.height = slicePx;
          c.getContext("2d")!.drawImage(canvas, 0, off, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
          const sh = slicePx / pxPerPt;
          pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", m, y, usable, sh);
          y += sh; off += slicePx;
        }
      }
    }
  } finally {
    host.remove();
  }
  return pdf.output("blob");
}

export function deliverFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function shareApp() {
  const url = "https://snap-to-study-companion.lovable.app";
  const text = "পরীক্ষাসাথী — সাজেশনের ছবি দিলেই সব প্রশ্নের উত্তর, PDF আর বাংলা কণ্ঠে শোনা। এখান থেকে অ্যাপটি খুলুন/ইনস্টল করুন:";
  if (navigator.share) {
    try { await navigator.share({ title: "পরীক্ষাসাথী", text, url }); return "shared"; }
    catch (e) { if ((e as DOMException).name === "AbortError") return "cancel"; }
  }
  await navigator.clipboard?.writeText(`${text} ${url}`);
  return "copied";
}
