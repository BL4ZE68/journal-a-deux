package com.journaladeux.app.data

import androidx.compose.ui.graphics.Color

data class AuthorInfo(val name: String, val color: Color)

object AppConfig {
    val AUTHORS = mapOf(
        "a" to AuthorInfo("Moi", Color(0xFFC6555F)),
        "b" to AuthorInfo("Toi", Color(0xFF7C8F5E))
    )

    val MOODS = listOf("💛", "😂", "🥹", "😴", "🔥", "🌧️")

    const val JOURNAL_TITLE = "Notre journal"
}
