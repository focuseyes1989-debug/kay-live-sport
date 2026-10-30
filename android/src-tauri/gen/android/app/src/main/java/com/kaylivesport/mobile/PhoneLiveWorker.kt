package com.kaylivesport.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.*
import org.json.JSONArray
import org.json.JSONObject
import org.jsoup.Jsoup
import java.util.concurrent.TimeUnit

// No WebView or Activity is needed: Android can restart this worker after process death.
object PhoneLiveNotifications {
 private const val WORK="phone-live-check"
 private const val CHANNEL="live_matches"
 private fun prefs(c:Context)=c.getSharedPreferences("phone-live-notifications",Context.MODE_PRIVATE)
 @Synchronized fun configure(c:Context, enabled:Boolean) {
  val p=prefs(c)
  if(p.getBoolean("enabled",false)!=enabled) p.edit().clear().putBoolean("enabled",enabled).commit()
  if(enabled) {
   val constraints=Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
   WorkManager.getInstance(c).enqueueUniquePeriodicWork(WORK,ExistingPeriodicWorkPolicy.KEEP,
    PeriodicWorkRequest.Builder(PhoneLiveWorker::class.java,15,TimeUnit.MINUTES).setConstraints(constraints).build())
  } else {
   WorkManager.getInstance(c).cancelUniqueWork(WORK)
   NotificationManagerCompat.from(c).cancelAll()
  }
 }
 fun shouldNotify(previous:String,row:LiveFixture)=previous=="upcoming" && row.live && !row.finished
 fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
 @Synchronized fun show(c:Context,key:String,title:String,body:String):Boolean {
  val p=prefs(c);val now=System.currentTimeMillis()
  if(!enabled(c)||!NotificationManagerCompat.from(c).areNotificationsEnabled())return false
  val sent=JSONObject(p.getString("sent","{}")!!)
  for(k in sent.keys().asSequence().toList())if(now-sent.optLong(k)>172800000)sent.remove(k)
  if(sent.has(key))return false
  val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  manager.createNotificationChannel(NotificationChannel(CHANNEL,"Live matches",NotificationManager.IMPORTANCE_HIGH))
  val intent=Intent(c,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  val pending=PendingIntent.getActivity(c,0,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  val notification=NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_media_play)
   .setContentTitle(title.take(160)).setContentText(body.take(240)).setContentIntent(pending).setAutoCancel(true).build()
  manager.notify(key.hashCode(),notification)
  sent.put(key,now);p.edit().putString("sent",sent.toString()).commit();return true
 }
 @Synchronized fun observe(c:Context,rows:List<LiveFixture>) {
  if(!enabled(c))return
  val p=prefs(c);val old=JSONObject(p.getString("states","{}")!!);val next=JSONObject()
  for(row in rows) {
   if(shouldNotify(old.optString(row.key),row))show(c,row.key,"LIVE · ${row.home} vs ${row.away}","Match is live · Tap to open KAY LIVE SPORT")
   next.put(row.key,if(row.finished)"finished" else if(row.live)"live" else "upcoming")
  }
  // Missing rows are retained for one day so a partial provider page cannot erase the baseline.
  val now=System.currentTimeMillis();val times=JSONObject(p.getString("times","{}")!!)
  for(row in rows)times.put(row.key,now)
  for(k in old.keys())if(!next.has(k) && now-times.optLong(k)<86400000)next.put(k,old.get(k))
  val retained=JSONObject();for(k in next.keys())retained.put(k,times.optLong(k,now))
  p.edit().putString("states",next.toString()).putString("times",retained.toString()).commit()
 }
}
data class LiveFixture(val key:String,val home:String,val away:String,val live:Boolean,val finished:Boolean)
object PhoneFixtureParser {
 fun parse(html:String):List<LiveFixture> {
  val doc=Jsoup.parse(html);val raw=doc.selectFirst("script#matches-data")?.data()
  val metadata=if(raw.isNullOrBlank())JSONArray() else JSONArray(raw)
  val rows=linkedMapOf<String,LiveFixture>()
  fun add(home:String,away:String,time:String,id:String,live:Boolean,finished:Boolean) {
   if(home.isBlank()||away.isBlank())return
   val key=listOf("1",home,away,time.ifBlank {id}).joinToString("|")
   if(!rows.containsKey(key))rows[key]=LiveFixture(key,home,away,live&&!finished,finished)
  }
  val byPost=mutableMapOf<String,JSONObject>()
  for(i in 0 until metadata.length()){val m=metadata.getJSONObject(i);byPost[m.optString("postid")]=m}
  for(card in doc.select(".match-item[data-match-id]")) {
   if(card.attr("sport-id").ifBlank {"1"}!="1")continue
   val m=byPost[card.attr("data-post-id")];val bucket=card.attr("data-bucket")
   add(card.select(".name-home").text(),card.select(".name-away").text(),m?.optString("time")?:"",card.attr("data-match-id"),bucket=="live",bucket=="finished" || m?.optString("is_finished") in listOf("1","true"))
  }
  for(i in 0 until metadata.length()) {
   val m=metadata.getJSONObject(i);if(m.optString("sport_id")!="1")continue
   add(m.optString("home_name"),m.optString("away_name"),m.optString("time"),m.optString("postid"),m.optString("is_live") in listOf("1","true"),m.optString("is_finished") in listOf("1","true"))
  }
  require(rows.isNotEmpty()) {"No provider fixtures; keep previous notification baseline"}
  return rows.values.toList()
 }
}
class PhoneLiveWorker(c:Context,params:WorkerParameters):Worker(c,params) {
 override fun doWork():Result {
  if(!PhoneLiveNotifications.enabled(applicationContext))return Result.success()
  return try {
   val html=Jsoup.connect("https://sutbongtv8.net").userAgent("Mozilla/5.0 LiveSport/0.1").timeout(25000).maxBodySize(4000000).get().outerHtml()
   if(!isStopped)PhoneLiveNotifications.observe(applicationContext,PhoneFixtureParser.parse(html))
   Result.success()
  } catch(e:Exception) {if(runAttemptCount<3)Result.retry() else Result.failure()}
 }
}
