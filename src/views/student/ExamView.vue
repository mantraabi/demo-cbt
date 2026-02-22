<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import examApi from '@/api/exam'
import api from '@/api/axios' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { 
    PhClock, PhCheckCircle, PhListNumbers, PhWarning, PhProhibit, PhFlag 
} from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()

// URL Backend Dinamis untuk Gambar
const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

// --- STATE UTAMA ---
const step = ref('token') 
const tokenInput = ref('')
const loading = ref(false)
const showRules = ref(false) 

// Data Ujian
const examData = ref(null) 
const questionList = ref([]) 
const currentQuestionIndex = ref(0) 

// Jawaban & Ragu-ragu
const answers = ref({}) 
const doubtful = ref({}) 

// Timer
const timeLeft = ref(0) 
let timerInterval = null

// Security & Pelanggaran
const isFullscreen = ref(false)
const violationCount = ref(0) // Kita gunakan satu variabel ini saja
const maxPelanggaran = ref(5) // Default batas pelanggaran

// ----------------------------------------------------------------------
// 1. AUTO-SAVE SYSTEM (LOCAL STORAGE)
// ----------------------------------------------------------------------
const storageKey = computed(() => `cbt_save_${route.params.id}`)

const saveToLocal = () => {
    if (step.value === 'exam') {
        const dataToSave = {
            answers: answers.value,
            doubtful: doubtful.value,
            timestamp: new Date().getTime()
        }
        localStorage.setItem(storageKey.value, JSON.stringify(dataToSave))
    }
}

const loadFromLocal = () => {
    const saved = localStorage.getItem(storageKey.value)
    if (saved) {
        try {
            const parsed = JSON.parse(saved)
            if (parsed.answers) answers.value = parsed.answers
            if (parsed.doubtful) doubtful.value = parsed.doubtful
            toast.info("Jawaban tersimpan berhasil dipulihkan!")
        } catch (e) {
            console.error("Gagal load save data", e)
        }
    }
}

const clearLocalSave = () => {
    localStorage.removeItem(storageKey.value)
}

watch([answers, doubtful], () => {
    saveToLocal()
}, { deep: true })


// ----------------------------------------------------------------------
// 2. SECURITY & FULLSCREEN
// ----------------------------------------------------------------------
const blockedKeys = ["F1", "F5", "F11", "F12", "Tab", "Alt", "Control", "Meta", "ContextMenu", "Escape"];

const handleKeyDown = (e) => {
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault(); toast.warning("Dilarang Refresh!"); return false;
    }
    if (e.altKey && e.key === 'Tab') { e.preventDefault(); return false; }
    if (blockedKeys.includes(e.key)) { e.preventDefault(); return false; }
}

const handleVisibilityChange = async () => {
    // Cek apakah sedang ujian & tab sedang disembunyikan
    if (step.value === 'exam' && document.hidden) {
        violationCount.value++;

        // Kirim laporan ke server (Background)
        try {
            await examApi.reportViolation(route.params.id);
        } catch (e) { 
            console.error("Gagal lapor pelanggaran", e); 
        }
        
        // --- FIX: Gunakan Variabel Dinamis maxPelanggaran ---
        if (violationCount.value >= maxPelanggaran.value) {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            
            await finishExam(true);
            
            alert(`DISKUALIFIKASI!\n\nAnda telah melanggar aturan sebanyak ${violationCount.value} kali.\n\nSistem otomatis menghentikan ujian dan mengirim jawaban Anda saat ini.`);
            
        } else {
            // Peringatan Biasa dengan Angka Dinamis
            toast.error(`PERINGATAN PELANGGARAN! (${violationCount.value}/${maxPelanggaran.value})`, {
                description: `Dilarang pindah tab! Jika mencapai ${maxPelanggaran.value}x pelanggaran, ujian otomatis berhenti.`,
                duration: 5000,
            });
        }
    }
}

const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    isFullscreen.value = true;
}

// Ambil Aturan Pelanggaran dari Database
const fetchSetting = async () => {
    try {
        const res = await api.get('/settings/public')
        if (res.data.max_pelanggaran) {
            maxPelanggaran.value = res.data.max_pelanggaran
        }
    } catch (e) {
        console.error("Gagal ambil setting public", e)
    }
}

