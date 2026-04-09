# addon-unifi Session Handoff

## What this is

Personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi)
at [github.com/zglate/addon-unifi](https://github.com/zglate/addon-unifi).

Home Assistant addon for UniFi Network Application. Tracks stable releases
faster than the upstream community addon which has a slow merge cadence.

## Current state

- **UniFi version**: 10.2.105
- **Addon version**: 20260409-03 (date-based versioning)
- **Java**: 25 via Eclipse Temurin (required by UniFi 10.1+)
- **Status**: Running in HA, remote access working, TURN DONT-FRAGMENT patched
- **HA architecture**: aarch64 (ARM)

## GitHub account

- Fork is on the `zglate` GitHub account (personal, not work)
- The `gh` CLI may still be authenticated as `zglate` or may have been switched
- To check: `gh auth status`
- To switch: `gh auth switch --user zglate`
- Scopes needed: `repo`, `workflow`, `read:packages`, `write:packages`, `delete:packages`
- To re-auth: `gh auth login -h github.com -w -s repo,workflow,read:packages,write:packages,delete:packages`

## How to update UniFi version

Full procedure is in MAINTENANCE.md in the repo. Short version:

1. Verify URL: `curl -sI https://dl.ui.com/unifi/<VERSION>/unifi_sysvinit_all.deb | head -1`
2. Edit `unifi/Dockerfile` (download URL) and `unifi/config.yaml` (version field)
3. **Check the WebRTC library**: extract the new deb and verify `libubnt_webrtc_jni.so`
   has the same md5 (`27e786235fae4a052bc808c3c13dfc19`). If it changed, the binary
   patch needs to be re-applied to the new library (see MAINTENANCE.md).
4. Version format: `YYYYMMDD-NN` (e.g., `20260409-03`)
5. Commit as zglate: `git commit --author="zglate <zglate@users.noreply.github.com>"`
6. Push to main
7. Delete old release: `gh release delete v<OLD> --repo zglate/addon-unifi --yes`
8. Create release: `gh release create v<NEW> --repo zglate/addon-unifi --title "<NEW> (UniFi <VER>)" --notes "..." --target main`
9. Deploy: `gh workflow run deploy.yaml --repo zglate/addon-unifi -f version=<NEW>`
10. Do NOT delete untagged GHCR images. They are backing manifests. Deleting them breaks pulls.

## Key decisions made

- **Date-based versioning**: Decouples addon version from UniFi version. Allows
  downgrades to show as "updates" in HA.
- **No apt version pins**: Easier maintenance, acceptable for personal fork.
- **provenance: false, sbom: false**: Required in deploy workflow. Without this,
  buildx pushes OCI index format that HA Supervisor can't pull.
- **Self-contained CI/CD**: Does not use hassio-addons shared workflows (they
  require DISPATCH_TOKEN we can't provide).
- **Smoke tests in CI**: Verifies Java, UniFi jar, and MongoDB exist after build.

## TURN DONT-FRAGMENT patch (critical)

Cloudflare's TURN relay (`turn.cloudflare.com` at 141.101.90.1:3478) rejects
the DONT-FRAGMENT attribute (0x001A) with TURN error 420 (Unknown Attribute).
The bundled EvoStream v2.9.1 WebRTC library (`libubnt_webrtc_jni.so`) always
sends this attribute and doesn't retry without it, violating RFC 5766.

**Fix**: Binary patch of `libubnt_webrtc_jni.so` — NOP out two
`AppendFieldEmpty(msg, 0x1A)` call sites:
- Site 1 (unauthenticated Allocate): offset `0x167214` (mov + bl, 8 bytes)
- Site 2 (authenticated Allocate): offset `0x167D20` (mov + bl, 8 bytes)
- ARM64 NOP: `d503201f`

The patched library lives in `unifi/rootfs/usr/lib/unifi/lib/native/Linux/aarch64/`
and overwrites the one installed by the UniFi deb via `COPY rootfs /`.

**When updating UniFi versions**: Check if the library md5 changed. If Ubiquiti
ships an updated `libubnt_webrtc_jni.so`, the patch offsets may differ or the
bug may be fixed upstream. Original md5: `27e786235fae4a052bc808c3c13dfc19`.

**Diagnosis**: Confirmed via packet capture — the server's 420 response includes
`UNKNOWN-ATTRIBUTES: [0x001A]`. Affects all self-hosted controllers using the
EvoStream library (community addon, linuxserver, jacobalberty — all broken).

## Known issues

- **TCP candidates not supported**: Benign warning from EvoStream library.
  Does not affect functionality.
- **sun.misc.Unsafe deprecation**: Guava warning about `objectFieldOffset`.
  Cosmetic, no impact.
- **ucore connection refused**: Controller tries to reach `127.0.0.1:9080`
  (UniFi OS Core). Expected on self-hosted — ucore only exists on Ubiquiti
  hardware. "Some features might not be available" is benign.

## Files in this repo

- `unifi/Dockerfile` - Where the UniFi version and Java setup live
- `unifi/config.yaml` - Addon manifest (version, image, slug, ports)
- `unifi/rootfs/etc/s6-overlay/` - s6-overlay runtime scripts
- `unifi/rootfs/usr/lib/unifi/lib/native/Linux/aarch64/libubnt_webrtc_jni.so` - Patched WebRTC library
- `.github/workflows/deploy.yaml` - Build and push to GHCR
- `.github/workflows/ci.yaml` - Build test with smoke tests
- `MAINTENANCE.md` - Full maintenance procedures
- `repository.yaml` - HA Supervisor repository metadata
- `unifi/build.yaml` - Base image references per architecture

## What NOT to do

- Don't delete untagged GHCR package versions (they're backing manifests)
- Don't use hassio-addons shared workflows
- Don't switch gh auth back to jmottishaw without being asked
- Don't squash commits until you're done with all changes for the session
- Don't trust upstream DOCS.md claims without verifying
- Don't replace the patched WebRTC library without re-verifying the patch
