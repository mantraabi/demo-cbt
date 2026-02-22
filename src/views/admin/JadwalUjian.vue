<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import examApi from '@/api/exam'
import subjectApi from '@/api/subject'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// IMPORT DialogDescription DI SINI
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from '@/components/ui/dialog'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { PhPlus, PhTrash, PhCalendarCheck, PhClock, PhCopy, PhDesktop, PhPencilSimple } from '@phosphor-icons/vue'

const router = useRouter()
const exams = ref([])
const subjects = ref([])
const loading = ref(true)
const dialogOpen = ref(false)

const form = ref({
    nama_ujian: '',
    jenis_ujian: 'UAS',
    mapel_id: '',
    tgl_mulai: '',
    tgl_selesai: '',
    durasi_menit: 60,
    acak_soal: true
})

const fetchData = async () => {
    loading.value = true
    try {
        const resExams = await examApi.getAll()
        exams.value = resExams.data
        const resSubjects = await subjectApi.getAll()
        subjects.value = resSubjects.data
    } catch (error) {
        console.error(error)
        toast.error("Gagal memuat data")
    } finally {
        loading.value = false
    }
}

const getStatus = (exam) => {
    const now = new Date()
    const start = new Date(exam.tgl_mulai)
    const end = new Date(exam.tgl_selesai)
    if (now < start) return { label: 'Dijadwalkan', color: 'bg-yellow-100 text-yellow-800' }
    if (now > end) return { label: 'Selesai', color: 'bg-red-100 text-red-800' }
    return { label: 'Aktif', color: 'bg-green-100 text-green-800' }
}

const handleSubmit = async () => {
    if (!form.value.nama_ujian || !form.value.mapel_id || !form.value.tgl_mulai || !form.value.tgl_selesai) {
        return toast.error("Semua field wajib diisi!")
    }
    if (new Date(form.value.tgl_selesai) <= new Date(form.value.tgl_mulai)) {
        return toast.error("Tanggal selesai harus setelah tanggal mulai!")
    }

    try {
        await examApi.create(form.value)
        toast.success("Ujian berhasil dijadwalkan")
        dialogOpen.value = false
        resetForm()
        fetchData()
    } catch (error) {
        console.error(error)
        toast.error("Gagal menyimpan ujian")
    }
}

const deleteExam = async (id) => {
    if(!confirm("Yakin hapus jadwal ujian ini?")) return
    
    try {
        await examApi.delete(id)
        toast.success("Jadwal dihapus") // Ini hanya muncul jika Backend mengizinkan
        fetchData()
    } catch (error) {
        // PERBAIKAN: Tampilkan pesan error spesifik dari Backend
        const pesanError = error.response?.data?.msg || "Gagal menghapus jadwal";
        
        // Tampilkan Toast Merah dengan pesan jelas
        toast.error(pesanError, {
            duration: 5000, // Tampil agak lama biar terbaca
        });
    }
}

// Fitur Copy Token
const copyToken = (token) => {
    navigator.clipboard.writeText(token)
    toast.success(`Token ${token} disalin!`)
}

const resetForm = () => {
    form.value = {
        nama_ujian: '',
        jenis_ujian: 'UAS',
        mapel_id: '',
        tgl_mulai: '',
        tgl_selesai: '',
        durasi_menit: 60,
        acak_soal: true
    }
}

