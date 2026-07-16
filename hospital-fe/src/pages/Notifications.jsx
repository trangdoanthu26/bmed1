import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const API = (import.meta.env.VITE_API_URL || 'https://bmed1-1.onrender.com') + '/api'
async function apiFetch(path) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error('Loi tai du lieu')
  return res.json()
}

// Tách số % lệch tốc độ và hướng (chậm hơn/nhanh hơn) từ message backend sinh ra
// VD message: "LOI TOC DO: TB 50s cham hon 20.5% (do:32.0 y-lenh:40 giot/phut)"
function parseTocDo(message) {
  const m = /(cham hon|nhanh hon)\s+([\d.]+)%/.exec(message || '')
  if (!m) return null
  return { huong: m[1] === 'cham hon' ? 'chậm hơn' : 'nhanh hơn', pct: m[2] }
}
// VD message: "CANH BAO: Dich sap het — con 15.3 ml"
function parseSapHet(message) {
  const m = /con\s+([\d.]+)\s*ml/.exec(message || '')
  return m ? m[1] : null
}
function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleString('vi-VN') : ''
}

export default function Notifications() {
  const { alerts, devices, handleAlertAction } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('toc-do')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const sapHetAlerts = alerts?.filter(a => a.alert_type === 'sap_het') || []
  const tocDoAlerts = alerts?.filter(a => a.alert_type === 'loi_toc_do') || []
  const baoTriDevices = devices?.filter(d => d.status === 'error') || []

  useEffect(() => {
    if (activeTab !== 'lich-su') return
    setHistoryLoading(true)
    apiFetch('/alerts/history')
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [activeTab])

  const triggerAction = async (e, sessionId, action, alertId, deviceId) => {
    e.stopPropagation()
    if (window.confirm('Bạn có chắc chắn muốn thực hiện thao tác này?')) {
      await handleAlertAction({ session_id: sessionId, action, alert_id: alertId, device_id: deviceId })
    }
  }

  const goToPatient = () => navigate('/benh-nhan')

  return (
    <div className="main-content" style={{ padding: '24px' }}>
      <div className="section-hdr" style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
        Trung tâm thông báo & Phân loại xử lý
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', paddingBottom: '1px' }}>
        <button
          onClick={() => setActiveTab('toc-do')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'toc-do' ? '#ef4444' : '#64748b',
            borderBottom: activeTab === 'toc-do' ? '3px solid #ef4444' : 'none'
          }}
        >
          Tốc độ bất thường ({tocDoAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('sap-het')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'sap-het' ? '#f97316' : '#64748b',
            borderBottom: activeTab === 'sap-het' ? '3px solid #f97316' : 'none'
          }}
        >
          Sắp hết dịch ({sapHetAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('bao-tri')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'bao-tri' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'bao-tri' ? '3px solid #3b82f6' : 'none'
          }}
        >
          Thiết bị cần bảo trì ({baoTriDevices.length})
        </button>
        <button
          onClick={() => setActiveTab('lich-su')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'lich-su' ? '#475569' : '#64748b',
            borderBottom: activeTab === 'lich-su' ? '3px solid #475569' : 'none'
          }}
        >
          🕘 Lịch sử xử lý
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>

        {/* TAB 1: TỐC ĐỘ BẤT THƯỜNG */}
        {activeTab === 'toc-do' && (
          tocDoAlerts.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Không có cảnh báo tốc độ nào.</p> :
          tocDoAlerts.map(alert => {
            const info = parseTocDo(alert.message)
            return (
              <div key={alert.id} onClick={goToPatient}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    {alert.patientName} <span style={{ fontWeight: 400, color: '#64748b' }}>— Phòng {alert.room || '—'}, Giường {alert.bed || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ Tốc độ {info ? `${info.huong} ${info.pct}%` : 'bất thường'} so với y lệnh
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    🔌 Thiết bị: {alert.deviceLabel || alert.deviceId} · {fmtTime(alert.triggered_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={(e) => triggerAction(e, alert.session_id, 'Loi_Thiet_Bi', alert.id, alert.deviceId)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Lỗi thiết bị</button>
                </div>
              </div>
            )
          })
        )}

        {/* TAB 2: SẮP HẾT DỊCH */}
        {activeTab === 'sap-het' && (
          sapHetAlerts.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Không có thiết bị nào sắp hết dịch.</p> :
          sapHetAlerts.map(alert => {
            const conLai = parseSapHet(alert.message)
            return (
              <div key={alert.id} onClick={goToPatient}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    {alert.patientName} <span style={{ fontWeight: 400, color: '#64748b' }}>— Phòng {alert.room || '—'}, Giường {alert.bed || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>
                    ⏳ Dịch truyền sắp hết — còn {conLai ?? '?'} ml
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    🔌 Thiết bị: {alert.deviceLabel || alert.deviceId} · {fmtTime(alert.triggered_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={(e) => triggerAction(e, alert.session_id, 'Ket_Thuc_Phien', alert.id, alert.deviceId)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Kết thúc phiên</button>
                  <button onClick={(e) => triggerAction(e, alert.session_id, 'Loi_Thiet_Bi', alert.id, alert.deviceId)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Lỗi thiết bị</button>
                </div>
              </div>
            )
          })
        )}

        {/* TAB 3: THIẾT BỊ CẦN BẢO TRÌ */}
        {activeTab === 'bao-tri' && (
          baoTriDevices.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Kho sạch sẽ. Không có thiết bị nào lỗi phần cứng.</p> :
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>
                <th style={{ padding: '10px' }}>Tên thiết bị</th>
                <th style={{ padding: '10px' }}>Địa chỉ MAC</th>
                <th style={{ padding: '10px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {baoTriDevices.map(dev => (
                <tr key={dev.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <td style={{ padding: '12px 10px', fontWeight: '500' }}>{dev.label || 'ESP32_Sensor'}</td>
                  <td style={{ padding: '12px 10px', color: '#64748b' }}>{dev.macAddress || 'Chưa rõ'}</td>
                  <td style={{ padding: '12px 10px' }}><span style={{ padding: '4px 8px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>Cần kỹ thuật viên xử lý</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* TAB 4: LỊCH SỬ XỬ LÝ */}
        {activeTab === 'lich-su' && (
          historyLoading ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Đang tải...</p> :
          history.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Chưa có cảnh báo nào được xử lý.</p> :
          history.map(alert => {
            const isTocDo = alert.alert_type === 'loi_toc_do'
            const info = isTocDo ? parseTocDo(alert.message) : null
            const conLai = !isTocDo ? parseSapHet(alert.message) : null
            return (
              <div key={alert.id} onClick={goToPatient}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    {alert.patientName} <span style={{ fontWeight: 400, color: '#64748b' }}>— Phòng {alert.room || '—'}, Giường {alert.bed || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                    {isTocDo
                      ? `⚠️ Tốc độ ${info ? `${info.huong} ${info.pct}%` : 'bất thường'} so với y lệnh`
                      : `⏳ Đã sắp hết dịch — còn ${conLai ?? '?'} ml lúc báo`}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    🔌 {alert.deviceLabel || alert.deviceId} · Xảy ra lúc {fmtTime(alert.triggered_at)}
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                    ✓ Đã xử lý lúc {fmtTime(alert.handled_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}