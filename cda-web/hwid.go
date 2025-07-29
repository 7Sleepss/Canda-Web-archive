package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
)

type HWIDSpoofer struct {
	originalHWID string
	currentHWID  string
	spoofed      bool
	mu           sync.RWMutex
}

type SpoofRequest struct {
	CustomHWID string `json:"customHWID"`
}

type SpoofResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	OriginalHWID string `json:"originalHWID,omitempty"`
	CurrentHWID  string `json:"currentHWID,omitempty"`
}

func NewHWIDSpoofer() *HWIDSpoofer {
	hwid := &HWIDSpoofer{
		spoofed: false,
	}
	
	hwid.originalHWID = hwid.getSystemHWID()
	hwid.currentHWID = hwid.originalHWID
	
	return hwid
}

func (h *HWIDSpoofer) getSystemHWID() string {
	if runtime.GOOS != "darwin" {
		return "unknown-non-darwin"
	}
	
	cmd := exec.Command("ioreg", "-l", "|", "grep", "IOPlatformSerialNumber")
	output, err := cmd.Output()
	if err != nil {
		return "unknown-darwin"
	}
	
	serialLine := strings.TrimSpace(string(output))
	parts := strings.Split(serialLine, "\"")
	if len(parts) < 4 {
		return "unknown-darwin-format"
	}
	
	serial := parts[3]
	
	cmd = exec.Command("ifconfig", "en0", "|", "grep", "ether")
	output, err = cmd.Output()
	if err != nil {
		return serial
	}
	
	macLine := strings.TrimSpace(string(output))
	macParts := strings.Fields(macLine)
	if len(macParts) < 2 {
		return serial
	}
	
	mac := macParts[1]
	
	return fmt.Sprintf("%s-%s", serial, mac)
}

func (h *HWIDSpoofer) generateRandomHWID() string {
	serialBytes := make([]byte, 8)
	rand.Read(serialBytes)
	serial := hex.EncodeToString(serialBytes)
	
	macBytes := make([]byte, 6)
	rand.Read(macBytes)
	mac := fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x", macBytes[0], macBytes[1], macBytes[2], macBytes[3], macBytes[4], macBytes[5])
	
	return fmt.Sprintf("%s-%s", serial, mac)
}

func (h *HWIDSpoofer) GetCurrentHWID() map[string]interface{} {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	return map[string]interface{}{
		"originalHWID": h.originalHWID,
		"currentHWID":  h.currentHWID,
		"spoofed":      h.spoofed,
	}
}

func (h *HWIDSpoofer) HandleSpoofHWID(w http.ResponseWriter, r *http.Request) {
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
	
	var req SpoofRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if runtime.GOOS != "darwin" {
		response := SpoofResponse{
			Success: false,
			Message: "HWID spoofing is only supported on macOS",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	
	injectorStatus.mu.RLock()
	injected := injectorStatus.injected
	injectorStatus.mu.RUnlock()
	
	if !injected {
		response := SpoofResponse{
			Success: false,
			Message: "Not injected into any process",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	
	var newHWID string
	if req.CustomHWID != "" {
		newHWID = req.CustomHWID
	} else {
		newHWID = h.generateRandomHWID()
	}
	
	h.mu.Lock()
	h.currentHWID = newHWID
	h.spoofed = true
	originalHWID := h.originalHWID
	h.mu.Unlock()
	
	log.Printf("HWID spoofed from %s to %s", originalHWID, newHWID)
	wsManager.BroadcastMessage(fmt.Sprintf("[System] HWID spoofed successfully"))
	
	response := SpoofResponse{
		Success:     true,
		Message:     "HWID spoofed successfully",
		OriginalHWID: originalHWID,
		CurrentHWID:  newHWID,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
