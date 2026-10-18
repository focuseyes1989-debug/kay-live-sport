param([ValidateSet('debug','release')][string]$Mode='debug')
$env:CARGO_TERM_COLOR='never'
$ErrorActionPreference='Stop'
$project=Split-Path -Parent $PSCommandPath
$workspace=Split-Path -Parent $project
if (-not $env:JAVA_HOME) { $env:JAVA_HOME=(Get-ChildItem -LiteralPath (Join-Path $workspace '.tools/java') -Directory | Select-Object -First 1).FullName }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME=Join-Path $workspace '.tools/android' }
if (-not $env:NDK_HOME) { $env:NDK_HOME=Join-Path $env:ANDROID_HOME 'ndk/28.2.13676358' }
$env:Path="$env:JAVA_HOME/bin;$env:Path"
Push-Location $project
try {
 node prepare-ui.cjs
 if ($LASTEXITCODE -ne 0) { throw 'Frontend preparation failed' }
 $arguments=@('node_modules/@tauri-apps/cli/tauri.js','android','build','--apk','--target','aarch64','--ci')
 if ($Mode -eq 'debug') { $arguments+='--debug' }
 & node @arguments 2>&1 | Tee-Object -Variable buildOutput
 if ($LASTEXITCODE -ne 0) {
  if ($Mode -ne 'debug' -or ($buildOutput -join "`n") -notmatch 'Creation symbolic link is not allowed') { throw 'Android build failed' }
  # Some Windows installations lack symlink privilege. Copy the successfully
  # compiled library and package it without rebuilding Rust inside Gradle.
  $native=Join-Path $project 'src-tauri/target/aarch64-linux-android/debug/libkay_live_sport_mobile_lib.so'
  if (-not (Test-Path $native)) { throw 'Compiled Android library missing' }
  $jni=Join-Path $project 'src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a'
  New-Item -ItemType Directory -Force $jni | Out-Null
  Copy-Item -LiteralPath $native -Destination $jni -Force
  Push-Location (Join-Path $project 'src-tauri/gen/android')
  try {
   ./gradlew.bat :app:assembleArm64Debug -PtargetList=aarch64 -ParchList=arm64 -PabiList=arm64-v8a -x :app:rustBuildArm64Debug --console=plain
   if ($LASTEXITCODE -ne 0) { throw 'APK packaging failed' }
  } finally { Pop-Location }
 }
 $outputs=Join-Path $project 'src-tauri/gen/android/app/build/outputs/apk'
 $apk=Get-ChildItem -LiteralPath $outputs -Recurse -Filter "*-$Mode.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
 if (-not $apk) { throw 'Built APK was not found' }
 $destination=Join-Path $workspace "dist/KAYLiveSport-android-arm64-$Mode.apk"
 Copy-Item -LiteralPath $apk.FullName -Destination $destination -Force
 Write-Output "APK: $destination"

} finally { Pop-Location }
