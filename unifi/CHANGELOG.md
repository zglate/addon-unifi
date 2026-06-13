# Changelog

## 20260613-02

Diagnostic build to capture the actual client-side cause of the iOS-only sidebar crash, where the view shows a "400: Bad Request" page while desktop browsers work. The storage guard tried in 20260613-01 did not resolve it on a device, and that guard masked `window.localStorage`, which would hide the very behavior we now need to observe, so it has been removed. This build adds no fix; it only gathers evidence.

- The "400" page is UniFi's own internal `/manage/fatal` error screen, whose label defaults to "400". It is not an HTTP 400 from the server, and direct access on port 8443 is unaffected.
- The internal proxy now injects a small client-side reporter ahead of the UniFi app. It records browser environment and storage capability (localStorage, sessionStorage, cookies, indexedDB, secure-context, framed state), uncaught errors, unhandled promise rejections, the SPA's own internal fatal-transition log, network call outcomes, and navigation. Each item is beaconed to the add-on Log tab, where lines are prefixed `INGRESS-CLIENT-DIAG`.
- This lets the real exception that aborts the app on iOS be seen without a Mac, a console, or Safari Web Inspector, since it cannot be reproduced off-device.
- The per-request header logging from 20260612-06 is retained.
- This reporter is temporary and will be removed once the cause is identified. No functional change to the sidebar view.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-01

Attempts to address the iOS-only sidebar crash where the view showed a "400: Bad Request" page while desktop browsers worked. This is a targeted change based on code investigation, not a confirmed fix; it has not yet been verified on a device.

- The "400" page is UniFi's own internal `/manage/fatal` error screen, whose label defaults to "400". It is not an HTTP 400 from the server, and direct access on port 8443 is unaffected.
- Investigation points to UniFi's startup code reading `window.localStorage` without guarding the access. Inside Home Assistant's iframe, iOS WebKit can throw on that access when cross-site tracking prevention or cookie blocking is active, which would abort startup and route to the fatal page. This throw has not been observed directly on a device, so the cause is suspected, not proven.
- The internal proxy now injects a small storage guard ahead of the UniFi app. It keeps using real browser storage when that works (no change on desktop, saved preferences preserved) and falls back to an in-memory store only when the access would throw.
- The diagnostic request logging from 20260612-06 is retained so the behavior can be checked on devices.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-06

Diagnostic build to track down a "400: Bad Request" that persists behind a Cloudflare tunnel.

- Adds temporary logging to the ingress proxy that records, for each request, the total request size, the status UniFi returned, and the name and byte length of every incoming header (names and lengths only, no values). Visible in the add-on Log tab.
- This is a troubleshooting build, not a fix. It will be removed once the offending header is identified. No functional change to the sidebar view.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-05

Fixed the "400: Bad Request" that persisted for setups behind a Cloudflare Tunnel or Cloudflare Access.

- Cloudflare adds large request headers (notably the `Cf-Access-Jwt-Assertion` JWT, which can run to several KB) that Home Assistant passes through to the add-on. UniFi has no use for them, and they counted toward UniFi's 8 KB header limit, so the sidebar view still failed with 400 even after the cookie fix in 20260612-04. The internal proxy now strips all `Cf-*` headers before forwarding to UniFi.
- This is the same class of problem as 20260612-04 (oversized request headers), now covering the header side as well as the cookie side.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-04

Fixed the sidebar view failing with "400: Bad Request" in the Home Assistant mobile apps.

- UniFi's web server rejects requests whose headers are larger than 8 KB. Because the sidebar view is served on the same origin as Home Assistant, the browser also sends every Home Assistant and remote-access cookie to UniFi, and on the companion apps (especially over remote access) that pushed the request past the limit. The internal proxy now forwards only UniFi's own session cookies, so the request stays small. Direct access on port 8443 was never affected.
- UniFi still shows a dismissable "browser is not supported" notice in the mobile app webview because it does not recognize the app's browser; this is cosmetic and the interface works.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-03

Changed the sidebar icon to a cleaner mark.

- Replaced the router icon with `mdi:radiobox-marked`, a ring with a centered dot that echoes the UniFi logo.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-02

Made the inline sidebar view always-on and removed the configuration toggle that made the add-on unusable in the previous release.

- The UniFi UI now renders inline in Home Assistant with no setup. Use the native "Show in sidebar" toggle on the Info tab to add or hide the "UniFi" entry; "Open Web UI" always opens the same inline view.
- Removed the `ingress` configuration option from 20260612-01. With ingress on, Home Assistant's "Open Web UI" button always targets the inline panel, so an off switch could only ever produce a dead-end page. The internal reverse proxy now always runs.
- The base-path rewrites, redirect re-prefixing, authenticated API, and the live-events WebSocket were all verified end to end against the Home Assistant ingress path.
- Direct access on port 8443 is unaffected and always available.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260612-01

Added an optional Home Assistant sidebar view for the UniFi interface (ingress).

- Enable the `ingress` option on the Configuration tab and restart to render the UniFi UI directly inside Home Assistant. It is off by default.
- The UniFi web app hardcodes that it lives at the web root, so the add-on runs an internal reverse proxy that rewrites the app's base paths so it works behind the Home Assistant ingress path. A startup canary warns if a future UniFi release changes those references.
- This also makes the UI reachable through Home Assistant Cloud (Nabu Casa) without exposing port 8443. Direct access via "Open Web UI" is unchanged.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260518-01

