import { Teacher, ClassEntry, ScheduleEntry, RecessPreferences, TimetableGrid, TimetableConflict, ConflictEntry, SwapSuggestion } from '../types';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DOT_COLORS = [
  '#3b5bdb', '#e64980', '#0ca678', '#e67700',
  '#7950f2', '#c92a2a', '#0c8599', '#2f9e44', '#e8590c'
];

export const CC_CLASSES = [
  'cc0', 'cc1', 'cc2', 'cc3', 'cc4', 'cc5', 'cc6', 'cc7', 'cc8'
];

export function isMDSubject(subjectName?: string): boolean {
  if (!subjectName) return false;
  const n = subjectName.trim().toUpperCase();
  return n === 'MD' || n.startsWith('MD ') || n.endsWith(' MD') || n === 'M.D.' || n.includes('MASS DRILL') || n.includes('MORAL DEV');
}

export function getTeacherName(teachers: Teacher[], tid?: string): string {
  if (!tid) return '—';
  const found = teachers.find(t => t.id === tid);
  return found?.name || tid;
}

export function getBreakInfo(schedule?: ScheduleEntry[]): { afterPeriod: number } {
  if (schedule && schedule.length > 0) {
    let periodIdx = 0;
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i].type === 'period') periodIdx++;
      else if (schedule[i].type === 'break') return { afterPeriod: periodIdx };
    }
  }
  return { afterPeriod: 4 }; // Recess is always strictly after 4 periods
}

export function getMDPeriods(schedule: ScheduleEntry[]): Array<{
  afterPeriod: number;
  entry: ScheduleEntry;
  days: number[];
  weeklyCount: number;
}> {
  const mdPeriods: Array<{
    afterPeriod: number;
    entry: ScheduleEntry;
    days: number[];
    weeklyCount: number;
  }> = [];
  let periodIdx = 0;
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].type === 'period') periodIdx++;
    else if (schedule[i].type === 'md') {
      const e = schedule[i];
      mdPeriods.push({
        afterPeriod: periodIdx,
        entry: e,
        days: e.days || [2],
        weeklyCount: e.weeklyCount || 1,
      });
    }
  }
  return mdPeriods;
}