onMounted(() => {
    fetchSetting(); // <--- FIX: Fungsi dipanggil saat komponen dimuat
    document.addEventListener("contextmenu", e => e.preventDefault());
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
})

onUnmounted(() => {
    clearInterval(timerInterval);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
})


// ----------------------------------------------------------------------
// 3. LOGIC UJIAN
// ----------------------------------------------------------------------
const validateToken = async () => {
    if(!tokenInput.value) return toast.warning("Masukkan Token!")
    loading.value = true;
    
    const questionsKey = `cbt_questions_${route.params.id}`;
    localStorage.removeItem(questionsKey); 

    try {
        const cleanToken = tokenInput.value.trim().toUpperCase();
        const res = await examApi.startExam(route.params.id, cleanToken);
        
        examData.value = res.data.ujian;
        
        const rawSoal = res.data.soal || res.data.questions || res.data.data || [];

        if (!Array.isArray(rawSoal) || rawSoal.length === 0) {
            alert("DATA SOAL KOSONG!\n\nPastikan Admin sudah menginput soal untuk Mapel ini di menu Bank Soal.");
            loading.value = false;
            return;
        }

        questionList.value = rawSoal;
        localStorage.setItem(questionsKey, JSON.stringify(rawSoal));

        if (res.data.ujian && res.data.ujian.sisa_waktu) {
            timeLeft.value = Math.floor(res.data.ujian.sisa_waktu / 1000);
        } else {
            timeLeft.value = 60 * 60; 
        }

        showRules.value = true; 

    } catch (error) {
        const msg = error.response?.data?.msg || "Gagal memuat ujian. Cek Token.";
        toast.error(msg);
    } finally {
        loading.value = false;
    }
}

const startActualExam = () => {
    showRules.value = false;
    step.value = 'exam';
    
    loadFromLocal(); 
    enterFullscreen();
    startTimer();
    toast.success("Selamat Mengerjakan!");
}

const startTimer = () => {
    timerInterval = setInterval(() => {
        if (timeLeft.value > 0) timeLeft.value--
        else finishExam(true) 
    }, 1000)
}

// Navigasi
const currentQuestion = computed(() => questionList.value[currentQuestionIndex.value] || null)
const jumpTo = (index) => currentQuestionIndex.value = index
const nextQuestion = () => { if (currentQuestionIndex.value < questionList.value.length - 1) currentQuestionIndex.value++ }
const prevQuestion = () => { if (currentQuestionIndex.value > 0) currentQuestionIndex.value-- }

// Ragu-ragu Toggle
const toggleDoubt = () => {
    const qId = currentQuestion.value.id
    if (doubtful.value[qId]) delete doubtful.value[qId]
    else doubtful.value[qId] = true
}

// Logic Menjodohkan
const selectedLeft = ref(null) 
const handleMatch = (soalId, leftText, rightText) => {
    if (!answers.value[soalId]) answers.value[soalId] = []
    const existingIndex = answers.value[soalId].findIndex(a => a.kiri === leftText)
    if (existingIndex >= 0) answers.value[soalId][existingIndex].kanan = rightText
    else answers.value[soalId].push({ kiri: leftText, kanan: rightText })
    selectedLeft.value = null 
}

const toggleComplexAnswer = (qId, kode) => {
    if (!Array.isArray(answers.value[qId])) answers.value[qId] = []
    const arr = answers.value[qId]
    const idx = arr.indexOf(kode)
    if (idx === -1) arr.push(kode)
    else arr.splice(idx, 1)
}

// Helper Style Navigasi
const getNavClass = (qId, idx) => {
    let base = "h-10 w-10 rounded-lg text-sm font-bold transition-all border relative "
    if (currentQuestionIndex.value === idx) base += "ring-2 ring-blue-600 border-blue-600 z-10 "
    if (doubtful.value[qId]) return base + "bg-yellow-400 text-yellow-900 border-yellow-500"
    if (answers.value[qId] && answers.value[qId].length !== 0) return base + "bg-blue-600 text-white border-blue-700"
    return base + "bg-white text-slate-600 hover:bg-slate-100"
}

