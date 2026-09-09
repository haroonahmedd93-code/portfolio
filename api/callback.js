import { getBaseUrl, parseCookies, renderPostMessagePage } from './_shared.js';

// Step 2 of the Decap CMS GitHub OAuth flow.
// GitHub redirects the popup here with a `code`; we exchange it server-side for an
// access token (client secret never touches the browser) and hand the token back to
// the Decap CMS window via postMessage.
export default async function handler(req, res) {
  const { code, state, error, error_description: errorDescription } = req.query;
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (error) {
    res.status(200).send(renderPostMessagePage({ error: errorDescription || error }));
    return;
  }

  if (!clientId || !clientSecret) {
    res.status(500).send(renderPostMessagePage({ error: 'Server misconfigured: missing OAuth client credentials.' }));
    return;
  }

  const cookies = parseCookies(req.headers.cookie || '');
  if (!code || !state || state !== cookies.decap_oauth_state) {
    res.status(401).send(renderPostMessagePage({ error: 'Invalid or expired OAuth state. Please try logging in again.' }));
    return;
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${getBaseUrl(req)}/api/callback`,
        state,
      }),
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok || data.error || !data.access_token) {
      res
        .status(401)
        .send(renderPostMessagePage({ error: data.error_description || 'Failed to obtain access token.' }));
      return;
    }

    // Clear the one-time state cookie now that it's been consumed.
    res.setHeader('Set-Cookie', 'decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    res.status(200).send(renderPostMessagePage({ token: data.access_token }));
  } catch (err) {
    res.status(500).send(renderPostMessagePage({ error: 'Unexpected error exchanging OAuth code.' }));
  }
}
