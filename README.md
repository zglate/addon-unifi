# UniFi Network Application - Fast Track Fork

This is a personal fork of [hassio-addons/addon-unifi](https://github.com/hassio-addons/addon-unifi) that tracks the latest stable UniFi Network Application releases faster than the upstream community addon.

**Use at your own risk.** I am not a professional developer. If you want a battle-tested, community-supported addon, use the [official one](https://github.com/hassio-addons/addon-unifi).

## Why this exists

The upstream maintainer does excellent work and I appreciate everything he has built. I know he is busy and has many projects to manage. This fork is simply my way of running the latest UniFi version without waiting on his timeline or adding to his PR backlog. No criticism intended. If others find it useful, great.

## What's different

- Tracks the latest GA (stable) UniFi Network Application releases
- Java 25 via Eclipse Temurin (required by UniFi 10.2.x)
- Self-contained CI/CD, no dependency on community shared workflows
- That's it. Everything else is the upstream addon.

## Current version

**UniFi Network Application 10.2.105**

## Installation

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the three-dot menu (top right) > **Repositories**
3. Add: `https://github.com/zglate/addon-unifi`
4. Refresh and install "UniFi Network Application"

## Credits

All credit for the addon itself goes to [Franck Nijhof](https://github.com/frenck) and the [Home Assistant Community Add-ons](https://github.com/hassio-addons) team. This fork only changes the UniFi version and Java runtime.

## License

MIT License. See [LICENSE.md](LICENSE.md).
