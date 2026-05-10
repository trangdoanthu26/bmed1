// ============================================================
// esp32_simulator.js — Giả lập ESP32 gửi dữ liệu lên server
// Cách dùng:
//   1. Tạo 1 phiên truyền trên web
//   2. Copy session_id từ DB vào biến SESSION_ID bên dưới
//   3. Chạy: node esp32_simulator.js
// ============================================================

const API_URL    = 'http://localhost:8000/api/du-lieu-esp';
const SESSION_ID = '3a5198d7-46df-11f1-8d28-6018953db4d6'; // ← thay bằng session_id thật

// Thông số giả lập
const TRONG_LUONG_VO_CHAI = 30;  // gram
let   current_weight      = 500; // gram (tương đương ~470 ml ban đầu)
const TARGET_DROP_RATE    = 40;  // giọt/phút (giả lập tốc độ y lệnh)

console.log('🚀 ESP32 Simulator đang chạy...');
console.log(`   Session ID : ${SESSION_ID}`);
console.log(`   Server URL : ${API_URL}`);
console.log(`   Tốc độ mục tiêu: ${TARGET_DROP_RATE} giọt/phút`);
console.log('─'.repeat(55));

setInterval(async () => {
  // Giả lập tốc độ dao động ±20% quanh mục tiêu (có nhiễu cảm biến)
  const noise           = (Math.random() - 0.5) * TARGET_DROP_RATE * 0.4;
  const current_drop_rate = Math.max(0, Math.round(TARGET_DROP_RATE + noise));

  // Dịch vơi dần mỗi 3 giây (~0.5–1.5 gram)
  current_weight -= 0.5 + Math.random();
  if (current_weight < TRONG_LUONG_VO_CHAI) current_weight = TRONG_LUONG_VO_CHAI;

  const payload = {
    session_id:        SESSION_ID,
    current_weight:    parseFloat(current_weight.toFixed(2)),
    current_drop_rate: current_drop_rate,
  };

  try {
    const res    = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    const theTickConLai = (current_weight - TRONG_LUONG_VO_CHAI).toFixed(1);
    console.log(
      `[${new Date().toLocaleTimeString('vi-VN')}]` +
      `  Trọng lượng: ${payload.current_weight}g` +
      `  | Thể tích còn: ${theTickConLai} ml` +
      `  | Tốc độ: ${current_drop_rate} giọt/phút` +
      `  | Còn lại: ${result.thoi_gian_con_lai ?? '?'} phút`
    );
  } catch {
    console.error('❌ Không kết nối được server. Kiểm tra node server.js đang chạy chưa.');
  }
}, 3000);