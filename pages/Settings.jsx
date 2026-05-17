import { useApp } from '../context/AppContext'

export default function Settings() {
  const {
    autoRefresh, setAutoRefresh,
    warnThreshold, setWarnThreshold,
    rateThreshold, setRateThreshold,
  } = useApp()

  return (
    <div className="main-content">
      <div className="page-title">Cài đặt</div>

      {/* General settings */}
      <div className="settings-section">
        <h3>Cài đặt chung</h3>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ngưỡng cảnh báo sắp hết</div>
            <div className="setting-desc">Thời gian còn lại để hiển thị cảnh báo</div>
          </div>
          <div className="setting-right">
            <input
              type="number"
              className="setting-input"
              value={warnThreshold}
              min={1} max={60}
              onChange={e => setWarnThreshold(Number(e.target.value))}
            />
            <span className="setting-unit">phút</span>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ngưỡng lỗi tốc độ</div>
            <div className="setting-desc">Độ lệch tốc độ để cảnh báo lỗi</div>
          </div>
          <div className="setting-right">
            <input
              type="number"
              className="setting-input"
              value={rateThreshold}
              min={5} max={50}
              onChange={e => setRateThreshold(Number(e.target.value))}
            />
            <span className="setting-unit">%</span>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Tự động làm mới</div>
            <div className="setting-desc">Cập nhật dữ liệu theo thời gian thực</div>
          </div>
          <div className="setting-right">
            <button
              className={`toggle ${autoRefresh ? '' : 'off'}`}
              onClick={() => setAutoRefresh(v => !v)}
              aria-label="Toggle auto refresh"
            />
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="settings-section">
        <h3>Về hệ thống</h3>
        {[
          ['Phiên bản:', '1.0.0'],
          ['Cập nhật lần cuối:', new Date().toLocaleDateString('vi-VN')],
        ].map(([k, v]) => (
          <div key={k} className="setting-row">
            <div className="setting-label">{k}</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
