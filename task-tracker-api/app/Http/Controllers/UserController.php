<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function teamMembers(Request $request)
    {
        $auth = $request->user();
        if (!$auth) return response()->json(['message' => 'Yetkisiz'], 401);

        if ($auth->role === 'team_leader') {
            $list = User::where('leader_id', $auth->id)->orderBy('name')->get(['id','name','email','role','leader_id']);
            return response()->json(['members' => $list]);
        }
        if ($auth->role === 'admin') {
            $leaderId = $request->query('leader_id');
            $q = User::query();
            if ($leaderId) {
                // Admin kendi takımını da görebilir
                if ($leaderId == $auth->id) {
                    $q->where('leader_id', $auth->id);
                } else {
                    $q->where('leader_id', $leaderId);
                }
            }
            $list = $q->orderBy('name')->get(['id','name','email','role','leader_id']);
            return response()->json(['members' => $list]);
        }
        return response()->json(['members' => []]);
    }
    public function update(Request $request, $id)
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $departments = config('departments', []);
        $departmentRule = empty($departments) ? 'nullable|string|max:100' : 'nullable|string|max:100|in:' . implode(',', $departments);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role' => 'sometimes|in:admin,team_leader,team_member,observer',
            'leader_id' => 'nullable|exists:users,id',
            'department' => $departmentRule,
        ]);

        $user = User::findOrFail($id);
        // If leader_id is provided, ensure it refers to a valid leader and not self
        if ($request->has('leader_id')) {
            $leaderId = $request->input('leader_id');
            if ($leaderId) {
                if ((int)$leaderId === (int)$user->id) {
                    return response()->json(['message' => 'Kullanıcı kendisinin lideri olamaz.'], 422);
                }
                $leader = User::find($leaderId);
                if (!$leader || !in_array($leader->role, ['team_leader','admin'])) {
                    return response()->json(['message' => 'Lider olarak sadece Takım Lideri veya Yönetici seçilebilir.'], 422);
                }
            }
            // Team leaders and admins cannot have a leader assigned
            if (in_array($user->role, ['team_leader','admin']) && $leaderId) {
                return response()->json(['message' => 'Takım lideri veya yönetici için lider atanamaz.'], 422);
            }
            $user->leader_id = $leaderId; // null to clear
        }

        $updateData = $request->only(['name', 'email', 'role']);
        if ($request->has('department')) {
            $updateData['department'] = $request->input('department') ?: null;
        }
        $user->update($updateData);
        if ($request->has('leader_id')) {
            $user->save();
        }
        return response()->json(['message' => 'Kullanıcı güncellendi.']);
    }

    public function destroy($id)
    {
        $authUser = request()->user();
        if (!$authUser || $authUser->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'Kullanıcı silindi.']);
    }

    public function getTheme(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Yetkisiz'], 401);
        }

        $themePreferences = $user->theme_preferences ?? null;
        return response()->json([
            'theme_preferences' => $themePreferences
        ]);
    }

    public function saveTheme(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Yetkisiz'], 401);
        }

        $request->validate([
            'theme_name' => 'required|string|in:dark,light,blue,green,purple,orange,custom',
            'custom_theme' => 'nullable|array',
            'custom_theme.background' => 'nullable|string',
            'custom_theme.text' => 'nullable|string',
            'custom_theme.textSecondary' => 'nullable|string',
            'custom_theme.accent' => 'nullable|string',
            'custom_theme.border' => 'nullable|string',
            'custom_theme.tableBackground' => 'nullable|string',
            'custom_theme.tableRowAlt' => 'nullable|string',
            'custom_theme.tableHeader' => 'nullable|string',
            'custom_theme.logoType' => 'nullable|string|in:dark,light',
            'custom_theme.socialIconColor' => 'nullable|string',
        ]);

        $themePreferences = [
            'theme_name' => $request->input('theme_name'),
        ];

        if ($request->input('theme_name') === 'custom' && $request->has('custom_theme')) {
            $themePreferences['custom_theme'] = $request->input('custom_theme');
        }

        $user->theme_preferences = $themePreferences;
        $user->save();

        return response()->json([
            'message' => 'Tema kaydedildi.',
            'theme_preferences' => $user->theme_preferences
        ]);
    }

    /**
     * Download database backup (admin only). SQLite only.
     */
    public function databaseBackup(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $connection = config('database.default');
        if ($connection !== 'sqlite') {
            return response()->json(['message' => 'Yedekleme sadece SQLite veritabanı için desteklenir.'], 400);
        }

        $path = config('database.connections.sqlite.database');
        if (!is_file($path)) {
            return response()->json(['message' => 'Veritabanı dosyası bulunamadı.'], 404);
        }

        $filename = 'task-tracker-backup-' . now()->format('Y-m-d-His') . '.sqlite';
        return response()->download($path, $filename, [
            'Content-Type' => 'application/x-sqlite3',
        ]);
    }

    /**
     * Restore database from uploaded file (admin only). SQLite only.
     * Requires admin password for confirmation.
     */
    public function databaseRestore(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $request->validate([
            'password' => 'required|string',
            'database' => 'required|file|max:51200',
        ]);

        if (!Hash::check($request->input('password'), $user->password)) {
            return response()->json(['message' => 'Şifre hatalı.'], 422);
        }

        $connection = config('database.default');
        if ($connection !== 'sqlite') {
            return response()->json(['message' => 'Yükleme sadece SQLite veritabanı için desteklenir.'], 400);
        }

        $path = config('database.connections.sqlite.database');
        $path = $path ?: database_path('database.sqlite');

        $uploadedFile = $request->file('database');
        $content = file_get_contents($uploadedFile->getRealPath());

        // SQLite header: "SQLite format 3\000"
        if (strlen($content) < 16 || substr($content, 0, 16) !== "SQLite format 3\x00") {
            return response()->json(['message' => 'Geçersiz SQLite dosyası.'], 422);
        }

        try {
            $backupPath = $path . '.backup-' . now()->format('Y-m-d-His');
            if (is_file($path)) {
                copy($path, $backupPath);
            }
            file_put_contents($path, $content);
            return response()->json(['message' => 'Veritabanı başarıyla yüklendi. Uygulama yeniden başlatılabilir.']);
        } catch (\Throwable $e) {
            if (isset($backupPath) && is_file($backupPath)) {
                copy($backupPath, $path);
            }
            return response()->json(['message' => 'Yükleme sırasında hata: ' . $e->getMessage()], 500);
        }
    }
}