export function generateTimetable(
  classes: ClassEntry[],
  teachers: Teacher[],
  schedule: ScheduleEntry[],
  recessPrefs: RecessPreferences,
  notFirstPeriod: string[],
  notLastPeriod: string[],
  nperiods: number = 8
): { tt: TimetableGrid; conflicts: TimetableConflict[] } {
  const validClasses = classes.filter(c => c.name.trim() && c.subjects.length);
  const totalSlots = nperiods * 6; // 6 days * n periods
  const { afterPeriod: bafter } = getBreakInfo(schedule);
  const periodBeforeRecess = bafter > 0 ? bafter - 1 : -1;
  const periodAfterRecess = bafter > 0 ? bafter : -1;

  const tt: TimetableGrid = {};
  const slotTeachers: Record<string, Set<string>> = {};
  const key = (d: number, p: number) => `${d}-${p}`;

  validClasses.forEach(cls => {
    const subjs = cls.subjects.filter(s => s.subjectName.trim());
    if (!subjs.length) return;
    tt[cls.name] = {};

    // Ensure min 1
    subjs.forEach(s => {
      if (!s.periodsPerWeek || s.periodsPerWeek < 1) s.periodsPerWeek = 1;
    });

    const totalRequested = subjs.reduce((acc, x) => acc + (x.periodsPerWeek || 1), 0);

    // Target counts per subject (strict integer fitting)
    const targets = subjs.map(s => s.periodsPerWeek || 1);
    if (totalRequested > totalSlots) {
      const ratio = totalSlots / totalRequested;
      const scaled = targets.map(t => Math.max(1, Math.floor(t * ratio)));
      let used = scaled.reduce((a, b) => a + b, 0);
      const fracs = targets
        .map((t, i) => ({ i, frac: t * ratio - Math.floor(t * ratio) }))
        .sort((a, b) => b.frac - a.frac);
      let fi = 0;
      while (used < totalSlots && fi < fracs.length) {
        scaled[fracs[fi++].i]++;
        used++;
      }
      targets.splice(0, targets.length, ...scaled);
    }

    // Double slots per subject
    const dpPerSubj = subjs.map((s, i) => Math.min(s.doublePeriods || 0, Math.floor(targets[i] / 2)));
    const singlesPerSubj = subjs.map((s, i) => Math.max(0, targets[i] - dpPerSubj[i] * 2));
    const totalDoubleSlots = dpPerSubj.reduce((a, b) => a + b * 2, 0);
    const singleSlots = totalSlots - totalDoubleSlots;

    // Build singles pool with exact quota
    const pool: number[] = [];
    subjs.forEach((_, i) => {
      for (let c = 0; c < singlesPerSubj[i]; c++) pool.push(i);
    });

    while (pool.length < singleSlots) {
      const counts: Record<number, number> = {};
      pool.forEach(i => (counts[i] = (counts[i] || 0) + 1));
      const deficit = subjs.map((_, i) => singlesPerSubj[i] - (counts[i] || 0));
      const needsMost = deficit.indexOf(Math.max(...deficit));
      pool.push(needsMost >= 0 ? needsMost : 0);
    }
    while (pool.length > singleSlots) pool.pop();
    if (pool.length === 0) {
      for (let i = 0; i < singleSlots; i++) pool.push(i % subjs.length);
    }

    // Doubles queue
    const doublesNeeded: number[] = [];
    subjs.forEach((_, si) => {
      for (let d = 0; d < dpPerSubj[si]; d++) doublesNeeded.push(si);
    });

    const beforePrefIdxs = subjs.map((_, i) => i).filter(i => recessPrefs.before.includes(subjs[i].subjectName));
    const afterPrefIdxs = subjs.map((_, i) => i).filter(i => recessPrefs.after.includes(subjs[i].subjectName));

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Pre-assign double periods
    const doublesScheduled: Record<string, number> = {};
    const doubleQueue = [...doublesNeeded];
    let dayIdx = 0;

    while (doubleQueue.length > 0) {
      const si = doubleQueue.shift()!;
      const usedDays = new Set(
        Object.keys(doublesScheduled)
          .filter(k => doublesScheduled[k] === si)
          .map(k => parseInt(k.split('-')[0]))
      );
      let placed = false;
      for (let tries = 0; tries < DAYS.length * 3 && !placed; tries++) {
        const di = (dayIdx + tries) % DAYS.length;
        if (usedDays.has(di)) continue;
        for (let p = 0; p < nperiods - 1 && !placed; p++) {
          if (p === periodBeforeRecess || p + 1 === periodAfterRecess) continue;
          if (p === nperiods - 2 || p === nperiods - 1) continue;
          if (doublesScheduled[`${di}-${p}`] !== undefined || doublesScheduled[`${di}-${p + 1}`] !== undefined) continue;
          const tid = subjs[si]?.teacherId;
          const b1 = slotTeachers[key(di, p)] || new Set<string>();
          const b2 = slotTeachers[key(di, p + 1)] || new Set<string>();
          if (tid && (b1.has(tid) || b2.has(tid))) continue;

          doublesScheduled[`${di}-${p}`] = si;
          doublesScheduled[`${di}-${p + 1}`] = si;
          if (!slotTeachers[key(di, p)]) slotTeachers[key(di, p)] = new Set();
          if (!slotTeachers[key(di, p + 1)]) slotTeachers[key(di, p + 1)] = new Set();
          if (tid) {
            slotTeachers[key(di, p)].add(tid);
            slotTeachers[key(di, p + 1)].add(tid);
          }
          placed = true;
          dayIdx = (di + 1) % DAYS.length;
        }
      }
    }

    // Assign singles with constraint checking
    let poolIdx = 0;
    DAYS.forEach((_, di) => {
      tt[cls.name][di] = {};
      const subjectDayCount: Record<number, number> = {};
      for (let p = 0; p < nperiods; p++) {
        const pre = doublesScheduled[`${di}-${p}`];
        if (pre !== undefined) subjectDayCount[pre] = (subjectDayCount[pre] || 0) + 1;
      }

      for (let p = 0; p < nperiods; p++) {
        if (doublesScheduled[`${di}-${p}`] !== undefined) {
          tt[cls.name][di][p] = doublesScheduled[`${di}-${p}`];
          continue;
        }

        const slotBusy = slotTeachers[key(di, p)] || new Set<string>();
        const teacherDayCount: Record<string, number> = {};
        for (let pp = 0; pp < nperiods; pp++) {
          (slotTeachers[key(di, pp)] || new Set<string>()).forEach(tid => {
            teacherDayCount[tid] = (teacherDayCount[tid] || 0) + 1;
          });
        }
        const isLastPeriod = p === nperiods - 1;
        const isFirstPeriod = p === 0;
        const prefIdxs =
          p === periodBeforeRecess && beforePrefIdxs.length
            ? beforePrefIdxs
            : p === periodAfterRecess && afterPrefIdxs.length
            ? afterPrefIdxs
            : [];

        const isValid = (si: number) => {
          const s = subjs[si];
          if (!s) return false;
          const tid = s.teacherId;
          if (tid && slotBusy.has(tid)) return false;
          if ((subjectDayCount[si] || 0) >= 2) return false;
          if (tid && (teacherDayCount[tid] || 0) >= 7) return false;
          if (isLastPeriod && notLastPeriod.includes(s.subjectName)) return false;
          if (isFirstPeriod && notFirstPeriod.includes(s.subjectName)) return false;
          return true;
        };

        const isValidR = (si: number) => {
          const s = subjs[si];
          if (!s) return false;
          const tid = s.teacherId;
          if (tid && slotBusy.has(tid)) return false;
          if ((subjectDayCount[si] || 0) >= 2) return false;
          if (isLastPeriod && notLastPeriod.includes(s.subjectName)) return false;
          if (isFirstPeriod && notFirstPeriod.includes(s.subjectName)) return false;
          return true;
        };

        const isValidMin = (si: number) => {
          const s = subjs[si];
          if (!s) return false;
          const tid = s.teacherId;
          if (tid && slotBusy.has(tid)) return false;
          return true;
        };

        let chosen: number | undefined;
        if (prefIdxs.length) {
          chosen = prefIdxs.find(isValid) ?? prefIdxs.find(isValidR) ?? prefIdxs.find(isValidMin) ?? prefIdxs[0];
        } else {
          let found = false;
          const start = poolIdx % pool.length;
          for (let a = 0; a < pool.length && !found; a++) {
            const c = pool[(start + a) % pool.length];
            if (isValid(c)) {
              chosen = c;
              poolIdx = (start + a + 1) % pool.length;
              found = true;
            }
          }
          if (!found) {
            for (let a = 0; a < pool.length && !found; a++) {
              const c = pool[(start + a) % pool.length];
              if (isValidR(c)) {
                chosen = c;
                poolIdx = (start + a + 1) % pool.length;
                found = true;
              }
            }
          }
          if (!found) {
            for (let a = 0; a < pool.length && !found; a++) {
              const c = pool[(start + a) % pool.length];
              if (isValidMin(c)) {
                chosen = c;
                poolIdx = (start + a + 1) % pool.length;
                found = true;
              }
            }
          }
          if (!found) {
            chosen = pool[poolIdx % pool.length];
            poolIdx = (poolIdx + 1) % pool.length;
          }
        }

        tt[cls.name][di][p] = chosen ?? 0;
        subjectDayCount[chosen ?? 0] = (subjectDayCount[chosen ?? 0] || 0) + 1;
        if (!slotTeachers[key(di, p)]) slotTeachers[key(di, p)] = new Set();
        const tid = subjs[chosen ?? 0]?.teacherId;
        if (tid) slotTeachers[key(di, p)].add(tid);
      }
    });

    // Correction pass for strict count consistency
    for (let pass = 0; pass < 5; pass++) {
      const actual: Record<number, number> = {};
      DAYS.forEach((_, di) => {
        for (let p = 0; p < nperiods; p++) {
          const si = tt[cls.name][di]?.[p];
          if (si !== undefined && si !== null) actual[si] = (actual[si] || 0) + 1;
        }
      });
      const over = subjs.map((_, i) => (actual[i] || 0) - targets[i]).filter(d => d > 0).length;
      const under = subjs.map((_, i) => targets[i] - (actual[i] || 0)).filter(d => d > 0).length;
      if (over === 0 && under === 0) break;

      subjs.forEach((_, overIdx) => {
        const excess = (actual[overIdx] || 0) - targets[overIdx];
        if (excess <= 0) return;

        const underIdxs = subjs.map((_, i) => i).filter(i => (actual[i] || 0) < targets[i]);
        if (!underIdxs.length) return;

        let fixed = 0;
        for (let di = 0; di < DAYS.length && fixed < excess; di++) {
          for (let p = 0; p < nperiods && fixed < excess; p++) {
            if (tt[cls.name][di]?.[p] !== overIdx) continue;
            const prev = p > 0 ? tt[cls.name][di][p - 1] : null;
            const next = p < nperiods - 1 ? tt[cls.name][di][p + 1] : null;
            if (prev === overIdx || next === overIdx) continue;

            for (const ui of underIdxs) {
              if ((actual[ui] || 0) >= targets[ui]) continue;
              let dayCount = 0;
              for (let pp = 0; pp < nperiods; pp++) {
                if (tt[cls.name][di]?.[pp] === ui) dayCount++;
              }
              if (dayCount >= 2) continue;

              tt[cls.name][di][p] = ui;
              actual[overIdx] = (actual[overIdx] || 0) - 1;
              actual[ui] = (actual[ui] || 0) + 1;
              fixed++;
              break;
            }
          }
        }
      });
    }
  });

  const conflicts = detectConflicts(tt, classes, teachers, nperiods, schedule);
  return { tt, conflicts };
}

