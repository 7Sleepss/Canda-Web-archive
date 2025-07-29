package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	lua "github.com/yuin/gopher-lua"
)

type ExecuteRequest struct {
	Script string `json:"script"`
}

type ExecuteResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

var (
	wsManager      *WebSocketManager
	portManager    *PortManager
	tcpPort        int
	authManager    *AuthManager
	injectorStatus *InjectorStatus
	hwid           *HWIDSpoofer
)

func executeLuaScript(script string) (string, error) {
	L := lua.NewState()
	defer L.Close()

	L.SetGlobal("print", L.NewFunction(func(L *lua.LState) int {
		args := make([]string, 0, L.GetTop())
		for i := 1; i <= L.GetTop(); i++ {
			args = append(args, L.Get(i).String())
		}
		for _, arg := range args {
			wsManager.BroadcastMessage(arg)
		}
		return 0
	}))

	err := L.DoString(script)
	if err != nil {
		return "", err
	}

	return "Script executed successfully", nil
}

func handleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !authManager.ValidateToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	output, err := executeLuaScript(req.Script)
	resp := ExecuteResponse{Output: output}

	if err != nil {
		resp.Error = err.Error()
		wsManager.BroadcastMessage("[Error] " + err.Error())
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func getPortStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"port":           portManager.GetCurrentPort(),
		"status":         portManager.GetStatus(),
		"tcpPort":        tcpPort,
		"injectorStatus": injectorStatus.GetStatus(),
		"hwid":           hwid.GetCurrentHWID(),
	})
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleTCPConnection(conn net.Conn) {
	defer conn.Close()

	clientAddr := conn.RemoteAddr().String()
	log.Printf("TCP client connected: %s", clientAddr)
	wsManager.BroadcastMessage(fmt.Sprintf("[System] TCP client connected: %s", clientAddr))

	conn.Write([]byte("Connected to Canda executor TCP server\n"))

	buffer := make([]byte, 1024)

	for {
		conn.SetReadDeadline(time.Now().Add(1 * time.Hour))

		n, err := conn.Read(buffer)
		if err != nil {
			if err == io.EOF {
				log.Printf("TCP client disconnected: %s", clientAddr)
				wsManager.BroadcastMessage(fmt.Sprintf("[System] TCP client disconnected: %s", clientAddr))
			} else {
				log.Printf("Error reading from TCP client: %v", err)
				wsManager.BroadcastMessage(fmt.Sprintf("[Error] TCP read error: %v", err))
			}
			break
		}

		data := string(buffer[:n])
		data = strings.TrimSpace(data)

		log.Printf("Received from TCP client: %s", data)
		wsManager.BroadcastMessage(fmt.Sprintf("[TCP] %s", data))

		if strings.HasPrefix(data, "EXEC:") {
			script := strings.TrimPrefix(data, "EXEC:")
			output, err := executeLuaScript(script)

			if err != nil {
				conn.Write([]byte(fmt.Sprintf("Error: %v\n", err)))
				wsManager.BroadcastMessage(fmt.Sprintf("[Error] %v", err))
			} else {
				conn.Write([]byte(fmt.Sprintf("Success: %s\n", output)))
				wsManager.BroadcastMessage(fmt.Sprintf("[Execution] %s", output))
			}
		} else {
			conn.Write([]byte(fmt.Sprintf("Echo: %s\n", data)))
		}
	}
}

func startTCPServer(port int) {
	tcpPort = port
	addr := fmt.Sprintf(":%d", port)

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Printf("Failed to start TCP server: %v", err)
		return
	}

	log.Printf("TCP server started on port %d", port)
	wsManager.BroadcastMessage(fmt.Sprintf("[System] TCP server started on port %d", port))

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				log.Printf("Error accepting TCP connection: %v", err)
				continue
			}

			go handleTCPConnection(conn)
		}
	}()
}

func main() {
	portManager = NewPortManager([]int{8080, 8081, 8082, 8083, 8084})
	selectedPort, err := portManager.FindAvailablePort()
	if err != nil {
		log.Fatalf("Failed to find available port: %v", err)
	}

	wsManager = NewWebSocketManager()
	authManager = NewAuthManager()
	injectorStatus = NewInjectorStatus()
	hwid = NewHWIDSpoofer()

	http.HandleFunc("/ws", wsManager.HandleWebSocket)
	http.HandleFunc("/execute", handleExecute)
	http.HandleFunc("/port-status", getPortStatus)
	http.HandleFunc("/register", authManager.HandleRegister)
	http.HandleFunc("/login", authManager.HandleLogin)
	http.HandleFunc("/inject", injectorStatus.HandleInject)
	http.HandleFunc("/spoof-hwid", hwid.HandleSpoofHWID)
	http.HandleFunc("/features", injectorStatus.HandleFeatures)

	corsHandler := enableCORS(http.DefaultServeMux)

	startTCPServer(9000)

	addr := ":" + selectedPort
	log.Printf("Canda executor HTTP server starting on %s", addr)

	wsManager.BroadcastMessage("[System] HTTP server started on port " + selectedPort)

	portManager.SetStatus(PortStatusConnected)

	if err := http.ListenAndServe(addr, corsHandler); err != nil {
		log.Fatalf("Error starting server: %v", err)
		portManager.SetStatus(PortStatusFailed)
	}
}
