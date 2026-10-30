package com.kaylivesport.mobile

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.*
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class PhoneBackgroundDeliveryTest {
 @Test fun scheduleScreenOffDelivery() {
  val c=InstrumentationRegistry.getInstrumentation().targetContext
  val p=c.getSharedPreferences("phone-live-notifications",0)
  assertTrue("User must enable notifications first",p.getBoolean("enabled",false))
  val states=JSONObject(p.getString("states","{}")!!)
  val rows=states.keys().asSequence().mapNotNull { key ->
   val fields=key.split("|");if(fields.size!=4)null else LiveFixture(key,fields[1],fields[2],false,false)
  }.toList()
  assertTrue("Use existing real provider fixture baseline",rows.isNotEmpty())
  PhoneLiveNotifications.configure(c,false)
  PhoneLiveNotifications.configure(c,true)
  PhoneLiveNotifications.observe(c,rows)
  val request=OneTimeWorkRequest.Builder(PhoneLiveWorker::class.java)
   .setInitialDelay(5,TimeUnit.SECONDS)
   .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
  WorkManager.getInstance(c).enqueueUniqueWork("phone-live-screen-off-test",ExistingWorkPolicy.REPLACE,request).result.get(10,TimeUnit.SECONDS)
 }
}
