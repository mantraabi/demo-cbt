// src/api/subject.js

import api from '@/api/axios'

export default {
  // Ambil semua mapel
  getAll() { 
    return api.get('/subjects') 
  },
  
  // Tambah mapel baru (Opsional, untuk menu Data Akademik nanti)
  create(data) { 
    return api.post('/subjects', data) 
  },
  
  // Hapus mapel
  delete(id) { 
    return api.delete(`/subjects/${id}`) 
  }
}