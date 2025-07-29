package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	manager   *WebSocketManager
	mu        sync.Mutex
	connected bool
}

type WebSocketManager struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mu         sync.Mutex
	upgrader   websocket.Upgrader
}

func NewWebSocketManager() *WebSocketManager {
	manager := &WebSocketManager{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}

	go manager.run()
	return manager
}

func (manager *WebSocketManager) run() {
	for {
		select {
		case client := <-manager.register:
			manager.mu.Lock()
			manager.clients[client] = true
			manager.mu.Unlock()
			log.Printf("Client connected: %s", client.conn.RemoteAddr())

			client.send <- []byte("[System] Connected to Canda executor")

			if portManager != nil {
				client.send <- []byte("[System] Connected on port: " + portManager.GetCurrentPort())
			}

		case client := <-manager.unregister:
			manager.mu.Lock()
			if _, ok := manager.clients[client]; ok {
				delete(manager.clients, client)
				close(client.send)
				log.Printf("Client disconnected: %s", client.conn.RemoteAddr())
			}
			manager.mu.Unlock()

		case message := <-manager.broadcast:
			manager.mu.Lock()
			for client := range manager.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(manager.clients, client)
				}
			}
			manager.mu.Unlock()
		}
	}
}

func (manager *WebSocketManager) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := manager.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading connection: %v", err)
		return
	}

	client := &Client{
		conn:      conn,
		send:      make(chan []byte, 256),
		manager:   manager,
		connected: true,
	}

	manager.register <- client

	go client.readPump()
	go client.writePump()
}

func (manager *WebSocketManager) BroadcastMessage(message string) {
	manager.broadcast <- []byte(message)
}

func (manager *WebSocketManager) GetClientCount() int {
	manager.mu.Lock()
	defer manager.mu.Unlock()
	return len(manager.clients)
}

func (client *Client) readPump() {
	defer func() {
		client.manager.unregister <- client
		client.conn.Close()
		client.mu.Lock()
		client.connected = false
		client.mu.Unlock()
	}()

	client.conn.SetReadLimit(512 * 1024)
	client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := client.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Error reading message: %v", err)
			}
			break
		}
	}
}

func (client *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(client.send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-client.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
