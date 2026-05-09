## v3.0.5 – 09.05.2026

### Düzeltmeler

**Performans ve haftalık özet**
- Haftalık hedeflere sadece göz atıp kayıt eklemeden çıktığınızda oluşan haftalar artık “dolu hafta” gibi görünmez; **Performans Detayı** ve **Verili Hafta** sayıları yalnızca gerçekten iş veya hedef girdiğiniz haftaları yansıtır.
- Takvimden otomatik gelen **izin süresi** tek başına o haftayı dolu saydırmaz; özet hesapları buna göre sadeleşir.

**Pencereler**
- Birçok ekranda üst başlık çubuğu aynı düzene getirildi; başlık, kapatma ve yan düğmeler daha tutarlı hizalanır.

---

## v3.0.4 – 08.05.2026

### Yeni Özellikler

**Çalışma Takvimi (Sistem Yönetimi)**
- Sistem Yönetimi’nde gün bazlı çalışma takvimi istisnası ekleyip düzenleyebilirsiniz.
- Her gün için **Tatil** veya **Çalışma** seçebilir; istisnanın geçerli olacağı kitleyi belirleyebilirsiniz (tüm kullanıcılar, departman, takım, seçili kullanıcılar).
- Takvimde bir günü seçtiğinizde aynı ekranda hızlı kayıt veya silme yapılır.

**Türkiye Resmi Tatilleri**
- Resmi tatiller takvimde varsayılan olarak görünür; böylece çalışma günleri ve izin hesapları daha tutarlı olur.

### Değişiklikler

**İzin ve Çalışma Takvimi**
- İzin bildirimi ve izin yönetimi ekranlarındaki takvim renkleri, sistemdeki çalışma takvimiyle uyumludur.
- Hafta sonu bir gün **çalışma günü** olarak işaretlenmişse, o güne de izin girebilirsiniz.
- İzin süreleri, o günün gerçek çalışma süresine göre daha doğru hesaplanır.

**Mesai ve Molalar**
- **Başlangıç**, **Bitiş** ve **Tam gün (dakika)** alanları aynı yükseklikte hizalandı.
- Mola satırları ve silme düğmeleri daha net görünür.

---

## v3.0.3 – 27.04.2026

### Yeni Özellikler

**Özel Düzenleme İzinleri**
- İzin Yönetimi’nde, verilmiş aktif özel düzenleme izinlerini listeleyebilir ve kaldırabilirsiniz.
- İzin verildikten veya kaldırıldıktan sonra liste ve haftalık hedefler güncellenir.

**Üst Üste Açılan Pencereler**
- Birkaç pencere açıkken dışarı tıkladığınızda yalnızca en üstteki pencere kapanır (diğerleri açık kalabilir).
- Örneğin Kullanıcı Yönetimi açıkken İzin Yönetimi’ni açtığınızda artık her iki pencerenin birden kapanması sorunu giderildi.

### Değişiklikler

**Haftalık Hedefler**
- Yöneticinin verdiği özel düzenleme izni varken, uygulamanın saat kuralının bu izni geçersiz sayması düzeltildi.
- Haftalık hedefler yüklenirken kilit bilgisinin yanlış görünmesi giderildi.

**İzin Bildirimi**
- Kayıtlı izinlerde tam gün izinler özet halde; saatlik izinler ayrı satırda (tarih, saat aralığı, dakika) gösterilir.
- Tam gün ve saatlik satırlarda silme düğmeleri aynı görünümde (yuvarlak çöp kutusu), temaya uygundur.

**Diğer Ekranlar**
- Görev ve ayar pencereleri, tema paneli, sistem ayarları, yeni görev formu ve benzeri yerlerde dışarı tıklayınca kapanma davranışı tutarlı hale getirildi.

### Düzeltmeler
- Aynı haftaya yalnızca yeni bir izin günü eklerken o haftadaki mevcut izin günlerinin yanlışlıkla kaybolması giderildi.
- İzin sürelerinin haftalık hedeflere yanlış yansıması giderildi.

---

## v3.0.2 – 16.03.2026

### Yeni Özellikler

**Veritabanı Yükleme (Yöneticiler)**
- Sistem Yönetimi’nde **Veritabanını Yükle** ile yedekten geri yükleme yapılabilir; işlem için yönetici şifresi gerekir.