export function detectConflicts(
  tt: TimetableGrid,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): TimetableConflict[] {
  const validClasses = classes.filter(c => c.name.trim());
  const conflicts: TimetableConflict[] = [];
  const periodSlots = schedule.filter(e => e.type === 'period').map(e => `${e.startTime}–${e.endTime}`);

  DAYS.forEach((dayName, di) => {
    // 1. Slot clash
    for (let p = 0; p < nperiods; p++) {
      const teacherMap: Record<string, ConflictEntry[]> = {};
      validClasses.forEach(cls => {
        const si = tt[cls.name]?.[di]?.[p];
        if (si === undefined || si === null) return;
        const subj = cls.subjects[si];
        if (!subj || !subj.teacherId) return;
        const tid = subj.teacherId;
        if (!teacherMap[tid]) teacherMap[tid] = [];
        teacherMap[tid].push({
          cls: cls.name,
          si,
          subjName: subj.subjectName,
          teacherId: tid,
          teacherName: getTeacherName(teachers, tid),
          period: p
        });
      });

      Object.entries(teacherMap).forEach(([tid, entries]) => {
        if (entries.length > 1) {
          conflicts.push({
            type: 'slot-clash',
            teacher: getTeacherName(teachers, tid),
            teacherId: tid,
            day: di,
            dayName,
            period: p,
            slot: periodSlots[p] || `P${p + 1}`,
            entries
          });
        }
      });
    }

    // 2. Teacher daily overload (> 7 periods/day)
    const teacherDaySlots: Record<string, Array<{ cls: string; si: number; period: number; subjName: string }>> = {};
    validClasses.forEach(cls => {
      for (let p = 0; p < nperiods; p++) {
        const si = tt[cls.name]?.[di]?.[p];
        if (si === undefined || si === null) return;
        const subj = cls.subjects[si];
        if (!subj || !subj.teacherId) return;
        const tid = subj.teacherId;
        if (!teacherDaySlots[tid]) teacherDaySlots[tid] = [];
        teacherDaySlots[tid].push({ cls: cls.name, si, period: p, subjName: subj.subjectName });
      }
    });

    Object.entries(teacherDaySlots).forEach(([tid, slots_]) => {
      if (slots_.length > 7) {
        conflicts.push({
          type: 'teacher-overload',
          teacher: getTeacherName(teachers, tid),
          teacherId: tid,
          day: di,
          dayName,
          period: -1,
          slot: 'All day',
          count: slots_.length,
          max: 7,
          entries: slots_.map(s => ({
            cls: s.cls,
            si: s.si,
            period: s.period,
            subjName: s.subjName,
            teacherId: tid,
            teacherName: getTeacherName(teachers, tid)
          }))
        });
      }
    });

    // 3. Subject overload (> 2 per day in a single class)
    validClasses.forEach(cls => {
      const subjectDayCount: Record<number, number> = {};
      for (let p = 0; p < nperiods; p++) {
        const si = tt[cls.name]?.[di]?.[p];
        if (si === undefined || si === null) continue;
        subjectDayCount[si] = (subjectDayCount[si] || 0) + 1;
      }
      Object.entries(subjectDayCount).forEach(([siStr, count]) => {
        const si = parseInt(siStr);
        if (count > 2) {
          const subj = cls.subjects[si];
          const periodsWithOverload: number[] = [];
          for (let p = 0; p < nperiods; p++) {
            if (tt[cls.name]?.[di]?.[p] === si) periodsWithOverload.push(p);
          }
          conflicts.push({
            type: 'subject-overload',
            teacher: getTeacherName(teachers, subj?.teacherId),
            teacherId: subj?.teacherId || '',
            day: di,
            dayName,
            period: -1,
            slot: 'All day',
            count,
            max: 2,
            subjName: subj?.subjectName,
            clsName: cls.name,
            entries: periodsWithOverload.map(p => ({
              cls: cls.name,
              si,
              period: p,
              subjName: subj?.subjectName || '',
              teacherId: subj?.teacherId || '',
              teacherName: getTeacherName(teachers, subj?.teacherId)
            }))
          });
        }
      });
    });
  });

  return conflicts;
}

export function getConflictSet(conflicts: TimetableConflict[]): Set<string> {
  const set = new Set<string>();
  conflicts.forEach(c => {
    if (c.type === 'slot-clash') {
      c.entries.forEach(e => set.add(`${e.cls}|${c.day}|${c.period}`));
    } else if (c.type === 'teacher-overload' || c.type === 'subject-overload') {
      c.entries.forEach(e => {
        if (e.period !== undefined) set.add(`${e.cls}|${c.day}|${e.period}`);
      });
    }
  });
  return set;
}