const akhiriUjian = async (id) => {
    if(!confirm("Yakin ingin mengakhiri ujian ini sekarang? Waktu selesai akan diubah ke saat ini dan siswa tidak bisa login lagi.")) return;
    
    try {
        await examApi.forceClose(id);
        toast.success("Ujian berhasil ditutup!");
        fetchData(); // Refresh tabel jadwal
    } catch (error) {
        toast.error("Gagal mengakhiri ujian");
    }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 class="text-2xl font-bold flex items-center gap-2">
                <PhCalendarCheck class="text-blue-600" /> Jadwal Ujian
            </h2>
            <p class="text-slate-500">Atur waktu pelaksanaan ujian untuk siswa.</p>
        </div>
        
        <Dialog v-model:open="dialogOpen">
            <DialogTrigger as-child>
                <Button @click="resetForm"><PhPlus class="mr-2" /> Buat Jadwal Ujian</Button>
            </DialogTrigger>
            <DialogContent class="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Buat Jadwal Baru</DialogTitle>
                    <DialogDescription>
                        Isi formulir di bawah ini untuk membuat jadwal ujian baru bagi siswa.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2 md:col-span-1">
                            <Label>Nama Ujian</Label>
                            <Input v-model="form.nama_ujian" placeholder="Contoh: UAS Matematika" />
                        </div>
                        <div class="col-span-2 md:col-span-1">
                            <Label>Jenis Ujian</Label>
                            <Select v-model="form.jenis_ujian">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UH">Ulangan Harian</SelectItem>
                                    <SelectItem value="UTS">UTS</SelectItem>
                                    <SelectItem value="UAS">UAS</SelectItem>
                                    <SelectItem value="TO">Tryout</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label>Mata Pelajaran (Kelas)</Label>
                        <Select v-model="form.mapel_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Mapel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="m in subjects" :key="m.id" :value="String(m.id)">
                                    {{ m.nama_mapel }} ({{ m.kelas }})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Waktu Mulai</Label>
                            <Input type="datetime-local" v-model="form.tgl_mulai" />
                        </div>
                        <div>
                            <Label>Waktu Selesai</Label>
                            <Input type="datetime-local" v-model="form.tgl_selesai" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label>Durasi (Menit)</Label>
                        <div class="flex items-center gap-2">
                            <PhClock class="text-slate-400" />
                            <Input type="number" v-model="form.durasi_menit" min="10" />
                        </div>
                    </div>

                    <Button class="w-full mt-4" @click="handleSubmit">Simpan Jadwal</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>

    <div class="border rounded-lg bg-white overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama Ujian</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead class="text-center">Token</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead class="text-center">Status</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-if="exams.length === 0">
                    <TableCell colspan="6" class="text-center py-10 text-slate-500">
                        Belum ada jadwal ujian.
                    </TableCell>
                </TableRow>
                
                <TableRow v-for="exam in exams" :key="exam.id">
                    <TableCell>
                        <div class="font-bold">{{ exam.nama_ujian }}</div>
                        <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{{ exam.jenis_ujian }}</span>
                    </TableCell>
                    <TableCell>
                        {{ exam.mata_pelajaran?.nama_mapel }} <br>
                        <span class="text-xs text-slate-400">{{ exam.mata_pelajaran?.kelas }}</span>
                    </TableCell>
                    
                    <TableCell class="text-center">
                        <div class="flex items-center justify-center gap-2">
                            <Badge variant="outline" class="font-mono text-lg tracking-widest bg-slate-50">
                                {{ exam.token }}
                            </Badge>
                            <Button variant="ghost" size="icon" class="h-6 w-6" @click="copyToken(exam.token)" title="Salin Token">
                                <PhCopy />
                            </Button>
                        </div>
                    </TableCell>

                    <TableCell class="text-sm">
                        <div class="text-green-600 font-medium">{{ new Date(exam.tgl_mulai).toLocaleString() }}</div>
                        <div class="text-slate-500 text-xs mt-1">Durasi: {{ exam.durasi_menit }} Menit</div>
                    </TableCell>
                    <TableCell class="text-center">
                        <Badge :class="getStatus(exam).color">
                            {{ getStatus(exam).label }}
                        </Badge>
                    </TableCell>
                    <TableCell class="text-right">
                        <div class="flex items-center justify-end gap-2"> <Button 
                                variant="outline" 
                                size="sm" 
                                class="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                @click="router.push(`/admin/monitoring/${exam.id}`)"
                                title="Pantau Ujian Live"
                            >
                                <PhDesktop class="mr-2 h-4 w-4" /> Monitor
                            </Button>

                            <Button 
                                variant="destructive" 
                                size="sm" 
                                @click="akhiriUjian(exam.id)"
                            >
                                Akhiri Ujian
                            </Button>

                            <Button variant="ghost" size="icon" class="text-red-500 hover:bg-red-50" @click="deleteExam(exam.id)">
                                <PhTrash />
                            </Button>
                            
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
  </div>
</template>