package mx.agora.mobile.nativeapp.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CacheEntry::class, PendingPostEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AgoraDatabase : RoomDatabase() {
    abstract fun cacheDao(): CacheDao
    abstract fun pendingPostDao(): PendingPostDao
}
