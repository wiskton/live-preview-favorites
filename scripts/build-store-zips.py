#!/usr/bin/env python3
"""Build Chrome/Firefox ZIPs with only runtime files, without PowerShell."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def main():
    root = Path(__file__).resolve().parents[1]
    version = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))['version']
    files = [root / name for name in ('manifest.json', 'content.js', 'popup.html', 'popup.js', 'LICENSE')]
    for folder in ('icons', '_locales'):
        files.extend(sorted(path for path in (root / folder).rglob('*') if path.is_file()))
    dist = root / 'dist'
    dist.mkdir(exist_ok=True)
    for browser in ('chrome', 'firefox'):
        output = dist / f'live-preview-favorites-{browser}-v{version}.zip'
        with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
            for file in files:
                archive.write(file, file.relative_to(root).as_posix())
        with ZipFile(output) as archive:
            assert archive.testzip() is None
            assert archive.read('content.js') == (root / 'content.js').read_bytes()
            assert json.loads(archive.read('manifest.json'))['version'] == version
            assert len(archive.namelist()) == len(files)
        print(f'{output} ({output.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
