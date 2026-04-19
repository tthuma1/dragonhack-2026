package com.example.mobile_tracker.data

import android.content.Context
import android.content.SharedPreferences

object SessionManager {
    private const val PREFS_NAME = "session_prefs"
    private const val KEY_TOKEN = "token"
    private const val KEY_PAL_ID_R = "pal_id_r"
    private const val KEY_UPLOAD_COUNTER = "upload_counter"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveSession(context: Context, token: String, palIdR: String) {
        prefs(context).edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_PAL_ID_R, palIdR)
            .apply()
    }

    fun getToken(context: Context): String? = prefs(context).getString(KEY_TOKEN, null)

    fun getPalIdR(context: Context): String = prefs(context).getString(KEY_PAL_ID_R, "") ?: ""

    fun clearSession(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun nextUploadNumber(context: Context): Int {
        val p = prefs(context)
        val next = p.getInt(KEY_UPLOAD_COUNTER, 0) + 1
        p.edit().putInt(KEY_UPLOAD_COUNTER, next).apply()
        return next
    }
}
