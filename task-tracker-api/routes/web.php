<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;

// Kalıcı token tabanlı dosya indirme - ZAMAN SINIRI YOK!
// Dosya ve görev silinmediği sürece bu link süresiz çalışır
Route::get('/attachments/{attachment}/download/{token}', [TaskController::class, 'downloadAttachment'])
    ->name('attachments.download')
    ->where('token', '[a-zA-Z0-9]+');

// DEBUG: Test attachment URL generation
Route::get('/debug/attachment/{id}', [TaskController::class, 'debugAttachment']);

// Error page route
Route::get('/', function () {
    return view('welcome'); // or return a simple response if you don't have a welcome view
});

Route::get('/error', function () {
    return view('errors.generic', [
        'message' => session('error', 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'),
    ]);
})->name('error.generic');


