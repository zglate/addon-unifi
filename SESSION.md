# addon-unifi Session Handoff

## What this is

Personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi)
at [github.com/zglate/addon-unifi](https://github.com/zglate/addon-unifi).

Home Assistant addon for UniFi Network Application. Tracks stable releases
faster than the upstream community addon which has a slow merge cadence.

## Current state

- **UniFi version**: 10.2.105
- **Addon version**: 20260413-03 (date-based versioning)
- **Java**: 25 via Eclipse Temurin (required by UniFi 10.1+)
- **Status**: Running in HA, remote access working
- **HA architecture**: aarch64 (ARM)

## GitHub account

- Fork is on the `zglate` GitHub account (personal, not work)
- All commits and labels should use `zglate`, never `Jeff Mottishaw` / `jmottishaw`
- To check: `gh auth status`
- To switch: `gh auth switch --user zglate`
- Scopes needed: `repo`, `workflow`, `read:packages`, `write:packages`, `delete:packages`
- To re-auth: `gh auth login -h github.com -w -s repo,workflow,read:packages,write:packages,delete:packages`
- For commits, set both author and committer: `GIT_COMMITTER_NAME="zglate" GIT_COMMITTER_EMAIL="zglate@users.noreply.github.com" git commit --author="zglate <zglate@users.noreply.github.com>" ...`

## How to update UniFi version

Full procedure is in MAINTENANCE.md. Short version:

1. Verify URL: `curl -sI https://dl.ui.com/unifi/<VERSION>/unifi_sysvinit_all.deb | head -1`
2. Edit `unifi/Dockerfile` (download URL), `unifi/config.yaml` (version), and `unifi/CHANGELOG.md`
3. The Dockerfile's md5 check catches library changes at build time. If it fails, the WebRTC patch offsets need re-derivation (see MAINTENANCE.md).
4. Version format: `YYYYMMDD-NN` (e.g., `20260415-01`)
5. Commit, push, create release, trigger deploy workflow.

## Upstream PRs merged

- [#631](https://github.com/hassio-addons/addon-unifi/pull/631): UniFi 10.2.105, Java 25 (Temurin), TURN DONT-FRAGMENT fix, UOS nag suppression
- [#636](https://github.com/hassio-addons/addon-unifi/pull/636): Fix x86_64 offsets (my original were 102 bytes off), full 5-byte NOP sled, pre/post-patch byte verification

The community addon now has functional parity with this fork. Main remaining differentiator is release cadence.

## Key decisions

- **Build-time WebRTC patching**: Libraries are patched via `dd` during the Docker build, not committed pre-patched. md5 check on the unmodified library fails the build loudly if Ubiquiti ships a new one.
- **Date-based versioning**: Decouples addon version from UniFi version. Allows downgrades to show as "updates" in HA.
- **`provenance: false, sbom: false`** in deploy workflow: Without these, buildx pushes OCI index format that HA Supervisor can't pull.
- **Self-contained CI/CD**: Does not use hassio-addons shared workflows (they require a DISPATCH_TOKEN we can't provide).

## TURN DONT-FRAGMENT patch (critical)

Cloudflare's TURN relay (`turn.cloudflare.com` at 141.101.90.1:3478) rejects
the DONT-FRAGMENT attribute (0x001A) with TURN error 420 (Unknown Attribute).
The bundled EvoStream v2.9.1 WebRTC library (`libubnt_webrtc_jni.so`) always
sends this attribute and doesn't retry without it, violating RFC 5766.

**Fix**: Binary patch of `libubnt_webrtc_jni.so` in the Dockerfile, NOPs out the `mov type, #0x1a` instruction that precedes `AppendFieldEmpty`:

| Architecture | Site 1 (unauth) | Site 2 (auth) | NOP | Patch size |
|---|---|---|---|---|
| aarch64 | `0x167214` | `0x167D20` | `d503201f` (ARM64) | 4 bytes each |
| x86_64 | `0x114CB9` | `0x1157D7` | `0x90` sled | 5 bytes each |

Pristine md5 (unmodified library):
- aarch64: `27e786235fae4a052bc808c3c13dfc19`
- x86_64: `657963ca47b185baf4eef8d90b70755b`

**Diagnosis**: Confirmed via packet capture. The server's 420 response includes `UNKNOWN-ATTRIBUTES: [0x001A]`. Affects all self-hosted controllers using the EvoStream library (community addon, linuxserver, jacobalberty).

**Hard-learned lesson**: My original x86_64 offsets (`0x114D1F`, `0x11583D`) were 102 bytes off because my SSH extraction prepended the `md5sum` output text to the ELF binary. Every offset I derived from that corrupted file was shifted by the prefix length. The md5 check was added to the Dockerfile after the corruption was fixed, so it didn't catch that the offsets were still wrong. Result: a SIGILL crash on amd64 that I had to fix in #636. **Always verify the md5 of a just-extracted binary against its source before deriving any offsets from it.**

## UOS upgrade nag suppression

The "Upgrade to UniFi OS Server" modal appears on every login for self-hosted
controllers. Irrelevant on HA. The modal has a bug: it reads dismiss state from
an async storage wrapper (Promise) synchronously, so the dismiss never resolves
and the modal always shows. Suppressed at startup via `init-unifi/run`:
```
sed -i 's/useState)(!s)/useState)(!1)/g' <swai.*.js>
```

## Upstream release monitoring

`.github/workflows/check-upstream.yaml` polls the Ubiquiti Community RSS feed daily at 12pm PT (20:00 UTC) and opens a labeled issue on this repo when a new UniFi Network Application release is available. Ubiquiti's releases cluster between 13:00-18:00 UTC on weekdays, so 20:00 UTC catches them same-day.

## SSH access to HA

SSH key is authorized on the HA box (Advanced SSH & Web Terminal addon).
- Host: `192.168.80.15`, port 22, user `pi`
- From this machine: `ssh pi@192.168.80.15`
- Docker commands need `sudo`

## Known benign warnings

- **TCP candidates not supported**: Stderr noise from EvoStream library, no impact.
- **sun.misc.Unsafe deprecation**: Guava warning about `objectFieldOffset`, cosmetic.
- **ucore connection refused**: Controller tries to reach `127.0.0.1:9080` (UniFi OS Core). Expected on self-hosted, ucore only exists on Ubiquiti hardware.

## Files in this repo

- `unifi/Dockerfile` - UniFi version, Java setup, build-time WebRTC patching
- `unifi/config.yaml` - Addon manifest (version, image, slug, ports)
- `unifi/CHANGELOG.md` - Changelog displayed in HA addon UI
- `unifi/rootfs/etc/s6-overlay/` - s6-overlay runtime scripts (init-unifi, unifi)
- `.github/workflows/ci.yaml` - Build tests with smoke tests
- `.github/workflows/deploy.yaml` - Build and push to GHCR
- `.github/workflows/check-upstream.yaml` - Poll RSS for new UniFi releases, open issue
- `MAINTENANCE.md` - Full maintenance procedures and patch re-derivation guide
- `repository.yaml` - HA Supervisor repository metadata
- `unifi/build.yaml` - Base image references per architecture

## What NOT to do

- Don't delete untagged GHCR package versions (they're backing manifests, deleting breaks pulls)
- Don't use hassio-addons shared workflows (need DISPATCH_TOKEN)
- Don't switch gh auth back to jmottishaw without being asked
- Don't trust upstream DOCS.md claims without verifying
- Don't use em dashes in any output (code, docs, commit messages, PR bodies, chat)
- Don't derive binary offsets from an extracted file without first verifying its md5 against the source
