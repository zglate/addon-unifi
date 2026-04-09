# UniFi Network Application - Fast Track Fork

This is a personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi) that tracks the latest stable UniFi Network Application releases faster than the upstream community addon.

**Use at your own risk.** I am not a professional developer. If you want a battle-tested, community-supported addon, use the [official one](https://github.com/hassio-addons/addon-unifi).

## Why this exists

The upstream maintainer does excellent work and I appreciate everything he has built. I know he is busy and has many projects to manage. This fork is simply my way of running the latest UniFi version without waiting on his timeline or adding to his PR backlog. No criticism intended. If others find it useful, great.

## What's different

- Tracks the latest GA (stable) UniFi Network Application releases
- Java 25 via Eclipse Temurin (required by UniFi 10.1+)
- Self-contained CI/CD, no dependency on community shared workflows
- Patched WebRTC library to fix remote access (see below)
- That's it. Everything else is the upstream addon.

## Current version

**UniFi Network Application 10.2.105**

## Remote access fix

The bundled EvoStream WebRTC library sends a DONT-FRAGMENT attribute in TURN
Allocate requests. Cloudflare's TURN relay (used by Ubiquiti for cloud access)
rejects this attribute, breaking remote access via unifi.ui.com for all
self-hosted controllers.

This fork includes a binary patch that removes the DONT-FRAGMENT attribute,
restoring remote access. This affects the upstream community addon and all
other self-hosted Docker-based UniFi deployments.

## Installation

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the three-dot menu (top right) > **Repositories**
3. Add: `https://github.com/zglate/addon-unifi`
4. Refresh and install "UniFi Network Application"

## Migrating from the community addon

This fork uses a different repository URL, so Home Assistant treats it as a
separate addon. Your existing UniFi data will not carry over automatically.
To migrate:

1. **Create a full Home Assistant backup first** (Settings > System > Backups)
2. Open the **old** UniFi addon's web UI
3. Go to **Settings > System > Backups tab**
4. Click **Download** next to "Download Current Config Backup"
5. The default is "Settings Only". If you want to keep your client/traffic
   statistics, change the dropdown to a time period (e.g., 365 days).
6. Save the `.unf` file to your computer
7. Open the **new** addon's web UI (this fork)
8. On the setup wizard, choose **Restore from a previous backup**
9. Upload the `.unf` file
10. Verify everything came over, then uninstall the old community addon

**Note:** After migrating, you will need to re-enable Remote Access and
re-authenticate your UI account in the UniFi settings.

## Credits

All credit for the addon itself goes to [Franck Nijhof](https://github.com/frenck) and the [Home Assistant Community Add-ons](https://github.com/hassio-addons) team. This fork only changes the UniFi version, Java runtime, and WebRTC library patch.

## License

MIT License. See [LICENSE.md](LICENSE.md).
