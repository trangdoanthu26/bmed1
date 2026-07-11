import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = (import.meta.env.VITE_API_URL || 'https://bmed1-1.onrender.com') + '/api'
// =================================================================
// BỘ LỌC TỰ ĐỘNG: Tự động đính Token bảo mật vào TẤT CẢ request gửi lên BE
// =================================================================
axios.interceptors.request.use(
  (config) => {
    // Lấy token y tá/bác sĩ từ localStorage lúc đăng nhập thành công
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    
    if (token) {
      // Tự động bọc cấu trúc Bearer chuẩn y tế cho tiêu đề Authorization
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessions, setSessions]   = useState([])
  const [alerts, setAlerts]       = useState([]) 
  const [devices, setDevices]     = useState([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [warnThreshold, setWarnThreshold] = useState(20)
  const [rateThreshold, setRateThreshold] = useState(15)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // CHẶT CHẼ: Đồng bộ công thức tính trạng thái màu sắc dựa trên các trường chuẩn của DB
  const getStatus = useCallback((s) => {
    // Nếu phiên đã kết thúc thì cho màu xám rảnh
    if (s.status === 'completed') return 'gray'

    const currentRate = parseFloat(s.dropRate ?? 0)
    const targetRate  = parseFloat(s.prescribedDropRate ?? 0)
    const remaining   = parseFloat(s.volumeRemaining ?? 0)

    // 1. Kiểm tra ưu tiên số 1: Lỗi tốc độ lệch >= ngưỡng cài đặt
    const phanTramLech = targetRate > 0 ? (Math.abs(currentRate - targetRate) / targetRate) * 100 : 0
    if (phanTramLech >= rateThreshold || s.status === 'urgent') return 'red'

    // 2. Kiểm tra ưu tiên số 2: Sắp hết dịch <= ngưỡng cài đặt
    if ((remaining <= warnThreshold && remaining > 0) || s.status === 'warning') return 'orange'

    // 3. Trạng thái hoạt động bình thường
    return 'green'
  }, [rateThreshold, warnThreshold])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions`)
      setSessions(res.data.map(s => ({ ...s, clientStatus: getStatus(s) })))
      setError(null)
    } catch {
      setError('Không kết nối được với máy chủ Backend.')
    } finally {
      setLoading(false)
    }
  }, [getStatus])

  const fetchDevices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/devices`)
      setDevices(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/alerts`)
      // Chỉ lấy các cảnh báo chưa xử lý (is_read = false) để hiện lên tab Thông báo
      const unreadAlerts = res.data.filter(a => !a.is_read)
      setAlerts(unreadAlerts)
    } catch { /* ignore */ }
  }, [])

  // Tự động tải dữ liệu khi khởi chạy ứng dụng
  useEffect(() => {
    fetchSessions()
    fetchDevices()
    fetchAlerts()
  }, [fetchSessions, fetchDevices, fetchAlerts])

  // Cơ chế Real-time quét cập nhật mỗi 3 giây một lần từ ESP32 gửi lên
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      fetchSessions()
      fetchAlerts()
      fetchDevices()
    }, 3000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchSessions, fetchAlerts, fetchDevices])

  const createSession = async (formData) => {
    const res = await axios.post(`${API}/sessions`, formData)
    await fetchSessions()
    await fetchDevices()
    return res.data
  }

// Sửa hàm handleAlertAction thành:
const handleAlertAction = async ({ session_id, action, alert_id, device_id }) => {
  try {
    setError(null);

    if (action === 'Ket_Thuc_Phien') {
      await axios.patch(`${API}/sessions/${session_id}/end`);
    } 
    else if (action === 'Loi_Thiet_Bi') {
      await axios.patch(`${API}/sessions/${session_id}/device-error`);
    } 
    else if (action === 'Da_Xu_Ly_Toc_Do') {
      await axios.patch(`${API}/sessions/${session_id}/resolve-alert`, { 
        alertType: 'loi_toc_do' 
      });
    }

    await fetchSessions();
    await fetchAlerts();
    await fetchDevices();

  } catch (err) {
    console.error("Lỗi thực thi nút bấm:", err);
    setError("Thao tác thất bại. Vui lòng kiểm tra lại kết nối API.");
  }
};
// Sửa hàm repairDone ngay bên dưới thành:
const repairDone = async (deviceId) => {
  try {
    await axios.patch(`${API}/devices/${deviceId}/repair-done`);
    await fetchDevices();
  } catch { /* ignore */ }
};
  // Thống kê số lượng hiển thị lên 4 ô đếm trên Dashboard sáng màu
  const stats = {
    waiting: devices.filter(d => d.status === 'available').length,
    active:  sessions.filter(s => s.clientStatus === 'green').length,
    warning: sessions.filter(s => s.clientStatus === 'orange').length,
    error:   sessions.filter(s => s.clientStatus === 'red').length,
  }

  // Bộ đếm tổng số lượng thông báo chưa đọc hiển thị ở badge quả chuông bên Sidebar
  const unreadCount = alerts.length

  return (
    <AppContext.Provider value={{
      sessions, stats, devices, alerts, loading, error, autoRefresh,
      warnThreshold, rateThreshold,
      unreadCount,
      setAutoRefresh, setWarnThreshold, setRateThreshold,
      createSession, handleAlertAction, repairDone,
      fetchSessions, fetchDevices, fetchAlerts,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
