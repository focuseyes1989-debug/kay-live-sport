package com.kaylivesport.mobile

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import java.io.File

@InvokeArg
class InstallArgs { lateinit var path: String }

@TauriPlugin
class ApkInstallerPlugin(private val activity: Activity): Plugin(activity) {
 @Command
 fun status(invoke: Invoke) { val result=JSObject();result.put("installAllowed",activity.packageManager.canRequestPackageInstalls());invoke.resolve(result) }
 @Suppress("DEPRECATION")
 @Command
 fun install(invoke: Invoke) {
  try {
   val file=File(invoke.parseArgs(InstallArgs::class.java).path).canonicalFile
   val root=File(activity.cacheDir,"updates").canonicalFile
   require(file.parentFile==root && file.isFile) { "Download the APK again" }
   val pm=activity.packageManager
   val flags=if(Build.VERSION.SDK_INT>=28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
   val apk=pm.getPackageArchiveInfo(file.path,flags) ?: error("Invalid APK")
   val installed=pm.getPackageInfo(activity.packageName,flags)
   require(apk.packageName==activity.packageName) { "Update belongs to another app" }
   val newCode=if(Build.VERSION.SDK_INT>=28) apk.longVersionCode else apk.versionCode.toLong()
   val oldCode=if(Build.VERSION.SDK_INT>=28) installed.longVersionCode else installed.versionCode.toLong()
   require(newCode>oldCode) { "APK is not newer than the installed app" }
   val theirs=if(Build.VERSION.SDK_INT>=28) apk.signingInfo?.apkContentsSigners else apk.signatures
   val ours=if(Build.VERSION.SDK_INT>=28) installed.signingInfo?.apkContentsSigners else installed.signatures
   require(!ours.isNullOrEmpty() && !theirs.isNullOrEmpty() && ours.toSet()==theirs.toSet()) { "Signing key differs. Your settings are protected; update cancelled." }
   activity.runOnUiThread {
    try {
     val result=JSObject()
     if(!pm.canRequestPackageInstalls()) {
      activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.packageName)))
      result.put("permissionRequired",true)
     } else {
      val uri=FileProvider.getUriForFile(activity,activity.packageName+".fileprovider",file)
      activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
      result.put("installerOpened",true)
     }
     invoke.resolve(result)
    } catch(e:Exception) { invoke.reject(e.message ?: "Could not open installer") }
   }
  } catch(e:Exception) { invoke.reject(e.message ?: "Invalid update") }
 }
}
