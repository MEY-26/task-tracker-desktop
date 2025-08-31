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
            // Admin ve observer tüm görevleri görebilir
            $tasks = Task::with(['assignedUsers', 'attachments', 'creator', 'responsible'])->get();
        } else {
            // team_leader ve team_member sadece kendi görevlerini görebilir
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
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip|max:10240',
            'responsible_id' => 'required|exists:users,id',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $currentUserId = $request->user()->id;
        $currentUser = $request->user();

        // 1. Observer rolündeki kullanıcılara görev atanamasın kontrolü
        $responsibleUser = User::find($request->responsible_id);
        if ($responsibleUser && $responsibleUser->role === 'observer') {
            return response()->json([
                'message' => 'Observer rolündeki kullanıcılara görev sorumluluğu atayamazsınız.'
            ], 422);
        }

        // 2. Team leader'ların admin'lere görev atayamaması kontrolü
        if ($currentUser->role === 'team_leader' && $responsibleUser && $responsibleUser->role === 'admin') {
            return response()->json([
                'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız.'
            ], 422);
        }

        // 3. Atanan kullanıcılar için rol kontrolü
        if (!empty($request->assigned_users)) {
            $assignedUsers = User::whereIn('id', $request->assigned_users)->get();
            
            // Observer'lara atama kontrolü
            $observers = $assignedUsers->where('role', 'observer');
            if ($observers->count() > 0) {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev atayamazsınız: ' . $observers->pluck('name')->join(', ')
                ], 422);
            }

            // Team leader'ın admin'lere atama kontrolü
            if ($currentUser->role === 'team_leader') {
                $admins = $assignedUsers->where('role', 'admin');
                if ($admins->count() > 0) {
                    return response()->json([
                        'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız: ' . $admins->pluck('name')->join(', ')
                    ], 422);
                }
            }

            // 4. Sorumlu olan kullanıcının atanan listesinde olmaması kontrolü
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

        // Ek olarak atanmış kullanıcılar varsa ekle
        if ($request->has('assigned_users')) {
            foreach ($request->assigned_users as $userId) {
                if ($userId != $request->responsible_id) {
                    $task->assignedUsers()->attach($userId, ['role' => 'assigned']);
                }
            }
        }

        // Bildirim gönderilecek kişiler
        $bildirimGidecekler = collect([
            $task->responsible,
            ...$task->assignedUsers
        ])->unique('id')->filter(function ($u) use ($currentUserId) {
            return $u && $u->id !== $currentUserId;
        });

        // Sorumlu kişiye özel mesaj
        if ($task->responsible_id && $task->responsible_id !== $currentUserId) {
            try {
                $responsibleMessage = 'Size yeni bir görev sorumluluğu atandı: "' . $task->title . '"';
                $task->responsible->notify(new TaskUpdated($task, $responsibleMessage));
                Log::info('Notification sent to responsible user: ' . $task->responsible->name);
            } catch (\Exception $e) {
                Log::error('Failed to send notification to responsible user: ' . $e->getMessage());
            }
        }

        // Atanan kullanıcılara özel mesaj
        foreach ($task->assignedUsers as $user) {
            if ($user->id !== $currentUserId && $user->id !== $task->responsible_id) {
                try {
                    $assignedMessage = 'Size yeni bir görev atandı: "' . $task->title . '"';
                    $user->notify(new TaskUpdated($task, $assignedMessage));
                    Log::info('Notification sent to assigned user: ' . $user->name);
                } catch (\Exception $e) {
                    Log::error('Failed to send notification to assigned user: ' . $e->getMessage());
                }
            }
        }

        // Email bildirimleri gönder
        try {
            // Sorumlu kişiye email gönder
            if ($task->responsible && $task->responsible->id !== $currentUserId) {
                Mail::to($task->responsible->email)->send(new TaskNotificationMail(
                    $task,
                    'assigned',
                    $task->responsible,
                    'Size yeni bir görev sorumluluğu atandı'
                ));
                Log::info('Email sent to responsible user: ' . $task->responsible->email);
            }

            // Atanan kullanıcılara email gönder
            foreach ($task->assignedUsers as $user) {
                if ($user->id !== $currentUserId && $user->id !== $task->responsible_id) {
                    Mail::to($user->email)->send(new TaskNotificationMail(
                        $task,
                        'assigned',
                        $user,
                        'Size yeni bir görev atandı'
                    ));
                    Log::info('Email sent to assigned user: ' . $user->email);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send email notifications: ' . $e->getMessage());
            // Email hatası görev oluşturulmasını engellemez
        }

        return response()->json([
            'message' => 'Görev oluşturuldu.',
            'task' => $task->load(['assignedUsers','attachments','creator','responsible']),
        ], 201);
    }

    public function show(Request $request, Task $task)
    {
        $user = $request->user();
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

        // Observer'lar hiçbir güncelleme yapamaz
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar görevlerde değişiklik yapamaz. Sadece görüntüleme yetkiniz var.'], 403);
        }

        if ($user->role !== 'admin' && $user->id !== $task->created_by && $user->id !== $task->responsible_id) {
            return response()->json(['message' => 'Bu görevi güncelleme yetkiniz yok.'], 403);
        }

        \Illuminate\Support\Facades\Log::info('Task update request', [
            'task_id' => $task->id,
            'user_id' => $user->id,
            'user_role' => $user->role,
            'request_data' => $request->all(),
            'has_description' => $request->has('description'),
            'description_value' => $request->input('description')
        ]);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'priority' => 'in:low,medium,high,critical',
            'status' => 'in:waiting,in_progress,investigating,completed,cancelled',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip|max:10240',
            'responsible_id' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'exists:users,id',
        ]);

        // Rol tabanlı validasyonlar
        if ($request->has('responsible_id')) {
            $responsibleUser = User::find($request->responsible_id);
            
            // 1. Observer rolündeki kullanıcılara görev atanamasın kontrolü
            if ($responsibleUser && $responsibleUser->role === 'observer') {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev sorumluluğu atayamazsınız.'
                ], 422);
            }

            // 2. Team leader'ların admin'lere görev atayamaması kontrolü
            if ($user->role === 'team_leader' && $responsibleUser && $responsibleUser->role === 'admin') {
                return response()->json([
                    'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız.'
                ], 422);
            }
        }

        // 3. Atanan kullanıcılar için rol kontrolü
        if ($request->has('assigned_users') && !empty($request->assigned_users)) {
            $assignedUsers = User::whereIn('id', $request->assigned_users)->get();
            
            // Observer'lara atama kontrolü
            $observers = $assignedUsers->where('role', 'observer');
            if ($observers->count() > 0) {
                return response()->json([
                    'message' => 'Observer rolündeki kullanıcılara görev atayamazsınız: ' . $observers->pluck('name')->join(', ')
                ], 422);
            }

            // Team leader'ın admin'lere atama kontrolü
            if ($user->role === 'team_leader') {
                $admins = $assignedUsers->where('role', 'admin');
                if ($admins->count() > 0) {
                    return response()->json([
                        'message' => 'Takım lideri olarak admin rolündeki kullanıcılara görev atayamazsınız: ' . $admins->pluck('name')->join(', ')
                    ], 422);
                }
            }

            // 4. Sorumlu olan kullanıcının atanan listesinde olmaması kontrolü
            $responsibleId = $request->responsible_id ?? $task->responsible_id;
            if ($responsibleId && in_array($responsibleId, $request->assigned_users)) {
                return response()->json([
                    'message' => 'Sorumlu olan kullanıcı aynı görevde atanan olarak seçilemez.'
                ], 422);
            }
        }

        $task->load(['assignedUsers', 'responsible', 'creator']);
        $before = $task->toArray();

        // Bazı ortamlarda PUT ile kısmi güncellemelerde description alanı
        // mass-assign sırasında gözden kaçabiliyor. Güvenli olması için
        // hem toplu update hem de açık atama yapıyoruz.
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
        
        \Illuminate\Support\Facades\Log::info('Task updated', [
            'task_id' => $task->id,
            'description_before' => $before['description'] ?? null,
            'description_after' => $after['description'] ?? null,
            'description_saved' => $task->description
        ]);

        foreach ($validated as $key => $newValue) {
            // Dosya ekleri ve atanan kullanıcılar için ayrı kayıt mantığı mevcut.
            // Bu alanları genel değişiklik döngüsünden hariç tutarak mükerrer history oluşmasını engelle.
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
        }

        $message = 'Göreviniz güncellendi: "' . $task->title . '"';

        $bildirimGidecekler = collect([
            $task->responsible,
            $task->creator,
            ...$task->assignedUsers
        ])->unique('id')->filter(function ($u) use ($user) {
            return $u && $u->id !== $user->id;
        });

        foreach ($bildirimGidecekler as $kisi) {
            $kisi->notify(new TaskUpdated($task, $message));
        }

        // Email bildirimleri gönder
        try {
            foreach ($bildirimGidecekler as $kisi) {
                Mail::to($kisi->email)->send(new TaskNotificationMail(
                    $task,
                    'updated',
                    $kisi,
                    'Göreviniz güncellendi'
                ));
                Log::info('Email sent to user: ' . $kisi->email . ' for task update');
            }
        } catch (\Exception $e) {
            Log::error('Failed to send email notifications for task update: ' . $e->getMessage());
            // Email hatası görev güncellemesini engellemez
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

        // Sadece admin kalıcı silme yapabilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Görevleri kalıcı olarak silme yetkiniz yok. Sadece admin kullanıcılar kalıcı silme yapabilir.'], 403);
        }

        foreach ($task->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->path); // storage/app/public içinden sil
            $attachment->delete(); // veritabanından sil
        }

        $task->assignedUsers()->detach(); // Pivot tablosunu temizle
        $task->histories()->delete();     // Görev geçmişi kayıtlarını sil
        $task->delete();                  // Görevi sil

        return response()->json(['message' => 'Görev silindi.']);
    }

    public function destroyAttachment($id)
    {
        $attachment = TaskAttachment::findOrFail($id);

        // Fiziksel dosyayı sil
        Storage::disk('public')->delete($attachment->path);

        // History: dosya silindi kaydı oluştur
        $user = request()->user();
        $originalName = $attachment->original_name;
        TaskHistory::create([
            'task_id'   => $attachment->task_id,
            'user_id'   => $user?->id,
            'field'     => 'attachments',
            'old_value' => $originalName,   // silinen dosya adı
            'new_value' => null,            // silme işlemi
        ]);

        // Veritabanından kaydı sil
        $attachment->delete();

        return response()->json(['message' => 'Dosya başarıyla silindi.']);
    }

    // İmzalı URL üzerinden dosya gösterimi/indirme
    public function showAttachment(TaskAttachment $attachment)
    {
        // storage/app/public içindeki dosyayı stream olarak döndür
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

        // Bildirim gönderilecek kişiler (kendisi hariç)
        $bildirimGidecekler = collect([
            $task->creator,
            $task->responsible,
            ...$task->assignedUsers
        ])->unique('id')->filter(fn($u) => $u && $u->id !== $user->id);

        foreach ($bildirimGidecekler as $kisi) {
            $kisi->notify(new TaskUpdated($task, $message));
        }

        // (İsteğe bağlı) TaskHistory'ye kayıt düşelim
        TaskHistory::create([
            'task_id'    => $task->id,
            'user_id'    => $user->id,
            'field'      => 'task_response',
            'old_value'  => null,
            'new_value'  => $validated['response'],
        ]);

        // Pivot tablosunda güncelleme
        if ($user->id === $task->responsible_id) {
        } else {
            // Atanmış kullanıcı
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

        // Observer'lar yorum ekleyemez
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar yorum ekleyemez. Sadece görüntüleme yetkiniz var.'], 403);
        }

        // Admin'ler her şeye yorum ekleyebilir, diğerleri sadece kendi görevlerine
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

        // Yorumları TaskHistory'de ayrı bir alan olarak tutalım
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

        // Observer'lar hatırlatma yapamaz
        if ($user->role === 'observer') {
            return response()->json(['message' => 'Observer rolündeki kullanıcılar hatırlatma yapamaz. Sadece görüntüleme yetkiniz var.'], 403);
        }

        // Sadece görevi oluşturan ya da sorumlu kişi hatırlatma yapabilmeli
        if ($user->id !== $task->created_by && $user->id !== $task->responsible_id) {
            return response()->json(['message' => 'Bu göreve hatırlatma yapma yetkiniz yok.'], 403);
        }

        $reminderTargets = [];

        // Eğer kullanıcı id'leri body'den geldiyse onları al, yoksa default olarak kabul edilmemişleri bul
        if ($request->has('user_ids')) {
            $reminderTargets = $task->assignedUsers()->whereIn('users.id', $request->user_ids)->get();
        } else {
            // Henüz cevap vermemiş olanlar
            $reminderTargets = $task->assignedUsers()->wherePivot('response', null)->get();
        }

        $message = $user->name . ' size şu görevi hatırlattı: "' . $task->title . '"';

        foreach ($reminderTargets as $target) {
            if ($target->id !== $user->id) {
                $target->notify(new TaskUpdated($task, $message));
            }
        }

        // Email hatırlatmaları gönder
        try {
            foreach ($reminderTargets as $target) {
                if ($target->id !== $user->id) {
                    Mail::to($target->email)->send(new TaskNotificationMail(
                        $task,
                        'reminded',
                        $target,
                        'Görev hatırlatması'
                    ));
                    Log::info('Reminder email sent to user: ' . $target->email);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send reminder emails: ' . $e->getMessage());
            // Email hatası hatırlatma işlemini engellemez
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
        $task->status = 'cancelled'; // 'rejected' yerine
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
                // completed veya cancelled için bir şey yapılmaz
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
}
