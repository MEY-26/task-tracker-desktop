<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskHistory;
use App\Notifications\TaskUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\TaskAttachment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\TaskNotificationMail;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;


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
            'no' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,critical',
            'status' => 'required|string|max:50',
            'task_type' => 'required|string|max:50',
            'task_type_color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'status_color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            // Allow images, office docs, archives and CAD-related extensions; max ~1GB per file (by extension)
            'attachments.*' => [
                Rule::file()->max(1048576), // in KB
                'extensions:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar,7z,sldprt,sldasm,slddrw,step,stp,iges,igs,x_t,x_b,stl,3mf,dwg,dxf,eprt,easm,edrw',
            ],
            'responsible_id' => 'required|exists:users,id',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        // Custom validation for task_type and status - accept both string values and IDs
        $taskType = $request->input('task_type');
        $validSystemTypes = ['development']; // System types as strings
        $customTaskTypes = \App\Models\TaskType::where('is_system', false)->pluck('id')->toArray();
        $allValidTypes = array_merge($validSystemTypes, $customTaskTypes);

        Log::info('Task creation - task_type validation', [
            'task_type' => $taskType,
            'task_type_type' => gettype($taskType),
            'valid_system_types' => $validSystemTypes,
            'custom_task_types' => $customTaskTypes,
            'all_valid_types' => $allValidTypes
        ]);

        // Type coercion için hem string hem integer kontrolü yap
        $isValidType = in_array($taskType, $allValidTypes) ||
            in_array((string)$taskType, $allValidTypes) ||
            in_array((int)$taskType, $allValidTypes);

        if (!$isValidType) {
            Log::warning('Invalid task_type validation failed', [
                'task_type' => $taskType,
                'task_type_type' => gettype($taskType),
                'valid_types' => $allValidTypes
            ]);

            return response()->json([
                'message' => 'Geçersiz görev türü.',
                'errors' => ['task_type' => ['Seçilen görev türü geçerli değil.']]
            ], 422);
        }

        $status = $request->input('status');
        $validSystemStatuses = ['waiting', 'completed', 'cancelled'];
        $customStatuses = \App\Models\TaskStatus::pluck('id')->toArray();
        $allValidStatuses = array_merge($validSystemStatuses, $customStatuses);

        // Type coercion için hem string hem integer kontrolü yap
        $isValidStatus = in_array($status, $allValidStatuses) ||
            in_array((string)$status, $allValidStatuses) ||
            in_array((int)$status, $allValidStatuses);

        if (!$isValidStatus) {
            return response()->json([
                'message' => 'Geçersiz görev durumu.',
                'errors' => ['status' => ['Seçilen görev durumu geçerli değil.']]
            ], 422);
        }

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

        // Task type text ve color bilgilerini al
        $taskTypeText = 'Geliştirme'; // Default
        $taskTypeColor = '#f59e0b'; // Default

        if ($taskType === 'development') {
            $taskTypeText = 'Geliştirme';
            $taskTypeColor = '#f59e0b';
        } else {
            // Custom task type için veritabanından bilgileri al
            $customTaskType = \App\Models\TaskType::find($taskType);
            if ($customTaskType) {
                $taskTypeText = $customTaskType->name;
                $taskTypeColor = $customTaskType->color;
            }
        }

        // Status text ve color bilgilerini al
        $statusText = 'Bekliyor'; // Default
        $statusColor = '#6b7280'; // Default

        if ($status === 'waiting') {
            $statusText = 'Bekliyor';
            $statusColor = '#6b7280';
        } elseif ($status === 'completed') {
            $statusText = 'Tamamlandı';
            $statusColor = '#10b981';
        } elseif ($status === 'cancelled') {
            $statusText = 'İptal';
            $statusColor = '#ef4444';
        } else {
            // Custom status için veritabanından bilgileri al
            $customStatus = \App\Models\TaskStatus::find($status);
            if ($customStatus) {
                $statusText = $customStatus->name;
                $statusColor = $customStatus->color;
            }
        }

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => $validated['status'] ?? 'waiting',
            'task_type' => $request->task_type,
            'task_type_text' => $taskTypeText,
            'task_type_color' => $taskTypeColor,
            'status_text' => $statusText,
            'status_color' => $statusColor,
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
            'task' => $task->load(['assignedUsers', 'attachments', 'creator', 'responsible']),
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
                'task' => $task->load(['assignedUsers', 'attachments', 'creator', 'responsible']),
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
            'task' => $task->load(['assignedUsers', 'attachments', 'creator', 'responsible']),
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

        // Check if this is just a file upload request
        $isFileUploadOnly = $request->hasFile('attachments') && !$request->hasAny(['title', 'description', 'priority', 'status', 'task_type', 'task_type_color', 'status_color', 'responsible_id', 'start_date', 'due_date', 'assigned_users', 'no']);
        
        if ($user->role !== 'admin' && $user->id !== $task->created_by && $user->id !== $task->responsible_id) {
            // If it's just a file upload, allow assigned users to upload
            if (!$isFileUploadOnly || !$task->assignedUsers->contains('id', $user->id)) {
                return response()->json(['message' => 'Bu görevi güncelleme yetkiniz yok.'], 403);
            }
        }

        $validated = $request->validate([
            'no' => 'nullable|string|max:255',
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'priority' => 'in:low,medium,high,critical',
            'status' => 'string|max:50',
            'task_type' => 'string|max:50',
            'task_type_color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'status_color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            // Allow images, office docs, archives and CAD-related extensions; max ~1GB per file (by extension)
            'attachments.*' => [
                Rule::file()->max(1048576), // in KB
                'extensions:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar,7z,sldprt,sldasm,slddrw,step,stp,iges,igs,x_t,x_b,stl,3mf,dwg,dxf,eprt,easm,edrw',
            ],
            'responsible_id' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'assigned_users' => 'array|nullable',
            'assigned_users.*' => 'nullable|exists:users,id',
        ]);

        // Custom validation for task_type and status - accept both string values and IDs
        if ($request->has('task_type')) {
            $taskType = $request->input('task_type');
            // Check if it's a valid task type (either system string or custom ID)
            $validSystemTypes = ['development']; // System types as strings
            $customTaskTypes = \App\Models\TaskType::where('is_system', false)->pluck('id')->toArray();
            $allValidTypes = array_merge($validSystemTypes, $customTaskTypes);

            // Type coercion için hem string hem integer kontrolü yap
            $isValid = in_array($taskType, $allValidTypes) ||
                in_array((string)$taskType, $allValidTypes) ||
                in_array((int)$taskType, $allValidTypes);

            if (!$isValid) {
                return response()->json([
                    'message' => 'Geçersiz görev türü.',
                    'errors' => ['task_type' => ['Seçilen görev türü geçerli değil.']]
                ], 422);
            }
        }

        if ($request->has('status')) {
            $status = $request->input('status');
            // Check if it's a valid status (either system string or custom ID)
            $validSystemStatuses = ['waiting', 'completed', 'cancelled'];
            $customStatuses = \App\Models\TaskStatus::pluck('id')->toArray();
            $allValidStatuses = array_merge($validSystemStatuses, $customStatuses);

            // Convert all to strings for comparison
            $allValidStatusesAsStrings = array_map('strval', $allValidStatuses);
            $statusAsString = (string)$status;

            $isValid = in_array($statusAsString, $allValidStatusesAsStrings);

            if (!$isValid) {
                Log::warning('Invalid status validation failed', [
                    'status' => $status,
                    'status_type' => gettype($status),
                    'valid_statuses' => $allValidStatuses,
                    'valid_statuses_as_strings' => $allValidStatusesAsStrings
                ]);

                return response()->json([
                    'message' => 'Geçersiz görev durumu.',
                    'errors' => ['status' => ['Seçilen görev durumu geçerli değil.']]
                ], 422);
            }
        }
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
        // Takım lideri kontrolü - ancak sorumlu ise tüm alanları değiştirebilir
        if ($user->role === 'team_leader' && $user->id !== $task->responsible_id) {
            $allowedFields = ['due_date', 'status', 'comment', 'attachments'];
            $requestFields = array_keys($request->all());

            foreach ($requestFields as $field) {
                if (!in_array($field, $allowedFields) && $field !== '_method') {
                    return response()->json([
                        'message' => 'Takım liderleri sadece bitiş tarihi, durum, yorum ve dosya ekleyebilir/değiştirebilir.'
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

        // Update task_type_color and status_color if task_type or status changed
        if ($request->has('task_type')) {
            $taskType = $request->input('task_type');
            if ($taskType === 'development') {
                $task->task_type_color = '#f59e0b'; // Development color
                $task->task_type_text = 'Geliştirme';
            } else {
                // Get color and text from TaskType model
                $taskTypeModel = \App\Models\TaskType::find($taskType);
                if ($taskTypeModel) {
                    $task->task_type_color = $taskTypeModel->color;
                    $task->task_type_text = $taskTypeModel->name;
                }
            }
        }

        if ($request->has('status')) {
            $status = $request->input('status');
            if (in_array($status, ['waiting', 'completed', 'cancelled'])) {
                // System status colors and text
                $systemStatuses = [
                    'waiting' => ['color' => '#6b7280', 'text' => 'Bekliyor'],
                    'completed' => ['color' => '#10b981', 'text' => 'Tamamlandı'],
                    'cancelled' => ['color' => '#ef4444', 'text' => 'İptal']
                ];
                $task->status_color = $systemStatuses[$status]['color'];
                $task->status_text = $systemStatuses[$status]['text'];
            } else {
                // Get color and text from TaskStatus model
                $taskStatusModel = \App\Models\TaskStatus::find($status);
                if ($taskStatusModel) {
                    $task->status_color = $taskStatusModel->color;
                    $task->status_text = $taskStatusModel->name;
                }
            }
        }

        // Save the task with updated colors
        $task->save();

        // Flexible status handling for custom statuses
        $statusLower = strtolower($request->status ?? '');
        if ((str_contains($statusLower, 'progress') || str_contains($statusLower, 'investigating') || str_contains($statusLower, 'devam')) && !$task->start_date) {
            $task->start_date = now();
        }

        if ((str_contains($statusLower, 'completed') || str_contains($statusLower, 'cancelled') || str_contains($statusLower, 'tamamlan') || str_contains($statusLower, 'iptal')) && !$task->end_date) {
            $task->end_date = now();
        }

        // Görev iptal edildiğinde bildirimleri temizle
        if (str_contains($statusLower, 'cancelled') || str_contains($statusLower, 'iptal')) {
            try {
                DB::table('notifications')
                    ->whereRaw("JSON_EXTRACT(data, '$.task_id') = ?", [$task->id])
                    ->delete();
                Log::info('Deleted notifications for cancelled task ID: ' . $task->id);
            } catch (\Exception $e) {
                Log::error('Failed to delete cancelled task notifications: ' . $e->getMessage());
            }
        }

        $task->save();
        $after = $task->fresh()->toArray();

        // Collect human-readable change summaries
        $changeSummaries = [];
        $statusMap = [
            'waiting' => 'Bekliyor',
            'completed' => 'Tamamlandı',
            'cancelled' => 'İptal'
        ];

        // Custom durumları ekle
        $customStatuses = \App\Models\TaskStatus::all();
        foreach ($customStatuses as $status) {
            $statusMap[$status->id] = $status->name;
        }
        $priorityMap = [
            'low' => 'Düşük',
            'medium' => 'Orta',
            'high' => 'Yüksek',
            'critical' => 'Kritik'
        ];
        $typeMap = [
            'development' => 'Geliştirme'
        ];

        // Custom türleri ekle
        $customTypes = \App\Models\TaskType::all();
        foreach ($customTypes as $type) {
            $typeMap[$type->id] = $type->name;
        }

        $formatDate = function ($v) {
            if (!$v) return '-';
            try {
                return \Carbon\Carbon::parse($v)->format('Y-m-d');
            } catch (\Throwable $e) {
                return (string)$v;
            }
        };

        foreach ($validated as $key => $newValue) {
            if (in_array($key, ['attachments', 'assigned_users'])) continue;
            $oldValue = $before[$key] ?? null;
            if ($oldValue == $newValue) continue;

            switch ($key) {
                case 'title':
                    $changeSummaries[] = 'Başlık güncellendi';
                    break;
                case 'description':
                    $changeSummaries[] = 'Açıklama güncellendi';
                    break;
                case 'priority':
                    $changeSummaries[] = 'Öncelik: ' . ($priorityMap[$oldValue] ?? $oldValue ?? '-') . ' → ' . ($priorityMap[$newValue] ?? $newValue ?? '-');
                    break;
                case 'status':
                    $changeSummaries[] = 'Durum: ' . ($statusMap[$oldValue] ?? $oldValue ?? '-') . ' → ' . ($statusMap[$newValue] ?? $newValue ?? '-');
                    break;
                case 'task_type':
                    $changeSummaries[] = 'Tür: ' . ($typeMap[$oldValue] ?? $oldValue ?? '-') . ' → ' . ($typeMap[$newValue] ?? $newValue ?? '-');
                    break;
                case 'responsible_id':
                    $oldUser = $before['responsible_id'] ? \App\Models\User::find($before['responsible_id']) : null;
                    $newUser = $after['responsible_id'] ? \App\Models\User::find($after['responsible_id']) : null;
                    $changeSummaries[] = 'Sorumlu: ' . ($oldUser->name ?? '-') . ' → ' . ($newUser->name ?? '-');
                    break;
                case 'start_date':
                    $changeSummaries[] = 'Başlangıç: ' . $formatDate($oldValue) . ' → ' . $formatDate($newValue);
                    break;
                case 'due_date':
                    $changeSummaries[] = 'Bitiş: ' . $formatDate($oldValue) . ' → ' . $formatDate($newValue);
                    break;
                default:
                    // generic fallback
                    $changeSummaries[] = ucfirst(str_replace('_', ' ', $key)) . ' güncellendi';
            }
        }


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
                'new_value'  => json_encode(array_map(fn($f) => $f['original_name'], $uploadedFiles)),
            ]);
            $addedNames = array_map(fn($f) => $f['original_name'], $uploadedFiles);
            if (!empty($addedNames)) {
                $changeSummaries[] = 'Ekler: +' . implode(', +', array_slice($addedNames, 0, 3)) . (count($addedNames) > 3 ? '…' : '');
            }
        }


        if ($request->has('assigned_users')) {
            $oldUsers = $task->assignedUsers->pluck('id')->sort()->values()->all();
            $newUsers = collect(array_unique($request->assigned_users))->sort()->values()->all();

            if ($oldUsers != $newUsers) {
                // Store names instead of IDs for better readability on UI
                $oldUserNames = $task->assignedUsers->pluck('name')->sort()->values()->all();
                $newUserNames = \App\Models\User::whereIn('id', $newUsers)->pluck('name')->sort()->values()->all();

                TaskHistory::create([
                    'task_id'    => $task->id,
                    'user_id'    => $user->id,
                    'field'      => 'assigned_users',
                    'old_value'  => json_encode($oldUserNames),
                    'new_value'  => json_encode($newUserNames),
                ]);
            }

            $task->assignedUsers()->sync($newUsers);
            $newlyAssigned = array_diff($newUsers, $oldUsers);
            $removed = array_diff($oldUsers, $newUsers);
            $addedNames = [];
            $removedNames = [];
            foreach ($newlyAssigned as $userId) {
                $assignedUser = User::find($userId);
                if ($assignedUser && $assignedUser->id !== $user->id) {
                    try {
                        $assignedMessage = 'Size yeni bir görev atandı: "' . $task->title . '"';
                        $assignedUser->notify(new TaskUpdated($task, $assignedMessage));
                        $addedNames[] = $assignedUser->name;
                    } catch (\Exception $e) {
                        Log::error('Failed to send notification to newly assigned user: ' . $e->getMessage());
                    }
                }
            }
            foreach ($removed as $userId) {
                $u = User::find($userId);
                if ($u) $removedNames[] = $u->name;
            }
            if (!empty($addedNames) || !empty($removedNames)) {
                $parts = [];
                if (!empty($addedNames)) $parts[] = '+' . implode(', +', array_slice($addedNames, 0, 3)) . (count($addedNames) > 3 ? '…' : '');
                if (!empty($removedNames)) $parts[] = '-' . implode(', -', array_slice($removedNames, 0, 3)) . (count($removedNames) > 3 ? '…' : '');
                $changeSummaries[] = 'Atananlar: ' . implode(' ', $parts);
            }
        }
        $summary = empty($changeSummaries) ? 'güncellendi' : ('güncellendi: ' . implode('; ', $changeSummaries));
        $message = 'Görev "' . $task->title . '" ' . $summary;
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
        } catch (\Throwable $e) {
            Log::error('Failed to send email notifications for task update: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Görev güncellendi.',
            'task' => $task->load(['assignedUsers', 'attachments', 'creator', 'responsible'])
        ]);
    }

    public function destroy(Request $request, Task $task)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Kullanıcı doğrulanamadı.'], 401);
        }

        // İptal edilen görevler: Admin yetkisi olan kullanıcılar silebilir
        $statusLower = strtolower($task->status);
        if (str_contains($statusLower, 'cancelled') || str_contains($statusLower, 'iptal')) {
            if (!$user->isAdmin() && $user->role !== 'team_leader') {
                return response()->json(['message' => 'İptal edilen görevleri sadece admin yetkisi olan kullanıcılar silebilir.'], 403);
            }
        }
        // Tamamlanan görevler: Sadece admin silebilir
        elseif (str_contains($statusLower, 'completed') || str_contains($statusLower, 'tamamlan')) {
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

        // Görevle ilgili tüm bildirimleri temizle
        try {
            DB::table('notifications')
                ->whereRaw("JSON_EXTRACT(data, '$.task_id') = ?", [$task->id])
                ->delete();
            Log::info('Deleted notifications for task ID: ' . $task->id);
        } catch (\Exception $e) {
            Log::error('Failed to delete task notifications: ' . $e->getMessage());
        }

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
            $user->role !== 'team_leader' &&
            $user->id !== $task->responsible_id
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

    public function downloadAttachment(TaskAttachment $attachment, $token)
    {
        // Kalıcı token kontrolü - dosya ve görev silinmediği sürece geçerli
        $expectedToken = md5($attachment->id . $attachment->created_at . config('app.key'));
        if ($token !== $expectedToken) {
            abort(403, 'Geçersiz veya süresi dolmuş dosya linki');
        }

        // Dosyanın fiziksel varlığını kontrol et
        if (!Storage::disk('public')->exists($attachment->path)) {
            abort(404, 'Dosya sunucuda bulunamadı');
        }

        $filePath = Storage::disk('public')->path($attachment->path);
        $originalName = $attachment->original_name;

        // Dosyayı güvenli şekilde indir
        return response()->file($filePath, [
            'Content-Disposition' => 'attachment; filename="' . addslashes($originalName) . '"',
            'Content-Type' => Storage::mimeType($attachment->path) ?: 'application/octet-stream',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    // DEBUG: Test attachment URLs
    public function debugAttachment($id)
    {
        $attachment = TaskAttachment::find($id);
        if (!$attachment) {
            return response()->json(['error' => 'Attachment not found'], 404);
        }
        
        return response()->json([
            'id' => $attachment->id,
            'original_name' => $attachment->original_name,
            'path' => $attachment->path,
            'url' => $attachment->url,
            'download_url' => $attachment->download_url,
            'created_at' => $attachment->created_at,
            'full_attributes' => $attachment->toArray(),
        ]);
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
        } catch (\Throwable $e) {
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

        // Only toggle for standard statuses, custom statuses should be changed manually
        switch ($task->status) {
            case 'waiting':
                $task->status = 'in_progress';
                break;
            case 'in_progress':
                $task->status = 'investigating';
                break;
            case 'investigating':
                $task->status = 'completed';
                break;
            default:
                // For custom statuses, don't auto-toggle
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
        $statusLower = strtolower($task->status);
        if (str_contains($statusLower, 'cancelled') || str_contains($statusLower, 'iptal')) {
            if ($user->isAdmin() || $user->role === 'team_leader') {
                $canDelete = true;
            } else {
                $reason = 'İptal edilen görevleri sadece admin yetkisi olan kullanıcılar silebilir.';
            }
        }
        // Tamamlanan görevler: Sadece admin silebilir
        elseif (str_contains($statusLower, 'completed') || str_contains($statusLower, 'tamamlan')) {
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

    /**
     * Record a task view by responsible/assigned users only.
     */
    public function viewTask(Request $request, Task $task)
    {
        $user = $request->user();
        $task->load('assignedUsers');

        $isAllowed = ($task->responsible_id === $user->id) || $task->assignedUsers->contains('id', $user->id);
        if (!$isAllowed) {
            // Do not track views for non-responsible/non-assigned users
            return response()->json(['message' => 'View not tracked for this user'], 200);
        }

        DB::table('task_last_views')->updateOrInsert(
            [
                'task_id' => $task->id,
                'user_id' => $user->id,
            ],
            [
                'last_viewed_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['message' => 'View recorded']);
    }

    /**
     * Get last views for responsible and assigned users.
     */
    public function lastViews(Request $request, Task $task)
    {
        $task->load(['assignedUsers', 'responsible']);
        $users = collect();
        if ($task->responsible) $users->push($task->responsible);
        foreach ($task->assignedUsers as $u) $users->push($u);
        $users = $users->unique('id')->values();

        $rows = DB::table('task_last_views')
            ->where('task_id', $task->id)
            ->whereIn('user_id', $users->pluck('id'))
            ->get()
            ->keyBy('user_id');

        $views = $users->map(function ($u) use ($task, $rows) {
            $row = $rows->get($u->id);
            $tz = 'Europe/Istanbul';
            $lastViewed = null;
            if ($row && $row->last_viewed_at) {
                try {
                    $lastViewed = \Carbon\Carbon::parse($row->last_viewed_at)->timezone($tz)->toIso8601String();
                } catch (\Throwable $e) {
                    $lastViewed = (string) $row->last_viewed_at;
                }
            }
            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_responsible' => $task->responsible_id === $u->id,
                'last_viewed_at' => $lastViewed,
            ];
        });

        return response()->json(['views' => $views->values()]);
    }
}
