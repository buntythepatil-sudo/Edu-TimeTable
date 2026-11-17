import jsPDF from 'jspdf';
import autoTable, { applyPlugin, UserOptions } from 'jspdf-autotable';
import { ClassEntry, Teacher, ScheduleEntry, TimetableGrid } from '../types';
import { DAYS, getTeacherName, getMDPeriods, getAllTeachersFreeSchedules, isMDSubject } from './timetableGenerator';

// Standard A4 Normal Margin: 1 inch = 25.4 mm on all sides
const A4_NORMAL_MARGIN_MM = 25.4;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const A4_MARGIN_BOX = {
  top: A4_NORMAL_MARGIN_MM,
  right: A4_NORMAL_MARGIN_MM,
  bottom: A4_NORMAL_MARGIN_MM,
  left: A4_NORMAL_MARGIN_MM,
};

// Ensure plugin is initialized on jsPDF constructor
try {
  if (typeof applyPlugin === 'function') {
    applyPlugin(jsPDF);
  }
} catch {
  // ignore
}

// Add typescript declaration for autoTable extension on jsPDF if needed
declare module 'jspdf' {
  interface jsPDF {
    autoTable?: (options: UserOptions) => jsPDF;
  }
}

// Safe helper that works whether doc.autoTable exists or via direct autoTable function
function renderAutoTable(doc: jsPDF, options: UserOptions): void {
  if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(options);
  } else {
    autoTable(doc, options);
  }
}

