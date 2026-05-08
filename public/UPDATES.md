## v3.0.4 – 08.05.2026

### Yeni Özellikler

**Çalışma Takvimi İstisnaları (Sistem Yönetimi)**
- Sistem ayarları içinde gün bazlı çalışma takvimi istisnası ekleme/düzenleme akışı eklendi
- "Tatil / Çalışma" tipi seçimi, kapsam hedefleme (tüm kullanıcılar, departman, takım, kullanıcı) desteklendi
- Takvim üzerinde seçili gün için inline düzenleme paneli ile hızlı kayıt/silme akışı eklendi

**Resmi Tatil Presetleri (TR)**
- Türkiye resmi tatilleri varsayılan takvim katmanı olarak eklendi
- Presetten gelen günler ayrı kaynak bilgisiyle (`source: preset`) işaretlenir
- Gerekli helper yapıları frontend ve backend tarafında ortak mantıkla güncellendi

### Değişiklikler

**Takvim ve İzin Entegrasyonu**
- İzin Bildirimi ve İzin Yönetimi ekranları çalışma takvimi renk/istatü bilgisiyle senkron hale getirildi
- Çalışma olarak işaretlenen hafta sonlarında izin seçimi desteklendi
- Gün bazlı efektif dakika hesabı (`effective-day-minutes`) ile izin süreleri daha doğru hesaplanır hale getirildi

**Sistem Ayarları ve Mola Düzeni**
- Mesai satırındaki Başlangıç / Bitiş / Tam gün alanları aynı yükseklikte hizalandı
- Mola satırlarının görsel ayrımı ve silme butonlarının yerleşimi iyileştirildi

### Altyapı ve Veri Katmanı
- `calendar_overrides` tablosuna `source` alanı eklendi ve ilgili migration/controller doğrulamaları güncellendi
- İzin tabloları için hafta sonu izin alanları ve yardımcı hesaplama fonksiyonları geliştirildi
- Çalışma takvimi ve resmi tatil kaynaklarını birleştiren yardımcı sınıflar eklendi

---

## v3.0.3 – 27.04.2026

### Yeni Özellikler

**İzin Yönetimi – Aktif Özel Düzenleme İzinleri**
- "Özel Düzenleme İzni" sekmesinde verilmiş aktif izinlerin listesi (kullanıcı, hafta, bitiş zamanı, kaldırma)
- İzin verildikten veya kaldırıktan sonra listenin ve haftalık hedeflerin güncellenmesi

**İç İçe Pencereler (Modal Yığını)**
- `useOutsideClickClose` ile yalnızca en üstteki pencerenin dışa tıklanınca kapanması
- Kullanıcı Yönetimi açıkken İzin Yönetimi’ne tıklanınca her iki pencerenin birden kapanma sorununun giderilmesi

### Değişiklikler

**Haftalık Hedefler ve Özel Düzenleme İzni**
- Yöneticinin verdiği özel düzenleme izni varken, uygulama içi saat kilidinin bu izni geçersiz kılması düzeltildi
- Haftalık hedef verisi yüklenmeden önce kilit durumunun yanlış yorumlanmaması için ilk yüklemede kilit bilgisi `null` ile ayrıştırıldı

**İzin Bildirimi (Kayıtlı İzinler)**
- Tam gün izinler özet gruplu; saatlik izinler ayrı satırda gösteriliyor (tarih, saat aralığı, dakika)
- Tam gün ve saatlik satırlardaki silme eylemleri aynı görünümde: yuvarlak çöp kutusu butonu, temaya uygun

**Diğer Paneller**
- Aynı dışa tıkla kapanma davranışı LeaveRequestModal, görev/ayar modalları, tema paneli, sistem ayarları, yeni görev formu gibi bileşenlerde tutarlı hale getirildi

### Düzeltmeler
- Aynı haftaya sadece yeni bir izin günü eklerken, o haftadaki mevcut izin günlerinin silinmesi (API: `POST /leave-requests` birleştirme / merge mantığı)
- İzin sürelerinin haftalık hedeflere yanlış yansıması (üstteki veri kaybı düzeltmesiyle)

---

## v3.0.2 – 16.03.2026

### Yeni Özellikler

