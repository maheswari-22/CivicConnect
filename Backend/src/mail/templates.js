/* Email templates. Pure functions (no network, no nodemailer) so they can be tested and previewed.

   Layout rules for email: table-based, every style inline, no web fonts, no scripts. That is the only
   thing Gmail, Outlook and phone mail apps all render the same way. The logo is attached inline (cid:civic-logo),
   so it shows without "load images" and without needing a public URL.

   Palette: Deep Wine #3B010B / Dark Maroon #560B18 / Burgundy #75162D, Sand Gold #D9B15A, Champagne #F8F2E3. */

export const LOGO_CID = 'civic-logo';

const C = {
  wine: '#3B010B', maroon: '#560B18', burgundy: '#75162D', gold: '#D9B15A', goldText: '#94681F',
  page: '#F3EAD3', card: '#FFFBF2', line: '#E6D8B8', text: '#2B1B17', muted: '#6F5B55',
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px">
  <tr><td align="center" bgcolor="${C.maroon}" style="border-radius:10px;background:${C.maroon}">
    <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:700;color:#FFFBF2;text-decoration:none;border-radius:10px;border-bottom:3px solid ${C.gold}">${esc(label)}</a>
  </td></tr>
</table>`;

const fallbackLink = (href) => `
<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">Button not working? Copy this address into your browser:<br>
<a href="${esc(href)}" style="color:${C.burgundy};word-break:break-all">${esc(href)}</a></p>`;

const note = (html) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0">
  <tr><td style="padding:12px 14px;background:#FBF4E0;border-left:4px solid ${C.gold};border-radius:6px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.text}">${html}</td></tr>
</table>`;

const p = (html) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:1.65;color:${C.text}">${html}</p>`;

/** The shared frame: wine header with the logo, a champagne card, a quiet footer. */
function layout({ preheader, title, body }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};font-size:1px;line-height:1px">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
    <tr><td align="center" bgcolor="${C.maroon}" style="background:${C.maroon};background-image:linear-gradient(155deg,${C.burgundy},${C.maroon} 60%,${C.wine});border-radius:16px 16px 0 0;padding:26px 20px 22px">
      <img src="cid:${LOGO_CID}" width="56" height="56" alt="CivicConnect" style="display:block;margin:0 auto 10px;border:0;border-radius:50%">
      <div style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:.4px;color:#F2D9A0">CivicConnect</div>
      <div style="font-family:${FONT};font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#E9CFA0;margin-top:2px">Report. Assign. Resolve.</div>
    </td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};padding:32px 30px 30px;border-left:1px solid ${C.line};border-right:1px solid ${C.line}">
      <h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:1.25;color:${C.maroon}">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 16px 16px;padding:0 30px 24px">
      <div style="border-top:1px solid ${C.line};padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted}">
        This is an automatic message from CivicConnect. Please do not reply to it.<br>We will never ask for your password by email.
      </div>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const plain = (lines) => `${lines.join('\n\n')}\n\n— CivicConnect\nReport. Assign. Resolve.`;

export function passwordResetEmail({ name, portal, link, minutes }) {
  return {
    subject: 'Reset your CivicConnect password',
    text: plain([
      `Hi ${name},`,
      `We received a request to reset the password of your CivicConnect ${portal} account.`,
      `Choose a new password here (the link works once and expires in ${minutes} minutes):\n${link}`,
      'If you did not ask for this, ignore this email. Your password stays the same.',
    ]),
    html: layout({
      preheader: `Your password reset link (valid for ${minutes} minutes)`,
      title: 'Reset your password',
      body: `${p(`Hi ${esc(name)},`)}
${p(`We received a request to reset the password of your CivicConnect <strong>${esc(portal)}</strong> account.`)}
${button(link, 'Choose a new password')}
${note(`<strong>This link works once and expires in ${esc(minutes)} minutes.</strong> If you did not ask for it, you can safely ignore this email. Your password will not change.`)}
${fallbackLink(link)}`,
    }),
  };
}

export function passwordChangedEmail({ name, portal, when, link }) {
  return {
    subject: 'Your CivicConnect password was changed',
    text: plain([
      `Hi ${name},`,
      `The password of your CivicConnect ${portal} account was changed on ${when}. You were signed out of other devices.`,
      `If this was you, nothing more to do. If it was not, reset your password again straight away:\n${link}`,
    ]),
    html: layout({
      preheader: 'Your password was just changed',
      title: 'Your password was changed',
      body: `${p(`Hi ${esc(name)},`)}
${p(`The password of your CivicConnect <strong>${esc(portal)}</strong> account was changed on <strong>${esc(when)}</strong>. You were signed out of your other devices.`)}
${note('<strong>Was this not you?</strong> Reset your password again straight away and tell your administrator.')}
${button(link, 'Reset password again')}`,
    }),
  };
}

