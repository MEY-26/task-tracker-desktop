<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class PasswordResetController extends Controller
{
    /**
     * Get all password reset requests
     */
    public function getResetRequests()
    {
        try {
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
            $request->validate([
                'request_id' => 'required|exists:password_reset_requests,id'
            ]);

            DB::table('password_reset_requests')
                ->where('id', $request->request_id)
                ->update([
                    'status' => 'cancelled',
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