// Submit Jawaban
const confirmSubmit = () => {
    // --- FITUR BARU: BLOKIR TOMBOL SELESAI SEBELUM WAKTU HABIS ---
    if (timeLeft.value > 0) {
        toast.warning("Waktu Ujian Belum Habis!", {
            description: "Anda tidak bisa mengakhiri ujian lebih awal. Ujian akan otomatis dikumpulkan saat waktu habis. Silakan teliti kembali jawaban Anda."
        });
        return; // Hentikan proses, siswa tidak bisa submit
    }
    // -------------------------------------------------------------

    // Logika di bawah ini hanya sebagai cadangan jika sistem auto-submit gagal
    // (Misalnya browser nge-lag tepat di detik ke-0)
    const totalDoubt = Object.keys(doubtful.value).length
    if (totalDoubt > 0) {
        if (!confirm(`Masih ada ${totalDoubt} soal RAGU-RAGU. Yakin ingin mengakhiri?`)) return
    } else {
        if (!confirm("Yakin ingin menyelesaikan ujian ini?")) return
    }
    finishExam(false)
}

const finishExam = async (auto = false) => {
    loading.value = true;
    try {
        const jawabanArray = Object.keys(answers.value).map(key => ({
            soal_id: parseInt(key),
            jawab: answers.value[key]
        }));

        const res = await api.post('/exams/submit', { 
            ujian_id: route.params.id, 
            jawaban_siswa: jawabanArray 
        });
        
        clearLocalSave(); 
        localStorage.removeItem(`cbt_questions_${route.params.id}`); 
        
        if(auto) {
            toast.info("Ujian dihentikan otomatis (Waktu Habis/Pelanggaran). Jawaban tersimpan.");
        } else {
            const jam = res.data.waktu_selesai || 'sekarang';
            toast.success(`Ujian Selesai pada pukul ${jam}`);
        }
        
        clearInterval(timerInterval);
        step.value = 'finished';
        
        if(document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {}); 
        }
    } catch (error) {
        console.error(error);
        toast.error("Gagal mengirim jawaban. Mohon cek koneksi internet Anda!");
    } finally {
        loading.value = false;
    }
}

