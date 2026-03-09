import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientService } from '../services/patientService'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { ToastContainer, useToast } from '../components/ui/Toast'

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
    const { toasts, addToast, removeToast } = useToast()

    // ── State ────────────────────────────────────────────────────────────────
    const [tab, setTab] = useState('active') // 'active' | 'archived'
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [modalType, setModalType] = useState(null)
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(FORM_DEFAULTS)

    // Selection state
    const [checkedIds, setCheckedIds] = useState(new Set())
    const lastCheckedIdx = useRef(null)

    // Delete confirmation for bulk
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

    // ── Queries ──────────────────────────────────────────────────────────────
    const queryKey = tab === 'active' ? ['patients', page, search] : ['patients-archived', page, search]
    const queryFn = tab === 'active'
        ? () => patientService.list({ page, limit: 50, search })
        : () => patientService.listArchived({ page, limit: 50, search })

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn,
        keepPreviousData: true,
    })

    const patients = data?.data || []

    // ── Reset on tab change ──────────────────────────────────────────────────
    const switchTab = (t) => {
        setTab(t)
        setPage(1)
        setSearch('')
        setCheckedIds(new Set())
        lastCheckedIdx.current = null
    }

    // ── Checkbox helpers ─────────────────────────────────────────────────────
    const isAllSelected = patients.length > 0 && patients.every(p => checkedIds.has(p.id))

    const toggleAll = () => {
        if (isAllSelected) {
            setCheckedIds(new Set())
        } else {
            setCheckedIds(new Set(patients.map(p => p.id)))
        }
        lastCheckedIdx.current = null
    }

    const toggleRow = (id, index, e) => {
        setCheckedIds(prev => {
            const next = new Set(prev)
            if (e.shiftKey && lastCheckedIdx.current !== null) {
                const start = Math.min(lastCheckedIdx.current, index)
                const end = Math.max(lastCheckedIdx.current, index)
                for (let i = start; i <= end; i++) {
                    next.add(patients[i].id)
                }
            } else {
                if (next.has(id)) next.delete(id)
                else next.add(id)
            }
            return next
        })
        lastCheckedIdx.current = index
    }

    const clearSelection = () => {
        setCheckedIds(new Set())
        lastCheckedIdx.current = null
    }

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidateAll = () => {
        qc.invalidateQueries(['patients'])
        qc.invalidateQueries(['patients-archived'])
    }

    const createMut = useMutation({
        mutationFn: (d) => patientService.create(d),
        onSuccess: () => { invalidateAll(); setModalType(null); addToast('Patient created successfully') },
        onError: (e) => addToast(e?.response?.data?.detail || 'Failed to create patient', 'error'),
    })

    const updateMut = useMutation({
        mutationFn: ({ id, d }) => patientService.update(id, d),
        onSuccess: () => { invalidateAll(); setModalType(null); addToast('Patient updated successfully') },
        onError: (e) => addToast(e?.response?.data?.detail || 'Failed to update patient', 'error'),
    })

    const deleteMut = useMutation({
        mutationFn: (id) => patientService.delete(id),
        onSuccess: () => { invalidateAll(); setModalType(null); addToast('Patient deleted') },
        onError: (e) => addToast(e?.response?.data?.detail || 'Failed to delete patient', 'error'),
    })

    const archiveMut = useMutation({
        mutationFn: (id) => patientService.archive(id),
        onSuccess: () => { invalidateAll(); addToast('Patient archived') },
        onError: (e) => addToast(e?.response?.data?.detail || 'Failed to archive patient', 'error'),
    })

    const restoreMut = useMutation({
        mutationFn: (id) => patientService.restore(id),
        onSuccess: () => { invalidateAll(); addToast('Patient restored') },
        onError: (e) => addToast(e?.response?.data?.detail || 'Failed to restore patient', 'error'),
    })

    const bulkMut = useMutation({
        mutationFn: ({ ids, action }) => patientService.bulkAction(ids, action),
        onSuccess: (res, vars) => {
            invalidateAll()
            clearSelection()
            setBulkDeleteConfirm(false)
            const verb = vars.action === 'archive' ? 'archived' : 'deleted'
            addToast(`${res.affected} patient(s) ${verb}`)
        },
        onError: (e) => {
            setBulkDeleteConfirm(false)
            addToast(e?.response?.data?.detail || 'Bulk action failed', 'error')
        },
    })

    // ── Form handlers ────────────────────────────────────────────────────────
    const openCreate = () => { setForm(FORM_DEFAULTS); setModalType('create') }
    const openEdit = (p) => { setSelected(p); setForm({ name: p.name, age: p.age, gender: p.gender, ...FORM_DEFAULTS }); setModalType('edit') }
    const openDelete = (p) => { setSelected(p); setModalType('delete') }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (modalType === 'create') createMut.mutate({ ...form, age: Number(form.age) })
        else updateMut.mutate({ id: selected.id, d: { ...form, age: Number(form.age) } })
    }

    // ── Bulk actions ─────────────────────────────────────────────────────────
    const selectedIds = [...checkedIds]

    const handleBulkArchive = () => bulkMut.mutate({ ids: selectedIds, action: 'archive' })
    const handleBulkDelete = () => setBulkDeleteConfirm(true)
    const confirmBulkDelete = () => bulkMut.mutate({ ids: selectedIds, action: 'delete' })

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Patients</h1>
                    <p className="text-gray-400 text-sm">Manage patient records and HGO results</p>
                </div>
                {tab === 'active' && <Button onClick={openCreate}>+ Add Patient</Button>}
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="tab-group">
                    <button className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => switchTab('active')}>
                        Active
                    </button>
                    <button className={`tab-btn ${tab === 'archived' ? 'active' : ''}`} onClick={() => switchTab('archived')}>
                        Archived
                    </button>
                </div>
                <input
                    className="input max-w-sm"
                    placeholder="Search by name or patient code…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Spinner size={8} /></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            className="custom-checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th>Code</th><th>Name</th><th>Age</th><th>Gender</th>
                                    <th>Output</th><th>HGOd Index</th><th>Rank</th><th>Priority</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((p, idx) => (
                                    <tr key={p.id} className={tab === 'archived' ? 'row-archived' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="custom-checkbox"
                                                checked={checkedIds.has(p.id)}
                                                onChange={(e) => toggleRow(p.id, idx, e)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
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
                                                {tab === 'active' ? (
                                                    <>
                                                        <button onClick={() => openEdit(p)} className="text-xs text-primary-400 hover:text-primary-300">Edit</button>
                                                        <button onClick={() => archiveMut.mutate(p.id)} className="text-xs text-yellow-400 hover:text-yellow-300" disabled={archiveMut.isPending}>Archive</button>
                                                        <button onClick={() => openDelete(p)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => restoreMut.mutate(p.id)} className="text-xs text-emerald-400 hover:text-emerald-300" disabled={restoreMut.isPending}>
                                                        ↺ Restore
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {patients.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-8 text-gray-500">
                                            {tab === 'archived' ? 'No archived patients' : 'No patients found'}
                                        </td>
                                    </tr>
                                )}
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

            {/* ── Floating Action Bar ─────────────────────────────────────── */}
            {checkedIds.size > 0 && (
                <div className="floating-action-bar">
                    <span className="fab-count">{checkedIds.size} patient{checkedIds.size > 1 ? 's' : ''} selected</span>
                    <div className="fab-divider" />
                    {tab === 'active' && (
                        <Button size="sm" variant="secondary" onClick={handleBulkArchive} disabled={bulkMut.isPending}>
                            Archive
                        </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={handleBulkDelete} disabled={bulkMut.isPending}>
                        Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                        Deselect
                    </Button>
                </div>
            )}

            {/* ── Bulk Delete Confirmation Modal ──────────────────────────── */}
            <Modal
                open={bulkDeleteConfirm}
                onClose={() => setBulkDeleteConfirm(false)}
                title="Delete Selected Patients"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmBulkDelete} disabled={bulkMut.isPending}>
                            {bulkMut.isPending ? 'Deleting…' : `Delete ${checkedIds.size} patient${checkedIds.size > 1 ? 's' : ''}`}
                        </Button>
                    </>
                }
            >
                <p>Are you sure you want to delete <strong className="text-white">{checkedIds.size} patient{checkedIds.size > 1 ? 's' : ''}</strong>? They will be soft-deleted and hidden from all views.</p>
            </Modal>

            {/* ── Create / Edit Modal ─────────────────────────────────────── */}
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

            {/* ── Single Delete Modal ─────────────────────────────────────── */}
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
                <p>Are you sure you want to delete <strong className="text-white">{selected?.name}</strong>? The record will be soft-deleted.</p>
            </Modal>

            {/* ── Toasts ──────────────────────────────────────────────────── */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
