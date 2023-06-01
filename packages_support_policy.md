---
layout: doc
title: Packages support policy
---

# Packages Support Policy for Rspamd:

As the maintainer of the Rspamd project, I would like to outline our policy regarding operating system support for Rspamd packages. Our primary goal is to ensure compatibility with modern and well-maintained systems to provide the best possible experience to our users.

### Discontinuing support for challenging systems:

We may discontinue support for operating systems that pose significant difficulties, such as Debian versions where installing a modern compiler toolchain without interference is not possible. In contrast, we can more easily support systems like CentOS 7 that offer convenient solutions like `devtoolset` packages.

### End-of-life (EOL) versions:

We will cease updates for EOL versions when their compiler/libc/libstdc++ can no longer build Rspamd. This decision ensures that we maintain focus on secure and up-to-date platforms.

### Community involvement:

As Rspamd is a free and open-source project, users who wish to maintain an updated version on an outdated Linux distribution are encouraged to invest their time or resources into providing such support. We welcome pull requests and will gladly review them for potential inclusion in the Rspamd repository.

Please note that this policy aims to strike a balance between supporting a wide range of systems and maintaining a focus on delivering the best possible email filtering solution. By adhering to this policy, we can ensure that Rspamd remains compatible with modern and secure platforms.
