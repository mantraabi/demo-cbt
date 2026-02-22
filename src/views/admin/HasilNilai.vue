<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import examApi from '@/api/exam'
import PrintHeader from '@/components/PrintHeader.vue' 
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import { PhArrowLeft, PhPrinter, PhTrophy, PhFunnel, PhPencilSimple, PhMicrosoftExcelLogo, PhArrowCounterClockwise } from '@phosphor-icons/vue' 

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const examInfo = ref(null) // Perhatikan nama variabel ini
const participantList = ref([])
const selectedClass = ref('ALL')
const exporting = ref(false)

const fetchResults = async () => {
    loading.value = true
    try {
        const res = await examApi.getResults(route.params.id)
        examInfo.value = res.data.ujian
        participantList.value = res.data.peserta
    } catch (error) {
        toast.error("Gagal memuat hasil nilai")
        router.push('/admin/exams')
    } finally {
        loading.value = false
    }
}

const classOptions = computed(() => {
    const classes = participantList.value.map(p => p.user?.kelas).filter(k => k)
    return [...new Set(classes)].sort()
})

const filteredParticipants = computed(() => {
    if (selectedClass.value === 'ALL') return participantList.value
    return participantList.value.filter(p => p.user?.kelas === selectedClass.value)
})

const printPage = () => {
    window.print()
}

// Fungsi Handle Export
const handleExport = async () => {
    exporting.value = true
    try {
        const response = await examApi.exportGrades(route.params.id)
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // FIX: Ganti 'examData' menjadi 'examInfo' agar tidak error
        const cleanName = examInfo.value.nama_ujian.replace(/ /g, '_');
        const filename = `Rekap_Nilai_${cleanName}.xlsx`;
        
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success("File Excel berhasil diunduh!")
    } catch (error) {
        console.error(error)
        toast.error("Gagal mendownload excel")
    } finally {
        exporting.value = false
    }
}

