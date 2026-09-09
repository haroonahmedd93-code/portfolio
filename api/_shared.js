// Small helpers shared by api/auth.js and api/callback.js.
// Kept dependency-free so the functions have zero cold-start overhead.

export function getBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        return [decodeURIComponent(c.slice(0, idx)), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

// Renders the tiny HTML page the OAuth popup shows for one tick before it closes.
// It speaks Decap CMS's window.postMessage handshake: wait for the opener to say
// "authorizing:github", then reply with either a success or error payload.
export function renderPostMessagePage({ token, error }) {
  const payload = error
    ? { provider: 'github', error }
    : { token, provider: 'github' };
  const status = error ? 'error' : 'success';
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Authenticating…</title></head>
  <body>
    <p style="font-family: sans-serif; color: #444; padding: 2rem;">
      ${error ? 'Authentication failed — you can close this window.' : 'Authenticated — you can close this window.'}
    </p>
    <script>
      (function () {
        function receiveMessage(e) {
          window.removeEventListener('message', receiveMessage, false);
          window.opener.postMessage(
            'authorization:github:${status}:' + JSON.stringify(${safeJson}),
            e.origin
          );
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
  </body>
</html>`;
}
