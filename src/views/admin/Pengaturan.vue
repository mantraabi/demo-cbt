<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import settingApi from '@/api/setting'
import authApi from '@/api/auth' // Pastikan file ini sudah ada sesuai panduan sebelumnya
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { PhFloppyDisk, PhImage, PhUpload, PhLockKey } from '@phosphor-icons/vue'

const router = useRouter()

const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

// --- STATE PENGATURAN SEKOLAH ---
const loading = ref(false)
const form = ref({
    nama_sekolah: '', alamat_sekolah: '', website: '', email: '',
    kepala_sekolah: '', nip: '', list_pelanggaran: '', max_pelanggaran: 5
})
const logoPreview = ref(null)
const logoFile = ref(null)

// --- STATE GANTI PASSWORD ---
const dialogPasswordOpen = ref(false)
const loadingPassword = ref(false)
const formPassword = ref({
    password_lama: '',
    password_baru: '',
    konfirmasi_password: ''
})

// --- LOGIC PENGATURAN SEKOLAH ---
const fetchData = async () => {
    try {
        const res = await settingApi.get()
        form.value = res.data
        if(res.data.logo) {
            logoPreview.value = `${backendUrl}/uploads/${res.data.logo}`
        }
    } catch (e) { console.error(e) }
}

const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
        logoFile.value = file
        logoPreview.value = URL.createObjectURL(file)
    }
}

const handleSubmit = async () => {
    loading.value = true
    const formData = new FormData()
    
    Object.keys(form.value).forEach(key => {
        formData.append(key, form.value[key] || '')
    })
    
    if(logoFile.value) formData.append('logo', logoFile.value)

    try {
        await settingApi.update(formData)
        toast.success("Pengaturan Sekolah Disimpan!")
        setTimeout(() => window.location.reload(), 1000) 
    } catch (error) {
        toast.error("Gagal menyimpan")
    } finally {
        loading.value = false
    }
}