UniFi Network Application 10.4.57 introduces enhanced routing and visibility features, including a new Routing experience with expanded Policy-Based Routing capabilities.

**WAN Insights and WiFi Airtime Visibility**

Expanded Dashboard visibility with new WiFi Airtime, Multicast, and WAN health insights, along with improved ISP and 5G monitoring through enhanced connectivity details, SLA visibility, and utilization metrics.

- Added WiFi Airtime and Multicast activity graphs to the Dashboard.
- Improved the WAN and ISP side panel with SLA, latency, packet loss, and utilization insights.
- Expanded 5G and cellular connection visibility and diagnostics.
  - Requires U5G firmware 7.4.1 or newer.

**Routing User Experience/FIB table**

Introduced a centralized Routing view for managing and troubleshooting Static, OSPF, BGP, Connected, and Policy-Based routes, along with a unified FIB table that provides visibility into route destinations, next hops, interfaces, metrics, and routing sources across the gateway.

_40 improvements and 20 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-4-57/92694b29-fd78-4d52-906a-3211136610e2)

## 20260428-01

UniFi Network Application 10.3.58 includes the improvements and bugfixes below.

_1 improvement and 6 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-3-58/449387c9-4187-44bd-ad47-02da91688dfc)

WebRTC library unchanged, TURN patch applies cleanly.

## 20260417-01

UniFi Network Application 10.3.55 adds Identity Firewall, Improves Device Monitoring, and includes additional improvements and bugfixes.

**Identity Firewall**

Create firewall rules using Identity Roles or individual users to enforce user-based access control independent of IP addresses. Enables consistent policy across devices and simplifies access management as users move between networks.

_Requires UniFi OS 5.1 or newer._

**Client Devices in Infrastructure Topology & Device Supervisor**

Added client device support in Infrastructure Topology and enhanced monitoring for non-UniFi devices (e.g., servers, sensors). Device Supervisor can automatically restart unreachable devices and improves visibility in Topology and Digital Twin.

_22 improvements and 11 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-3-55/3ed8145b-94a2-44b2-a42e-2d970f135b7b)

WebRTC library unchanged, TURN patch applies cleanly.

## 20260413-03

- Added descriptive failure messages to byte verification (from reviewer suggestion on upstream PR)
- Each pre/post-patch check now reports which arch, site, and offset failed

## 20260413-02

Fixed x86_64 crash (SIGILL) reported upstream in [hassio-addons/addon-unifi#635](https://github.com/hassio-addons/addon-unifi/issues/635).

- Corrected x86_64 TURN patch offsets (were 102 bytes off due to an extraction bug in the original analysis)
- Apply full 5-byte NOP on x86_64 instead of 1-byte (required for variable-length x86 instructions)
- Added pre-patch byte verification: confirms we're patching `ba 1a 00 00 00` (mov edx, 0x1a) at the target offsets
- Added post-patch byte verification: confirms NOPs actually landed

### Why it happened

The original x86_64 offsets (0x114D1F, 0x11583D) were derived from a binary that had `md5sum` output mistakenly prepended to the ELF header during extraction over SSH (cat mixed text and binary output). That 102-byte prefix shifted all derived offsets by the same amount. The corruption was caught and fixed in the original PR, but the shifted offsets were kept. The md5 check was added after the fix, so it never caught that the offsets were still wrong.

Correct offsets: 0x114CB9 and 0x1157D7 (confirmed by locating the `mov edx, 0x1a` pattern in the pristine library and verified with byte checks in the Dockerfile).

## 20260413-01

Adopted upstream improvements from [hassio-addons/addon-unifi#631](https://github.com/hassio-addons/addon-unifi/pull/631).

- Patch WebRTC library at build time instead of committing pre-patched binaries
- Verify unmodified library md5 during build so it fails if Ubiquiti updates the library
- Corrected x86_64 md5 (previous committed binary had a corruption bug)
- Restored apt version pins for reproducibility
- Refactored Java 25 install to comply with hadolint DL3008

## 20260409-06

Initial public release.

UniFi Network Application 10.2.105 adds Port Manager Time Machine, improves the Topology, adds Device Supervisor, and includes additional improvements and bugfixes.

**Port Manager Time Machine**

Review the latest 24hr port activity to verify historical device connectivity and analyze anomalies for faster troubleshooting.

**Infrastructure Topology & Digital Twin**

Introduces a topology view focused on core infrastructure, providing clear visibility into key inter-switch and device bridge links. Includes a rack-level and customizable Digital Twin for physical-to-logical mapping and improved operational awareness.

**Device Supervisor**

Monitors UniFi device heartbeats and automatically power-cycles unresponsive devices via PoE switches or UniFi PDUs to restore connectivity with minimal downtime.

_41 improvements and 13 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-2-105/cf38dace-ce91-4e4a-8ab7-a1d2db30aa55)

Fork-specific changes:

- Java 25 via Eclipse Temurin (required by UniFi 10.1+)
- Fix remote access via unifi.ui.com (TURN DONT-FRAGMENT binary patch)
- --enable-native-access for Java 25 native library compatibility
- Suppress "Upgrade to UniFi OS Server" nag on login
- Security: CVE-2026-22557 (CVSS 10.0), CVE-2026-22558 (CVSS 7.7)