export function exportTimetablePDF(
  classNames: string[],
  classes: ClassEntry[],
  teachers: Teacher[],
  schedule: ScheduleEntry[],
  tt: TimetableGrid,
  institutionName: string = 'SchoolGrid Timetable System',
  academicYear: string = '2026–2027'
): void {
  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  classNames.forEach((clsName, ci) => {
    const cls = classes.find((c) => c.name === clsName);
    if (!cls) return;

    if (ci > 0) doc.addPage('a4', 'landscape');

    // Brand Header in Serif Bold (aligned to A4 Normal Margins)
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(40, 60, 160);
    doc.text(`${clsName} — Weekly Class Timetable`, A4_NORMAL_MARGIN_MM, A4_NORMAL_MARGIN_MM + 5);

    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 90, 120);
    doc.text(
      `${institutionName} · Academic Year: ${academicYear} · Generated on ${new Date().toLocaleDateString()}`,
      A4_NORMAL_MARGIN_MM,
      A4_NORMAL_MARGIN_MM + 11
    );

    const head = [['Period', ...DAYS]];
    const body: string[][] = [];
    const mdPeriodsList = getMDPeriods(schedule);

    for (let p = 0; p < nperiods; p++) {
      const row = [`P${p + 1}`];
      DAYS.forEach((_, di) => {
        const si = tt[clsName]?.[di]?.[p];
        const subj = si !== undefined && si !== null ? cls.subjects[si] : null;
        if (subj) {
          if (isMDSubject(subj.subjectName) || !subj.teacherId) {
            row.push(
              isMDSubject(subj.subjectName)
                ? `${subj.subjectName}\nNo Faculty (MD)`
                : `${subj.subjectName}\nUnassigned`
            );
          } else {
            const tname = getTeacherName(teachers, subj.teacherId);
            row.push(`${subj.subjectName}\n[${subj.teacherId}] ${tname}`);
          }
        } else {
          row.push('—');
        }
      });
      body.push(row);

      // Insert MD rows after this period if defined
      mdPeriodsList
        .filter((md) => md.afterPeriod === p + 1)
        .forEach((md) => {
          const mdRow = [`MD ${md.entry.label || 'Physical Training'}`];
          DAYS.forEach((_, di) => {
            mdRow.push(md.days.includes(di) ? 'Mass Drill / Physical Training' : '');
          });
          body.push(mdRow);
        });
    }

    renderAutoTable(doc, {
      startY: A4_NORMAL_MARGIN_MM + 15,
      head,
      body,
      styles: {
        font: 'times',
      },
      headStyles: {
        fillColor: [40, 60, 160],
        textColor: 255,
        font: 'times',
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        font: 'times',
        fontSize: 8.2,
        cellPadding: 3,
        lineColor: [200, 210, 235],
        lineWidth: 0.35,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
      columnStyles: {
        0: {
          fillColor: [235, 240, 255],
          font: 'times',
          fontStyle: 'bold',
          cellWidth: 20,
          textColor: [40, 50, 110],
          halign: 'center',
        },
      },
      margin: A4_MARGIN_BOX,
    });

    // Footer note within A4 normal bottom margin
    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    const footerY = Math.min(finalY + 7, A4_LANDSCAPE_HEIGHT_MM - A4_NORMAL_MARGIN_MM);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(
      'Notice: Students must be present in their respective classrooms before the beginning of each period.',
      A4_NORMAL_MARGIN_MM,
      footerY
    );
  });

  const fileName =
    classNames.length === 1
      ? `${classNames[0]}_Timetable_${new Date().toISOString().slice(0, 10)}.pdf`
      : `All_Classes_Timetable_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(fileName);
}

export function exportTeacherSchedulePDF(
  teachers: Teacher[],
  classes: ClassEntry[],
  schedule: ScheduleEntry[],
  tt: TimetableGrid,
  institutionName: string = 'SchoolGrid Timetable System'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(90, 50, 200);
  doc.text(`Faculty Master Schedule & Workload Directory`, A4_NORMAL_MARGIN_MM, A4_NORMAL_MARGIN_MM + 5);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 90, 120);
  doc.text(
    `${institutionName} · Generated: ${new Date().toLocaleDateString()}`,
    A4_NORMAL_MARGIN_MM,
    A4_NORMAL_MARGIN_MM + 11
  );

  const head = [['Teacher ID', 'Teacher Name', 'Assigned Classes & Subjects', 'Periods / Week', 'Workload Status']];
  const body: string[][] = [];

  teachers.forEach((t) => {
    const assignments: string[] = [];
    let totalP = 0;

    classes.forEach((cls) => {
      cls.subjects.forEach((s, si) => {
        if (s.teacherId !== t.id) return;
        let count = 0;
        DAYS.forEach((_, di) => {
          for (let p = 0; p < nperiods; p++) {
            if (tt[cls.name]?.[di]?.[p] === si) count++;
          }
        });
        totalP += count;
        assignments.push(`${cls.name} (${s.subjectName}: ${count}p)`);
      });
    });

    const status = totalP > 30 ? 'High Workload' : totalP > 0 ? 'Normal Workload' : 'Unassigned';

    body.push([
      t.id,
      t.name || '—',
      assignments.join(', ') || 'No classes assigned',
      `${totalP} periods`,
      status,
    ]);
  });

  if (body.length === 0) {
    body.push(['—', 'No teachers registered', 'Add faculty in Teacher Registry', '0 periods', '—']);
  }

  renderAutoTable(doc, {
    startY: A4_NORMAL_MARGIN_MM + 15,
    head,
    body,
    styles: {
      font: 'times',
    },
    headStyles: {
      fillColor: [90, 50, 200],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [215, 220, 240],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { font: 'times', fontStyle: 'bold', cellWidth: 26 },
      1: { font: 'times', fontStyle: 'bold', cellWidth: 42 },
      3: { font: 'times', halign: 'center', cellWidth: 26 },
      4: { font: 'times', halign: 'center', cellWidth: 30 },
    },
    margin: A4_MARGIN_BOX,
  });

  doc.save(`Faculty_Schedule_Master_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportIndividualTeacherScheduleReportPDF(
  teacher: Teacher,
  teachers: Teacher[],
  classes: ClassEntry[],
  schedule: ScheduleEntry[],
  tt: TimetableGrid,
  institutionName: string = 'SchoolGrid Timetable System',
  academicYear: string = '2026–2027'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const periodsList = schedule.filter((e) => e.type === 'period');

  // Title & Institution Header in Serif Bold (aligned to A4 Normal Margins)
  doc.setFont('times', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(60, 50, 190);
  doc.text(
    `Teacher Schedule & Workload Report — ${teacher.name} (${teacher.id})`,
    A4_NORMAL_MARGIN_MM,
    A4_NORMAL_MARGIN_MM + 5
  );

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 90, 120);
  const deptStr = teacher.department ? `Department: ${teacher.department} · ` : '';
  doc.text(
    `${institutionName} · ${deptStr}Academic Year: ${academicYear} · Generated on ${new Date().toLocaleDateString()}`,
    A4_NORMAL_MARGIN_MM,
    A4_NORMAL_MARGIN_MM + 11
  );

  // 1. Calculate stats & assignments
  let totalAssignedPeriods = 0;
  const classAssignments: Array<{
    className: string;
    subjectName: string;
    assignedPeriods: number;
    doublePeriods?: number;
    daysActive: string[];
  }> = [];

  classes.forEach((cls) => {
    cls.subjects.forEach((s, si) => {
      if (s.teacherId !== teacher.id) return;
      totalAssignedPeriods += s.periodsPerWeek || 0;
      const daysFound = new Set<string>();

      DAYS.forEach((dayName, di) => {
        for (let p = 0; p < nperiods; p++) {
          if (tt[cls.name]?.[di]?.[p] === si) {
            daysFound.add(dayName.slice(0, 3));
          }
        }
      });

      classAssignments.push({
        className: cls.name,
        subjectName: s.subjectName || 'General',
        assignedPeriods: s.periodsPerWeek || 0,
        doublePeriods: s.doublePeriods,
        daysActive: Array.from(daysFound),
      });
    });
  });

  const totalSlots = 6 * nperiods;
  const freePeriods = Math.max(0, totalSlots - totalAssignedPeriods);
  const freePercentage = totalSlots > 0 ? Math.round((freePeriods / totalSlots) * 100) : 100;
  const utilization = totalSlots > 0 ? Math.round((totalAssignedPeriods / totalSlots) * 100) : 0;

  // 2. Summary Workload KPI Table
  const summaryHead = [['Faculty ID & Name', 'Assigned Classes', 'Total Workload', 'Free Periods', 'Utilization Rate']];
  const summaryBody = [
    [
      `[${teacher.id}] ${teacher.name}`,
      `${classAssignments.length} Class(es)`,
      `${totalAssignedPeriods} Periods / Wk`,
      `${freePeriods} / ${totalSlots} (${freePercentage}% Free)`,
      `${utilization}% Active Load`,
    ],
  ];

  renderAutoTable(doc, {
    startY: A4_NORMAL_MARGIN_MM + 15,
    head: summaryHead,
    body: summaryBody,
    styles: {
      font: 'times',
    },
    headStyles: {
      fillColor: [60, 50, 190],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: [215, 220, 240],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { font: 'times', fontStyle: 'bold' },
      2: { font: 'times', fontStyle: 'bold', textColor: [60, 50, 190] },
      3: { font: 'times', fontStyle: 'bold', textColor: [16, 160, 110] },
    },
    margin: A4_MARGIN_BOX,
  });

  // 3. Weekly Timetable Grid for Teacher
  let currentY = ((doc as any).lastAutoTable?.finalY || 60) + 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Weekly Teaching & Free Periods Distribution Schedule', A4_NORMAL_MARGIN_MM, currentY);

  const gridHead = [['Period & Time', ...DAYS]];
  const gridBody: string[][] = [];

  for (let p = 0; p < nperiods; p++) {
    const periodEntry = periodsList[p];
    const timeLabel = periodEntry ? `${periodEntry.startTime || ''}-${periodEntry.endTime || ''}` : '';
    const row = [`P${p + 1}${timeLabel ? `\n(${timeLabel})` : ''}`];

    DAYS.forEach((_, di) => {
      let cellText = 'FREE';
      for (const cls of classes) {
        const si = tt[cls.name]?.[di]?.[p];
        if (si !== undefined && si !== null) {
          const subj = cls.subjects[si];
          if (subj && subj.teacherId === teacher.id) {
            cellText = `${cls.name}\n${subj.subjectName}`;
            break;
          }
        }
      }
      row.push(cellText);
    });

    gridBody.push(row);
  }

  renderAutoTable(doc, {
    startY: currentY + 3,
    head: gridHead,
    body: gridBody,
    styles: {
      font: 'times',
    },
    headStyles: {
      fillColor: [45, 55, 75],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: {
      font: 'times',
      fontSize: 7.8,
      cellPadding: 2,
      lineColor: [215, 220, 240],
      lineWidth: 0.25,
      valign: 'middle',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: {
        fillColor: [240, 244, 250],
        font: 'times',
        fontStyle: 'bold',
        cellWidth: 24,
        textColor: [50, 65, 90],
      },
    },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.column.index > 0) {
        if (data.cell.raw === 'FREE') {
          data.cell.styles.textColor = [16, 160, 110];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [25, 35, 55];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 242, 255];
        }
      }
    },
    margin: A4_MARGIN_BOX,
  });

  // 4. Assigned Subject Classes Summary (add page if remaining space inside bottom margin is tight)
  currentY = ((doc as any).lastAutoTable?.finalY || 140) + 6;
  if (currentY > A4_LANDSCAPE_HEIGHT_MM - A4_NORMAL_MARGIN_MM - 24) {
    doc.addPage('a4', 'landscape');
    currentY = A4_NORMAL_MARGIN_MM + 5;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Specific Subject Classes & Allocation Details', A4_NORMAL_MARGIN_MM, currentY);

  const subjectHead = [['Class Name', 'Subject Name', 'Assigned Periods / Wk', 'Double Periods', 'Days Active']];
  const subjectBody = classAssignments.map((a) => [
    a.className,
    a.subjectName,
    `${a.assignedPeriods} periods`,
    a.doublePeriods ? `${a.doublePeriods} double(s)` : 'None',
    a.daysActive.join(', ') || 'Scheduled across week',
  ]);

  if (subjectBody.length === 0) {
    subjectBody.push(['—', 'No subjects assigned', '0', 'None', '—']);
  }

  renderAutoTable(doc, {
    startY: currentY + 3,
    head: subjectHead,
    body: subjectBody,
    styles: {
      font: 'times',
    },
    headStyles: {
      fillColor: [80, 85, 210],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [215, 220, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { font: 'times', fontStyle: 'bold' },
      2: { font: 'times', fontStyle: 'bold', halign: 'center' },
      3: { font: 'times', halign: 'center' },
    },
    margin: A4_MARGIN_BOX,
  });

  const fileName = `Teacher_Report_${teacher.id}_${teacher.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export function exportFreePeriodsReportPDF(
  teachers: Teacher[],
  classes: ClassEntry[],
  schedule: ScheduleEntry[],
  tt: TimetableGrid,
  institutionName: string = 'SchoolGrid Timetable System',
  academicYear: string = '2026–2027'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const allSchedules = getAllTeachersFreeSchedules(teachers, classes, tt, nperiods);

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 150, 100);
  doc.text(`Faculty Free Periods & Availability Roster`, A4_NORMAL_MARGIN_MM, A4_NORMAL_MARGIN_MM + 5);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 90, 120);
  doc.text(
    `${institutionName} · Academic Year: ${academicYear} · Generated on ${new Date().toLocaleDateString()}`,
    A4_NORMAL_MARGIN_MM,
    A4_NORMAL_MARGIN_MM + 11
  );

  const head = [
    [
      'ID',
      'Faculty Name',
      'Dept / Subject',
      'Free Slots',
      ...DAYS.map((d) => d.slice(0, 3)),
    ],
  ];

  const body: string[][] = [];

  allSchedules.forEach((s) => {
    const row = [
      s.teacher.id,
      s.teacher.name || '—',
      s.teacher.department || s.teacher.specialization || 'General',
      `${s.freePeriodsCount} / ${s.totalPeriods} (${s.freePercentage}%)`,
    ];

    DAYS.forEach((_, di) => {
      const freeSlots = s.freePeriodsByDay[di] || [];
      if (freeSlots.length === 0) {
        row.push('Full');
      } else {
        row.push(freeSlots.map((p) => `P${p + 1}`).join(', '));
      }
    });

    body.push(row);
  });

  if (body.length === 0) {
    body.push(['—', 'No teachers registered', '—', '—', '—', '—', '—', '—', '—', '—']);
  }

  renderAutoTable(doc, {
    startY: A4_NORMAL_MARGIN_MM + 15,
    head,
    body,
    styles: {
      font: 'times',
    },
    headStyles: {
      fillColor: [16, 150, 100],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 8.2,
      cellPadding: 2.8,
      lineColor: [215, 220, 240],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { font: 'times', fontStyle: 'bold', cellWidth: 16 },
      1: { font: 'times', fontStyle: 'bold', cellWidth: 34 },
      2: { font: 'times', cellWidth: 28 },
      3: { font: 'times', halign: 'center', fontStyle: 'bold', cellWidth: 30 },
    },
    margin: A4_MARGIN_BOX,
  });

  doc.save(`Faculty_Free_Periods_Roster_${new Date().toISOString().slice(0, 10)}.pdf`);
}

