package com.kaylivesport.mobile

import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private var playerFullscreen = false
  private var keyboardVisible = false
  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) for (i in 0 until view.childCount) findWebView(view.getChildAt(i))?.let { return it }
    return null
  }
  fun setPlayerFullscreen(enabled: Boolean) {
    playerFullscreen = enabled
    if (Build.VERSION.SDK_INT >= 28) {
      window.attributes = window.attributes.apply {
        layoutInDisplayCutoutMode = if (enabled) WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES else WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
      }
    }
    WindowCompat.setDecorFitsSystemWindows(window, false)
    if (enabled) window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN) else window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    if (enabled) controller.hide(WindowInsetsCompat.Type.systemBars()) else controller.show(WindowInsetsCompat.Type.systemBars())
    ViewCompat.requestApplyInsets(findViewById(android.R.id.content))
  }
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && playerFullscreen) setPlayerFullscreen(true)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    window.decorView.post { if (playerFullscreen) setPlayerFullscreen(true) }
  }
  override fun onResume() {
    super.onResume()
    window.decorView.post { if (playerFullscreen) setPlayerFullscreen(true) }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT), navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT))
    super.onCreate(savedInstanceState)
    // The TV APK is also tested on phones/tablets; uiMode is not an edition flag.
    // Let the TV WebView consume Back before falling through to Android navigation.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      private fun defaultBack() {
        isEnabled = false
        try { onBackPressedDispatcher.onBackPressed() } finally { isEnabled = true }
      }
      override fun handleOnBackPressed() {
        val web = findWebView(window.decorView)
        if (web == null) { defaultBack(); return }
        web.evaluateJavascript("Boolean(window.kayTvBack && window.kayTvBack())") { handled ->
          if (handled != "true") defaultBack()
        }
      }
    })
    window.decorView.setBackgroundColor(Color.rgb(11, 16, 25))
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val visible = insets.isVisible(WindowInsetsCompat.Type.ime())
      if (keyboardVisible && !visible) findWebView(window.decorView)?.evaluateJavascript("window.kayTvKeyboardHidden && window.kayTvKeyboardHidden()", null)
      keyboardVisible = visible
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      if (playerFullscreen) view.setPadding(0, 0, 0, 0) else view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
    ViewCompat.requestApplyInsets(content)
  }
}
