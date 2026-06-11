import { env } from '../env.js';
import type { OutgoingEmail, EmailAttachment } from '../lib/email.js';
import type { ClassSummary, FieldChange, EmailRecipient } from './events.js';
import { formatClassTime } from '../lib/datetime.js';
import { buildClassIcs } from '../lib/ics.js';

const BRAND = 'Zumba by Grasiele';

/** A calendar invite as a real file attachment (so it adds a one-time event, not a subscription). */
function calendarAttachment(cls: ClassSummary): EmailAttachment {
  return {
    filename: 'class.ics',
    content: buildClassIcs(cls),
    contentType: 'text/calendar; charset=UTF-8; method=PUBLISH',
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal branded HTML shell. Inline styles only (email clients ignore <style>/external CSS).
 *  When `unsubUrl` is given, an unsubscribe line is added to the footer. */
function shell(heading: string, bodyHtml: string, unsubUrl?: string): string {
  const unsub = unsubUrl
    ? `<p style="color:#8a7d97;font-size:12px;text-align:center;margin:8px 0 0">
         <a href="${unsubUrl}" style="color:#8a7d97">Unsubscribe from these emails</a>
       </p>`
    : '';
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
    ${unsub}
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ff2e63;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px;margin-top:8px">${label}</a>`;
}

function unsubUrl(token: string): string {
  return `${env.frontendOrigin}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** HTML block summarising a class's time + place. */
function classDetailsHtml(cls: ClassSummary): string {
  return `<p style="line-height:1.7;background:#fff8f3;border-radius:12px;padding:14px;margin:0 0 12px">
    <strong>${esc(cls.title)}</strong><br/>
    🗓️ ${esc(formatClassTime(cls.startTime, cls.endTime))}<br/>
    📍 ${esc(cls.location)}
  </p>`;
}

function classDetailsText(cls: ClassSummary): string {
  return `${cls.title}\n  ${formatClassTime(cls.startTime, cls.endTime)}\n  ${cls.location}`;
}

/** Inquiry from the public contact form, delivered to the business inbox (reply-to the sender). */
export function contactInquiryEmail(inquiry: {
  name: string;
  email: string;
  message: string;
}): OutgoingEmail {
  const subject = `New inquiry from ${inquiry.name}`;
  const text =
    `New contact-form inquiry:\n\n` +
    `Name:  ${inquiry.name}\n` +
    `Email: ${inquiry.email}\n\n` +
    `Message:\n${inquiry.message}\n`;
  const html = shell(
    `New inquiry from ${esc(inquiry.name)}`,
    `<p style="margin:0 0 6px"><strong>Email:</strong>
       <a href="mailto:${esc(inquiry.email)}" style="color:#d81b54">${esc(inquiry.email)}</a></p>
     <p style="white-space:pre-wrap;line-height:1.6;background:#fff8f3;border-radius:12px;padding:14px">${esc(inquiry.message)}</p>
     <p style="color:#5b4d6b;font-size:14px">Reply directly to this email to respond to ${esc(inquiry.name)}.</p>`,
  );
  return { to: '', subject, text, html, replyTo: inquiry.email };
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
    `Welcome, ${esc(name)}! 🎉`,
    `<p style="line-height:1.6">We're so happy you're here. Come feel the rhythm of Rio — book your first
     class whenever you're ready.</p>
     <p>${button(`${site}/schedule`, 'See the schedule →')}</p>
     <p style="line-height:1.6;color:#5b4d6b;font-size:14px">You can manage your account and email
     preferences anytime from your <a href="${site}/dashboard" style="color:#d81b54">dashboard</a>.</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
  );
  return { to: '', subject, text, html };
}

/** Transactional password-reset link. Always sent (not gated on notification prefs). */
export function passwordResetEmail(
  to: { email: string; name: string },
  resetUrl: string,
): OutgoingEmail {
  const subject = 'Reset your password';
  const text =
    `Hi ${to.name},\n\n` +
    `We received a request to reset the password for your ${BRAND} account.\n\n` +
    `Reset it here (this link expires in 1 hour):\n${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email — your password won't change.\n\n` +
    `Vem dançar!\nGrasi`;
  const html = shell(
    `Reset your password 🔒`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, we received a request to reset the password for
     your ${BRAND} account.</p>
     <p>${button(resetUrl, 'Reset your password →')}</p>
     <p style="line-height:1.6;color:#5b4d6b;font-size:14px">This link expires in <strong>1 hour</strong>.
     If you didn't request this, you can safely ignore this email — your password won't change.</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
  );
  return { to: to.email, subject, text, html };
}

/** Confirmation that a user signed the liability waiver (with a link to their copy). */
export function waiverSignedEmail(
  to: { email: string; name: string },
  signedAt: string,
  version: string,
): OutgoingEmail {
  const site = env.frontendOrigin;
  const when = new Date(signedAt).toISOString().slice(0, 10);
  const subject = 'Your signed liability waiver';
  const text =
    `Hi ${to.name},\n\n` +
    `Thanks for signing the Zumba by Grasiele liability waiver on ${when} (version ${version}).\n\n` +
    `You can view or download your signed copy anytime from your dashboard:\n${site}/dashboard\n\n` +
    `Vem dançar!\nGrasi`;
  const html = shell(
    `Waiver signed ✅`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, thanks for signing the liability waiver on
     <strong>${esc(when)}</strong> (version ${esc(version)}).</p>
     <p>${button(`${site}/dashboard`, 'View your signed copy →')}</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
  );
  return { to: to.email, subject, text, html };
}

/** Confirmation after a user books a class. */
export function bookingConfirmedEmail(to: EmailRecipient, cls: ClassSummary): OutgoingEmail {
  const site = env.frontendOrigin;
  const u = unsubUrl(to.unsubToken);
  const subject = `You're booked: ${cls.title} 💃`;
  const text =
    `Hi ${to.name},\n\n` +
    `You're all set! Here are the details:\n\n` +
    `${classDetailsText(cls)}\n\n` +
    `📅 A calendar invite is attached — open it to add this class to your calendar.\n\n` +
    `See your classes: ${site}/dashboard\n\n` +
    `Vem dançar!\nGrasi\n\n` +
    `Unsubscribe: ${u}`;
  const html = shell(
    `You're booked! 🎉`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, you're all set — can't wait to dance with you!</p>
     ${classDetailsHtml(cls)}
     <p style="line-height:1.6;color:#5b4d6b;font-size:14px">📅 A calendar invite is attached to this
     email — open it to add the class to your calendar.</p>
     <p>${button(`${site}/dashboard`, 'View your classes →')}</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
    u,
  );
  return { to: to.email, subject, text, html, attachments: [calendarAttachment(cls)] };
}

/** Announcement of a brand-new class to opted-in users. */
export function newClassEmail(to: EmailRecipient, cls: ClassSummary): OutgoingEmail {
  const site = env.frontendOrigin;
  const u = unsubUrl(to.unsubToken);
  const subject = `New class just added: ${cls.title} 🎉`;
  const text =
    `Hi ${to.name},\n\n` +
    `A new class just landed on the calendar:\n\n` +
    `${classDetailsText(cls)}\n\n` +
    `Grab your spot: ${site}/schedule\n\n` +
    `Vem dançar!\nGrasi\n\n` +
    `Unsubscribe: ${u}`;
  const html = shell(
    `New class just added! 🎉`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, a fresh class just landed on the calendar:</p>
     ${classDetailsHtml(cls)}
     <p>${button(`${site}/schedule`, 'Grab your spot →')}</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
    u,
  );
  return { to: to.email, subject, text, html };
}

/** Notify a booked user that their class changed, detailing what changed. */
export function classChangedEmail(
  to: EmailRecipient,
  cls: ClassSummary,
  changes: FieldChange[],
): OutgoingEmail {
  const site = env.frontendOrigin;
  const u = unsubUrl(to.unsubToken);
  const subject = `Update to your class: ${cls.title}`;
  const changeLinesText = changes.map((c) => `  • ${c.label}: ${c.from} → ${c.to}`).join('\n');
  const changeLinesHtml = changes
    .map(
      (c) =>
        `<li style="margin:0 0 6px"><strong>${esc(c.label)}:</strong>
         <span style="color:#8a7d97;text-decoration:line-through">${esc(c.from)}</span>
         → <strong>${esc(c.to)}</strong></li>`,
    )
    .join('');
  const text =
    `Hi ${to.name},\n\n` +
    `A class you're booked into has been updated:\n\n` +
    `${changeLinesText}\n\n` +
    `Updated details:\n${classDetailsText(cls)}\n\n` +
    `📅 An updated calendar invite is attached.\n\n` +
    `See your classes: ${site}/dashboard\n\n` +
    `Vem dançar!\nGrasi\n\n` +
    `Unsubscribe: ${u}`;
  const html = shell(
    `Your class has been updated`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, a class you're booked into has changed:</p>
     <ul style="line-height:1.6;padding-left:18px;margin:0 0 12px">${changeLinesHtml}</ul>
     ${classDetailsHtml(cls)}
     <p style="line-height:1.6;color:#5b4d6b;font-size:14px">📅 An updated calendar invite is
     attached to this email.</p>
     <p>${button(`${site}/dashboard`, 'View your classes →')}</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
    u,
  );
  return { to: to.email, subject, text, html, attachments: [calendarAttachment(cls)] };
}

/** Notify a booked user that their class was canceled. */
export function classCanceledEmail(to: EmailRecipient, cls: ClassSummary): OutgoingEmail {
  const site = env.frontendOrigin;
  const u = unsubUrl(to.unsubToken);
  const subject = `Class canceled: ${cls.title}`;
  const text =
    `Hi ${to.name},\n\n` +
    `Unfortunately this class has been canceled:\n\n` +
    `${classDetailsText(cls)}\n\n` +
    `Sorry for the inconvenience! Browse other classes here: ${site}/schedule\n\n` +
    `Vem dançar!\nGrasi\n\n` +
    `Unsubscribe: ${u}`;
  const html = shell(
    `Class canceled`,
    `<p style="line-height:1.6">Hi ${esc(to.name)}, unfortunately this class has been canceled:</p>
     ${classDetailsHtml(cls)}
     <p style="line-height:1.6">Sorry for the inconvenience — I hope to see you at another class soon.</p>
     <p>${button(`${site}/schedule`, 'Browse other classes →')}</p>
     <p style="margin-top:16px">Vem dançar!<br/>Grasi</p>`,
    u,
  );
  return { to: to.email, subject, text, html };
}
