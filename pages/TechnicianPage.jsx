import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:8000/api'

const STATUS_LABEL = {
  available:  { text: 'Sẵn sàng',   color: '#16a34a', bg: '#dcfce7' },
  active:     { text: 'Đang dùng',  color: '#2563eb', bg: '#dbeafe' },
  error:      { text: 'Lỗi',        color: '#dc2626', bg: '#fee2e2' },
  unassigned: { text: 'Chờ gán',    color: '#d97706', bg: '#fef3c7' },
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { text: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 500,
      color: s.color, background: s.bg,
    }}>{s.text}</span>
  )
}

export default function TechnicianPage() {
  const { user, logout } = useAuth()
  const [devices, setDevices]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ macAddress: '', label: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // Stats
  const stats = {
    total:     devices.length,
    active:    devices.filter(d => d.status === 'active').length,
    available: devices.filter(d => d.status === 'available').length,
    error:     devices.filter(d => d.status === 'error').length,
  }

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

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#2563EB', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⚡</div>
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
          <button
            onClick={logout}
            style={{
              padding: '6px 14px', border: '1px solid #e5e7eb',
              borderRadius: 8, fontSize: 13, background: '#fff',
              color: '#6b7280', cursor: 'pointer',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
            Quản lý thiết bị ESP32
          </h2>
          <button
            onClick={() => { setShowModal(true); setFormError('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', background: '#2563EB',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Thêm thiết bị
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tổng thiết bị',  value: stats.total,     color: '#111827' },
            { label: 'Đang hoạt động', value: stats.active,    color: '#2563EB' },
            { label: 'Sẵn sàng',       value: stats.available, color: '#16a34a' },
            { label: 'Lỗi',            value: stats.error,     color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 10,
              border: '1px solid #e5e7eb', padding: '14px 18px',
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
          ) : devices.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Chưa có thiết bị nào. Nhấn "Thêm thiết bị" để bắt đầu.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['MAC Address', 'Nhãn', 'Phòng', 'Giường', 'Trạng thái', 'Ngày thêm', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 12, color: '#6b7280', fontWeight: 500,
                      borderBottom: '1px solid #e5e7eb',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 13 }}>
                      {d.macAddress}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>
                      {d.label || '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#6b7280' }}>
                      {d.locationRoom || '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#6b7280' }}>
                      {d.locationBed || '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>
                      {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {d.status !== 'active' && (
                        <button
                          onClick={() => handleDelete(d)}
                          style={{
                            padding: '4px 10px', border: '1px solid #fca5a5',
                            borderRadius: 6, fontSize: 12,
                            color: '#dc2626', background: '#fff', cursor: 'pointer',
                          }}
                        >
                          Xoá
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal thêm thiết bị */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16,
            padding: '32px 28px', width: 420,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
              Thêm thiết bị ESP32
            </h3>
            <form onSubmit={handleAddDevice}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  MAC Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.macAddress}
                  onChange={e => setForm(f => ({ ...f, macAddress: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  required
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: 14, boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Nhãn gợi nhớ (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="VD: ESP32 phòng ICU"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: 14, boxSizing: 'border-box',
                  }}
                />
              </div>
              {formError && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: 13, marginBottom: 16,
                }}>{formError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '10px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: 14, background: '#fff',
                    color: '#374151', cursor: 'pointer',
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '10px',
                    background: submitting ? '#93c5fd' : '#2563EB',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 500,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
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
