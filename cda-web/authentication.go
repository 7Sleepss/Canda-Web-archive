package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type User struct {
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	LastLogin    time.Time `json:"lastLogin"`
}

type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"userId"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type RegisterRequest struct {
	Username        string `json:"username"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	AcceptTOS       bool   `json:"acceptTOS"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	User    *User  `json:"user,omitempty"`
}

type AuthManager struct {
	users    map[string]*User
	sessions map[string]*Session
	mu       sync.RWMutex
}

func NewAuthManager() *AuthManager {
	return &AuthManager{
		users:    make(map[string]*User),
		sessions: make(map[string]*Session),
	}
}

func (am *AuthManager) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response := &AuthResponse{Success: false}

	if len(req.Username) < 3 || len(req.Username) > 20 {
		response.Message = "Username must be between 3 and 20 characters"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		response.Message = "Invalid email address"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	if len(req.Password) < 8 {
		response.Message = "Password must be at least 8 characters"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	if req.Password != req.ConfirmPassword {
		response.Message = "Passwords do not match"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	if !req.AcceptTOS {
		response.Message = "You must accept the Terms of Service"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	am.mu.Lock()
	defer am.mu.Unlock()

	if _, exists := am.users[strings.ToLower(req.Username)]; exists {
		response.Message = "Username already taken"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	for _, user := range am.users {
		if strings.EqualFold(user.Email, req.Email) {
			response.Message = "Email already registered"
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	passwordHash := hashPassword(req.Password)
	user := &User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
		LastLogin:    time.Now(),
	}

	am.users[strings.ToLower(req.Username)] = user

	token := generateToken()
	session := &Session{
		Token:     token,
		UserID:    strings.ToLower(req.Username),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	am.sessions[token] = session

	response.Success = true
	response.Message = "Registration successful"
	response.Token = token
	response.User = &User{
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
		LastLogin: user.LastLogin,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (am *AuthManager) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response := &AuthResponse{Success: false}

	am.mu.RLock()
	user, exists := am.users[strings.ToLower(req.Username)]
	am.mu.RUnlock()

	if !exists || user.PasswordHash != hashPassword(req.Password) {
		response.Message = "Invalid username or password"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	am.mu.Lock()
	defer am.mu.Unlock()

	user.LastLogin = time.Now()

	token := generateToken()
	session := &Session{
		Token:     token,
		UserID:    strings.ToLower(req.Username),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	am.sessions[token] = session

	response.Success = true
	response.Message = "Login successful"
	response.Token = token
	response.User = &User{
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
		LastLogin: user.LastLogin,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (am *AuthManager) ValidateToken(token string) bool {
	am.mu.RLock()
	defer am.mu.RUnlock()

	session, exists := am.sessions[token]
	if !exists {
		return false
	}

	if time.Now().After(session.ExpiresAt) {
		return false
	}

	return true
}

func (am *AuthManager) GetUserByToken(token string) *User {
	am.mu.RLock()
	defer am.mu.RUnlock()

	session, exists := am.sessions[token]
	if !exists {
		return nil
	}

	if time.Now().After(session.ExpiresAt) {
		return nil
	}

	return am.users[session.UserID]
}

func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return fmt.Sprintf("%x", hash)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.StdEncoding.EncodeToString(b)
}
