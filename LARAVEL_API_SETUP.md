# Laravel API Kurulum Rehberi

Bu dosya, Task Tracker Desktop uygulamasının Laravel API'si ile çalışması için gerekli kurulum adımlarını içerir.

## 1. Laravel Projesi Kurulumu

```bash
# Yeni Laravel projesi oluştur
composer create-project laravel/laravel task-tracker-api

# Proje dizinine git
cd task-tracker-api

# Sanctum paketini kur (API authentication için)
composer require laravel/sanctum

# Sanctum'u yayınla
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Migration'ları çalıştır
php artisan migrate
```

## 2. CORS Ayarları

`config/cors.php` dosyasını düzenle:

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

## 3. User Model Güncellemesi

`app/Models/User.php` dosyasını güncelle:

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
```

## 4. Task Model Oluşturma

```bash
php artisan make:model Task -m
```

`database/migrations/xxxx_create_tasks_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
```

`app/Models/Task.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'status',
        'user_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

## 5. API Routes

`routes/api.php` dosyasını güncelle:

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TaskController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    Route::apiResource('tasks', TaskController::class);
});
```

## 6. Controllers

### AuthController

```bash
php artisan make:controller AuthController
```

`app/Http/Controllers/AuthController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($request->only('email', 'password'))) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'user',
                ]
            ]);
        }

        return response()->json([
            'message' => 'Geçersiz kimlik bilgileri'
        ], 401);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json([
            'message' => 'Başarıyla çıkış yapıldı'
        ]);
    }
}
```

### TaskController

```bash
php artisan make:controller TaskController --api
```

`app/Http/Controllers/TaskController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;

class TaskController extends Controller
{
    public function index()
    {
        $tasks = Task::where('user_id', auth()->id())->get();
        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:pending,in_progress,completed',
        ]);

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'status' => $request->status ?? 'pending',
            'user_id' => auth()->id(),
        ]);

        return response()->json($task, 201);
    }

    public function show(Task $task)
    {
        if ($task->user_id !== auth()->id()) {
            return response()->json(['message' => 'Yetkisiz erişim'], 403);
        }
        
        return response()->json($task);
    }

    public function update(Request $request, Task $task)
    {
        if ($task->user_id !== auth()->id()) {
            return response()->json(['message' => 'Yetkisiz erişim'], 403);
        }

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,completed',
        ]);

        $task->update($request->only(['title', 'description', 'status']));
        
        return response()->json($task);
    }

    public function destroy(Task $task)
    {
        if ($task->user_id !== auth()->id()) {
            return response()->json(['message' => 'Yetkisiz erişim'], 403);
        }

        $task->delete();
        
        return response()->json(['message' => 'Görev silindi']);
    }
}
```

## 7. Test Kullanıcısı Oluşturma

```bash
php artisan tinker
```

Tinker konsolunda:

```php
User::create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'password' => bcrypt('123456'),
    'role' => 'admin'
]);
```

## 8. Laravel API'yi Çalıştırma

```bash
# 9001 portunda çalıştır
php artisan serve --host=127.0.0.1 --port=9001
```

## 9. Test Etme

1. `test-api.html` dosyasını tarayıcıda aç
2. "Bağlantıyı Test Et" butonuna tıkla
3. "Login Test Et" butonuna tıkla
4. "Tasks Endpoint Test Et" butonuna tıkla

## 10. Olası Sorunlar ve Çözümleri

### CORS Hatası
- `config/cors.php` dosyasını kontrol et
- `php artisan config:cache` komutunu çalıştır

### 401 Unauthorized Hatası
- Sanctum kurulumunu kontrol et
- Token'ın doğru gönderildiğinden emin ol

### 404 Not Found Hatası
- Route'ların doğru tanımlandığından emin ol
- `php artisan route:list` ile route'ları kontrol et

### Database Hatası
- Migration'ları çalıştır: `php artisan migrate`
- Veritabanı bağlantısını kontrol et
