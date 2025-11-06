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

## [Unreleased]

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
