<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Şifre Sıfırlama</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #0d1b2a;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Görev Takip Sistemi</h1>
        <h2>Şifre Sıfırlama Talebi</h2>
    </div>
    
    <div class="content">
        <p>Merhaba {{ $user->name }},</p>
        
        <p>Görev Takip Sistemi'nde şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        
        <div style="text-align: center;">
            <a href="{{ config('app.url') }}/reset-password?token={{ $token }}" class="button">
                Şifremi Sıfırla
            </a>
        </div>
        
        <div class="warning">
            <strong>Önemli:</strong>
            <ul>
                <li>Bu link 24 saat geçerlidir</li>
                <li>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz</li>
                <li>Güvenliğiniz için şifrenizi kimseyle paylaşmayın</li>
            </ul>
        </div>
        
        <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
        <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
            {{ config('app.url') }}/reset-password?token={{ $token }}
        </p>
        
        <p>İyi çalışmalar,<br>
        Görev Takip Sistemi Ekibi</p>
    </div>
</body>
</html>