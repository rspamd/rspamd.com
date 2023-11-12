---
layout: doc
title: Downloads
---

<!--# Downloading rspamd->

<!-- download button with tooltip
<!-- github button >
<p><iframe src="{{ site.baseurl }}/github-btn.html?user=vstakhov&repo=rspamd&type=watch&count=true&size=large"
  allowtransparency="true" frameborder="0" scrolling="0" width="170" height="30"></iframe></p-->

## Rspamd packages
<!-- Tab navigation -->
<div class="col-xs-12">
    <ul class="nav nav-tabs nav-justified" role="tablist">
        <li role="presentation" class="active">
            <a href="#system1" aria-controls="system1" role="tab" data-toggle="tab"><img src="img/docker.png" width="20"><span class="myHidden-sm">&nbsp;Docker</span></a>
        </li>
        <li role="presentation">
            <a href="#system2" aria-controls="system2" role="tab" data-toggle="tab"><img src="img/redhat.png" width="20"><span class="myHidden-sm">&nbsp;RHEL</span></a>
        </li>
        <li role="presentation">
            <a href="#system3" aria-controls="system3" role="tab" data-toggle="tab"><img src="img/Ubuntu.png" width="20"><span class="myHidden-sm">&nbsp;Debian/Ubuntu</span></a>
        </li>
        <li role="presentation">
            <a href="#system4" aria-controls="system4" role="tab" data-toggle="tab"><img src="img/linux.png" width="20"><span class="myHidden-sm">&nbsp;Other&nbsp;Linux</span></a>
        </li>
        <li role="presentation">
            <a href="#system5" aria-controls="system5" role="tab" data-toggle="tab"><img src="img/freebsd.png" width="20"><span class="myHidden-sm">&nbsp;BSD</span></a>
        </li>
        <li role="presentation">
            <a href="#system6" aria-controls="system6" role="tab" data-toggle="tab"><img src="img/octocat.png" width="20"><span class="myHidden-sm">&nbsp;Build&nbsp;rspamd</span></a>
        </li>
    </ul>
    <!-- Tab - pane content -->
    <div class="tab-content">
        <div role="tabpanel" class="tab-pane fade in active" id="system1">
            <h3>Docker</h3>
