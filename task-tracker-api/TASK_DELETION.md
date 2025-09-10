# Görev Silme Sistemi

Bu doküman, Task Tracker API'sinde uygulanan görev silme sistemini açıklar.

## Özellikler

### Yetki Kontrolü

1. **İptal Edilen Görevler** (`cancelled`):
   - Admin kullanıcılar silebilir
   - Team Leader kullanıcılar silebilir
   - Diğer kullanıcılar silemez

2. **Tamamlanan Görevler** (`completed`):
   - Sadece Admin kullanıcılar silebilir
   - Diğer kullanıcılar silemez

3. **Diğer Durumlar** (`waiting`, `in_progress`, `investigating`):
   - Sadece Admin kullanıcılar silebilir
   - Diğer kullanıcılar silemez

### Silme İşlemi

Silme işlemi aşağıdaki adımları içerir:

1. **Yetki Kontrolü**: Kullanıcının silme yetkisi kontrol edilir
2. **Görev Geçmişi**: Silme işlemi görev geçmişine kaydedilir
3. **Dosya Silme**: Tüm ekler ve fiziksel dosyalar silinir
4. **İlişki Temizleme**: Görev ilişkileri temizlenir
5. **Görev Silme**: Görev veritabanından silinir

## API Endpoints

### Görev Silme
```
DELETE /api/tasks/{task}
```

**Yanıt:**
```json
{
    "message": "Görev ve tüm ekleri başarıyla silindi.",
    "deleted_files": 3,
    "failed_files": 0
}
```

### Silme Yetkisi Kontrolü
```
GET /api/tasks/{task}/can-delete
```

**Yanıt:**
```json
{
    "can_delete": true,
    "reason": "",
    "task_status": "cancelled",
    "user_role": "admin"
}
```

## Frontend Entegrasyonu

### Silme Butonu
- Her görev kartında silme butonu (🗑️) bulunur
- Buton tıklandığında yetki kontrolü yapılır
- Yetki yoksa hata mesajı gösterilir
- Yetki varsa onay dialogu gösterilir

### Onay Mesajları
- İptal edilen görevler: "Bu iptal edilen görevi kalıcı olarak silmek istediğinizden emin misiniz?"
- Tamamlanan görevler: "Bu tamamlanan görevi kalıcı olarak silmek istediğinizden emin misiniz?"
- Diğer durumlar: "Bu görev durumundaki görevi kalıcı olarak silmek istediğinizden emin misiniz?"

## Güvenlik

### Yetki Kontrolü
- Backend'de çift kontrol yapılır
- Frontend'de de yetki kontrolü yapılır
- Yetkisiz erişim engellenir

### Dosya Güvenliği
- Fiziksel dosyalar güvenli şekilde silinir
- Silme işlemi loglanır
- Hata durumları raporlanır

## Loglama

### Silme İşlemi Logları
- Görev silme işlemi görev geçmişine kaydedilir
- Dosya silme hataları loglanır
- Yetki kontrolü hataları loglanır

### Hata Logları
```
[2025-01-09 12:00:00] local.ERROR: Failed to delete attachment: File not found {"attachment_id": 123, "file_path": "attachments/file.pdf", "original_name": "file.pdf"}
```

## Kullanım Örnekleri

### Admin Kullanıcı
- Tüm görev durumlarını silebilir
- Tamamlanan görevleri silebilir
- İptal edilen görevleri silebilir

### Team Leader Kullanıcı
- Sadece iptal edilen görevleri silebilir
- Tamamlanan görevleri silemez
- Diğer durumları silemez

### Normal Kullanıcı
- Hiçbir görevi silemez
- Sadece görevleri iptal edebilir (soft delete)

## Hata Yönetimi

### Yetki Hatası
```json
{
    "message": "İptal edilen görevleri sadece admin yetkisi olan kullanıcılar silebilir.",
    "code": 403
}
```

### Dosya Silme Hatası
```json
{
    "message": "Görev ve tüm ekleri başarıyla silindi. (2 dosya silinemedi, loglara bakın)",
    "deleted_files": 3,
    "failed_files": 2
}
```

## Test Senaryoları

1. **Admin Kullanıcı Testi**:
   - İptal edilen görev silme ✅
   - Tamamlanan görev silme ✅
   - Diğer durum silme ✅

2. **Team Leader Testi**:
   - İptal edilen görev silme ✅
   - Tamamlanan görev silme ❌
   - Diğer durum silme ❌

3. **Normal Kullanıcı Testi**:
   - Tüm durumlar ❌

4. **Dosya Silme Testi**:
   - Fiziksel dosya silme ✅
   - Veritabanı kaydı silme ✅
   - Hata durumu loglama ✅
