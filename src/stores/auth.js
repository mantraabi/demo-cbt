import { defineStore } from 'pinia'
import api from '@/api/axios'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.role === 'guru'
  },

  actions: {
    async login(credentials) {
      this.loading = true
      try {
        // Request ke Backend
        const response = await api.post('/auth/login', credentials)
        
        const { accessToken, user } = response.data
        
        // Simpan ke State & LocalStorage
        this.token = accessToken
        this.user = user
        localStorage.setItem('token', accessToken)
        
        // Redirect berdasarkan Role
        if (user.role === 'admin' || user.role === 'guru') {
          router.push('/admin/dashboard')
        } else {
          router.push('/student/dashboard')
        }
        
        return true
      } catch (error) {
        console.error("Login Gagal:", error.response?.data?.msg)
        throw error.response?.data?.msg || "Login Gagal"
      } finally {
        this.loading = false
      }
    },

    async fetchUser() {
        // Fungsi untuk cek user saat refresh halaman (endpoint /me)
        if(!this.token) return

        try {
            const response = await api.get('/auth/me')
            this.user = response.data
        } catch (error) {
            // Token expired/invalid -> Logout paksa
            this.logout()
        }
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      router.push('/')
    }
  }
})