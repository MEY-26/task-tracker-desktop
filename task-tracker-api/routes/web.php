<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;

Route::get('/attachments/{attachment}', [TaskController::class, 'showAttachment'])
    ->name('attachments.show')
    ->middleware('signed');

// Error page route
Route::get('/error', function () {
    return view('errors.generic', [
        'message' => session('error', 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'),
    ]);
})->name('error.generic');


