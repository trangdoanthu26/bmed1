import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Sidebar       from './components/Sidebar'
import Dashboard     from './pages/Dashboard'
import Patients      from './pages/Patients'
import Notifications from './pages/Notifications'
import Settings      from './pages/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/benh-nhan" element={<Patients />} />
            <Route path="/thong-bao" element={<Notifications />} />
            <Route path="/cai-dat"   element={<Settings />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
