package mx.agora.mobile.nativeapp.ui.util

import androidx.media3.exoplayer.ExoPlayer

object VideoPlaybackCoordinator {
    private val players = mutableMapOf<String, ExoPlayer>()
    private var activePostId: String? = null

    fun register(postId: String, player: ExoPlayer) {
        players[postId] = player
    }

    fun unregister(postId: String) {
        players.remove(postId)
        if (activePostId == postId) {
            activePostId = null
        }
    }

    fun requestPlay(postId: String) {
        if (activePostId != null && activePostId != postId) {
            players[activePostId]?.pause()
        }
        activePostId = postId
        players[postId]?.play()
    }

    fun pause(postId: String) {
        players[postId]?.pause()
        if (activePostId == postId) {
            activePostId = null
        }
    }
}
