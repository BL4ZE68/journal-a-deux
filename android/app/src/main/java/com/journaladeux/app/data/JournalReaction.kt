package com.journaladeux.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class JournalReaction(
    val id: String? = null,
    @SerialName("entry_id")
    val entryId: String,
    @SerialName("author_key")
    val authorKey: String,
    @SerialName("reaction_type")
    val reactionType: String,
    @SerialName("created_at")
    val createdAt: String? = null
)
