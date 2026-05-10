import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessions, setSessions]         = useState([])
  const [notifications, setNotifications] = useState([]) // manual error reports
  const [devices, setDevices]           = useState([])
  const [autoRefresh, setAutoRefresh]   = useState(true)
  const [warnThreshold, setWarnThreshold] = useState(15) // minutes
  const [rateThreshold, setRateThreshold] = useState(20) // %
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // ── Derive status for a session ──────────────────────────────────
  const getStatus = useCallback((s) => {
    if (!s.deviceId) return 'gray'
    if (s.manualError) return 'red'
    const remaining = s.volumeRemaining ?? s.volumeInitial
    const rate = s.dropRate ?? 60
    const minutesLeft = rate > 0 ? (remaining / rate) * 60 : 999
    if (minutesLeft < warnThreshold) return 'orange'
    return 'green'
  }, [warnThreshold])

  // ── Fetch from backend ───────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions`)
      // Enrich with status
      setSessions(res.data.map(s => ({ ...s, status: getStatus(s) })))
      setError(null)
    } catch {
      setError('Không kết nối được Backend. Kiểm tra server đang chạy chưa.')
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

  useEffect(() => {
    fetchSessions()
    fetchDevices()
  }, [fetchSessions, fetchDevices])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      fetchSessions()
    }, 3000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchSessions])

  // ── Actions ──────────────────────────────────────────────────────
  const createSession = async (formData) => {
    const res = await axios.post(`${API}/sessions`, formData)
    setSessions(prev => [...prev, { ...res.data, status: getStatus(res.data) }])
    return res.data
  }

  const endSession = async (sessionId) => {
    await axios.patch(`${API}/sessions/${sessionId}/end`)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }

  const reportError = async (session) => {
    // Mark as manual error locally + add to notifications
    setSessions(prev =>
      prev.map(s => s.id === session.id ? { ...s, manualError: true, status: 'red' } : s)
    )
    setNotifications(prev => [
      {
        id: Date.now(),
        type: 'maintenance',
        sessionId: session.id,
        patientName: session.patientName,
        room: session.room,
        bed: session.bed,
        device: session.deviceId,
        message: 'Lỗi thiết bị (Được báo cáo thủ công)',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    // Persist to backend
    try {
      await axios.patch(`${API}/sessions/${session.id}/error`)
    } catch { /* offline fallback already done */ }
  }

  // ── Derived stats ────────────────────────────────────────────────
  const stats = {
    error:   sessions.filter(s => s.status === 'red').length,
    active:  sessions.filter(s => s.status === 'green').length,
    warning: sessions.filter(s => s.status === 'orange').length,
    waiting: sessions.filter(s => s.status === 'gray').length,
  }

  // Sessions nearly empty (for notifications page)
  const nearlyEmpty = sessions.filter(s => {
    const remaining = s.volumeRemaining ?? s.volumeInitial
    const rate = s.dropRate ?? 60
    const minutesLeft = rate > 0 ? (remaining / rate) * 60 : 999
    return minutesLeft < warnThreshold && s.status !== 'red'
  })

  // Maintenance sessions
  const maintenance = notifications.filter(n => n.type === 'maintenance')

  return (
    <AppContext.Provider value={{
      sessions, stats, devices, loading, error, autoRefresh,
      warnThreshold, rateThreshold,
      nearlyEmpty, maintenance, notifications,
      setAutoRefresh, setWarnThreshold, setRateThreshold,
      createSession, endSession, reportError, fetchSessions,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
