// Client-side PDF builder. Every page is rebuilt from its date by the doodle
// engine, rendered to a PNG through an off-screen canvas, then placed on an A4
// page with jsPDF. The colored book uses full fills; the Blank Book renders
// pure line art for printing and hand coloring.

import { buildDoodle, doodleSvg, longDateLabel } from "../lib/doodle/engine";

async function svgToPng(svg: string, sizePx: number): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the page image."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = sizePx;
    canvas.height = sizePx;
    const g = canvas.getContext("2d");
    if (!g) throw new Error("Canvas is unavailable in this browser.");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, sizePx, sizePx);
    g.drawImage(img, 0, 0, sizePx, sizePx);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadBook(dates: string[], blank: boolean): Promise<void> {
  if (dates.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sorted = [...dates].sort();

  // Cover page.
  doc.setFillColor(244, 242, 238);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(38, 34, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Daily Doodle", 105, 120, { align: "center" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(blank ? "The Blank Book" : "My Coloring Book", 105, 134, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(132, 126, 114);
  doc.text(
    blank
      ? "Print these pages and color them by hand."
      : "Colored one click at a time.",
    105,
    146,
    { align: "center" },
  );
  doc.text(
    `${longDateLabel(sorted[0])} to ${longDateLabel(sorted[sorted.length - 1])}`,
    105,
    154,
    { align: "center" },
  );

  for (const date of sorted) {
    const doodle = buildDoodle(date);
    const fills = blank ? null : doodle.regions.map((r) => r.need);
    const png = await svgToPng(doodleSvg(doodle, fills), 1400);
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
    doc.addImage(png, "PNG", 20, 40, 170, 170);
    doc.setTextColor(38, 34, 25);
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(`No. ${doodle.dayNo}  ${doodle.title}`, 20, 228);
    doc.setTextColor(132, 126, 114);
    doc.text(longDateLabel(date), 190, 228, { align: "right" });
  }

  doc.save(blank ? "daily-doodle-blank-book.pdf" : "daily-doodle-coloring-book.pdf");
}
