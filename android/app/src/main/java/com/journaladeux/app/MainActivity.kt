package com.journaladeux.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Collections
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.journaladeux.app.ui.GalleryScreen
import com.journaladeux.app.ui.GateScreen
import com.journaladeux.app.ui.JournalScreen
import com.journaladeux.app.ui.theme.JournalTheme

import android.content.Intent
import android.net.Uri

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        // S'abonner aux notifications pour recevoir les nouveaux messages du partenaire
        com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic("journal_updates")

        val sharedPref = getPreferences(Context.MODE_PRIVATE)
        val isInitiallyUnlocked = sharedPref.getBoolean("is_unlocked", false)

        // Handle shared image
        var sharedImageUri by mutableStateOf<Uri?>(null)
        if (intent?.action == Intent.ACTION_SEND && intent.type?.startsWith("image/") == true) {
            (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let {
                sharedImageUri = it
            }
        }

        setContent {
            JournalTheme {
                var isUnlocked by remember { mutableStateOf(isInitiallyUnlocked) }
                var currentScreen by remember { mutableStateOf("journal") }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (isUnlocked) {
                        Scaffold(
                            bottomBar = {
                                NavigationBar(
                                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                                    contentColor = MaterialTheme.colorScheme.primary
                                ) {
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.EditNote, contentDescription = null) },
                                        label = { Text("Journal") },
                                        selected = currentScreen == "journal",
                                        onClick = { currentScreen = "journal" }
                                    )
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.Collections, contentDescription = null) },
                                        label = { Text("Photos") },
                                        selected = currentScreen == "gallery",
                                        onClick = { currentScreen = "gallery" }
                                    )
                                }
                            }
                        ) { padding ->
                            Box(modifier = Modifier.padding(padding)) {
                                if (currentScreen == "journal") {
                                    JournalScreen(initialSharedImageUri = sharedImageUri)
                                } else {
                                    GalleryScreen()
                                }
                            }
                        }
                    } else {
                        GateScreen(onUnlocked = {
                            isUnlocked = true
                            with(sharedPref.edit()) {
                                putBoolean("is_unlocked", true)
                                apply()
                            }
                        })
                    }
                }
            }
        }
    }
}