// Fungsi Reset Ujian Siswa
const handleReset = async (nilaiId, namaSiswa) => {
    // Konfirmasi ganda biar Admin gak salah klik
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin me-RESET ujian siswa "${namaSiswa}"?`)) return;
    if (!confirm(`Data jawaban dan nilai "${namaSiswa}" akan DIHAPUS PERMANEN dan siswa harus mengerjakan dari awal. Lanjutkan?`)) return;

    try {
        loading.value = true;
        await examApi.resetExamStudent(nilaiId);
        toast.success(`Ujian siswa ${namaSiswa} berhasil di-reset.`);
        fetchResults(); // Refresh tabel otomatis
    } catch (error) {
        console.error(error);
        toast.error("Gagal mereset ujian.");
        loading.value = false;
    }
}

onMounted(() => {
    fetchResults()
})
</script>

<template>
  <div class="space-y-6 print:space-y-2">
    
    <PrintHeader />

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div class="flex items-center gap-4">
            <Button variant="outline" size="icon" @click="router.push('/admin/exams')">
                <PhArrowLeft />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight">Hasil Ujian</h2>
                <p class="text-slate-500">Rekap nilai siswa untuk ujian ini.</p>
            </div>
        </div>
        
        <div class="flex items-center gap-2">
            <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-md border shadow-sm">
                <PhFunnel class="text-slate-400" />
                <Select v-model="selectedClass">
                    <SelectTrigger class="w-[150px] h-8 border-none shadow-none p-0 focus:ring-0">
                        <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Kelas</SelectItem>
                        <SelectItem v-for="cls in classOptions" :key="cls" :value="cls">
                            {{ cls }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button class="bg-green-600 hover:bg-green-700 text-white" @click="handleExport" :disabled="exporting">
                <PhMicrosoftExcelLogo class="mr-2 h-4 w-4" weight="fill" /> 
                {{ exporting ? 'Loading...' : 'Excel' }}
            </Button>

            <Button variant="outline" @click="printPage">
                <PhPrinter class="mr-2 h-4 w-4" /> Cetak / PDF
            </Button>
        </div>
        
    </div>

    <div v-if="examInfo" class="bg-white p-6 rounded-lg border shadow-sm print:border-none print:shadow-none print:p-0 print:mb-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:grid-cols-2">
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Nama Ujian:</span>
                <span class="font-medium print:text-black">{{ examInfo.nama_ujian }}</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Kelas / Mapel:</span>
                <span class="font-medium print:text-black">{{ examInfo.mata_pelajaran?.nama_mapel }} ({{ examInfo.mata_pelajaran?.kelas }})</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Waktu Pelaksanaan:</span>
                <span class="font-medium print:text-black">{{ new Date(examInfo.tgl_mulai).toLocaleString() }}</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Total Peserta:</span>
                <span class="font-medium text-blue-600 print:text-black">{{ filteredParticipants.length }} Siswa</span>
            </div>
        </div>
    </div>

    <div class="border rounded-lg bg-white shadow-sm overflow-hidden print:border-black print:shadow-none">
        <Table class="print:text-sm">
            <TableHeader>
                <TableRow>
                    <TableHead class="w-[50px] text-center border-b print:border-black print:text-black print:font-bold">No</TableHead>
                    <TableHead class="border-b print:border-black print:text-black print:font-bold">Nama Siswa</TableHead>
                    <TableHead class="border-b print:border-black print:text-black print:font-bold">Username</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Kelas</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Benar</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Salah</TableHead>
                    <TableHead class="text-right border-b print:border-black print:text-black print:font-bold">Nilai</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="(row, index) in filteredParticipants" :key="row.id" class="print:border-black">
                    <TableCell class="text-center font-bold border-b print:border-black">
                        {{ index + 1 }}
                    </TableCell>
                    <TableCell class="font-medium border-b print:border-black">{{ row.user?.nama_lengkap }}</TableCell>
                    <TableCell class="text-slate-500 print:text-black border-b print:border-black">{{ row.user?.username }}</TableCell>
                    <TableCell class="text-center border-b print:border-black">
                        {{ row.user?.kelas || '-' }}
                    </TableCell>
                    <TableCell class="text-center text-green-600 font-bold print:text-black border-b print:border-black">{{ row.total_benar }}</TableCell>
                    <TableCell class="text-center text-red-500 font-bold print:text-black border-b print:border-black">{{ row.total_salah }}</TableCell>
                    
                    <TableCell class="text-right border-b print:border-black">
                        <div class="flex flex-col items-end gap-1">
                            <span class="font-bold text-lg">{{ row.nilai_akhir.toFixed(2) }}</span>
                            
                            <div class="flex items-center gap-3 print:hidden">
                                <button 
                                    class="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 font-medium transition-colors"
                                    title="Reset Ujian Siswa (Hapus Nilai)"
                                    @click="handleReset(row.id, row.user?.nama_lengkap)"
                                >
                                    <PhArrowCounterClockwise class="w-3 h-3" weight="bold" /> Reset
                                </button>

                                <button 
                                    class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors" 
                                    @click="router.push(`/admin/koreksi/${row.id}`)"
                                >
                                    <PhPencilSimple class="w-3 h-3" weight="bold" /> Koreksi
                                </button>
                            </div>

                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>

    <div class="hidden print:flex justify-end mt-10 mr-10">
        <div class="text-center">
            <p class="mb-16">
                Mengetahui,<br>
                <span contenteditable="true" class="outline-none border-b border-transparent hover:border-slate-300">
                    Guru Mata Pelajaran
                </span>
            </p>
            
            <p 
                class="font-bold underline outline-none border-b border-transparent hover:border-slate-300" 
                contenteditable="true"
            >
                ( ............................................ )
            </p>
            
            <p class="mt-1">
                NIP. 
                <span contenteditable="true" class="outline-none border-b border-transparent hover:border-slate-300">
                    .................................
                </span>
            </p>
        </div>
    </div>
  </div>
</template>

<style>
/* CSS SAMA SEPERTI SEBELUMNYA */
@media print {
    aside, header, nav, .sidebar { display: none !important; }
    main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
    .print\:hidden { display: none !important; }
    .print\:block { display: block !important; }
    .print\:flex { display: flex !important; }
    @page { size: A4; margin: 1cm; }
    body { background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>