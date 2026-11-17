export interface UserProfile {
  id: string;
  uid?: string;
  username: string;
  email: string;
  name: string;
  role: 'Superuser' | 'Principal' | 'Academic Dean' | 'HOD' | 'Teacher' | 'Administrator';
  institutionName: string;
  schoolId?: string;
  isBlocked?: boolean;
  institutionLogo?: string;
  avatarUrl: string;
  department?: string;
  phoneNumber?: string;
  bio?: string;
  officeHours?: string;
  qualifications?: string;
  academicYear: string;
  themePreference: 'system' | 'light' | 'dark';
  createdAt: string;
  updatedAt?: string;
  lastLoginAt: string;
  savedTimetablesCount: number;
}

export interface School {
  id: string;
  name: string;
  code?: string;
  city?: string;
  academicYear?: string;
  adminEmail: string;
  adminName: string;
  adminRole?: 'Principal' | 'Administrator';
  adminStatus: 'active' | 'blocked';
  blockedReason?: string;
  blockedAt?: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SchoolAdmin {
  email: string;
  name: string;
  schoolId: string;
  schoolName: string;
  role: 'Principal' | 'Administrator';
  status: 'active' | 'blocked';
  blockedReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  specialization?: string;
}

export interface ClassSubject {
  subjectName: string;
  teacherId: string;
  periodsPerWeek: number;
  doublePeriods?: number;
}

export interface ClassEntry {
  id: string;
  name: string;
  room?: string;
  grade?: string;
  subjects: ClassSubject[];
}

export interface ScheduleEntry {
  type: 'period' | 'break' | 'md';
  label: string;
  duration: number; // in minutes
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  weeklyCount?: number;
  days?: number[]; // [0, 1, 2, 3, 4, 5] -> Mon..Sat
}

export interface RecessPreferences {
  before: string[];
  after: string[];
}

export type ConfigOptionTab = 'all' | 'teachers' | 'classes' | 'recess' | 'restrictions';

// Timetable mapping: [className][dayIndex (0-5)][periodIndex (0-N)] = subjectIndex (in class.subjects)
export type TimetableGrid = Record<string, Record<number, Record<number, number | null>>>;

export interface TimetableState {
  teachers: Teacher[];
  subjectNames: string[];
  classes: ClassEntry[];
  schedule: ScheduleEntry[];
  recessPrefs: RecessPreferences;
  notLastPeriod: string[];
  notFirstPeriod: string[];
  tt: TimetableGrid;
}

export interface SavedTimetable {
  id: string;
  name: string;
  userId: string;
  savedAt: string;
  updatedAt?: string;
  state: TimetableState;
  settings: {
    nperiods: number;
    stime: string;
  };
  notes?: string;
  tags?: string[];
}

export interface AutoSaveSession {
  id: string;
  userId: string;
  savedAt: string;
  source: 'localStorage' | 'firestore';
  state: TimetableState;
  settings: {
    nperiods: number;
    stime: string;
    activeClass?: string;
  };
  summary: {
    classCount: number;
    teacherCount: number;
    hasGeneratedGrid: boolean;
    institutionName?: string;
    conflictCount?: number;
  };
}

export interface ConflictEntry {
  cls: string;
  si: number;
  subjName: string;
  teacherId: string;
  teacherName: string;
  period?: number;
}

export interface TimetableConflict {
  type: 'slot-clash' | 'teacher-overload' | 'subject-overload';
  teacher: string;
  teacherId: string;
  day: number;
  dayName: string;
  period: number;
  slot: string;
  count?: number;
  max?: number;
  subjName?: string;
  clsName?: string;
  entries: ConflictEntry[];
}

export interface SwapSuggestion {
  id: string;
  clsName: string;
  sourceDay: number;
  sourceDayName: string;
  sourcePeriod: number;
  sourceSlotTime: string;
  sourceSubjectName: string;
  sourceTeacherId: string;
  sourceTeacherName: string;
  targetDay: number;
  targetDayName: string;
  targetPeriod: number;
  targetSlotTime: string;
  targetSubjectName: string;
  targetTeacherId: string;
  targetTeacherName: string;
  newConflictCount: number;
  conflictDelta: number; // e.g. -1 (1 fewer conflict)
  explanation: string;
  isZeroConflictResolved: boolean;
}