export function autoResolveAllConflicts(
  currentTT: TimetableGrid,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): { tt: TimetableGrid; totalResolved: number; remaining: number } {
  const updatedTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
  let totalResolved = 0;
  let iterations = 0;
  const MAX_ITER = 100;

  while (iterations < MAX_ITER) {
    const conflicts = detectConflicts(updatedTT, classes, teachers, nperiods, schedule);
    if (!conflicts.length) break;
    iterations++;

    conflicts.forEach(c => {
      const { day, period, entries } = c;
      if (period < 0) return; // skip non-slot clashes in fast resolver

      entries.slice(1).forEach(e => {
        const cls = classes.find(x => x.name === e.cls);
        if (!cls) return;
        const subjs = cls.subjects;

        const busy = new Set<string>();
        classes.forEach(other => {
          const si = updatedTT[other.name]?.[day]?.[period];
          if (si === undefined || si === null) return;
          const subj = other.subjects[si];
          if (subj && subj.teacherId) busy.add(subj.teacherId);
        });

        const freeIdx = subjs.findIndex(
          s => s.teacherId && !busy.has(s.teacherId) && s.subjectName !== e.subjName
        );
        const fallbackIdx = subjs.findIndex(s => s.teacherId && !busy.has(s.teacherId));
        const chosen = freeIdx >= 0 ? freeIdx : fallbackIdx >= 0 ? fallbackIdx : -1;

        if (chosen >= 0) {
          if (!updatedTT[e.cls]) updatedTT[e.cls] = {};
          if (!updatedTT[e.cls][day]) updatedTT[e.cls][day] = {};
          updatedTT[e.cls][day][period] = chosen;
          busy.add(subjs[chosen].teacherId);
          totalResolved++;
        }
      });
    });
  }

  const remaining = detectConflicts(updatedTT, classes, teachers, nperiods, schedule).length;
  return { tt: updatedTT, totalResolved, remaining };
}

export function findSwapSuggestionsForConflict(
  conflict: TimetableConflict,
  currentTT: TimetableGrid,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): SwapSuggestion[] {
  const periodSlots = schedule.filter(e => e.type === 'period').map(e => `${e.startTime}–${e.endTime}`);
  const baseConflicts = detectConflicts(currentTT, classes, teachers, nperiods, schedule);
  const baseConflictCount = baseConflicts.length;
  const suggestions: SwapSuggestion[] = [];
  const seenKeys = new Set<string>();

  // Determine which class entries to inspect
  const targetEntries = conflict.entries.length > 0
    ? conflict.entries
    : conflict.clsName
    ? [{ cls: conflict.clsName, si: 0, subjName: conflict.subjName || '', teacherId: conflict.teacherId, teacherName: conflict.teacher, period: conflict.period }]
    : [];

  targetEntries.forEach(entry => {
    const clsName = entry.cls;
    const cls = classes.find(c => c.name === clsName);
    if (!cls) return;

    const sourceDay = conflict.day;
    const sourcePeriod = entry.period !== undefined && entry.period >= 0 ? entry.period : conflict.period;
    if (sourcePeriod < 0 || sourcePeriod >= nperiods) return;

    const sourceSi = currentTT[clsName]?.[sourceDay]?.[sourcePeriod];
    if (sourceSi === undefined || sourceSi === null) return;
    const sourceSubj = cls.subjects[sourceSi];
    if (!sourceSubj) return;

    const sourceTid = sourceSubj.teacherId || '';
    const sourceTName = getTeacherName(teachers, sourceTid);
    const sourceTimeStr = periodSlots[sourcePeriod] || `P${sourcePeriod + 1}`;

    // Scan all candidate target slots (d2, p2) in clsName
    for (let targetDay = 0; targetDay < DAYS.length; targetDay++) {
      for (let targetPeriod = 0; targetPeriod < nperiods; targetPeriod++) {
        // Skip same slot
        if (targetDay === sourceDay && targetPeriod === sourcePeriod) continue;

        const targetSi = currentTT[clsName]?.[targetDay]?.[targetPeriod];
        if (targetSi === undefined || targetSi === null) continue;
        if (targetSi === sourceSi && targetDay === sourceDay) continue;

        const targetSubj = cls.subjects[targetSi];
        if (!targetSubj) continue;

        const targetTid = targetSubj.teacherId || '';
        const targetTName = getTeacherName(teachers, targetTid);
        const targetTimeStr = periodSlots[targetPeriod] || `P${targetPeriod + 1}`;

        // Create a candidate grid copy
        const testTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
        if (!testTT[clsName]) testTT[clsName] = {};
        if (!testTT[clsName][sourceDay]) testTT[clsName][sourceDay] = {};
        if (!testTT[clsName][targetDay]) testTT[clsName][targetDay] = {};

        testTT[clsName][sourceDay][sourcePeriod] = targetSi;
        testTT[clsName][targetDay][targetPeriod] = sourceSi;

        const newConflicts = detectConflicts(testTT, classes, teachers, nperiods, schedule);
        const newConflictCount = newConflicts.length;
        const delta = newConflictCount - baseConflictCount;

        // Check if the original conflict is resolved in newConflicts
        const isOriginalConflictStillPresent = newConflicts.some(nc => {
          if (nc.type === 'slot-clash' && conflict.type === 'slot-clash') {
            return nc.day === sourceDay && nc.period === sourcePeriod && nc.teacherId === conflict.teacherId;
          }
          return false;
        });

        // We accept swaps that strictly reduce conflicts or resolve the clash without increasing total conflicts
        if (delta <= 0 && !isOriginalConflictStillPresent) {
          const swapKey = `${clsName}|${sourceDay}|${sourcePeriod}|${targetDay}|${targetPeriod}`;
          if (seenKeys.has(swapKey)) continue;
          seenKeys.add(swapKey);

          let explanation = '';
          if (delta < 0) {
            explanation = `Swaps "${sourceSubj.subjectName}" with "${targetSubj.subjectName}" on ${DAYS[targetDay]} P${targetPeriod + 1}, reducing total conflicts by ${Math.abs(delta)}.`;
          } else {
            explanation = `Swaps with ${DAYS[targetDay]} P${targetPeriod + 1} (${targetSubj.subjectName}). Frees ${sourceTName} at ${DAYS[sourceDay]} P${sourcePeriod + 1} without introducing new clashes.`;
          }

          suggestions.push({
            id: `swap_${clsName}_${sourceDay}_${sourcePeriod}_${targetDay}_${targetPeriod}`,
            clsName,
            sourceDay,
            sourceDayName: DAYS[sourceDay],
            sourcePeriod,
            sourceSlotTime: sourceTimeStr,
            sourceSubjectName: sourceSubj.subjectName,
            sourceTeacherId: sourceTid,
            sourceTeacherName: sourceTName,
            targetDay,
            targetDayName: DAYS[targetDay],
            targetPeriod,
            targetSlotTime: targetTimeStr,
            targetSubjectName: targetSubj.subjectName,
            targetTeacherId: targetTid,
            targetTeacherName: targetTName,
            newConflictCount,
            conflictDelta: delta,
            explanation,
            isZeroConflictResolved: newConflictCount === 0,
          });
        }
      }
    }
  });

  // Sort:
  // 1. Zero total conflicts first
  // 2. Best delta (most negative)
  // 3. Same day swap
  return suggestions.sort((a, b) => {
    if (a.isZeroConflictResolved && !b.isZeroConflictResolved) return -1;
    if (!a.isZeroConflictResolved && b.isZeroConflictResolved) return 1;
    if (a.conflictDelta !== b.conflictDelta) return a.conflictDelta - b.conflictDelta;
    if (a.newConflictCount !== b.newConflictCount) return a.newConflictCount - b.newConflictCount;
    const aSameDay = a.sourceDay === a.targetDay ? 1 : 0;
    const bSameDay = b.sourceDay === b.targetDay ? 1 : 0;
    return bSameDay - aSameDay;
  });
}

