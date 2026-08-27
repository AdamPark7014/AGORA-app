package mx.agora.mobile.nativeapp.data.realtime

data class MensajeStreamEventDto(
    val tipo: String,
    val mensaje: MensajeStreamPayloadDto? = null,
)

data class MensajeStreamPayloadDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val autorId: String,
    val autor: MensajeStreamAutorDto? = null,
)

data class MensajeStreamAutorDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
)
