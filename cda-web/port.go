package main

import (
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"
)

type PortStatus string

const (
	PortStatusConnecting PortStatus = "connecting"
	PortStatusConnected  PortStatus = "connected"
	PortStatusFailed     PortStatus = "failed"
)

type PortManager struct {
	availablePorts []int
	currentPort    string
	status         PortStatus
	mu             sync.RWMutex
}

func NewPortManager(ports []int) *PortManager {
	return &PortManager{
		availablePorts: ports,
		status:         PortStatusConnecting,
	}
}

func (pm *PortManager) FindAvailablePort() (string, error) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for _, port := range pm.availablePorts {
		portStr := strconv.Itoa(port)
		
		fmt.Printf("Trying to connect to port %s\n", portStr)
		
		if pm.isPortAvailable(port) {
			pm.currentPort = portStr
			pm.status = PortStatusConnected
			
			fmt.Printf("Successfully connected to port %s\n", portStr)
			
			return portStr, nil
		}
	}

	pm.status = PortStatusFailed
	return "", fmt.Errorf("no available ports found")
}

func (pm *PortManager) isPortAvailable(port int) bool {
	address := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", address)
	
	if err != nil {
		return false
	}
	
	listener.Close()
	
	time.Sleep(100 * time.Millisecond)
	
	return true
}

func (pm *PortManager) GetCurrentPort() string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.currentPort
}

func (pm *PortManager) GetStatus() string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return string(pm.status)
}

func (pm *PortManager) SetStatus(status PortStatus) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.status = status
}
