import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

fun localProp(name: String): String? =
    localProperties.getProperty(name)?.trim()?.takeIf { it.isNotEmpty() }

val releaseApiBaseUrl: String =
    (project.findProperty("API_BASE_URL") as String?)?.trim()
        ?: "https://udlagora.com/api"

/**
 * Versión de la app: `-PVERSION_CODE=N -PVERSION_NAME=X.Y.Z` (flujo «Android · Play»).
 * En local queda 1 / 1.0.0. Cada subida a Play necesita un versionCode mayor.
 */
val declaredVersionCode: Int =
    (project.findProperty("VERSION_CODE") as String?)?.trim()?.toIntOrNull() ?: 1
val declaredVersionName: String =
    (project.findProperty("VERSION_NAME") as String?)?.trim()?.takeIf { it.isNotEmpty() } ?: "1.0.0"

/**
 * Llave de subida de Play: por variables de entorno (el flujo «Android · Play» las
 * toma de los secretos del repo) o por local.properties (RELEASE_STORE_FILE…).
 * Sin llave, el release sale sin firmar (sirve para probar R8).
 */
fun firmaProp(env: String, local: String): String? =
    System.getenv(env)?.trim()?.takeIf { it.isNotEmpty() } ?: localProp(local)

val releaseStorePath: String? = firmaProp("AGORA_KEYSTORE_PATH", "RELEASE_STORE_FILE")

android {
    namespace = "mx.agora.mobile.nativeapp"
    compileSdk = 36

    defaultConfig {
        applicationId = "mx.agora.mobile.nativeapp"
        minSdk = 24
        targetSdk = 36
        versionCode = declaredVersionCode
        versionName = declaredVersionName
        manifestPlaceholders["usesCleartextTraffic"] = "false"
    }

    signingConfigs {
        create("release") {
            if (releaseStorePath != null) {
                storeFile = rootProject.file(releaseStorePath)
                storePassword = firmaProp("AGORA_KEYSTORE_PASSWORD", "RELEASE_STORE_PASSWORD")
                keyAlias = firmaProp("AGORA_KEY_ALIAS", "RELEASE_KEY_ALIAS")
                keyPassword = firmaProp("AGORA_KEY_PASSWORD", "RELEASE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            // Emulador Android → localhost del host de desarrollo. Para probar el
            // debug contra produccion: -PDEBUG_API_BASE_URL=https://udlagora.com/api
            val apiDebug = (project.findProperty("DEBUG_API_BASE_URL") as String?)?.trim()
                ?.takeIf { it.isNotEmpty() } ?: "http://10.0.2.2:4200/api"
            buildConfigField("String", "API_BASE_URL", "\"$apiDebug\"")
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBaseUrl\"")
            if (releaseStorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("com.google.android.material:material:1.12.0")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.compose.material3:material3:1.3.2")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("io.coil-kt:coil-compose:2.7.0")

    implementation("androidx.navigation:navigation-compose:2.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging-ktx")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.2")

    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")

    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
