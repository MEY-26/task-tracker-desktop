<?php

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskHistoryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PasswordResetController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::post('/password-reset-request', [PasswordResetController::class, 'requestReset']);
Route::post('/password-reset', [PasswordResetController::class, 'resetPassword']);


Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/users', [AuthController::class, 'index']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Tasks
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::post('/tasks/{task}/respond', [TaskController::class, 'respond']);
    Route::post('/tasks/{task}/comment', [TaskController::class, 'comment']);
    Route::post('/tasks/{task}/remind', [TaskController::class, 'remind']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::get('/tasks/{task}/history', [TaskHistoryController::class, 'index']);
    Route::delete('/tasks/{task}/history/{history}', [TaskHistoryController::class, 'destroy']);
    Route::put('/tasks/{id}/accept', [TaskController::class, 'accept']);
    Route::put('/tasks/{id}/reject', [TaskController::class, 'reject']);
    Route::put('/tasks/{id}/toggle-status', [TaskController::class, 'toggleStatus']);
    Route::post('/tasks/{id}/seen', [TaskController::class, 'markAsSeen']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // admin
    Route::get('/password-reset-requests', [PasswordResetController::class, 'getResetRequests']);
    Route::post('/admin-reset-password', [PasswordResetController::class, 'adminResetPassword']);
    Route::post('/cancel-reset-request', [PasswordResetController::class, 'cancelResetRequest']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', function (Request $request, $id) {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['message' => 'Bildirim okundu olarak işaretlendi.']);
    });

    Route::post('/notifications/read-all', function (Request $request) {
        $user = $request->user();
        $user->unreadNotifications->each(function ($notification) {
            $notification->markAsRead();
        });
        return response()->json(['message' => 'Tüm bildirimler okundu.']);
    });

    Route::delete('/attachments/{id}', [TaskController::class, 'destroyAttachment']);

    Route::delete('/notifications/{id}', function (Request $request, $id) {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->delete();
        return response()->json(['message' => 'Bildirim silindi.']);
    });

    Route::delete('/notifications/cleanup', function (Request $request) {
        $threshold = Carbon::now()->subDays(30);
        $deleted = $request->user()
            ->notifications()
            ->where('created_at', '<', $threshold)
            ->delete();
        return response()->json([
            'message' => '30 günden eski bildirimler temizlendi.',
            'deleted_count' => $deleted
        ]);
    });

    Route::delete('/notifications', function (Request $request) {
        $deleted = $request->user()->notifications()->delete();
        return response()->json([
            'message' => 'Tüm bildirimler silindi.',
            'deleted_count' => $deleted
        ]);
    });
});
