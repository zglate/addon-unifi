# Changelog

## 20260820-01

UniFi Network Application 10.6.97 adds Drift Inspector, Topology Spotlight, and expanded Safe Ops features, along with the improvements and bug fixes listed below.

**Added Drift Inspector to Blueprints in Site Manager**

- Make local changes to sites using Blueprint orchestrations, with a clear view of configuration drift and an easy way to resolve it.

**Added Topology Spotlight**

- Quickly highlight and filter selected devices for easier navigation and troubleshooting in large topologies.

**Improved SafeOps features**

- Expanded Test & Confirm support to VPN and Management networks.
- Added Nightly Channel AI Optimization with configurable radio selection and an improved optimization algorithm.

**Improved Time Machine Experience**

- Added Time Machine for Radios to review radio usage metrics, configuration changes, and radio events from the past 24 hours.
- Expanded Port Manager Time Machine to All Ports, making it easier to identify and troubleshoot problematic network segments.

_47 improvements and 13 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-6-97/ef8cd545-b479-4fac-bdc5-cabdd91692de)

## 20260723-01

UniFi Network Application 10.5.67 includes the improvements and bugfixes listed below.

This release fixes the 10.5.66 local web UI white screen (the app loader referenced a `swai` bundle that was missing from the package; 10.5.67 ships a matching bundle again). The known-issue note is removed from the README.

**Bugfixes**

- Fixed an issue where the Network Server could fail to load when using a local connection.

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-5-67/375288b9-a4b4-46f1-a19d-5c787d342c2b)

## 20260722-01

UniFi Network Application 10.5.66 includes the improvements and bugfixes listed below.

**Improvements**

- Improved Auto STP Edge detection.
- Improved Network Application stability.
- Improved Control Plane protection detection stability.
- Restored maximum download and upload speed indicators on the Dashboard.

**Bugfixes**

- Fixed a rare issue where the Network Application could fail to start after reverting to an older version.

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-5-66/9fd6a940-8f43-4071-a36a-28edcc7e5032)

## 20260713-01

UniFi Network Application 10.5.62 includes the improvements and bugfixes listed below.

**Improvements**

- Added information to CyberSecure settings when Safe Mode is active.
- Added an option to clear the Auto STP Edge assigned status in Port Manager port settings.
- Improved SD-WAN Underlay resiliency.
- Improved the Network Lists user experience and validation.
- Improved RADIUS Server validation.
- Improved application stability.

**Bugfixes**

- Fixed an issue where the STP column in Port Manager Time Machine did not reflect the correct state.
- Fixed an issue where U-LTE adoption could trigger a gateway configuration error.
- Fixed an issue where the Network Application could fail to start after upgrading to Network 10.5.57 on sites with a large number of Traffic Flows.
  - Upgrading from Network 10.5 versions may take up to 30 minutes on sites with a large number of Traffic Flows.
- Fixed an issue where the Test & Confirm feature appeared as available on devices that did not meet the UniFi OS 5.1 requirement.
- Fixed an issue where traffic flow retention was not properly enforced.
- Fixed an issue where Firewall Blocked and Policy-Based Routing system logs were not forwarded to remote SIEM servers.
- Fixed an issue where console memory usage could continue to grow if downloading Traffic Flows was canceled before completion.

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-5-62/5068df72-8188-4778-909f-e3fa870b119a)

## 20260625-01

UniFi Network Application 10.5.54 adds a 24-hour client activity timeline and a set of proactive network-protection and recovery features, along with a broad batch of improvements and bugfixes.

**Client Observability**

Gain complete visibility into client behavior with a 24-hour activity timeline that correlates connectivity, roaming, application usage, and network health into a single troubleshooting experience.

- Review a 24-hour time machine of client activity and events.
- Track connection quality with signal strength, TX retries, latency, and packet loss.
- Analyze roaming history and access-point performance affecting the client experience.

**Safe Ops**

Proactive protection and recovery mechanisms designed to reduce outages, maintain connectivity, and improve operational resilience across UniFi deployments.

- Added Auto STP Edge that automatically sets ports connected to end devices as Edge.
- Added Link Debounce controls to reduce link flapping caused by brief interruptions (requires USW 7.5.4 or newer).
- Added Test & Confirm safeguards that automatically roll back changes if device connectivity is lost after configuration updates (requires UniFi OS 5.1.12 or newer).
- Added Data Plane Protection.
- Enhanced Device Supervisor with global Auto-Recovery controls, including configurable health monitoring and recovery thresholds.

