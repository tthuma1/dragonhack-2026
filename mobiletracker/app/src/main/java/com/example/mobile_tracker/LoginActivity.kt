package com.example.mobile_tracker

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.mobile_tracker.data.SessionManager
import com.example.mobile_tracker.network.ApiClient
import com.example.mobile_tracker.network.SignInRequest
import com.example.mobile_tracker.network.SignUpRequest
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import android.widget.TextView
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private var isSignUpMode = false

    private lateinit var tilEmail: TextInputLayout
    private lateinit var tilConfirmPassword: TextInputLayout
    private lateinit var etUsername: TextInputEditText
    private lateinit var etEmail: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var etConfirmPassword: TextInputEditText
    private lateinit var tvError: TextView
    private lateinit var tvSubtitle: TextView
    private lateinit var btnSubmit: MaterialButton
    private lateinit var btnToggleMode: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (SessionManager.getToken(this) != null) {
            goToMain()
            return
        }

        setContentView(R.layout.activity_login)

        tilEmail = findViewById(R.id.tilEmail)
        tilConfirmPassword = findViewById(R.id.tilConfirmPassword)
        etUsername = findViewById(R.id.etUsername)
        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        tvError = findViewById(R.id.tvError)
        tvSubtitle = findViewById(R.id.tvSubtitle)
        btnSubmit = findViewById(R.id.btnSubmit)
        btnToggleMode = findViewById(R.id.btnToggleMode)

        btnSubmit.setOnClickListener { submit() }
        btnToggleMode.setOnClickListener { toggleMode() }

        etConfirmPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { submit(); true } else false
        }
        etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (!isSignUpMode && actionId == EditorInfo.IME_ACTION_DONE) { submit(); true } else false
        }
    }

    private fun toggleMode() {
        isSignUpMode = !isSignUpMode
        if (isSignUpMode) {
            tilEmail.visibility = View.VISIBLE
            tilConfirmPassword.visibility = View.VISIBLE
            tvSubtitle.setText(R.string.action_sign_up)
            btnSubmit.setText(R.string.action_sign_up)
            btnToggleMode.setText(R.string.toggle_to_sign_in)
            etPassword.imeOptions = EditorInfo.IME_ACTION_NEXT
        } else {
            tilEmail.visibility = View.GONE
            tilConfirmPassword.visibility = View.GONE
            tvSubtitle.setText(R.string.login_subtitle)
            btnSubmit.setText(R.string.action_sign_in)
            btnToggleMode.setText(R.string.toggle_to_sign_up)
            etPassword.imeOptions = EditorInfo.IME_ACTION_DONE
        }
        clearError()
    }

    private fun submit() {
        clearError()
        val username = etUsername.text?.toString()?.trim() ?: ""
        val password = etPassword.text?.toString() ?: ""

        if (username.isEmpty() || password.isEmpty()) {
            showError("Username and password are required")
            return
        }

        setLoading(true)

        if (isSignUpMode) {
            val email = etEmail.text?.toString()?.trim() ?: ""
            val confirm = etConfirmPassword.text?.toString() ?: ""
            if (email.isEmpty()) { showError("Email is required"); setLoading(false); return }
            if (password != confirm) { showError("Passwords do not match"); setLoading(false); return }

            lifecycleScope.launch {
                try {
                    ApiClient.service.signUp(SignUpRequest(username, email, password, confirm))
                    // Auto sign in after registration
                    val resp = ApiClient.service.signIn(SignInRequest(username, password))
                    SessionManager.saveSession(this@LoginActivity, resp.token, resp.pal_id_r)
                    goToMain()
                } catch (e: Exception) {
                    showError(e.message ?: "Sign up failed")
                    setLoading(false)
                }
            }
        } else {
            lifecycleScope.launch {
                try {
                    val resp = ApiClient.service.signIn(SignInRequest(username, password))
                    SessionManager.saveSession(this@LoginActivity, resp.token, resp.pal_id_r)
                    goToMain()
                } catch (e: Exception) {
                    showError(e.message ?: "Sign in failed")
                    setLoading(false)
                }
            }
        }
    }

    private fun goToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun showError(msg: String) {
        tvError.text = msg
        tvError.visibility = View.VISIBLE
    }

    private fun clearError() {
        tvError.visibility = View.GONE
    }

    private fun setLoading(loading: Boolean) {
        btnSubmit.isEnabled = !loading
        btnToggleMode.isEnabled = !loading
        etUsername.isEnabled = !loading
        etEmail.isEnabled = !loading
        etPassword.isEnabled = !loading
        etConfirmPassword.isEnabled = !loading
    }
}
