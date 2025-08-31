<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Şifre Sıfırlama - Görev Takip Sistemi</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #374151;
        }
        .message {
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .token-box {
            background: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .token {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            letter-spacing: 2px;
            background: white;
            padding: 15px 20px;
            border-radius: 6px;
            display: inline-block;
            border: 1px solid #e5e7eb;
        }
        .instructions {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .warning {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
            color: #dc2626;
        }
        .footer {
            background: #f9fafb;
            padding: 20px 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .company-info {
            margin-top: 20px;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Şifre Sıfırlama</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Görev Takip Sistemi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba {{ $user->name }},
            </div>
            
            <div class="message">
                Hesabınız için şifre sıfırlama talebinde bulunuldu. Eğer bu talep sizin tarafınızdan yapılmadıysa, bu e-postayı görmezden gelebilirsiniz.
            </div>
            
            <div class="instructions">
                <strong>📋 Şifrenizi sıfırlamak için:</strong><br>
                1. Görev Takip Sistemi'nde "Şifre Sıfırla" sayfasına gidin<br>
                2. E-posta adresinizi girin<br>
                3. Aşağıdaki kodu kullanın<br>
                4. Yeni şifrenizi belirleyin
            </div>
            
            <div class="token-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-weight: 500;">Sıfırlama Kodunuz:</p>
                <div class="token">{{ $token }}</div>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">Bu kod 60 dakika geçerlidir</p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Güvenlik Uyarısı:</strong><br>
                Bu kodu kimseyle paylaşmayın. Vaden ekibi asla şifrenizi veya sıfırlama kodunuzu istemez.
            </div>
            
            <div class="message">
                <strong>Hesap Bilgileri:</strong><br>
                📧 E-posta: {{ $user->email }}<br>
                👤 Rol: {{ ucfirst($user->role) }}<br>
                🕐 İstek Zamanı: {{ now()->format('d.m.Y H:i') }}
            </div>
        </div>
        
        <div class="footer">
            <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.</p>
            <div class="company-info">
                <strong>Vaden Otomotiv</strong><br>
                Görev Takip Sistemi<br>
                © {{ date('Y') }} Tüm hakları saklıdır.
            </div>
        </div>
    </div>
</body>
</html>
