export function buildTasksSignature(tasks) {
  try {
    return JSON.stringify((Array.isArray(tasks) ? tasks : []).map((task) => [
      task?.id,
      task?.updated_at ?? null,
      task?.status ?? null,
      task?.priority ?? null,
      task?.title ?? null,
      task?.responsible?.id ?? null,
      Array.isArray(task?.assigned_users) ? task.assigned_users.length : 0,
      Array.isArray(task?.attachments) ? task.attachments.length : 0,
      task?.start_date ?? null,
      task?.due_date ?? null,
    ]));
  } catch {
    return '';
  }
}

export function buildTaskSignatureOne(task) {
  if (!task) return '';
  try {
    return JSON.stringify([
      task.id,
      task.updated_at ?? null,
      task.status ?? null,
      task.priority ?? null,
      task.title ?? null,
      task.responsible?.id ?? null,
      Array.isArray(task.assigned_users) ? task.assigned_users.map((u) => u.id).join(',') : '',
      Array.isArray(task.attachments) ? task.attachments.length : 0,
      task.start_date ?? null,
      task.due_date ?? null,
    ]);
  } catch {
    return '';
  }
}
