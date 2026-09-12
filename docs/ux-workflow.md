# Aster: guided workspace UX

## Visual contract

Preserve the existing Bïrch-inspired design. The user explicitly rejected replacing it. Keep the original Home/Performance/Stage/Hub navigation, dark 48px header, rounded white content plate, Home sidebar/composer, Performance rail, setup illustrations, card geometry, typography, colors and controls. Workflow fixes belong inside those components. Do not introduce a replacement sidebar, dashboard layout or design system.

## Product journey

1. Create an Aster account using Google or Facebook.
2. Enter the personal workspace created for that authenticated identity.
3. Use Meta Ads connection in Home, or the existing Hub, to authorize Meta separately from account sign-in.
4. Select the intended ad accounts and explicitly save the selection.
5. Review reporting when real synchronization is implemented. Until then, real workspaces show an honest empty state and the separate demo workspaces provide sample reporting.
6. Prepare a campaign or budget proposal, review it, and save a draft.
7. Approve that draft in a distinct human-review step. Current approvals are local prototype records, not publication or permission to spend.
8. Find the recorded action in Activity.

Real provider login requires server configuration, database migration, deployment and live-provider verification. See [authentication.md](./authentication.md). Meta configuration remains separate; see [meta-ads-oauth.md](./meta-ads-oauth.md). This change does not configure consoles, deploy a Worker, apply a persistent D1 migration, connect an AI model, synchronize live campaign insights, or publish ads.

## Navigation vocabulary

The original four product tabs remain: Home, Performance, Stage and Hub. Home retains its 260px sidebar and centered assistant. Performance retains its compact tool rail. The routes below describe workflows within those existing surfaces, not a new navigation structure.

| Label                       | Purpose                                              | Route                                  |
| --------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Home / Overview             | Assistant, chats and sample highlights               | `/workspaces/:id/overview`             |
| Performance                 | KPIs, trends, campaign table and inspected changes   | `/workspaces/:id/performance`          |
| Launch / Drafts & approvals | Prepare, review, save and approve proposals          | `/workspaces/:id/performance/launch`   |
| Home / Assistant alias      | Workspace-scoped conversations and planning guidance | `/workspaces/:id/assistant`            |
| Analyze                     | Explain an opportunity before preparing a request    | `/workspaces/:id/performance/analyze`  |
| Hub / Connections alias     | Account connections, availability and setup          | `/workspaces/:id/connections`          |
| Activity                    | Recorded user and assistant-requested actions        | `/workspaces/:id/performance/activity` |
| Rules                       | Paused rule drafts, not running automation           | `/workspaces/:id/performance/rules`    |
| Stage                       | Optional saved folder references                     | `/workspaces/:id/stage`                |

The existing chat URL `/workspaces/:id/overview/chat/:chatId`, Meta URL `/workspaces/:id/connections/meta`, and `/hub?workspaceId=:id` remain supported. `/assistant` uses the original Home presentation, not a separate layout. `/connections` is an alias for the existing Hub. `/` opens the original-style welcome/sign-in screen. Navigation remains in the original `global-navbar.tsx`, `workspace-drawer.tsx`, `home-sidebar.tsx` and `performance-rail.tsx` components.

## Information hierarchy

- One page title, one short purpose statement, and one primary action.
- Workspace selection is distinct from account sign-in.
- Google/Facebook identity does not implicitly grant Meta advertising permissions.
- Connection success does not imply campaign synchronization or a working AI model.
- Built-in `demo`, `north`, and `studio` workspaces use synthetic examples. New customer workspace IDs default to no live reporting data rather than silently showing fixtures.
- No debug 'empty/populated' dropdown appears in the main product. Empty reporting can offer an explicit sample preview.
- Google Ads and TikTok Ads are clearly Coming soon, without a pretend gateway-creation wizard.
- No fake notifications, rule-success toasts, made-up conversations, shared-folder verification, or claims of publication.

## Implemented local prototype workflows

### Campaigns

