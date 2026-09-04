package com.journaladeux.app.data

import android.content.Context
import androidx.room.Room
import com.journaladeux.app.data.local.AppDatabase
import com.journaladeux.app.data.local.PendingEntry
import com.journaladeux.app.data.JournalEntry
import com.journaladeux.app.data.supabaseClient
import com.journaladeux.app.data.SupabaseConfig
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class OfflineManager(private val context: Context) {
    private val db = Room.databaseBuilder(
        context,
        AppDatabase::class.java, "journal-offline"
    ).build()

    private val _isOffline = MutableStateFlow(false)
    val isOffline = _isOffline.asStateFlow()

    fun setOfflineStatus(offline: Boolean) {
        _isOffline.value = offline
        if (!offline) {
            syncPendingEntries()
        }
    }

    fun saveEntryLocally(content: String, authorKey: String, mood: String?, imageUri: String?) {
        CoroutineScope(Dispatchers.IO).launch {
            db.pendingEntryDao().insert(
                PendingEntry(content = content, authorKey = authorKey, mood = mood, imageUri = imageUri)
            )
        }
    }

    private fun syncPendingEntries() {
        CoroutineScope(Dispatchers.IO).launch {
            val pending = db.pendingEntryDao().getAllPending()
            for (entry in pending) {
                try {
                    var photoUrl: String? = null
                    
                    // Try to upload image if present
                    entry.imageUri?.let { uriString ->
                        val uri = android.net.Uri.parse(uriString)
                        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        if (bytes != null) {
                            val fileName = "${UUID.randomUUID()}.jpg"
                            val bucket = supabaseClient.storage.from(SupabaseConfig.PHOTOS_BUCKET)
                            bucket.upload(fileName, bytes)
                            photoUrl = bucket.publicUrl(fileName)
                        }
                    }

                    val journalEntry = JournalEntry(
                        authorKey = entry.authorKey,
                        content = entry.content.takeIf { it.isNotBlank() },
                        mood = entry.mood,
                        photoUrl = photoUrl
                    )
                    
                    supabaseClient.postgrest.from("entries").insert(journalEntry)
                    db.pendingEntryDao().deleteById(entry.id)
                } catch (e: Exception) {
                    // Still offline or error, stop sync
                    break
                }
            }
        }
    }
}
