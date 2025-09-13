<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

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

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role' => 'sometimes|in:admin,team_leader,team_member,observer',
            'leader_id' => 'nullable|exists:users,id',
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

        $user->update($request->only(['name', 'email', 'role']));
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
}
