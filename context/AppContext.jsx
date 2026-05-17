import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessions, setSessions]         = useState([])
  const [notifications, setNotifications] = useState([])
  const [devices, setDevices]           = useState([])
  const [autoRefresh, setAutoRefresh]   = useState(true)
  
  const [warnThreshold, setWarnThreshold] = useState(20) // 20ml
  const [rateThreshold, setRateThreshold] = useState(15) // 15%

  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // ── Derive status for a session ──────────────────────────────────
  const getStatus = useCallback((s) => {
    if (!s.deviceId) return 'gray'

    const currentRate = parseFloat(s.dropRate || 0)
    const targetRate = parseFloat(s.prescribedDropRate || 0)
    const isRateError = targetRate > 0 && Math.abs(currentRate - targetRate) / targetRate >= (rateThreshold / 100)

    if (s.manualError || isRateError) return 'red'

    const remaining = parseFloat(s.volumeRemaining ?? s.volumeInitial ?? 0)
    if (remaining <= warnThreshold && remaining > 0) return 'orange'

    return 'green'
  }, [rateThreshold, warnThreshold])

  // ── Fetch from backend ───────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions`)
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
    try {
      await axios.patch(`${API}/sessions/${session.id}/error`)
    } catch { /* ignore */ }
  }

  // ── Derived stats ────────────────────────────────────────────────
  const stats = {
    error:   sessions.filter(s => s.status === 'red').length,
    active:  sessions.filter(s => s.status === 'green').length,
    warning: sessions.filter(s => s.status === 'orange').length,
    waiting: sessions.filter(s => s.status === 'gray').length,
  }

  const nearlyEmpty = sessions.filter(s => s.status === 'orange')
  const errorSessions = sessions.filter(s => s.status === 'red')

  return (
    <AppContext.Provider value={{
      sessions, stats, devices, loading, error, autoRefresh,
      warnThreshold, rateThreshold,
      nearlyEmpty, 
      maintenance: errorSessions, 
      notifications,
      setAutoRefresh, setWarnThreshold, setRateThreshold,
      createSession, endSession, reportError, fetchSessions,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)