// --- LOGIC GANTI PASSWORD ---
const submitGantiPassword = async () => {
    if (!formPassword.value.password_lama || !formPassword.value.password_baru) {
        return toast.error("Semua kolom wajib diisi!")
    }
    if (formPassword.value.password_baru !== formPassword.value.konfirmasi_password) {
        return toast.error("Konfirmasi password tidak cocok!")
    }
    if (formPassword.value.password_baru.length < 6) {
        return toast.error("Password baru minimal 6 karakter!")
    }

    loadingPassword.value = true
    try {
        await authApi.changePassword({
            password_lama: formPassword.value.password_lama,
            password_baru: formPassword.value.password_baru
        })
        
        toast.success("Password berhasil diubah! Silakan login ulang.")
        dialogPasswordOpen.value = false
        formPassword.value = { password_lama: '', password_baru: '', konfirmasi_password: '' }
        
        // Logout Otomatis
        setTimeout(() => {
            localStorage.removeItem('token') // Sesuaikan jika kamu pakai Pinia/cara lain
            window.location.href = '/'
        }, 1500)

    } catch (error) {
        const msg = error.response?.data?.msg || "Gagal mengubah password"
        toast.error(msg)
    } finally {
        loadingPassword.value = false
    }
}

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-6">
        <div>
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Pengaturan Sekolah</h2>
            <p class="text-slate-500">Atur identitas sekolah, logo, dan pejabat penandatangan.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <div class="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Identitas Sekolah</CardTitle></CardHeader>
                    <CardContent class="space-y-4">
                            <div class="space-y-2">
                                <Label>Nama Sekolah</Label>
                                <Input v-model="form.nama_sekolah" placeholder="SMP NEGERI 1 KONOHA" class="font-bold"/>
                            </div>
                            <div class="space-y-2">
                                <Label>Alamat Lengkap</Label>
                                <Textarea v-model="form.alamat_sekolah" placeholder="Jl. Shinobi No. 1, Kota Konoha" rows="3" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Website</Label>
                                    <Input v-model="form.website" placeholder="www.sekolah.sch.id" />
                                </div>
                                <div class="space-y-2">
                                    <Label>Email</Label>
                                    <Input v-model="form.email" placeholder="admin@sekolah.sch.id" />
                                </div>
                            </div>

                            <div class="pt-4 mt-4 border-t space-y-4">
                                <h3 class="font-semibold text-slate-700">Pejabat Penandatangan (Kartu Ujian)</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <Label>Nama Kepala Sekolah</Label>
                                        <Input v-model="form.kepala_sekolah" placeholder="Nama Lengkap & Gelar" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>NIP</Label>
                                        <Input v-model="form.nip" placeholder="NIP. 199..." />
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 mt-4 border-t space-y-4">
                                <h3 class="font-semibold text-slate-700">Aturan & Keamanan Ujian</h3>
                                
                                <div class="space-y-2">
                                    <Label>Batas Maksimal Pelanggaran</Label>
                                    <Input 
                                        type="number" 
                                        v-model="form.max_pelanggaran" 
                                        placeholder="Contoh: 5" 
                                        class="md:w-1/2"
                                    />
                                    <p class="text-xs text-slate-500">
                                        Jika siswa pindah tab melebihi batas ini, ujian akan otomatis disubmit (selesai).
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Daftar Pelanggaran</Label>
                                    <textarea 
                                        v-model="form.list_pelanggaran" 
                                        class="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" 
                                        rows="3"
                                        placeholder="Pisahkan dengan koma (Contoh: Mencontek, Buka Tab Baru, Membuka Buku)"
                                    ></textarea>
                                    <p class="text-xs text-slate-500">Pisahkan setiap pelanggaran dengan tanda koma (,)</p>
                                </div>
                            </div>
                        </CardContent>
                </Card>
            </div>

            <div>
                <Card>
                    <CardHeader><CardTitle>Logo Sekolah</CardTitle></CardHeader>
                    <CardContent class="flex flex-col items-center space-y-4">
                        <div class="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                            <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-contain p-2" />
                            <div v-else class="text-slate-400 text-sm flex flex-col items-center">
                                <PhImage size="32" />
                                <span>No Logo</span>
                            </div>
                        </div>
                        
                        <div class="w-full">
                            <Label for="logo-upload" class="cursor-pointer inline-flex w-full justify-center items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                                <PhUpload /> Pilih Gambar...
                            </Label>
                            <input id="logo-upload" type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                        </div>
                        <p class="text-xs text-slate-500 text-center">Format: PNG/JPG (Transparan lebih baik). Max 2MB.</p>
                    </CardContent>
                </Card>

                <Button class="w-full mt-6" size="lg" @click="handleSubmit" :disabled="loading">
                    <PhFloppyDisk class="mr-2 text-lg" weight="bold"/> 
                    {{ loading ? 'Menyimpan...' : 'Simpan Perubahan' }}
                </Button>

                <Card class="mt-8 border-red-100">
                    <CardHeader class="bg-red-50/50 pb-4 border-b">
                        <CardTitle class="text-red-700 text-lg flex items-center gap-2">
                            <PhLockKey weight="bold" /> Keamanan Akun
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-4 text-center">
                        <p class="text-xs text-slate-500 mb-4">Ubah password akun Administrator untuk menjaga keamanan sistem CBT.</p>
                        
                        <Dialog v-model:open="dialogPasswordOpen">
                            <DialogTrigger as-child>
                                <Button variant="outline" class="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                    Ganti Password Admin
                                </Button>
                            </DialogTrigger>

                            <DialogContent class="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>Ubah Password Admin</DialogTitle>
                                </DialogHeader>
                                <div class="space-y-4 py-4">
                                    <div class="space-y-2">
                                        <Label>Password Lama</Label>
                                        <Input type="password" v-model="formPassword.password_lama" placeholder="Masukkan password saat ini" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Password Baru</Label>
                                        <Input type="password" v-model="formPassword.password_baru" placeholder="Minimal 6 karakter" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Konfirmasi Password Baru</Label>
                                        <Input type="password" v-model="formPassword.konfirmasi_password" placeholder="Ketik ulang password baru" />
                                    </div>
                                    <Button class="w-full mt-4" @click="submitGantiPassword" :disabled="loadingPassword">
                                        {{ loadingPassword ? 'Memproses...' : 'Simpan Password' }}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

            </div>
        </div>
    </div>
</template>