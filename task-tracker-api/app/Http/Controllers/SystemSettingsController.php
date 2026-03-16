<?php

namespace App\Http\Controllers;

use App\Helpers\SystemSettingsHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSettingsController extends Controller
{
    /**
     * Get all system settings (admin or any authenticated user for read)
     */
    public function index(Request $request)
    {
        $auth = $request->user();
        if (!$auth) {
            return response()->json(['message' => 'Yetkisiz.'], 401);
        }

        $rows = DB::table('system_settings')->get();
        $settings = [];
        foreach ($rows as $row) {
            $val = $row->value;
            $decoded = json_decode($val, true);
            $settings[$row->key] = $decoded !== null ? $decoded : $val;
        }

        return response()->json($settings);
    }

    /**
     * Update system settings (admin only)
     */
    public function update(Request $request)
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $request->validate([
            'working_days' => 'nullable|array',
            'working_days.*' => 'integer|min:1|max:7',
            'work_start' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'work_end' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'breaks_default' => 'nullable|array',
            'breaks_default.*' => 'array',
            'breaks_default.*.*' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'breaks_friday' => 'nullable|array',
            'breaks_friday.*' => 'array',
            'breaks_friday.*.*' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'full_day_minutes' => 'nullable|integer|min:1|max:1440',
        ]);

        $allowed = ['working_days', 'work_start', 'work_end', 'breaks_default', 'breaks_friday', 'full_day_minutes'];
        $input = $request->only($allowed);

        $now = now();
        foreach ($input as $key => $value) {
            if ($value === null) continue;
            $stored = is_array($value) ? json_encode($value) : (string) $value;
            $exists = DB::table('system_settings')->where('key', $key)->exists();
            if ($exists) {
                DB::table('system_settings')->where('key', $key)->update(['value' => $stored, 'updated_at' => $now]);
            } else {
                DB::table('system_settings')->insert(['key' => $key, 'value' => $stored, 'created_at' => $now, 'updated_at' => $now]);
            }
        }

        SystemSettingsHelper::clearCache();

        return response()->json(['message' => 'Ayarlar güncellendi.']);
    }
}
