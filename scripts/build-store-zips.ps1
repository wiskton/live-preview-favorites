<#
.SYNOPSIS
  Builds the Chrome Web Store and Firefox AMO submission zips.

.DESCRIPTION
  Stages only the files the extension actually needs at runtime (allow-list,
  not an ignore-list) and zips them with forward-slash entry names, which
  .NET's Compress-Archive/ZipFile.CreateFromDirectory get wrong on Windows.
  imgs/, README.md, dist/, .git/ etc. are never included because they're
  simply never copied into the staging folder.

.EXAMPLE
  pwsh ./scripts/build-store-zips.ps1
#>

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root    = Split-Path -Parent $PSScriptRoot
$dist    = Join-Path $root "dist"
$stage   = Join-Path $dist "stage"
$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version

if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Force -Path $dist | Out-Null }
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# Allow-list: only what manifest.json actually references at runtime.
Copy-Item (Join-Path $root "manifest.json") $stage
Copy-Item (Join-Path $root "content.js") $stage
Copy-Item (Join-Path $root "popup.html") $stage
Copy-Item (Join-Path $root "popup.js") $stage
Copy-Item (Join-Path $root "LICENSE") $stage
Copy-Item (Join-Path $root "icons") $stage -Recurse
Copy-Item (Join-Path $root "_locales") $stage -Recurse

# Pequena pausa: no Windows, o OneDrive/antivírus às vezes prende o handle
# de arquivos recém-copiados por um instante e derruba o zip no meio.
Start-Sleep -Seconds 2

$chromeZip  = Join-Path $dist "live-preview-favorites-chrome-v$version.zip"
$firefoxZip = Join-Path $dist "live-preview-favorites-firefox-v$version.zip"

function New-ProperZip {
    param([string]$sourceDir, [string]$zipPath)
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    $fileStream = New-Object System.IO.FileStream($zipPath, [System.IO.FileMode]::Create)
    $archive = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create)
    $files = Get-ChildItem -Recurse -File $sourceDir
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($sourceDir.Length + 1)
        # Força barra normal: o zip padrão do .NET no Windows usa backslash,
        # o que quebra _locales/ ao validar em backends Linux (AMO/CWS).
        $entryName = $relative.Replace([System.IO.Path]::DirectorySeparatorChar, [char]47)
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $archive.Dispose()
    $fileStream.Dispose()
}

New-ProperZip -sourceDir $stage -zipPath $chromeZip
New-ProperZip -sourceDir $stage -zipPath $firefoxZip

Remove-Item $stage -Recurse -Force

Write-Output "Built v$version packages:"
Get-ChildItem $dist -File -Filter "*v$version.zip" | Select-Object Name, Length
