# Roadmap: inline ingress hardening

Tracks hardening follow-ups for the inline UniFi sidebar (HA ingress). The
headline feature works as of 20260613-09, verified on iPhone over plain-HTTP
LAN: sign-in holds, the dashboard and live data load, and the events WebSocket
stays up. (20260613-08 briefly regressed sign-in by removing the Secure-cookie
strip; -09 restored the known-good -07 cookie handling. See the correction
below.)

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

CORRECTION (2026-06-14, from real-device evidence). The paragraph that used to
sit here concluded the -06/-07 Secure strip was a no-op, on the harness reading
above that "Secure tracks X-Forwarded-Proto." That conclusion was WRONG and it
shipped in -08, which removed the strip and reintroduced the login loop on a
real iPhone over plain HTTP. -09 restored the -07 strip and fixed it. What the
harness missed:

- It set X-Forwarded-Proto explicitly on each leg, so it never reproduced what
  real Supervisor sends on the companion-app plain-HTTP path. On that real path
  UniFi's cookies come back `Secure` (the strip is needed), so X-Forwarded-Proto
  is evidently NOT arriving as a plain `http` value the way the emulator faked.
  UniFi's listener is HTTPS (this proxy reaches it at https://127.0.0.1:8443),
  so absent a forwarded-proto override it has every reason to flag Secure.
- curl/Playwright in the harness do not enforce the browser rule that a Secure
  cookie is silently dropped on a plain-HTTP origin. That rule IS the login
  loop, and it can only be observed on a real device.

Load-bearing conclusion: the Secure strip is real, not a no-op. The cookie
TRIMMING (forwarding only unifises + csrf_token under UniFi's Jetty 8 KB header
limit) and the Secure strip are BOTH required; -06 named only trimming as the
fix, but -08 proved the strip matters too. Any future cookie change must be
confirmed on a physical iPhone over plain-HTTP LAN before being called done.

## Cookie change shipped in -08, REVERTED in -09 (do not retry without device test)

What -08 did: replaced the `header_filter_by_lua_block { ... }` (Secure strip)
with `proxy_cookie_path / /api/hassio_ingress/;` and dropped the two nginx
`load_module` lines, on the harness conclusion that the strip was a no-op.

What happened: the strip was NOT a no-op (see the correction above). On a real
iPhone over plain HTTP, sign-in looped back to the login page. -09 restored the
exact -07 cookie handling (Lua Secure strip + nginx-extras + load_module lines)
and dropped the proxy_cookie_path scoping, returning to known-good. The path
scoping itself was harmless and unrelated to the loop; it was reverted only to
get back to the proven state in one clean step.

The harness results that justified -08 (Set-Cookie scoped on both legs, Secure
tracking X-Forwarded-Proto, login=200, /api/self authenticated, WebSocket 101,
edge cases passing) all still held in the harness. They were just not sufficient,
because the harness cannot model a real browser dropping a Secure cookie over
plain HTTP, nor the real Supervisor's forwarded-proto behaviour. That gap is the
whole lesson: a green harness is necessary but not sufficient for a cookie
change; the physical iPhone over plain-HTTP LAN is the only proof.

Fonts (handled in -08, kept in -09). Two separate situations, do not conflate them:

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

### 2. Scope the session cookie Path to the ingress prefix (shipped -08, reverted -09, deferred)

- Status: shipped in -08, reverted in -09, deferred until device-validated.
- Implemented with the stock `proxy_cookie_path / /api/hassio_ingress/;`
  directive. Token-less prefix survives ingress token rotation. The directive
  itself worked and was not the cause of the -08 login loop (that was the Secure
  strip removal bundled into the same -08 change). It was reverted alongside that
  removal only to return to the exact known-good -07 state in one step.
- To reintroduce: add proxy_cookie_path ON ITS OWN (keep the Secure-strip Lua),
  then confirm sign-in on a physical iPhone over plain-HTTP LAN before shipping.
  Does not isolate between sibling add-ons (all share the /api/hassio_ingress/
  prefix), which is acceptable: cookie names are UniFi-unique and unifises is
  HttpOnly.

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

### 4. Remove the Secure-strip Lua (ATTEMPTED in -08, REVERSED in -09: it was not a no-op)

- Status: closed, do not retry. The premise was wrong.
- -08 removed the -06/-07 Lua Secure strip believing it matched nothing on
  UniFi 10.4.57. The real iPhone proved otherwise: without the strip, the
  Secure cookie is dropped on the plain-HTTP companion-app leg and sign-in
  loops. -09 restored the strip, the Lua module, and the two load_module lines.
- The strip stays. The only path to dropping Lua is a base-image bump to nginx
  1.19.3+ (then `proxy_cookie_flags nosecure` strips Secure natively), and even
  that must be device-validated before claiming the loop stays fixed.

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
