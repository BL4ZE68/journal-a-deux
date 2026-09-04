package com.journaladeux.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.journaladeux.app.ui.GateScreen
import com.journaladeux.app.ui.JournalScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val sharedPref = getPreferences(Context.MODE_PRIVATE)
        val isInitiallyUnlocked = sharedPref.getBoolean("is_unlocked", false)

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var isUnlocked by remember { mutableStateOf(isInitiallyUnlocked) }
                    
                    if (isUnlocked) {
                        JournalScreen()
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
