package com.journaladeux.app.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.journaladeux.app.util.NetworkObserver
import com.journaladeux.app.data.OfflineManager
import androidx.compose.ui.text.style.TextAlign
import coil.compose.AsyncImage
import com.journaladeux.app.data.AppConfig
import com.journaladeux.app.data.JournalEntry
import com.journaladeux.app.data.SupabaseConfig
import com.journaladeux.app.data.supabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen(initialSharedImageUri: Uri? = null) {
    val context = LocalContext.current
    var entries by remember { mutableStateOf<List<JournalEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var currentAuthorKey by remember { mutableStateOf("a") }

    val networkObserver = remember { NetworkObserver(context) }
    val networkStatus by networkObserver.observe.collectAsState(initial = NetworkObserver.Status.Available)
    val isOffline = networkStatus != NetworkObserver.Status.Available

    val offlineManager = remember { OfflineManager(context) }
    
    LaunchedEffect(isOffline) {
        offlineManager.setOfflineStatus(isOffline)
    }

    val scope = rememberCoroutineScope()

    suspend fun refreshEntries() {
        try {
            val response = supabaseClient.postgrest.from("entries")
                .select(columns = io.github.jan.supabase.postgrest.query.Columns.raw("*, reactions(*)"))
                .decodeList<JournalEntry>()
            entries = response.sortedByDescending { it.createdAt }
        } catch (e: Exception) {
            errorMessage = e.message
        }
    }

    // Fetch initial entries
    LaunchedEffect(Unit) {
        isLoading = true
        refreshEntries()
        isLoading = false
        
        val channel = supabaseClient.channel("journal-channel")
        
        channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = "entries"
        }.onEach { refreshEntries() }.launchIn(this)

        channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = "reactions"
        }.onEach { refreshEntries() }.launchIn(this)
        
        channel.subscribe()
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            AppConfig.JOURNAL_TITLE,
                            style = MaterialTheme.typography.headlineMedium
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = MaterialTheme.colorScheme.onSurface
                    )
                )
                if (isOffline) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "Mode hors-ligne - Les messages seront synchronisés plus tard",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(vertical = 4.dp, horizontal = 16.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            EntryComposer(
                initialAuthorKey = currentAuthorKey,
                initialImageUri = initialSharedImageUri,
                isOffline = isOffline,
                offlineManager = offlineManager,
                onAuthorChanged = { currentAuthorKey = it },
                onEntryPosted = {
                    // Real-time will handle the update
                }
            )
            
            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), thickness = 0.5.dp)
            
            if (isLoading && entries.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (errorMessage != null && entries.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Erreur: $errorMessage", color = MaterialTheme.colorScheme.error)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(entries, key = { it.id ?: it.hashCode() }) { entry ->
                        TimelineItem(entry = entry, currentAuthorKey = currentAuthorKey)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryComposer(
    initialAuthorKey: String,
    initialImageUri: Uri? = null,
    isOffline: Boolean = false,
    offlineManager: OfflineManager? = null,
    onAuthorChanged: (String) -> Unit,
    onEntryPosted: () -> Unit
) {
    var content by remember { mutableStateOf("") }
    var authorKey by remember { mutableStateOf(initialAuthorKey) }
    var selectedMood by remember { mutableStateOf<String?>(null) }
    var selectedImageUri by remember { mutableStateOf(initialImageUri) }
    var isPosting by remember { mutableStateOf(false) }

    LaunchedEffect(initialAuthorKey) {
        authorKey = initialAuthorKey
    }
    
    LaunchedEffect(initialImageUri) {
        if (initialImageUri != null) {
            selectedImageUri = initialImageUri
        }
    }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
    }

    Card(
        modifier = Modifier
            .padding(16.dp)
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF6EDDC), // Paper color
            contentColor = Color(0xFF2A2138)    // Ink color
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Author selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AppConfig.AUTHORS.forEach { (key, info) ->
                    FilterChip(
                        selected = authorKey == key,
                        onClick = {
                            authorKey = key
                            onAuthorChanged(key)
                        },
                        label = { Text(info.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = info.color,
                            selectedLabelColor = Color.White,
                            containerColor = Color.Transparent,
                            labelColor = Color(0xFF2A2138).copy(alpha = 0.5f)
                        ),
                        border = null
                    )
                }
            }

            // Mood selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AppConfig.MOODS.forEach { mood ->
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(
                                if (selectedMood == mood) MaterialTheme.colorScheme.primaryContainer
                                else Color.Transparent
                            )
                            .clickable {
                                selectedMood = if (selectedMood == mood) null else mood
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(mood, fontSize = 20.sp)
                    }
                }
            }

            // Text input
            TextField(
                value = content,
                onValueChange = { content = it },
                placeholder = { Text("Un mot doux, une pensée...", color = Color(0xFF2A2138).copy(alpha = 0.35f)) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isPosting,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.White.copy(alpha = 0.6f),
                    unfocusedContainerColor = Color.White.copy(alpha = 0.6f),
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor = Color(0xFF2A2138),
                    unfocusedTextColor = Color(0xFF2A2138)
                ),
                shape = RoundedCornerShape(8.dp)
            )
            
            // Image preview
            selectedImageUri?.let { uri ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(8.dp))
                ) {
                    AsyncImage(
                        model = uri,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    IconButton(
                        onClick = { selectedImageUri = null },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                            .size(24.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Supprimer", tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(
                    onClick = { photoPickerLauncher.launch("image/*") },
                    enabled = !isPosting
                ) {
                    Icon(
                        Icons.Default.AddPhotoAlternate,
                        contentDescription = "Ajouter une photo",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }

                Button(
                    onClick = {
                        if (content.isNotBlank() || selectedImageUri != null) {
                            scope.launch {
                                isPosting = true
                                try {
                                    if (isOffline) {
                                        offlineManager?.saveEntryLocally(
                                            content = content,
                                            authorKey = authorKey,
                                            mood = selectedMood,
                                            imageUri = selectedImageUri?.toString()
                                        )
                                        // Reset fields
                                        content = ""
                                        selectedMood = null
                                        selectedImageUri = null
                                        onEntryPosted()
                                    } else {
                                        var photoUrl: String? = null

                                        // Upload photo if selected
                                        selectedImageUri?.let { uri ->
                                            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                                            if (bytes != null) {
                                                val fileName = "${UUID.randomUUID()}.jpg"
                                                val bucket = supabaseClient.storage.from(SupabaseConfig.PHOTOS_BUCKET)
                                                bucket.upload(fileName, bytes)
                                                photoUrl = bucket.publicUrl(fileName)
                                            }
                                        }

                                        val entry = JournalEntry(
                                            authorKey = authorKey,
                                            content = content.takeIf { it.isNotBlank() },
                                            mood = selectedMood,
                                            photoUrl = photoUrl
                                        )
                                        supabaseClient.postgrest.from("entries").insert(entry)

                                        // Reset fields
                                        content = ""
                                        selectedMood = null
                                        selectedImageUri = null
                                        onEntryPosted()
                                    }
                                } catch (e: Exception) {
                                    // Fallback to offline
                                    offlineManager?.saveEntryLocally(
                                        content = content,
                                        authorKey = authorKey,
                                        mood = selectedMood,
                                        imageUri = selectedImageUri?.toString()
                                    )
                                    content = ""
                                    selectedMood = null
                                    selectedImageUri = null
                                    onEntryPosted()
                                } finally {
                                    isPosting = false
                                }
                            }
                        }
                    },
                    enabled = (content.isNotBlank() || selectedImageUri != null) && !isPosting,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2A2138),
                        contentColor = Color(0xFFF6EDDC),
                        disabledContainerColor = Color(0xFF2A2138).copy(alpha = 0.3f)
                    )
                ) {
                    if (isPosting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Publier")
                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}
