# HƯỚNG DẪN CÀI ĐẶT HOÀN CHỈNH
## Hệ thống Giám sát Truyền dịch — Windows · Node.js v24

---

## BƯỚC 1 — Tạo thư mục FE (30 giây)

Mở PowerShell trong VS Code (Ctrl + `)

```powershell
# Di chuyển ra thư mục cha của backend
cd D:\                        # hoặc thư mục bạn đang dùng

# Tạo thư mục FE
mkdir hospital-fe
cd hospital-fe
```

---

## BƯỚC 2 — Sao chép code vào thư mục

Giải nén file `hospital-fe.zip` (hoặc copy toàn bộ thư mục src/)
vào `D:\hospital-fe\`

Cấu trúc cuối cùng phải là:
```
D:\hospital-fe\
├── index.html
├── package.json
├── vite.config.js
└── src\
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context\
    │   └── AppContext.jsx
    ├── components\
    │   ├── Sidebar.jsx
    │   ├── CreateSessionModal.jsx
    │   └── SessionCard.jsx
    └── pages\
        ├── Dashboard.jsx
        ├── Patients.jsx
        ├── Notifications.jsx
        └── Settings.jsx
```

---

## BƯỚC 3 — Cài packages (1-2 phút)

```powershell
# Vẫn đang ở D:\hospital-fe
npm install
```

Lệnh này sẽ tải về:
- React 18
- Vite (build tool)
- Tailwind CSS v4
- React Router (chuyển trang)
- Axios (gọi API)
- Recharts (vẽ biểu đồ)

---

## BƯỚC 4 — Cấu hình CORS trong Backend

Mở thư mục backend (`D:\bmed1-doantrang`) trong VS Code.
Mở file `server.js`, tìm dòng `const app = express()`, thêm NGAY BÊN DƯỚI:

```javascript
const cors = require('cors')

// THÊM 2 dòng này sau dòng const app = express()
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}))
```

Cài cors nếu chưa có:
```powershell
cd D:\bmed1-doantrang
npm install cors
```

---

## BƯỚC 5 — Kiểm tra API Backend

Backend cần có các endpoint sau (FE sẽ gọi):

| Method | URL                          | Mô tả                        |
|--------|------------------------------|------------------------------|
| GET    | /api/sessions                | Lấy danh sách phiên          |
| POST   | /api/sessions                | Tạo phiên mới                |
| PATCH  | /api/sessions/:id/end        | Kết thúc phiên               |
| PATCH  | /api/sessions/:id/error      | Đánh dấu lỗi thiết bị        |
| GET    | /api/devices                 | Lấy danh sách thiết bị ESP32 |

### Cấu trúc JSON cho GET /api/sessions:
```json
[
  {
    "id": "session-001",
    "patientName": "Nguyễn Văn A",
    "age": 45,
    "room": "101",
    "bed": "101",
    "condition": "sốt",
    "deviceId": "ESP32-001",
    "fluidType": "NaCl 0.9%",
    "volumeInitial": 1000,
    "volumeRemaining": 997,
    "dropRate": 90,
    "doctor": "ntt",
    "ended": false,
    "manualError": false
  }
]
```

---

## BƯỚC 6 — Chạy hệ thống

### Terminal 1 — Backend (D:\bmed1-doantrang)
```powershell
cd D:\bmed1-doantrang
node server.js
```
→ Phải thấy: `Server running on port 3000` (hoặc port bạn dùng)

### Terminal 2 — Frontend (D:\hospital-fe)
```powershell
cd D:\hospital-fe
npm run dev
```
→ Phải thấy:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
```

Mở Chrome: `http://localhost:5173`

---

## BƯỚC 7 — Kiểm tra hoạt động

### Checklist:
- [ ] Sidebar hiện 4 mục: Tổng quan, Bệnh nhân, Thông báo, Cài đặt
- [ ] Nút "Tạo phiên truyền mới" mở modal form
- [ ] 4 stat cards hiện số từ backend
- [ ] Card bệnh nhân hiện trong phần "Phiên truyền hiện tại"
- [ ] Nút "Lỗi thiết bị" chuyển sang trang Thông báo
- [ ] Nút "Kết thúc" xóa card khỏi màn hình
- [ ] Trang Bệnh nhân có biểu đồ real-time

---

## LỖI THƯỜNG GẶP

### ❌ CORS Error
```
Access to XMLHttpRequest ... blocked by CORS policy
```
Fix: Kiểm tra lại Bước 4, đảm bảo `app.use(cors(...))` ở đúng vị trí trong server.js

---

### ❌ Tailwind không có màu
Fix: Kiểm tra `vite.config.js` có dòng `import tailwindcss from '@tailwindcss/vite'`
và `plugins: [react(), tailwindcss()]`

---

### ❌ Cannot GET / khi reload trang
Fix: Đã có sẵn trong vite.config.js (`historyApiFallback: true`)

---

### ❌ Port Backend sai
Mở `src/context/AppContext.jsx`, dòng 4:
```javascript
const API = 'http://localhost:3000/api'
```
Đổi `3000` thành port thực tế của backend bạn.

---

### ❌ Biểu đồ không hiện
Fix: Chạy `npm install recharts` trong thư mục hospital-fe

---

## CHẠY LẦN ĐẦU KHÔNG CÓ BACKEND

Nếu muốn xem giao diện trước khi BE sẵn sàng, sửa `AppContext.jsx`:
Thay `fetchSessions` thành trả về dữ liệu giả:

```javascript
const fetchSessions = useCallback(async () => {
  // MOCK DATA - xóa khi BE sẵn sàng
  setSessions([
    {
      id: '1', patientName: 'trang', age: 18,
      room: '101', bed: '101', condition: 'sốt',
      deviceId: 'ESP32-001', fluidType: 'NaCl 0.9%',
      volumeInitial: 1000, volumeRemaining: 997,
      dropRate: 81, doctor: 'ntt', ended: false,
    }
  ])
  setLoading(false)
}, [getStatus])
```
