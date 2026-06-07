import { env } from '../env.js';
import type { OutgoingEmail } from '../lib/email.js';

const BRAND = 'Zumba by Grasiele';

/** Minimal branded HTML shell. Inline styles only (email clients ignore <style>/external CSS). */
function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fff8f3;font-family:Arial,Helvetica,sans-serif;color:#241733">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(120deg,#ff2e63,#ff7a00 55%,#ffcc29);border-radius:16px;padding:20px 24px;color:#fff">
      <div style="font-size:22px;font-weight:800">💃 ${BRAND}</div>
    </div>
    <div style="background:#fff;border:1px solid #f0e2d8;border-radius:16px;padding:24px;margin-top:16px">
      <h1 style="margin:0 0 12px;font-size:20px;color:#241733">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#8a7d97;font-size:12px;text-align:center;margin:16px 0 0">
      ${BRAND} · Energia do Rio, na sua vizinhança 🇧🇷
    </p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ff2e63;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px;margin-top:8px">${label}</a>`;
}

export function welcomeEmail(name: string): OutgoingEmail {
  const site = env.frontendOrigin;
  const subject = `Welcome to ${BRAND}! 💃`;
  const text =
    `Hi ${name},\n\n` +
    `Welcome to ${BRAND}! We're so happy you're here. 🎉\n\n` +
    `Head to the schedule to book your first class and feel the rhythm of Rio:\n${site}/schedule\n\n` +
    `You can manage your account and email preferences anytime at ${site}/dashboard\n\n` +
    `Vem dançar!\nGrasi`;
  const html = shell(
    `Welcome, ${name}! 🎉`,
    `<p style="line-height:1.6">We're so happy you're here. Come feel the rhythm of Rio — book your first
     class whenever you're ready.</p>
     <p>${button(`${site}/schedule`, 'See the schedule →')}</p>
     <p style="line-height:1.6;color:#5b4d6b;font-size:14px">You can manage your account and email
     preferences anytime from your <a href="${site}/dashboard" style="color:#d81b54">dashboard</a>.</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
  );
  return { to: '', subject, text, html };
}
