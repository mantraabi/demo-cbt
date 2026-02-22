<script setup>
import { ref, onMounted, watch } from 'vue'
import studentApi from '@/api/student'
// ... import components (Button, Input, dll tetap sama) ...
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import { PhPlus, PhPencilSimple, PhTrash, PhUser, PhMicrosoftExcelLogo, PhFunnel, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const students = ref([])
const loading = ref(false)

// State Pagination & Filter
const currentPage = ref(1)
const totalPages = ref(1)
const totalStudents = ref(0)
const itemsPerPage = 10
const selectedClass = ref('ALL') 

// --- UPDATED: CLASS OPTIONS DINAMIS ---
const classOptions = ref([]) // Kosongkan dulu

// Fetch Daftar Kelas Unik dari Backend
const fetchClasses = async () => {
    try {
        const res = await studentApi.getClasses()
        classOptions.value = res.data // Isi dropdown dengan data real
    } catch (e) {
        console.error("Gagal load kelas")
    }
}
// --------------------------------------

const isDialogOpen = ref(false)
const isImportOpen = ref(false)
const isEditMode = ref(false)
const form = ref({ id: null, nama_lengkap: '', username: '', kelas: '', password: '' })
const importText = ref('')

const fetchStudents = async () => {
    loading.value = true
    try {
        const res = await studentApi.getAll({
            page: currentPage.value,
            limit: itemsPerPage,
            kelas: selectedClass.value
        })
        students.value = res.data.result
        totalPages.value = res.data.totalPages
        totalStudents.value = res.data.totalRows
    } catch (error) {
        toast.error("Gagal memuat data siswa")
    } finally {
        loading.value = false
    }
}

watch(selectedClass, () => {
    currentPage.value = 1
    fetchStudents()
})

watch(currentPage, () => {
    fetchStudents()
})

// --- CRUD Functions (Sama seperti sebelumnya) ---
const handleSubmit = async () => {
    // ... logic submit sama ...
    if(!form.value.nama_lengkap || !form.value.username || !form.value.kelas) 
        return toast.warning("Lengkapi data wajib")

    loading.value = true
    try {
        if(isEditMode.value) {
            await studentApi.update(form.value.id, form.value)
            toast.success("Data Diperbarui")
        } else {
            await studentApi.create(form.value)
            toast.success("Siswa Ditambahkan")
        }
        isDialogOpen.value = false
        fetchStudents() 
        fetchClasses() // Refresh dropdown kelas jika ada kelas baru ditambahkan
    } catch (error) {
        toast.error("Gagal simpan data")
    } finally { loading.value = false }
}

const handleImport = async () => {
    // ... logic import sama ...
    if(!importText.value) return toast.warning("Paste data dulu!")
    const lines = importText.value.trim().split('\n')
    const bulkData = []
    lines.forEach(line => {
        const parts = line.split('\t')
        if(parts.length >= 2) {
            const nama = parts[0].trim()
            const nis = parts[1].trim()
            const kls = parts[2] ? parts[2].trim() : 'Umum'
            if(nama && nis) bulkData.push({ nama_lengkap: nama, username: nis, kelas: kls })
        }
    })

    if(bulkData.length === 0) return toast.error("Format salah")

    loading.value = true
    try {
        const res = await studentApi.importData(bulkData)
        toast.success(res.data.msg)
        isImportOpen.value = false
        importText.value = ''
        fetchStudents()
        fetchClasses() // Refresh dropdown kelas
    } catch (error) {
        toast.error("Gagal Import")
    } finally { loading.value = false }
}

const handleDelete = async (id) => {
    if(!confirm("Hapus siswa ini?")) return
    try {
        await studentApi.delete(id)
        toast.success("Terhapus")
        fetchStudents()
        fetchClasses() // Refresh dropdown (siapa tahu kelas itu kosong setelah dihapus)
    } catch (e) { toast.error("Gagal hapus") }
}

// Helpers
const openAddModal = () => {
    isEditMode.value = false
    form.value = { id: null, nama_lengkap: '', username: '', kelas: '', password: '' }
    isDialogOpen.value = true
}
const openEditModal = (s) => {
    isEditMode.value = true
    form.value = { id: s.id, nama_lengkap: s.nama_lengkap, username: s.username, kelas: s.kelas, password: '' }
    isDialogOpen.value = true
}

onMounted(() => {
    fetchStudents()
    fetchClasses() // <--- Panggil saat mounted
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Data Siswa</h2>
        <p class="text-slate-500">Total: {{ totalStudents }} Siswa Terdaftar.</p>
      </div>
      
      <div class="flex gap-2">
          <Button variant="outline" class="text-green-600 border-green-200 hover:bg-green-50" @click="isImportOpen = true">
            <PhMicrosoftExcelLogo class="mr-2 h-4 w-4" weight="fill" /> Import Excel
          </Button>
          <Button @click="openAddModal">
            <PhPlus class="mr-2 h-4 w-4" weight="bold" /> Tambah Siswa
          </Button>
      </div>
    </div>

    <div class="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm max-w-md">
        <PhFunnel class="text-slate-400" />
        <span class="text-sm font-medium text-slate-600">Filter Kelas:</span>
        <Select v-model="selectedClass">
            <SelectTrigger class="w-[180px] h-8">
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

    <Dialog v-model:open="isDialogOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ isEditMode ? 'Edit Siswa' : 'Tambah Siswa' }}</DialogTitle>
                <DialogDescription>Pastikan penulisan kelas konsisten.</DialogDescription>
            </DialogHeader>
            <form @submit.prevent="handleSubmit" class="space-y-4 py-4">
                <div class="space-y-2">
                    <Label>Nama Lengkap</Label>
                    <Input v-model="form.nama_lengkap" required />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label>NIS</Label>
                        <Input v-model="form.username" required />
                    </div>
                    <div class="space-y-2">
                        <Label>Kelas</Label>
                        <Input v-model="form.kelas" placeholder="Cth: X RPL 1" required />
                    </div>
                </div>
                <div v-if="isEditMode" class="space-y-2">
                    <Label>Reset Password</Label>
                    <Input v-model="form.password" type="password" placeholder="Isi untuk ganti" />
                </div>
                <DialogFooter>
                    <Button type="submit" :disabled="loading">Simpan</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="isImportOpen">
        <DialogContent class="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Import Siswa Massal</DialogTitle>
                <DialogDescription>Format: Nama [Tab] NIS [Tab] Kelas</DialogDescription>
            </DialogHeader>
            <div class="space-y-4 py-2">
                <Textarea v-model="importText" placeholder="Paste dari Excel..." class="h-64 font-mono text-sm" />
            </div>
            <DialogFooter>
                <Button @click="handleImport" :disabled="loading">Proses Import</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <div class="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead class="w-[50px]">No</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-if="loading">
                    <TableCell colspan="5" class="text-center h-24 text-slate-500">Memuat data...</TableCell>
                </TableRow>
                
                <TableRow v-else-if="students.length === 0">
                    <TableCell colspan="5" class="text-center h-24 text-slate-500">Tidak ada data.</TableCell>
                </TableRow>

                <TableRow v-for="(student, index) in students" :key="student.id">
                    <TableCell class="text-center">
                        {{ (currentPage - 1) * itemsPerPage + index + 1 }}
                    </TableCell>
                    <TableCell class="font-medium flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <PhUser />
                        </div>
                        {{ student.nama_lengkap }}
                    </TableCell>
                    <TableCell>{{ student.username }}</TableCell>
                    <TableCell>
                        <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {{ student.kelas }}
                        </span>
                    </TableCell>
                    <TableCell class="text-right">
                        <Button variant="ghost" size="icon" class="text-blue-600" @click="openEditModal(student)"><PhPencilSimple /></Button>
                        <Button variant="ghost" size="icon" class="text-red-500" @click="handleDelete(student.id)"><PhTrash /></Button>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <div class="flex items-center justify-between p-4 border-t bg-slate-50">
            <div class="text-sm text-slate-500">
                Halaman {{ currentPage }} dari {{ totalPages }}
            </div>
            <div class="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    :disabled="currentPage === 1" 
                    @click="currentPage--"
                >
                    <PhCaretLeft class="mr-2" /> Sebelumnya
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    :disabled="currentPage === totalPages || totalPages === 0" 
                    @click="currentPage++"
                >
                    Selanjutnya <PhCaretRight class="ml-2" />
                </Button>
            </div>
        </div>
    </div>

  </div>
</template>