package com.tsos.app.ui.theme

import android.app.Activity
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Cream palette
val Cream50 = Color(0xFFFFF9F2)
val Cream100 = Color(0xFFFFF1E6)
val Cream200 = Color(0xFFF1E9E0)
val Cream300 = Color(0xFFE9E0D6)

// Action (orange)
val Action = Color(0xFFF97316)
val ActionHover = Color(0xFFEA580C)
val ActionActive = Color(0xFFC2410C)
val ActionSoft = Color(0xFFFFF1E6)

// Status colors
val StatusCompleted = Color(0xFF17803D)
val StatusCompletedSoft = Color(0xFFE8F5EC)
val StatusAttention = Color(0xFFB45309)
val StatusAttentionSoft = Color(0xFFFFF4E5)
val StatusDestructive = Color(0xFFB42318)
val StatusDestructiveSoft = Color(0xFFFEF2F2)
val StatusInfo = Color(0xFF2563EB)
val StatusInfoSoft = Color(0xFFEFF6FF)
val StatusAccent = Color(0xFF7C3AED)
val StatusAccentSoft = Color(0xFFF5F3FF)

// Text
val TextPrimary = Color(0xFF1C1917)
val TextSecondary = Color(0xFF57534E)
val TextMuted = Color(0xFFA8A29E)
val TextInverse = Color(0xFFFFFFFF)

// Legacy Tailwind-style aliases (used by screens)
val Slate200 = Color(0xFFE9E0D6)
val Slate400 = Color(0xFFA8A29E)
val Slate700 = Color(0xFF57534E)
val Slate800 = Color(0xFF3D3835)
val Slate900 = Color(0xFF1C1917)
val Emerald500 = Color(0xFF17803D)
val Orange500 = Color(0xFFF97316)
val Red500 = Color(0xFFB42318)
val Amber500 = Color(0xFFB45309)
val Purple500 = Color(0xFF7C3AED)

// Surface
val Surface = Color(0xFFFFFFFF)
val SurfaceHover = Color(0xFFFDF8F0)
val Divider = Color(0xFFE7E5E4)

private val LightColorScheme = lightColorScheme(
    primary = Action,
    onPrimary = TextInverse,
    primaryContainer = ActionSoft,
    secondary = StatusCompleted,
    onSecondary = TextInverse,
    secondaryContainer = StatusCompletedSoft,
    background = Cream50,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = Cream200,
    onSurfaceVariant = TextSecondary,
    error = StatusDestructive,
    onError = TextInverse,
    errorContainer = StatusDestructiveSoft,
    outline = Divider,
)

@Composable
fun TSOSTheme(content: @Composable () -> Unit) {
    val colorScheme = LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Cream50.toArgb()
            window.navigationBarColor = Cream50.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
