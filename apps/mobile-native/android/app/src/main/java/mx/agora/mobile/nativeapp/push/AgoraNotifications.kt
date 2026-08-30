package mx.agora.mobile.nativeapp.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import mx.agora.mobile.nativeapp.MainActivity
import mx.agora.mobile.nativeapp.R
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkParser

object AgoraNotifications {
    const val CHANNEL_DEFAULT = "agora_default"

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_DEFAULT,
            "Ágora",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Notificaciones de actividad en Ágora" }
        nm.createNotificationChannel(channel)
    }

    fun show(
        context: Context,
        title: String?,
        body: String?,
        data: Map<String, String> = emptyMap(),
        notificationId: Int = System.currentTimeMillis().toInt(),
    ) {
        ensureChannels(context)
        val url = resolveDeepLinkUrl(data)
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!url.isNullOrBlank()) {
                setData(DeepLinkParser.toAgoraUri(url))
                putExtra("agora_url", url)
            }
            data.forEach { (k, v) ->
                if (k != "url") putExtra("agora_$k", v)
            }
        }
        val pending = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(context, CHANNEL_DEFAULT)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(context, R.color.agora_notification))
            .setContentTitle(title ?: "Ágora")
            .setContentText(body ?: "")
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        if (!body.isNullOrBlank()) {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }
        try {
            androidx.core.app.NotificationManagerCompat.from(context)
                .notify(notificationId, builder.build())
        } catch (_: SecurityException) {
            // Sin permiso POST_NOTIFICATIONS en Android 13+.
        }
    }

    /**
     * Respeta `url` del payload (p. ej. RETO → `/retos`).
     * INSIGNIA y `/perfil/mio` abren la pestaña «Yo», no un handle literal «mio».
     */
    private fun resolveDeepLinkUrl(data: Map<String, String>): String? {
        val raw = data["url"]?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        if (data["tipo"] == "INSIGNIA") return "/perfil-yo"
        if (raw.contains("/perfil/mio", ignoreCase = true) ||
            raw.equals("agora://perfil/mio", ignoreCase = true) ||
            raw.equals("agora://perfil-yo", ignoreCase = true)
        ) {
            return "/perfil-yo"
        }
        return raw
    }
}
