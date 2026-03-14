import * as ExcelJS from 'exceljs';
import { getPerformanceGrade } from './performance.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportOverviewToExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const isMulti = data.periodMode && data.periodMode !== 'single';
  const items = Array.isArray(data.items) ? data.items : [];
  const sheetName = isMulti ? 'Çok Dönemli Özet' : 'Haftalık Özet';
  const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 2 }] });

  const headerRow = isMulti
    ? ['Kullanıcı', 'Lider', 'Rol', 'Ort. Hedef (dk)', 'Ort. Gerçekleşme (dk)', 'Ort. Skor (Onaylı)', 'Ort. Skor (Tümü)', 'Derece', 'Verili Hafta']
    : ['Kullanıcı', 'Lider', 'Hedef (dk)', 'Gerçekleşme (dk)', 'Plandışı (dk)', 'Planlı Skor', 'Plandışı Bonus', 'Final Skor', 'Onay Durumu', 'Toplam Süre'];

  const periodInfo = isMulti
    ? `Dönem: ${data.start_date || ''} - ${data.end_date || ''} (${data.weeks_count || 0} hafta)`
    : `Hafta: ${data.week_start || ''}`;

  worksheet.mergeCells('A1:' + String.fromCharCode(65 + headerRow.length - 1) + '1');
  worksheet.getCell('A1').value = periodInfo;
  worksheet.getCell('A1').font = { bold: true, size: 12 };
  worksheet.addRow(headerRow);
  const headerRowIdx = 2;
  worksheet.getRow(headerRowIdx).font = { bold: true };
  worksheet.getRow(headerRowIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  worksheet.getRow(headerRowIdx).font = { color: { argb: 'FFFFFFFF' } };

  items.forEach((item) => {
    const grade = getPerformanceGrade(Number(isMulti ? item.avg_final_score : item.final_score) || 0);
    const gradeApproved = isMulti && item.avg_final_score_approved != null ? getPerformanceGrade(Number(item.avg_final_score_approved)) : grade;
    const row = isMulti
      ? [
          item.name || '',
          item.leader_name || '-',
          item.role || '',
          Number(item.avg_target_minutes || 0),
          Number(item.avg_actual_minutes || 0),
          item.avg_final_score_approved != null ? Number(item.avg_final_score_approved).toFixed(1) : '-',
          Number(item.avg_final_score || 0).toFixed(1),
          item.grade || grade.grade,
          item.total_weeks_with_data || 0
        ]
      : [
          item.name || '',
          item.leader_name || '-',
          Number(item.total_target_minutes || 0),
          Number(item.total_actual_minutes || 0),
          Number(item.unplanned_minutes || 0),
          Number(item.planned_score || 0).toFixed(1),
          Number(item.unplanned_bonus || 0).toFixed(1),
          Number(item.final_score || 0).toFixed(1),
          (item.approval_status || 'pending') === 'approved' ? 'Onaylandı' : (item.approval_status || 'pending') === 'rejected' ? 'Reddedildi' : 'Bekliyor',
          Number((item.total_actual_minutes || 0) + (item.unplanned_minutes || 0))
        ];
    const rowObj = worksheet.addRow(row);
    if (isMulti) {
      rowObj.getCell(6).font = { color: { argb: 'FF' + (gradeApproved?.color || grade.color).replace('#', '') } };
      rowObj.getCell(7).font = { color: { argb: 'FF' + grade.color.replace('#', '') } };
    } else {
      rowObj.getCell(8).font = { color: { argb: 'FF' + grade.color.replace('#', '') } };
    }
  });

  worksheet.columns.forEach((col, i) => {
    col.width = Math.max(12, headerRow[i]?.length || 10);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = isMulti
    ? `haftalik-hedef-rapor-${data.start_date || ''}-${data.end_date || ''}.xlsx`
    : `haftalik-hedef-${data.week_start || 'liste'}.xlsx`;
  downloadBlob(blob, filename);
}

export async function exportUserDetailToExcel(userData) {
  const workbook = new ExcelJS.Workbook();
  const { user, summary, weeks = [] } = userData;

  const summarySheet = workbook.addWorksheet('Özet');
  summarySheet.addRow(['Performans Detay Raporu']);
  summarySheet.getCell('A1').font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Kullanıcı', user?.name || '']);
  summarySheet.addRow(['E-posta', user?.email || '']);
  summarySheet.addRow(['Rol', user?.role || '']);
  summarySheet.addRow(['Lider', user?.leader_name || '-']);
  summarySheet.addRow([]);
  summarySheet.addRow(['Ort. Skor (Onaylı)', summary?.avg_final_score_approved != null ? summary.avg_final_score_approved.toFixed(1) : '-']);
  summarySheet.addRow(['Onaylı Hafta Sayısı', summary?.weeks_approved ?? '-']);
  summarySheet.addRow(['Ort. Skor (Tümü)', (summary?.avg_final_score || 0).toFixed(1)]);
  summarySheet.addRow(['Derece', summary?.grade || '-']);
  summarySheet.addRow(['Toplam Hafta', summary?.total_weeks || 0]);
  summarySheet.columns = [{ width: 20 }, { width: 30 }];

  const detailSheet = workbook.addWorksheet('Haftalık Detaylar');
  detailSheet.addRow(['Hafta', 'Hedef (dk)', 'Gerçekleşme (dk)', 'Skor', 'Onay Durumu']);
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  detailSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

  weeks.forEach((week) => {
    detailSheet.addRow([
      week.week_start || '',
      Number(week.total_target_minutes || 0),
      Number(week.total_actual_minutes || 0),
      Number(week.final_score || 0).toFixed(1),
      (week.approval_status || 'pending') === 'approved' ? 'Onaylandı' : (week.approval_status || 'pending') === 'rejected' ? 'Reddedildi' : 'Bekliyor'
    ]);
  });
  detailSheet.columns = [{ width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 14 }];

  weeks.forEach((week, weekIdx) => {
    if (!Array.isArray(week.items) || week.items.length === 0) return;
    const safeName = (week.week_start || `Hafta${weekIdx + 1}`).replace(/[\/\\?*:]/g, '-');
    const sheet = workbook.addWorksheet(safeName.substring(0, 31), { headerFooter: { firstHeader: week.week_start } });
    sheet.addRow(['Görev', 'Hedef (dk)', 'Gerçekleşme (dk)', 'Tamamlandı', 'Plandışı']);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
    week.items.forEach((item) => {
      sheet.addRow([
        item.title || '(Başlıksız)',
        Number(item.target_minutes || 0),
        Number(item.actual_minutes || 0),
        item.is_completed ? 'Evet' : 'Hayır',
        item.is_unplanned ? 'Evet' : 'Hayır'
      ]);
    });
    sheet.columns = [{ width: 40 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 10 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = (user?.name || 'kullanici').replace(/[\/\\?*:]/g, '-');
  downloadBlob(blob, `performans-detay-${safeName}.xlsx`);
}
