# Base image: why this add-on stays on focal

Notes on the Ubuntu base image. This is not a plan or a commitment: it records
why the Renovate base-image majors get declined, what moving would actually
involve, and what would change the answer. Facts below were checked on
2026-10-23 (first written 2026-09-12; several of those facts were wrong or
incomplete and are corrected here). Re-check before acting (see "How these were
checked").

## Decision

**Stay on `ubuntu-base:8.x` (focal) for the life of the 10.6 line.** The reason
is no longer "nothing forces a move", it is that the move no longer pays off:

- **10.6 is the last standalone UniFi Network Application line.** 11.x is
  still named "UniFi Network Application" but runs only on UniFi OS (consoles,
  or UniFi OS Server for self-hosting): 11.0.83 (2026-10-12) "requires UniFi OS
  6.0 or newer", migrated the database to PostgreSQL, and "Removed Network
  Application Server support. Upgrade to UniFi OS Server." No
  `unifi_sysvinit_all.deb` exists for 11.x (dl.ui.com 404s for 11.0.83 and
  11.0.97). `check-upstream.yaml` already tracks only the 10.x line for this
  reason.
- Ubiquiti still ships security maintenance to old lines (the eMudhra CA
  revocation went to both 10.6.109 and 9.0.122 on 2026-10-23), so the fork
  continues while 10.6 maintenance releases appear.
- A base migration means a MongoDB data migration for every existing user
  (below). Spending that risk on a line with no successor is the wrong trade.
- Upstream (`hassio-addons/app-unifi`, formerly `addon-unifi`) made the same
  call: still on `ubuntu-base:8.2.1`, closed its own v11 (#659) and v12 (#668)
  base PRs.

## Where things stand

- The add-on builds from `ghcr.io/hassio-addons/ubuntu-base:8.2.1`
  (`BUILD_FROM=ubuntu:focal-20221130`, image created 2023-01-18). No 8.x release
  has shipped since; it is the last focal base.
- focal standard support ended **2025-05-29**. Since then Ubuntu's fixes for
  focal ship only in ESM (`+esm` versions); the public archive no longer moves.
- Renovate opens a PR for every new base-image major (#13 for v11, #16 for
  v12). They cannot pass CI: the Dockerfile pins apt packages to focal versions,
  so the build stops at the first install
  (`E: Version '2.2.19-3ubuntu2.5' for 'gpg' was not found`, CI run
  34718861214). Close them; see the base-image policy in MAINTENANCE.md.

| ubuntu-base | Ubuntu |
|---|---|
| 8.x | 20.04 focal (current) |
| 9.x | 22.04 jammy |
| 10.x, 11.x | 24.04 noble |
| 12.x | 26.04 resolute |

## Known unpatched security issues (accepted, with reasoning)

The image ships the last public focal builds of nginx (`1.18.0-0ubuntu1.7`) and
MongoDB (`1:3.6.9+really3.6.8+90~g8e540c0b6d-0ubuntu5.3`). Fixes for these exist
only in ESM or not at all:

| Issue | Package | focal status | Reachability in this add-on |
|---|---|---|---|
| CVE-2025-14847 (high, unauthenticated heap read via zlib) | mongodb | fixed only in ESM (`+esm1`, USN-8160-1) | mongod is not in `ports:`, the add-on has no `host_network`, and UniFi runs it on localhost:27117 by default. Not reachable from the LAN. |
| CVE-2026-42945 (high, rewrite module) and other USN-8375-1 / USN-8398-4 CVEs | nginx | fixed only in ESM | The nginx here is the ingress proxy only: `listen 8099` with `allow 172.30.32.2; deny all;`, port not published. Only HA-authenticated ingress traffic from the Supervisor reaches it. |
| CVE-2026-42533 (medium, regex `map` + capture variables) | nginx | needs-triage (no fix, even in ESM) | `nginx.conf` uses that pattern for cookie extraction (`map $http_cookie` with `$1`). Same ingress-only reachability as above. Whether the exact trigger is met is not established. |

The network-facing parts of the add-on are UniFi itself (8080/8443/8843/8880/
6789) and the Java runtime. Temurin is installed unpinned from Adoptium, so it
stays current on focal.

If a CVE lands that is reachable from the LAN (the UniFi ports) or from a
non-admin HA user, that overrides the decision above; see "What would change the
answer".

## Why a migration is expensive (MongoDB)

**The current MongoDB exists only on focal.** The add-on installs Ubuntu's own
`mongodb-server` 3.6. Ubuntu dropped it after focal (absent from jammy, noble,
resolute on both arches), so on any newer base MongoDB has to come from
MongoDB's own apt repository.

**MongoDB's repo per Ubuntu release** (`mongodb-org-server` entries, amd64 and
arm64; an index existing is not enough, several hold only tools):

| Ubuntu | Server versions available |
|---|---|
| focal | 4.4, 5.0, 6.0, 7.0, 8.0, 8.2, 8.3 |
| jammy | 6.0, 7.0, 8.0, 8.2, 8.3, 9.0 (4.4/5.0 indexes are tools only) |
| noble | 8.0, 8.2, 8.3, 9.0 |
| resolute | 9.0 only (since 2026-10-13; 8.0/8.3 indexes are tools only) |

No release in that repo carries a 4.0 or 4.2 server for focal or later (they
exist only for bionic, and bionic 4.0 has no arm64 server).

**UniFi's side** (Ubiquiti's 9.0.118 release note): 7.5+ requires MongoDB 3.6;
8.1+ supports up to 7.0; 9.0+ supports up to 8.0. Nothing newer than 8.0 is
supported, so 8.2/8.3/9.0 are not options, and resolute (9.0 only) is out.

