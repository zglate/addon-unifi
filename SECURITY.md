# Security Policy

This is a personal fork of the Home Assistant community UniFi Network
Application add-on. It is maintained on a best-effort basis. Please read the
`Use at your own risk` note in the README before relying on it.

## Reporting a vulnerability

If you find a security issue in this fork specifically (the build, the ingress
reverse proxy, or the packaging), please open a
[private security advisory](https://github.com/zglate/addon-unifi/security/advisories/new)
rather than a public issue. If GitHub advisories are unavailable to you, open a
normal issue asking to be contacted, without including the details.

Vulnerabilities in the underlying **UniFi Network Application** itself should go
to Ubiquiti, and issues in the **add-on framework** to the
[upstream community add-on](https://github.com/hassio-addons/addon-unifi).

## Security posture of this fork

This fork is deliberately transparent about what it ships:

- **Verified downloads.** The UniFi `.deb` fetched during the image build is
  checked against Ubiquiti's published SHA256 (`sha256sum --check` in the
  Dockerfile). The build fails hard if the download does not match, so a
  tampered or truncated package cannot be baked into an image.
- **Reproducible patch canaries.** The WebRTC library patches are pinned by
  md5 (`md5sum --check`), and the ingress base-path rewrites are guarded by a
  startup canary. If a future UniFi release changes an asset out from under a
  patch, the build or the add-on log surfaces it instead of silently shipping a
  broken or unexpected binary.
- **Additive, minimal changes.** The fork adds an nginx reverse proxy for the
  inline-sidebar feature and a small number of asset patches (TURN remote-access
  fix, UOS-nag suppression). The direct interface on port 8443 is never altered.
- **One-commit rollback.** Every release maps to a single tagged commit and a
  multi-arch image kept in the registry, so reverting to a previous version is
  a matter of reinstalling the prior release.

## Supported versions

Only the latest published release is supported. Older releases remain available
in the registry as rollback targets but do not receive fixes.
