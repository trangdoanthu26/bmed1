import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider }           from './context/AppContext'
import Sidebar                   from './components/Sidebar'
import Dashboard                 from './pages/Dashboard'
import Patients                  from './pages/Patients'
import Notifications             from './pages/Notifications'
import Settings                  from './pages/Settings'
import LoginPage                 from './pages/LoginPage'
import TechnicianPage            from './pages/TechnicianPage'

// Route chỉ cho phép khi đã đăng nhập
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Đang tải...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Sai role → redirect về trang mặc định của role đó
    return <Navigate to={user.role === 'technician' ? '/thiet-bi' : '/'} replace />
  }

  return children
}

// Layout bác sĩ (có sidebar)
function DoctorLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'technician') return <Navigate to="/thiet-bi" replace />
  return (
    <AppProvider>
      <div className="app-shell">
        <Sidebar />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/benh-nhan" element={<Patients />} />
          <Route path="/thong-bao" element={<Notifications />} />
          <Route path="/cai-dat"   element={<Settings />} />
        </Routes>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Trang đăng nhập */}
          <Route path="/login" element={<LoginGuard />} />

          {/* Giao diện kỹ thuật viên */}
          <Route
            path="/thiet-bi"
            element={
              <PrivateRoute allowedRoles={['technician']}>
                <TechnicianPage />
              </PrivateRoute>
            }
          />

          {/* Giao diện bác sĩ — tất cả route còn lại */}
          <Route
            path="/*"
            element={
              <PrivateRoute allowedRoles={['staff', 'admin']}>
                <DoctorLayout />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Nếu đã đăng nhập thì không vào /login nữa
function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={user.role === 'technician' ? '/thiet-bi' : '/'} replace />
  return <LoginPage />
}
