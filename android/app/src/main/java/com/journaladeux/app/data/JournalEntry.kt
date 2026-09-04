package com.journaladeux.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class JournalEntry(
    val id: String? = null,
    @SerialName("author_key")
    val authorKey: String,
    val content: String? = null,
    @SerialName("photo_url")
    val photoUrl: String? = null,
    val mood: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)
