/**
 * Takım lideri değiştiğinde atanan kullanıcıları günceller.
 * Önceki liderin ekibini kaldırır, yeni lider takım lideriyse ekibini ekler.
 *
 * @param {Array} users - Tüm kullanıcılar
 * @param {number|null} responsibleId - Yeni sorumlu kullanıcı ID
 * @param {Array<number>} currentAssignedIds - Mevcut atanan kullanıcı ID'leri
 * @param {Object} options - Opsiyonel parametreler
 * @param {number|null} options.previousResponsibleId - Önceki sorumlu (ekibini kaldırmak için)
 * @param {Set<number>} options.manuallyRemovedIds - Manuel kaldırılan kullanıcılar (tekrar eklenmez)
 * @returns {Array<number>} Güncellenmiş atanan kullanıcı ID'leri
 */
export function applyTeamLeaderAssignments(users, responsibleId, currentAssignedIds, options = {}) {
  const { previousResponsibleId = null, manuallyRemovedIds = new Set() } = options;

  let cleanedAssignedUsers = [...(currentAssignedIds || [])];

  // Önceki liderin kendisini ve ekibini kaldır
  if (previousResponsibleId && users) {
    cleanedAssignedUsers = cleanedAssignedUsers.filter(id => id !== previousResponsibleId);
    const prevResponsibleUser = users.find(u => u.id === previousResponsibleId);
    if (prevResponsibleUser && prevResponsibleUser.role === 'team_leader') {
      const prevTeamMembers = users.filter(u => u.leader_id === previousResponsibleId);
      const prevTeamMemberIds = prevTeamMembers.map(m => m.id);
      cleanedAssignedUsers = cleanedAssignedUsers.filter(id => !prevTeamMemberIds.includes(id));
    }
  }

  // Yeni sorumluyu atananlardan kaldır (sorumlu aynı zamanda atanan olamaz)
  if (responsibleId) {
    cleanedAssignedUsers = cleanedAssignedUsers.filter(id => id !== responsibleId);
  }

  // Yeni lider takım lideriyse, ekibini ekle
  if (responsibleId && users) {
    const responsibleUser = users.find(u => u.id === responsibleId);
    if (responsibleUser && responsibleUser.role === 'team_leader') {
      const teamMembers = users.filter(u =>
        u.leader_id === responsibleId && u.id !== responsibleId
      );
      const teamMemberIds = teamMembers.map(m => m.id);
      const filteredTeamMemberIds = teamMemberIds.filter(id => !manuallyRemovedIds.has(id));
      cleanedAssignedUsers = [...new Set([...cleanedAssignedUsers, ...filteredTeamMemberIds])];
    }
  }

  return cleanedAssignedUsers;
}