**Kullanıcı Listesi**
- Tablo başlığı eklendi: Tümünü Seç, Ad Soyad, E-posta, Şifre Sıfırla.
- Ad Soyad ve e-posta ayrı sütunlarda yan yana gösterilir.
- Tablo başlığındaki **Tümünü Seç** kutusu: Tüm seçilebilir kullanıcıları seçer; hepsi seçiliyken tekrar tıklanınca seçim kalkar ve toplu işlem alanları sıfırlanır.

**Yeni Kullanıcı Ekle**
- Manuel form (sol) ve Excel ile toplu içe aktarma (sağ) yan yana düzenlendi.

### Değişiklikler

- Üstteki Tümünü Seç / İptal butonları kaldırıldı; Tümünü Seç işlevi tablo başlığına taşındı.
- Lider, Departman, Rol, Uygula, Seçili kullanıcıları sil ve İzin Yönetimi tek satırda toplandı.
- Veritabanı **İndir** ve **Yükle** butonları yan yana ve farklı renklerle gösterilir.
- Veritabanı yüklemesinde şifre hatalarında artık hem uyarı penceresi hem uygulama bildirimi görünür.
- Yönetici rolündeki kullanıcılar da silinebilir (yönetim paneli yalnızca yöneticilere açık olduğundan güvenli kabul edilir).

### Düzeltmeler
- Kullanıcı seçimi kalkınca üstteki toplu alanların (lider, departman, rol) sıfırlanması sağlandı.
- Veritabanı yüklemesinde şifre hatasında bildirim çıkmaması giderildi.

---

## v3.0.1 – 14.03.2026

### Yeni Özellikler

**Departmanlar**
- Kullanıcılara departman atanabilir (örnek: Ar-Ge, Fikstür, Elektronik Montaj, Giriş Kalite).
- Birden fazla dönemi kapsayan haftalık raporda departmana göre filtreleme vardır.
- Aynı raporda departman bilgisi bir sütunda gösterilir.

**Kullanıcı Yönetimi – Toplu İşlemler**
- Panel iki satırlı toplu işlem çubuğuyla düzenlendi.
- Lider, Departman ve Rol tek yerden toplu uygulanabilir.
- **Tümünü Seç** ile Gözlemci hariç tüm seçilebilir kullanıcılar seçilebilir.

### Değişiklikler

**Çok Dönemli Özet Raporu**
- İsim arayıp tek tek “ekleme” akışı kaldırıldı; departman seçimi açılır listeden yapılır.

**Kullanıcı Satırları**
- Satırdan lider, rol ve departman alanları kaldırıldı.
- Her satırda seçim kutusu, ad-soyad, e-posta ve şifre sıfırlama düğmesi kalır.

### Düzeltmeler
- Kullanıcı yönetim panelindeki hizalama ve taşma sorunları giderildi.
- Yönetici kullanıcılar da seçilebilir; yalnızca yönetici hedefinde lider atlaması yapılır, diğer toplu güncellemeler uygulanır.
- Tek kullanıcı seçildiğinde üstteki Lider / Departman / Rol alanları otomatik dolar.

---

## v3.0.0 – 11.03.2026

### Yeni Özellikler

**Haftalık Hedef Onayı**
- Takım üyelerinin haftalık hedefleri lider veya yönetici onayından sonra kesinleşir.
- Onayla / Reddet düğmeleri, onay durumu rozeti ve onay notu vardır; ilgili bildirimler gönderilir.

**İzin Bildirimi**
- İzin günlerinizi takvimden seçerek bildirebilirsiniz.
- Takım liderleri geçmiş tarihlere de izin ekleyebilir.
- İzin süreleri haftalık hedeflere otomatik yansır.
- İzin toplamı salt okunur gösterilir (manuel değiştirilemez).

**Kullanıcı Yönetimi**
- Toplu lider atama (yalnızca takım üyelerine).
- Toplu kullanıcı silme (yönetici hariç).
- Belirli kullanıcılara geçici hedef düzenleme izni verme.
- Takım liderleri seçimde yer alır; lider ataması yalnızca üyelere yapılır.

**Puanlama Görünürlüğü**
- Yönetici: tam performans skorunu görür.
- Takım lideri: harf notunu görür.
- Diğer roller: puanlama gizlenir.

**Kilitleme Kuralları**
- Takım üyesi: Pazartesi 10:00 sonrası hedefler kilitlenir.
- Takım lideri: Pazartesi 13:30 sonrası hedefler kilitlenir.
- Yönetici: sınırsız düzenleme.

