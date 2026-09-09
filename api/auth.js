import { randomBytes } from 'node:crypto';
import { getBaseUrl } from './_shared.js';

// Step 1 of the Decap CMS GitHub OAuth flow.
// Decap opens this route in a popup; we redirect straight to GitHub's authorize screen.
// Only accounts that are actual collaborators on the repo can end up with write access —
// GitHub enforces that when Decap later tries to commit, so no extra allow-list is needed here.
export default function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;

  if (!clientId) {
    res.status(500).send('Server misconfigured: GITHUB_OAUTH_CLIENT_ID is not set.');
    return;
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state,
    allow_signup: 'false',
  });

  res.setHeader(
    'Set-Cookie',
    `decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
}
