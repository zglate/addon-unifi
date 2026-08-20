# Maintenance Guide

How to maintain this fork. Written so a future version of me (or an AI assistant)
can pick this up without repeating the mistakes from the initial build.

## Updating to a new UniFi version

1. **Verify the download URL exists before touching any files:**

   ```
   curl -sI https://dl.ui.com/unifi/<VERSION>/unifi_sysvinit_all.deb | head -1
   ```

   If it doesn't return 200, the version isn't available yet.

   While you're here, **record the release's published SHA256** for
   `unifi_sysvinit_all.deb` from the community.ui.com release page (Downloads /
   checksums section) — you paste it into the Dockerfile in step 4. Do NOT compute
   it from your own download; the whole point is to verify against Ubiquiti's
   published value, not a hash of whatever you happened to fetch.

   **Getting the published SHA256 requires a human in a real browser.** Every
   automated path was tried on 2026-07-13 and fails — don't re-spend a session
   rediscovering this:

   - The release page is a JS SPA; curl/WebFetch get an empty "Loading Ubiquiti
     Community" shell. The checksums render client-side only.
   - The public GraphQL API behind the page (`POST https://community.svc.ui.com/`
     with `content-type: application/json`) works for metadata and even has the
     field — but it's **empty for every release**, old and new:
     ```
     {"query":"query { release(id: \"<UUID-from-the-release-URL>\") { version links { url checksums { sha256 md5 } } } }"}
     ```
     returns `"checksums":{"sha256":"","md5":""}` on all of them. (The query IS
     useful for the real CDN download URLs, which carry a build suffix like
     `10.5.62-eekg9p6g25`.)
   - `dl.ui.com` hosts no `.sha256`/`SHA256SUMS` sidecar files, on either the
     plain or the suffixed path.
   - `https://fw-update.ui.com/api/firmware-latest?filter=eq~~product~~unifi-controller`
     publishes real per-platform SHA256s but is **stale** — it stopped updating
     at 10.4.57 (checked 2026-07-13). Worth one retry on a future bump; drop
     this note if it comes back to life.
   - The RSS feed (what `scripts/release_notes.py` reads) carries notes only,
     no checksums.

   So: open the release page in a browser, expand the checksums section, and
   copy the SHA256 for `unifi_sysvinit_all.deb` (in an AI-assisted session, the
   maintainer pastes the checksum block into the chat). Then cross-check it by
   hashing a fresh download (`curl -sL <url> | sha256sum` or download-and-hash);
   published value and independent download agreeing is the confirmation the
   Dockerfile pin rests on.

2. **Check the UniFi release notes for dependency changes.** If they bump the
   Java requirement (like the 10.2.x move to Java 25), the Dockerfile needs
   updating too. Check the upstream repo's open PRs for hints.

