## v2.10.5 - 06.01.2026

### Yeni Özellikler
**Kapsamlı Tema Sistemi**: 
  - Uygulama genelinde dinamik tema desteği eklendi
  - 6 hazır tema seçeneği (Koyu, Açık, Mavi, Yeşil, Mor, Turuncu)
  - Özel tema oluşturma: 9 farklı renk özelleştirme seçeneği
  - Logo tipi seçimi (Koyu/Açık logo)
  - Tema ayarları kullanıcı hesabına kaydediliyor ve otomatik yükleniyor
  - Tüm UI bileşenlerine tema uygulandı (input'lar, butonlar, tablolar, modaller, dropdown'lar)

### Değişiklikler
**Haftalık Hedefler Kilitleme Kuralları Yeniden Düzenlendi**:
  - **Mevcut Hafta (Pazartesi 13:30'dan önce)**: Hem hedef hem gerçekleşme alanları açık
  - **Mevcut Hafta (Pazartesi 13:30'dan sonra)**: Hedef alanları kilitli, gerçekleşme alanları açık
  - **Önceki Hafta (Mevcut hafta Pazartesi 13:30'dan önce)**: Hedef alanları kilitli, gerçekleşme alanları açık (önceki haftanın gerçekleşmesi düzenlenebilir)
  - **Önceki Hafta (Mevcut hafta Pazartesi 13:30'dan sonra)**: Hem hedef hem gerçekleşme alanları kilitli (önceki hafta tamamen kilitli)
  - **Daha Eski Geçmiş Haftalar**: Hem hedef hem gerçekleşme alanları kilitli
  - **Gelecek Haftalar**: Hem hedef hem gerçekleşme alanları açık
  - **Plana Dahil Olmayan İşler**: Gerçekleşme kilitliyken bu bölüm de kilitleniyor

### İyileştirmeler
**UI/UX İyileştirmeleri**:
  - Tema ayarları paneli yeniden tasarlandı (2 sütunlu düzen, büyük renk kutuları)
  - Disabled butonlar için görünürlük ve cursor iyileştirmeleri
  - Tüm kapatma butonları standartlaştırıldı (✕ simgesi)
  - Dropdown menüler ve input alanları tema uyumlu hale getirildi

---
## v2.10.4 - 05.01.2026

### Düzeltmeler
**Görev Ekleme Sorunu Düzeltildi**: Manuel olarak kaldırılan kullanıcılar, görev oluşturulurken otomatik ekleme sırasında tekrar eklenmiyor. Artık sadece seçtiğiniz kişiler göreve atanacak ve gereksiz bildirimler gönderilmeyecek.

---

## v2.10.3 - 05.01.2026

### Değişiklikler
**Haftalık Hedefler Kilitleme Kuralları Güncellendi**:
  - Hedef kilidi artık Pazartesi 13:30'a kadar açık (önceden 10:00'du)
  - Gerçekleşme alanı artık sürekli açık, hiçbir zaman kilitlenmiyor
**Planlı Süre Kontrolü Kaldırıldı**: İzin eklendiğinde planlı süre kullanılabilir süreyi aşsa bile kaydedilebilir. Sadece gerçekleşen süre kullanılabilir süreyi aşarsa kaydetme engellenir.

### Yeni Özellikler
**Tamamlanmayan İşleri Aktar**: Haftalık Hedefler penceresinde "Tamamlanmayan İşleri Aktar" butonu eklendi. Bu buton ile önceki haftadan tamamlanmamış görevleri mevcut haftaya aktarabilirsiniz.