export function verifyEmailEmail({ name, link, hours }) {
  return {
    subject: 'Confirm your email for CivicConnect',
    text: plain([
      `Hi ${name},`,
      `Please confirm this email address for your CivicConnect account (the link is valid for ${hours} hours):\n${link}`,
      'If you did not create an account, ignore this email.',
    ]),
    html: layout({
      preheader: 'Confirm your email address',
      title: 'Confirm your email',
      body: `${p(`Hi ${esc(name)},`)}
${p(`Please confirm this email address for your CivicConnect account. It lets us send you reset links and updates about your complaints.`)}
${button(link, 'Confirm email')}
${note(`The link is valid for ${esc(hours)} hours. If you did not create an account, ignore this email.`)}
${fallbackLink(link)}`,
    }),
  };
}

export function changeEmailEmail({ name, link, hours }) {
  return {
    subject: 'Confirm your new CivicConnect email',
    text: plain([
      `Hi ${name},`,
      `We received a request to use this address as the email of your CivicConnect account. Confirm it here (valid for ${hours} hours):\n${link}`,
      'If this was not you, ignore this email and your account stays unchanged.',
    ]),
    html: layout({
      preheader: 'Confirm your new email address',
      title: 'Confirm your new email',
      body: `${p(`Hi ${esc(name)},`)}
${p('We received a request to use this address as the email of your CivicConnect account.')}
${button(link, 'Confirm new email')}
${note(`The link is valid for ${esc(hours)} hours. Not you? Ignore this email and nothing changes.`)}
${fallbackLink(link)}`,
    }),
  };
}

export function emailChangedNoticeEmail({ name, newEmail }) {
  return {
    subject: 'Your CivicConnect email was changed',
    text: plain([
      `Hi ${name},`,
      `The email of your CivicConnect account was just changed to ${newEmail}.`,
      'If this was not you, reset your password straight away and contact your administrator.',
    ]),
    html: layout({
      preheader: 'The email on your account was changed',
      title: 'Your email was changed',
      body: `${p(`Hi ${esc(name)},`)}
${p(`The email of your CivicConnect account was just changed to <strong>${esc(newEmail)}</strong>.`)}
${note('<strong>Was this not you?</strong> Reset your password straight away and contact your administrator.')}`,
    }),
  };
}

export function workerApprovedEmail({ name, link }) {
  return {
    subject: 'Your CivicConnect worker account is approved',
    text: plain([`Hi ${name},`, `Your worker account has been approved by your area authority. You can sign in here:\n${link}`]),
    html: layout({
      preheader: 'You can now sign in as a worker',
      title: 'Your account is approved',
      body: `${p(`Hi ${esc(name)},`)}
${p('Your worker account has been approved by your area authority. You can now sign in and start receiving tasks.')}
${button(link, 'Sign in')}
${fallbackLink(link)}`,
    }),
  };
}

export function emergencyAlertEmail({ name, complaintId, title, location, waited, level, severity, reason, link }) {
  const urgent = level >= 3;
  return {
    subject: `${urgent ? 'ESCALATED: ' : ''}Emergency needs a worker: ${title} at ${location}`,
    text: plain([
      `Hi ${name},`,
      `${urgent ? `This emergency has now waited ${waited} with no worker (reminder ${level}). ` : ''}A citizen marked complaint ${complaintId} (${title} at ${location}) as an EMERGENCY${reason ? `: ${reason}` : ''}.${severity != null ? ` AI photo severity: ${severity}%.` : ''}`,
      `Open it and assign a worker now:\n${link}`,
    ]),
    html: layout({
      preheader: `${title} at ${location} is marked as an emergency and has no worker`,
      title: urgent ? 'Escalated emergency: no worker yet' : 'Emergency: a worker is needed',
      body: `${p(`Hi ${esc(name)},`)}
${p(`A citizen marked complaint <strong>${esc(complaintId)}</strong> as an <strong style="color:#b91c1c">EMERGENCY</strong>.`)}
${note(`<strong>${esc(title)}</strong> at ${esc(location)}${reason ? `<br>Reported danger: ${esc(reason)}` : ''}${severity != null ? `<br>AI photo severity: ${esc(severity)}%` : ''}<br>Waiting for a worker: <strong>${esc(waited)}</strong>${urgent ? ` (reminder ${esc(level)})` : ''}`)}
${button(link, 'Assign a worker now')}
${fallbackLink(link)}`,
    }),
  };
}
