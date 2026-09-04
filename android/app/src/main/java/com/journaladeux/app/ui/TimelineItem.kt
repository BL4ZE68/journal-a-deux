package com.journaladeux.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.journaladeux.app.data.AppConfig
import com.journaladeux.app.data.JournalEntry
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.runtime.rememberCoroutineScope
import com.journaladeux.app.data.JournalReaction
import com.journaladeux.app.data.supabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun TimelineItem(entry: JournalEntry, currentAuthorKey: String) {
    val authorInfo = AppConfig.AUTHORS[entry.authorKey]
    val scope = rememberCoroutineScope()

    val myReaction = entry.reactions.find { it.authorKey == currentAuthorKey && it.reactionType == "heart" }
    val hasReacted = myReaction != null
    val heartCount = entry.reactions.count { it.reactionType == "heart" }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF6EDDC), // Paper
            contentColor = Color(0xFF2A2138)    // Ink
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Author tag
                Surface(
                    color = authorInfo?.color ?: Color(0xFF2A2138),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = authorInfo?.name ?: "Inconnu",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = Color.White
                    )
                }

                // Mood
                entry.mood?.let {
                    Text(text = it, fontSize = 16.sp)
                }

                Spacer(modifier = Modifier.weight(1f))

                // Date
                entry.createdAt?.let {
                    val dateText = try {
                        val date = ZonedDateTime.parse(it)
                        val formatter = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.getDefault())
                        date.format(formatter)
                    } catch (e: Exception) {
                        // Fallback if parsing fails
                        it.substringBefore("T")
                    }
                    Text(
                        text = dateText,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF2A2138).copy(alpha = 0.4f)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))

            // Photo
            entry.photoUrl?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = "Photo jointe",
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.5f)),
                    contentScale = ContentScale.FillWidth
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
            
            // Content
            entry.content?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color(0xFF2A2138),
                    lineHeight = 24.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Reactions Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        scope.launch {
                            try {
                                if (hasReacted) {
                                    supabaseClient.postgrest.from("reactions").delete {
                                        filter {
                                            eq("id", myReaction!!.id!!)
                                        }
                                    }
                                } else {
                                    val reaction = JournalReaction(
                                        entryId = entry.id!!,
                                        authorKey = currentAuthorKey,
                                        reactionType = "heart"
                                    )
                                    supabaseClient.postgrest.from("reactions").insert(reaction)
                                }
                            } catch (e: Exception) {
                                // Handle error
                            }
                        }
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (hasReacted) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Réagir",
                        tint = if (hasReacted) Color(0xFFD97878) else Color(0xFF2A2138).copy(alpha = 0.3f),
                        modifier = Modifier.size(20.dp)
                    )
                }

                if (heartCount > 0) {
                    Text(
                        text = heartCount.toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF2A2138).copy(alpha = 0.6f),
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                // Show who reacted (simple version for two people)
                val otherReacted = entry.reactions.any { it.authorKey != currentAuthorKey && it.reactionType == "heart" }
                if (otherReacted) {
                    val otherAuthor = AppConfig.AUTHORS.entries.find { it.key != currentAuthorKey }?.value
                    Text(
                        text = " • ${otherAuthor?.name} a aimé",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF2A2138).copy(alpha = 0.4f),
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
        }
    }
}