### Değişiklikler

**Arayüz**
- Tüm metin kutuları ve benzeri alanlar tutarlı yuvarlatılmış köşelere geçirildi.
- Yeni Kullanıcı Ekle ve Yeni Görev formları seçilen temayla uyumludur.
- Kullanıcı panelindeki eylem çubuğu daha düzenli boşluklar, ayırıcı çizgi ve anlaşılır düğme adlarıyla güncellendi.

### Düzeltmeler
- Haftalık tabloda Gerçekleşme (%) görünümündeki tutarsızlık giderildi.
- Haftalık hedef özeti açıklamaları güncel kural setiyle uyumlu hale getirildi.
- Yeni kullanıcı eklerken “şifre tekrar” alanı kaldırıldı.

---

## v2.10.8 – 09.02.2026

### Yeni Özellikler
**Görev Başlığını Düzenleme**
- Görev detayında başlık artık düzenlenebilir.
- Yönetici, sorumlu ve oluşturan kullanıcı başlığı değiştirebilir.
- Değişiklikler görev geçmişinde eski ve yeni değer olarak görünür.

### Değişiklikler
**Performans Hesabı**
- Performans skoru, tablodaki Gerçekleşme (%) sütunlarındaki değerlere göre hesaplanır.
- Tamamlanan görevlerde hedefe göre hızlı bitirme bonusu dikkate alınır.
- Tamamlanmayan görevlerde gecikme ve tamamlanmama cezası uygulanır (hedefin yaklaşık %10’u); plandışı iş varsa tamamlanmama cezası uygulanmaz.
- Kesinti / Bonus alanı, skor ile taban skor arasındaki farkı net gösterir.
- Açıklama balonunda bonus ve ceza kalemleri ayrı ayrı özetlenir.

**İzin ve Planlı Süre**
- İzin alsanız bile haftalık hedef toplamı 2700 dakikaya kadar yazılabilir.
- İzin kaydında “planlı süre çok” uyarısı kalktı; asıl kontrol gerçekleşen süre üzerinden yapılır.

### Düzeltmeler
- Takım penceresi kapatma düğmesinin görünümü düzeltildi.

---

## v2.10.7 – 26.01.2026

### Düzeltmeler ve İyileştirmeler
- Uyarı varken Kaydet’e basıldığında kaydın takılı kalması giderildi.
- Kullanılan süre, planlı işler ile plana dahil olmayan işlerin toplamı olarak gösterilir.
- Yenile düğmesi, işlevini yansıtacak şekilde **Son Kaydedileni Yükle** olarak yeniden adlandırıldı.
- Gerçekleşme süresi girilmeden Tamamlandı işaretlenemez.

---

## v2.10.6 – 12.01.2026

### Yeni Özellikler
**Günlük Gerçekleşme ve Mesai Kotası**
- Haftalık taban süre 2700 dakika olarak güncellendi.
- Günlük gerçekleşme kotası (her gün 540 dk üzerinden birikerek):
  - Pazartesi: en fazla 540 dk
  - Salı: en fazla 1080 dk (toplam)
  - Çarşamba: en fazla 1620 dk (toplam)
  - Perşembe: en fazla 2160 dk (toplam)
  - Cuma: en fazla 2700 dk (toplam)
- Günlük mesai kotası:
  - Pazartesi: en fazla 150 dk
  - Salı: en fazla 300 dk (toplam)
  - Çarşamba: en fazla 450 dk (toplam)
  - Perşembe: en fazla 600 dk (toplam)
  - Cuma: en fazla 750 dk (toplam)
  - Cumartesi: en fazla 540 dk (ek mesai)
  - Pazar: en fazla 540 dk (ek mesai)
- Geçmiş haftaya müdahale: içinde bulunduğunuz haftanın Pazartesi 13:30’dan sonra önceki hafta kilitlenir (mesai ve izin dahil).
- Mesai girdiğinizde günlük gerçekleşme kotası da artar (örnek: Pazartesi 540 + 150 mesai = 690 dk).

**Anlık Uyarılar**
- Hedef alanını değiştirince toplam süre hemen kontrol edilir.
- Gerçekleşme alanını değiştirince günlük kota hemen kontrol edilir.
- Uyarıda kırmızı vurgu ve uyarı simgesi gösterilir; uyarı varken Kaydet devre dışı kalabilir.

