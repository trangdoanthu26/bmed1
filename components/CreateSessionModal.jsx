import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function CreateSessionModal({ onClose }) {
  const { createSession, devices } = useApp()
  const [form, setForm] = useState({
    patientName: '', age: '', room: '', bed: '',
    condition: '', deviceId: '', fluidType: '',
    volumeInitial: '', dropRate: '', doctor: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patientName || !form.room || !form.volumeInitial || !form.dropRate) {
      setErr('Vui lòng điền đầy đủ các trường bắt buộc.')
      return
    }
    setSaving(true)
    try {
      await createSession({
        ...form,
        age: Number(form.age),
        volumeInitial: Number(form.volumeInitial),
        volumeRemaining: Number(form.volumeInitial),
        dropRate: Number(form.dropRate),
      })
      onClose()
    } catch {
      setErr('Lỗi khi lưu phiên. Kiểm tra Backend đang chạy.')
    } finally {
      setSaving(false)
    }
  }

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-box">
        <div className="modal-head">
          <h2>Tạo phiên truyền mới</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Họ và tên <span style={{color:'red'}}>*</span></label>
            <input placeholder="" value={form.patientName} onChange={e => set('patientName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Tuổi</label>
            <input type="number" placeholder="" value={form.age} onChange={e => set('age', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phòng <span style={{color:'red'}}>*</span></label>
            <input placeholder="" value={form.room} onChange={e => set('room', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Giường</label>
            <input placeholder="" value={form.bed} onChange={e => set('bed', e.target.value)} />
          </div>
          <div className="form-group span2">
            <label>Bệnh lý / Tình trạng</label>
            <input placeholder="" value={form.condition} onChange={e => set('condition', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Thiết bị ESP32</label>
            <select value={form.deviceId} onChange={e => set('deviceId', e.target.value)}>
              <option value="">Chọn thiết bị</option>
              {devices.length > 0
                ? devices.map(d => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)
                : ['ESP32-001','ESP32-002','ESP32-003','ESP32-004','ESP32-005'].map(d =>
                    <option key={d} value={d}>{d}</option>
                  )
              }
            </select>
          </div>
          <div className="form-group">
            <label>Loại dịch</label>
            <input placeholder="VD: NaCl 0.9%, Glucose 5%" value={form.fluidType} onChange={e => set('fluidType', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Thể tích ban đầu (ml) <span style={{color:'red'}}>*</span></label>
            <input type="number" placeholder="" value={form.volumeInitial} onChange={e => set('volumeInitial', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Tốc độ truyền (giọt/phút) <span style={{color:'red'}}>*</span></label>
            <input type="number" placeholder="" value={form.dropRate} onChange={e => set('dropRate', e.target.value)} />
          </div>
          <div className="form-group span2">
            <label>Bác sĩ thực hiện</label>
            <input placeholder="" value={form.doctor} onChange={e => set('doctor', e.target.value)} />
          </div>
        </div>

        {err && (
          <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>⚠ {err}</p>
        )}

        <div className="form-submit">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu & Bắt đầu'}
          </button>
        </div>
      </div>
    </div>
  )
}
