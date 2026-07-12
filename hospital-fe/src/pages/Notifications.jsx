import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Notifications() {
  const { sessions, alerts, devices, handleAlertAction, loading } = useApp()
  const [activeTab, setActiveTab] = useState('toc-do') // Tab mặc định

  // Phân loại dữ liệu cảnh báo — PHẢI khớp đúng alert_type lưu trong DB (sap_het / loi_toc_do)
  const sapHetAlerts = alerts?.filter(a => a.alert_type === 'sap_het') || []
  const tocDoAlerts = alerts?.filter(a => a.alert_type === 'loi_toc_do') || []
  // Thiết bị lỗi phải lấy từ danh sách THIẾT BỊ (status='error'), không phải từ sessions
  const baoTriDevices = devices?.filter(d => d.status === 'error') || []

  const triggerAction = async (sessionId, action, alertId, deviceId) => {
    if (window.confirm('Bạn có chắc chắn muốn thực hiện thao tác này?')) {
      // Gọi lên hàm xử lý API ở backend chúng ta vừa viết lúc nãy
      await handleAlertAction({ session_id: sessionId, action, alert_id: alertId, device_id: deviceId })
    }
  }

  return (
    <div className="main-content" style={{ padding: '24px' }}>
      <div className="section-hdr" style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
        Trung tâm thông báo & Phân loại xử lý
      </div>

      {/* HỆ THỐNG 3 TAB CHUẨN */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', paddingBottom: '1px' }}>
        <button 
          onClick={() => setActiveTab('toc-do')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'toc-do' ? '#ef4444' : '#64748b',
            borderBottom: activeTab === 'toc-do' ? '3px solid #ef4444' : 'none'
          }}
        >
          Tốc độ bất thường ({tocDoAlerts.length})
        </button>
        <button 
          onClick={() => setActiveTab('sap-het')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'sap-het' ? '#f97316' : '#64748b',
            borderBottom: activeTab === 'sap-het' ? '3px solid #f97316' : 'none'
          }}
        >
          Sắp hết dịch ({sapHetAlerts.length})
        </button>
        <button 
          onClick={() => setActiveTab('bao-tri')}
          style={{
            padding: '10px 16px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === 'bao-tri' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'bao-tri' ? '3px solid #3b82f6' : 'none'
          }}
        >
          Thiết bị cần bảo trì ({baoTriDevices.length})
        </button>
      </div>

      {/* NỘI DUNG CHI TIẾT THEO TAB */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>
        
        {/* TAB 1: TỐC ĐỘ BẤT THƯỜNG */}
        {activeTab === 'toc-do' && (
          tocDoAlerts.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Không có cảnh báo tốc độ nào.</p> :
          tocDoAlerts.map(alert => (
            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong style={{ color: '#dc2626' }}>⚠️ Lỗi tốc độ truyền:</strong> {alert.message}
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Mã phiên: {alert.session_id}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => triggerAction(alert.session_id, 'Da_Xu_Ly_Toc_Do', alert.id, alert.device_id)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Đã xử lý</button>
                <button onClick={() => triggerAction(alert.session_id, 'Loi_Thiet_Bi', alert.id, alert.device_id)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Lỗi thiết bị</button>
              </div>
            </div>
          ))
        )}

        {/* TAB 2: SẮP HẾT DỊCH */}
        {activeTab === 'sap-het' && (
          sapHetAlerts.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Không có thiết bị nào sắp hết dịch.</p> :
          sapHetAlerts.map(alert => (
            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong style={{ color: '#ea580c' }}>⏳ Sắp hết dịch:</strong> {alert.message}
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Mã phiên: {alert.session_id}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => triggerAction(alert.session_id, 'Ket_Thuc_Phien', alert.id, alert.device_id)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Kết thúc phiên</button>
                <button onClick={() => triggerAction(alert.session_id, 'Loi_Thiet_Bi', alert.id, alert.device_id)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Lỗi thiết bị</button>
              </div>
            </div>
          ))
        )}

        {/* TAB 3: THIẾT BỊ CẦN BẢO TRÌ */}
        {activeTab === 'bao-tri' && (
          baoTriDevices.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>Kho sạch sẽ. Không có thiết bị nào lỗi phần cứng.</p> :
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>
                <th style={{ padding: '10px' }}>Tên thiết bị</th>
                <th style={{ padding: '10px' }}>Địa chỉ MAC</th>
                <th style={{ padding: '10px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {baoTriDevices.map(dev => (
                <tr key={dev.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <td style={{ padding: '12px 10px', fontWeight: '500' }}>{dev.label || 'ESP32_Sensor'}</td>
                  <td style={{ padding: '12px 10px', color: '#64748b' }}>{dev.macAddress || 'Chưa rõ'}</td>
                  <td style={{ padding: '12px 10px' }}><span style={{ padding: '4px 8px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>Cần kỹ thuật viên xử lý</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  )
}