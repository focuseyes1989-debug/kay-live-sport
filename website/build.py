"""Build a dependency-free GitHub Pages site from published release metadata."""
import argparse
import html
import json
import os
from pathlib import Path
import re
import shutil
import urllib.request

REPO = 'focuseyes1989-debug/kay-live-sport'
SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parent
ASSETS = {
    'PHONE64': 'KAYLiveSport-android-arm64-debug.apk',
    'PHONE32': 'KAYLiveSport-android-arm32-debug.apk',
    'TABLET64': 'KAYLiveSport-tablet-arm64-debug.apk',
    'TABLET32': 'KAYLiveSport-tablet-arm32-debug.apk',
    'TV32': 'KAYLiveSport-tv-arm32-debug.apk',
    'TV64': 'KAYLiveSport-tv-arm64-debug.apk',
    'WINDOWS': 'KAYLiveSport-windows-x64.exe',
}


def version(tag, windows):
    match = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)' if windows else r'android-v(\d+)\.(\d+)\.(\d+)', str(tag))
    return tuple(map(int, match.groups())) if match else None


def build(releases, output):
    values, downloads = {}, {}
    for key, name in ASSETS.items():
        candidates = [(version(r.get('tag_name'), key == 'WINDOWS'), r) for r in releases
                      if not r.get('draft') and (key != 'WINDOWS' or not r.get('prerelease'))]
        candidates = sorted((row for row in candidates if row[0]), key=lambda row: row[0], reverse=True)
        found = None
        for _, release in candidates:
            asset = next((a for a in release.get('assets', []) if a.get('name') == name and a.get('state') == 'uploaded'), None)
            checksums = next((a for a in release.get('assets', []) if a.get('name') == 'SHA256SUMS.txt' and a.get('state') == 'uploaded'), None)
            if asset and checksums:
                found = (release, asset, checksums)
                break
        if not found:
            raise ValueError(f'No public release with asset and checksums: {name}')
        release, asset, checksums = found
        tag = release['tag_name']
        for a in (asset, checksums):
            if a.get('browser_download_url') != f'https://github.com/{REPO}/releases/download/{tag}/{a["name"]}':
                raise ValueError('Unexpected download host or path')
        release_url = f'https://github.com/{REPO}/releases/tag/{tag}'
        info = {'version': '.'.join(map(str, version(tag, key == 'WINDOWS'))),
                'url': asset['browser_download_url'], 'size': f'{asset["size"] / 1048576:.1f} MB',
                'release': release_url, 'checksums': checksums['browser_download_url'],
                'filename': name, 'bytes': asset['size'], 'sha256': asset.get('digest')}
        downloads[key] = info
        for field in ('version', 'url', 'size', 'release', 'checksums'):
            values[f'@@{key}_{field.upper()}@@'] = html.escape(info[field], quote=True)
    template = (SOURCE / 'index.html').read_text(encoding='utf-8')
    for key, value in values.items():
        template = template.replace(key, value)
    if re.search(r'@@[A-Z0-9_]+@@', template):
        raise ValueError('Unresolved website placeholder')
    output.mkdir(parents=True, exist_ok=True)
    for name in ('style.css', 'site.js', 'privacy.html'):
        shutil.copyfile(SOURCE / name, output / name)
    shutil.copytree(SOURCE / 'assets', output / 'assets', dirs_exist_ok=True)
    (output / 'index.html').write_text(template, encoding='utf-8')
    (output / 'downloads.json').write_text(json.dumps(downloads, indent=2), encoding='utf-8')
    (output / '.nojekyll').touch()
    print('Website built with verified release paths:', ', '.join(f'{key} v{info["version"]}' for key, info in downloads.items()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--releases', type=Path, help='Optional saved public release metadata for offline builds')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/github-pages')
    args = parser.parse_args()
    if args.releases:
        releases = json.loads(args.releases.read_text(encoding='utf-8-sig'))
    else:
        headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'KAY-LIVE-SPORT-Website'}
        token = os.environ.get('GITHUB_TOKEN')
        if token:
            headers['Authorization'] = f'Bearer {token}'
        request = urllib.request.Request(f'https://api.github.com/repos/{REPO}/releases?per_page=100', headers=headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            releases = json.load(response)
    build(releases, args.output)


if __name__ == '__main__':
    main()
