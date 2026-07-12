import { useState, useEffect, useRef } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useApp } from '../context/AppContext'

const API = import.meta.env.VITE_API_URL || 'https://bmed1-1.onrender.com'

async function apiFetch(url, opts = {}) {
  // Lấy token từ bộ nhớ (Nhóm bạn thường lưu tên là 'token' hoặc 'accessToken')
  const token = localStorage.getItem('token'); 

  // Tạo header chứa token mang đi báo danh
  const headers = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`; // Nhét thẻ ID vào đây
  }

  // Gửi request kèm theo gói opts đã được thêm headers
  const res = await fetch(API + url, { ...opts, headers });
  
  if (!res.ok) {
     const errData = await res.json().catch(() => ({}));
     throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

function groupByPatient(sessions) {
  const map = {}
  sessions.forEach(s => {
    const key = s.phone ? `phone:${s.phone}` : `name:${s.patientName}`
    if (!map[key]) map[key] = { key, patientName: s.patientName, phone: s.phone || null, sessions: [], fluidTypes: new Set() }
    map[key].sessions.push(s)
    if (!map[key]._latest || new Date(s.createdAt) > new Date(map[key]._latest)) {
      map[key]._latest = s.createdAt
      map[key].patientName = s.patientName
    }
    if (s.fluidType) map[key].fluidTypes.add(s.fluidType)
  })
  return Object.values(map)
}

// ── Chi tiết bệnh nhân ─────────────────────────────────────────────────────
function PatientDetail({ session, onBack, readOnly }) {
  const [chart, setChart]   = useState([])
  const [live, setLive]     = useState({
    dropRate:        session.dropRate        ?? 0,
    volumeRemaining: session.volumeRemaining ?? session.volumeInitial ?? 0,
    remainingTime:   session.remainingTime   ?? null,
  })
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const timerRef = useRef(null)

  const prescribed = parseFloat(session.prescribedDropRate ?? session.dropRate ?? 0)
  const upper      = +(prescribed * 1.15).toFixed(1)
  const lower      = +(prescribed * 0.85).toFixed(1)
  const isLechTocDo = live.dropRate > 0 && prescribed > 0 &&
    Math.abs(live.dropRate - prescribed) / prescribed >= 0.15

  const fetchMetrics = async () => {
    try {
      // Phiên đã kết thúc (xem lịch sử) → lấy toàn bộ dữ liệu (?full=1) vì sẽ không có thêm điểm mới nữa
      const qs = readOnly ? '?full=1' : ''
      const resData = await apiFetch(`/api/sessions/${session.id}/metrics${qs}`)
      const data = Array.isArray(resData) ? resData : (resData.data || []);

      if (data.length > 0) {
        const pts = data.map(p => ({
          time:   new Date(p.recorded_at || p.recordedAt).getTime(),
          tocDo:  Number(p.current_drop_rate || p.currentDropRate) || 0,
          theeTich: parseFloat(((Number(p.current_weight || p.currentWeight) || 0) - 30).toFixed(1)),
          conLai: p.remaining_time || p.remainingTime,
        }))
        setChart(pts)
        if (!readOnly) {
          const last = pts[pts.length - 1]
          setLive({ dropRate: last.tocDo, volumeRemaining: last.theeTich, remainingTime: last.conLai })
        }
      }
    } catch (e) {
        console.error("Lỗi khi kéo dữ liệu biểu đồ:", e)
    }
    finally { setLoading(false) }
  }
  useEffect(() => {
    fetchMetrics()
    if (!readOnly) {
      timerRef.current = setInterval(fetchMetrics, 5000)
      return () => clearInterval(timerRef.current)
    }
  }, [session.id])

  const handleEnd = async () => {
    if (!confirm('Xác nhận kết thúc truyền dịch?')) return
    setActionLoading(true)
    try { await apiFetch(`/api/sessions/${session.id}/end`, { method: 'PATCH' }); onBack() }
    catch (e) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  const handleError = async () => {
    if (!confirm('Xác nhận báo lỗi thiết bị?')) return
    setActionLoading(true)
    try { await apiFetch(`/api/sessions/${session.id}/error`, { method: 'PATCH' }); fetchMetrics() }
    catch (e) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  const fmtTime = ts => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
  const fmtDateTime = ts => ts ? new Date(ts).toLocaleString('vi-VN') : '—'

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <button className="back-btn" onClick={onBack}>← Quay lại</button>
        {readOnly ? (
          <span style={{ padding: '5px 12px', borderRadius: 999, background: '#f3f4f6', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
            📁 Phiên đã kết thúc — chỉ xem lại
          </span>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleError} disabled={actionLoading}
              style={{ background:'#DC2626', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              ⚠ Báo lỗi thiết bị
            </button>
            <button onClick={handleEnd} disabled={actionLoading}
              style={{ background:'#374151', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              ✓ Kết thúc truyền
            </button>
          </div>
        )}
      </div>

      {/* Thông tin 2 cột */}
      <div className="detail-grid">
        <div className="detail-section">
          <h3>Thông tin bệnh nhân</h3>
          {[
            ['Họ và tên:',  session.patientName],
            ['Số điện thoại:', session.phone ?? '—'],
            ['Tuổi:',       session.age       ?? '—'],
            ['Phòng:',      session.room      ?? '—'],
            ['Giường:',     session.bed       ?? '—'],
            ['Bệnh lý:',    session.condition ?? '—'],
            ['Bác sĩ:',     session.doctor    ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="detail-row">
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>

        <div className="detail-section">
          <h3>Thông tin truyền dịch</h3>
          {[
            ['Loại dịch:',        session.fluidType  ?? '—',                          ''],
            ['Thiết bị:',         session.deviceLabel || session.deviceId || '—',    ''],
            ['Bắt đầu lúc:',      fmtDateTime(session.createdAt),                     ''],
            ...(readOnly ? [['Kết thúc lúc:', fmtDateTime(session.endAt), '']] : []),
            ['Tốc độ mục tiêu:',  `${prescribed} giọt/phút`,                          'blue'],
            [readOnly ? 'Tốc độ cuối cùng:' : 'Tốc độ hiện tại:',  `${live.dropRate} giọt/phút`,  isLechTocDo ? 'red' : 'green'],
            ['Thể tích còn lại:', `${live.volumeRemaining} ml`,                       ''],
            ...(!readOnly ? [['Thời gian còn lại:', live.remainingTime ? `~${live.remainingTime} phút` : '—', '']] : []),
          ].map(([k, v, c]) => (
            <div key={k} className="detail-row">
              <span className="k">{k}</span>
              <span className={`v ${c}`}>{v}</span>
            </div>
          ))}
          {session.manualError && (
            <div className="detail-row">
              <span className="k">⚠ Cảnh báo:</span>
              <span className="v red">Có lỗi thiết bị chưa xử lý</span>
            </div>
          )}
        </div>
      </div>

      {/* Biểu đồ tốc độ */}
      <div className="chart-card">
        <h3>Biểu đồ tốc độ truyền theo thời gian</h3>
        <div style={{ width:'100%', height:260 }}>
          {loading && chart.length === 0
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF' }}>Đang tải dữ liệu...</div>
            : chart.length === 0
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF' }}>Không có dữ liệu đo cho phiên này.</div>
            : (
              <ResponsiveContainer>
                <ComposedChart data={chart} margin={{ top:10, right:20, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tickFormatter={fmtTime} tick={{ fontSize:11, fill:'#9CA3AF' }} />
                  <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} label={{ value:'giọt/phút', angle:-90, position:'insideLeft', style:{ fontSize:11, fill:'#9CA3AF' } }} domain={[0, prescribed * 2 || 120]} />
                  <Tooltip labelFormatter={ts => new Date(ts).toLocaleTimeString('vi-VN')} formatter={v => [`${v} giọt/phút`, 'Tốc độ']} />
                  <ReferenceLine y={prescribed} stroke="#16A34A" strokeDasharray="4 4" label={{ value:'Mục tiêu', position:'right', fontSize:10, fill:'#16A34A' }} />
                  <ReferenceLine y={upper} stroke="#EA580C" strokeDasharray="3 3" />
                  <ReferenceLine y={lower} stroke="#EA580C" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="tocDo" stroke={isLechTocDo ? '#DC2626' : '#2563EB'} strokeWidth={2} dot={chart.length === 1 ? { r: 3, fill: '#2563EB' } : false} isAnimationActive={false} name="Tốc độ" />
                </ComposedChart>
              </ResponsiveContainer>
            )
          }
        </div>
        {isLechTocDo && <p style={{ color:'#DC2626', fontSize:13, marginTop:8 }}>⚠ Tốc độ lệch ±15% so với y lệnh — Kiểm tra ngay</p>}
      </div>

      {/* Biểu đồ thể tích */}
      <div className="chart-card" style={{ marginTop:16 }}>
        <h3>Biểu đồ thể tích còn lại theo thời gian</h3>
        <div style={{ width:'100%', height:240 }}>
          {loading && chart.length === 0
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF' }}>Đang tải dữ liệu...</div>
            : chart.length === 0
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF' }}>Không có dữ liệu đo cho phiên này.</div>
            : (
              <ResponsiveContainer>
                <ComposedChart data={chart} margin={{ top:10, right:20, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tickFormatter={fmtTime} tick={{ fontSize:11, fill:'#9CA3AF' }} />
                  <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} label={{ value:'ml', angle:-90, position:'insideLeft', style:{ fontSize:11, fill:'#9CA3AF' } }} />
                  <Tooltip labelFormatter={ts => new Date(ts).toLocaleTimeString('vi-VN')} formatter={v => [`${v} ml`, 'Thể tích']} />
                  <ReferenceLine y={20} stroke="#DC2626" strokeDasharray="4 4" label={{ value:'Ngưỡng cảnh báo (20ml)', position:'right', fontSize:10, fill:'#DC2626' }} />
                  <Area type="monotone" dataKey="theeTich" stroke="#2563EB" fill="#EFF6FF" strokeWidth={2} dot={chart.length === 1 ? { r: 3, fill: '#2563EB' } : false} isAnimationActive={false} name="Thể tích còn lại" />
                </ComposedChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>
    </div>
  )
}

// ── Danh sách các phiên (đang chạy + lịch sử) của 1 bệnh nhân ──────────────
function PatientSessionsList({ patientName, sessions, onBack, onOpenSession }) {
  const STATUS_LABEL = {
    normal:    { text: 'Đang truyền bình thường', color: '#16a34a', bg: '#dcfce7' },
    warning:   { text: 'Sắp hết dịch',            color: '#d97706', bg: '#fef3c7' },
    urgent:    { text: 'Tốc độ bất thường',       color: '#dc2626', bg: '#fee2e2' },
    completed: { text: 'Đã kết thúc',             color: '#6b7280', bg: '#f3f4f6' },
  }
  return (
    <div>
      <button className="back-btn" onClick={onBack} style={{ marginBottom: 16 }}>← Quay lại danh sách bệnh nhân</button>
      <div className="page-title" style={{ marginBottom: 12 }}>Lịch sử truyền dịch — {patientName}</div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Thiết bị</th>
              <th>Loại dịch</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-secondary)', padding:32 }}>Chưa có phiên truyền nào.</td></tr>
            ) : sessions.map(s => {
              const st = STATUS_LABEL[s.status] || { text: s.status, color:'#6b7280', bg:'#f3f4f6' }
              return (
                <tr key={s.id}>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleString('vi-VN') : '—'}</td>
                  <td>{s.endAt ? new Date(s.endAt).toLocaleString('vi-VN') : '—'}</td>
                  <td>{s.deviceLabel || s.deviceId || '—'}</td>
                  <td>{s.fluidType || '—'}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, color: st.color, background: st.bg }}>
                      {st.text}
                    </span>
                  </td>
                  <td>
                    <button className="btn-blue-sm" onClick={() => onOpenSession(s)}>Xem chi tiết</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Danh sách bệnh nhân ────────────────────────────────────────────────────
export default function Patients() {
  const { sessions } = useApp() // các phiên đang hoạt động (real-time)
  const [history, setHistory] = useState([])       // các phiên đã kết thúc
  const [historyLoading, setHistoryLoading] = useState(true)
  const [view, setView] = useState('list')          // 'list' | 'sessions' | 'detail'
  const [selectedPatientKey, setSelectedPatientKey] = useState(null)
  const [selectedPatientName, setSelectedPatientName] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [search, setSearch] = useState('')

  const fetchHistory = async () => {
    try {
      const data = await apiFetch('/api/sessions/history')
      setHistory(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Lỗi tải lịch sử:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  // Gộp cả phiên đang chạy + phiên đã kết thúc để tính danh sách bệnh nhân đầy đủ
  const allSessions = [...sessions, ...history]
  const patients = groupByPatient(allSessions)
  const keyOf = (s) => s.phone ? `phone:${s.phone}` : `name:${s.patientName}`

  // Tìm kiếm theo tên hoặc số điện thoại (không phân biệt hoa/thường, bỏ khoảng trắng khi so SĐT)
  const searchNorm = search.trim().toLowerCase()
  const filteredPatients = searchNorm
    ? patients.filter(p =>
        (p.patientName || '').toLowerCase().includes(searchNorm) ||
        (p.phone || '').replace(/\s+/g, '').includes(searchNorm.replace(/\s+/g, ''))
      )
    : patients

  const openPatient = (patient) => {
    setSelectedPatientKey(patient.key)
    setSelectedPatientName(patient.patientName)
    const patientSessions = allSessions
      .filter(s => keyOf(s) === patient.key)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    // Nếu bệnh nhân chỉ có đúng 1 phiên (đang chạy) → mở thẳng chi tiết cho nhanh
    if (patientSessions.length === 1) {
      setSelectedSession(patientSessions[0])
      setView('detail')
    } else {
      setView('sessions')
    }
  }

  const openSession = (session) => {
    setSelectedSession(session)
    setView('detail')
  }

  const backToList = () => { setView('list'); setSelectedPatientKey(null); setSelectedPatientName(null); setSelectedSession(null) }
  const backToSessions = () => { setView('sessions'); setSelectedSession(null) }

  if (view === 'detail' && selectedSession) {
    return (
      <div className="main-content">
        <PatientDetail
          session={selectedSession}
          readOnly={selectedSession.status === 'completed'}
          onBack={() => {
            fetchHistory()
            // Nếu vào thẳng từ danh sách (bệnh nhân chỉ có 1 phiên) thì quay lại list, ngược lại quay lại danh sách phiên
            selectedPatientKey && allSessions.filter(s => keyOf(s) === selectedPatientKey).length > 1
              ? backToSessions()
              : backToList()
          }}
        />
      </div>
    )
  }

  if (view === 'sessions' && selectedPatientKey) {
    const patientSessions = allSessions
      .filter(s => keyOf(s) === selectedPatientKey)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return (
      <div className="main-content">
        <PatientSessionsList
          patientName={selectedPatientName}
          sessions={patientSessions}
          onBack={backToList}
          onOpenSession={openSession}
        />
      </div>
    )
  }

  return (
    <div className="main-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16, flexWrap:'wrap', gap: 12 }}>
        <div className="page-title" style={{ margin: 0 }}>Danh sách bệnh nhân</div>
        <input
          type="text"
          placeholder="🔍 Tìm theo tên hoặc số điện thoại..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 280, fontSize: 14 }}
        />
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tên bệnh nhân</th>
              <th>Số điện thoại</th>
              <th>Loại dịch truyền</th>
              <th>Số bình truyền</th>
              <th>Lịch sử truyền</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign:'center', color:'var(--text-secondary)', padding:32 }}>
                  {historyLoading ? 'Đang tải...' : searchNorm ? 'Không tìm thấy bệnh nhân phù hợp.' : 'Chưa có bệnh nhân nào đang truyền dịch'}
                </td>
              </tr>
            ) : filteredPatients.map(p => (
              <tr key={p.key}>
                <td style={{ fontWeight:500 }}>{p.patientName}</td>
                <td>{p.phone || '—'}</td>
                <td>{[...p.fluidTypes].join(', ') || '—'}</td>
                <td>{p.sessions.length}</td>
                <td>
                  <button className="btn-blue-sm" onClick={() => openPatient(p)}>
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
