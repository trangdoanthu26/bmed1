import { useApp } from '../context/AppContext'

const IconWarn  = ({ color = '#DC2626' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconClock = ({ color = '#EA580C' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

export default function Notifications() {
  const { maintenance, nearlyEmpty } = useApp()

  return (
    <div className="main-content">
      <div className="page-title">Thông báo</div>

      {/* Section 1: Maintenance */}
      <div className="notif-section">
        <div className="notif-section-title" style={{ color: '#DC2626' }}>
          <IconWarn /> Thiết bị cần bảo trì
        </div>

        {maintenance.length === 0 ? (
          <div className="empty-state">Không có thiết bị cần bảo trì</div>
        ) : maintenance.map(n => (
          <div key={n.id} className="notif-card red">
            <div>
              <div className="notif-card-name">{n.patientName}</div>
              <div className="notif-card-sub">Phòng {n.room} - Giường {n.bed}</div>
              <div className="notif-card-err">⚠️ {n.message}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Thiết bị: {n.device ?? '—'}
              </div>
            </div>
            <div>
              <IconWarn />
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Nearly empty */}
      <div className="notif-section">
        <div className="notif-section-title" style={{ color: '#EA580C' }}>
          <IconClock /> Thiết bị sắp hết
        </div>

        {nearlyEmpty.length === 0 ? (
          <div className="empty-state">Không có thiết bị nào sắp hết</div>
        ) : nearlyEmpty.map(s => {
          const remaining = s.volumeRemaining ?? s.volumeInitial ?? 0
          const rate = s.dropRate ?? 60
          const minutesLeft = rate > 0 ? Math.round((remaining / rate) * 60) : null
          return (
            <div key={s.id} className="notif-card orange">
              <div>
                <div className="notif-card-name">{s.patientName}</div>
                <div className="notif-card-sub">Phòng {s.room} - Giường {s.bed}</div>
                {minutesLeft !== null && (
                  <div className="notif-card-time">⏱ Còn lại ~{minutesLeft} phút</div>
                )}
              </div>
              <IconClock />
            </div>
          )
        })}
      </div>
    </div>
  )
}