**Hedef Ayrıntısı**
- Toplam süre: 2700 + mesai − izin olarak gösterilir.
- Kullanılabilir süre: günlük gerçekleşme kotası ile mesai kotası birlikte hesaplanır.
- Kalan süre: kullanılabilir süre eksi kullanılan süre.
- Kullanılabilir süre satırının üzerine gelince haftanın günleri için günlük limitler gösterilir.

### Değişiklikler
**Haftalık Limitler**
- Toplam hedef süre (planlı + plansız), kullanılabilir süreyi (2700 + mesai − izin) aşamaz.
- Mesai girerek kullanılabilir süre artırılabilir.
- Kapasite aşımında uyarı ve hata mesajları gösterilir.
- Boş görev listesi kaydedilebilir.

**Gelecek Haftalar**
- Gelecek haftalarda gerçekleşme alanları kilitlidir; yalnızca içinde bulunduğunuz haftanın gerçekleşmesi düzenlenebilir.
- Yeni haftaya geçildiğinde ilgili hafta için gerçekleşme alanları açılır.
- Hedef alanları gelecek haftalar için açık kalabilir.

### Performans İyileştirmeleri
**Sayısal Alanlar**
- Haftalık hedeflerde Hedef (dk) ve Gerçekleşme (dk) yazarken gecikme azaltıldı.
- Değer girdiğinizde Hedef Ayrıntısı anında güncellenir.
- Sayı alanlarında fare tekerleğiyle yanlışlıkla değer değişmesi engellendi.

---

## v2.10.5 – 07.01.2026

### Performans İyileştirmeleri
**Metin Alanları**
- Haftalık hedeflerde başlık, aksiyon planı ve ek açıklama alanlarında yazarken gecikme giderildi; yazı ekranda anında görünür.

### Yeni Özellikler
**Temalar**
- Uygulama genelinde tema desteği.
- Altı hazır tema: Koyu, Açık, Mavi, Yeşil, Mor, Turuncu.
- Özel tema: dokuz renk alanı ve koyu/açık logo seçimi.
- Tema tercihiniz hesabınıza kaydedilir ve açılışta yüklenir.
- Düğmeler, tablolar, açılır listeler ve giriş alanları temayla uyumludur.

### Değişiklikler
**Haftalık Hedef Kilitleme (Özet)**
- **Bu hafta, Pazartesi 13:30 öncesi:** hedef ve gerçekleşme açık.
- **Bu hafta, Pazartesi 13:30 sonrası:** hedef kilitli, gerçekleşme açık.
- **Önceki hafta:** bu haftanın Pazartesi 13:30 öncesinde hedef kilitli, gerçekleşme düzenlenebilir; sonrasında her ikisi de kilitlenir.
- **Daha eski haftalar:** hedef ve gerçekleşme kilitli.
- **Gelecek haftalar (bu sürümdeki kurala göre):** hedef ve gerçekleşme açık (sonraki sürümlerde gerçekleşme kuralı sıkılaştırılmıştır).
- Plandışı işler bölümü, gerçekleşme kilitlendiğinde birlikte kilitlenir.

### İyileştirmeler
- Tema paneli iki sütunlu ve daha okunaklı renk seçicilerle yenilendi.
- Devre dışı düğmelerin görünümü ve imleç davranışı iyileştirildi.
- Kapatma düğmeleri tutarlı ✕ simgesiyle gösterilir.

---

## v2.10.4 – 05.01.2026

### Düzeltmeler
**Görev Atama**
- Görevden elle çıkardığınız kişiler, otomatik eklemede yeniden eklenmez.
- Yalnızca seçtiğiniz kişiler göreve atanır.
- Gereksiz bildirimler azaltıldı.

---

## v2.10.3 – 05.01.2026

### Değişiklikler
**Haftalık Hedef Kilitleme**
- Hedef alanları Pazartesi 13:30’a kadar düzenlenebilir (önceki sınır 10:00 idi).
- Gerçekleşme alanı sürekli düzenlenebilir kabul edildi.

**İzin ve Süre**
- İzin eklerken planlı süre, kullanılabilir süreyi aşsa bile kayıt yapılabilir.
- Yalnızca gerçekleşen süre limiti aşılırsa kayıt engellenir.

### Yeni Özellikler
**Tamamlanmayan İşleri Aktar**
- Haftalık Hedefler penceresine **Tamamlanmayan İşleri Aktar** düğmesi eklendi.
- Önceki haftadan tamamlanmamış işler tek tıkla mevcut haftaya taşınabilir.
