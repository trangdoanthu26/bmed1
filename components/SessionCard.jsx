import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const IconPulse = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconDrop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function SessionCard({ session }) {
  const { endSession, reportError } = useApp()
  const navigate = useNavigate()

  const remaining = session.volumeRemaining ?? session.volumeInitial ?? 0
  const rate      = session.dropRate ?? 60
  const minutesLeft = rate > 0 ? Math.round((remaining / rate) * 60) : null

  const handleError = async () => {
    await reportError(session)
    navigate('/thong-bao')
  }

  const handleEnd = () => endSession(session.id)

  const statusColors = {
    green:  'status-green',
    orange: 'status-orange',
    red:    'status-red',
    gray:   'status-gray',
  }

  return (
    <div className={`session-card ${statusColors[session.status] ?? 'status-gray'}`}>
      {/* Header */}
      <div className="card-header">
        <div>
          <div className="card-name">{session.patientName}</div>
          <div className="card-room">Phòng {session.room} - Giường {session.bed}</div>
        </div>
        <span className="card-pulse" style={{ color: session.status === 'green' ? 'var(--green)' : session.status === 'orange' ? 'var(--orange)' : session.status === 'red' ? 'var(--red)' : 'var(--gray)' }}>
          <IconPulse />
        </span>
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-row">
          <span className="k"><IconDrop /> {session.fluidType || 'Chưa chọn'}</span>
        </div>
        <div className="card-row">
          <span className="k">Tốc độ:</span>
          <span className={`v ${session.status === 'green' ? 'green' : session.status === 'orange' ? 'orange' : ''}`}>
            {session.dropRate ?? '—'} giọt/phút
          </span>
        </div>
        <div className="card-row">
          <span className="k">Còn lại:</span>
          <span className="v">{remaining} ml</span>
        </div>
        {minutesLeft !== null && (
          <div className="card-row">
            <span className="k"><IconClock /> ~{minutesLeft} phút</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card-actions">
        <button className="btn btn-danger" onClick={handleError}>
          <IconAlert /> Lỗi thiết bị
        </button>
        <button className="btn btn-neutral" onClick={handleEnd}>
          <IconCheck /> Kết thúc
        </button>
      </div>
    </div>
  )
}
