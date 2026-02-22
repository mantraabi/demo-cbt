<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import dashboardApi from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  PhStudent, 
  PhBookBookmark, 
  PhFiles, 
  PhCalendarCheck 
} from '@phosphor-icons/vue'

const authStore = useAuthStore()
const stats = ref({
    siswa: 0,
    mapel: 0,
    soal: 0,
    ujian: 0
})
const loading = ref(true)

const fetchStats = async () => {
    try {
        const res = await dashboardApi.getStats()
        stats.value = res.data
    } catch (error) {
        console.error("Gagal load stats")
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchStats()
})
</script>

<template>
  <div class="space-y-8">
    <div class="bg-blue-600 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div class="relative z-10">
            <h2 class="text-3xl font-bold mb-2">Halo, {{ authStore.user?.nama_lengkap }}! 👋</h2>
            <p class="text-blue-100 max-w-xl">
                Selamat datang di Panel Admin CBT. Sistem siap digunakan untuk melaksanakan ujian berbasis komputer.
            </p>
        </div>
        <PhStudent class="absolute -right-6 -bottom-6 text-blue-500 opacity-30 w-48 h-48" weight="duotone" />
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card class="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-slate-500">Total Siswa</CardTitle>
                <PhStudent class="h-4 w-4 text-blue-500" weight="bold"/>
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold text-slate-800">
                    {{ loading ? '...' : stats.siswa }}
                </div>
                <p class="text-xs text-slate-500">Siswa terdaftar aktif</p>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-slate-500">Mata Pelajaran</CardTitle>
                <PhBookBookmark class="h-4 w-4 text-purple-500" weight="bold"/>
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold text-slate-800">
                    {{ loading ? '...' : stats.mapel }}
                </div>
                <p class="text-xs text-slate-500">Mapel tersedia</p>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-slate-500">Bank Soal</CardTitle>
                <PhFiles class="h-4 w-4 text-orange-500" weight="bold"/>
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold text-slate-800">
                    {{ loading ? '...' : stats.soal }}
                </div>
                <p class="text-xs text-slate-500">Total butir soal</p>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-slate-500">Jadwal Aktif</CardTitle>
                <PhCalendarCheck class="h-4 w-4 text-green-500" weight="bold"/>
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold text-slate-800">
                    {{ loading ? '...' : stats.ujian }}
                </div>
                <p class="text-xs text-slate-500">Ujian berlangsung / akan datang</p>
            </CardContent>
        </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div class="col-span-4 bg-white p-6 rounded-lg border shadow-sm">
            <h3 class="font-bold text-slate-800 mb-4">Aksi Cepat</h3>
            <div class="grid grid-cols-2 gap-4">
                <button @click="$router.push('/admin/exams')" class="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left">
                    <div class="bg-blue-100 p-2 rounded text-blue-600"><PhCalendarCheck size="20" weight="fill"/></div>
                    <div>
                        <div class="font-bold text-sm text-slate-700">Buat Jadwal</div>
                        <div class="text-xs text-slate-500">Setting ujian baru</div>
                    </div>
                </button>
                <button @click="$router.push('/admin/bank-soal')" class="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left">
                    <div class="bg-orange-100 p-2 rounded text-orange-600"><PhFiles size="20" weight="fill"/></div>
                    <div>
                        <div class="font-bold text-sm text-slate-700">Tambah Soal</div>
                        <div class="text-xs text-slate-500">Upload soal ujian</div>
                    </div>
                </button>
            </div>
        </div>
        
        <div class="col-span-3 bg-white p-6 rounded-lg border shadow-sm flex flex-col justify-center items-center text-center">
            <div class="bg-green-100 p-3 rounded-full mb-3">
                 <PhStudent class="text-green-600 text-2xl" weight="fill"/>
            </div>
            <h3 class="font-bold text-slate-800">Kelola Siswa</h3>
            <p class="text-xs text-slate-500 mb-4 mt-1">Tambah, edit, atau reset password siswa.</p>
            <button @click="$router.push('/admin/students')" class="text-sm font-bold text-green-600 hover:underline">
                Ke Data Siswa &rarr;
            </button>
        </div>
    </div>
  </div>
</template>