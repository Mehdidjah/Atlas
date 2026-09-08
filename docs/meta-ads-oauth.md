# Meta Ads OAuth setup

Aster uses Meta's authorization-code flow. Each Aster user connects their own Meta identity, and every stored connection is scoped by both the authenticated Aster user ID and workspace ID.

## 1. Create and configure the Meta app

1. Create a Business app at [Meta for Developers](https://developers.facebook.com/apps/).
2. Add **Facebook Login for Business**.
3. Create a login configuration with these permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
4. Add this exact value under **Valid OAuth Redirect URIs**:

   ```text
   https://aster-atlas-ad-ops.thinkercaregroup.chatgpt.site/api/meta/callback
   ```

5. Add a privacy policy URL and data-deletion instructions before submitting the app for review.
6. Request Advanced Access for the three permissions. While the Meta app is in Development mode, only users with an app role can authorize it.

Meta's current authorization-code flow is documented in the [manual Facebook Login flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/). Permission definitions and review requirements are listed in [Meta's permissions reference](https://developers.facebook.com/docs/permissions/).

## 2. Configure production runtime values

Set these values through the hosting environment. Never put real values in `.openai/hosting.json` or commit them to Git.

| Key                         | Secret | Purpose                                               |
| --------------------------- | ------ | ----------------------------------------------------- |
| `META_APP_ID`               | No     | Meta app identifier                                   |
| `META_APP_SECRET`           | Yes    | Server-only code exchange and request signing         |
| `META_TOKEN_ENCRYPTION_KEY` | Yes    | Base64-encoded 32-byte AES key for tokens at rest     |
| `META_GRAPH_VERSION`        | No     | Optional Graph version override; defaults to `v26.0`  |
| `META_REDIRECT_URI`         | No     | Optional fixed callback URI override                  |
| `META_LOGIN_CONFIG_ID`      | No     | Optional Facebook Login for Business configuration ID |

Generate a suitable encryption key locally with:

```sh
openssl rand -base64 32
```

## 3. Connection behavior

- The browser is redirected to Meta; Aster never receives the user's Meta password.
- OAuth state is random, stored as a SHA-256 hash, single-use, user-bound, and expires after 10 minutes.
- The authorization code is exchanged on the Worker only. The App Secret and access token are never sent to the frontend.
- Aster exchanges for a long-lived user token, inspects it, verifies the app and Meta user IDs, and verifies all required scopes.
- User tokens are encrypted with AES-256-GCM before D1 storage.
- Graph requests include `appsecret_proof`.
- Account selection, refresh, and disconnect mutations require both authenticated identity and a same-origin browser request.
- Disconnect attempts to revoke the app's Meta permissions, then deletes the local connection and account records.

## 4. SaaS access model

The backend reads the platform-provided `oai-authenticated-user-id` header and never accepts a user ID from the browser. The deployed Site must allow each customer to sign in; owner-only access is suitable for development but does not expose the flow to other customers.

Before allowing the AI agent to create, launch, pause, or edit campaigns, add an approval gate, an immutable action audit log, per-workspace roles, idempotency keys, spend limits, and a kill switch.
