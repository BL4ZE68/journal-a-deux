package com.journaladeux.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

@Entity(tableName = "pending_entries")
data class PendingEntry(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val content: String,
    val authorKey: String,
    val mood: String?,
    val imageUri: String?, // Store URI as string
    val timestamp: Long = System.currentTimeMillis()
)

@Dao
interface PendingEntryDao {
    @Insert
    suspend fun insert(entry: PendingEntry)

    @Query("SELECT * FROM pending_entries ORDER BY timestamp ASC")
    suspend fun getAllPending(): List<PendingEntry>

    @Query("DELETE FROM pending_entries WHERE id = :id")
    suspend fun deleteById(id: Int)
}

@Database(entities = [PendingEntry::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingEntryDao(): PendingEntryDao
}
