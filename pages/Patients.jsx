import { useState, useEffect, useRef } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useApp } from '../context/AppContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function apiFetch(url, opts = {}) {
  const res = await fetch(API + url, opts)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
  return res.json()
}

function groupByPatient(sessions) {
  const map = {}
  sessions.forEach(s => {
    if (!map[s.patientName]) map[s.patientName] = { patientName: s.patientName, sessions: [], fluidTypes: new Set() }
    map[s.patientName].sessions.push(s)
    if (s.fluidType) map[s.patientName].fluidTypes.add(s.fluidType)
  })
  return Object.values(map)
}

// ── Chi tiết bệnh nhân ─────────────────────────────────────────────────────
function PatientDetail({ session, onBack }) {
  console.log("=== KIỂM TRA SESSION ID ===");
  console.log("Session ID đang mở trên Web:", session.id);
  console.log("===========================");
  
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
      const data = await apiFetch(`/api/sessions/${session.id}/metrics`)
      if (data.length > 0) {
        const pts = data.map(p => ({
          time:   new Date(p.recorded_at).getTime(),
          tocDo:  p.current_drop_rate,
          theeTich: parseFloat((p.current_weight - 30).toFixed(1)), // trừ vỏ chai
          conLai: p.remaining_time,
        }))
        setChart(pts)
        const last = pts[pts.length - 1]
        setLive({ dropRate: last.tocDo, volumeRemaining: last.theeTich, remainingTime: last.conLai })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchMetrics()
    timerRef.current = setInterval(fetchMetrics, 5000)
    return () => clearInterval(timerRef.current)
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

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <button className="back-btn" onClick={onBack}>← Quay lại</button>
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
      </div>

      {/* Thông tin 2 cột */}
      <div className="detail-grid">
        <div className="detail-section">
          <h3>Thông tin bệnh nhân</h3>
          {[
            ['Họ và tên:',  session.patientName],
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
            ['Thiết bị:',         session.deviceId   ?? '—',                          ''],
            ['Tốc độ mục tiêu:',  `${prescribed} giọt/phút`,                          'blue'],
            ['Tốc độ hiện tại:',  `${live.dropRate} giọt/phút`,  isLechTocDo ? 'red' : 'green'],
            ['Thể tích còn lại:', `${live.volumeRemaining} ml`,                       ''],
            ['Thời gian còn lại:', live.remainingTime ? `~${live.remainingTime} phút` : '—', ''],
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
                  <Line type="monotone" dataKey="tocDo" stroke={isLechTocDo ? '#DC2626' : '#2563EB'} strokeWidth={2} dot={false} isAnimationActive={false} name="Tốc độ" />
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
            : (
              <ResponsiveContainer>
                <ComposedChart data={chart} margin={{ top:10, right:20, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tickFormatter={fmtTime} tick={{ fontSize:11, fill:'#9CA3AF' }} />
                  <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} label={{ value:'ml', angle:-90, position:'insideLeft', style:{ fontSize:11, fill:'#9CA3AF' } }} />
                  <Tooltip labelFormatter={ts => new Date(ts).toLocaleTimeString('vi-VN')} formatter={v => [`${v} ml`, 'Thể tích']} />
                  <ReferenceLine y={20} stroke="#DC2626" strokeDasharray="4 4" label={{ value:'Ngưỡng cảnh báo (20ml)', position:'right', fontSize:10, fill:'#DC2626' }} />
                  <Area type="monotone" dataKey="theeTich" stroke="#2563EB" fill="#EFF6FF" strokeWidth={2} dot={false} isAnimationActive={false} name="Thể tích còn lại" />
                </ComposedChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>
    </div>
  )
}

// ── Danh sách bệnh nhân ────────────────────────────────────────────────────
export default function Patients() {
  const { sessions } = useApp()
  const [selected, setSelected] = useState(null)

  const patients     = groupByPatient(sessions)
  const activeSession = selected ? sessions.find(s => s.patientName === selected) : null

  if (selected && activeSession) {
    return (
      <div className="main-content">
        <PatientDetail session={activeSession} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="page-title">Danh sách bệnh nhân</div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tên bệnh nhân</th>
              <th>Loại dịch truyền</th>
              <th>Số bình truyền</th>
              <th>Lịch sử truyền</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign:'center', color:'var(--text-secondary)', padding:32 }}>
                  Chưa có bệnh nhân nào đang truyền dịch
                </td>
              </tr>
            ) : patients.map(p => (
              <tr key={p.patientName}>
                <td style={{ fontWeight:500 }}>{p.patientName}</td>
                <td>{[...p.fluidTypes].join(', ') || '—'}</td>
                <td>{p.sessions.length}</td>
                <td>
                  <button className="btn-blue-sm" onClick={() => setSelected(p.patientName)}>
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
