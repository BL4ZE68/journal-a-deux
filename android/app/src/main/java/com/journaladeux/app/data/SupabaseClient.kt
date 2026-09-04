package com.journaladeux.app.data

import io.github. jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseConfig {
    const val URL = "https://uvmqrzpwophdufzksbrp.supabase.co"
    const val ANON_KEY = "sb_publishable_q9Efc9I4-J0j9erOU0478g_WTwv8xpQ"
    const val PASSCODE = "notrejournal"
    const val PHOTOS_BUCKET = "journal-photos"
}

val supabaseClient = createSupabaseClient(
    supabaseUrl = SupabaseConfig.URL,
    supabaseKey = SupabaseConfig.ANON_KEY
) {
    install(Postgrest)
    install(Realtime)
    install(Storage)
}
