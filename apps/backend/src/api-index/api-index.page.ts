import type { ApiEndpoint } from './api-endpoints.service';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** `/api/connections/strava/sync` → `connections`. */
function groupOf(path: string): string {
  return path.split('/')[2] || 'root';
}

function row(endpoint: ApiEndpoint): string {
  return `<tr>
      <td><span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span></td>
      <td><code>${escape(endpoint.path)}</code></td>
      <td>${endpoint.access === 'public' ? '<span class="public">public</span>' : 'session'}</td>
      <td>${endpoint.rateLimit ? escape(endpoint.rateLimit) : '<span class="muted">none</span>'}</td>
      <td>${endpoint.status}</td>
      <td class="muted"><code>${escape(endpoint.handler)}</code></td>
    </tr>`;
}

/** Plain HTML listing of the endpoints, grouped by their first path segment. */
export function renderApiIndex(endpoints: ApiEndpoint[]): string {
  const groups = new Map<string, ApiEndpoint[]>();
  for (const endpoint of endpoints) {
    const group = groupOf(endpoint.path);
    groups.set(group, [...(groups.get(group) ?? []), endpoint]);
  }
  const sections = [...groups]
    .map(
      ([group, items]) => `<h2>${escape(group)}</h2>
  <div class="scroll"><table>
    <thead><tr><th>Method</th><th>Path</th><th>Access</th><th>Rate limit</th><th>Status</th><th>Handler</th></tr></thead>
    <tbody>${items.map(row).join('')}</tbody>
  </table></div>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API endpoints</title>
<style>
  :root { color-scheme: light dark; --muted: #6b7280; --border: #e5e7eb; --bg: #fff; --fg: #111827; }
  @media (prefers-color-scheme: dark) { :root { --muted: #9ca3af; --border: #374151; --bg: #0b0f17; --fg: #e5e7eb; } }
  body { margin: 0 auto; max-width: 1100px; padding: 24px 16px; font: 14px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; text-transform: capitalize; }
  p { margin: 0; color: var(--muted); }
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { font-weight: 600; color: var(--muted); font-size: 12px; }
  code { font: 13px ui-monospace, monospace; }
  .muted { color: var(--muted); }
  .public { color: #b45309; }
  .method { display: inline-block; min-width: 56px; text-align: center; padding: 1px 6px; border-radius: 4px; font: 600 12px ui-monospace, monospace; color: #fff; }
  .get { background: #2563eb; } .post { background: #16a34a; } .put { background: #9333ea; }
  .patch { background: #0891b2; } .delete { background: #dc2626; }
</style>
</head>
<body>
  <h1>API endpoints</h1>
  <p>${endpoints.length} endpoints, generated from the route metadata. "session" routes require the session cookie; rate limits are per client IP.</p>
  ${sections}
</body>
</html>`;
}
