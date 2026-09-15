package com.tsos.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.socket.SocketManager
import com.tsos.app.ui.navigation.AppNavGraph
import com.tsos.app.ui.theme.TSOSTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var socketManager: SocketManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        runBlocking {
            authRepository.initBaseUrl()
        }

        val isLoggedIn = runBlocking { authRepository.isLoggedIn() }

        setContent {
            TSOSTheme {
                var loggedIn by remember { mutableStateOf(isLoggedIn) }

                AppNavGraph(
                    startDestination = if (loggedIn) "dashboard" else "login",
                    onLogout = {
                        socketManager.disconnect()
                        runBlocking { authRepository.logout() }
                        loggedIn = false
                    }
                )

                LaunchedEffect(loggedIn) {
                    if (loggedIn) {
                        socketManager.connect()
                    }
                }
            }
        }
    }
}
