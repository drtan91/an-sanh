import { seedEmployeesFromInitialData, fetchEmployeesFromSupabase } from '../src/services/employeeService';

async function main() {
  console.log('--- Bắt đầu Seed Nhân Viên từ initialData vào Supabase ---');
  const result = await seedEmployeesFromInitialData();
  console.log('Kết quả Seed:', result);

  const { data: emps, error } = await fetchEmployeesFromSupabase();
  if (error) {
    console.error('Lỗi sau khi tải lại danh sách:', error);
  } else {
    console.log(`Hiện có ${emps.length} nhân viên trong bảng employees trên Supabase:`);
    emps.forEach((e, idx) => {
      console.log(`  ${idx + 1}. [${e.active ? 'Đang làm' : 'Nghỉ'}] ${e.fullName} - ${e.position} (${e.department}) - Zalo: ${e.zaloPhone}`);
    });
  }
}

main();
