<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        @if($type === 'created') Yeni Görev Oluşturuldu
        @elseif($type === 'assigned') Size Görev Atandı
        @elseif($type === 'updated') Görev Güncellendi
        @elseif($type === 'completed') Görev Tamamlandı
        @elseif($type === 'reminded') Görev Hatırlatması
        @else Görev Bildirimi
        @endif - Görev Takip Sistemi
    </title>
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
            @if($type === 'created') background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            @elseif($type === 'assigned') background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            @elseif($type === 'updated') background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            @elseif($type === 'completed') background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            @elseif($type === 'reminded') background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            @else background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            @endif
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
        .task-info {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
        }
        .task-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        .task-meta {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }
        .meta-label {
            font-weight: 500;
            color: #6b7280;
        }
        .meta-value {
            color: #374151;
        }
        .priority-high { color: #dc2626; font-weight: 600; }
        .priority-medium { color: #f59e0b; font-weight: 600; }
        .priority-low { color: #10b981; font-weight: 600; }
        .priority-critical { color: #991b1b; font-weight: 600; }
        
        .status-waiting { color: #f59e0b; font-weight: 500; }
        .status-in_progress { color: #3b82f6; font-weight: 500; }
        .status-investigating { color: #8b5cf6; font-weight: 500; }
        .status-completed { color: #10b981; font-weight: 500; }
        .status-cancelled { color: #ef4444; font-weight: 500; }
        
        .description {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            color: #374151;
        }
        .action-info {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
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
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                @if($type === 'created') 📝 Yeni Görev Oluşturuldu
                @elseif($type === 'assigned') 🎯 Size Görev Atandı
                @elseif($type === 'updated') 📝 Görev Güncellendi
                @elseif($type === 'completed') ✅ Görev Tamamlandı
                @elseif($type === 'reminded') ⏰ Görev Hatırlatması
                @else 📋 Görev Bildirimi
                @endif
            </h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Görev Takip Sistemi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba {{ $user->name }},
            </div>
            
            @if($type === 'created')
                <p>Yeni bir görev oluşturuldu ve ilginizi çekebilir.</p>
            @elseif($type === 'assigned')
                <p>Size yeni bir görev atandı. Lütfen görev detaylarını inceleyin.</p>
            @elseif($type === 'updated')
                <p>İlgilendiğiniz bir görevde güncelleme yapıldı.</p>
            @elseif($type === 'completed')
                <p>Bir görev tamamlandı ve size bildirilmesi gerekti.</p>
            @elseif($type === 'reminded')
                <p>Bu görev için bir hatırlatma gönderildi.</p>
            @endif

            @if($message)
                <div class="action-info">
                    <strong>💬 Mesaj:</strong><br>
                    {{ $message }}
                </div>
            @endif
            
            <div class="task-info">
                <div class="task-title">📋 {{ $task->title }}</div>
                
                <div class="task-meta">
                    <span class="meta-label">ID:</span>
                    <span class="meta-value">#{{ $task->id }}</span>
                </div>
                
                <div class="task-meta">
                    <span class="meta-label">Durum:</span>
                    <span class="meta-value status-{{ $task->status }}">
                        @if($task->status === 'waiting') Bekliyor
                        @elseif($task->status === 'in_progress') Devam Ediyor
                        @elseif($task->status === 'investigating') Araştırılıyor
                        @elseif($task->status === 'completed') Tamamlandı
                        @elseif($task->status === 'cancelled') İptal Edildi
                        @else {{ $task->status }}
                        @endif
                    </span>
                </div>
                
                <div class="task-meta">
                    <span class="meta-label">Öncelik:</span>
                    <span class="meta-value priority-{{ $task->priority }}">
                        @if($task->priority === 'low') Düşük
                        @elseif($task->priority === 'medium') Orta
                        @elseif($task->priority === 'high') Yüksek
                        @elseif($task->priority === 'critical') Kritik
                        @else {{ $task->priority }}
                        @endif
                    </span>
                </div>
                
                @if($task->responsible)
                    <div class="task-meta">
                        <span class="meta-label">Sorumlu:</span>
                        <span class="meta-value">{{ $task->responsible->name }}</span>
                    </div>
                @endif
                
                @if($task->creator)
                    <div class="task-meta">
                        <span class="meta-label">Oluşturan:</span>
                        <span class="meta-value">{{ $task->creator->name }}</span>
                    </div>
                @endif
                
                @if($task->due_date)
                    <div class="task-meta">
                        <span class="meta-label">Bitiş Tarihi:</span>
                        <span class="meta-value">{{ \Carbon\Carbon::parse($task->due_date)->format('d.m.Y') }}</span>
                    </div>
                @endif
                
                @if($task->description)
                    <div class="description">
                        <strong>Açıklama:</strong><br>
                        {{ $task->description }}
                    </div>
                @endif
            </div>
            
            <div style="text-align: center;">
                <a href="{{ env('APP_URL', 'http://localhost:5173') }}" class="cta-button">
                    🔗 Görev Takip Sistemi'ni Aç
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
            <div class="company-info">
                <strong>Vaden Otomotiv</strong><br>
                Görev Takip Sistemi<br>
                © {{ date('Y') }} Tüm hakları saklıdır.
            </div>
        </div>
    </div>
</body>
</html>
