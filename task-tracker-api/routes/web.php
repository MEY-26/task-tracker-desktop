<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;

// İmzalı ve herkese açık (token gerektirmeyen) dosya görüntüleme bağlantısı.
// Link Laravel tarafından imzalandığı için yetkisiz erişim engellenir.
Route::get('/attachments/{attachment}', [TaskController::class, 'showAttachment'])
    ->name('attachments.show')
    ->middleware('signed');


