// ============================================================
// esp32_simulator.js — Giả lập NHIỀU ESP32 cùng lúc (Bản chuẩn)
// ============================================================

const API_URL  = 'https://bmed1-1.onrender.com/api';
const INTERVAL = 3000; // ms

// ── Giả lập 1 thiết bị ──────────────────────────────────────
function simulateDevice(sessionId, targetRate = 40, initialWeight = 500) {
  let weight = initialWeight;

  console.log(`[ESP-${sessionId.slice(0,8)}] Khởi chạy giả lập. Y lệnh: ${targetRate} g/p, Trọng lượng: ${weight}g`);

  const timer = setInterval(async () => {
    
    // Giả lập chạy bình thường, chỉ dao động nhẹ quanh y lệnh ± 2 giọt
    const dropRate = targetRate + Math.floor(Math.random() * 5) - 2; 

    // Dịch vơi dần 1–2g mỗi 3 giây
    weight -= (Math.random() * 2 + 1);
    if (weight < 30) weight = 30; // đáy bình

    const payload = {
      session_id:        sessionId,
      current_drop_rate: dropRate,
      current_weight:    parseFloat(weight.toFixed(2)),
    };

    try {
      const res = await fetch(`${API_URL}/du-lieu-esp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      // In phản hồi thô từ Server để theo dõi bộ đệm buffering (1->10)
      console.log(`[ESP-${sessionId.slice(0,8)}] Server phản hồi status: ${data.status}`);
  
      console.log(
        `[ESP-${sessionId.slice(0,8)}] ${payload.current_weight}g | ` +
        `${payload.current_drop_rate} g/p | còn ~${data.thoi_gian_con_lai ?? '?'} phút`
      );
    } catch (err) {
      console.error(`[ESP-${sessionId.slice(0,8)}] ❌ Không kết nối được server!`);
    }
  }, INTERVAL);

  return timer;
}

// ── Tự động lấy các session đang chạy từ Database ────────────────────────
async function fetchActiveSessions() {
  try {
    console.log('⏳ Đang tiến hành đăng nhập giả lập để lấy quyền...');
    
    // 1. Đăng nhập để lấy Token (Dùng tài khoản test của bạn)
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bacsi@hospital.com', password: '123456' })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginData.token) {
      console.error('❌ Giả lập đăng nhập thất bại, không có token:', loginData);
      return [];
    }
    
    console.log('✅ Đăng nhập thành công! Đang tải danh sách phiên truyền...');

    // 2. Dùng Token vừa lấy được để gọi API lấy danh sách
    const res = await fetch(`${API_URL}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}` // Gắn token vào thẻ chứng minh
      }
    });
    
    const data = await res.json();
    
    // Kiểm tra nhỡ server vẫn trả lỗi
    if (data.error) {
       console.error('❌ Lỗi từ server khi lấy danh sách:', data.error);
       return [];
    }

    // Lọc các session đang chạy thực tế
    return data.filter(s => s.status !== 'completed' && s.status !== 'urgent');
    
  } catch (err) {
    console.error('❌ Lỗi chi tiết:', err.message);
    return [];
  }
}
// ── Hàm chạy chính ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ESP32 Multi-Simulator khởi động...\n');

  const argSessionId = process.argv[2]; // node esp32_simulator.js <id>

  if (argSessionId) {
    console.log(`Chế độ: Chạy 1 phiên truyền chỉ định thủ công\n`);
    // Mặc định để tốc độ mục tiêu là 40 khi chạy đơn lẻ
    simulateDevice(argSessionId, 40, 500);
  } else {
    console.log('Chế độ: Tự động dò tìm toàn bộ phiên truyền đang hoạt động...\n');

    const sessions = await fetchActiveSessions();

    if (sessions.length === 0) {
      console.log('⚠️  Không có phiên truyền nào đang chạy trên hệ thống.');
      console.log('   Hãy tạo phiên truyền mới trên giao diện Web rồi chạy lại simulator này.\n');
      return;
    }

    console.log(`Tìm thấy ${sessions.length} phiên truyền đang chạy:\n`);
    sessions.forEach((s, i) => {
      console.log(`  ${i+1}. Bệnh nhân: ${s.patientName} — Phòng ${s.room} Giường ${s.bed} | ID: ${s.id}`);
    });
    console.log('');

    // Kích hoạt tất cả các thiết bị giả lập chạy song song, lệch nhau 0.5s để dễ nhìn log
    sessions.forEach((s, i) => {
      setTimeout(() => {
        simulateDevice(s.id, s.prescribedDropRate || 40, s.volumeInitial || 500);
      }, i * 500);
    });
  }
}

main();