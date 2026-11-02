package com.kaylivesport.mobile

import android.app.Activity
import android.content.Context
import android.view.inputmethod.InputMethodManager
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
class PhoneNotificationArgs { var enabled: Boolean = false; var fixtures: String = "[]" }

@InvokeArg
class LiveNoticeArgs { var title: String = "Live match"; var body: String = ""; var key: String = "" }

@InvokeArg
class FullscreenArgs { var enabled: Boolean = false }

@InvokeArg
class HighlightArgs { lateinit var url: String }

@InvokeArg
class InstallArgs { lateinit var path: String }

@TauriPlugin
class ApkInstallerPlugin(private val activity: Activity): Plugin(activity) {
 private var keyboardRequest = 0
 @Command
 fun liveNotificationPermission(invoke: Invoke) {
  activity.runOnUiThread {
   if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
    activity.requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"), 7301)
   }
   val result=JSObject();result.put("granted",androidx.core.app.NotificationManagerCompat.from(activity).areNotificationsEnabled());invoke.resolve(result)
  }
 }
 @Command
 fun phoneNotifications(invoke: Invoke) {
  try {
   val args=invoke.parseArgs(PhoneNotificationArgs::class.java)
   val data=org.json.JSONArray(args.fixtures)
   require(data.length()<=500)
   val rows=(0 until data.length()).map { i ->
    val m=data.getJSONObject(i)
    LiveFixture(m.getString("key"),m.getString("home"),m.getString("away"),m.optBoolean("live"),m.optBoolean("finished"))
   }
   PhoneLiveNotifications.configure(activity,args.enabled)
   if(rows.isNotEmpty())PhoneLiveNotifications.observe(activity,rows)
   val result=JSObject();result.put("enabled",args.enabled);result.put("granted",androidx.core.app.NotificationManagerCompat.from(activity).areNotificationsEnabled());invoke.resolve(result)
  }catch(e:Exception){invoke.reject(e.message ?: "Could not configure live notifications")}
 }
 @Command
 fun liveNotification(invoke: Invoke) {
  val args=invoke.parseArgs(LiveNoticeArgs::class.java)
  try {
   val result=JSObject();result.put("shown",PhoneLiveNotifications.show(activity,args.key,args.title,args.body));invoke.resolve(result)
  }catch(e:Exception){invoke.reject(e.message ?: "Could not show notification")}
 }

 @Command
 fun exitApp(invoke: Invoke) {
  activity.runOnUiThread {
   val result=JSObject();result.put("exiting",true);invoke.resolve(result)
   activity.finishAndRemoveTask()
  }
 }
 @Command
 fun openMyanmarTv(invoke: Invoke) {
  try {
   val uri=Uri.parse(invoke.parseArgs(HighlightArgs::class.java).url)
   require(uri.scheme=="https" && uri.host=="www.myanmartvchannels.com" && uri.userInfo==null && uri.port==-1 && uri.path?.startsWith("/channels/")==true) { "Invalid Myanmar TV link" }
   activity.runOnUiThread {try {activity.startActivity(Intent(Intent.ACTION_VIEW,uri));val result=JSObject();result.put("opened",true);invoke.resolve(result)}catch(e:Exception){invoke.reject("No browser available to open this channel")}}
  }catch(e:Exception){invoke.reject(e.message ?: "Could not open channel")}
 }
 @Command
 fun openHighlight(invoke: Invoke) {
  try {
   val uri=Uri.parse(invoke.parseArgs(HighlightArgs::class.java).url)
   require(uri.scheme=="https" && uri.host=="hoofoot.net" && uri.userInfo==null && uri.port==-1 && uri.query==null && uri.fragment==null && (uri.path=="/full-matches/" || Regex("^/full-matches/[a-z0-9-]+/[a-z0-9-]+-highlights-[a-z0-9-]+/$").matches(uri.path ?: ""))) { "Invalid highlights link" }
   activity.runOnUiThread {try {activity.startActivity(Intent(Intent.ACTION_VIEW,uri)); val result=JSObject();result.put("opened",true);invoke.resolve(result)}catch(e:Exception){invoke.reject(e.message ?: "Could not open highlights")}}
  } catch(e:Exception) {invoke.reject(e.message ?: "Invalid highlights link")}
 }
 @Command
 fun status(invoke: Invoke) { val result=JSObject();result.put("installAllowed",activity.packageManager.canRequestPackageInstalls());invoke.resolve(result) }
 @Command
 fun fullscreen(invoke: Invoke) {
  val enabled = invoke.parseArgs(FullscreenArgs::class.java).enabled
  activity.runOnUiThread {
   try { (activity as MainActivity).setPlayerFullscreen(enabled); val result=JSObject();result.put("enabled",enabled);invoke.resolve(result) }
   catch(e:Exception) {invoke.reject(e.message ?: "Could not change fullscreen")}
  }
 }
 @Command
 fun keyboard(invoke: Invoke) {
  val enabled = invoke.parseArgs(FullscreenArgs::class.java).enabled
  activity.runOnUiThread {
   try {
    val manager=activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
    val request=++keyboardRequest
    if(enabled) activity.window.decorView.postDelayed({if(request==keyboardRequest) activity.currentFocus?.let {manager.showSoftInput(it,InputMethodManager.SHOW_IMPLICIT)}},100)
    else manager.hideSoftInputFromWindow(activity.window.decorView.windowToken,0)
    val result=JSObject();result.put("enabled",enabled);invoke.resolve(result)
   } catch(e:Exception) {invoke.reject(e.message ?: "Could not change keyboard")}
  }
 }
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
   // Some older TV package parsers omit SigningInfo for APK archives. Request
   // legacy certificate data separately when modern signers are unavailable.
   val theirs=UpdateSignerChecks.certificates(
    if(Build.VERSION.SDK_INT>=28) apk.signingInfo?.apkContentsSigners?.map { it.toByteArray() } else null
   ) { pm.getPackageArchiveInfo(file.path,PackageManager.GET_SIGNATURES)?.signatures?.map { it.toByteArray() } }
   val ours=UpdateSignerChecks.certificates(
    if(Build.VERSION.SDK_INT>=28) installed.signingInfo?.apkContentsSigners?.map { it.toByteArray() } else null
   ) { pm.getPackageInfo(activity.packageName,PackageManager.GET_SIGNATURES).signatures?.map { it.toByteArray() } }
   UpdateSignerChecks.verify(ours,theirs)
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
