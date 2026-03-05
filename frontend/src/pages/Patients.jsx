import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientService } from '../services/patientService'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'

const FORM_DEFAULTS = {
    name: '', age: '', gender: 'male', insurance: 'independent',
    surgery: 'no', room_class: 'class1', admission_type: 'emergency',
    severity_score: 'moderate', test_result: 'abnormal',
}

const SELECT_OPTS = {
    gender: ['male', 'female'],
    insurance: ['independent', 'governance insurance'],
    surgery: ['no', 'yes'],
    room_class: ['class3', 'class2', 'class1', 'vip', 'vvip'],
    admission_type: ['urgent', 'emergency'],
    severity_score: ['mild', 'moderate', 'severe', 'critical'],
    test_result: ['normal', 'abnormal'],
}

export default function Patients() {
    const qc = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [modalType, setModalType] = useState(null) // 'create' | 'edit' | 'delete'
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(FORM_DEFAULTS)

    const { data, isLoading } = useQuery({
        queryKey: ['patients', page, search],
        queryFn: () => patientService.list({ page, limit: 50, search }),
        keepPreviousData: true,
    })

    const createMut = useMutation({
        mutationFn: (d) => patientService.create(d),
        onSuccess: () => { qc.invalidateQueries(['patients']); setModalType(null) },
    })

    const updateMut = useMutation({
        mutationFn: ({ id, d }) => patientService.update(id, d),
        onSuccess: () => { qc.invalidateQueries(['patients']); setModalType(null) },
    })

    const deleteMut = useMutation({
        mutationFn: (id) => patientService.delete(id),
        onSuccess: () => { qc.invalidateQueries(['patients']); setModalType(null) },
    })

    const openCreate = () => { setForm(FORM_DEFAULTS); setModalType('create') }
    const openEdit = (p) => { setSelected(p); setForm({ name: p.name, age: p.age, gender: p.gender, ...FORM_DEFAULTS }); setModalType('edit') }
    const openDelete = (p) => { setSelected(p); setModalType('delete') }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (modalType === 'create') createMut.mutate({ ...form, age: Number(form.age) })
        else updateMut.mutate({ id: selected.id, d: { ...form, age: Number(form.age) } })
    }

        return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Patients</h1>
                    <p className="text-gray-400 text-sm">Manage patient records and HGO results</p>
                </div>
                <Button onClick={openCreate}>+ Add Patient</Button>
            </div>

            {/* Search */}
            <input
                className="input max-w-sm"
                placeholder="Search by name or patient code…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Spinner size={8} /></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th><th>Name</th><th>Age</th><th>Gender</th>
                                    <th>Output</th><th>HGOd Index</th><th>Rank</th><th>Priority</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-mono text-xs text-primary-400">{p.patient_code}</td>
                                        <td className="font-medium text-white">{p.name}</td>
                                        <td>{p.age}</td>
                                        <td className="capitalize">{p.gender}</td>
                                        <td>{p.hgo_result?.output_score?.toFixed(4) ?? '—'}</td>
                                        <td className="font-mono text-xs">{p.hgo_result?.hgod_index?.toFixed(6) ?? '—'}</td>
                                        <td>{p.hgo_result?.rank ?? '—'}</td>
                                        <td>{p.hgo_result ? <Badge level={['Critical', 'High', 'Medium', 'Low'][Math.floor((p.hgo_result.rank - 1) / Math.ceil(data?.meta?.total / 4))] || 'Low'} /> : '—'}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(p)} className="text-xs text-primary-400 hover:text-primary-300">Edit</button>
                                                <button onClick={() => openDelete(p)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {data?.meta && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Total: {data.meta.total} patients</span>
                    <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />
                </div>
            )}

            {/* Create / Edit Modal */}
            <Modal
                open={modalType === 'create' || modalType === 'edit'}
                onClose={() => setModalType(null)}
                title={modalType === 'create' ? 'Add Patient' : 'Edit Patient'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                            {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="label">Name</label>
                        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="label">Age</label>
                        <input type="number" className="input" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} min={0} max={150} required />
                    </div>
                    {Object.entries(SELECT_OPTS).map(([field, opts]) => (
                        <div key={field}>
                            <label className="label capitalize">{field.replace('_', ' ')}</label>
                            <select className="input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                open={modalType === 'delete'}
                onClose={() => setModalType(null)}
                title="Delete Patient"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
                        <Button variant="danger" onClick={() => deleteMut.mutate(selected?.id)} disabled={deleteMut.isPending}>
                            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p>Are you sure you want to delete <strong className="text-white">{selected?.name}</strong>? This cannot be undone.</p>
            </Modal>
        </div>
    )
}
