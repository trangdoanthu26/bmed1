import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';

// API base URL (có thể lấy từ env)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper: fetch với xử lý lỗi cơ bản
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Group sessions by patient name (giữ nguyên logic cũ)
function groupByPatient(sessions) {
  const map = {};
  sessions.forEach(s => {
    const key = s.patientName;
    if (!map[key]) {
      map[key] = {
        patientName: key,
        sessions: [],
        fluidTypes: new Set(),
        count: 0,
      };
    }
    map[key].sessions.push(s);
    if (s.fluidType) map[key].fluidTypes.add(s.fluidType);
    map[key].count++;
  });
  return Object.values(map);
}

// ── Patient Detail (dùng dữ liệu thật + polling) ────────────────────────────
function PatientDetail({ session, onBack }) {
  const [chartData, setChartData] = useState([]);
  const [lastRate, setLastRate] = useState(session.dropRate ?? 0);
  const [volumeRemaining, setVolumeRemaining] = useState(session.volumeRemaining ?? session.volumeInitial ?? 0);
  const [remainingTime, setRemainingTime] = useState(session.remainingTime ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef(null);
  const rateThreshold = 20; // %

  const target = session.dropRate ?? 90; // mục tiêu từ session (có thể thay đổi theo thời gian? backend không có, dùng giá trị ban đầu)
  const upperBound = +(target * (1 + rateThreshold / 100)).toFixed(1);
  const lowerBound = +(target * (1 - rateThreshold / 100)).toFixed(1);
  const isError = lastRate > upperBound || lastRate < lowerBound || session.manualError;

  // Hàm fetch metrics cho session hiện tại
  const fetchMetrics = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/api/sessions/${session.id}/metrics`);
      // data là mảng các điểm { current_drop_rate, current_weight, remaining_time, recorded_at }
      if (data && data.length > 0) {
        // Chuyển đổi thành định dạng chart: { timestamp, rate, weight, remainingTime }
        const formatted = data.map(point => ({
          timestamp: new Date(point.recorded_at).getTime(),
          rate: point.current_drop_rate,
          weight: point.current_weight,
          remainingTime: point.remaining_time,
        }));
        setChartData(formatted);
        // Lấy giá trị mới nhất (cuối mảng)
        const latest = formatted[formatted.length - 1];
        setLastRate(latest.rate);
        setVolumeRemaining(latest.weight);
        setRemainingTime(latest.remainingTime);
      } else {
        // Không có metrics, giữ nguyên giá trị ban đầu
        setChartData([]);
      }
      setError(null);
    } catch (err) {
      console.error('Fetch metrics error:', err);
      setError('Không thể tải dữ liệu biểu đồ');
    } finally {
      setLoading(false);
    }
  };

  // Polling mỗi 10 giây
  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session.id]);

  // Hàm kết thúc truyền
  const handleEndSession = async () => {
    if (!confirm('Xác nhận kết thúc truyền dịch cho bệnh nhân này?')) return;
    setActionLoading(true);
    try {
      await fetchJSON(`${API_BASE}/api/sessions/${session.id}/end`, { method: 'PATCH' });
      alert('Đã kết thúc phiên truyền.');
      onBack(); // Quay lại danh sách
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Hàm báo lỗi
  const handleReportError = async () => {
    if (!confirm('Xác nhận báo lỗi thiết bị? Hệ thống sẽ chuyển trạng thái khẩn cấp.')) return;
    setActionLoading(true);
    try {
      await fetchJSON(`${API_BASE}/api/sessions/${session.id}/error`, { method: 'PATCH' });
      alert('Đã ghi nhận lỗi. Nhân viên y tế sẽ được thông báo.');
      // Có thể refresh metrics để thấy trạng thái mới
      await fetchMetrics();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format thời gian cho XAxis
  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  };

  const minutesLeft = remainingTime !== null && remainingTime > 0
    ? Math.round(remainingTime / 60)
    : (target > 0 ? Math.round((volumeRemaining / target) * 60) : null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="back-btn" onClick={onBack}>← Quay lại</button>
        <div>
          <button
            onClick={handleReportError}
            disabled={actionLoading}
            style={{ marginRight: '0.5rem', backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
          >
            ⚠ Báo lỗi thiết bị
          </button>
          <button
            onClick={handleEndSession}
            disabled={actionLoading}
            style={{ backgroundColor: '#4B5563', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
          >
            ✔ Kết thúc truyền
          </button>
        </div>
      </div>

      {error && <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Thông tin bệnh nhân</h3>
          {[
            ['Họ và tên:', session.patientName],
            ['Tuổi:', session.age ?? '—'],
            ['Phòng:', session.room ?? '—'],
            ['Giường:', session.bed ?? '—'],
            ['Bệnh lý:', session.condition ?? '—'],
            ['Bác sĩ:', session.doctor ?? '—'],
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
            ['Loại dịch:', session.fluidType ?? '—', ''],
            ['Thiết bị:', session.deviceId ?? '—', ''],
            ['Tốc độ mục tiêu:', `${target} giọt/phút`, 'blue'],
            ['Tốc độ hiện tại:', `${lastRate} giọt/phút`, isError ? 'red' : 'green'],
            ['Thể tích còn lại:', `${volumeRemaining} ml`, ''],
            ['Thời gian còn lại:', minutesLeft ? `~${minutesLeft} phút` : '—', ''],
          ].map(([k, v, color]) => (
            <div key={k} className="detail-row">
              <span className="k">{k}</span>
              <span className={`v ${color}`}>{v}</span>
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

      <div className="chart-card">
        <h3>Biểu đồ tốc độ truyền theo thời gian</h3>
        <div style={{ width: '100%', height: 280 }}>
          {loading && chartData.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Đang tải dữ liệu...</div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  label={{ value: 'giọt/phút', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9CA3AF' } }}
                  domain={[0, target * 1.5]}
                />
                <Tooltip
                  labelFormatter={(ts) => new Date(ts).toLocaleString('vi-VN')}
                  formatter={(value) => [`${value} giọt/phút`, 'Tốc độ']}
                />
                <ReferenceLine y={target} stroke="#16A34A" strokeDasharray="4 4" label={{ value: 'Mục tiêu', position: 'right', fontSize: 10, fill: '#16A34A' }} />
                <ReferenceLine y={upperBound} stroke="#EA580C" strokeDasharray="3 3" />
                <ReferenceLine y={lowerBound} stroke="#EA580C" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={isError ? '#DC2626' : '#16A34A'}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {isError && !loading && (
          <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>
            ⚠ Tốc độ lệch ±{rateThreshold}% hoặc có lỗi thiết bị — Kiểm tra ngay
          </p>
        )}
      </div>
    </div>
  );
}

// ── Patients Page ─────────────────────────────────────────────────────────────
export default function Patients() {
  const { sessions: contextSessions } = useApp(); // vẫn giữ để tương thích, nhưng sẽ ghi đè bằng fetch
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Hàm fetch danh sách phiên từ API
  const fetchSessions = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/api/sessions`);
      setSessions(data);
      setError(null);
    } catch (err) {
      console.error('Fetch sessions error:', err);
      setError('Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const patients = groupByPatient(sessions);

  // Tìm phiên active cho bệnh nhân được chọn (lấy phiên đầu tiên chưa kết thúc - API đã lọc status!=completed)
  const activeSession = selectedPatient
    ? sessions.find(s => s.patientName === selectedPatient)
    : null;

  if (selectedPatient && activeSession) {
    return (
      <div className="main-content">
        <PatientDetail
          session={activeSession}
          onBack={() => {
            setSelectedPatient(null);
            fetchSessions(); // refresh danh sách khi quay lại
          }}
        />
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-title">Danh sách bệnh nhân</div>
      {loading && <div>Đang tải...</div>}
      {error && <div style={{ color: 'red', padding: '1rem' }}>{error}</div>}
      {!loading && !error && (
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
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                    Chưa có bệnh nhân nào đang truyền dịch
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.patientName}>
                    <td style={{ fontWeight: 500 }}>{p.patientName}</td>
                    <td>{[...p.fluidTypes].join(', ') || '—'}</td>
                    <td>{p.count}</td>
                    <td>
                      <button className="btn-blue-sm" onClick={() => setSelectedPatient(p.patientName)}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}