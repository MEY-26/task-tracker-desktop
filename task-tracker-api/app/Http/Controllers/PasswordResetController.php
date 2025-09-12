<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use App\Notifications\PasswordResetRequested;
use App\Models\User;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * Create a password reset request (by email)
     */
    public function requestReset(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email|exists:users,email',
            ]);

            $user = User::where('email', $request->email)->firstOrFail();

            // generate short-lived token
            $token = Str::random(8);

            // store request
            DB::table('password_reset_requests')->updateOrInsert(
                [
                    'user_id' => $user->id,
                ],
                [
                    'token' => $token,
                    'status' => 'pending',
                    'expires_at' => now()->addMinutes(60),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            // fetch the request to get ID
            $requestRow = DB::table('password_reset_requests')
                ->where('user_id', $user->id)
                ->first();

            // notify admins via database notifications
            $admins = User::where('role', 'admin')->get();
            if ($admins->count() > 0 && $requestRow) {
                Notification::send($admins, new PasswordResetRequested($user, $requestRow->id));
            }

            // Optionally notify the user/admin here (email/SMS) if desired
            Log::info("Password reset requested for user: {$user->email}");

            return response()->json([
                'success' => true,
                'message' => 'Parola sıfırlama isteği oluşturuldu.',
                'user_id' => $user->id,
                // In production, do NOT return token. It's here only for internal flows.
                'token' => app()->isLocal() ? $token : null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create password reset request: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Parola sıfırlama isteği oluşturulamadı'
            ], 500);
        }
    }

    /**
     * Reset password using reset request token
     */
    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required|string',
                'password' => 'required|string|min:6|confirmed',
            ]);

            $reset = DB::table('password_reset_requests')
                ->where('token', $request->token)
                ->first();

            if (!$reset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Geçersiz sıfırlama isteği'
                ], 400);
            }

            if ($reset->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sıfırlama isteği artık geçerli değil'
                ], 400);
            }

            if (now()->greaterThan($reset->expires_at)) {
                DB::table('password_reset_requests')
                    ->where('id', $reset->id)
                    ->update([
                        'status' => 'expired',
                        'updated_at' => now(),
                    ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Sıfırlama isteği süresi dolmuş'
                ], 400);
            }

            $user = User::findOrFail($reset->user_id);
            $user->password = Hash::make($request->password);
            $user->save();

            DB::table('password_reset_requests')
                ->where('id', $reset->id)
                ->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'updated_at' => now(),
                ]);

            Log::info("Password reset completed for user: {$user->email}");

            return response()->json([
                'success' => true,
                'message' => 'Parola başarıyla sıfırlandı'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to reset password via token: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Parola sıfırlanamadı'
            ], 500);
        }
    }
    /**
     * Get all password reset requests
     */
    public function getResetRequests()
    {
        try {
            // only admin can view reset requests
            $authUser = request()->user();
            if (!$authUser || $authUser->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu işlem için yetkiniz yok.'
                ], 403);
            }
            $requests = DB::table('password_reset_requests')
                ->join('users', 'password_reset_requests.user_id', '=', 'users.id')
                ->select(
                    'password_reset_requests.id',
                    'password_reset_requests.user_id',
                    'users.name',
                    'users.email',
                    'password_reset_requests.status',
                    'password_reset_requests.created_at',
                    'password_reset_requests.updated_at'
                )
                ->where('password_reset_requests.status', 'pending')
                ->orderBy('password_reset_requests.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get password reset requests: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Parola sıfırlama istekleri alınamadı'
            ], 500);
        }
    }

    /**
     * Admin reset password
     */
    public function adminResetPassword(Request $request)
    {
        try {
            // only admin can reset users' passwords
            $authUser = $request->user();
            if (!$authUser || $authUser->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu işlem için yetkiniz yok.'
                ], 403);
            }
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'new_password' => 'required|min:6'
            ]);

            $user = User::findOrFail($request->user_id);
            $user->password = Hash::make($request->new_password);
            $user->save();

            // Update password reset request status
            DB::table('password_reset_requests')
                ->where('user_id', $request->user_id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'completed',
                    'updated_at' => now()
                ]);

            Log::info("Admin reset password for user: {$user->email}");

            return response()->json([
                'success' => true,
                'message' => 'Parola başarıyla sıfırlandı'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to reset password: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Parola sıfırlanamadı'
            ], 500);
        }
    }

    /**
     * Cancel reset request
     */
    public function cancelResetRequest(Request $request)
    {
        try {
            // only admin can cancel requests
            $authUser = $request->user();
            if (!$authUser || $authUser->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu işlem için yetkiniz yok.'
                ], 403);
            }
            $request->validate([
                'request_id' => 'required|exists:password_reset_requests,id'
            ]);

            DB::table('password_reset_requests')
                ->where('id', $request->request_id)
                ->update([
                    // migration enum supports: pending, completed, expired
                    'status' => 'expired',
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Parola sıfırlama isteği iptal edildi'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to cancel reset request: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'İstek iptal edilemedi'
            ], 500);
        }
    }
}
