package com.kaylivesport.mobile

import org.junit.Test
import org.junit.Assert.*

class UpdateSignerChecksTest {
 private val a=byteArrayOf(1,2,3)
 private val b=byteArrayOf(4,5,6)
 @Test fun modernAndLegacyArchivesMatch(){
  val installed=UpdateSignerChecks.certificates(listOf(a)){ error("Modern signers should be preferred") }
  val incoming=UpdateSignerChecks.certificates(null){ listOf(a.copyOf()) }
  UpdateSignerChecks.verify(installed,incoming)
  assertEquals(incoming,UpdateSignerChecks.certificates(emptyList()){listOf(a)})
 }
 @Test fun legacyDevicesAndSignerOrder(){
  val installed=UpdateSignerChecks.certificates(null){listOf(a,b)}
  val incoming=UpdateSignerChecks.certificates(listOf(b,a)){null}
  UpdateSignerChecks.verify(installed,incoming)
 }
 @Test fun missingCertificatesAreNotReportedAsWrongKey(){
  try { UpdateSignerChecks.verify(setOf("known"),emptySet()); fail("Must reject unreadable certificates") }
  catch(e:IllegalArgumentException){assertTrue(e.message!!.contains("Could not read"))}
 }
 @Test fun differentKeysStayBlocked(){
  try { UpdateSignerChecks.verify(UpdateSignerChecks.certificates(listOf(a)){null},UpdateSignerChecks.certificates(null){listOf(b)});fail("Must reject different keys") }
  catch(e:IllegalArgumentException){assertTrue(e.message!!.contains("Signing key differs"))}
 }
}