export function applySwapSuggestion(
  currentTT: TimetableGrid,
  swap: SwapSuggestion
): TimetableGrid {
  const nextTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
  if (!nextTT[swap.clsName]) nextTT[swap.clsName] = {};
  if (!nextTT[swap.clsName][swap.sourceDay]) nextTT[swap.clsName][swap.sourceDay] = {};
  if (!nextTT[swap.clsName][swap.targetDay]) nextTT[swap.clsName][swap.targetDay] = {};

  const si1 = currentTT[swap.clsName]?.[swap.sourceDay]?.[swap.sourcePeriod];
  const si2 = currentTT[swap.clsName]?.[swap.targetDay]?.[swap.targetPeriod];

  if (si1 !== undefined) nextTT[swap.clsName][swap.targetDay][swap.targetPeriod] = si1;
  if (si2 !== undefined) nextTT[swap.clsName][swap.sourceDay][swap.sourcePeriod] = si2;

  return nextTT;
}

export interface MassResolveAction {
  day: string;
  period: number;
  oldSubj: string;
  newSubj: string;
  className?: string;
}

export interface MassResolveResult {
  tt: TimetableGrid;
  initialClashes: number;
  resolvedCount: number;
  remainingCount: number;
  actions: MassResolveAction[];
}

/**
 * High-performance heuristic solver that evaluates global timetable constraints,
 * iteratively applies smart intra-class slot swaps and optimal faculty reassignments,
 * and eliminates detected slot clashes while preserving curriculum balances.
 */
export function massResolveClashesHeuristic(
  currentTT: TimetableGrid,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): MassResolveResult {
  const workingTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
  const initialConflicts = detectConflicts(workingTT, classes, teachers, nperiods, schedule);
  const initialClashes = initialConflicts.length;

  if (initialClashes === 0) {
    return {
      tt: workingTT,
      initialClashes: 0,
      resolvedCount: 0,
      remainingCount: 0,
      actions: [],
    };
  }

  const actions: MassResolveAction[] = [];
  const MAX_ROUNDS = 20;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const currentConflicts = detectConflicts(workingTT, classes, teachers, nperiods, schedule);
    if (currentConflicts.length === 0) break;

    let improvedInRound = false;

    // 1. First priority: Try intra-class swap heuristics for each conflict
    for (const conflict of currentConflicts) {
      if (conflict.type !== 'slot-clash') continue;

      const entries = conflict.entries;
      if (!entries || entries.length <= 1) continue;

      // Try resolving by swapping slots in the second/subsequent conflicting classes
      for (let eIdx = 1; eIdx < entries.length; eIdx++) {
        const entry = entries[eIdx];
        const clsName = entry.cls;
        const cls = classes.find((c) => c.name === clsName);
        if (!cls) continue;

        const sourceDay = conflict.day;
        const sourcePeriod = conflict.period;
        const sourceSi = workingTT[clsName]?.[sourceDay]?.[sourcePeriod];
        if (sourceSi === undefined || sourceSi === null) continue;
        const sourceSubj = cls.subjects[sourceSi];
        if (!sourceSubj) continue;

        let bestSwap: {
          targetDay: number;
          targetPeriod: number;
          targetSi: number;
          targetSubjName: string;
          conflictCount: number;
        } | null = null;

        let minConflicts = currentConflicts.length;

        // Search candidate target slots in clsName
        for (let tDay = 0; tDay < DAYS.length; tDay++) {
          for (let tPeriod = 0; tPeriod < nperiods; tPeriod++) {
            if (tDay === sourceDay && tPeriod === sourcePeriod) continue;

            const targetSi = workingTT[clsName]?.[tDay]?.[tPeriod];
            if (targetSi === undefined || targetSi === null) continue;
            if (targetSi === sourceSi && tDay === sourceDay) continue;

            const targetSubj = cls.subjects[targetSi];
            if (!targetSubj) continue;

            // Test swap in a cloned test grid
            const testTT: TimetableGrid = JSON.parse(JSON.stringify(workingTT));
            if (!testTT[clsName]) testTT[clsName] = {};
            if (!testTT[clsName][sourceDay]) testTT[clsName][sourceDay] = {};
            if (!testTT[clsName][tDay]) testTT[clsName][tDay] = {};

            testTT[clsName][sourceDay][sourcePeriod] = targetSi;
            testTT[clsName][tDay][tPeriod] = sourceSi;

            const testConflicts = detectConflicts(testTT, classes, teachers, nperiods, schedule);
            if (testConflicts.length < minConflicts) {
              minConflicts = testConflicts.length;
              bestSwap = {
                targetDay: tDay,
                targetPeriod: tPeriod,
                targetSi,
                targetSubjName: targetSubj.subjectName,
                conflictCount: testConflicts.length,
              };
            }
          }
        }

        // If an improving swap was discovered, apply it immediately
        if (bestSwap && bestSwap.conflictCount < currentConflicts.length) {
          if (!workingTT[clsName]) workingTT[clsName] = {};
          if (!workingTT[clsName][sourceDay]) workingTT[clsName][sourceDay] = {};
          if (!workingTT[clsName][bestSwap.targetDay]) workingTT[clsName][bestSwap.targetDay] = {};

          workingTT[clsName][sourceDay][sourcePeriod] = bestSwap.targetSi;
          workingTT[clsName][bestSwap.targetDay][bestSwap.targetPeriod] = sourceSi;

          actions.push({
            className: clsName,
            day: DAYS[sourceDay],
            period: sourcePeriod + 1,
            oldSubj: sourceSubj.subjectName,
            newSubj: `${bestSwap.targetSubjName} (⇄ ${DAYS[bestSwap.targetDay]} P${bestSwap.targetPeriod + 1})`,
          });

          improvedInRound = true;
          break; // move to next conflict with updated grid
        }
      }
    }

    // 2. Second priority: If no swap strictly improved, try smart faculty reassignment
    if (!improvedInRound) {
      for (const conflict of currentConflicts) {
        if (conflict.type !== 'slot-clash') continue;
        const entries = conflict.entries;
        if (!entries || entries.length <= 1) continue;

        for (let eIdx = 1; eIdx < entries.length; eIdx++) {
          const entry = entries[eIdx];
          const cls = classes.find((c) => c.name === entry.cls);
          if (!cls) continue;

          const busyTeachers = new Set<string>();
          classes.forEach((other) => {
            const si = workingTT[other.name]?.[conflict.day]?.[conflict.period];
            if (si !== undefined && si !== null) {
              const subj = other.subjects[si];
              if (subj?.teacherId) busyTeachers.add(subj.teacherId);
            }
          });

          const freeSubjIdx = cls.subjects.findIndex(
            (s) => s.teacherId && !busyTeachers.has(s.teacherId) && s.subjectName !== entry.subjName
          );

          if (freeSubjIdx >= 0) {
            const oldSubj = entry.subjName;
            const newSubj = cls.subjects[freeSubjIdx].subjectName;

            if (!workingTT[entry.cls]) workingTT[entry.cls] = {};
            if (!workingTT[entry.cls][conflict.day]) workingTT[entry.cls][conflict.day] = {};
            workingTT[entry.cls][conflict.day][conflict.period] = freeSubjIdx;

            actions.push({
              className: entry.cls,
              day: DAYS[conflict.day],
              period: conflict.period + 1,
              oldSubj,
              newSubj,
            });

            improvedInRound = true;
            break;
          }
        }
      }
    }

    // If no progress made in this round, break
    if (!improvedInRound) {
      break;
    }
  }

  const finalConflicts = detectConflicts(workingTT, classes, teachers, nperiods, schedule);
  const remainingCount = finalConflicts.length;
  const resolvedCount = Math.max(0, initialClashes - remainingCount);

  return {
    tt: workingTT,
    initialClashes,
    resolvedCount,
    remainingCount,
    actions,
  };
}

