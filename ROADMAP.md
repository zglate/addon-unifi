# Roadmap: inline ingress hardening

Tracks hardening follow-ups for the inline UniFi sidebar (HA ingress). The
headline feature works as of 20260613-07, verified on iPhone over plain-HTTP
LAN and remotely via Cloudflare over HTTPS, and on desktop: sign-in holds, the
dashboard and live data load, and the events WebSocket stays up.

None of these block shipping. They are defense-in-depth and robustness items.

## Local evidence baseline (2026-06-13)

Captured against the real UniFi controller (version 10.4.57.0, the deployed
version) running in the local e2e harness (investigations/ingress), behind a
faithful HA-ingress emulator that strips the prefix and injects X-Ingress-Path.
Cookie values redacted; only attributes recorded.

Raw UniFi responses on 8443:

```
GET /setup/   200  X-Frame-Options: SAMEORIGIN   (no Content-Security-Policy)
GET /api/self 200  X-Frame-Options: DENY         (no Content-Security-Policy)
Set-Cookie: unifises=<v>; Path=/; HttpOnly
Set-Cookie: csrf_token=<v>; Path=/
```

Decisive observations:

1. UniFi 10.4.57 sends NO Content-Security-Policy on any endpoint. Our
   `proxy_hide_header Content-Security-Policy` hides a header that does not
   exist. There is nothing to "restore."
2. X-Frame-Options is SAMEORIGIN on the app HTML, DENY on APIs. SAMEORIGIN is
   satisfied because HA frames ingress same-origin, which is why the iframe
   renders. We correctly leave XFO untouched.
3. Cookies carry NO SameSite and (on a plain-HTTP leg) NO Secure. UniFi adds
   Secure ONLY when it sees `X-Forwarded-Proto: https`. Confirmed by sending
   that header through the proxy: the cookies came back with `Secure`; without
   it, no `Secure`.

Consequence for the shipped 20260613-06/-07 cookie Lua: in production Supervisor
sets X-Forwarded-Proto to match the real browser transport, so UniFi's Secure
flag always agrees with the browser's context and the browser stores the cookie
in both the HTTP and HTTPS cases. The Lua `Secure` strip and `SameSite=None ->
Lax` downgrade therefore match nothing on 10.4.57 in any real path: they are a
no-op. The genuine login-loop fix (observed in the mobile companion app,
reproduced and validated on iOS) was the cookie TRIMMING (forwarding only
unifises + csrf_token to keep the request under UniFi's Jetty 8 KB header
limit), not the Secure rewrite.

## Validated change proposed for -08 (awaiting approval)

Tested in the e2e harness against UniFi 10.4.57. Net effect: scopes the session
cookies to the ingress mount AND removes the Lua dependency.

