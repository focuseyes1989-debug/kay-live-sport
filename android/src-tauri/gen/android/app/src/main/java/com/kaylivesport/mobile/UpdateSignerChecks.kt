package com.kaylivesport.mobile

import java.security.MessageDigest

internal object UpdateSignerChecks {
 fun certificates(modern: List<ByteArray>?, legacy: () -> List<ByteArray>?): Set<String> {
  val values=modern?.takeIf { it.isNotEmpty() } ?: legacy().orEmpty()
  return values.filter { it.isNotEmpty() }.map { bytes ->
   MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it.toInt() and 255) }
  }.toSet()
 }
 fun verify(installed: Set<String>, incoming: Set<String>) {
  require(installed.isNotEmpty() && incoming.isNotEmpty()) { "Could not read APK signing certificate. Download the APK again or install the official APK with Android's installer without uninstalling." }
  require(installed==incoming) { "Signing key differs (installed ${installed.sorted().joinToString { it.take(12) }}, APK ${incoming.sorted().joinToString { it.take(12) }}). Update cancelled; do not uninstall to keep your settings." }
 }
}
