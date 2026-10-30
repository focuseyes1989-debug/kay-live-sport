package com.kaylivesport.mobile
import org.junit.Assert.*
import org.junit.Test
class PhoneLiveNotificationsTest {
 @Test fun confirmsTransitionOnly() {
  val live=LiveFixture("key","Home","Away",true,false)
  assertTrue(PhoneLiveNotifications.shouldNotify("upcoming",live))
  assertFalse(PhoneLiveNotifications.shouldNotify("",live))
  assertFalse(PhoneLiveNotifications.shouldNotify("live",live))
  assertFalse(PhoneLiveNotifications.shouldNotify("upcoming",live.copy(finished=true)))
  assertFalse(PhoneLiveNotifications.shouldNotify("upcoming",live.copy(live=false)))
 }
 @Test fun cardLiveStateWinsOverScheduleAndFootballOnly() {
  val rows=PhoneFixtureParser.parse("""
   <script id="matches-data">[
    {"postid":"p1","sport_id":1,"home_name":"Home","away_name":"Away","time":123,"is_live":false},
    {"postid":"p2","sport_id":2,"home_name":"Basket","away_name":"Ball","time":123,"is_live":true},
    {"postid":"p3","sport_id":1,"home_name":"Next","away_name":"Team","time":456,"is_live":false}
   ]</script>
   <div class="match-item" data-match-id="1" data-post-id="p1" sport-id="1" data-bucket="live">
    <span class="name-home">Home</span><span class="name-away">Away</span>
   </div>
  """.trimIndent())
  assertEquals(2,rows.size)
  assertEquals("1|Home|Away|123",rows[0].key)
  assertTrue(rows[0].live)
  assertFalse(rows[1].live)
 }
 @Test(expected=IllegalArgumentException::class) fun unavailablePageCannotEraseState() {
  PhoneFixtureParser.parse("<html>Temporarily unavailable</html>")
 }
 @Test fun finishedNeverLive() {
  val row=PhoneFixtureParser.parse("""<script id="matches-data">[{"postid":"p","sport_id":1,"home_name":"A","away_name":"B","time":123,"is_live":true,"is_finished":1}]</script>""")[0]
  assertTrue(row.finished);assertFalse(row.live)
 }
}