The table, KPIs, CPA and daily chart derive from the same filters. The synthetic reporting period ends September 5, 2026. The 7/30/90-day options produce the corresponding number of daily points. Search is debounced; the input stays mounted and previous results remain visible during loading. Actions are disabled while the displayed snapshot is updating.

Click a campaign to inspect details. Status changes require explicit confirmation, persist in that workspace's local state, and appear in Activity. Historical sample metrics are not rewritten by a status-label change. Drafts cannot be activated through the status control.

### Drafts and approvals

The editor validates campaign name, platform, objective and a proposed daily budget. The prototype planning limits are $10–$1,000 per day, not verified Meta account limits. A second review screen summarizes the daily and 30-day planning amounts and requires acknowledgement before saving. Saving clears the completed brief and opens the separate approval review, including when a status filter would have hidden the new draft. Approval is a separate operation and never changes the draft into a live campaign. The dialog stays open as a local approval record and offers Activity as the next step. Duplicate approval is rejected.

### Assistant

New users see real empty conversation history, not seeded conversation titles. Conversation summaries and messages are scoped to workspace/chat. Sending supports Enter and Shift+Enter. Failed/interrupted requests retain a retry path. The assistant gives deterministic, clearly labeled sample guidance and cannot publish, approve, pause or modify live campaigns. Business context starts empty unless the user saved it.

### Creative workflows

Folder references are optional and saved on the device. Saving a URL does not read or verify a Drive folder and does not request sharing permissions. The form validates supported Google Drive folder URL shapes, trims input, rejects duplicates, and confirms removal. Existing string-array storage is supported.

## Safety boundaries

- Real provider credentials and Meta tokens stay server-side.
- Auth identities are keyed by provider subject, not matched automatically by email.
- Local-auth Meta endpoints require real workspace membership.
- Demo changes are browser-local, not a production approval or audit service.
- Real campaign publishing remains unavailable until server-side roles, approvals, audit, idempotency, spend constraints and an emergency stop exist.
- Do not enable the legacy hosting-header trust flag on a publicly reachable Worker without a verified sanitizing ingress.
- Connecting Meta, account selection, refresh and disconnect are never executed by the UI verification tests.
- Do not claim consent to Terms or a Privacy Policy until real linked documents exist.

## Design and accessibility

The baseline visual styles remain in `src/styles/globals.css`. Compatibility helpers for workflow additions use the same neutral surfaces, black pill actions and existing radii. Base form typography is layered so it does not override Tailwind utilities. The original workspace drawer is 300px, Home sidebar 260px and Performance rail 60px; Home keeps the original 712px content column and 680px composer. Compact screens use the original product menu. The workspace drawer stays above the page at compact widths, supports Escape dismissal and is inert when closed. Reduced motion is respected. Full mobile accessibility and visual regression remain part of the acceptance checklist below.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test` runs authentication security tests using in-memory SQLite and workflow/journey tests using in-memory localStorage. Journey coverage distinguishes identity, connection, account selection and reporting readiness, checks assistant action provenance, and verifies shared sample-data opt-in rules. It covers redirect/cookie/state/session boundaries, identity isolation, membership, 48 reporting-filter combinations, totals, date series, search/empty results, workspace isolation, draft review/approval, budget limits, status filtering, rule drafts, malformed storage and conversation isolation.

For browser acceptance, verify:

- Anonymous welcome shows provider availability honestly and offers demo access.
- Sidebar navigation and workspace selection work on desktop and mobile.
- Campaign search retains focus and changes the table and KPIs together.
- Review acknowledgement gates draft saving; saving resets the brief and opens separate approval even under an active approval filter.
- Approval remains visible as a local record, cannot be repeated, and offers a working Activity link without publication.
- Switching workspaces does not show another workspace's saved draft or messages.
- Meta unconfigured, unauthenticated, expired, active/unselected, selected, error and pending states each have the correct next action.
- Real customer workspaces never display sample reporting without explicitly choosing preview data.
- Mobile dialogs, filters, tables and the assistant remain usable without horizontal page overflow.
