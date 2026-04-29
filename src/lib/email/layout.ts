/**
 * Editorial HTML layout for all transactional mails. Inline CSS only so it
 * renders the same in Outlook/Gmail/Apple Mail. Colors mirror the v2
 * "Dromerige Nacht" palette; fonts fall back to web-safe serifs because
 * email clients don't load custom fonts.
 *
 * SECURITY: `bodyParagraph(html)` takes RAW HTML so templates can mark
 * up their own copy. Every interpolation of user-controlled data
 * (`User.name`, child names, story titles, contact-form messages)
 * MUST pass through `escapeHtml()` from `./escape` first. The wrapper
 * itself escapes `title`, `preheader` and `heading` automatically; the
 * `body` and `footerNote` slots are raw HTML.
 */
import { escapeHtml } from "./escape";

const C = {
  paper: "#f5efe4",
  paperDeep: "#ebe2d1",
  paperShade: "#e2d7c2",
  ink: "#1f1e3a",
  inkSoft: "#2e2d52",
  inkMute: "#6c6a85",
  gold: "#c9a961",
  goldDeep: "#8a7340",
};

// Webfonts laden via Google Fonts. Werkt in Apple Mail / Gmail mobiel /
// Outlook web. Outlook desktop op Windows kan geen webfonts laden en valt
// terug op Georgia — dat is precies onze gewenste fallback.
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..500&family=Lora:wght@400;500&display=swap');`;

const DISPLAY = "'Fraunces', 'Lora', Georgia, 'Times New Roman', serif";
const SERIF = "'Lora', Georgia, 'Times New Roman', serif";
const UI = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

type WrapOpts = {
  /** Inbox preview text, 80-120 chars. */
  preheader: string;
  /** Page title in the <title> tag. */
  title: string;
  /** Big serif heading at the top of the card. */
  heading: string;
  /** Rich HTML body content (already-formatted paragraphs). */
  body: string;
  /** Optional call-to-action button under the body. */
  cta?: { label: string; url: string };
  /** Small italic footer note (after the CTA). */
  footerNote?: string;
};

function ctaButton(cta: { label: string; url: string }): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
      <tr>
        <td style="background:${C.ink};">
          <a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-family:${UI};font-size:14px;font-weight:500;color:${C.paper};text-decoration:none;letter-spacing:0.02em;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function wrapEditorialEmail(opts: WrapOpts): string {
  const title = escapeHtml(opts.title);
  const preheader = escapeHtml(opts.preheader);
  const heading = escapeHtml(opts.heading);
  const footer = opts.footerNote
    ? `<p style="margin:20px 0 0;font-family:${SERIF};font-style:italic;font-size:13px;color:${C.inkMute};line-height:1.55;">${opts.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..500&family=Lora:wght@400;500&display=swap" rel="stylesheet" />
  <style>${FONT_IMPORT}</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <span style="font-family:${MONO};font-size:11px;letter-spacing:0.28em;color:${C.goldDeep};text-transform:uppercase;">
                Ons Verhaaltje
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:${C.paperDeep};padding:40px 36px;border:1px solid ${C.paperShade};">
              <h1 style="font-family:${DISPLAY};font-weight:300;font-size:30px;line-height:1.15;color:${C.ink};margin:0 0 20px;letter-spacing:-0.6px;">
                ${heading}
              </h1>
              <div style="font-family:${SERIF};font-size:16px;line-height:1.65;color:${C.inkSoft};">
                ${opts.body}
              </div>
              ${opts.cta ? ctaButton(opts.cta) : ""}
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;text-align:center;font-family:${SERIF};font-size:12px;color:${C.inkMute};line-height:1.6;">
              <a href="https://onsverhaaltje.nl" style="color:${C.inkMute};text-decoration:none;">onsverhaaltje.nl</a>
              &middot;
              <a href="mailto:info@onsverhaaltje.nl" style="color:${C.inkMute};text-decoration:none;">info@onsverhaaltje.nl</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function bodyParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${C.inkSoft};">${html}</p>`;
}
