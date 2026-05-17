import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconPulse = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      // Redirect theo role
      if (user.role === 'technician') {
        navigate('/thiet-bi', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f6fa',
    }}>
      <div style={{
        width: 380,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        padding: '40px 36px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#2563EB', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconPulse />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em' }}>HỆ THỐNG</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
              GIÁM SÁT TRUYỀN DỊCH
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
          Đăng nhập
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
          Vui lòng đăng nhập bằng tài khoản được cấp
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="bacsi@hospital.com"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#93c5fd' : '#2563EB',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Gợi ý tài khoản test */}
        <div style={{
          marginTop: 24, padding: '12px 14px',
          background: '#f0f9ff', borderRadius: 8,
          fontSize: 12, color: '#0369a1', lineHeight: 1.7,
        }}>
          <strong>Tài khoản thử nghiệm:</strong><br/>
          👨‍⚕️ Bác sĩ: bacsi@hospital.com / 123456<br/>
          🔧 KTV: kythuatvien@hospital.com / 123456
        </div>
      </div>
    </div>
  )
}
