import { Student } from '../types';

const dateOnly = (value: string) => new Date(`${value}T00:00:00`);

export const isStudentArchived = (student: Student, today = new Date().toISOString().split('T')[0]) => {
  if (student.archivedAt) return true;

  const category = student.studentCategory || 'membresia';
  if (category === 'temporal') return student.classesRemaining <= 0;
  if (student.repetirMensualmente) return false;

  const cutoff = dateOnly(today);
  cutoff.setMonth(cutoff.getMonth() - 1);
  const lastMembershipDate = student.expiryDate || student.membershipActivatedAt || student.createdAt;
  if (!lastMembershipDate) return false;

  return dateOnly(lastMembershipDate.split('T')[0]) < cutoff;
};
