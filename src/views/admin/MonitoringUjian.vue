<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import examApi from '@/api/exam'
import { toast } from 'vue-sonner'
import { PhDesktop, PhCheckCircle, PhWarning, PhStopCircle } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const participants = ref([])
const loading = ref(true)
let intervalId = null

const fetchStatus = async () => {
    try {
        const res = await examApi.getMonitoring(route.params.id)
        participants.value = res.data
    } catch (e) {
        console.error("Gagal load monitoring")
    } finally {
        loading.value = false
    }
}

// Fitur Paksa Selesai (Meminjam fitur Reset Login, tapi dimodif jadi Submit Paksa nanti jika perlu)
// Untuk sekarang kita pakai Reset saja dulu
const handleReset = async (nilaiId, nama) => {
    if(!confirm(`Reset login siswa ${nama}? Data jawaban akan hilang.`)) return;
    try {
        await examApi.resetExamStudent(nilaiId)
        toast.success("Siswa di-reset")
        fetchStatus()
    } catch(e) {
        toast.error("Gagal")
    }
}

onMounted(() => {
    fetchStatus()
    // Auto Refresh setiap 5 detik
    intervalId = setInterval(fetchStatus, 5000)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
})
</script>

<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
            <div>
                <h2 class="text-2xl font-bold">Monitoring Ujian Live</h2>
                <p class="text-slate-500">Data diperbarui otomatis setiap 5 detik.</p>
            </div>
            
            <div class="flex gap-4 text-sm font-medium">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div> Mengerjakan</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-orange-400"></div> Idle/Putus</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-green-500"></div> Selesai</div>
            </div>
        </div>

        <div v-if="loading" class="text-center py-10">Memuat data...</div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="p in participants" :key="p.id" 
                class="border rounded-lg p-4 flex flex-col justify-between relative overflow-hidden transition-all"
                :class="{
                    'bg-blue-50 border-blue-200': p.status === 'mengerjakan',
                    'bg-green-50 border-green-200': p.status === 'selesai',
                    'bg-orange-50 border-orange-200': p.status === 'idle'
                }"
            >
                <div class="absolute top-0 left-0 w-full h-1"
                    :class="{
                        'bg-blue-500': p.status === 'mengerjakan',
                        'bg-green-500': p.status === 'selesai',
                        'bg-orange-400': p.status === 'idle'
                    }"
                ></div>

                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold truncate max-w-[120px]" :title="p.nama">{{ p.nama }}</h3>
                        
                        <div class="flex items-center gap-1">
                            <span v-if="p.pelanggaran > 0" 
                                  class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm" 
                                  title="Jumlah Pelanggaran (Pindah Tab)">
                                {{ p.pelanggaran }}x
                            </span>

                            <PhCheckCircle v-if="p.status === 'selesai'" weight="fill" class="text-green-600"/>
                            <PhDesktop v-else-if="p.status === 'mengerjakan'" weight="fill" class="text-blue-600 animate-pulse"/>
                            <PhWarning v-else weight="fill" class="text-orange-500"/>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">{{ p.username }} | {{ p.kelas }}</p>
                </div>

                <div class="mt-4 pt-2 border-t border-slate-200/50 flex justify-between items-center">
                    <div class="text-xs font-mono">
                        <span v-if="p.status === 'selesai'" class="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            SELESAI
                        </span>
                        <span v-else class="text-slate-500">
                            Active: {{ new Date(p.last_active).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                        </span>
                    </div>
                    
                    <Button v-if="p.status !== 'selesai'" variant="ghost" size="icon" class="h-6 w-6 text-red-500 hover:bg-red-50" title="Reset Login Siswa" @click="handleReset(p.id, p.nama)">
                        <PhStopCircle weight="bold" />
                    </Button>
                </div>
            </div>
        </div>
        
        <div v-if="participants.length === 0" class="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed">
            Belum ada siswa yang login.
        </div>
    </div>
</template>