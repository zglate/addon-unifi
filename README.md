# UniFi Network Application - Fast Track Fork

A personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi) that tracks the latest stable UniFi Network Application releases faster than the upstream community addon.

The functional fixes (Java 25, TURN remote-access patch, UOS nag suppression) originated here and were contributed upstream in [#631](https://github.com/hassio-addons/addon-unifi/pull/631), so the community addon now has them too. Two things still set this fork apart:

- **Faster release cadence** — new UniFi GA versions are packaged here as soon as they're verified, without waiting for an upstream PR cycle.
- **Inline sidebar (ingress)** — the UniFi UI renders directly in the Home Assistant sidebar, reachable through Home Assistant Cloud (Nabu Casa) without exposing port 8443. This is offered upstream in [#648](https://github.com/hassio-addons/addon-unifi/pull/648), but that PR has sat unmerged for weeks, so for now the feature lives only here.

**Use at your own risk.** I am not a professional developer. The community addon is the safer choice if you don't need the faster cadence.

## Support and issues

I'm genuinely keen to support this add-on and I want it to work well for you. Please keep two things in mind before you open an issue or ask for help:

- **I'm not a developer and this isn't my full-time gig.** I maintain this fork in my spare time because I use it myself. There's no team behind it, no SLA, and no guaranteed response time, and some things I simply won't be able to fix. Please set your expectations accordingly.
- **Be gentle, and be very clear.** A calm, specific, detailed report gets help far faster than a terse or frustrated one. Tell me your Home Assistant version, the add-on version, exactly what you did, what you expected, and what actually happened, and include the relevant lines from the add-on **Log** tab (plus a browser console or network capture if it's a UI problem). The more precise and patient you are, the more likely I can actually help.

If you need guaranteed, professional support, the [community add-on](https://github.com/hassio-addons/addon-unifi) is the safer choice.

## Current version

**UniFi Network Application 10.5.67**

## Installation

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the three-dot menu (top right) > **Repositories**
3. Add: `https://github.com/zglate/addon-unifi`
4. Refresh and install "UniFi Network Application (Fast Track)"

## Sidebar access

This fork renders the UniFi interface directly in the Home Assistant sidebar.
Use the **Show in sidebar** toggle on the addon's Info tab to add or hide the
"UniFi" entry; the "Open Web UI" button opens the same inline view. This also
makes the UI reachable through Home Assistant Cloud (Nabu Casa) without
exposing port 8443, and it works in the Home Assistant mobile companion app
(validated on iOS; Android uses the same code path). It also works when Home
Assistant is reached over a plain-HTTP LAN address (e.g. `http://<ip>:8123`),
validated in desktop Firefox and on iOS. In the mobile app UniFi shows a
dismissable "browser is not supported" notice because it does not recognize the
in-app browser; this is cosmetic and the interface works. See the addon
Documentation tab for details and caveats.

**First launch:** if the sidebar shows a blank/black screen right after install,
open `https://<your-ip>:8443` directly in the same browser once and accept the
self-signed certificate warning, then reload Home Assistant. The browser needs
to trust the certificate before it will display the UniFi UI inside the sidebar.
This is one-time per browser.

**Known issue after an update:** for the first minute or two after the addon
updates, the sidebar view may show a browser error (in Firefox, "another site
has embedded this content"). While the controller is booting it serves a
startup splash page that sends `X-Frame-Options: SAMEORIGIN`, which can't be
framed. It clears on its own once UniFi finishes starting; the direct interface
on port 8443 is never affected.

## Migrating from the community addon

This fork uses a different repository URL, so Home Assistant treats it as a separate addon. Your existing UniFi data will not carry over automatically.

1. **Create a full Home Assistant backup first** (Settings > System > Backups)
2. Open the **old** UniFi addon's web UI
3. Go to **Settings > System > Backups tab**
4. Click **Download** next to "Download Current Config Backup"
5. The default is "Settings Only". If you want to keep your client/traffic statistics, change the dropdown to a time period (e.g., 365 days).
6. Save the `.unf` file to your computer
7. **Stop the old addon and turn off its "Start on boot"** (old addon's **Info** tab). Leave it installed - do not uninstall it. This frees port 8443 for the fork and keeps the old addon as your rollback.
8. Install this fork (if you haven't already), start it, and open its web UI
9. On the setup wizard, choose **Restore from a previous backup**
10. Upload the `.unf` file
11. Verify everything came over - check your sites, devices, and settings against the old addon.
12. **Keep the old community addon installed but stopped, with "Start on boot" off.** Do not uninstall it yet.

> **Run only one at a time, and keep the old addon as your safety net.** Both
> addons listen on port 8443 and keep their own separate data, so only one may
> run at once. While you run the Fast Track fork, keep the community addon
> stopped with start-on-boot off (leaving start-on-boot on for both would
> collide on 8443). That stopped addon is your rollback: this fork moves fast
> and can occasionally ship a bad UniFi release (10.5.66, for example,
> white-screened the local UI until 10.5.67 fixed it), so if a Fast Track build
> misbehaves you can stop the fork, start the community addon, and be back on a
> known-good build with your pre-migration data. Take your time verifying the
> fork before you trust it. Only uninstall the community addon once you are
> confident the Fast Track fork is working well for you. Its data is frozen at
> migration time, so a fallback long after switching will be missing anything
> changed since.

**Note:** After migrating, you will need to re-enable Remote Access and re-authenticate your UI account in the UniFi settings.

## Security and rollback

This fork tries to be transparent about what it ships:

- The UniFi package downloaded during the build is checked against Ubiquiti's
  published SHA256, so the build fails rather than shipping a tampered or
  corrupt download.
- The asset patches (TURN fix, UOS-nag suppression, ingress rewrites) are
  guarded by checksums and a startup canary, so an unexpected change in a UniFi
  release surfaces loudly instead of silently.
- Each release is a single tagged commit with a multi-arch image kept in the
  registry. To roll back, reinstall the previous release; the older images are
  never deleted.

To report a security issue, see [SECURITY.md](SECURITY.md).

## End-of-life notice

The standalone UniFi Network Application is approaching end-of-life. Ubiquiti is transitioning to UniFi OS Server, which does not translate to a Docker/Home Assistant addon. There is no upgrade path from this addon to UniFi OS Server. Plan accordingly.

## Credits

Built on [Franck Nijhof](https://github.com/frenck) and the [Home Assistant Community Add-ons](https://github.com/hassio-addons) team's work. All credit for the addon framework goes to them.

## License

MIT License. See [LICENSE.md](LICENSE.md).
