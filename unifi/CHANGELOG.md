# Changelog

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
