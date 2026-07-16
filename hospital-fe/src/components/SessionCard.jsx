import React from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom' // Dùng để điều hướng màn hình

const IconPulse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

export default function SessionCard({ session }) {
  const { handleAlertAction } = useApp()
  const navigate = useNavigate() // Khởi tạo trình điều hướng

  // Đồng bộ 100% với các trường SELECT trong server.js của bạn
  const idPhien = session.id;
  const idThietBi = session.deviceId; 
  const tenBenhNhan = session.patientName || "Chưa có tên";
  const phong = session.room || "---";
  const giuong = session.bed || "---";
  const tenThietBi = session.deviceLabel || session.deviceId || "—";
  const tocDoHienTai = session.dropRate ?? 0;
  const tocDoYLenh = session.prescribedDropRate ?? 40;
  const theTichConLai = session.volumeRemaining ?? session.volumeInitial ?? 0;
  const thoiGianConLai = session.remainingTime ?? null;

  // Thuật toán kiểm tra trạng thái hiển thị màu sắc tức thời tại Frontend
  const currentRate = parseFloat(tocDoHienTai)
  const targetRate = parseFloat(tocDoYLenh)
  const phanTramLech = targetRate > 0 ? (Math.abs(currentRate - targetRate) / targetRate) * 100 : 0
  
  // Khớp với chữ 'urgent' và 'warning' trong cơ sở dữ liệu của server.js
  const isLoiTocDo = phanTramLech >= 15 || session.status === 'urgent';
  const isSapHetDich = (theTichConLai <= 20 && theTichConLai > 0) || session.status === 'warning';

  let cardStyle = { borderColor: '#10b981', backgroundColor: '#f0fdf4' }; // Mặc định: Xanh
  let statusText = "✓ Đang truyền bình thường";
  let statusColor = "#10b981";

  if (isLoiTocDo) {
    cardStyle = { borderColor: '#ef4444', backgroundColor: '#fef2f2' }; // Lỗi tốc độ: Đỏ
    statusText = "⚠️ Tốc độ bất thường — cần kiểm tra ngay!";
    statusColor = "#dc2626";
  } else if (isSapHetDich) {
    cardStyle = { borderColor: '#f97316', backgroundColor: '#fff7ed' }; // Sắp hết: Cam
    statusText = "⏳ Cảnh báo: Dịch truyền sắp hết!";
    statusColor = "#ea580c";
  }

  const triggerAction = async (e, actionType) => {
    e.stopPropagation(); // Ngăn chặn sự kiện bấm thẻ lan ra ngoài (không bị nhảy màn hình khi ấn nút)
    await handleAlertAction({
      session_id: idPhien,
      action: actionType,
      device_id: idThietBi
    });
  };

  return (
    <div 
      onClick={() => navigate('/benh-nhan', { state: { session } })} // CLICK VÀO THẺ: Nhảy thẳng vào chi tiết phiên truyền này
      style={{
        border: '2px solid',
        borderRadius: '12px',
        padding: '16px',
        background: cardStyle.backgroundColor,
        borderColor: cardStyle.borderColor,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', top: '16px', right: '16px', color: cardStyle.borderColor }}>
        <IconPulse />
      </div>

      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
          {tenBenhNhan}
        </span>
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
        Phòng {phong} - Giường {giuong}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        🔌 Thiết bị: <strong style={{ color: '#475569' }}>{tenThietBi}</strong>
      </div>

      <div style={{ fontSize: '13px', fontWeight: '600', color: statusColor, marginBottom: '16px' }}>
        {statusText}
      </div>

      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', fontSize: '14px', color: '#334155', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tốc độ hiện tại:</span>
          <strong style={{ color: isLoiTocDo ? '#dc2626' : '#0f172a' }}>{tocDoHienTai} giọt/phút</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Y lệnh:</span>
          <span>{tocDoYLenh} giọt/phút</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Còn lại:</span>
          <strong style={{ color: isSapHetDich ? '#ea580c' : '#0f172a' }}>{theTichConLai} ml</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Thời gian còn lại:</span>
          <strong style={{ color: isSapHetDich ? '#ea580c' : '#0f172a' }}>
            {thoiGianConLai != null ? `~${thoiGianConLai} phút` : '—'}
          </strong>
        </div>
      </div>

      {/* KHỐI NÚT BẤM ĐIỀU KHIỂN LÂM SÀNG */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={(e) => triggerAction(e, 'Loi_Thiet_Bi')}
          style={{ flex: 1, padding: '10px 12px', backgroundColor: '#fff', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          ⚠️ Lỗi thiết bị
        </button>

        {/* Khi tốc độ bất thường: không cần nút "Đã xử lý" — tình trạng này tự cập nhật
            màu sắc/trạng thái ngay khi tốc độ thực tế trở lại bình thường, không cần
            bác sĩ xác nhận thủ công. Chỉ hiện nút Kết thúc khi KHÔNG phải lỗi tốc độ. */}
        {!isLoiTocDo && (
          <button 
            onClick={(e) => triggerAction(e, 'Ket_Thuc_Phien')}
            disabled={!isSapHetDich}
            style={{ flex: 1, padding: '10px 12px', backgroundColor: isSapHetDich ? '#3b82f6' : '#e2e8f0', border: 'none', color: isSapHetDich ? '#fff' : '#94a3b8', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: isSapHetDich ? 'pointer' : 'not-allowed' }}
          >
            ✓ Kết thúc
          </button>
        )}
      </div>
    </div>
  )
}