In ingress-proxy.conf, replace the `header_filter_by_lua_block { ... }` with a
single stock directive (nginx 1.1.15+, available on the add-on's 1.18):

```
proxy_cookie_path / /api/hassio_ingress/;
```

In nginx.conf, drop the two `load_module` lines (ndk + lua) and the explanatory
comment, since nothing else uses Lua.

Harness results (both cookies, both legs):

```
insecure leg:  Set-Cookie: unifises=<v>; Path=/api/hassio_ingress/; HttpOnly
               Set-Cookie: csrf_token=<v>; Path=/api/hassio_ingress/
secure leg:    Set-Cookie: unifises=<v>; Path=/api/hassio_ingress/; Secure; HttpOnly
               Set-Cookie: csrf_token=<v>; Path=/api/hassio_ingress/; Secure
```

A stateful cookie-jar round-trip confirmed the scoped cookie is still sent on
requests under the prefix (the only paths the UI uses), so sign-in is unaffected,
while RFC 6265 path-matching keeps it off HA's own /api, /auth, /lovelace paths.

Local verification done (2026-06-13). Built the real -08 image and ran the full
e2e harness against UniFi 10.4.57 behind the HA-ingress emulator:

- nginx starts and validates with no Lua module loaded.
- Set-Cookie scoped to Path=/api/hassio_ingress/ on both legs, both cookies
  survive, Secure still tracks X-Forwarded-Proto.
- Provisioned an admin, then through the full ingress prefix with the scoped
  cookie: POST /api/login = 200, GET /api/self returns the authenticated admin,
  and the events WebSocket upgrades (101).
- WebKit with an iPhone user agent rendered the real /manage/ login SPA inline
  under the prefix with no readonly-property crash, no /manage/fatal, no "400";
  the only console line is the expected 401 from the login page's own /api/self.
- Regression edge cases pass against our nginx: a 10 KB foreign cookie jar is
  trimmed (no 400), a 6 KB Cloudflare JWT is stripped (no 400), redirects are
  re-prefixed, sub_filter rewrites fire, X-Frame-Options SAMEORIGIN is intact,
  no CSP or HSTS leaks.

Still owed: confirm sign-in on a real iPhone (LAN HTTP and Cloudflare HTTPS),
since Playwright WebKit approximates but is not iOS WebKit.

Fonts (handled in -08). Two separate situations, do not conflate them:

- Setup wizard fonts: FIXED. The setup bundle hardcoded webpack
  publicPath="/setup/" (absolute), so its fonts and lazy chunks were fetched
  from /setup/static/... at the origin root and escaped the prefix, even though
  the files exist. The fix is one more sub_filter that carries the ingress
  prefix into that publicPath literal (.p="/setup/"). Browser-verified: the font
  now loads 200 under the prefix, zero escapes, no console errors, app still
  renders. base href does not help because webpack uses publicPath, not the
  document base, to build asset URLs. The manage app needs no equivalent (empty
  publicPath, resolves via base href).
- Manage dashboard fonts: NOT fixable here, pre-existing UniFi packaging. The
  dashboard requests a few fonts under /manage/react/js/<hash>.woff2|.ttf whose
  hashes exist nowhere in the bundle (react/fonts/ ships different files). They
  404 on direct :8443 access too, are correctly prefixed (not a proxy escape),
  and fall back to system fonts. Cosmetic; outside the add-on's control.

## Items

### 1. Content-Security-Policy: do NOT add one (revised, was "restore")

- Status: closed by evidence, recommend no action.
- Original premise was that we drop UniFi's CSP. UniFi 10.4.57 ships no CSP, so
  there is nothing to restore. The remaining question is whether to AUTHOR one.
- Recommendation: no. A meaningful CSP for UniFi's Angular/webpack SPA would
  require `script-src 'unsafe-inline' 'unsafe-eval'` (inline bootstrap and eval
  are typical for these bundles), which guts the XSS benefit, and `connect-src`
  would have to allow the controller origin plus `wss:` for the live-events
  socket or the dashboard breaks. The UI also sits behind HA authentication.
  Low marginal value against real risk of breaking the framed app.
- If ever revisited, the only low-risk addition is a `frame-ancestors 'self'`
  directive, which the same-origin frame already satisfies via X-Frame-Options.

### 2. Scope the session cookie Path to the ingress prefix (validated)

- Status: validated in harness, ready to ship in -08 (see proposed change).
- Implemented with the stock `proxy_cookie_path / /api/hassio_ingress/;`
  directive rather than Lua. Token-less prefix survives ingress token rotation.
- Confirmed: both cookies rewritten on both legs, cookies still round-trip under
  the prefix, Secure still tracks the transport. Does not isolate between
  sibling add-ons (all share the /api/hassio_ingress/ prefix), which is
  acceptable: cookie names are UniFi-unique and unifises is HttpOnly.

### 3. Multiple Set-Cookie handling

- Status: tested, recommend document-only (no code change).
- Both UniFi cookies survive the full emulator path on current HA (verified).
  The historical single-Set-Cookie limit (supervisor issue #4290) is fixed on
  2026.x. The plain-nginx emulator forwards both and cannot reproduce the old
  limit, so there is nothing to test against here.
- A combine-and-split workaround would harden against an old/regressed HA but
  reintroduces Lua, directly undoing the simplification in the -08 change above.
  Not worth it for a limit that current HA no longer has. Documented as a known
  dependency instead.

### 4. Remove the no-op Secure-strip Lua (new, from evidence)

- Status: folded into the -08 change above.
- The -06/-07 Lua `Secure` strip and `SameSite=None -> Lax` downgrade match
  nothing on UniFi 10.4.57 in any real transport path (see evidence baseline).
  Removing them, together with adopting proxy_cookie_path for item 2, lets the
  add-on drop the Lua module and the two load_module lines entirely. Update the
  CHANGELOG to correct the -06 root-cause note (the loop fix was cookie
  trimming, not the Secure rewrite).

## Confirmed correct (no action needed)

The cookie TRIMMING introduced earlier (forwarding only unifises + csrf_token,
dropping the HA cookie jar) is the real, load-bearing fix: it keeps the request
under UniFi's Jetty 8 KB header limit and is what stops the 400 / login loop in
the companion app. Keep it.

## Reference evidence

- HA ingress architecture, single Set-Cookie limit history, no cross-add-on
  cookie isolation: home-assistant/supervisor api/ingress.py; supervisor issue
  #4290; community thread on the single Set-Cookie workaround.
- Peer add-on cookie handling: samrocketman/addons-homeassistant WireGuard-UI
  rootfs/etc/nginx/servers/ingress.conf (scopes Path to /api/hassio_ingress/).
- Cookie Path is not a security boundary: RFC 6265 sections 8.5 and 8.6; OWASP
  Session Management Cheat Sheet. RFC 6265 5.1.4 path-matching is what keeps a
  prefix-scoped cookie off non-prefix paths.
- nginx cookie rewriting: proxy_cookie_path (1.1.15+, available on our nginx
  1.18); proxy_cookie_flags nosecure (1.19.3+, not available on 1.18). No HA
  add-on was found using either directive (authenticated code search across the
  hassio-addons and home-assistant orgs returned zero).
- Local capture 2026-06-13 against UniFi 10.4.57 in investigations/ingress
  (docker-compose.e2e.yaml + ha-emulator.conf): the evidence baseline above.
