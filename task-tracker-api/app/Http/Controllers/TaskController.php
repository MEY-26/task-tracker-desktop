<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskHistory;
use App\Notifications\TaskUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\TaskAttachment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\TaskNotificationMail;
use App\Models\User;


class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'admin' || $user->role === 'observer') {
            $tasks = Task::with(['assignedUsers', 'attachments', 'creator', 'responsible'])->get();
        } else {
            $tasks = Task::with(['assignedUsers', 'attachments', 'creator', 'responsible'])
                ->where('created_by', $user->id)
                ->orWhere('responsible_id', $user->id)
                ->orWhereHas('assignedUsers', function ($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->get();
        }

        return response()->json([
            'tasks' => $tasks
        ]);
    }



    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:waiting,in_progress,investigating,completed,cancelled',
            'task_type' => 'required|in:new_product,fixture,apparatus,development,revision,mold,test_device',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip|max:10240',
            'responsible_id' => 'required|exists:users,id',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $currentUserId = $request->user()->id;
        $currentUser = $request->user();

        if ($currentUser->role === 'observer') {
            return response()->json([
                'message' => 'Observer rolündeki kullanıcılar görev oluşturamaz.'
            ], 403);
        }

        $responsibleUser = User::find($request->responsible_id);
        if ($responsibleUser && $responsibleUser->role === 'observer') {
            return response()->json([
                'message' => 'Observer rolündeki kullanıcılara görev sorumluluğu atayamazsınız.'
            ], 422);
        }

        if ($currentUser->role === 'team_leader' && $responsibleUser && $responsibleUser->role === 'admin') {
            return response()->json([
                'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız.'
            ], 422);
        }

        if (!empty($request->assigned_users)) {
            $assignedUsers = User::whereIn('id', $request->assigned_users)->get();
            
            $observers = $assignedUsers->where('role', 'observer');
            if ($observers->count() > 0) {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev atayamazsınız: ' . $observers->pluck('name')->join(', ')
                ], 422);
            }

            if ($currentUser->role === 'team_leader') {
                $admins = $assignedUsers->where('role', 'admin');
                if ($admins->count() > 0) {
                    return response()->json([
                        'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız: ' . $admins->pluck('name')->join(', ')
                    ], 422);
                }
            }

            if (in_array($request->responsible_id, $request->assigned_users)) {
                return response()->json([
                    'message' => 'Sorumlu olan kullanıcı aynı görevde atanan olarak seçilemez.'
                ], 422);
            }
        }

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => $validated['status'] ?? 'waiting',
            'task_type' => $request->task_type,
            'responsible_id' => $request->responsible_id,
            'created_by' => $currentUserId,
            'start_date' => $request->start_date,
            'due_date' => $request->due_date,
        ]);

        if ($request->hasFile('attachments')) {
            $uploadedFiles = [];
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('attachments', 'public');
                $uploadedFiles[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'task_id' => $task->id,
                ];
            }

            $task->attachments()->createMany($uploadedFiles);
        }

        if ($request->has('assigned_users')) {
            foreach ($request->assigned_users as $userId) {
                if ($userId != $request->responsible_id) {
                    $task->assignedUsers()->attach($userId, ['role' => 'assigned']);
                }
            }
        }

        $bildirimGidecekler = collect([
            $task->responsible,
            ...$task->assignedUsers
        ])->unique('id')->filter(function ($u) use ($currentUserId) {
            return $u && $u->id !== $currentUserId;
        });

        if ($task->responsible_id && $task->responsible_id !== $currentUserId) {
            try {
                $responsibleMessage = 'Size yeni bir görev sorumluluğu atandı: "' . $task->title . '"';
                $task->responsible->notify(new TaskUpdated($task, $responsibleMessage));
            } catch (\Exception $e) {
                Log::error('Failed to send notification to responsible user: ' . $e->getMessage());
            }
        }

        foreach ($task->assignedUsers as $user) {
            if ($user->id !== $currentUserId && $user->id !== $task->responsible_id) {
                try {
                    $assignedMessage = 'Size yeni bir görev atandı: "' . $task->title . '"';
                    $user->notify(new TaskUpdated($task, $assignedMessage));
                } catch (\Exception $e) {
                    Log::error('Failed to send notification to assigned user: ' . $e->getMessage());
                }
            }
        }

        // Mail gönderimi geçici olarak devre dışı bırakıldı
        // TODO: TaskNotificationMail sınıfı oluşturulduktan sonra aktif edilecek
        /*
        try {
            if ($task->responsible && $task->responsible->id !== $currentUserId) {
                Mail::to($task->responsible->email)->send(new TaskNotificationMail(
                    $task,
                    'assigned',
                    $task->responsible,
                    'Size yeni bir görev sorumluluğu atandı'
                ));
            }

            foreach ($task->assignedUsers as $assignedUser) {
                if ($assignedUser && $assignedUser->id !== $currentUserId && $assignedUser->id !== $task->responsible_id && $assignedUser->email) {
                    Mail::to($assignedUser->email)->send(new TaskNotificationMail(
                        $task,
                        'assigned',
                        $assignedUser,
                        'Size yeni bir görev atandı'
                    ));
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send email notifications: ' . $e->getMessage());
        }
        */

        return response()->json([
            'message' => 'Görev oluşturuldu.',
            'task' => $task->load(['assignedUsers','attachments','creator','responsible']),
        ], 201);
    }

    public function show(Request $request, Task $task)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }

        if ($user->role === 'admin' || $user->role === 'observer') {
            return response()->json([
                'task' => $task->load(['assignedUsers','attachments','creator','responsible']),
            ]);
        }

        if (
            $user->id !== $task->created_by &&
            $user->id !== $task->responsible_id &&
            !$task->assignedUsers->contains('id', $user->id)
        ) {
            return response()->json(['message' => 'Bu göreve erişim izniniz yok.'], 403);
        }

        return response()->json([
            'task' => $task->load(['assignedUsers','attachments','creator','responsible']),
        ]);
    }

    public function update(Request $request, Task $task)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar görevlerde değişiklik yapamaz. Sadece görüntüleme yetkiniz var.'], 403);
        }

        if ($user->role !== 'admin' && $user->id !== $task->created_by && $user->id !== $task->responsible_id) {
            return response()->json(['message' => 'Bu görevi güncelleme yetkiniz yok.'], 403);
        }


        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'priority' => 'in:low,medium,high,critical',
            'status' => 'in:waiting,in_progress,investigating,completed,cancelled',
            'task_type' => 'in:new_product,fixture,apparatus,development,revision,mold,test_device',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip|max:10240',
            'responsible_id' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'exists:users,id',
        ]);
        if ($request->has('responsible_id')) {
            $responsibleUser = User::find($request->responsible_id);
            
            if ($responsibleUser && $responsibleUser->role === 'observer') {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev sorumluluğu atayamazsınız.'
                ], 422);
            }

            if ($user->role === 'team_leader' && $responsibleUser && $responsibleUser->role === 'admin') {
                return response()->json([
                    'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız.'
                ], 422);
            }
        }
        if ($user->role === 'team_leader') {
            $allowedFields = ['due_date', 'status', 'comment'];
            $requestFields = array_keys($request->all());
            
            foreach ($requestFields as $field) {
                if (!in_array($field, $allowedFields)) {
                    return response()->json([
                        'message' => 'Takım liderleri sadece bitiş tarihi, durum ve yorum değiştirebilir.'
                    ], 403);
                }
            }
        }

        if ($request->has('assigned_users') && !empty($request->assigned_users)) {
            $assignedUsers = User::whereIn('id', $request->assigned_users)->get();
            
            $observers = $assignedUsers->where('role', 'observer');
            if ($observers->count() > 0) {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev atayamazsınız: ' . $observers->pluck('name')->join(', ')
                ], 422);
            }

            if ($user->role === 'team_leader') {
                $admins = $assignedUsers->where('role', 'admin');
                if ($admins->count() > 0) {
                    return response()->json([
                        'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız: ' . $admins->pluck('name')->join(', ')
                    ], 422);
                }
            }

            $responsibleId = $request->responsible_id ?? $task->responsible_id;
            if ($responsibleId && in_array($responsibleId, $request->assigned_users)) {
                return response()->json([
                    'message' => 'Sorumlu olan kullanıcı aynı görevde atanan olarak seçilemez.'
                ], 422);
            }
        }

        $task->load(['assignedUsers', 'responsible', 'creator']);
        $before = $task->toArray();
        $task->update($validated);
        if ($request->has('description')) {
            $task->description = $request->input('description');
        }

        if (in_array($request->status, ['in_progress', 'investigating']) && !$task->start_date) {
            $task->start_date = now();
        }

        if (in_array($request->status, ['completed', 'cancelled']) && !$task->end_date) {
            $task->end_date = now();
        }

        $task->save();
        $after = $task->fresh()->toArray();
        

        foreach ($validated as $key => $newValue) {
            if (in_array($key, ['attachments', 'assigned_users'])) {
                continue;
            }
            $oldValue = $before[$key] ?? null;

            if ($oldValue != $newValue) {
                TaskHistory::create([
                    'task_id'    => $task->id,
                    'user_id'    => $user->id,
                    'field'      => $key,
                    'old_value'  => is_array($oldValue) ? json_encode($oldValue) : $oldValue,
                    'new_value'  => is_array($newValue) ? json_encode($newValue) : $newValue,
                ]);
            }
        }

        if ($request->hasFile('attachments')) {
            $uploadedFiles = [];

            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $storedPath = $file->store('attachments', 'public');

                $uploadedFiles[] = [
                    'original_name' => $originalName,
                    'path' => $storedPath,
                ];
            }

            $task->attachments()->createMany($uploadedFiles);
            TaskHistory::create([
                'task_id'    => $task->id,
                'user_id'    => $user->id,
                'field'      => 'attachments',
                'old_value'  => null,
                'new_value'  => json_encode(array_map(fn($f)=>$f['original_name'], $uploadedFiles)),
            ]);
        }


        if ($request->has('assigned_users')) {
            $oldUsers = $task->assignedUsers->pluck('id')->sort()->values()->all();
            $newUsers = collect(array_unique($request->assigned_users))->sort()->values()->all();

            if ($oldUsers != $newUsers) {
                TaskHistory::create([
                    'task_id'    => $task->id,
                    'user_id'    => $user->id,
                    'field'      => 'assigned_users',
                    'old_value'  => json_encode($oldUsers),
                    'new_value'  => json_encode($newUsers),
                ]);
            }

            $task->assignedUsers()->sync($newUsers);
            $newlyAssigned = array_diff($newUsers, $oldUsers);
            foreach ($newlyAssigned as $userId) {
                $assignedUser = User::find($userId);
                if ($assignedUser && $assignedUser->id !== $user->id) {
                    try {
                        $assignedMessage = 'Size yeni bir görev atandı: "' . $task->title . '"';
                        $assignedUser->notify(new TaskUpdated($task, $assignedMessage));
                    } catch (\Exception $e) {
                        Log::error('Failed to send notification to newly assigned user: ' . $e->getMessage());
                    }
                }
            }
        }

        $message = 'Göreviniz güncellendi: "' . $task->title . '"';
        $bildirimGidecekler = collect();
        if ($task->responsible && $task->responsible->id !== $user->id) {
            $bildirimGidecekler->push($task->responsible);
        }
        if ($task->creator && $task->creator->id !== $user->id) {
            $bildirimGidecekler->push($task->creator);
        }
        foreach ($task->assignedUsers as $assignedUser) {
            if ($assignedUser && $assignedUser->id !== $user->id) {
                $bildirimGidecekler->push($assignedUser);
            }
        }
        $bildirimGidecekler = $bildirimGidecekler->unique('id');

        foreach ($bildirimGidecekler as $kisi) {
            if ($kisi && $kisi->email) {
                $kisi->notify(new TaskUpdated($task, $message));
            }
        }

        try {
            foreach ($bildirimGidecekler as $kisi) {
                if ($kisi && $kisi->email) {
                    Mail::to($kisi->email)->send(new TaskNotificationMail(
                        $task,
                        'updated',
                        $kisi,
                        'Göreviniz güncellendi'
                    ));
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send email notifications for task update: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Görev güncellendi.',
            'task' => $task->load(['assignedUsers','attachments','creator','responsible'])
        ]);
    }

    public function destroy(Request $request, Task $task)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }

        // İptal edilen görevler: Admin yetkisi olan kullanıcılar silebilir
        if ($task->status === 'cancelled') {
            if (!$user->isAdmin() && $user->role !== 'team_leader') {
                return response()->json(['message' => 'İptal edilen görevleri sadece admin yetkisi olan kullanıcılar silebilir.'], 403);
            }
        }
        // Tamamlanan görevler: Sadece admin silebilir
        elseif ($task->status === 'completed') {
            if (!$user->isAdmin()) {
                return response()->json(['message' => 'Tamamlanan görevleri sadece admin kullanıcılar silebilir.'], 403);
            }
        }
        // Diğer durumlar: Sadece admin silebilir
        else {
            if (!$user->isAdmin()) {
                return response()->json(['message' => 'Bu görev durumundaki görevleri sadece admin kullanıcılar silebilir.'], 403);
            }
        }

        // Görev geçmişini logla
        TaskHistory::create([
            'task_id'    => $task->id,
            'user_id'    => $user->id,
            'field'      => 'task_deleted',
            'old_value'  => json_encode($task->toArray()),
            'new_value'  => 'deleted',
        ]);

        // Tüm ekleri ve dosyaları sil
        $deletedFiles = 0;
        $failedFiles = 0;
        
        foreach ($task->attachments as $attachment) {
            try {
                // Fiziksel dosyayı sil
                if (Storage::disk('public')->exists($attachment->path)) {
                    Storage::disk('public')->delete($attachment->path);
                    $deletedFiles++;
                } else {
                    Log::warning('Attachment file not found: ' . $attachment->path, [
                        'attachment_id' => $attachment->id,
                        'original_name' => $attachment->original_name
                    ]);
                }
                
                // Veritabanı kaydını sil
                $attachment->delete();
            } catch (\Exception $e) {
                $failedFiles++;
                Log::error('Failed to delete attachment: ' . $e->getMessage(), [
                    'attachment_id' => $attachment->id,
                    'file_path' => $attachment->path,
                    'original_name' => $attachment->original_name
                ]);
            }
        }

        // Görev ilişkilerini temizle
        $task->assignedUsers()->detach();
        $task->histories()->delete();
        
        // Görevi sil
        $task->delete();

        $message = 'Görev ve tüm ekleri başarıyla silindi.';
        if ($failedFiles > 0) {
            $message .= " ({$failedFiles} dosya silinemedi, loglara bakın)";
        }

        return response()->json([
            'message' => $message,
            'deleted_files' => $deletedFiles,
            'failed_files' => $failedFiles
        ]);
    }

    public function destroyAttachment($id)
    {
        $attachment = TaskAttachment::findOrFail($id);
        $user = request()->user();
        
        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }
        $task = $attachment->task;
        if (!$task) {
            return response()->json(['message' => 'Görev bulunamadı.'], 404);
        }
        if (
            $user->role !== 'admin' &&
            $user->id !== $task->created_by &&
            $user->id !== $task->responsible_id &&
            !$task->assignedUsers->contains('id', $user->id)
        ) {
            return response()->json(['message' => 'Bu dosyayı silme yetkiniz yok.'], 403);
        }
        $fileDeleted = false;
        try {
            if (Storage::disk('public')->exists($attachment->path)) {
                Storage::disk('public')->delete($attachment->path);
                $fileDeleted = true;
            } else {
                Log::warning('Attachment file not found: ' . $attachment->path, [
                    'attachment_id' => $attachment->id,
                    'original_name' => $attachment->original_name
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to delete attachment file: ' . $e->getMessage(), [
                'attachment_id' => $attachment->id,
                'file_path' => $attachment->path,
                'original_name' => $attachment->original_name
            ]);
        }
        $originalName = $attachment->original_name;
        TaskHistory::create([
            'task_id'   => $attachment->task_id,
            'user_id'   => $user->id,
            'field'     => 'attachments',
            'old_value' => $originalName,
            'new_value' => null,    
        ]);

        $attachment->delete();

        $message = $fileDeleted 
            ? 'Dosya başarıyla silindi.' 
            : 'Dosya kaydı silindi, ancak fiziksel dosya bulunamadı.';

        return response()->json(['message' => $message]);
    }

    public function showAttachment(TaskAttachment $attachment)
    {
        if (!Storage::disk('public')->exists($attachment->path)) {
            abort(404);
        }
        
        return response()->file(Storage::disk('public')->path($attachment->path));
    }

    public function respond(Request $request, Task $task)
    {
        $user = $request->user();
        if (
            $user->id !== $task->responsible_id &&
            !$task->assignedUsers->contains('id', $user->id)
        ) {
            return response()->json(['message' => 'Bu göreve yanıt verme yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'response' => 'required|in:accepted,rejected',
        ]);

        $statusText = $validated['response'] === 'accepted' ? 'kabul etti' : 'reddetti';
        $message = $user->name . ' görevi ' . $statusText . ': "' . $task->title . '"';

        $bildirimGidecekler = collect([
            $task->creator,
            $task->responsible,
            ...$task->assignedUsers
        ])->unique('id')->filter(fn($u) => $u && $u->id !== $user->id);

        foreach ($bildirimGidecekler as $kisi) {
            $kisi->notify(new TaskUpdated($task, $message));
        }
        TaskHistory::create([
            'task_id'    => $task->id,
            'user_id'    => $user->id,
            'field'      => 'task_response',
            'old_value'  => null,
            'new_value'  => $validated['response'],
        ]);
        if ($user->id === $task->responsible_id) {
        } else {
            $task->assignedUsers()->updateExistingPivot($user->id, [
                'response' => $validated['response'],
                'responded_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Göreve yanıt verildi.',
            'response' => $validated['response'],
        ]);
    }

    public function comment(Request $request, Task $task)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar yorum ekleyemez. Sadece görüntüleme yetkiniz var.'], 403);
        }
        if (
            $user->role !== 'admin' &&
            $user->id !== $task->created_by &&
            $user->id !== $task->responsible_id &&
            !$task->assignedUsers->contains('id', $user->id)
        ) {
            return response()->json(['message' => 'Bu göreve yorum ekleme yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'text' => 'required|string|max:5000',
        ]);
        $history = TaskHistory::create([
            'task_id'   => $task->id,
            'user_id'   => $user->id,
            'field'     => 'comment',
            'old_value' => null,
            'new_value' => $validated['text'],
        ]);

        return response()->json([
            'message' => 'Yorum eklendi',
            'comment' => $history->load('user:id,name'),
        ], 201);
    }

    public function remind(Request $request, Task $task)
    {
        $user = $request->user();
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar hatırlatma yapamaz. Sadece görüntüleme yetkiniz var.'], 403);
        }
        if ($user->id !== $task->created_by && $user->id !== $task->responsible_id) {
            return response()->json(['message' => 'Bu göreve hatırlatma yapma yetkiniz yok.'], 403);
        }

        $reminderTargets = [];
        if ($request->has('user_ids')) {
            $reminderTargets = $task->assignedUsers()->whereIn('users.id', $request->user_ids)->get();
        } else {
            $reminderTargets = $task->assignedUsers()->wherePivot('response', null)->get();
        }

        $message = $user->name . ' size şu görevi hatırlattı: "' . $task->title . '"';

        foreach ($reminderTargets as $target) {
            if ($target->id !== $user->id) {
                $target->notify(new TaskUpdated($task, $message));
            }
        }
        try {
            foreach ($reminderTargets as $target) {
                if ($target && $target->id !== $user->id && $target->email) {
                    Mail::to($target->email)->send(new TaskNotificationMail(
                        $task,
                        'reminded',
                        $target,
                        'Görev hatırlatması'
                    ));
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send reminder emails: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Hatırlatma bildirimi gönderildi.',
            'notified_users' => $reminderTargets->pluck('id')
        ]);
    }

    public function accept($id)
    {
        $task = Task::findOrFail($id);
        $task->status = 'in_progress';
        $task->start_date = now();
        $task->save();

        return response()->json(['message' => 'Görev işleme alındı.']);
    }


    public function reject($id)
    {
        $task = Task::findOrFail($id);
        $task->status = 'cancelled';
        $task->end_date = now();
        $task->save();

        return response()->json(['message' => 'Görev iptal edildi.']);
    }


    public function toggleStatus($id)
    {
        $task = Task::findOrFail($id);

        switch ($task->status) {
            case 'in_progress':
                $task->status = 'investigating';
                break;
            case 'investigating':
                $task->status = 'completed';
                break;
            default:
                break;
        }

        $task->save();

        return response()->json([
            'message' => 'Durum değiştirildi.',
            'status' => $task->status
        ]);
    }


    public function markAsSeen(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        $task->assignedUsers()->updateExistingPivot($user->id, [
            'response' => 'seen',
            'responded_at' => now(),
        ]);

        return response()->json(['message' => 'Görev görüldü olarak işaretlendi.']);
    }

    /**
     * Check if user can delete a specific task
     */
    public function canDelete(Request $request, Task $task)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['can_delete' => false, 'reason' => 'Kullanıcı doğrulanamadı.'], 401);
        }

        $canDelete = false;
        $reason = '';

        // İptal edilen görevler: Admin yetkisi olan kullanıcılar silebilir
        if ($task->status === 'cancelled') {
            if ($user->isAdmin() || $user->role === 'team_leader') {
                $canDelete = true;
            } else {
                $reason = 'İptal edilen görevleri sadece admin yetkisi olan kullanıcılar silebilir.';
            }
        }
        // Tamamlanan görevler: Sadece admin silebilir
        elseif ($task->status === 'completed') {
            if ($user->isAdmin()) {
                $canDelete = true;
            } else {
                $reason = 'Tamamlanan görevleri sadece admin kullanıcılar silebilir.';
            }
        }
        // Diğer durumlar: Sadece admin silebilir
        else {
            if ($user->isAdmin()) {
                $canDelete = true;
            } else {
                $reason = 'Bu görev durumundaki görevleri sadece admin kullanıcılar silebilir.';
            }
        }

        return response()->json([
            'can_delete' => $canDelete,
            'reason' => $reason,
            'task_status' => $task->status,
            'user_role' => $user->role
        ]);
    }
}
