package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

type InjectorStatus struct {
	injected      bool
	injectedPID   int
	injectedAt    time.Time
	features      map[string]bool
	mu            sync.RWMutex
}

type Feature struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
}

type InjectRequest struct {
	ProcessName string `json:"processName"`
}

type InjectResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	PID     int    `json:"pid,omitempty"`
}

type FeatureRequest struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

type FeatureResponse struct {
	Success  bool      `json:"success"`
	Message  string    `json:"message"`
	Features []Feature `json:"features"`
}

func NewInjectorStatus() *InjectorStatus {
	return &InjectorStatus{
		injected:    false,
		injectedPID: 0,
		features:    make(map[string]bool),
	}
}

func (is *InjectorStatus) GetStatus() map[string]interface{} {
	is.mu.RLock()
	defer is.mu.RUnlock()

	features := make([]Feature, 0)
	for name, enabled := range is.features {
		var description string
		switch name {
		case "hwid_spoofer":
			description = "Spoofs hardware ID to prevent detection"
		case "anti_debug":
			description = "Prevents debuggers from attaching to the process"
		case "anti_dump":
			description = "Prevents memory dumping"
		default:
			description = "No description available"
		}

		features = append(features, Feature{
			Name:        name,
			Description: description,
			Enabled:     enabled,
		})
	}

	return map[string]interface{}{
		"injected":    is.injected,
		"injectedPID": is.injectedPID,
		"injectedAt":  is.injectedAt,
		"features":    features,
	}
}

func (is *InjectorStatus) HandleInject(w http.ResponseWriter, r *http.Request) {
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

	var req InjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if runtime.GOOS != "darwin" {
		response := InjectResponse{
			Success: false,
			Message: "Injection is only supported on macOS",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	cmd := exec.Command("pgrep", req.ProcessName)
	output, err := cmd.Output()
	if err != nil {
		response := InjectResponse{
			Success: false,
			Message: fmt.Sprintf("Process '%s' not found", req.ProcessName),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	pidStr := strings.TrimSpace(string(output))
	var pid int
	fmt.Sscanf(pidStr, "%d", &pid)

	log.Printf("Injecting into process %s (PID: %d)", req.ProcessName, pid)
	wsManager.BroadcastMessage(fmt.Sprintf("[System] Injecting into process %s (PID: %d)", req.ProcessName, pid))

	is.mu.Lock()
	is.injected = true
	is.injectedPID = pid
	is.injectedAt = time.Now()
	
	is.features["hwid_spoofer"] = true
	is.mu.Unlock()

	wsManager.BroadcastMessage(fmt.Sprintf("[System] Successfully injected into process %s (PID: %d)", req.ProcessName, pid))

	response := InjectResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully injected into process %s", req.ProcessName),
		PID:     pid,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (is *InjectorStatus) HandleFeatures(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !authManager.ValidateToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	if r.Method == http.MethodGet {
		is.mu.RLock()
		features := make([]Feature, 0)
		for name, enabled := range is.features {
			var description string
			switch name {
			case "hwid_spoofer":
				description = "Spoofs hardware ID to prevent detection"
			case "anti_debug":
				description = "Prevents debuggers from attaching to the process"
			case "anti_dump":
				description = "Prevents memory dumping"
			default:
				description = "No description available"
			}

			features = append(features, Feature{
				Name:        name,
				Description: description,
				Enabled:     enabled,
			})
		}
		is.mu.RUnlock()

		response := FeatureResponse{
			Success:  true,
			Message:  "Features retrieved successfully",
			Features: features,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	if r.Method == http.MethodPost {
		var req FeatureRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		is.mu.RLock()
		injected := is.injected
		is.mu.RUnlock()

		if !injected {
			response := FeatureResponse{
				Success: false,
				Message: "Not injected into any process",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		is.mu.Lock()
		is.features[req.Name] = req.Enabled
		
		features := make([]Feature, 0)
		for name, enabled := range is.features {
			var description string
			switch name {
			case "hwid_spoofer":
				description = "Spoofs hardware ID to prevent detection"
			case "anti_debug":
				description = "Prevents debuggers from attaching to the process"
			case "anti_dump":
				description = "Prevents memory dumping"
			default:
				description = "No description available"
			}

			features = append(features, Feature{
				Name:        name,
				Description: description,
				Enabled:     enabled,
			})
		}
		is.mu.Unlock()

		wsManager.BroadcastMessage(fmt.Sprintf("[System] Feature '%s' %s", req.Name, map[bool]string{true: "enabled", false: "disabled"}[req.Enabled]))

		response := FeatureResponse{
			Success:  true,
			Message:  fmt.Sprintf("Feature '%s' %s", req.Name, map[bool]string{true: "enabled", false: "disabled"}[req.Enabled]),
			Features: features,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
