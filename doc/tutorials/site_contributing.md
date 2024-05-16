---
layout: doc
title: Contributing to website
---
# Contributing to rspamd.com website

## Local links

During the build process, Markdown sources are converted into HTML pages, and their file extensions are changed from `*.md` to `*.html`. When creating local links, ensure to replace the `.md` file extension with `.html`.

To maintain website portability, utilize the `site.url` and `site.baseurl` variables when creating local links. Absolute local links should start with {{ "{{" }}&nbsp;site.url&nbsp;}}{{ "{{" }}&nbsp;site.baseurl&nbsp;}}, while root-relative links should begin with {{ "{{" }}&nbsp;site.baseurl&nbsp;}}:

| Correct | Incorrect |
| ------- | --------- |
| `[link]({{ "{{ site.url " }}}}{{ "{{ site.baseurl " }}}}/dir/doc.html)` | `[link](https://rspamd.com/dir/doc.html)` |
| `[link]({{ "{{ site.baseurl " }}}}/dir/doc.html)` | `[link](/dir/doc.html)` |

## Testing changes

Before submitting a pull request, it's advisable to verify how your changes affect the website (formatting, links, highlighting, etc.). Fortunately, this can be easily accomplished using GitHub Pages.

### Running tests and publishing website with a GitHub Actions workflow

To enable GitHub Action workflows:

1. On GitHub, navigate to your fork repository.
1. Under your repository name, click **Actions**, then click **I understand my workflows, go ahead and enable them**.

To configure your site for publishing with GitHub Actions:

1. On GitHub, navigate to your fork repository.
1. Under your repository name, click **Settings**.
1. In the "Code and automation" section of the sidebar, click **Pages**.
1. Under "Build and deployment", under "Source", select **GitHub Actions**.

Your website will be accessible at `https://<user>.github.io/<repository>`.
