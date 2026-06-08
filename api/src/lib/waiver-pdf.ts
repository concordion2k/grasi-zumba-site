import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { WAIVER_DOCUMENT } from '@grasi/shared';
import { env } from '../env.js';

/** Signature details to stamp onto a signed copy; omit for a blank (downloadable) waiver. */
export interface SignatureInfo {
  fullName: string;
  signedAt: string; // ISO
  version: string;
  photoRelease: boolean;
  ip?: string;
}

/**
 * The standard PDF fonts only encode WinAnsi (Latin-1). Map common typographic characters to ASCII
 * and strip anything else (emoji, symbols) so generation never throws on the shared copy — which is
 * also rendered as HTML elsewhere, where the richer characters are fine.
 */
function pdfSafe(s: string): string {
  const mapped = s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '*')
    .replace(/®/g, '(R)')
    .replace(/©/g, '(C)')
    .replace(/™/g, '(TM)');
  // Keep tab/newline and the WinAnsi-printable range (ASCII + Latin-1 supplement); drop the rest
  // (emoji, other symbols) so the standard font never fails to encode.
  let out = '';
  for (const ch of mapped) {
    const code = ch.codePointAt(0) ?? 0;
    const printable = (code >= 32 && code <= 126) || (code >= 160 && code <= 255);
    if (code === 9 || code === 10 || code === 13 || printable) out += ch;
  }
  return out.trim();
}

const MARGIN = 50;
const PINK = rgb(0.85, 0.11, 0.33);
const INK = rgb(0.14, 0.09, 0.2);
const MUTED = rgb(0.4, 0.36, 0.44);
const WARN = rgb(0.7, 0.2, 0);

/**
 * Render the liability waiver as a (overflow-aware) PDF. With `sig`, it's a signed copy stamped with
 * the electronic-signature block; without, it's a blank copy for download/print. The PDF is generated
 * deterministically from WAIVER_DOCUMENT, so a signed copy can be regenerated from the stored
 * signature record at any time.
 */
export async function buildWaiverPdf(sig?: SignatureInfo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage();
  const { width, height } = page.getSize();
  const maxWidth = width - MARGIN * 2;
  let y = height - MARGIN;

  const newPage = () => {
    page = doc.addPage();
    y = page.getSize().height - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  /** Word-wrap `text` to maxWidth and draw it, advancing y. */
  const drawWrapped = (
    text: string,
    opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineGap?: number } = {
      font,
      size: 10,
    },
  ) => {
    const f = opts.font;
    const size = opts.size;
    const lineGap = opts.lineGap ?? 4;
    const lineHeight = size + lineGap;
    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    let line = '';
    const flush = (p: PDFPage) => {
      if (!line) return;
      ensure(lineHeight);
      p.drawText(line, { x: MARGIN, y, size, font: f, color: opts.color ?? INK });
      y -= lineHeight;
      line = '';
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) > maxWidth) {
        flush(page);
        line = word;
      } else {
        line = candidate;
      }
    }
    flush(page);
  };

  const gap = (n: number) => {
    y -= n;
  };

  // Title
  drawWrapped(WAIVER_DOCUMENT.title, { font: bold, size: 16, color: PINK });
  gap(6);

  // WIP / testing notice
  drawWrapped(WAIVER_DOCUMENT.notice, { font: bold, size: 9, color: WARN });
  gap(8);

  // Intro
  drawWrapped(WAIVER_DOCUMENT.intro, { font, size: 10 });
  gap(8);

  // Sections
  for (const s of WAIVER_DOCUMENT.sections) {
    ensure(28);
    drawWrapped(s.heading, { font: bold, size: 11, color: INK });
    gap(2);
    drawWrapped(s.body, { font, size: 10 });
    gap(8);
  }

  // Photo release + electronic-consent lines
  drawWrapped(WAIVER_DOCUMENT.photoReleaseText, { font, size: 9, color: MUTED });
  gap(6);
  drawWrapped(WAIVER_DOCUMENT.electronicConsentText, { font, size: 9, color: MUTED });
  gap(16);

  // Signature block
  ensure(80);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1,
    color: MUTED,
  });
  gap(14);

  if (sig) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: env.displayTimeZone,
    }).format(new Date(sig.signedAt));
    drawWrapped(`Signed electronically by: ${sig.fullName}`, { font: bold, size: 11, color: INK });
    gap(2);
    drawWrapped(`Date: ${fmt}`, { font, size: 10, color: MUTED });
    gap(2);
    drawWrapped(`Waiver version: ${sig.version}`, { font, size: 9, color: MUTED });
    gap(2);
    drawWrapped(`Photo/media release: ${sig.photoRelease ? 'Granted' : 'Declined'}`, {
      font,
      size: 9,
      color: MUTED,
    });
    if (sig.ip) {
      gap(2);
      drawWrapped(`Recorded from IP: ${sig.ip}`, { font, size: 8, color: MUTED });
    }
    gap(4);
    drawWrapped(
      'This signature was captured electronically under the federal ESIGN Act and Florida UETA.',
      { font, size: 8, color: MUTED },
    );
  } else {
    drawWrapped('Signature: ______________________________', { font, size: 11, color: INK });
    gap(10);
    drawWrapped('Printed name: ___________________________', { font, size: 11, color: INK });
    gap(10);
    drawWrapped('Date: ______________________', { font, size: 11, color: INK });
  }

  return doc.save();
}
