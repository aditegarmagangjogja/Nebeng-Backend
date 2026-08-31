<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">Core Backend Engine untuk Platform Ride-Sharing Antarkota & Logistik Hub-to-Hub Berbasis <a href="http://nestjs.com" target="_blank">NestJS 11</a>, Prisma ORM 7, Escrow System, dan Verification Dual QR Code Checkpoint.</p>

<p align="center">
  <a href="https://nestjs.com" target="_blank"><img src="https://img.shields.io/badge/framework-NestJS%20v11-red.svg" alt="Framework" /></a>
  <a href="https://www.prisma.io/" target="_blank"><img src="https://img.shields.io/badge/ORM-Prisma%20v7.9.1-blue.svg" alt="ORM" /></a>
  <a href="https://swagger.io/" target="_blank"><img src="https://img.shields.io/badge/OpenAPI-Swagger-brightgreen.svg" alt="Swagger UI" /></a>
  <a href="https://jestjs.io/" target="_blank"><img src="https://img.shields.io/badge/testing-Jest%20100%25-green.svg" alt="Testing" /></a>
</p>

---

## 📌 Description

**Nebeng Backend** adalah platform transportasi antarkota dan logistik *Hub-to-Hub* berbasis terminal/pos resmi. Platform ini mengutamakan keamanan transaksi tinggi melalui verifikasi identitas dua tingkat, penahanan dana otomatis (**Escrow System**), serta verifikasi ganda berbasis QR Code pada pos asal dan pos tujuan.

### 🌟 Fitur Utama Platform
* **Transportasi Terencana**: Layanan antar-pos (Hub-to-Hub) dengan tarif transparan dan terukur.
* **Keamanan Logistik & Physical Inspection**: Form pemeriksaan fisik isi paket bersama pengirim, fitur foto kondisi barang, dan penempelan Stiker Segel QR Unik (*Security Seal*).
* **Escrow Payment & Wallet System**: Penahanan dana otomatis saat *checkout* pembayaran hingga perjalanan/pengiriman diselesaikan secara valid.
* **Dual QR Code Scanner & Handover OTP**:
  * **Scan 1 (Check-In Origin)**: Memindai QR Trip Mitra + QR Tiket/Paket di Pos Asal $\rightarrow$ Status: `IN_TRANSIT`.
  * **Scan 2 (Check-In Destination)**: Memindai QR Trip Mitra + QR Tiket/Paket + OTP 6-Digit di Pos Tujuan $\rightarrow$ Status: `COMPLETED` & Mentrigger *Escrow Release* ke Wallet Mitra.
* **Tata Kelola Multi-Tenant & RBAC**: Hak akses berjenjang untuk `superadmin`, `admin_wilayah`, `operator_pos`, `mitra`, dan `customer`.

---

## 🏗️ Technical Architecture & Standards

Sistem mengadopsi pola arsitektur modular yang ketat:

$$\text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{Prisma ORM} \longrightarrow \text{Database (MySQL)}$$

### Aturan Arsitektur & Keamanan Utama:
1. **Repository Abstraction**: Controller dilarang memanggil `PrismaService` secara langsung.
2. **Data Mapper & BigInt Handling**: Kunci utama/asing bertipe `BigInt` dikonversi dengan aman menjadi `string` pada layer Data Mapper/DTO untuk mencegah error serialisasi JSON.
3. **Escrow & Financial Safety**: Seluruh perhitungan tarif dan pencairan dana wajib diproses di *server-side* dan dibungkus dalam Prisma Atomic Transaction (`prisma.$transaction`).
4. **Data Isolation**: Password, hash PIN, dan refresh token di-hash (`bcrypt`) dan dilarang ditampilkan pada response API.

---

## 📊 Modules & Progress Status

| Modul | Status | Deskripsi Ringkas |
| :--- | :---: | :--- |
| **0. Foundation** | ✅ COMPLETE | NestJS 11, Prisma 7, MySQL, Swagger UI, Global ValidationPipe. |
| **1. Auth & Users** | ✅ COMPLETE | Register, Login, JWT Strategy, Refresh Token Rotation, RBAC, PIN 2FA. |
| **2. Verification Center** | ✅ COMPLETE | Upload KTP/SIM/SKCK/STNK, Antrean Admin Wilayah, Approval/Rejection. |
| **3. Region & Pickup Points** | ✅ COMPLETE | Management Wilayah, Kota, Pos Checkpoint, Latitude/Longitude & QR Pos. |
| **4. Mitra & Vehicles** | ✅ COMPLETE | Registrasi Kendaraan (Motor/Mobil), Aturan Kunci Kapasitas, Schedule Trip. |
| **5. Booking Engine** | ✅ COMPLETE | Order Penumpang & Parcel, Kalkulasi Bobot, Generate OTP Klaim 6-Digit. |
| **6. Payments & Wallet** | ✅ COMPLETE | Checkout Payment Simulation, Ledger Transaction, *Escrow Hold Balance*. |
| **7. Checkpoints & QR** | ✅ COMPLETE | Dual QR Check-in (Origin/Destination), Handover OTP, *Escrow Release*. |
| **8. In-App Chat** | ✅ COMPLETE | Percakapan Customer-Mitra, Auto-Lock Conversation pada Trip Selesai/Batal. |
| **9. Reviews & Rewards** | ✅ COMPLETE | Rating & Ulasan Trip, Penambahan & Penukaran Poin Reward Customer. |
| **10. Quality Assurance** | ✅ COMPLETE | Unit Testing (Services & Controllers) + Full Lifecycle E2E Integration Test. |

---

## ⚙️ Environment Setup

Buat file `.env` pada root direktori backend:

```env
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/nebeng"

JWT_SECRET="super-secret-jwt-key"
JWT_REFRESH_SECRET="super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

## Instalasi dan migrasi database
```
  npm install

  npx prisma validate
  npx prisma migrate dev
  npx prisma generate
```

## Menjalankan pengujian testing
```
  npm run test:e2e
```

## Menjalankan Applikasi
```
  npm run start

  npm run start:dev

  npm run build
  npm run start:prod
```