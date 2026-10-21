# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

-if interface *
-keep,allowobfuscation interface <1>

-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keep,allowobfuscation,allowshrinking class retrofit2.Response

# Moshi
-keepclasseswithmembers class * {
    @com.squareup.moshi.* <methods>;
}
-keep @com.squareup.moshi.JsonQualifier interface *
-keepclassmembers @com.squareup.moshi.JsonClass class * extends java.lang.Enum {
    <fields>;
    **[] values();
}
-keepnames @com.squareup.moshi.JsonClass class *
-keep class **JsonAdapter {
    <init>(...);
    <fields>;
}

-keepclassmembers class mx.agora.mobile.nativeapp.data.api.** {
    <init>(...);
    <fields>;
}

# Kotlin metadata for reflection adapters
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# security-crypto empaqueta Tink, que resuelve sus primitivas por reflexión
# sobre protobuf. Si R8 recorta ahí, EncryptedSharedPreferences revienta al
# abrir la sesión: crash al arranque, solo en release (lección de NEXARA).
-keep class androidx.security.crypto.** { *; }
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
-dontwarn com.google.protobuf.**
