package com.tsos.app.data.socket

import android.util.Log
import com.tsos.app.data.api.RetrofitClient
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocketManager @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private var socket: Socket? = null
    private val listeners = mutableMapOf<String, MutableList<Emitter.Listener>>()

    fun connect() {
        try {
            val baseUrl = retrofitClient.getBaseUrl()
            socket = IO.socket(baseUrl)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d("SocketManager", "Connected")
            }
            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d("SocketManager", "Disconnected")
            }
            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e("SocketManager", "Connection error: ${args.firstOrNull()}")
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e("SocketManager", "Connect failed", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun joinLocation(locationId: String) {
        socket?.emit("join_location", locationId)
    }

    fun leaveLocation(locationId: String) {
        socket?.emit("leave_location", locationId)
    }

    fun on(event: String, listener: Emitter.Listener) {
        listeners.getOrPut(event) { mutableListOf() }.add(listener)
        socket?.on(event, listener)
    }

    fun off(event: String) {
        listeners[event]?.forEach { socket?.off(event, it) }
        listeners.remove(event)
    }

    fun offAll() {
        listeners.forEach { (event, list) ->
            list.forEach { socket?.off(event, it) }
        }
        listeners.clear()
    }
}