/**
 * Targeted heuristic resolver for a specific teacher's clashes and overloads across all classes.
 */
export function resolveClashesForTeacher(
  currentTT: TimetableGrid,
  teacherId: string,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): {
  tt: TimetableGrid;
  resolvedCount: number;
  remainingTeacherClashes: number;
  remainingCount: number;
  teacherName: string;
  actions: MassResolveAction[];
} {
  const teacherName = getTeacherName(teachers, teacherId);
  const workingTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
  const actions: MassResolveAction[] = [];

  const getTeacherConflicts = (grid: TimetableGrid) =>
    detectConflicts(grid, classes, teachers, nperiods, schedule).filter(
      (c) => c.teacherId === teacherId || c.entries.some((e) => e.teacherId === teacherId)
    );

  const initialConflicts = getTeacherConflicts(workingTT);
  const initialCount = initialConflicts.length;

  if (initialCount === 0) {
    return {
      tt: workingTT,
      resolvedCount: 0,
      remainingTeacherClashes: 0,
      remainingCount: 0,
      teacherName,
      actions: [],
    };
  }

  const MAX_ROUNDS = 15;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const tConflicts = getTeacherConflicts(workingTT);
    if (tConflicts.length === 0) break;

    let improved = false;

    for (const conflict of tConflicts) {
      if (conflict.type === 'slot-clash') {
        const entries = conflict.entries;
        if (!entries || entries.length <= 1) continue;

        // Try swap in one of the clashing classes
        for (let eIdx = 1; eIdx < entries.length; eIdx++) {
          const entry = entries[eIdx];
          const clsName = entry.cls;
          const cls = classes.find((c) => c.name === clsName);
          if (!cls) continue;

          const sourceDay = conflict.day;
          const sourcePeriod = conflict.period;
          const sourceSi = workingTT[clsName]?.[sourceDay]?.[sourcePeriod];
          if (sourceSi === undefined || sourceSi === null) continue;

          // Find candidate target slot in clsName
          for (let tDay = 0; tDay < DAYS.length; tDay++) {
            for (let tPeriod = 0; tPeriod < nperiods; tPeriod++) {
              if (tDay === sourceDay && tPeriod === sourcePeriod) continue;

              const targetSi = workingTT[clsName]?.[tDay]?.[tPeriod];
              if (targetSi === undefined || targetSi === null) continue;

              const testTT: TimetableGrid = JSON.parse(JSON.stringify(workingTT));
              testTT[clsName][sourceDay][sourcePeriod] = targetSi;
              testTT[clsName][tDay][tPeriod] = sourceSi;

              const testTConflicts = getTeacherConflicts(testTT);
              if (testTConflicts.length < tConflicts.length) {
                const oldSubj = cls.subjects[sourceSi]?.subjectName || 'Slot';
                const newSubj = cls.subjects[targetSi]?.subjectName || 'Slot';

                workingTT[clsName][sourceDay][sourcePeriod] = targetSi;
                workingTT[clsName][tDay][tPeriod] = sourceSi;

                actions.push({
                  className: clsName,
                  day: DAYS[sourceDay],
                  period: sourcePeriod + 1,
                  oldSubj,
                  newSubj: `Swapped with ${DAYS[tDay]} P${tPeriod + 1} (${newSubj})`,
                });

                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }

        // If swap didn't work, try reassigning to a free teacher in that slot
        if (!improved) {
          for (let eIdx = 1; eIdx < entries.length; eIdx++) {
            const entry = entries[eIdx];
            const cls = classes.find((c) => c.name === entry.cls);
            if (!cls) continue;

            const busyTeachers = new Set<string>();
            classes.forEach((other) => {
              const si = workingTT[other.name]?.[conflict.day]?.[conflict.period];
              if (si !== undefined && si !== null) {
                const s = other.subjects[si];
                if (s?.teacherId) busyTeachers.add(s.teacherId);
              }
            });

            const freeSubjIdx = cls.subjects.findIndex(
              (s) => s.teacherId && !busyTeachers.has(s.teacherId) && s.teacherId !== teacherId
            );

            if (freeSubjIdx >= 0) {
              const oldSubj = cls.subjects[entry.si]?.subjectName || 'Slot';
              const newSubj = cls.subjects[freeSubjIdx]?.subjectName || 'Free Subject';

              if (!workingTT[entry.cls]) workingTT[entry.cls] = {};
              if (!workingTT[entry.cls][conflict.day]) workingTT[entry.cls][conflict.day] = {};
              workingTT[entry.cls][conflict.day][conflict.period] = freeSubjIdx;

              actions.push({
                className: entry.cls,
                day: DAYS[conflict.day],
                period: conflict.period + 1,
                oldSubj,
                newSubj: `Reassigned to ${newSubj}`,
              });

              improved = true;
              break;
            }
          }
        }
      } else if (conflict.type === 'teacher-overload') {
        // Teacher scheduled > 7 periods in one day. Swap one slot of that teacher with another day.
        const entries = conflict.entries;
        for (const entry of entries) {
          const clsName = entry.cls;
          const cls = classes.find((c) => c.name === clsName);
          if (!cls || entry.period === undefined) continue;

          const sourceDay = conflict.day;
          const sourcePeriod = entry.period;
          const sourceSi = workingTT[clsName]?.[sourceDay]?.[sourcePeriod];
          if (sourceSi === undefined || sourceSi === null) continue;

          for (let tDay = 0; tDay < DAYS.length; tDay++) {
            if (tDay === sourceDay) continue;
            for (let tPeriod = 0; tPeriod < nperiods; tPeriod++) {
              const targetSi = workingTT[clsName]?.[tDay]?.[tPeriod];
              if (targetSi === undefined || targetSi === null) continue;

              const testTT: TimetableGrid = JSON.parse(JSON.stringify(workingTT));
              testTT[clsName][sourceDay][sourcePeriod] = targetSi;
              testTT[clsName][tDay][tPeriod] = sourceSi;

              const testTConflicts = getTeacherConflicts(testTT);
              if (testTConflicts.length < tConflicts.length) {
                const oldSubj = cls.subjects[sourceSi]?.subjectName || 'Slot';
                const newSubj = cls.subjects[targetSi]?.subjectName || 'Slot';

                workingTT[clsName][sourceDay][sourcePeriod] = targetSi;
                workingTT[clsName][tDay][tPeriod] = sourceSi;

                actions.push({
                  className: clsName,
                  day: DAYS[sourceDay],
                  period: sourcePeriod + 1,
                  oldSubj,
                  newSubj: `Moved to ${DAYS[tDay]} P${tPeriod + 1} (${newSubj})`,
                });

                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
      }

      if (improved) break;
    }

    if (!improved) break;
  }

  const finalTConflicts = getTeacherConflicts(workingTT);
  const remainingTeacherClashes = finalTConflicts.length;
  const resolvedCount = Math.max(0, initialCount - remainingTeacherClashes);

  return {
    tt: workingTT,
    resolvedCount,
    remainingTeacherClashes,
    remainingCount: remainingTeacherClashes,
    teacherName,
    actions,
  };
}

/**
 * Targeted heuristic resolver for a specific subject's clashes & daily overloads in a class.
 */
export function resolveClashesForSubject(
  currentTT: TimetableGrid,
  className: string,
  subjectIndex: number,
  classes: ClassEntry[],
  teachers: Teacher[],
  nperiods: number = 8,
  schedule: ScheduleEntry[] = []
): {
  tt: TimetableGrid;
  resolvedCount: number;
  remainingSubjectClashes: number;
  remainingCount: number;
  subjectName: string;
  actions: MassResolveAction[];
} {
  const cls = classes.find((c) => c.name === className);
  const subject = cls?.subjects[subjectIndex];
  const subjectName = subject?.subjectName || `Subject #${subjectIndex + 1}`;
  const workingTT: TimetableGrid = JSON.parse(JSON.stringify(currentTT));
  const actions: MassResolveAction[] = [];

  if (!cls || !subject) {
    return {
      tt: workingTT,
      resolvedCount: 0,
      remainingSubjectClashes: 0,
      remainingCount: 0,
      subjectName,
      actions: [],
    };
  }

  const getSubjConflicts = (grid: TimetableGrid) =>
    detectConflicts(grid, classes, teachers, nperiods, schedule).filter(
      (c) =>
        (c.clsName === className && c.subjName === subjectName) ||
        c.entries.some((e) => e.cls === className && e.si === subjectIndex)
    );

  const initialConflicts = getSubjConflicts(workingTT);
  const initialCount = initialConflicts.length;

  if (initialCount === 0) {
    return {
      tt: workingTT,
      resolvedCount: 0,
      remainingSubjectClashes: 0,
      remainingCount: 0,
      subjectName,
      actions: [],
    };
  }

  const MAX_ROUNDS = 15;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const sConflicts = getSubjConflicts(workingTT);
    if (sConflicts.length === 0) break;

    let improved = false;

    for (const conflict of sConflicts) {
      const sourceDay = conflict.day;
      const periodsToCheck: number[] =
        conflict.period >= 0
          ? [conflict.period]
          : conflict.entries.filter((e) => e.period !== undefined).map((e) => e.period!);

      for (const sourcePeriod of periodsToCheck) {
        if (workingTT[className]?.[sourceDay]?.[sourcePeriod] !== subjectIndex) continue;

        // Try swapping with another slot in className on a different day or non-clashing slot
        for (let tDay = 0; tDay < DAYS.length; tDay++) {
          for (let tPeriod = 0; tPeriod < nperiods; tPeriod++) {
            if (tDay === sourceDay && tPeriod === sourcePeriod) continue;
            const targetSi = workingTT[className]?.[tDay]?.[tPeriod];
            if (targetSi === undefined || targetSi === null || targetSi === subjectIndex) continue;

            const testTT: TimetableGrid = JSON.parse(JSON.stringify(workingTT));
            testTT[className][sourceDay][sourcePeriod] = targetSi;
            testTT[className][tDay][tPeriod] = subjectIndex;

            const testSConflicts = getSubjConflicts(testTT);

            if (testSConflicts.length < sConflicts.length) {
              const oldSubj = subjectName;
              const targetSubjName = cls.subjects[targetSi]?.subjectName || 'Slot';

              workingTT[className][sourceDay][sourcePeriod] = targetSi;
              workingTT[className][tDay][tPeriod] = subjectIndex;

              actions.push({
                className,
                day: DAYS[sourceDay],
                period: sourcePeriod + 1,
                oldSubj,
                newSubj: `Swapped with ${DAYS[tDay]} P${tPeriod + 1} (${targetSubjName})`,
              });

              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }

    if (!improved) break;
  }

  const finalSConflicts = getSubjConflicts(workingTT);
  const remainingSubjectClashes = finalSConflicts.length;
  const resolvedCount = Math.max(0, initialCount - remainingSubjectClashes);

  return {
    tt: workingTT,
    resolvedCount,
    remainingSubjectClashes,
    remainingCount: remainingSubjectClashes,
    subjectName,
    actions,
  };
}

export interface TeacherSlotStatus {
  day: number;
  period: number;
  isFree: boolean;
  className?: string;
  subjectName?: string;
}

export interface TeacherFreeSchedule {
  teacher: Teacher;
  totalPeriods: number;
  busyPeriodsCount: number;
  freePeriodsCount: number;
  freePercentage: number;
  freePeriodsByDay: Record<number, number[]>;
  busySlotsByDay: Record<number, TeacherSlotStatus[]>;
  allSlots: TeacherSlotStatus[];
}

export function getTeacherFreeSchedule(
  teacherId: string,
  teachers: Teacher[],
  classes: ClassEntry[],
  tt: TimetableGrid,
  nperiods: number
): TeacherFreeSchedule {
  const teacher = teachers.find((t) => t.id === teacherId) || { id: teacherId, name: teacherId };
  const totalPeriods = 6 * nperiods;
  let busyCount = 0;
  const freePeriodsByDay: Record<number, number[]> = {};
  const busySlotsByDay: Record<number, TeacherSlotStatus[]> = {};
  const allSlots: TeacherSlotStatus[] = [];

  for (let di = 0; di < 6; di++) {
    freePeriodsByDay[di] = [];
    busySlotsByDay[di] = [];

    for (let p = 0; p < nperiods; p++) {
      let isBusy = false;
      let busyClass = '';
      let busySubject = '';

      for (const cls of classes) {
        const si = tt[cls.name]?.[di]?.[p];
        if (si !== undefined && si !== null) {
          const subj = cls.subjects[si];
          if (subj && subj.teacherId === teacherId) {
            isBusy = true;
            busyClass = cls.name;
            busySubject = subj.subjectName;
            break;
          }
        }
      }

      const slotStatus: TeacherSlotStatus = {
        day: di,
        period: p,
        isFree: !isBusy,
        className: isBusy ? busyClass : undefined,
        subjectName: isBusy ? busySubject : undefined,
      };

      allSlots.push(slotStatus);

      if (isBusy) {
        busyCount++;
        busySlotsByDay[di].push(slotStatus);
      } else {
        freePeriodsByDay[di].push(p);
      }
    }
  }

  const freeCount = totalPeriods - busyCount;
  const freePercentage = totalPeriods > 0 ? Math.round((freeCount / totalPeriods) * 100) : 100;

  return {
    teacher,
    totalPeriods,
    busyPeriodsCount: busyCount,
    freePeriodsCount: freeCount,
    freePercentage,
    freePeriodsByDay,
    busySlotsByDay,
    allSlots,
  };
}

export function getAllTeachersFreeSchedules(
  teachers: Teacher[],
  classes: ClassEntry[],
  tt: TimetableGrid,
  nperiods: number
): TeacherFreeSchedule[] {
  return teachers.map((t) => getTeacherFreeSchedule(t.id, teachers, classes, tt, nperiods));
}

export function getFreeTeachersAtSlot(
  day: number,
  period: number,
  teachers: Teacher[],
  classes: ClassEntry[],
  tt: TimetableGrid
): Array<{ teacher: Teacher; specialization?: string; department?: string }> {
  const busyTeacherIds = new Set<string>();

  classes.forEach((cls) => {
    const si = tt[cls.name]?.[day]?.[period];
    if (si !== undefined && si !== null) {
      const subj = cls.subjects[si];
      if (subj && subj.teacherId) {
        busyTeacherIds.add(subj.teacherId);
      }
    }
  });

  return teachers
    .filter((t) => !busyTeacherIds.has(t.id))
    .map((t) => ({
      teacher: t,
      specialization: t.specialization,
      department: t.department,
    }));
}

export function removeTeacherAndAssignedPeriods(
  teacherId: string,
  teachers: Teacher[],
  classes: ClassEntry[],
  tt: TimetableGrid,
  nperiods: number = 8
): {
  updatedTeachers: Teacher[];
  updatedClasses: ClassEntry[];
  updatedTT: TimetableGrid;
  removedPeriodsCount: number;
  removedSubjectsCount: number;
  affectedClasses: string[];
} {
  const updatedTeachers = teachers.filter((t) => t.id !== teacherId);

  let removedPeriodsCount = 0;
  let removedSubjectsCount = 0;
  const affectedClassesSet = new Set<string>();
  const classIndexMappings = new Map<string, Map<number, number | null>>();

  // Deep clone and update classes
  const updatedClasses: ClassEntry[] = classes.map((cls) => {
    const newSubjects: any[] = [];
    const indexMapping = new Map<number, number | null>();

    cls.subjects.forEach((subj, oldIdx) => {
      if (subj.teacherId === teacherId) {
        indexMapping.set(oldIdx, null);
        removedPeriodsCount += subj.periodsPerWeek || 0;
        removedSubjectsCount++;
        affectedClassesSet.add(cls.name);
      } else {
        const newIdx = newSubjects.length;
        indexMapping.set(oldIdx, newIdx);
        newSubjects.push({ ...subj });
      }
    });

    classIndexMappings.set(cls.name, indexMapping);

    return {
      ...cls,
      subjects: newSubjects,
    };
  });

  // Deep clone and update timetable grid
  const updatedTT: TimetableGrid = {};
  for (const clsName of Object.keys(tt)) {
    const indexMapping = classIndexMappings.get(clsName);
    updatedTT[clsName] = [];
    const classGrid = tt[clsName] || [];

    for (let di = 0; di < 6; di++) {
      updatedTT[clsName][di] = [];
      const dayRow = classGrid[di] || [];
      for (let p = 0; p < nperiods; p++) {
        const oldVal = dayRow[p];
        if (oldVal === null || oldVal === undefined) {
          updatedTT[clsName][di][p] = null;
        } else if (indexMapping) {
          const mapped = indexMapping.get(oldVal);
          if (mapped === null || mapped === undefined) {
            // Period removed because teacher's subject was deleted
            updatedTT[clsName][di][p] = null;
          } else {
            updatedTT[clsName][di][p] = mapped;
          }
        } else {
          updatedTT[clsName][di][p] = oldVal;
        }
      }
    }
  }

  return {
    updatedTeachers,
    updatedClasses,
    updatedTT,
    removedPeriodsCount,
    removedSubjectsCount,
    affectedClasses: Array.from(affectedClassesSet),
  };
}



