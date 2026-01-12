## v2.10.6 – 12.01.2026

### Değişiklikler
**Haftalık Hedef Zaman Aşım Kuralı**
- Toplam hedef süre (planlı + plansız) kullanılabilir süreyi aşamaz
- Mesai süresi girilerek kullanılabilir süre artırılabilir
- Kapasite aşımı durumunda görsel uyarılar ve hata mesajları gösterilir
- Boş görev listesi kaydedilebilir (tüm görevleri silme özelliği)

### Performans İyileştirmeleri
**Sayısal Alanlarda Anlık Güncelleme**
- Haftalık Hedefler panelindeki Hedef (dk) ve Gerçekleşme (dk) alanlarında gecikmeler tamamen giderildi
- Bu alanlara değer girildiğinde Hedef Ayrıntısı bölümü anında güncelleniyor
- Yazılan sayılar artık anında ekranda görünüyor ve hesaplamalar anlık olarak yapılıyor
- İzin (dk) ve Mesai (dk) alanlarındaki gibi akıcı bir kullanım deneyimi sağlandı
- Mouse wheel ile sayısal alanlarda yanlışlıkla değer değişmesi engellendi

---

## v2.10.5 – 07.01.2026

### Performans İyileştirmeleri
**Yazma Deneyimi İyileştirildi**
- Haftalık Hedefler panelindeki metin alanlarında yaşanan gecikmeler giderildi
- Yazılan karakterler artık anında ekranda görünüyor
- Uzun metinlerde yazma performansı belirgin şekilde artırıldı
- Başlık, Aksiyon Planı ve Ek Açıklama alanlarında daha akıcı bir yazım deneyimi sağlandı

### Yeni Özellikler
**Gelişmiş Tema Sistemi**
- Uygulama genelinde dinamik tema desteği eklendi
- 6 adet hazır tema seçeneği sunuldu:
  - Koyu, Açık, Mavi, Yeşil, Mor, Turuncu
- Özel tema oluşturma imkânı:
  - 9 farklı renk alanı ayrı ayrı özelleştirilebilir
  - Koyu / Açık logo seçimi yapılabilir
- Tema tercihleri kullanıcı hesabına kaydedilir ve otomatik olarak yüklenir
- Tüm UI bileşenleri tema uyumlu hale getirildi:
  - Input alanları, butonlar, tablolar ve dropdown menüler

### Değişiklikler
**Haftalık Hedefler Kilitleme Kuralları Yeniden Düzenlendi**
- **Mevcut Hafta (Pazartesi 13:30’dan önce)** : Hedef ve gerçekleşme alanları açıktır
- **Mevcut Hafta (Pazartesi 13:30’dan sonra)**  : Hedef alanları kilitli, gerçekleşme alanları açıktır
- **Önceki Hafta (Mevcut hafta Pazartesi 13:30’dan önce)** : Hedef alanları kilitli, gerçekleşme alanları düzenlenebilir
- **Önceki Hafta (Mevcut hafta Pazartesi 13:30’dan sonra)** : Hedef ve gerçekleşme alanları tamamen kilitlenir
- **Daha Eski Haftalar** : Hedef ve gerçekleşme alanları kilitlidir
- **Gelecek Haftalar** : Hedef ve gerçekleşme alanları açıktır
- **Plana Dahil Olmayan İşler** : Gerçekleşme alanı kilitlendiğinde bu bölüm de kilitlenir

### İyileştirmeler
**UI / UX İyileştirmeleri**:
  - Tema ayarları paneli yeniden tasarlandı:
    - 2 sütunlu düzen
    - Daha büyük ve anlaşılır renk seçim alanları
  - Disabled butonların görünürlüğü ve cursor davranışı iyileştirildi
  - Tüm kapatma butonları standart hale getirildi (✕ simgesi)
  - Dropdown menüler ve input alanları tema ile tam uyumlu çalışacak şekilde güncellendi

---
## v2.10.4 – 05.01.2026

### Düzeltmeler
**Görev Ekleme Sorunu Giderildi**
- Manuel olarak görevden çıkarılan kullanıcılar, otomatik ekleme sırasında yeniden eklenmiyor
- Artık yalnızca seçilen kullanıcılar göreve atanıyor
- Gereksiz bildirim gönderimi engellendi

---
## v2.10.3 – 05.01.2026

### Değişiklikler
**Haftalık Hedefler Kilitleme Kuralları Güncellendi**
- Hedef alanları Pazartesi 13:30’a kadar düzenlenebilir _(önceki sınır: 10:00)_
- Gerçekleşme alanı sürekli açık olacak şekilde düzenlendi

**Planlı Süre Kontrolü Kaldırıldı**
- İzin eklenirken planlı süre, kullanılabilir süreyi aşsa bile kaydedilebilir
- Sadece gerçekleşen süre, kullanılabilir süreyi aşarsa kaydetme engellenir

### Yeni Özellikler
**Tamamlanmayan İşleri Aktar**
- Haftalık Hedefler penceresine **“Tamamlanmayan İşleri Aktar”** butonu eklendi
- Önceki haftadan tamamlanmamış görevler tek tıkla mevcut haftaya aktarılabilir