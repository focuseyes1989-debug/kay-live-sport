# Download website

Static GitHub Pages site at https://focuseyes1989-debug.github.io/kay-live-sport/.

`python website/build.py` builds `dist/github-pages/` using public GitHub release metadata. An optional `GITHUB_TOKEN` is read only from the environment. For offline/local builds use `--releases path/to/releases.json`.

The builder selects the newest published Android release containing each edition/architecture, and the newest stable Windows release containing the EXE. Download URLs and checksum paths must match this repository exactly. Versions are independent across editions. Links work without client-side JavaScript.

`.github/workflows/pages.yml` deploys on website changes, manual dispatch and published releases (including Android prereleases). APK/EXE files stay on GitHub Releases; they are not copied into Pages or the Git repository. The GitHub Pages publishing source must be GitHub Actions.