<div markdown="1">
An official docker image is available at [rspamd/rspamd on Dockerhub](https://hub.docker.com/r/rspamd/rspamd), sources are [on github](https://github.com/rspamd/rspamd-docker). It is a recommendable way to run Rspamd.

In this build upstream config files are installed in `/usr/share/rspamd/config` allowing `/etc/rspamd` to contain only local configuration.

This build provides a [language identification model](https://fasttext.cc/docs/en/language-identification.html) to enable language detection using `fasttext`, distributed under [version 3.0 of the Creative Commons Attribution-Share-Alike License](https://creativecommons.org/licenses/by-sa/3.0/).

Volumes or bind mounts should be used for the `/var/lib/rspamd` directory and optionally for `/etc/rspamd`. If bind mounts are used, the `/var/lib/rspamd` directory should be writable by `11333:11333` on the host machine.

The root directory may be set read-only for added security at cost of being less tactile for the administrator.

Basic usage:

    docker run -v rspamd_dbdir:/var/lib/rspamd -v rspamd_confdir:/etc/rspamd -ti rspamd/rspamd

A [Docker compose example](https://github.com/rspamd/rspamd-docker/tree/main/examples/compose) is available in the source repo.
</div>
        </div>
        <div role="tabpanel" class="tab-pane fade" id="system2">
            <h3>RHEL-alike distributions</h3>
<div markdown="1">
Packages are available for RHEL-compatible distributions such as Oracle Linux, AlmaLinux, Rocky Linux and CentOS. Currently versions 7 through 9 are supported.

Please note that these packages **require** [EPEL](https://fedoraproject.org/wiki/EPEL) to be installed on your system as many dependencies are missing from the base repositories. You can learn how to install EPEL from their site: <https://fedoraproject.org/wiki/EPEL>.
Please bear in mind, that you might also need debug symbols package for Rspamd to be able to fill bug reports about possible crashes. Debug symbols are placed in `rspamd-debug` package and could be safely installed even in the production environment.

To install rspamd repo, please download the corresponding repository file and the signing key (both repo and all packages are signed with my GPG key). You could use the following commands to install rspamd <a class="undecor" href="#stableSys1">stable<sup>1</sup></a> RPM repository:

    source /etc/os-release
    export EL_VERSION=`echo -n $PLATFORM_ID | sed "s/.*el//"`
    curl https://rspamd.com/rpm-stable/centos-${EL_VERSION}/rspamd.repo > /etc/yum.repos.d/rspamd.repo
    rpm --import https://rspamd.com/rpm-stable/gpg.key
    yum update
    yum install rspamd


For <a class="undecor" href="#experimentalSys1">experimental<sup>2</sup></a> branch packages, download `rpm-experimental` repofile as following:

    source /etc/os-release
    export EL_VERSION=`echo -n $PLATFORM_ID | sed "s/.*el//"`
    curl https://rspamd.com/rpm/centos-${EL_VERSION}/rspamd-experimental.repo > /etc/yum.repos.d/rspamd.repo
    rpm --import https://rspamd.com/rpm/gpg.key
    yum update
    yum install rspamd


For <a class="undecor" href="#asanSys1">asan<sup>2</sup></a> branch packages, download `rpm-experimental-asan` repofile as following:

    source /etc/os-release
    export EL_VERSION=`echo -n $PLATFORM_ID | sed "s/.*el//"`
    curl https://rspamd.com/rpm-asan/centos-${EL_VERSION}/rspamd-experimental.repo > /etc/yum.repos.d/rspamd.repo
    rpm --import https://rspamd.com/rpm/gpg.key
    yum update
    yum install rspamd

</div>
<hr>
<p class="myFootnote" id="stableSys1">1. Use STABLE branch of packages: those packages are the official rspamd releases which are recommended for production usage.</p>
<p class="myFootnote" id="experimentalSys1">2. Use EXPERIMENTAL branch of packages: these packages are less stable and they are generated frequently from the current development branch. Experimental packages usually have more features but might be SOMETIMES broken in some points (nevertheless, bugs are usually quickly fixed after detection).</p>
<p class="myFootnote" id="asanSys1">3. Use ASAN branch of packages: these are packages (both stable and experimental) designed to debug Rspamd issues, especially core files, using advanced debugging tools. Use these packages if you encounter an issue in Rspamd and you want it to be fixed.</p>
        </div>
        <div role="tabpanel" class="tab-pane fade" id="system3">
            <h3>Debian and Ubuntu Linux</h3>
<div markdown="1">

Rspamd supports the following .deb based distributives:

- **Debian bookworm** (since 3.5)
- **Debian bullseye**
- **Ubuntu focal** (since 2.5)
- **Ubuntu jammy** (since 3.3)

To install the rspamd <a class="undecor" href="#stableSys2">stable<sup>1</sup></a> apt repository, please use the following commands:

~~~bash
#apt update # if running a minimal system
#apt-get install sudo # if running a minimal system
sudo apt-get install -y lsb-release wget gpg  # optional
CODENAME=`lsb_release -c -s`
sudo mkdir -p /etc/apt/keyrings
wget -O- https://rspamd.com/apt-stable/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/rspamd.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/rspamd.gpg] http://rspamd.com/apt-stable/ $CODENAME main" | sudo tee /etc/apt/sources.list.d/rspamd.list
echo "deb-src [signed-by=/etc/apt/keyrings/rspamd.gpg] http://rspamd.com/apt-stable/ $CODENAME main"  | sudo tee -a /etc/apt/sources.list.d/rspamd.list
sudo apt-get update
sudo apt-get --no-install-recommends install rspamd
~~~


For [Hyperscan](https://www.hyperscan.io/) and [LuaJIT](https://luajit.org) information see the [FAQ]({{ site.url }}{{ site.baseurl }}/doc/faq.html).

For <a class="undecor" href="#experimentalSys2">experimental<sup>2</sup></a> branch replace `apt-stable` with just `apt`:

~~~bash
#apt update # if running a minimal system
#apt-get install sudo # if running a minimal system
sudo apt-get install -y lsb-release wget gpg  # optional
CODENAME=`lsb_release -c -s`
sudo mkdir -p /etc/apt/keyrings
wget -O- https://rspamd.com/apt-stable/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/rspamd.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/rspamd.gpg] http://rspamd.com/apt/ $CODENAME main" | sudo tee /etc/apt/sources.list.d/rspamd.list
echo "deb-src [signed-by=/etc/apt/keyrings/rspamd.gpg] http://rspamd.com/apt/ $CODENAME main"  | sudo tee -a /etc/apt/sources.list.d/rspamd.list
sudo apt-get update
sudo apt-get --no-install-recommends install rspamd
~~~

For <a class="undecor" href="#asanSys2">ASAN<sup>2</sup></a> branch install `rspamd-asan` package instead of `rspamd` (since 3.5).

Please bear in mind, that you might also need debug symbols package for Rspamd to be able to fill bug reports about possible crashes. Debug symbols are placed in `rspamd-dbg` (or `rspamd-asan-dbg`) package and could be safely installed even in the production environment.
Check [the quick start document]({{ site.baseurl }}/doc/quickstart.html#rspamd-installation) for further steps.

### Packages support policy

Check [the support policy document]({{ site.baseurl }}/packages_support_policy.html) to clarify what OS versions are supported by Rspamd packages.

### Debian `standard` repos notes

Please **DO NOT** use those packages, as they are likely outdated and are not supported by Rspamd project in any way (so any associated issue will likely be closed automaticall). If you decide to use those packages then please address any issues to the Debian package maintainers. 

</div>
<hr>
<p class="myFootnote" id="stableSys2">1. Use STABLE branch of packages: those packages are the official rspamd releases which are recommended for production usage.</p>
<p class="myFootnote" id="experimentalSys2">2. Use EXPERIMENTAL branch of packages: these packages are less stable and they are generated frequently from the current development branch. Experimental packages usually have more features but might be SOMETIMES broken in some points (nevertheless, bugs are usually quickly fixed after detection).</p>
<p class="myFootnote" id="asanSys2">3. Use ASAN branch of packages: these are packages (both stable and experimental) designed to debug Rspamd issues, especially core files, using advanced debugging tools. Use these packages if you encounter an issue in Rspamd and you want it to be fixed.</p>
        </div>
        <div role="tabpanel" class="tab-pane fade" id="system4">
            <h3>Other Linux</h3>
<div markdown="1">
Rspamd is also available on the following Linux distributions:

- **Alpine Linux**
- **Arch Linux**
- **Gentoo Linux**
- **OpenSUSE**
- **Void Linux**

### Alpine Linux
Rspamd is available in the [community repository](https://pkgs.alpinelinux.org/package/edge/community/x86_64/rspamd)

### Arch Linux
Rspamd is available in the [community repository](https://archlinux.org/packages/extra/x86_64/rspamd/)

### Gentoo Linux
Ebuilds for Gentoo Linux users are available in the main [Gentoo Portage repository](https://packages.gentoo.org/packages/mail-filter/rspamd).

### OpenSUSE
Packages for OpenSUSE Leap & Tumbleweed are available on [OBS](https://build.opensuse.org/package/show/server:mail/rspamd).

### Void Linux
Packages for Void Linux are available in the main [package repository](https://github.com/void-linux/void-packages/tree/master/srcpkgs/rspamd).

</div>
        </div>
        <div role="tabpanel" class="tab-pane fade" id="system5">
            <h3>BSD systems</h3>
<div markdown="1">
Rspamd has been ported to the following BSD like operating systems:

- **FreeBSD**
- **NetBSD**
- **OpenBSD**
- **macOS** (using MacPorts)

FreeBSD users can install Rspamd from [ports](https://www.freshports.org/mail/rspamd/) or use the experimental line of packages by [rspamd-devel](https://www.freshports.org/mail/rspamd-devel/) port.

Users of NetBSD (and other systems with pkgsrc) can use [pkgsrc](https://pkgsrc.se/mail/rspamd).

OpenBSD users can use [ports](https://openports.se/mail/rspamd).

macOS users can install from [MacPorts](https://ports.macports.org/port/rspamd):
```
sudo port install rspamd
sudo port load rspamd
```

</div>
        </div>
        <div role="tabpanel" class="tab-pane fade" id="system6">
            <h3>Build rspamd from the sources</h3>
<div markdown="1">

If there are no packages for your system or you want custom build options you can also build rspamd from the source code. To do that grab the source from [github](https://github.com/rspamd/rspamd) using `git`:

	git clone --recursive https://github.com/rspamd/rspamd.git

### Build requirements

Rspamd requires several 3-rd party software to build and run:

* [openssl](https://www.openssl.org/) - cryptography and SSL/TLS Toolkit
* [glib2](https://developer.gnome.org/glib/) - common purposes library
* [ragel](https://www.colm.net/open-source/ragel/) - state machine compiler.
* [LuaJIT](https://luajit.org/) - jit compiler for [lua](https://www.lua.org/) programming language. Plain Lua should work as well.
* [cmake](https://cmake.org/) - build system used to configure rspamd
* [sqlite3](https://sqlite.org/) - embedded database used to store some data by rspamd
* [libmagic](https://www.darwinsys.com/file/) - common library for detecting file types
* [libicu](https://icu.unicode.org/) - unicode library
* [PCRE](https://www.pcre.org/) - regular expressions library
* [Hyperscan](https://www.hyperscan.io)/[Vectorscan](https://github.com/VectorCamp/vectorscan) - optional regexp performance boost library
* [zlib](https://zlib.net/) - compression library

You can either install them from sources or (recommended) install using package manager of your system.

It is also highly recommended to use [Redis](https://redis.io) as it can be used by many Rspamd modules to improve their filtering quality (some modules will be turned off completely without Redis).

It is also recommended to build Rspamd with Hyperscan (x86_64 only) or Vectorscan (aarch64/ppc64le) and Jemalloc to improve performance.

### Build process

To build rspamd we recommend to create a separate build directory:

	mkdir rspamd.build
	cd rspamd.build
	cmake ../rspamd -DENABLE_HYPERSCAN=ON -DENABLE_LUAJIT=ON -DCMAKE_BUILD_TYPE=RelWithDebuginfo
	make
	sudo make install

On unsupported Debian-alike or RPM-based systems you might use in-repo fixtures to build a package.

An example for [Debian](https://debian.org/)-like systems.

    export RSPAMD_VERSION=3.7.3 # set this to desired Rspamd version
    git clone -b ${RSPAMD_VERSION} https://github.com/rspamd/rspamd.git
    cd rspamd
    sed -i s/\(.*\)/\(${RSPAMD_VERSION}\)/ debian/changelog
    sed -i s/quilt/native/ debian/source/format
    sudo apt install devscripts
    mk-build-deps
    sudo bash -c "dpkg -i rspamd-build-deps_${RSPAMD_VERSION}_*.deb && apt install -f -y"
    debuild -us -uc
    sudo "dpkg -i ../rspamd_${RSPAMD_VERSION}_*.deb"
</div>
        </div>
    </div>
</div>