**Veritabanı Yükleme**
- Sistem Yönetimi panelinde "Veritabanını Yükle" özelliği eklendi
- Yedekten geri yükleme için admin şifre doğrulaması zorunlu
- POST /database-restore endpoint'i (SQLite header kontrolü, mevcut DB yedeği)

**Kullanıcı Listesi Tablo Düzeni**
- Tablo başlığı eklendi: Tümünü Seç (checkbox), Ad Soyad, Mail Adresi, Şifre Sıfırla
- Ad Soyad ve Mail Adresi ayrı kolonlarda yan yana gösteriliyor
- Tümünü Seç checkbox'ı: tıklanınca tüm seçilebilir kullanıcıları seçer; hepsi seçiliyken tekrar tıklanınca seçimleri kaldırır ve bulk alanları sıfırlar

**Yeni Kullanıcı Ekle Layout**
- Manuel form (sol) ve Excel toplu import (sağ) yan yana grid düzeni

### Değişiklikler

**Eylem Alanı Sadeleştirildi**
- Tümünü Seç ve İptal butonları kaldırıldı (işlev tablo başlığı checkbox'ına taşındı)
- Lider, Departman, Rol, Uygula, Seçili Kullanıcıları Sil ve İzin Yönetimi tek satırda

**Veritabanı Yedekleme Alanı**
- İndir ve Yükle butonları yan yana, farklı renklerle
- Şifre hatasında bildirim gösterimi (alert + notify)

**Admin Silme**
- Admin rolündeki kullanıcılar artık silinebilir (panel sadece adminlere açık)

### Düzeltmeler
- Kullanıcı seçimi kaldırıldığında bulk alanların (lider, departman, rol) sıfırlanması
- Veritabanı yükleme şifre hatasında bildirim gösterilmemesi

---

## v3.0.1 – 14.03.2026

### Yeni Özellikler

**Departman Tabanlı Filtreleme Sistemi**
- Kullanıcılara departman atama özelliği eklendi (Ar-Ge, Fikstür, Elektronik Montaj, Giriş Kalite)
- Çok dönemli haftalık hedef filtrelerine departman filtresi eklendi
- Multi-week tabloda departman bilgisi gösterimi eklendi

**Kullanıcı Yönetimi Toplu İşlem Barı**
- Kullanıcı yönetim paneli iki satırlı toplu işlem barı ile yeniden düzenlendi
- Lider, Departman ve Rol seçimleri tek noktadan toplu uygulanabilir hale getirildi
- "Tümünü Seç" aksiyonu ile observer hariç toplu seçim desteği eklendi

### Değişiklikler

**Weekly Overview Filtre Akışı Sadeleştirildi**
- İsim arama + "Ekle" tabanlı dahil etme akışı kaldırıldı
- Departman seçimi checkbox yerine combobox olarak güncellendi

**Kullanıcı Satır Görünümü Sadeleştirildi**
- Kullanıcı satırlarından lider/rol/departman dropdown alanları kaldırıldı
- Satırda sadece seçim kutusu, ad-soyad, e-posta ve şifre sıfırlama butonu bırakıldı

### Düzeltmeler
- Kullanıcı yönetim panelindeki sütun kaymaları ve taşmalar giderildi
- Admin kullanıcılar seçilebilir hale getirildi; sadece admin hedefinde lider ataması atlanır, diğer güncellemeler uygulanır
- Tek kullanıcı seçildiğinde üst bardaki Lider/Departman/Rol combobox’ları otomatik doldurulur

---

## v3.0.0 – 11.03.2026

### Yeni Özellikler

**Haftalık Hedef Onay Sistemi**
- Takım üyelerinin haftalık hedefleri lider/admin onayı gerektirir
- Onayla/Reddet butonları ve onay durumu badge'i
- Onay notu ve bildirim entegrasyonu
- Veritabanı: approval_status, approved_by, approved_at, approval_note sütunları

**İzin Bildirimi Sistemi**
- Kullanıcıların izin günlerini bildirebildiği takvim seçimli modal
- Takım liderleri geçmiş tarihe de izin girebilir
- İzin süreleri otomatik olarak haftalık hedeflere yansır
- İzin input'u devre dışı, sadece gösterim amaçlı

**Kullanıcı Yönetimi Paneli (UserPanel)**
- Toplu lider atama (sadece takım üyeleri için)
- Toplu kullanıcı silme (admin hariç)
- Özel düzenleme izni verme modalı (EditGrantModal)
- Takım liderleri seçilebilir, ancak lider ataması sadece üyelere yapılır

**Rol Bazlı Puanlama Görünürlüğü**
- Admin: tam performans skoru görünür
- Takım Lideri: harf notu görünür
- Diğer: puanlama gizli

**Kilitleme Kuralları Güncellendi**
- Takım üyesi: Pazartesi 10:00'dan sonra hedefler kilitli
- Takım lideri: Pazartesi 13:30'dan sonra hedefler kilitli
- Admin: sınırsız düzenleme yetkisi

### Değişiklikler

**Mimari Yeniden Yapılandırma**
- App.jsx'ten bağımsız bileşenler çıkarıldı: AddTaskForm, TaskDetailModal, TaskSettingsModal, TeamModal, ThemePanel, UserProfileModal, WeeklyGoalsModal, GoalDescriptionModal, EditGrantModal, LeaveRequestModal, UpdatesModal
- Panel bileşenler ayrıldı: UserPanel, NotificationsPanel, ProfileMenuDropdown
- Context'ler oluşturuldu: AuthContext, NotificationContext, ThemeContext
- Hook'lar oluşturuldu: useTaskSettings, useUsers, useWeeklyGoals, useWeeklyOverview, useBodyScrollLock, usePreventAutofill
- Utility modülleri eklendi: performance.js, themes.js, weeklyLimits.js, teamAssignments.js

**UI/UX İyileştirmeleri**
- Tüm input alanları tutarlı yuvarlak köşeye (borderRadius: 8px) geçirildi
- Yeni Kullanıcı Ekle formu tema uyumlu hale getirildi
- Yeni Görev formu input stilleri tutarlı hale getirildi
- Kullanıcı paneli eylem çubuğu: eşit boşluklarla dizilim, ayırıcı çizgi, açıklayıcı buton isimleri

**Backend Yeni Endpoint'ler**
- POST /weekly-goals/approve (onay/red)
- GET/POST/DELETE /leave-requests
- GET/POST/DELETE /weekly-goal-edit-grants
- Veritabanı migration'ları: leave_requests, weekly_goal_edit_grants, approval sütunları

### Düzeltmeler
- Per-row Gerçekleşme(%) tutarsızlığı düzeltildi
- Kullanılmayan parametreler (alpha, beta, B_max, eta_max) temizlendi
- Tooltip fallback değerleri getDailyActualLimits() ile eşleştirildi
- Şifre tekrar alanı kullanıcı ekleme formundan kaldırıldı

---

## v2.10.8 – 09.02.2026

### Yeni Özellikler
**Görev Detayı: Başlık Düzenleme**
- Görev Detayı penceresinde başlık alanı artık düzenlenebilir
- Admin, Sorumlu ve Oluşturan rolleri başlığı değiştirebilir
- Başlık değişiklikleri Görev Geçmişi'nde eski ve yeni değer olarak gösterilir (ör: "Eski Başlık → Yeni Başlık")

### Değişiklikler
**Performans Hesaplama Sistemi Güncellendi**
- Performans skoru artık tablodaki Gerçekleşme(%) değerlerinin toplamı üzerinden hesaplanır
- Tamamlanan görev: `rate = (hedef / gerçekleşme) × ağırlık` → hız bonusu otomatik dahil
- Tamamlanmayan görev: Gecikme cezası + tamamlanmadı cezası (hedefin %10'u) uygulanır
- Plandışı iş varsa tamamlanmadı cezası uygulanmaz
- Kesinti/Bonus alanı artık doğru net değeri gösterir: `Performans Skoru - Taban Skor`
- Tooltip güncellendi: Hız/Tasarruf Bonusu ve Gecikme + Tamamlanmama Cezası ayrı ayrı gösterilir

**Planlı Süre Validasyonu Kaldırıldı**
- Kullanıcılar izin alsalar bile 2700 dk hedef koyabilir
- İzin girişinde planlı süre hatası artık oluşmuyor
- Kontrol sadece gerçekleşen süre (Kullanılan Süre + Plandışı Süre) üzerinden yapılır

### Düzeltmeler
- Takım modal kapatma butonu stil düzeltmesi

---

## v2.10.7 – 26.01.2026

### Düzeltmeler ve İyileştirmeler
- Hata varken kayıt tuşuna basıldığında oluşan kaydetmeme sorunu giderildi
- Kullanılan süre artık planlı işler + plana dahil olmayan işler toplamı olarak gösteriliyor
- Yenile butonu kafa karıştırmaması için gerçek işlevi olan "Son Kaydedileni Yükle" olarak değiştirildi
- Gerçekleşme süresi girilmemişse Tamamlandı kutucuğu işaretlenemez

---

## v2.10.6 – 12.01.2026

### Yeni Özellikler
**Günlük Gerçekleşme ve Mesai Kotası Sistemi**
- Haftalık taban süre 2700 dakika olarak güncellendi
- Günlük gerçekleşme kotası sistemi eklendi (her gün 540 dk):
  - Pazartesi: En fazla 540 dk
  - Salı: En fazla 1080 dk (toplam)
  - Çarşamba: En fazla 1620 dk (toplam)
  - Perşembe: En fazla 2160 dk (toplam)
  - Cuma: En fazla 2700 dk (toplam)
- Günlük mesai kotası sistemi eklendi:
  - Pazartesi: En fazla 150 dk
  - Salı: En fazla 300 dk (toplam)
  - Çarşamba: En fazla 450 dk (toplam)
  - Perşembe: En fazla 600 dk (toplam)
  - Cuma: En fazla 750 dk (toplam)
  - Cumartesi: En fazla 540 dk (ek mesai)
  - Pazar: En fazla 540 dk (ek mesai)
- Geçmiş hafta kilitleme: Pazartesi 13:30'dan sonra önceki haftaya müdahale engellenir (mesai ve izin dahil)
- Mesai süresi eklendiğinde günlük gerçekleşme kotası da artar (örnek: Pazartesi 540 + 150 mesai = 690 dk)

**Anlık Uyarı Sistemi**
- Hedef alanı değiştiğinde toplam süre kontrolü anında yapılır
- Gerçekleşme alanı değiştiğinde günlük kota kontrolü anında yapılır
- Uyarı durumlarında görsel geri bildirim (kırmızı renk ve uyarı ikonu)
- Kaydet butonu uyarı durumlarında devre dışı bırakılır

**Hedef Ayrıntısı Güncellemeleri**
- Toplam Süre: (2700 + mesai - izin) olarak gösterilir
- Kullanılabilir Süre: Günlük gerçekleşme kotası + mesai kotası olarak hesaplanır
- Kalan Süre: Kullanılabilir süre - kullanılan süre olarak gösterilir
- Tooltip desteği: Kullanılabilir Süre üzerine gelindiğinde haftanın tüm günleri için günlük limitler gösterilir

### Değişiklikler
**Haftalık Hedef Zaman Aşım Kuralı**
- Toplam hedef süre (planlı + plansız) kullanılabilir süreyi (2700 + mesai - izin) aşamaz
- Mesai süresi girilerek kullanılabilir süre artırılabilir
- Kapasite aşımı durumunda görsel uyarılar ve hata mesajları gösterilir
- Boş görev listesi kaydedilebilir (tüm görevleri silme özelliği)

**Gelecek Haftalar İçin Gerçekleşme Kilitleme**
- Gelecek haftalar için gerçekleşme alanları artık kilitlidir
- Sadece içinde bulunulan hafta için gerçekleşme alanları açıktır
- Yeni haftaya geçildiğinde (kota kontrolü başladığında) gerçekleşme alanları otomatik olarak açılır
- Hedef alanları gelecek haftalar için açık kalmaya devam eder
- Bu sayede kullanıcılar gelecek haftaları önceden dolduramaz ve sadece ilgili hafta için gerçekleşme girebilir

### Performans İyileştirmeleri
**Sayısal Alanlarda Anlık Güncelleme**
- Haftalık Hedefler panelindeki Hedef (dk) ve Gerçekleşme (dk) alanlarında gecikmeler tamamen giderildi
- Bu alanlara değer girildiğinde Hedef Ayrıntısı bölümü anında güncelleniyor
- Yazılan sayılar artık anında ekranda görünüyor ve hesaplamalar anlık olarak yapılıyor
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