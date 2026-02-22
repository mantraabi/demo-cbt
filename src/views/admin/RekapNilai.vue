<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import examApi from '@/api/exam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PhMagnifyingGlass, PhChartBar } from '@phosphor-icons/vue'

const router = useRouter()
const historyList = ref([])
const search = ref('')
const loading = ref(false)

const fetchData = async () => {
    loading.value = true
    try {
        const res = await examApi.getHistory()
        historyList.value = res.data
    } finally {
        loading.value = false
    }
}

// Filter Pencarian Sederhana
const filteredList = () => {
    if (!search.value) return historyList.value
    return historyList.value.filter(item => 
        item.nama_ujian.toLowerCase().includes(search.value.toLowerCase()) ||
        item.mapel.toLowerCase().includes(search.value.toLowerCase())
    )
}

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-bold tracking-tight text-slate-900">Rekap Nilai</h2>
                <p class="text-slate-500">Arsip hasil ujian yang telah dilaksanakan.</p>
            </div>
        </div>

        <div class="flex items-center space-x-2 max-w-sm">
            <PhMagnifyingGlass class="text-slate-400" />
            <Input v-model="search" placeholder="Cari nama ujian atau mapel..." />
        </div>

        <div class="border rounded-lg bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Ujian</TableHead>
                        <TableHead>Mapel & Kelas</TableHead>
                        <TableHead>Tanggal Selesai</TableHead>
                        <TableHead class="text-center">Peserta Submit</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="item in filteredList()" :key="item.id">
                        <TableCell class="font-medium">
                            {{ item.nama_ujian }}
                            <Badge variant="secondary" class="ml-2 text-[10px]">{{ item.jenis_ujian }}</Badge>
                        </TableCell>
                        <TableCell>{{ item.mapel }} ({{ item.kelas }})</TableCell>
                        <TableCell>{{ new Date(item.tgl_selesai).toLocaleDateString() }}</TableCell>
                        <TableCell class="text-center">
                            <Badge variant="outline" class="bg-blue-50 text-blue-700 border-blue-200">
                                {{ item.jumlah_peserta }} Siswa
                            </Badge>
                        </TableCell>
                        <TableCell class="text-right">
                            <Button size="sm" @click="router.push(`/admin/exams/${item.id}/results`)">
                                <PhChartBar class="mr-2" /> Detail Nilai
                            </Button>
                        </TableCell>
                    </TableRow>
                    
                    <TableRow v-if="filteredList().length === 0">
                        <TableCell colspan="5" class="text-center h-24 text-slate-500">Tidak ada data ditemukan.</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>