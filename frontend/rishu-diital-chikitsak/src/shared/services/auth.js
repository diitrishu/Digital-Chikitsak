// src/services/auth.js
import api from "./api";

export async function login({ phone, pin }) {
    try {
        const response = await api.login({ phone, pin });
        const { token, user } = response;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return user;
    } catch (error) {
        console.error('Login API call failed:', error);
        throw error;
    }
}

// Guest login function
export function guestLogin() {
    // Clear any existing user data first
    logout();
    
    // For guest login, we'll use a special phone number and PIN
    const guestUser = {
        phone: '9999999999',
        name: 'Guest User',
        role: 'patient'
    };
    
    const token = 'guest-token';
    
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(guestUser));
    localStorage.setItem("isGuest", "true");
    
    return guestUser;
}

export async function register(payload) {
    try {
        console.log("Sending registration request:", payload);
        const response = await api.register(payload);
        console.log("Registration response:", response);
        
        const { token, user } = response;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return user;
    } catch (error) {
        console.error("Registration API error:", error);
        console.error("Error response:", error.response?.data);
        throw error;
    }
}

export async function addFamilyMember(payload) {
    const token = localStorage.getItem("token");
    const res = await api.post("/family/add", payload, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
}

export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isGuest");
}

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

export function isGuestUser() {
    return localStorage.getItem("isGuest") === "true";
}

export async function getPatientsForAccount() {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
        const res = await api.get("/patients", {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data; // should return an array of patient/family member objects
    } catch (err) {
        console.error("Failed to fetch patients", err);
        return [];
    }
}