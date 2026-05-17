import { useState } from 'react'
import { useApp } from '../context/AppContext'
import CreateSessionModal from '../components/CreateSessionModal'
import SessionCard from '../components/SessionCard'

const IconX    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
const IconCheck= () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
const IconClock= () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconWarn = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

export default function Dashboard() {
  const { sessions, stats, loading, error } = useApp()
  const [showModal, setShowModal] = useState(false)

  const activeSessions = sessions.filter(s => !s.ended)

  return (
    <div className="main-content">
      {/* Error banner */}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', borderRadius: 10, padding: '12px 16px',
          marginBottom: 20, fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Create button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <IconPlus /> Tạo phiên truyền mới
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card red">
          <div>
            <div className="num">{loading ? '...' : stats.error}</div>
            <div className="lbl">Tổng thiết bị lỗi</div>
          </div>
          <div className="icon-box"><IconX /></div>
        </div>
        <div className="stat-card green">
          <div>
            <div className="num">{loading ? '...' : stats.active}</div>
            <div className="lbl">Đang hoạt động</div>
          </div>
          <div className="icon-box"><IconCheck /></div>
        </div>
        <div className="stat-card orange">
          <div>
            <div className="num">{loading ? '...' : stats.warning}</div>
            <div className="lbl">Sắp hết</div>
          </div>
          <div className="icon-box"><IconClock /></div>
        </div>
        <div className="stat-card gray">
          <div>
            <div className="num">{loading ? '...' : stats.waiting}</div>
            <div className="lbl">Đang chờ gán</div>
          </div>
          <div className="icon-box"><IconWarn /></div>
        </div>
      </div>

      {/* Sessions */}
      <div className="section-hdr">Phiên truyền hiện tại</div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải...</p>
      ) : activeSessions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--text-secondary)', fontSize: 14,
        }}>
          Chưa có phiên truyền nào đang hoạt động.<br/>
          <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => setShowModal(true)}>
            Tạo phiên mới →
          </span>
        </div>
      ) : (
        <div className="sessions-grid">
          {activeSessions.map(s => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {showModal && <CreateSessionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