// Helper
const getOpsi = (data) => {
    if (!data) return [];
    if (typeof data === 'object') return data; 
    try { return JSON.parse(data); } catch (e) { return []; }
}
const formattedTime = computed(() => {
    const h = Math.floor(timeLeft.value / 3600), m = Math.floor((timeLeft.value % 3600) / 60), s = timeLeft.value % 60
    return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`
})
</script>

<template>
<div class="min-h-screen bg-slate-50 font-sans select-none" @contextmenu.prevent>
    
    <div v-if="step === 'token'" class="flex h-screen items-center justify-center p-4">
        <Card class="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
            <CardContent class="pt-6 space-y-6 text-center">
                <div class="mb-4">
                    <h1 class="text-2xl font-bold text-slate-800">Ujian CBT</h1>
                    <p class="text-slate-500 text-sm mt-1">Masukkan token ujian dari pengawas.</p>
                </div>
                <Input v-model="tokenInput" placeholder="TOKEN" class="text-center text-3xl tracking-[0.5em] font-mono uppercase h-16 font-bold" maxlength="6" />
                <Button class="w-full h-12 text-lg" @click="validateToken" :disabled="loading">
                    {{ loading ? 'Memvalidasi...' : 'LANJUT' }}
                </Button>
            </CardContent>
        </Card>
    </div>

    <div v-else-if="step === 'exam'" class="flex flex-col h-screen">
        <header class="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 sticky top-0">
            <div class="flex items-center gap-4">
                <div class="font-bold text-lg text-slate-800 truncate max-w-[200px]">{{ examData?.nama_ujian }}</div>
            </div>
            <div class="flex items-center gap-4">
                <div v-if="violationCount > 0" class="flex items-center gap-1 text-red-600 text-xs font-bold animate-pulse bg-red-100 px-2 py-1 rounded">
                    <PhWarning weight="fill" /> {{ violationCount }}/{{ maxPelanggaran }}
                </div>
                <div class="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg font-mono text-lg font-bold" :class="{'bg-red-600 animate-pulse': timeLeft < 300}">
                    <PhClock weight="fill" /> {{ formattedTime }}
                </div>
                <Button variant="destructive" size="sm" @click="confirmSubmit">Selesai</Button>
            </div>
        </header>

        <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
            <main class="flex-1 overflow-y-auto p-6 md:p-10 pb-32 relative" v-if="currentQuestion">
                <div class="max-w-3xl mx-auto space-y-8">
                    <div class="flex justify-between items-start border-b pb-4">
                        <div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">
                            Soal No. {{ currentQuestionIndex + 1 }}
                        </div>
                        <Button 
                            size="sm" 
                            :variant="doubtful[currentQuestion.id] ? 'default' : 'outline'"
                            class="gap-2 transition-colors"
                            :class="doubtful[currentQuestion.id] ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500' : 'text-slate-500'"
                            @click="toggleDoubt"
                        >
                            <PhFlag weight="fill" /> {{ doubtful[currentQuestion.id] ? 'Dihapus Ragu' : 'Ragu-ragu' }}
                        </Button>
                    </div>

                    <div class="text-lg text-slate-900 leading-relaxed font-medium">
                         {{ currentQuestion.pertanyaan }}
                    </div>
                    
                    <img v-if="currentQuestion.gambar" :src="`${backendUrl}/uploads/${currentQuestion.gambar}`" class="max-w-full h-auto rounded-lg border shadow-sm max-h-96 object-contain" />

                    <div v-if="currentQuestion.tipe_soal === 'pg'" class="space-y-3">
                        <div v-for="(opsi, idx) in getOpsi(currentQuestion.opsi_jawaban)" :key="idx"
                            class="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            :class="answers[currentQuestion.id] === opsi.kode ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200'"
                            @click="answers[currentQuestion.id] = opsi.kode">
                            <div class="w-8 h-8 rounded-full border flex items-center justify-center mr-4 font-bold text-sm"
                                :class="answers[currentQuestion.id] === opsi.kode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500'">
                                {{ opsi.kode }}
                            </div>
                            <span class="text-slate-700">{{ opsi.teks }}</span>
                        </div>
                    </div>

                    <div v-if="currentQuestion.tipe_soal === 'pg_kompleks'" class="space-y-3">
                        <div v-for="(opsi, idx) in getOpsi(currentQuestion.opsi_jawaban)" :key="idx"
                        class="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer select-none" @click="toggleComplexAnswer(currentQuestion.id, opsi.kode)">
                        <input type="checkbox" :value="opsi.kode" v-model="answers[currentQuestion.id]" class="w-5 h-5 text-blue-600 mr-4 rounded" />
                        <span class="text-slate-700 ml-3"><span class="font-bold mr-1">{{ opsi.kode }}.</span> {{ opsi.teks }}</span>
                        </div>
                    </div>

                    <div v-if="currentQuestion.tipe_soal === 'menjodohkan'" class="grid md:grid-cols-2 gap-8">
                        <div class="space-y-2">
                            <h4 class="font-bold text-sm text-slate-500 mb-2">Premis (Klik Kiri)</h4>
                            <div v-for="(item, idx) in getOpsi(currentQuestion.menjodohkan_kiri)" :key="idx"
                                class="p-3 border rounded bg-white shadow-sm cursor-pointer hover:border-blue-400 select-none"
                                :class="selectedLeft === (item.teks || item) ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''"
                                @click="selectedLeft = (item.teks || item)">
                                {{ item.teks || item }}
                            </div>
                        </div>
                        <div class="space-y-2">
                            <h4 class="font-bold text-sm text-slate-500 mb-2">Pasangan (Klik Kanan)</h4>
                            <div v-for="(item, idx) in getOpsi(currentQuestion.menjodohkan_kanan)" :key="idx"
                                class="p-3 border rounded bg-slate-50 cursor-pointer hover:bg-slate-100 text-right select-none"
                                @click="selectedLeft && handleMatch(currentQuestion.id, selectedLeft, (item.teks || item))">
                                {{ item.teks || item }}
                            </div>
                        </div>
                        <div class="md:col-span-2 mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100" v-if="answers[currentQuestion.id]?.length">
                            <h4 class="text-sm font-bold text-blue-800 mb-2">Jawaban Terpilih:</h4>
                            <ul class="space-y-1 text-sm text-blue-900">
                                <li v-for="(pair, idx) in answers[currentQuestion.id]" :key="idx" class="flex items-center gap-2 bg-white px-2 py-1 rounded border border-blue-100">
                                    <span class="font-semibold">{{ pair.kiri }}</span> <span class="text-slate-400 mx-2">➜</span> <span class="font-semibold">{{ pair.kanan }}</span>
                                    <button class="ml-auto text-red-500 hover:text-red-700 font-bold px-2" @click="answers[currentQuestion.id].splice(idx, 1)">×</button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div v-if="currentQuestion.tipe_soal === 'esai'">
                        <Textarea v-model="answers[currentQuestion.id]" placeholder="Tulis jawaban..." rows="6" class="bg-white text-lg" />
                    </div>
                </div>
                
                <div class="flex justify-between mt-10 pt-6 border-t md:hidden">
                    <Button variant="outline" @click="prevQuestion" :disabled="currentQuestionIndex === 0">Prev</Button>
                    <Button @click="nextQuestion" :disabled="currentQuestionIndex === questionList.length - 1">Next</Button>
                </div>
            </main>

            <aside class="w-full md:w-80 bg-white border-l p-4 overflow-y-auto hidden md:block">
                <h3 class="font-bold text-slate-700 mb-4 flex items-center gap-2"><PhListNumbers size="20" /> Navigasi Soal</h3>
                
                <div class="grid grid-cols-5 gap-2">
                    <button v-for="(q, idx) in questionList" :key="q.id"
                        :class="getNavClass(q.id, idx)"
                        @click="jumpTo(idx)">
                        {{ idx + 1 }}
                    </button>
                </div>

                <div class="mt-8 border-t pt-4 space-y-2 text-xs text-slate-500">
                    <div class="flex items-center gap-2"><div class="w-3 h-3 bg-blue-600 rounded"></div> Sudah Dijawab</div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 bg-yellow-400 rounded"></div> Ragu-ragu</div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 bg-white border rounded"></div> Belum Dijawab</div>
                </div>
            </aside>
        </div>
        
        <footer class="bg-white border-t p-4 hidden md:flex justify-between items-center px-10">
            <Button variant="outline" size="lg" @click="prevQuestion" :disabled="currentQuestionIndex === 0">Sebelumnya</Button>
            <div class="flex gap-2">
                 <Button class="bg-yellow-400 hover:bg-yellow-500 text-yellow-900" @click="toggleDoubt">
                    <PhFlag weight="fill" class="mr-2"/> Ragu-ragu
                </Button>
                <Button size="lg" @click="nextQuestion" :disabled="currentQuestionIndex === questionList.length - 1">Selanjutnya</Button>
            </div>
        </footer>
    </div>

    <div v-else-if="step === 'finished'" class="flex h-screen items-center justify-center p-4 bg-white">
        <div class="text-center space-y-4 max-w-md">
            <PhCheckCircle weight="fill" class="text-green-500 text-7xl mx-auto" />
            <h2 class="text-3xl font-bold text-slate-800">Ujian Selesai!</h2>
            <Button class="mt-6 w-full" @click="router.push('/student/dashboard')">Kembali ke Dashboard</Button>
        </div>
    </div>

    <Dialog v-model:open="showRules">
        <DialogContent class="max-w-2xl" :escape-key-closes="false" :overlay-click-closes="false">
            <DialogHeader>
                <DialogTitle class="text-red-600 flex items-center gap-2">
                    <PhProhibit size="24" /> TATA TERTIB
                </DialogTitle>
                <DialogDescription>Baca aturan berikut sebelum mulai.</DialogDescription>
            </DialogHeader>
            <div class="bg-red-50 p-4 rounded text-sm text-slate-800">
                <ul class="list-disc pl-5 space-y-1">
                    <li>Dilarang pindah tab/aplikasi.</li>
                    <li>Sistem akan mencatat semua pelanggaran</li>
                    <li>Jika Anda melanggar lebih dari <b>{{ maxPelanggaran }} kali</b>, Ujian otomatis dikumpulkan.</li>
                    <li>Mode Fullscreen wajib aktif.</li>
                    <li>Jika terjadi kendala teknis, segera lapor ke pengawas tanpa menutup halaman ini.</li>
                    <li><b>Tenang!</b> Jawaban Anda otomatis tersimpan di browser ini jika terjadi kendala.</li>
                </ul>
            </div>
            <DialogFooter>
                <Button variant="outline" @click="showRules = false">Batal</Button>
                <Button class="bg-red-600 hover:bg-red-700 text-white" @click="startActualExam">MULAI MENGERJAKAN</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</div>
</template>