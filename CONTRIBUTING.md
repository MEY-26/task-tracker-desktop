# Katkıda Bulunma Rehberi

Task Tracker Desktop projesine katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🤝 Nasıl Katkıda Bulunabilirsiniz

### 🐛 Hata Bildirimi
- GitHub Issues bölümünde yeni bir issue oluşturun
- Hatanın detaylı açıklamasını yapın
- Hata mesajlarını ve ekran görüntülerini ekleyin
- Hangi işletim sisteminde ve hangi sürümde oluştuğunu belirtin

### 💡 Özellik Önerisi
- GitHub Issues bölümünde "Feature Request" etiketi ile yeni bir issue oluşturun
- Önerdiğiniz özelliğin detaylı açıklamasını yapın
- Varsa örnek kullanım senaryolarını ekleyin

### 🔧 Kod Katkısı
1. Projeyi fork edin
2. Feature branch oluşturun
3. Değişikliklerinizi yapın
4. Test edin
5. Pull Request oluşturun

## 🛠️ Geliştirme Ortamı Kurulumu

### Gereksinimler
- Node.js 18+
- PHP 8.2+
- Composer
- MySQL/PostgreSQL

### Kurulum
```bash
# Projeyi fork edin ve clone edin
git clone https://github.com/YOUR_USERNAME/task-tracker-desktop.git
cd task-tracker-desktop

# Bağımlılıkları yükleyin
npm install
cd task-tracker-api && composer install

# Geliştirme ortamını hazırlayın
npm run setup:dev
```

## 📝 Kod Standartları

### JavaScript/React
- ESLint kurallarına uyun
- Prettier kullanın
- Fonksiyon ve değişken isimleri açıklayıcı olsun
- JSDoc yorumları ekleyin

### PHP/Laravel
- PSR-12 kod standartlarına uyun
- Laravel best practices'i takip edin
- PHPDoc yorumları ekleyin

### Git Commit Mesajları
```
feat: yeni özellik eklendi
fix: hata düzeltildi
docs: dokümantasyon güncellendi
style: kod formatı düzeltildi
refactor: kod yeniden düzenlendi
test: test eklendi
chore: bakım işlemleri
```

## 🧪 Test Etme

### Frontend Testleri
```bash
npm run lint
npm run build
```

### Backend Testleri
```bash
cd task-tracker-api
php artisan test
```

## 📋 Pull Request Süreci

1. **Branch Oluşturun**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Değişikliklerinizi Yapın**
   - Kodunuzu yazın
   - Test edin
   - Lint kurallarına uyun

3. **Commit Edin**
   ```bash
   git add .
   git commit -m "feat: yeni özellik eklendi"
   ```

4. **Push Edin**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Pull Request Oluşturun**
   - GitHub'da Pull Request oluşturun
   - Değişikliklerinizi açıklayın
   - Varsa ekran görüntüleri ekleyin

## 🔍 Code Review Süreci

- En az bir maintainer'ın onayı gerekir
- CI/CD testleri geçmelidir
- Kod standartlarına uygun olmalıdır
- Dokümantasyon güncellenmelidir

## 📚 Dokümantasyon

### README Güncellemeleri
- Yeni özellikler için README'yi güncelleyin
- Kurulum talimatlarını güncelleyin
- Ekran görüntüleri ekleyin

### API Dokümantasyonu
- Yeni endpoint'ler için dokümantasyon ekleyin
- Örnek request/response'lar ekleyin

## 🏷️ Issue Etiketleri

- `bug`: Hata bildirimi
- `enhancement`: İyileştirme önerisi
- `feature`: Yeni özellik önerisi
- `documentation`: Dokümantasyon güncellemesi
- `good first issue`: Yeni katkıda bulunanlar için
- `help wanted`: Yardım gerektiren konular

## 📞 İletişim

- GitHub Issues: Sorunlar ve öneriler için
- GitHub Discussions: Genel tartışmalar için
- Email: Özel konular için

## 🎯 Katkıda Bulunma Alanları

### Frontend (React/Electron)
- UI/UX iyileştirmeleri
- Yeni bileşenler
- Performans optimizasyonları
- Erişilebilirlik iyileştirmeleri

### Backend (Laravel)
- API endpoint'leri
- Veritabanı optimizasyonları
- Güvenlik iyileştirmeleri
- Test coverage artırımı

### Dokümantasyon
- README güncellemeleri
- API dokümantasyonu
- Kurulum rehberleri
- Video tutorial'lar

## 🙏 Teşekkürler

Katkıda bulunan herkese teşekkürler! Projenin gelişmesine yardımcı olduğunuz için minnettarız.

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Katkıda bulunduğunuz kodlar da aynı lisans altında olacaktır.