**Hardware limits:**

- **Raspberry Pi 4 (arm64).** MongoDB 5.0+ requires ARMv8.2-A, and MongoDB's
  production notes name the Pi 4 as unsupported. Community reports put the
  practical ceiling at **4.4.18** (4.4.19+ core-dumps on a Pi 4); MongoDB's focal
  4.4 index serves 4.4.31, so "install the latest 4.4" crashes. 4.4 has no server
  packages for jammy or later. Net: a Pi 4 user has no working MongoDB on any
  base newer than focal.
- **x86 without AVX.** MongoDB 5.0+ requires AVX (MongoDB production notes);
  some pre-Tiger-Lake Celeron/Pentium chips lack it.

**Existing data can't jump versions.** MongoDB upgrades one major at a time
(3.6 → 4.0 → 4.2 → 4.4 → 5.0 → 6.0 → 7.0 → 8.0, each a binary swap plus an FCV
bump). Shipping that chain inside the image is not practical:

- the 4.0 and 4.2 binaries are not published for any base this image could use;
- `init-unifi` writes `unifi.db.extraargs=--smallfiles` into every user's
  `system.properties`, and that option was removed in MongoDB 4.2 (not tested
  here), so an upgraded mongod would refuse to start until the line is stripped;
- very old installs on the MMAPv1 storage engine can't be opened by 4.2+ at all.

So the only realistic migration is: users take a UniFi backup, the new image
starts a fresh database, users restore. That is the step that can lose
someone's controller config.

## What else would move with the base

- **Every apt pin** in `unifi/Dockerfile` (gpg, binutils, libcap2, logrotate,
  mongodb-server, nginx-extras), plus the focal archive URLs in
  `.github/renovate.json`.
- **Java** comes from Adoptium, but the source line hardcodes `focal`. Adoptium
  publishes `temurin-25-jre` for jammy, noble and resolute.
- **nginx.** The upside of moving is replacing the Lua Secure-cookie block with
  `proxy_cookie_flags ~ nosecure;` (nginx 1.19.3+). jammy does not get you there
  (nginx 1.18, same as focal); noble has 1.24, resolute 1.28. See ROADMAP item 6
  and device-test sign-in (iPhone and Firefox over plain-HTTP LAN).
- **Build-time patches** (WebRTC `.so` md5 canary and offsets, `base.js`
  header-map patch) check the UniFi package, not the OS; the build proves them.

If it ever happens, the target is noble (MongoDB 8.0 within UniFi's supported
range, nginx 1.24), on a branch, with the data migration tested against a copy
of a real UniFi database on both arches, and the last focal build kept as the
rollback target. Decide the Pi 4 answer first.

## What would change the answer

Watch for these; any one reopens the decision:

1. **A LAN-reachable or non-admin-reachable CVE** in something this image ships
   (UniFi ports, Java, or an nginx/MongoDB issue that escapes the ingress-only /
   localhost-only boundary above).
2. **The build breaks on focal**: Adoptium stops publishing temurin for focal,
   or archive.ubuntu.com stops serving focal. These, not MongoDB, are the likely
   forcing functions. (On 2026-10-23 focal still has temurin-25-jre 25.0.5+8,
   same as noble.)
3. **10.6 maintenance ends.** Then the add-on is end-of-life regardless of the
   base. The exit for users is a UniFi backup restored into UniFi OS Server on a
   separate host; the fork does not package UniFi OS Server (upstream declined
   it too, app-unifi #671).
4. **Upstream moves off `ubuntu-base:8.x`.** They face the same MongoDB/Pi 4
   problem, so how they handle existing data is the cheapest research available.

## How these were checked (2026-10-23)

- UniFi 11.x: Ubiquiti release RSS (11.0.83 note), `curl -sI` against
  `dl.ui.com/unifi/<ver>/unifi_sysvinit_all.deb` for 11.0.83 / 11.0.97 (404) and
  10.6.109 (200).
- Base-image Ubuntu releases: `BUILD_FROM` in `base/Dockerfile` of
  `hassio-addons/app-ubuntu-base` at v8.2.1, v9.0.x, v10.0.x, v11.0.0, v12.0.x.
- Ubuntu packages: archive.ubuntu.com / ports.ubuntu.com `Packages.gz`;
  focal EOL date from distro-info-data `ubuntu.csv`.
- CVE status: `ubuntu.com/security/cves/<id>.json` (focal entries).
- MongoDB repo: `mongodb-org-server` entries in
  `repo.mongodb.org/apt/ubuntu/dists/<release>/mongodb-org/<ver>/multiverse/binary-{amd64,arm64}/Packages`.
- MongoDB hardware and upgrade rules: MongoDB manual, Production Notes and
  "Upgrade a Standalone to 8.0"; Pi 4 4.4.18 ceiling from MongoDB community
  forum reports (not an official statement).
- UniFi MongoDB range: Ubiquiti 9.0.118 release note.
- Reachability: `unifi/config.yaml` (`ports:`, no `host_network`),
  `unifi/rootfs/etc/nginx/ingress-proxy.conf` (`listen 8099`, `allow
  172.30.32.2`). The mongod localhost bind is UniFi's default and was not
  checked inside a running container.
