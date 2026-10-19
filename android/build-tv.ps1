param([ValidateSet('aarch64','armv7')][string]$Target='armv7')
$ErrorActionPreference='Stop'
$previous=$env:KAY_TV
try {
 $env:KAY_TV='1'
 & "$PSScriptRoot/build.ps1" -Target $Target
 $arch=if($Target -eq 'armv7'){'arm32'}else{'arm64'}
 $dist=Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'
 $apk=Join-Path $dist "KAYLiveSport-tv-$arch-debug.apk"
 $hash=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLower()
 "$hash  KAYLiveSport-tv-$arch-debug.apk" | Set-Content "$apk.sha256"
 Write-Output "TV APK: $apk"
} finally {
 $env:KAY_TV=$previous
 node "$PSScriptRoot/prepare-ui.cjs"
}
