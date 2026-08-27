package mx.agora.mobile.nativeapp.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cache_entries")
data class CacheEntry(
    @PrimaryKey val key: String,
    val json: String,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "pending_posts")
data class PendingPostEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val comunidadSlug: String,
    val texto: String,
    val mediaIdsJson: String = "[]",
    val encuestaJson: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)
