package mx.agora.mobile.nativeapp.data

import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MediaUploadResponse
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class MediaRepository(private val context: Context) {
    suspend fun subir(uri: Uri, tokenProvider: () -> String?): MediaUploadResponse =
        withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            val mime = resolver.getType(uri) ?: "image/jpeg"
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw IllegalStateException("No se pudo leer el archivo.")

            val esVideo = mime.startsWith("video/")
            val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime)
                ?: if (esVideo) "mp4" else "jpg"
            val nombre = if (esVideo) "video.$extension" else "foto.$extension"
            val part = MultipartBody.Part.createFormData(
                "archivo",
                nombre,
                bytes.toRequestBody(mime.toMediaTypeOrNull()),
            )

            ApiClient.api<mx.agora.mobile.nativeapp.data.api.MediaApi>(tokenProvider).subir(part)
        }
}
