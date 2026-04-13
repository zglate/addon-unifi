# Changelog

## 20260413-03

- Add descriptive failure messages to byte verification (from reviewer suggestion on upstream PR)
- Each pre/post-patch check now reports which arch, site, and offset failed

## 20260413-02

Fix x86_64 crash (SIGILL) reported upstream in [hassio-addons/addon-unifi#635](https://github.com/hassio-addons/addon-unifi/issues/635).

- Correct x86_64 TURN patch offsets (were 102 bytes off due to an extraction bug in the original analysis)
- Apply full 5-byte NOP on x86_64 instead of 1-byte (required for variable-length x86 instructions)
- Add pre-patch byte verification: confirms we're patching `ba 1a 00 00 00` (mov edx, 0x1a) at the target offsets
- Add post-patch byte verification: confirms NOPs actually landed

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

- UniFi Network Application 10.2.105
- Java 25 via Eclipse Temurin (required by UniFi 10.1+)
- Fix remote access via unifi.ui.com (TURN DONT-FRAGMENT binary patch)
- --enable-native-access for Java 25 native library compatibility
- Suppress "Upgrade to UniFi OS Server" nag on login
- Security: CVE-2026-22557 (CVSS 10.0), CVE-2026-22558 (CVSS 7.7)
