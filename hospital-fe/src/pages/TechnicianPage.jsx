import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

const STATUS_LABEL = {
  available:  { text: 'Sẵn sàng',        color: '#16a34a', bg: '#dcfce7' },
  active:     { text: 'Đang hoạt động',  color: '#2563eb', bg: '#dbeafe' },
  error:      { text: 'Cần bảo trì',     color: '#dc2626', bg: '#fee2e2' },
  unassigned: { text: 'Chờ gán',         color: '#d97706', bg: '#fef3c7' },
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { text: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, color: s.color, background: s.bg }}>
      {s.text}
    </span>
  )
}

export default function TechnicianPage() {
  const { user, logout } = useAuth()
  const [devices, setDevices]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('all')   // 'all' | 'maintenance'
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ macAddress: '', label: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const stats = {
    total:       devices.length,
    active:      devices.filter(d => d.status === 'active').length,
    available:   devices.filter(d => d.status === 'available').length,
    maintenance: devices.filter(d => d.status === 'error').length,
  }

  const maintenanceDevices = devices.filter(d => d.status === 'error')

  const fetchDevices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/devices`)
      setDevices(res.data)
    } catch (err) {
      console.error('Lỗi tải thiết bị:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const id = setInterval(fetchDevices, 5000)
    return () => clearInterval(id)
  }, [fetchDevices])

  const handleAddDevice = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await axios.post(`${API}/devices`, form)
      setShowModal(false)
      setForm({ macAddress: '', label: '' })
      fetchDevices()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Thêm thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (device) => {
    if (!window.confirm(`Xoá thiết bị ${device.label || device.macAddress}?`)) return
    try {
      await axios.delete(`${API}/devices/${device.id}`)
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.error || 'Xoá thất bại.')
    }
  }

  const handleRepairDone = async (device) => {
    if (!window.confirm(`Xác nhận đã sửa xong thiết bị "${device.label || device.macAddress}"?\nMáy sẽ trả về trạng thái Sẵn sàng.`)) return
    setActionLoading(device.id)
    try {
      await axios.patch(`${API}/devices/${device.id}/repair-done`)
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi cập nhật.')
    } finally {
      setActionLoading(null)
    }
  }

  const tabStyle = (active, color = '#2563EB') => ({
    padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
    background: active ? color : '#F3F4F6',
    color: active ? '#fff' : '#6B7280', border: 'none',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>HỆ THỐNG</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>GIÁM SÁT TRUYỀN DỊCH</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Kỹ thuật viên</div>
          </div>
          <button onClick={logout} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', color: '#6b7280', cursor: 'pointer' }}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Quản lý thiết bị ESP32</h2>
          <button onClick={() => { setShowModal(true); setFormError('') }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Thêm thiết bị
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tổng thiết bị',   value: stats.total,       color: '#111827' },
            { label: 'Đang hoạt động',  value: stats.active,      color: '#2563EB' },
            { label: 'Sẵn sàng',        value: stats.available,   color: '#16a34a' },
            { label: 'Cần bảo trì',     value: stats.maintenance, color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button style={tabStyle(tab === 'all')} onClick={() => setTab('all')}>Tất cả thiết bị</button>
          <button style={tabStyle(tab === 'maintenance', '#DC2626')} onClick={() => setTab('maintenance')}>
            🔧 Cần bảo trì {stats.maintenance > 0 && `(${stats.maintenance})`}
          </button>
        </div>

        {/* Bảng thiết bị */}
        {tab === 'all' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
            ) : devices.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Chưa có thiết bị nào.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['MAC Address', 'Nhãn', 'Phòng', 'Giường', 'Trạng thái', 'Ngày thêm', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 13 }}>{d.macAddress}</td>
                      <td style={{ padding: '11px 14px', color: '#374151' }}>{d.label || '—'}</td>
                      <td style={{ padding: '11px 14px', color: '#6b7280' }}>{d.locationRoom || '—'}</td>
                      <td style={{ padding: '11px 14px', color: '#6b7280' }}>{d.locationBed || '—'}</td>
                      <td style={{ padding: '11px 14px' }}><StatusBadge status={d.status} /></td>
                      <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '11px 14px', display: 'flex', gap: 6 }}>
                        {d.status !== 'active' && (
                          <button onClick={() => handleDelete(d)} style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#dc2626', background: '#fff', cursor: 'pointer' }}>
                            Xoá
                          </button>
                        )}
                        {d.status === 'error' && (
                          <button
                            disabled={actionLoading === d.id}
                            onClick={() => handleRepairDone(d)}
                            style={{ padding: '4px 10px', border: '1px solid #86efac', borderRadius: 6, fontSize: 12, color: '#16a34a', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                          >
                            {actionLoading === d.id ? '...' : '✓ Sửa xong'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab bảo trì */}
        {tab === 'maintenance' && (
          <div>
            {maintenanceDevices.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#6b7280' }}>
                Không có thiết bị nào cần bảo trì 🎉
              </div>
            ) : maintenanceDevices.map(d => (
              <div key={d.id} style={{
                background: '#fff', borderRadius: 12, border: '1.5px solid #FCA5A5',
                padding: '16px 20px', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{d.label || d.macAddress}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginTop: 2 }}>{d.macAddress}</div>
                  {d.locationRoom && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>📍 {d.locationRoom} — {d.locationBed}</div>}
                  <div style={{ marginTop: 6, padding: '4px 10px', background: '#FEF2F2', borderRadius: 6, display: 'inline-block', fontSize: 12, color: '#DC2626' }}>
                    ⚠ Lỗi thiết bị — cần kiểm tra
                  </div>
                </div>
                <button
                  disabled={actionLoading === d.id}
                  onClick={() => handleRepairDone(d)}
                  style={{ padding: '9px 18px', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: '#16A34A', color: '#fff' }}
                >
                  {actionLoading === d.id ? 'Đang cập nhật...' : '✓ Sửa xong → Sẵn sàng'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal thêm thiết bị */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>Thêm thiết bị ESP32</h3>
            <form onSubmit={handleAddDevice}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  MAC Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text" value={form.macAddress}
                  onChange={e => setForm(f => ({ ...f, macAddress: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF" required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nhãn gợi nhớ (tuỳ chọn)</label>
                <input
                  type="text" value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="VD: ESP32 phòng ICU"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              {formError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{formError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#374151', cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '10px', background: submitting ? '#93c5fd' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Đang thêm...' : 'Thêm thiết bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
