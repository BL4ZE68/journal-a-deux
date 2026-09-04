package com.journaladeux.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.journaladeux.app.data.JournalEntry
import com.journaladeux.app.data.supabaseClient
import io.github.jan.supabase.postgrest.postgrest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryScreen() {
    var photos by remember { mutableStateOf<List<JournalEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedPhotoUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val response = supabaseClient.postgrest.from("entries")
                .select()
                .decodeList<JournalEntry>()
            photos = response.filter { it.photoUrl != null }.sortedByDescending { it.createdAt }
            isLoading = false
        } catch (e: Exception) {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Album Photos", style = MaterialTheme.typography.headlineMedium) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (photos.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Aucune photo pour le moment...", color = Color.White.copy(alpha = 0.5f))
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(
                    top = padding.calculateTopPadding() + 8.dp,
                    bottom = padding.calculateBottomPadding() + 8.dp,
                    start = 8.dp,
                    end = 8.dp
                ),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(photos) { entry ->
                    AsyncImage(
                        model = entry.photoUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedPhotoUrl = entry.photoUrl },
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }

        // Full screen viewer
        selectedPhotoUrl?.let { url ->
            AlertDialog(
                onDismissRequest = { selectedPhotoUrl = null },
                properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable { selectedPhotoUrl = null },
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = url,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .wrapContentHeight()
                            .padding(16.dp)
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Fit
                    )
                }
            }
        }
    }
}
