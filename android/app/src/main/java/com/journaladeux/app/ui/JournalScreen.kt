package com.journaladeux.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.journaladeux.app.data.JournalEntry
import com.journaladeux.app.data.supabaseClient
import io.github.jan_tennert.supabase.postgrest.postgrest
import io.github.jan_tennert.supabase.realtime.Realtime
import io.github.jan_tennert.supabase.realtime.channel
import io.github.jan_tennert.supabase.realtime.postgresChangeFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen() {
    var entries by remember { mutableStateOf<List<JournalEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val scope = rememberCoroutineScope()

    // Fetch initial entries
    LaunchedEffect(Unit) {
        try {
            val response = supabaseClient.postgrest.from("entries")
                .select()
                .decodeList<JournalEntry>()
            entries = response.sortedByDescending { it.createdAt }
            isLoading = false
        } catch (e: Exception) {
            errorMessage = e.message
            isLoading = false
        }
        
        // Subscribe to real-time changes
        val channel = supabaseClient.channel("entries-channel")
        val changeFlow = channel.postgresChangeFlow<JournalEntry>(schema = "public") {
            table = "entries"
        }
        
        changeFlow.onEach { change ->
            // In a real app, we might want to handle INSERT, UPDATE, DELETE specifically
            // For simplicity, let's just refetch or update the list
            val response = supabaseClient.postgrest.from("entries")
                .select()
                .decodeList<JournalEntry>()
            entries = response.sortedByDescending { it.createdAt }
        }.launchIn(this)
        
        channel.subscribe()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Journal à deux") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            EntryComposer(onEntryPosted = {
                // Real-time will handle the update
            })
            
            HorizontalDivider()
            
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (errorMessage != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Erreur: $errorMessage", color = MaterialTheme.colorScheme.error)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    items(entries) { entry ->
                        TimelineItem(entry = entry)
                    }
                }
            }
        }
    }
}

@Composable
fun EntryComposer(onEntryPosted: () -> Unit) {
    var content by remember { mutableStateOf("") }
    var authorKey by remember { mutableStateOf("a") } // 'a' or 'b' according to SQL schema
    var isPosting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

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
            FilterChip(
                selected = authorKey == "a",
                onClick = { authorKey = "a" },
                label = { Text("Moi") }
            )
            FilterChip(
                selected = authorKey == "b",
                onClick = { authorKey = "b" },
                label = { Text("Toi") }
            )
        }
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextField(
                value = content,
                onValueChange = { content = it },
                placeholder = { Text("Quoi de neuf ?") },
                modifier = Modifier.weight(1f),
                enabled = !isPosting
            )
            
            IconButton(
                onClick = {
                    if (content.isNotBlank()) {
                        scope.launch {
                            isPosting = true
                            try {
                                val entry = JournalEntry(
                                    authorKey = authorKey,
                                    content = content
                                )
                                supabaseClient.postgrest.from("entries").insert(entry)
                                content = ""
                                onEntryPosted()
                            } catch (e: Exception) {
                                // Handle error
                            } finally {
                                isPosting = false
                            }
                        }
                    }
                },
                enabled = content.isNotBlank() && !isPosting
            ) {
                if (isPosting) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    Icon(Icons.Default.Send, contentDescription = "Envoyer")
                }
            }
        }
    }
}
