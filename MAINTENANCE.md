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

3. **Edit exactly two files:**
   - `unifi/Dockerfile` - change the version in the download URL
   - `unifi/config.yaml` - change the `version` field

4. **Commit both in a single commit.** Message format: `UniFi <version>`

5. **Push to main.**

6. **Create a GitHub release** tagged `v<version>`:

   ```
   gh release create v<VERSION> --title "UniFi <VERSION>" --notes "<what changed>"
   ```

7. **Trigger the deploy workflow:**

   ```
   gh workflow run deploy.yaml -f version=<VERSION>
   ```

   The release event should trigger it automatically, but if it doesn't,
   the manual trigger is the backup.

8. **Delete the previous release** once the new one is built and verified:

   ```
   gh release delete v<OLD_VERSION> --yes
   git push origin --delete v<OLD_VERSION>
   ```

## Versioning scheme

- Use the UniFi version directly: `10.2.105`
- If you need to rebuild the same UniFi version (Dockerfile fix, dependency
  update, etc.), append a hyphenated build number: `10.2.105-1`, `10.2.105-2`
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
