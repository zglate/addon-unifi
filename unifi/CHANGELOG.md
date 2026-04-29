# Changelog

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
