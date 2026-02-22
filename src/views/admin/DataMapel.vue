// src/views/admin/DataMapel.vue

<script setup>
import { ref, onMounted } from 'vue'
import subjectApi from '@/api/subject' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription // <--- Jangan lupa import ini biar warning hilang
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'vue-sonner'
import { PhPlus, PhTrash } from '@phosphor-icons/vue'

const subjects = ref([])
const loading = ref(true)
const dialogOpen = ref(false)

// 1. PERBAIKAN: Tambahkan kode_mapel & jurusan di sini
const form = ref({
    kode_mapel: '', 
    nama_mapel: '',
    kelas: '',
    jurusan: 'Semua'
})

const fetchData = async () => {
    loading.value = true
    try {
        const res = await subjectApi.getAll()
        subjects.value = res.data
    } catch (error) {
        toast.error("Gagal memuat Data Akademik")
    } finally {
        loading.value = false
    }
}

const handleSubmit = async () => {
    // 2. PERBAIKAN: Validasi kode_mapel juga
    if(!form.value.kode_mapel || !form.value.nama_mapel || !form.value.kelas) {
        return toast.error("Kode, Nama, dan Kelas wajib diisi!")
    }
    
    try {
        await subjectApi.create(form.value)
        toast.success("Mapel ditambahkan")
        dialogOpen.value = false
        // Reset form
        form.value = { kode_mapel: '', nama_mapel: '', kelas: '', jurusan: 'Semua' }
        fetchData()
    } catch (error) {
        // Tampilkan pesan error dari backend (misal: Kode sudah ada)
        const msg = error.response?.data?.msg || "Gagal menyimpan"
        toast.error(msg)
    }
}

const deleteItem = async (id) => {
    if(!confirm("Hapus mapel ini?")) return
    try {
        await subjectApi.delete(id)
        toast.success("Terhapus")
        fetchData()
    } catch (e) {
        toast.error("Gagal hapus")
    }
}

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold">Data Akademik</h2>
                <p class="text-slate-500">Manajemen Mata Pelajaran</p>
            </div>
            
            <Dialog v-model:open="dialogOpen">
                <DialogTrigger as-child>
                    <Button><PhPlus class="mr-2" /> Tambah Mapel</Button>
                </DialogTrigger>
                
                <DialogContent class="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Tambah Mata Pelajaran</DialogTitle>
                        <DialogDescription>Lengkapi data mata pelajaran baru.</DialogDescription>
                    </DialogHeader>

                    <div class="space-y-4 py-4">
                        <div class="space-y-2">
                            <Label>Kode Mapel <span class="text-red-500">*</span></Label>
                            <Input v-model="form.kode_mapel" placeholder="Contoh: MTK-10" />
                        </div>

                        <div class="space-y-2">
                            <Label>Nama Mapel <span class="text-red-500">*</span></Label>
                            <Input v-model="form.nama_mapel" placeholder="Contoh: Matematika Wajib" />
                        </div>

                        <div class="space-y-2">
                            <Label>Kelas (Angka) <span class="text-red-500">*</span></Label>
                            <Input type="number" v-model="form.kelas" placeholder="10 / 11 / 12" />
                        </div>
                        
                         <div class="space-y-2">
                            <Label>Jurusan</Label>
                            <Input v-model="form.jurusan" placeholder="IPA / IPS / Semua" />
                        </div>

                        <Button class="w-full" @click="handleSubmit">Simpan</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <div class="border rounded-lg bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead class="w-[50px]">No</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Mata Pelajaran</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jurusan</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="subjects.length === 0">
                        <TableCell colspan="6" class="text-center py-8 text-slate-500">Data kosong.</TableCell>
                    </TableRow>
                    <TableRow v-for="(sub, idx) in subjects" :key="sub.id">
                        <TableCell>{{ idx + 1 }}</TableCell>
                        <TableCell class="font-mono font-bold text-xs">{{ sub.kode_mapel }}</TableCell>
                        <TableCell class="font-medium">{{ sub.nama_mapel }}</TableCell>
                        <TableCell>{{ sub.kelas }}</TableCell>
                        <TableCell>{{ sub.jurusan }}</TableCell>
                        <TableCell class="text-right">
                            <Button variant="ghost" size="icon" class="text-red-500" @click="deleteItem(sub.id)">
                                <PhTrash />
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>