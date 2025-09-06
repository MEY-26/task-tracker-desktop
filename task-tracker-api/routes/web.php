<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;

Route::get('/attachments/{attachment}', [TaskController::class, 'showAttachment'])
    ->name('attachments.show')
    ->middleware('signed');


