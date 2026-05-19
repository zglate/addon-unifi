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

   The Dockerfile's `md5sum --check` will fail the build automatically if
   Ubiquiti ships a new library. That's the canary; if the build fails
   on the md5 check, the patch offsets need re-deriving (see "Re-patching
   the WebRTC library" below). Otherwise, no action needed.

4. **Edit four files:**
   - `unifi/Dockerfile` - change the version in the download URL
   - `unifi/config.yaml` - change the `version` field (addon date version)
   - `unifi/CHANGELOG.md` - add a new version entry at the top
   - `README.md` - update the "Current version" line to the new UniFi version

   All four must move together. The README version is user-facing and
   needs to match what actually ships.

5. **Commit both in a single commit.** Message format: `UniFi <version>`

6. **Push to main.**

7. **Generate the changelog entry** for `unifi/CHANGELOG.md` from upstream's release notes, then create a GitHub release tagged `v<version>`:

   ```
   python3 scripts/release_notes.py <UNIFI_VERSION>
   ```

   That prints a markdown summary (Overview features, counts of improvements/bugfixes, link to full notes). Paste it into `unifi/CHANGELOG.md` under a new `## <ADDON_VERSION>` heading and commit.

   The same script runs in `check-upstream.yaml` and embeds the same summary in the GitHub issue you got notified with — copying from the issue is equivalent.

   Then:

   ```
   gh release create v<VERSION> --title "UniFi <VERSION>" --notes "<what changed>"
   ```

8. **Wait for the release event to trigger the deploy workflow.**

   `gh release create` publishes the release, which fires the
   `release: published` event that auto-triggers `deploy.yaml`. Confirm
   with `gh run list --workflow=deploy.yaml --limit 1`.

   Do NOT also run `gh workflow run deploy.yaml -f version=<VERSION>`.
   That fires a second simultaneous deploy and the two builds race to
   push the same image tag, which can leave GHCR with a missing
   manifest (HA update then fails with HTTP 404). Only use the manual
   dispatch as a recovery if the release event genuinely didn't fire.

9. **Leave previous releases in place.** Each release is a rollback
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

## Versioning scheme

- Date-based: `YYYYMMDD-NN` (e.g., `20260409-03`)
- The date is when the build was made, NN is the build number for that day
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
