ARG BUILD_FROM=ghcr.io/hassio-addons/ubuntu-base:8.2.0
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system
# UniFi 10.1+ requires Java 25 — not in Ubuntu repos, use Eclipse Temurin
RUN \
    apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        gpg \
    \
    && curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public \
        | gpg --dearmor -o /usr/share/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb focal main" \
        > /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    \
    && apt-get install -y --no-install-recommends \
        binutils \
        libcap2 \
        logrotate \
        mongodb-server \
        temurin-25-jre \
    \
    && curl -J -L -o /tmp/unifi.deb \
        "https://dl.ui.com/unifi/10.1.89/unifi_sysvinit_all.deb" \
    \
    && dpkg --install /tmp/unifi.deb \
    && apt-get -f install -y \
    && apt-get clean \
    && rm -fr \
        /tmp/* \
        /var/cache/* \
        /var/lib/apt/lists/* \
        /var/log/*.log \
        /var/log/apt

# Copy root filesystem
COPY rootfs /

# Health check
HEALTHCHECK --start-period=5m \
    CMD curl --insecure --fail https://localhost:8443 || exit 1

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="Jeff Mottishaw" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="zglate" \
    org.opencontainers.image.authors="Jeff Mottishaw" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/zglate/addon-unifi" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
