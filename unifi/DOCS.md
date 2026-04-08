# UniFi Network Application (Fast Track Fork)

This add-on runs Ubiquiti Networks' UniFi Network Application software, which
allows you to manage your UniFi network via the web browser.

This is a personal fork of the
[Home Assistant Community Add-on](https://github.com/hassio-addons/addon-unifi)
that tracks the latest stable UniFi releases. Use at your own risk.

## Installation

1. Add this repository to your Home Assistant instance:
   `https://github.com/zglate/addon-unifi`
1. Click the "Install" button to install the add-on.
1. Check the logs of the "UniFi Network Application" to see if everything went
   well.
1. Click the "OPEN WEB UI" button, and follow the initial wizard.
1. After completing the wizard, log in with the credentials just created.
1. Go to UniFi Devices on the left hand side, then select Device Updates
   and Settings on the top right.
1. Scroll down to Device settings and below the `Inform Host Override` label,
   enter the IP or hostname of the device running Home Assistant.
1. Click the checkbox option for `Inform Host Override` so that is now "checked".
1. Hit the "Apply Changes" button to activate the settings.
1. Ready to go!

## Configuration

**Note**: _Remember to restart the add-on when the configuration is changed._

Example add-on configuration, with all available options:

```yaml
log_level: info
memory_max: 2048
memory_init: 512
```

**Note**: _This is just an example, don't copy and paste it! Create your own!_

### Option: `log_level`

The `log_level` option controls the level of log output by the addon and can
be changed to be more or less verbose, which might be useful when you are
dealing with an unknown issue. Possible values are:

- `trace`: Show every detail, like all called internal functions.
- `debug`: Shows detailed debug information.
- `info`: Normal (usually) interesting events.
- `warning`: Exceptional occurrences that are not errors.
- `error`: Runtime errors that do not require immediate action.
- `fatal`: Something went terribly wrong. Add-on becomes unusable.

Please note that each level automatically includes log messages from a
more severe level, e.g., `debug` also shows `info` messages. By default,
the `log_level` is set to `info`, which is the recommended setting unless
you are troubleshooting.

### Option: `memory_max`

This option allows you to change the amount of memory the UniFi Network
Application is allowed to consume. By default, this is limited to 256 MB.
You might want to increase this, in order to reduce CPU load or reduce this,
in order to optimize your system for lower memory usage.

This option takes the number of Megabyte, for example, the default is 256.

### Option: `memory_init`

This option allows you to change the amount of memory the UniFi Network
Application will initially reserve/consume when starting. By default,
this is limited to 128MB.

This option takes the number of Megabyte, for example, the default is 128.

## Automated backups

The UniFi Network Application ships with an automated backup feature. This
feature works but has been adjusted to put the created backups in a different
location.

Backups are created in `/backup/unifi`. You can access this folder using
the normal Home Assistant methods (e.g., using Samba, Terminal, SSH).

## Manually adopting a device

Alternatively to setting up a custom inform address (installation steps 6-9)
you can manually adopt a device by following these steps:

- SSH into the device using `ubnt` as username and `ubnt` as password
- `$ mca-cli`
- `$ set-inform http://<IP of Hassio>:<controller port (default:8080)>/inform`
  - for example `$ set-inform http://192.168.1.14:8080/inform`

## Known issues and limitations

- The AP seems stuck in "adopting" state: Please read the installation
  instructions carefully. You need to change some controller settings
  in order for this add-on to work properly. Using the Ubiquiti Discovery
  Tool, or SSH'ing into the AP and setting the INFORM after adopting
  will resolve this. (see: _Manually adopting a device_)
- The following error can show up in the log, but can be safely ignored:

  ```
    INFO: I/O exception (java.net.ConnectException) caught when processing
    request: Connection refused (Connection refused)
  ```

  This is a known issue, however, the add-on functions normally.

- Due to security policies in the UniFi Network Application software, it is
  currently impossible to add the UniFi web interface to your Home Assistant
  frontend using a `panel_iframe`.
- The broadcast feature of the EDU type APs are currently not working with
  this add-on. Due to a limitation in Home Assistant, it is currently impossible
  to open the required "range" of ports needed for this feature to work.
- This add-on cannot support Ingress due to technical limitations of the
  UniFi software.
- During making a backup of this add-on via Home Assistant, this add-on will
  temporarily shutdown and start up after the backup has finished. This prevents
  data corruption during taking the backup.

## Credits

Original addon by [Franck Nijhof](https://github.com/frenck) and the
[Home Assistant Community Add-ons](https://github.com/hassio-addons) team.

## License

MIT License — Copyright (c) 2018-2025 Franck Nijhof
