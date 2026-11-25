export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EmailContent {
  subject: string;
  greeting: string;
  paragraphs: string[];
  /** A one-time code, shown large under the paragraphs. */
  code?: string;
  /**
   * A call-to-action button, with its link spelled out below. `google`: the
   * white button with the Google logo of the app (`iconUrl`, a hosted PNG).
   */
  action?: { label: string; url: string; google?: { iconUrl: string } };
  footer: string;
}

const MUTED = 'margin:0 0 8px;font-size:13px;color:#737373';

/** Renders a transactional email, in HTML and plain text. */
export function renderEmail(content: EmailContent): RenderedEmail {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) => `<p style="margin:0 0 16px">${escapeHtml(paragraph)}</p>`,
    )
    .join('');
  const code = content.code
    ? `<p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(content.code)}</p>`
    : '';
  const url = content.action ? escapeHtml(content.action.url) : '';
  const button = content.action?.google
    ? `<a href="${url}" style="display:inline-block;background:#ffffff;color:#171717;text-decoration:none;padding:11px 20px;border:1px solid #e5e5e5;border-radius:8px;font-weight:500"><img src="${escapeHtml(content.action.google.iconUrl)}" width="16" height="16" alt="" style="vertical-align:-3px;margin-right:8px;border:0">${escapeHtml(content.action.label)}</a>`
    : `<a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(content.action?.label ?? '')}</a>`;
  const action = content.action
    ? `<p style="margin:24px 0">
                  ${button}
                </p>
                <p style="${MUTED}">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${url}" style="color:#171717">${url}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#171717">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size:15px;line-height:1.6">
                <p style="margin:0 0 16px;font-weight:600">${escapeHtml(content.greeting)}</p>
                ${paragraphs}
                ${code}
                ${action}
                <p style="margin:0;font-size:13px;color:#737373">${escapeHtml(content.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    content.greeting,
    '',
    ...content.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(content.code ? [content.code, ''] : []),
    ...(content.action
      ? [`${content.action.label} : ${content.action.url}`, '']
      : []),
    content.footer,
  ].join('\n');

  return { subject: content.subject, html, text };
}
