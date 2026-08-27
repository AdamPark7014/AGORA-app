package mx.agora.mobile.nativeapp.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface CacheDao {
    @Query("SELECT json FROM cache_entries WHERE `key` = :key LIMIT 1")
    suspend fun getJson(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(entry: CacheEntry)
}

@Dao
interface PendingPostDao {
    @Query("SELECT * FROM pending_posts ORDER BY createdAt ASC")
    suspend fun all(): List<PendingPostEntity>

    @Insert
    suspend fun insert(entity: PendingPostEntity): Long

    @Query("DELETE FROM pending_posts WHERE id = :id")
    suspend fun delete(id: Long)
}
