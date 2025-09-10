<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hata - Task Tracker</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .error-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .error-icon {
            font-size: 64px;
            color: #e74c3c;
            margin-bottom: 20px;
        }
        .error-title {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .error-message {
            color: #7f8c8d;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .error-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            text-align: left;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #495057;
            border-left: 4px solid #e74c3c;
        }
        .retry-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        .retry-button:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1 class="error-title">Bir Hata Oluştu</h1>
        <p class="error-message">{{ $message ?? 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.' }}</p>
        
        @if(config('app.debug') && isset($error))
        <div class="error-details">
            <strong>Hata Detayları:</strong><br>
            {{ $error }}
        </div>
        @endif
        
        <button class="retry-button" onclick="window.location.reload()">
            Sayfayı Yenile
        </button>
    </div>
</body>
</html>
