# UniFi Network Application - Fast Track Fork

A personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi) that tracks the latest stable UniFi Network Application releases faster than the upstream community addon.

The functional fixes (Java 25, TURN remote-access patch, UOS nag suppression) originated here and were contributed upstream in [#631](https://github.com/hassio-addons/addon-unifi/pull/631), so the community addon now has them. The only difference today is release cadence: new UniFi GA versions get packaged here as soon as they're verified, without waiting for a PR cycle.

**Use at your own risk.** I am not a professional developer. The community addon is the safer choice if you don't need the faster cadence.

## Current version

**UniFi Network Application 10.2.105**

## Installation

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the three-dot menu (top right) > **Repositories**
3. Add: `https://github.com/zglate/addon-unifi`
4. Refresh and install "UniFi Network Application (Fast Track)"

## Migrating from the community addon

This fork uses a different repository URL, so Home Assistant treats it as a separate addon. Your existing UniFi data will not carry over automatically.

1. **Create a full Home Assistant backup first** (Settings > System > Backups)
2. Open the **old** UniFi addon's web UI
3. Go to **Settings > System > Backups tab**
4. Click **Download** next to "Download Current Config Backup"
5. The default is "Settings Only". If you want to keep your client/traffic statistics, change the dropdown to a time period (e.g., 365 days).
6. Save the `.unf` file to your computer
7. Open the **new** addon's web UI (this fork)
8. On the setup wizard, choose **Restore from a previous backup**
9. Upload the `.unf` file
10. Verify everything came over, then uninstall the old community addon

**Note:** After migrating, you will need to re-enable Remote Access and re-authenticate your UI account in the UniFi settings.

## End-of-life notice

The standalone UniFi Network Application is approaching end-of-life. Ubiquiti is transitioning to UniFi OS Server, which does not translate to a Docker/Home Assistant addon. There is no upgrade path from this addon to UniFi OS Server. Plan accordingly.

## Credits

Built on [Franck Nijhof](https://github.com/frenck) and the [Home Assistant Community Add-ons](https://github.com/hassio-addons) team's work. All credit for the addon framework goes to them.

## License

MIT License. See [LICENSE.md](LICENSE.md).
