# Changelog

Tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına uygun olacaktır.

## [2.9.2] - 2025-01-14

### Added
- Mesai süresi (overtime minutes) desteği eklendi
- Mesai bonusu sistemi (1.5x çarpan) eklendi
- Admin kullanıcılar için kilitleme bypass yetkisi
- Haftalık hedef listesi otomatik güncelleme özelliği
- Kesinti/Bonus ayrıntılı gösterimi
- `src/utils/computeWeeklyScore.js` yardımcı fonksiyonu eklendi
- `database/migrations/2025_10_31_051309_add_overtime_minutes_to_weekly_goals_table.php` migration dosyası eklendi

### Changed
- Backend computeSummary fonksiyonu frontend ile uyumlu hale getirildi
- Final skor hesaplama mantığı düzeltildi ve senkronize edildi
- Hedef Ayrıntısı bölümü 3 sütunlu düzene geçirildi
- Kaydet butonu durumu korunması iyileştirildi
- Admin kullanıcılar için kapasite kontrolleri bypass edildi

### Fixed
- Final skor hesaplamalarındaki tutarsızlık sorunu çözüldü
- Kaydet butonunun hızlı durum değiştirme sorunu çözüldü
- Admin kullanıcılar için kilitleme durumunda kayıt yapma sorunu çözüldü

### Database
- `overtime_minutes` kolonu `weekly_goals` tablosuna eklendi

## [2.10.2] - 2025-11-06

### Added
- Linux için otomatik güncelleme script'i eklendi (`scripts/linux-update.sh`)
- Linux kurulum ve güncelleme dokümantasyonu eklendi
- Laravel 12 log parse hatası için output filtreleme eklendi

### Changed
- `scripts/start-api.cjs` dosyası Laravel 12 uyumluluğu için güncellendi
- README.md dosyasına Linux güncelleme bilgileri eklendi
- API ve Frontend servisleri için systemd desteği eklendi

### Fixed
- Laravel 12'de `php artisan serve` komutunun log parse hatası düzeltildi
- "849 Closing" gibi mesajların port numarası olarak parse edilme sorunu çözüldü
- `start-api.cjs` dosyasında output filtreleme ile parse hataları önlendi

### Technical
- Laravel 12 uyumluluğu iyileştirildi
- Linux deployment desteği eklendi
- Systemd service yapılandırmaları eklendi

## [3.0.0] - 2026-03-11

### Added
- Haftalık hedef onay sistemi (approval_status, approved_by, approved_at, approval_note)
- İzin bildirimi sistemi (LeaveRequestModal, takvim seçimi, otomatik hedef entegrasyonu)
- Kullanıcı yönetimi paneli (UserPanel) ile toplu lider atama, toplu silme, özel düzenleme izni
- Özel düzenleme izni modalı (EditGrantModal) ve WeeklyGoalEditGrantController
- LeaveRequestController ve leave_requests tablosu
- Rol bazlı puanlama görünürlüğü (admin: tam skor, lider: harf notu, diğer: gizli)
- Bileşen ayrıştırma: AddTaskForm, TaskDetailModal, TaskSettingsModal, TeamModal, ThemePanel, UserProfileModal, WeeklyGoalsModal, GoalDescriptionModal, UpdatesModal
- Panel bileşenler: UserPanel, NotificationsPanel, ProfileMenuDropdown
- Context'ler: AuthContext, NotificationContext, ThemeContext
- Hook'lar: useTaskSettings, useUsers, useWeeklyGoals, useWeeklyOverview, useBodyScrollLock, usePreventAutofill
- Utility modülleri: performance.js, themes.js, weeklyLimits.js, teamAssignments.js
- Shared bileşenler: PriorityLabelWithTooltip, TooltipStatus
- View bileşenler: TaskListView, WeeklyOverviewView
- Layout bileşen: AppFooter
- POST /weekly-goals/approve endpoint'i
- GET/POST/DELETE /leave-requests endpoint'leri
- GET/POST/DELETE /weekly-goal-edit-grants endpoint'leri
- Veritabanı migration'ları: leave_requests, weekly_goal_edit_grants, approval sütunları

### Changed
- App.jsx'ten 20+ bileşen bağımsız dosyalara çıkarıldı
- Kilitleme kuralları rol bazlı: takım üyesi 10:00, takım lideri 13:30, admin sınırsız
- Tüm input alanları tutarlı yuvarlak köşeye (borderRadius: 8px) geçirildi
- Yeni Kullanıcı Ekle formu tema uyumlu hale getirildi (currentTheme prop)
- Yeni Görev formu input stilleri tutarlı hale getirildi
- Kullanıcı paneli eylem çubuğu yeniden tasarlandı: eşit boşluklar, ayırıcı, açıklayıcı buton adları
- Şifre tekrar alanı kullanıcı ekleme formundan kaldırıldı
- README.md ve proje yapısı güncellendi