3. **Check if the WebRTC library changed.** Extract the new deb and compare:

   The Dockerfile's `md5sum --check` will fail the build automatically if
   Ubiquiti ships a new library. That's the canary; if the build fails
   on the md5 check, the patch offsets need re-deriving (see "Re-patching
   the WebRTC library" below). Otherwise, no action needed.

4. **Edit four files:**
   - `unifi/Dockerfile` - **two changes that must move together:**
     1. change the version in the download URL, and
     2. update the hardcoded SHA256 on the `sha256sum --check` line to the
        published checksum you recorded in step 1. **If you change the URL but not
        the checksum, the build fails at `sha256sum --check` even though the URL is
        correct** — the error looks like a download problem but is a stale hash.
        (This is separate from the WebRTC `md5sum --check` canary in step 3.)
   - `unifi/config.yaml` - change the `version` field (addon date version)
   - `unifi/CHANGELOG.md` - add a new version entry at the top
   - `README.md` - update the "Current version" block: the UniFi version, the
     "Released by Ubiquiti" date, and the "Packaged in this fork" date (+ the
     addon build). The upstream date is the `<pubDate>` of the version's item in
     the community RSS feed (`FEED_URL` in `scripts/release_notes.py`, fetched
     with a `User-Agent` header — the bare feed path 400s behind Apollo CSRF).
     The fork date is today's build date. Show the lag from the upstream pubDate
     to when you ship as the cadence flex — "~30 min later", "same day", "2 days
     later" — computed from that RSS pubDate (GMT) to the GitHub release publish
     time. Only claim a tight gap (minutes/hours) when the timestamps back it.

   All four must move together. The README version is user-facing and
   needs to match what actually ships.

5. **Commit both in a single commit.** Message format: `UniFi <version>`

6. **Push to main.**

7. **Generate the changelog entry** for `unifi/CHANGELOG.md` from upstream's release notes, then create a GitHub release.

   ```
   .venv/Scripts/python.exe scripts/release_notes.py <UNIFI_VERSION>
   ```

   That prints a markdown summary (Overview features, counts of improvements/bugfixes, link to full notes). Paste it into `unifi/CHANGELOG.md` under a new `## <ADDON_VERSION>` heading and commit.

   The same script runs in `check-upstream.yaml` and embeds the same summary in the GitHub issue you got notified with — copying from the issue is equivalent.

   Then create the release. **Tag = addon version, title = "UniFi <unifi-version>"**:

   ```
   gh release create v<ADDON_VERSION> \
     --title "<ADDON_VERSION> (UniFi <UNIFI_VERSION>)" \
     --notes "<what changed>"
   ```

   Example: `gh release create v20260518-01 --title "20260518-01 (UniFi 10.4.57)" ...`

8. **Wait for the release event to trigger the deploy workflow.**

   `gh release create` publishes the release, which fires the
   `release: published` event that auto-triggers `deploy.yaml`. Confirm
   with `gh run list --workflow=deploy.yaml --limit 1`.

   Do NOT also run `gh workflow run deploy.yaml -f version=<VERSION>`.
   That fires a second simultaneous deploy and the two builds race to
   push the same image tag, which can leave GHCR with a missing
   manifest (HA update then fails with HTTP 404). Only use the manual
   dispatch as a recovery if the release event genuinely didn't fire.

9. **Close the upstream-tracker issue.** `check-upstream.yaml` opens a
   labeled issue (`new-upstream-version`) for each new UniFi release.
   Once the deploy succeeds, close it with a link to the new release:

   ```
   gh issue close <NUMBER> --comment "Shipped in [v<ADDON_VERSION>](<release-url>) (UniFi <UNIFI_VERSION>). <patch status>"
   ```

   Find the open issue with `gh issue list --label new-upstream-version --state open`.

   A future improvement is to automate this in `deploy.yaml`, but for
   now it's manual — and the workflow does NOT auto-close, so an
   uncleared issue will sit there until you close it.

10. **Leave previous releases in place.** Each release is a rollback
   target: the GHCR image for the previous tag is still pullable, so
   reverting `unifi/config.yaml` to the previous addon version is a
   one-commit rollback. GitHub releases are free metadata; HA
   Supervisor ignores them (it reads `version` from `config.yaml`).
   Only delete a release if it was created in error or the build was
   broken — see "Cleaning up failed releases" below.

## Re-patching the WebRTC library

If Ubiquiti ships a new `libubnt_webrtc_jni.so`, the DONT-FRAGMENT patch
may need to be re-applied with new offsets.

**What to patch:** Two call sites where `AppendFieldEmpty(msg, 0x1A)` adds
the DONT-FRAGMENT attribute to TURN Allocate requests.

**How to find the call sites:**

```bash
# Inside a container with the new library installed:
objdump -d /usr/lib/unifi/lib/native/Linux/aarch64/libubnt_webrtc_jni.so \
  | grep -B2 -A2 "AppendFieldEmpty" \
  | grep -B2 "#0x1a"
```

You should see two sites, each with:
```
mov  w2, #0x1a       // 52800342
bl   AppendFieldEmpty // 97fe????
```

**How to patch:** Replace both instructions (8 bytes each) with ARM64 NOPs:
```
d503201f d503201f
```

**Verification:** After patching, the TURN Allocate request should no longer
contain attribute 0x001A. Use tcpdump inside the container to verify:
```bash
tcpdump -i eth0 -n "host 141.101.90.1 and udp port 3478" -XX -c 4
```

## Ingress sidebar base-path rewrites

The sidebar view works by rewriting a
small set of hardcoded base-path literals in the UniFi web bundles at request
time, in `unifi/rootfs/etc/nginx/ingress-proxy.conf`. The UniFi SPA assumes it
lives at the web root; the rewrites carry the live HA ingress prefix
(`$http_x_ingress_path`) into those literals so it works behind the prefix.

**The literals are content-based, so they survive the per-release bundle-hash
filename renames.** They are NOT guaranteed to survive a UniFi version bump.
The `ingress-nginx` run script (the sidebar proxy's own startup) greps for each
one at startup and logs a warning if any is missing, that warning is the canary
that the rewrites need updating. The watched set is derived from
`ingress-proxy.conf` itself (every `sub_filter` match string), so it can't drift
out of sync with the actual rewrites.

Current literals (canary derives this set live from `ingress-proxy.conf`):

| Where | Literal |
|---|---|
| `index.html` | `<base href="/manage/">` |
| angular `index.js` (chunk loader) | `BASE_HREF:"/manage/"` |
| angular `index.js` (API + WS root) | `apiAdapter:new i.default("/")` |
| `swai.*.js` (React Router basename) | `baseUrl="/manage/"` |
| setup `index.html` (base href) | `<base href="/setup/"/>` |
| setup `index.html` (link hrefs) | `href="/setup/` |
| setup `index.html` (script srcs) | `src="/setup/` |
| setup `main.js` (axios base) | `baseURL:"/",withCredentials` |
| setup `main.js` (webpack publicPath) | `.p="/setup/"` |

The setup `publicPath` rewrite (`.p="/setup/"`) is what makes the setup
wizard's webpack-loaded assets (fonts, lazy chunks) resolve under the ingress
prefix instead of escaping to `/setup/static/...` at the origin root. The manage
app needs no equivalent: its `publicPath` is empty and resolves against the
rewritten base href.

Note on manage dashboard fonts: the dashboard requests a few font files under
`/manage/react/js/<hash>.woff2|.ttf` that UniFi does not ship in 10.4.57 (the
hashes exist nowhere in the bundle; `react/fonts/` holds different files). Those
404 on direct `:8443` access too, so it is pre-existing UniFi packaging, not the
proxy. The browser falls back to system fonts. Not fixable here; do not chase it
as a prefix-escape (the requests are correctly prefixed).

**Re-deriving them** (when the canary warns): exec into the running container
and inspect `/usr/lib/unifi/webapps/ROOT/app-unifi/`. The router basename is
the subtle one, in standalone+local mode swai hardcodes
`a?.isStandalone&&a?.isLocal&&(a.baseUrl="/manage/")`, and THAT assignment (not
the boot option) is the basename. Validate against a real prefix locally with
the harness in `investigations/ingress/` (an nginx that fakes HA ingress in
front of the addon image) before shipping. Watch for `PREFIX-ESCAPE` in the
browser Network tab, that is the tripwire for a path that dodged a rewrite.

Other ingress gotchas already handled in `ingress-proxy.conf` (don't remove):
strip `Origin`/`Referer` (UniFi CSRF guard rejects the proxied values), hide
`Strict-Transport-Security` (else it poisons the HA origin), `absolute_redirect
off` + re-prefix `Location` (keep redirects inside the ingress path), and the
WebSocket `Upgrade`/`Connection` forwarding (live events).

### Cookie trim (the mobile companion app "400 Bad Request" fix)

UniFi's embedded Jetty rejects any request whose total headers exceed 8 KB with
a branded "400 Bad Request" page. HA serves this panel same-origin, and the
Supervisor forwards the browser's *entire* cookie jar to the add-on unmodified
(it strips other headers but never `Cookie`). The jar carries cookies UniFi
never set, HA's `ingress_session`, other ingress add-ons sharing the
`/api/hassio_ingress/` path, and Cloudflare/Nabu Casa remote-UI cookies. Over
remote UI (the usual path for the HA companion app) that pile crosses 8 KB and
Jetty 400s, which is why it shows in the iOS/Android apps but not always on a
local desktop browser.

Fix: forward only UniFi's own cookies. `nginx.conf` extracts `unifises` and
`csrf_token` via `map` directives; `ingress-proxy.conf` sets
`Cookie "$unifi_c_session; $unifi_c_csrf"`. `nginx.conf` also raises
`large_client_header_buffers`/`client_header_buffer_size` to 16k so the add-on's
own nginx accepts the large incoming request before trimming it.

**This is a whitelist** chosen deliberately over a blacklist: the foreign cookie
set is open-ended (other add-ons, CDN, remote-UI infra) and cannot be enumerated
to prove it stays under 8 KB, whereas UniFi's set is just those two cookies. If
a future UniFi version adds an auth/session cookie, it will be dropped and show
up as a login or CSRF failure right after the upgrade, add the new cookie name
to both `map` blocks and the `Cookie` line. The UniFi standalone controller has
used `unifises` + `csrf_token` for years; the JWT `TOKEN` cookie is UniFi OS
console, not this app.

The same 8 KB limit is also hit on the **header** side when Home Assistant sits
behind a Cloudflare Tunnel or Cloudflare Access: Cloudflare injects `Cf-*`
request headers, and `Cf-Access-Jwt-Assertion` is a JWT that can be several KB.
UniFi needs none of them, so `ingress-proxy.conf` clears the `Cf-*` family with
`proxy_set_header ... ""`. If a user reports a 400 only over remote access,
suspect a new oversized header from whatever proxy fronts HA and clear it the
same way.

### Failure-only access log (20260613-08)

`nginx.conf` logs an access line only for 4xx/5xx responses, via
`map $status $loggable { ~^[23] 0; default 1; }` plus
`access_log /dev/stderr ingress_err if=$loggable;`. Normal 2xx/3xx traffic is
not logged, so the add-on Log tab stays quiet until something fails (a missing
asset, a proxy error). Format is `$status $request_method $uri ... ua=...`.

Two cautions. First, it is token-safe ONLY because the custom `ingress_err`
format omits `Referer`: the request `$uri` Supervisor forwards is already
prefix- and token-stripped, but the browser's `Referer` still carries the full
ingress URL with the session token. Do NOT switch this to the stock `combined`
format, or the token lands in the log. Second, the known missing manage-dashboard
fonts (a UniFi packaging issue, see the fonts note) 404 on every dashboard load,
so this log always carries some `/manage/react/js/*.woff2|.ttf` 404 noise; a real
new failure is what to look for, not the steady background 404s. If the noise
ever outweighs the value, gate the `access_log` line behind the `log_level`
option (read it in the ingress-nginx service and template the config) so it is
off by default and opt-in for debugging.

### Secure-cookie relax (the mobile companion app login loop) and a removal that backfired

UniFi marks `unifises` and `csrf_token` with `Secure` (and `SameSite=None`) on
every response. The reason is that this proxy reaches UniFi at
`https://127.0.0.1:8443`, so UniFi's own listener is always TLS and it flags the
cookies `Secure` regardless of how the browser reached Home Assistant. When HA
is reached over plain HTTP (the companion app on a LAN IP,
`X-Forwarded-Proto: http`), the browser refuses to store a `Secure` cookie on
that non-secure origin: `POST /api/login` returns 200 and sets the cookie, the
browser drops it, the next `/api/self` is 401, and the UI loops back to login. A
desktop over HTTPS keeps the cookie, which is why it only shows on the phone.

Fix (current, since 20260613-10): a `header_filter_by_lua_block` in
`ingress-proxy.conf` strips `Secure` from every `Set-Cookie` and downgrades
`SameSite=None` to `Lax` (None without Secure is rejected), **unconditionally**.
This needs the nginx Lua module, so the image installs `nginx-extras` and
`nginx.conf` carries the two `load_module` lines.

This is exactly what `proxy_cookie_flags ~ nosecure;` does. That directive needs
nginx >= 1.19.3 and the focal base ships 1.18, so the Lua does it instead. **When
the base image moves to nginx >= 1.19.3, delete the Lua block and the two
`load_module` lines and replace with `proxy_cookie_flags ~ nosecure;`** (see the
"nginx base bump" item in ROADMAP.md). The Lua and the directive are equivalent;
the directive is just the idiomatic one-liner once the version supports it.

**Do NOT gate the strip on `X-Forwarded-Proto`.** Supervisor does not set that
header (it only adds `X-Forwarded-For`; confirmed in `supervisor/api/ingress.py`),
so any value reaching us comes from whatever fronts HA and can read `https` even
when the browser is on a plain-HTTP origin. The ingress edge is always plain
HTTP, so the strip is always correct; an HTTPS-origin browser still works with a
non-Secure cookie. This unconditional form matches peer ingress add-ons, whose
cookies are not `Secure` either (most avoid the problem entirely by proxying an
HTTP backend; UniFi is HTTPS-only on 8443, so we must strip).

**Two regressions this section exists to prevent (do not repeat):**
- 20260613-08 deleted the strip on the theory that UniFi only sets `Secure` when
  it sees `X-Forwarded-Proto: https`. Wrong: UniFi sets `Secure` from its own
  HTTPS listener, so over plain HTTP the cookie stayed `Secure` and login looped
  on the real iPhone. 20260613-09 restored the strip.
- 20260613-09 restored the strip but kept the `X-Forwarded-Proto != https` guard
  from -06/-07. That guard fails when HA reports `https` while the browser is on
  a plain-HTTP origin: the strip did not fire, `Secure` stayed, and Firefox
  (which, unlike Apple's WebView, strictly refuses Secure cookies over HTTP)
  looped on `http://<ip>:8123`. 20260613-10 removed the guard (unconditional).

Lesson: the local harness (curl) cannot reproduce a real browser refusing a
`Secure` cookie over plain HTTP, nor the forwarded-proto a real HA front-end
sends, so a cookie change that "passes" locally must still be confirmed on a
physical device (and ideally a strict browser like Firefox) before claiming it
works. 20260613-08 also briefly added `proxy_cookie_path` Path scoping
(harmless, unrelated to either loop); dropped in -09 and not reinstated.

### Cookie namespacing (the Firefox Secure-cookie collision, since 20260615-01)

20260613-10 made the strip unconditional and confirmed (via a Firefox HAR) that
`Set-Cookie` arrives with no `Secure` flag, yet Firefox login still looped. The
browser console gave the exact reason:

```
Cookie "unifises" has been rejected because there is an existing "secure" cookie.
Cookie "csrf_token" has been rejected because there is an existing "secure" cookie.
```

Root cause is a cookie **name collision**, not the flag. UniFi serves its own UI
over HTTPS on 8443; reaching that directly (the "Open Web UI" button,
`https://<ip>:8443`) makes UniFi set `unifises` / `csrf_token` as `Secure` for
that host. **Cookies ignore port**, so those Secure cookies share the jar the
plain-HTTP ingress on 8123 uses. The "leave secure cookies alone" rule
(RFC 6265bis) forbids a non-secure (http) origin from overwriting an existing
`Secure` cookie of the same name, so the ingress login cookies were rejected and
the old Secure ones were never sent over http. iOS WebView is lenient here;
Firefox enforces it.

Path scoping does **not** dodge this: the 8443 cookie sits at `Path=/`, which
prefix-matches every deeper path, so a path-scoped ingress cookie still counts as
the same cookie and is still rejected.

Fix: **namespace the ingress cookies** so their names never collide.
- Outbound, the `header_filter_by_lua_block` renames `unifises` ->
  `unifises_ing` and `csrf_token` -> `csrf_token_ing` (alongside the Secure
  strip).
- Inbound, the `map` blocks in `nginx.conf` match the `_ing` names and re-emit
  the original names in the `Cookie` header, so UniFi sees what it expects.
- The SPA's JS reads `csrf_token` from `document.cookie` to set `X-Csrf-Token`;
  it can no longer find the renamed cookie, so `ingress-proxy.conf` injects
  `X-Csrf-Token` from `$unifi_csrf_value` (the `_ing` csrf cookie value).

This keeps plain-HTTP ingress working and lets the inline sidebar and the direct
8443 UI be used at the same time. It is also consistent on HTTPS (a non-Secure
`_ing` cookie is accepted over HTTPS too). The robust alternative considered and
not taken was serving HA over HTTPS (which makes the ingress a secure context and
removes the collision with no add-on change); namespacing was chosen so the
fork's plain-HTTP inline feature works without the user changing their HA setup.

If a future UniFi version renames the SPA's csrf-cookie read or adds another
auth cookie, the rename pairs above (Lua + both maps) and the injected header are
the places to update; symptom is a login or CSRF failure right after upgrade.

## Verifying the GHCR image after a deploy

Especially if a deploy ran twice for the same tag (the race in step 8), confirm
both arch images exist and the manifest is intact before updating HA:

```
for arch in aarch64 amd64; do
  gh api "user/packages/container/unifi%2F$arch/versions" \
    | python -c "import sys,json; v=[x for x in json.load(sys.stdin) if '<ADDON_VERSION>' in x['metadata']['container']['tags']]; print('$arch', v[0]['metadata']['container']['tags'] if v else 'MISSING')"
done
# Definitive pull-side check (manifest must resolve, not 404):
echo "$(gh auth token)" | docker login ghcr.io -u zglate --password-stdin
docker buildx imagetools inspect ghcr.io/zglate/unifi/aarch64:<ADDON_VERSION>
```

## Versioning scheme

- Date-based: `YYYYMMDD-NN` (e.g., `20260409-03`)
- The date is when the build was made, NN is the build number for that day
- **CHECK TODAY'S ACTUAL DATE before you stamp a build.** The date is typed
  by hand, nothing derives it, so it silently goes stale the moment you reuse
  the previous build's number on a later day. Confirm the real current date
  first (the session header / `currentDate` states it; if unsure, run `date`),
  then build the version from it. When the date rolls to a new day, reset NN
  to `01`; NN only increments for multiple builds within the same day.
- This has been gotten wrong: builds kept the `20260613` stamp while the real
  date had already moved to `20260615`. If today is not the date in the last
  release tag, the next build's date must move forward, not just NN.
- This decouples the addon version from the UniFi version, which matters
  when you need to downgrade UniFi but still have HA see it as an "update"
- **Release tag = addon version, title = UniFi version.** Tag `v20260518-01`,
  title `UniFi 10.4.57`. The addon version is the unique key (multiple
  addon builds can ship the same UniFi version — see `v20260413-02` and
  `v20260413-03`, both UniFi 10.2.105), so it has to be in the tag. The
  UniFi version goes in the title for readability.

## Rolling back

If a new UniFi version misbehaves, roll back by reverting
`unifi/config.yaml` to the previous addon version and pushing. HA
Supervisor will see the older version as an "update" (because the
addon version is date-based and the new one is newer) and pull the
still-existing GHCR image. No need to rebuild — the previous image is
intact at `ghcr.io/zglate/unifi/{arch}:<previous-addon-version>`.

Do not delete the previous GitHub release until you're confident the
new build is stable in production.

## What NOT to do

- **Don't change the release tag convention to use the UniFi version.**
  It looks more readable on the releases page, but addon versions are
  non-unique within a UniFi version (`v20260413-02` and `v20260413-03`
  both shipped UniFi 10.2.105 — a reroll after a bad build). The addon
  version has to be the tag because it's the unique identifier. Learned
  2026-05-18 the hard way: shipped `v10.4.57`, had to delete it and
  recreate as `v20260518-01`. Before "improving" a convention that's
  in place, find the load-bearing constraint first.
- **Don't follow a "delete the previous release" rule reflexively.**
  Previous releases are rollback targets — the GHCR image they
  reference is what makes `config.yaml` revert work. The old
  MAINTENANCE.md said to delete them; that was wrong. Only delete a
  release if it was created in error or had a broken build. See
  "Rolling back" above.
- **Don't create a release before the code is ready.** Get the commit right
  first, then tag and release. Deleting and recreating releases leaves ghost
  tags and stale GHCR images.
- **Don't iterate on main with multiple small fix commits.** If something is
  broken, fix it locally, test the Dockerfile locally if possible, then push
  one clean commit.
- **Don't pin apt package versions** unless a specific version is known to
  break. Unpinned packages make base image updates seamless. The tradeoff
  (non-reproducible builds) is acceptable for a personal fork.
- **Don't use the shared workflows from hassio-addons/workflows.** They
  require a DISPATCH_TOKEN for the community repository which we don't have.
  Our CI/CD is self-contained.
- **Don't replace the patched WebRTC library** without checking if the
  DONT-FRAGMENT bug is fixed upstream first.
- **Don't construct multi-line git commit messages with `$(printf '\n')`
  in a single-line bash command.** The substitutions run in the outer
  shell but the resulting `-m` argument is still one long line — git
  records it as a title-only commit with no body separator. Use a
  heredoc instead: `git commit -F - <<'EOF'`.

## Cleaning up failed releases

If a release was created in error (e.g., bad commit, deploy failed and
left a half-pushed manifest), delete both the release and the tag:

```
gh release delete v<VERSION> --yes
git push origin --delete v<VERSION>
```

For a successful but superseded release, do nothing — keep it as a
rollback target.

## Cleaning up stale GHCR images

GHCR images are independent of GitHub releases. Deleting a release
does NOT delete the image; the image remains pullable until you
explicitly delete the package version.

**Almost always: don't.** The image is what makes the rollback path
work. The only legitimate reason to delete a tagged image is if it was
pushed broken (failed deploy) and you don't want anyone pulling it.
**Never delete untagged versions** — they're backing manifests for
multi-arch indexes; deleting them breaks pulls of the tagged versions
that reference them.

If you must clean up a specific tagged version:

```bash
# List versions for a package
gh api user/packages/container/unifi%2Famd64/versions --jq '.[].metadata.container.tags'

# Delete a specific version by ID (get ID from the list above)
gh api --method DELETE user/packages/container/unifi%2Famd64/versions/<VERSION_ID>
```

Repeat for `unifi%2Faarch64`.

## CI/CD architecture

- **ci.yaml** - Runs on push/PR. Builds both architectures and runs smoke
  tests (Java, UniFi jar, MongoDB). Does not push images.
- **deploy.yaml** - Runs on release publish or manual dispatch. Builds both
  architectures and pushes to GHCR. Uses `frenck/action-addon-information`
  to read addon metadata from config.yaml.

Both workflows are self-contained. No external workflow dependencies.

## Key dependencies to watch

| Dependency | Where | Risk |
|------------|-------|------|
| `ghcr.io/hassio-addons/ubuntu-base` | `unifi/build.yaml` | Base image could be updated or removed |
| Eclipse Temurin (Adoptium) | `unifi/Dockerfile` | Java version must match what UniFi requires |
| MongoDB | `unifi/Dockerfile` | UniFi may require a newer version eventually |
| `frenck/action-addon-information` | `deploy.yaml` | Third-party Action; pinned to v1.4.2 |
| GitHub Actions runners | Both workflows | aarch64 builds use `ubuntu-24.04-arm` |
| `libubnt_webrtc_jni.so` | Patched in `unifi/Dockerfile` at build time | md5 check fails the build if Ubiquiti ships a new library |

## How HA discovers updates

1. HA Supervisor periodically git-pulls the repo
2. It reads `version` from `unifi/config.yaml`
3. It compares against the installed version
4. If newer, it offers an update in the UI
5. The `image` field in config.yaml tells it where to pull: `ghcr.io/zglate/unifi/{arch}:{version}`

## GitHub authentication

The `zglate` account is used for this fork. The gh CLI needs these scopes:
`repo`, `workflow`, `read:packages`, `write:packages`. Re-authenticate with:

```
gh auth login -h github.com -w -s repo,workflow,read:packages,write:packages
```

**The token is a gh OAuth token (`gho_...`), not a classic PAT.** That matters:

- OAuth tokens need the **`workflow`** scope to trigger Actions on `push` /
  `release`. Without it, your push lands and your release publishes, but no CI
  or Deploy run starts (silently). Symptom: "I shipped but nothing built."
- Pushing to GHCR (manual `docker push`, or the Deploy workflow) needs
  **`write:packages`**.
- **Verify the real scopes with `GH_DEBUG=1 gh auth status`** (it prints the
  actual keyring token scopes). Do NOT trust `gh api -i user`'s
  `X-Oauth-Scopes` header or plain `gh auth status` here, both have served
  STALE scope lists and sent a whole session chasing a non-problem. If the
  scopes look wrong, re-run the `gh auth login` above and approve every scope
  on the consent page before re-checking with `GH_DEBUG=1`.
- More than one account may be logged in to `gh`. Confirm the fork account
  (`zglate`) is active (`gh auth status` shows "Active account: true"). Never
  operate this fork under any other logged-in account.

### Commit identity is separate from the gh account — set it per repo

`gh auth switch` changes only the **API/push credential**, NOT the git commit
author. The commit author/committer come from `git config user.name`/`user.email`.
If the machine's global git identity is a different (e.g. work) identity, a commit
will be authored under that identity even while `gh` is `zglate` — and pushing it
leaks that name/email onto public commits.

- Every working copy of this fork must carry repo-local identity:
  ```
  git config user.name  "zglate"
  git config user.email "160789597+zglate@users.noreply.github.com"
  ```
- **Fresh clones inherit the global identity** — set the two lines above before
  the first commit in any new or temporary clone.
- **Before every push/release, verify the author, not just the gh account:**
  ```
  git log -1 --format='%an <%ae> | %cn <%ce>'
  ```
  It must show `zglate`. If not, fix with `git commit --amend --reset-author
  --no-edit` before pushing.
- This is a pre-push gate because it cannot be cleanly undone afterward: a
  misauthored commit pushed into the fork network stays reachable by SHA, and
  GitHub's Private Information Removal policy does NOT cover names/email addresses
  in commit metadata (confirmed 2026-06-25). Rewrite + force-push fixes live refs
  but leaves the orphaned commit reachable.

**Creating a release when `gh release create` complains about the `workflow`
scope:** that's a client-side gh check, not an API requirement. Create the
release straight through the REST API (needs only `repo`):

```
gh api repos/zglate/addon-unifi/releases -X POST \
  -f tag_name=v<ADDON_VERSION> -f target_commitish=main \
  -f name="<ADDON_VERSION> (UniFi <UNIFI_VERSION>)" -f body="<notes>"
```

## Checking CI/CD status: do NOT trust `gh run list`

`gh run list` (and `gh run list --workflow=...`) has repeatedly served a
**stale cached page** that showed runs from weeks ago as the "latest," making
it look like push/release events never triggered anything. They had. This
burned a whole session. For ground truth, hit the runs API directly:

```
gh api 'repos/zglate/addon-unifi/actions/runs?per_page=5' \
  | python -c "import sys,json; [print(r['created_at'],r['name'],r['event'],r['status'],r['conclusion']) for r in json.load(sys.stdin)['workflow_runs']]"
```

If that shows your run (even `in_progress`), the trigger worked, stop
debugging the trigger.