_40 improvements and 19 bugfixes; see release notes for the full list._

[Full release notes](https://community.ui.com/releases/UniFi-Network-Application-10-5-54/fdfe1b15-091c-410b-9cb9-3de3acfc1255)

## 20260615-03

Internal hardening only; no change to how the add-on behaves day to day.

- The build now checks the downloaded UniFi package against Ubiquiti's published SHA256 checksum before installing it, so the build stops with a clear error if the download is ever tampered with, intercepted, or incomplete instead of silently building from a bad file.
- The startup check that warns if a UniFi update moves the sidebar's internal paths now reads the exact list of paths to watch straight from the proxy's own configuration, instead of keeping a second copy by hand that could fall out of step. This closes a gap where three of the setup-screen paths were not being watched, so a future UniFi change to those could have broken the setup screen in the sidebar without any warning.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260615-02

Internal hardening only; no change to how the add-on behaves day to day.

- The startup check that warns if a UniFi update moves the sidebar's internal paths now runs inside the sidebar proxy itself instead of in the shared startup step, keeping it fully clear of the path that brings up the controller so it can never affect normal startup.
- Marked the sidebar proxy's startup script executable to match the other services, removing a latent inconsistency.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260615-01

Fixes sign-in still looping in Firefox over a plain-HTTP address (e.g. `http://<ip>:8123`), even after 20260613-10. The cause was a cookie name clash, not the Secure flag.

- If you have ever opened UniFi's own UI directly over HTTPS (`https://<ip>:8443`), the browser stored UniFi's session cookies as HTTPS-only for that address. Cookies ignore the port, so the browser then refuses to let the plain-HTTP sidebar overwrite them and sign-in loops. Firefox enforces this; Safari and the mobile app did not, so it only showed in Firefox.
- The proxy now gives the sidebar's cookies distinct names so they no longer clash, and translates them back for UniFi. You can use the inline sidebar and the direct UniFi UI at the same time. Confirmed on Firefox and iOS.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-10

Fixes sign-in failing in some browsers (Firefox in particular) when Home Assistant is reached over a plain-HTTP address such as `http://<ip>:8123`. The login would either loop back to the login page or never complete.

- The internal proxy now always relaxes UniFi's session cookies so the browser will keep them over plain HTTP, instead of trying to decide when to do so. The previous build only relaxed them when it thought the connection was plain HTTP, using a signal (the forwarded-protocol header) that Home Assistant does not reliably set: when Home Assistant has an HTTPS address configured, that signal can read "secure" even though your browser is actually on a plain-HTTP address, so the cookie stayed locked to HTTPS and the browser refused to keep it. Apple's in-app browser tolerated this; Firefox correctly did not, which is why it showed up there. Relaxing unconditionally is the same thing the standard nginx cookie setting does, and it matches how other Home Assistant add-ons behave.
- Trade-off: the session cookie is no longer marked HTTPS-only even on HTTPS sessions. For a self-hosted, Home-Assistant-authenticated panel this is the accepted norm, and over plain HTTP the cookie was already in the clear regardless.
- The failure-only troubleshooting log is kept for now so this can be confirmed on a real device; it will be removed in a later build.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-09

Fixes a sign-in regression introduced in 20260613-08. On the mobile companion app over plain HTTP, signing in returned to the login page instead of reaching the dashboard. This build restores the cookie handling that was working in 20260613-07 and confirmed on iPhone.

- Restores the cookie-relaxing step that lets sign-in work over a plain-HTTP connection. The 20260613-08 changelog claimed this step did nothing and removed it, but that was wrong: UniFi marks its session cookies as Secure on every response because its own listener is HTTPS, regardless of how the browser reached Home Assistant. Over a plain-HTTP companion-app connection the browser then refuses to store the cookie, so sign-in looped back to the login page. The proxy again strips the Secure flag only on the plain-HTTP leg (an HTTPS session is left untouched), exactly as 20260613-07 did. Reproduced from a real iPhone log and fixed.
- Reverts the cookie path-scoping change from 20260613-08. It was unrelated to the regression but is dropped to return to the exact known-good 20260613-07 cookie handling; it may be reintroduced later once it can be validated on a real device.
- The 20260613-08 setup wizard font fix, the failure-only troubleshooting log, and the first-start patch ordering are all kept.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-08

Cleanup and hardening build. Sign-in behaviour is unchanged; this build scopes the session cookies more tightly, fixes the setup wizard's fonts inside the sidebar, and removes code that testing showed was doing nothing.

- The session and CSRF cookies are now scoped to the Home Assistant ingress path instead of the whole site. Before, the browser also sent them to Home Assistant's own pages and to other add-ons that share the same address. Now they are only sent to this add-on's own view, which is the only place that needs them. This is done with a standard proxy setting rather than the small script used before.
- The first-run setup wizard now loads its fonts and other bundled assets correctly inside the sidebar. The wizard hardcoded an absolute asset path that escaped the Home Assistant ingress path, so its fonts returned 404 and the browser fell back to default fonts. The proxy now carries the ingress path into that asset base, verified in a browser. (Unrelated and not fixable here: the main dashboard references a few font files that UniFi does not ship in this version; those 404 on direct access to UniFi too and fall back to system fonts.)
- Removes the cookie-relaxing script added in 20260613-06. Local testing against UniFi 10.4.57 showed it was never actually changing anything: UniFi only marks these cookies as Secure when the connection to Home Assistant is genuinely HTTPS, which already matches what the browser expects, so there was nothing to relax. With that script gone, the add-on no longer loads the extra scripting engine in its internal proxy at all. The real fix for the earlier login loop in the mobile companion app was the separate change that forwards only UniFi's own two cookies and drops the larger Home Assistant cookie set, which keeps the request under UniFi's internal header-size limit. That change is kept.
- The internal proxy still suppresses UniFi's Content-Security-Policy. Testing confirmed UniFi 10.4.57 does not send one, so this currently does nothing, but it is kept as a guard: if a future UniFi version ships a policy that would block being shown inside Home Assistant, suppressing it keeps the inline view working.
- The startup script now applies its UniFi interface patches (the upgrade-nag suppression and the sidebar compatibility check) on every start, including the very first start and a settings reset. Before, those steps sat after an early exit that the first start and reset paths take, so a brand-new install only got them on its second restart. The login and dashboard fixes were never affected; this only ensures the cosmetic nag and the compatibility warning are correct from the first boot.
- The internal web server is now installed as a specific, smaller package built to an exact version, instead of the larger general-purpose package pinned only loosely. The previous package bundled an extra scripting engine that this add-on no longer uses (see the cookie change above), so dropping it removes about a megabyte of unused code from the image and makes every build reproducible. The proxy behaves identically; only the package footprint changed.
- The internal proxy now writes a short log line only when a request fails (a 4xx or 5xx response), visible in the add-on Log tab. Successful requests are not logged, so the tab stays quiet in normal use, but a missing asset such as a font returning 404, or a proxy error, is now visible while troubleshooting. The session token is never written to the log. Note that the main dashboard's known missing fonts (described above, a UniFi packaging issue) will show as routine 404 lines; those are expected and can be ignored.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-07

Removes the temporary on-device diagnostics now that the inline sidebar is confirmed working on iPhone, both on the local network over plain HTTP and remotely through Cloudflare over HTTPS, as well as on the desktop. Sign-in holds, the dashboard and live data load, and the live-events connection stays up. The two underlying fixes from the previous builds are kept.

- Removes the client-side reporter, its script injection, and the log routes added in 20260613-02 through 20260613-04. Nothing is beaconed to the add-on Log tab any more.
- Keeps the 20260613-05 fix to UniFi's header-handling code and the 20260613-06 cookie handling that lets sign-in work over a plain-HTTP connection. The cookie handling now runs silently, without the temporary logging.
- One item is intentionally left in place for now: the proxy still suppresses UniFi's Content-Security-Policy. That was added for the diagnostics, but removing it is deferred until it is confirmed that passing UniFi's policy through does not block the embedded view or its live connection. It does not affect functionality.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-06

Fixes the login loop that appeared in the mobile companion app once the 20260613-05 fix let the login page load. Signing in returned success, but the page bounced straight back to the login form and never reached the dashboard. The cause is that UniFi marks its session and CSRF cookies as Secure, and the Home Assistant companion app reaches this server over plain HTTP on the local network. Browsers refuse to store Secure cookies on a non-secure address, so the session cookie was set by the server but never kept by the browser, and the next request was treated as logged out. A desktop browser reaching Home Assistant over HTTPS kept the cookie, which is why this showed up in the companion app over plain HTTP but not on the desktop. Reproduced and verified on iPhone.

- The internal proxy now relaxes those cookies so the browser will store them, but only when the connection to Home Assistant is actually plain HTTP. On an HTTPS connection the cookies are left exactly as UniFi sets them, so nothing is weakened where the traffic is already encrypted. Over plain HTTP the traffic is unencrypted regardless of this setting, so no protection is lost.
- The on-device diagnostic reporter is retained for this build so the sign-in can be confirmed on a real iPhone. It will be removed in the next build once verified.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-05

Fixes the mobile companion app sidebar crash where the inline view showed a "400: Bad Request" page while desktop browsers worked. The evidence gathered in 20260613-02 through 20260613-04 located the exact cause: a latent bug in UniFi's own code that builds an object from a network response's headers. That code keeps the object only while header values are non-empty; an empty-valued response header collapses it to a text value, and the next header then tries to write a property onto that text value. Strict mode rejects that write as an error in any compliant browser engine, which aborts the login page and shows the "400" screen. Desktop browsers never hit it because the responses they received had no empty-valued header in a position that triggered the fault. Reproduced and patch-verified on iPhone.

- The build now applies a one-character correction to UniFi's bundled code so the header object is always preserved regardless of header values. This is the same kind of shipped-asset patch already used for remote access and the cloud-prompt suppression, and the build fails loudly if a future UniFi version changes that code so the patch can be re-derived.
- The on-device diagnostic reporter from 20260613-02 through 20260613-04 is retained for this build so the fix can be confirmed on a real iPhone (the readonly error should no longer appear and the login page should load). It will be removed in the next build once the fix is verified.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-04

Diagnostic build that adds the final piece needed to locate the mobile companion app sidebar crash. The 20260613-03 capture confirmed the failing operation and its position, but showed the bad assignment targets a value held in a local variable that the previous instrumentation could not reach. This build records the source text of the failing operation itself, which names the assignment directly, so the offending code can be located in the UniFi bundle. Still no fix; this is the last evidence-gathering step.

- Records the source of the failing callback and a summary of the data it was processing, alongside the error location already captured.
- All reporting still goes to the add-on Log tab, prefixed `INGRESS-CLIENT-DIAG`.
- This reporter is temporary and will be removed once the cause is identified.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-03

Diagnostic build that extends the 20260613-02 reporter to name the exact cause of the mobile companion app sidebar crash. The 20260613-02 capture proved the unauthenticated login page aborts with a JavaScript "Attempted to assign to readonly property" error inside the UniFi code, which is what produces the "400: Bad Request" screen. The fault only surfaced in the on-device app and not on the desktop, so it could only be identified on a real device. This build still contains no fix; it gathers the last piece of evidence.

- Adds an interceptor that leaves normal operation untouched, but the instant that readonly error occurs it re-runs the failing operation with instrumented objects to record the exact object and property name involved, then re-raises the original error so behavior is unchanged.
- Adds richer error detail (source file, line, column) and captures the first several console errors on the page, not only the one the app labels as fatal.
- All reporting still goes to the add-on Log tab, prefixed `INGRESS-CLIENT-DIAG`.
- This reporter is temporary and will be removed once the cause is identified.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-02

Diagnostic build to capture the actual client-side cause of the mobile companion app sidebar crash, where the view shows a "400: Bad Request" page while desktop browsers work. The storage guard tried in 20260613-01 did not resolve it on a device, and that guard masked `window.localStorage`, which would hide the very behavior we now need to observe, so it has been removed. This build adds no fix; it only gathers evidence.

- The "400" page is UniFi's own internal `/manage/fatal` error screen, whose label defaults to "400". It is not an HTTP 400 from the server, and direct access on port 8443 is unaffected.
- The internal proxy now injects a small client-side reporter ahead of the UniFi app. It records browser environment and storage capability (localStorage, sessionStorage, cookies, indexedDB, secure-context, framed state), uncaught errors, unhandled promise rejections, the SPA's own internal fatal-transition log, network call outcomes, and navigation. Each item is beaconed to the add-on Log tab, where lines are prefixed `INGRESS-CLIENT-DIAG`.
- This lets the real exception that aborts the app in the companion app be seen without a Mac, a console, or Safari Web Inspector, since it cannot be reproduced off-device.
- The per-request header logging from 20260612-06 is retained.
- This reporter is temporary and will be removed once the cause is identified. No functional change to the sidebar view.
- No UniFi version change; still UniFi Network Application 10.4.57.

## 20260613-01

Attempts to address the mobile companion app sidebar crash where the view showed a "400: Bad Request" page while desktop browsers worked. This is a targeted change based on code investigation, not a confirmed fix; it has not yet been verified on a device.

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