### Fixed
- Per-row Gerçekleşme(%) tutarsızlığı düzeltildi (hasUnplannedWork flag'i per-row hesaplamaya geçirildi)
- Kullanılmayan parametreler (alpha, beta, B_max, eta_max) temizlendi
- Tooltip fallback değerleri getDailyActualLimits() ile eşleştirildi

### Database
- `leave_requests` tablosu eklendi (user_id, week_start, monday-friday, grace alanları)
- `weekly_goal_edit_grants` tablosu eklendi
- `weekly_goals` tablosuna approval_status, approved_by, approved_at, approval_note sütunları eklendi

## [3.0.2] - 2026-03-16

### Added
- Sistem Yönetimi: Veritabanı Yükle özelliği (admin şifre doğrulamalı)
- POST /database-restore endpoint'i (UserController::databaseRestore)
- DatabaseBackup.upload() API fonksiyonu

### Changed
- Kullanıcı Listesi: Tablo başlığı eklendi (Tümünü Seç, Ad Soyad, Mail Adresi, Şifre Sıfırla)
- Kullanıcı satırları: Ad Soyad ve Mail Adresi yan yana ayrı kolonlarda
- Eylem alanı: Tümünü Seç ve İptal butonları kaldırıldı (tablo başlığı checkbox'a taşındı)
- Yeni Kullanıcı Ekle: Manuel form ve Excel toplu import yan yana (sol/sağ) grid layout
- Veritabanı Yedekleme: İndir ve Yükle butonları yan yana, farklı renklerle
- Admin kullanıcılar artık silinebilir (panel sadece adminlere açık)

### Fixed
- Kullanıcı seçimi kaldırıldığında bulk alanların (lider, departman, rol) sıfırlanması
- Veritabanı yükleme şifre hatasında bildirim gösterilmemesi (alert + notify)

## [3.0.1] - 2026-03-14

### Added
- Departman tabanlı kullanıcı yönetimi: kullanıcı oluşturma, güncelleme ve toplu import akışlarına departman desteği
- `GET /departments` endpoint'i ve departman config yapısı
- Çok dönemli haftalık rapora departman filtresi ve departman sütunu eklendi
- Kullanıcı yönetim paneline iki satırlı toplu işlem barı (lider/departman/rol + eylem butonları)

### Changed
- Filtreleme alanında isim arama + ekle akışı kaldırıldı, departman seçimi combobox olarak sadeleştirildi
- Kullanıcı satırlarından lider/rol/departman alanları kaldırılarak kart görünümü sadeleştirildi
- Admin kullanıcılar seçim kapsamına alındı (observer hariç)

### Fixed
- Kullanıcı yönetim panelinde departman sonrası oluşan hizalama ve taşma problemleri giderildi
- Tek kullanıcı seçildiğinde üst bardaki lider/departman/rol alanlarının otomatik doldurulması eklendi
- Sadece admin kullanıcılar seçiliyken lider ataması yapılmaması, diğer toplu değişikliklerin uygulanması sağlandı

## [1.0.0] - 2024-01-XX

### Added
- Electron tabanlı masaüstü uygulaması
- React frontend
- Laravel API backend
- Görev oluşturma ve düzenleme
- Kullanıcı yönetimi
- Dosya ekleme desteği
- Bildirim sistemi
- Modern UI/UX tasarımı

### Features
- ✅ Görev CRUD işlemleri
- 👥 Kullanıcı atama
- 📅 Tarih bazlı görev yönetimi
- 📊 Görev durumu takibi
- 🔔 Gerçek zamanlı bildirimler
- 📎 Dosya ekleme ve yönetimi
- 🎨 Responsive tasarım
- 🔍 Arama ve filtreleme

### Technical
- Electron 37.2.6
- React 19.1.1
- Laravel 12
- Tailwind CSS 4.1.12
- Vite 7.1.2

## [0.1.0] - 2024-01-XX

### Added
- İlk geliştirme sürümü
- Temel görev yönetimi
- Basit kullanıcı arayüzü

---

## Sürüm Numaralandırma

Bu proje [Semantic Versioning](https://semver.org/lang/tr/) kullanır:

- **MAJOR**: Uyumsuz API değişiklikleri
- **MINOR**: Geriye uyumlu yeni özellikler
- **PATCH**: Geriye uyumlu hata düzeltmeleri

## Katkıda Bulunma

Yeni değişiklikler eklerken:
1. Uygun bölüme ekleyin (Added, Changed, Deprecated, Removed, Fixed, Security)
2. Değişikliği açık ve kısa bir şekilde açıklayın
3. Gerekirse teknik detayları ekleyin
4. Tarih formatını koruyun (YYYY-MM-DD)
