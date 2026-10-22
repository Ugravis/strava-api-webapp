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

interface ActionEmailContent {
  subject: string;
  greeting: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  footer: string;
}

/** Renders a transactional email with a single call-to-action button. */
export function renderActionEmail(content: ActionEmailContent): RenderedEmail {
  const url = escapeHtml(content.actionUrl);
  const paragraphs = content.paragraphs
    .map(
      (paragraph) => `<p style="margin:0 0 16px">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

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
                <p style="margin:24px 0">
                  <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(content.actionLabel)}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#737373">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${url}" style="color:#171717">${url}</a></p>
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
    `${content.actionLabel} : ${content.actionUrl}`,
    '',
    content.footer,
  ].join('\n');

  return { subject: content.subject, html, text };
}
