# Roadmap: inline ingress hardening

Tracks hardening follow-ups for the inline UniFi sidebar (HA ingress). The
headline feature works as of 20260613-07, verified on iPhone over plain-HTTP
LAN and remotely via Cloudflare over HTTPS, and on desktop: sign-in holds, the
dashboard and live data load, and the events WebSocket stays up.

None of these block shipping. They are defense-in-depth and robustness items,
informed by a review of how the HA ecosystem handles ingress cookies and CSP.

## Confirmed correct (no action needed)

The cookie posture introduced in 20260613-06 matches an independent peer
add-on (`samrocketman/addons-homeassistant`, WireGuard-UI), which reconstructs
its ingress session cookie as non-Secure, HttpOnly, SameSite=Lax. Our rewrite
produces the same end state, and only on the insecure leg (X-Forwarded-Proto
!= https). Stripping Secure over a plain-HTTP ingress origin removes no
protection that the plaintext transport did not already forgo. RFC 6265 and
OWASP confirm Secure is meaningless on a non-HTTPS origin.

## Items

### 1. Capture UniFi's real CSP and Set-Cookie attributes, then restore CSP

- Status: open, highest value.
- Why: the proxy currently drops UniFi's Content-Security-Policy (added while
  diagnostics needed an injected script). Dropping CSP loses XSS
  defense-in-depth. Best practice is to rewrite selectively, not drop (MDN,
  W3C webappsec). It also confirms the Path / Secure / SameSite attributes we
  currently infer rather than observe.
- Plan: a short diagnostic build logs UniFi's CSP and Set-Cookie attributes,
  then test pass-through. Served same-origin through ingress, UniFi's `'self'`
  directives resolve to the HA origin, so pass-through may work as-is. If it
  breaks, rewrite the minimum: allow the HA origin in `frame-ancestors`, and
  add `wss:` to `connect-src` (which does not reliably cover WebSockets on its
  own per MDN/W3C). Preserve all other directives.
- Risk if skipped: no XSS CSP layer on the embedded UI (behind HA auth, so
  bounded).

### 2. Scope the session cookie Path to the ingress prefix

- Status: open, cheap, evidence-backed.
- Why: UniFi sets `unifises` / `csrf_token` with Path=/, so the browser sends
  them to every other add-on's ingress path and to HA's own endpoints. Path is
  not a security boundary (RFC 6265 8.5/8.6: same-origin JS reads any cookie
  regardless of Path), but it does limit automatic transmission. The peer
  add-on deliberately scopes to `Path=/api/hassio_ingress/`.
- Plan: in the existing header_filter_by_lua rewrite, set
  `Path=/api/hassio_ingress/` on UniFi's cookies. Use the prefix WITHOUT the
  per-session token, which survives ingress token rotation (a token-scoped
  Path would orphan the cookie on rotation and force re-login). This scopes the
  cookie out of HA's `/auth`, `/api`, `/lovelace` paths. It does not isolate
  between sibling add-ons (all share the `/api/hassio_ingress/` prefix), which
  is acceptable: the cookie names are UniFi-unique and HttpOnly.
- Test: on-device, confirm sign-in still holds and survives a normal session.

### 3. Defensive multiple Set-Cookie handling

- Status: open, low priority (works on current HA).
- Why: HA ingress historically forwarded only a single Set-Cookie header
  (supervisor issue #4290, closed not planned). UniFi sets two cookies. Our
  Lua filter preserves both, and both currently reach the browser on HA
  2026.x (a 2025 supervisor/core fix appears to have addressed the limit), but
  we depend on that fix. The peer add-on does not trust it: it combines its
  cookies into one Set-Cookie and splits them back apart on the request side.
- Plan: either add a runtime canary that warns if only one of the two cookies
  survives, or adopt the combine-and-split pattern for older-HA compatibility.
- Risk if skipped: on an older or regressed HA, one cookie could be dropped and
  sign-in would loop again.

## Reference evidence

- HA ingress architecture, single Set-Cookie limit, no cross-add-on cookie
  isolation: home-assistant/supervisor `api/ingress.py`; supervisor issue
  #4290; community PSA thread on the single Set-Cookie workaround.
- Peer add-on cookie handling: `samrocketman/addons-homeassistant`
  WireGuard-UI `rootfs/etc/nginx/servers/ingress.conf`.
- Cookie Path is not a security boundary: RFC 6265 sections 8.5 and 8.6; OWASP
  Session Management Cheat Sheet.
- nginx cookie rewriting: `proxy_cookie_path` (1.1.15+, available on our nginx
  1.18), `proxy_cookie_flags nosecure` (1.19.3+, not available on 1.18, which
  is why the Secure strip uses Lua). No HA add-on was found using either
  directive (authenticated code search across the hassio-addons and
  home-assistant orgs returned zero).
- CSP behind a framed proxy: MDN frame-ancestors and connect-src; W3C
  webappsec-csp; the rewrite-not-drop pattern.
