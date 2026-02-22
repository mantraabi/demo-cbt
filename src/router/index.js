import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth' // Import store auth untuk cek login

// Import Layout & Views
import LoginView from '@/views/auth/LoginView.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import StudentLayout from '@/layouts/StudentLayout.vue'
import Maintenance from '../views/admin/Maintenance.vue'
import KoreksiEsai from '../views/admin/KoreksiEsai.vue'

const routes = [
  {
      path: '/',  // <--- Root URL
      name: 'Login',
      component: () => import('../views/auth/LoginView.vue') // Pastikan ini mengarah ke Login
    },
  
  // ADMIN ROUTES
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: 'admin' }, // Penanda butuh login & role admin
    children: [
      {
          path: 'dashboard', // url jadi: /admin/dashboard
          name: 'AdminDashboard',
          component: () => import('@/views/admin/Dashboard.vue')
      },
      
      {
          path: 'bank-soal',
          name: 'BankSoal',
          component: () => import('@/views/admin/BankSoal.vue')
      },

      {
          path: 'academic',
          name: 'AcademicData',
          component: () => import('@/views/admin/DataMapel.vue')
      },

      {
          path: 'exams',
          name: 'ExamSchedule',
          component: () => import('@/views/admin/JadwalUjian.vue')
      },

      {
          path: 'exams/:id/results',
          name: 'ExamResults',
          component: () => import('@/views/admin/HasilNilai.vue')
      },

      {
          path: 'rekap-nilai',
          name: 'RekapNilai',
          component: () => import('@/views/admin/RekapNilai.vue')
      },

      {
          path: 'students',
          name: 'DataSiswa',
          component: () => import('@/views/admin/DataSiswa.vue')
      },

      {
          path: 'settings',
          name: 'Pengaturan',
          component: () => import('@/views/admin/Pengaturan.vue')
      },

      {
        path: 'koreksi/:nilaiId',
        name: 'KoreksiJawaban',
        component: () => import('@/views/admin/KoreksiJawaban.vue')
      },

      {
        path: 'cetak-kartu',
        name: 'CetakKartu',
        component: () => import('@/views/admin/CetakKartu.vue')
      },

      { path: '/admin/monitoring/:id',
        name: 'MonitoringUjian',
        component: () => import('@/views/admin/MonitoringUjian.vue')
      
      },

      {
        path: 'maintenance',
        name: 'Maintenance',
        component: () => import('@/views/admin/Maintenance.vue')
      },

      { path: 'koreksi/:id', component: KoreksiEsai },

    ]
  },

  // STUDENT ROUTES
  {
    path: '/student',
    component: StudentLayout, // Pakai layout baru
    meta: { requiresAuth: true, role: 'siswa' },
    children: [
      {
        path: 'dashboard',
        name: 'StudentDashboard',
        component: () => import('@/views/student/Dashboard.vue')
      },

      {
        path: 'exam/:id', // ID Ujian
        name: 'StudentExam',
        component: () => import('@/views/student/ExamView.vue')
      },

      {
        path: '/student/change-password',
        name: 'StudentChangePassword',
        component: () => import('@/views/student/GantiPassword.vue'),
        meta: { requiresAuth: true, role: 'siswa' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard (Satpam Frontend)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.user?.role

  // 1. Jika halaman butuh login tapi user belum login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/')
  }

  // 2. Jika halaman khusus guest (Login) tapi user sudah login
  if (to.meta.guest && isAuthenticated) {
    if (userRole === 'admin' || userRole === 'guru') return next('/admin/dashboard')
    return next('/student/dashboard')
  }

  // 3. Jika halaman admin diakses siswa (atau sebaliknya) - Opsional dulu
  // Kita skip dulu agar tidak terlalu ketat saat development

  next()
})

export default router