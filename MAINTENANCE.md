# Maintenance Guide

How to maintain this fork. Written so a future version of me (or an AI assistant)
can pick this up without repeating the mistakes from the initial build.

## Updating to a new UniFi version

1. **Verify the download URL exists before touching any files:**

   ```
   curl -sI https://dl.ui.com/unifi/<VERSION>/unifi_sysvinit_all.deb | head -1
   ```

   If it doesn't return 200, the version isn't available yet.

2. **Check the UniFi release notes for dependency changes.** If they bump the
   Java requirement (like the 10.2.x move to Java 25), the Dockerfile needs
   updating too. Check the upstream repo's open PRs for hints.

3. **Check if the WebRTC library changed.** Extract the new deb and compare:

   ```bash
   # On a machine with dpkg-deb (or inside a container):
   dpkg-deb -x unifi_sysvinit_all.deb /tmp/extract
   md5sum /tmp/extract/usr/lib/unifi/lib/native/Linux/aarch64/libubnt_webrtc_jni.so
   ```

   - If md5 is `27e786235fae4a052bc808c3c13dfc19`: same library, our patch
     in `rootfs/` still applies correctly.
   - If md5 is different: Ubiquiti updated the library. Check if the TURN
     DONT-FRAGMENT bug is fixed upstream. If not, re-apply the binary patch
     (see "Re-patching the WebRTC library" below).

4. **Edit exactly two files:**
   - `unifi/Dockerfile` - change the version in the download URL
   - `unifi/config.yaml` - change the `version` field

5. **Commit both in a single commit.** Message format: `UniFi <version>`

6. **Push to main.**

7. **Create a GitHub release** tagged `v<version>`:

   ```
   gh release create v<VERSION> --title "UniFi <VERSION>" --notes "<what changed>"
   ```

8. **Trigger the deploy workflow:**

   ```
   gh workflow run deploy.yaml -f version=<VERSION>
   ```

   The release event should trigger it automatically, but if it doesn't,
   the manual trigger is the backup.

9. **Delete the previous release** once the new one is built and verified:

   ```
   gh release delete v<OLD_VERSION> --yes
   git push origin --delete v<OLD_VERSION>
   ```

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

## Versioning scheme

- Date-based: `YYYYMMDD-NN` (e.g., `20260409-03`)
- The date is when the build was made, NN is the build number for that day
- This decouples the addon version from the UniFi version, which matters
  when you need to downgrade UniFi but still have HA see it as an "update"
- Only one release should exist at a time. Delete old ones after the new
  build is verified.

## What NOT to do

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

## Cleaning up stale GHCR images

When you delete a release, the GHCR images for that version remain. To clean
them up:

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
| `libubnt_webrtc_jni.so` | `unifi/rootfs/` | Patched binary; verify md5 on UniFi updates |

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
