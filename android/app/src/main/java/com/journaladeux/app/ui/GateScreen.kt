package com.journaladeux.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.journaladeux.app.data.SupabaseConfig

@Composable
fun GateScreen(onUnlocked: () -> Unit) {
    var passcode by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Journal à deux",
            style = MaterialTheme.typography.headlineMedium
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        TextField(
            value = passcode,
            onValueChange = { 
                passcode = it
                error = false
            },
            label = { Text("Code d'accès") },
            visualTransformation = PasswordVisualTransformation(),
            isError = error,
            modifier = Modifier.fillMaxWidth()
        )
        
        if (error) {
            Text(
                text = "Code incorrect",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = {
                if (passcode == SupabaseConfig.PASSCODE) {
                    onUnlocked()
                } else {
                    error = true
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Valider")
        }
    }
}
