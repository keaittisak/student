const STORAGE_KEY = "class-score-live-timer-v7";

const sampleData = {
  term: "1/2569",
  students: [
    { id: "s1", no: 1, name: "กมลชนก ศรีสุข" },
    { id: "s2", no: 2, name: "ธนกฤต ใจดี" },
    { id: "s3", no: 3, name: "ปวริศา แสงทอง" },
    { id: "s4", no: 4, name: "ภูริณัฐ วงศ์ชัย" },
    { id: "s5", no: 5, name: "มนัสวี แก้วใส" },
    { id: "s6", no: 6, name: "อาทิตยา นิ่มนวล" }
  ],
  assignments: [
    {
      id: "a1",
      title: "งานท้ายคาบ",
      max: 10,
      durationMinutes: 30,
      startedAt: "",
      endsAt: ""
    }
  ],
  submissions: {
    s1: { a1: { submittedAt: "" } },
    s2: { a1: { submittedAt: "" } },
    s3: { a1: { submittedAt: "" } },
    s4: { a1: { submittedAt: "" } },
    s5: { a1: { submittedAt: "" } },
    s6: { a1: { submittedAt: "" } }
  }
};

let state = loadState();

const elements = {
  tabs: document.querySelectorAll(".nav-tab"),
  pages: document.querySelectorAll(".page"),
  summarySearch: document.querySelector("#summary-search"),
  termInput: document.querySelector("#term-input"),
  entrySearch: document.querySelector("#entry-search"),
  statusFilter: document.querySelector("#status-filter"),
  assignmentTitleInput: document.querySelector("#assignment-title-input"),
  assignmentMaxInput: document.querySelector("#assignment-max-input"),
  assignmentDurationInput: document.querySelector("#assignment-duration-input"),
  assignmentDeadlineInput: document.querySelector("#assignment-deadline-input"),
  liveClock: document.querySelector("#live-clock"),
  timerStart: document.querySelector("#timer-start"),
  timerEnd: document.querySelector("#timer-end"),
  timerRemaining: document.querySelector("#timer-remaining"),
  startAssignment: document.querySelector("#start-assignment"),
  resetAssignment: document.querySelector("#reset-assignment"),
  summaryHead: document.querySelector("#summary-head"),
  summaryBody: document.querySelector("#summary-body"),
  entryList: document.querySelector("#entry-list"),
  assignmentMeta: document.querySelector("#assignment-meta"),
  insights: document.querySelector("#assignment-insights"),
  studentCount: document.querySelector("#student-count"),
  averageScore: document.querySelector("#average-score"),
  totalMaxA: document.querySelector("#total-max-a"),
  completeCount: document.querySelector("#complete-count"),
  followCount: document.querySelector("#follow-count"),
  exportCsv: document.querySelector("#export-csv"),
  resetData: document.querySelector("#reset-data"),
  addStudent: document.querySelector("#add-student"),
  addAssignment: document.querySelector("#add-assignment"),
  markAllSubmitted: document.querySelector("#mark-all-submitted"),
  studentDialog: document.querySelector("#student-dialog"),
  newStudentNo: document.querySelector("#new-student-no"),
  newStudentName: document.querySelector("#new-student-name"),
  saveStudent: document.querySelector("#save-student")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(structuredClone(sampleData));

  try {
    const parsed = JSON.parse(saved);
    if (!parsed.submissions || !parsed.assignments) return normalizeState(structuredClone(sampleData));
    return normalizeState(parsed);
  } catch {
    return normalizeState(structuredClone(sampleData));
  }
}

function normalizeState(rawState) {
  const next = {
    students: Array.isArray(rawState.students) ? rawState.students : [],
    assignments: Array.isArray(rawState.assignments) ? rawState.assignments : [],
    submissions: rawState.submissions && typeof rawState.submissions === "object" ? rawState.submissions : {},
    currentAssignmentId: rawState.currentAssignmentId || "",
    term: rawState.term || sampleData.term
  };

  if (!next.assignments.length) {
    next.assignments.push(structuredClone(sampleData.assignments[0]));
  }

  next.assignments = next.assignments.map((assignment, index) => {
    const normalized = { ...assignment };
    normalized.id = normalized.id || `a${index + 1}`;
    normalized.title = normalized.title || "งานท้ายคาบ";
    normalized.max = Number(normalized.max || 10);
    normalized.durationMinutes = Number(normalized.durationMinutes || normalized.fullMinutes || 30);
    normalized.startedAt = normalized.startedAt || normalized.startAt || "";
    normalized.endsAt = normalized.endsAt || (normalized.startedAt ? addMinutesToInputValue(normalized.startedAt, normalized.durationMinutes) : "");
    return normalized;
  });

  if (!next.currentAssignmentId || !next.assignments.some((assignment) => assignment.id === next.currentAssignmentId)) {
    next.currentAssignmentId = next.assignments[next.assignments.length - 1].id;
  }

  next.students.forEach((student) => {
    if (!next.submissions[student.id]) next.submissions[student.id] = {};
    const studentSubmissions = {};
    next.assignments.forEach((assignment) => {
      const current = next.submissions[student.id][assignment.id] || {};
      studentSubmissions[assignment.id] = {
        submittedAt: current.submittedAt || "",
        confirmed: Boolean(current.confirmed),
        confirmedScore: current.confirmedScore === undefined ? null : Number(current.confirmedScore),
        confirmedAt: current.confirmedAt || "",
        confirmedSubmittedAt: current.confirmedSubmittedAt || "",
        confirmedStatus: current.confirmedStatus || ""
      };
    });
    next.submissions[student.id] = studentSubmissions;
  });

  return next;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function blankAssignment() {
  return {
    id: `a${Date.now()}`,
    title: "งานใหม่",
    max: 10,
    durationMinutes: 30,
    startedAt: "",
    endsAt: ""
  };
}

function resetAllScores() {
  const assignment = blankAssignment();
  state.assignments = [assignment];
  state.currentAssignmentId = assignment.id;
  state.submissions = {};
  state.students.forEach((student) => {
    state.submissions[student.id] = {};
    getSubmission(student.id, assignment.id);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalInputValue(date, includeSeconds = true) {
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const seconds = includeSeconds ? `:${pad2(date.getSeconds())}` : "";
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join("-") + `T${time}${seconds}`;
}

function parseLocalInputValue(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nowLocalInputValue() {
  return toLocalInputValue(new Date());
}

function addMinutesToInputValue(inputValue, minutes) {
  const date = parseLocalInputValue(inputValue);
  if (!date) return "";
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return toLocalInputValue(date);
}

function minutesBetween(startValue, endValue) {
  const startDate = parseLocalInputValue(startValue);
  const endDate = parseLocalInputValue(endValue);
  if (!startDate || !endDate) return 0;
  const start = startDate.getTime();
  const end = endDate.getTime();
  return Math.max(1, Math.round((end - start) / 60000));
}

function secondsBetween(startValue, endValue) {
  const startDate = parseLocalInputValue(startValue);
  const endDate = parseLocalInputValue(endValue);
  if (!startDate || !endDate) return null;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
}

function secondsBetweenNow(value) {
  const target = parseLocalInputValue(value);
  if (!target) return null;
  return Math.round((target.getTime() - Date.now()) / 1000);
}

function totalMax() {
  return gradebookAssignments().reduce((sum, assignment) => sum + Number(assignment.max), 0);
}

function selectedAssignment() {
  if (!state.assignments.length) {
    const assignment = blankAssignment();
    state.assignments.push(assignment);
    state.currentAssignmentId = assignment.id;
  }
  return state.assignments.find((assignment) => assignment.id === state.currentAssignmentId) || state.assignments[state.assignments.length - 1];
}

function getSubmission(studentId, assignmentId) {
  if (!state.submissions[studentId]) state.submissions[studentId] = {};
  if (!state.submissions[studentId][assignmentId]) {
    state.submissions[studentId][assignmentId] = {
      submittedAt: "",
      confirmed: false,
      confirmedScore: null,
      confirmedAt: "",
      confirmedSubmittedAt: "",
      confirmedStatus: ""
    };
  }
  return state.submissions[studentId][assignmentId];
}

function createBlankAssignment() {
  const assignment = blankAssignment();
  assignment.title = elements.assignmentTitleInput?.value?.trim() || assignment.title;
  assignment.max = Math.max(1, Number(elements.assignmentMaxInput?.value || assignment.max));
  assignment.durationMinutes = Math.max(1, Number(elements.assignmentDurationInput?.value || assignment.durationMinutes));
  return assignment;
}

function gradebookAssignments() {
  return state.assignments.filter((assignment) =>
    state.students.some((student) => getSubmission(student.id, assignment.id).confirmed)
  );
}

function hasConfirmedScores(assignmentId) {
  return state.students.some((student) => getSubmission(student.id, assignmentId).confirmed);
}

function switchToNewAssignment() {
  const assignment = createBlankAssignment();
  state.assignments.push(assignment);
  state.currentAssignmentId = assignment.id;
  state.students.forEach((student) => getSubmission(student.id, assignment.id));
  saveState();
  renderAll();
}

function elapsedMinutes(assignment, submittedAt) {
  if (!assignment.startedAt || !submittedAt) return null;
  const start = parseLocalInputValue(assignment.startedAt);
  const end = parseLocalInputValue(submittedAt);
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function elapsedSeconds(assignment, submittedAt) {
  if (!assignment.startedAt || !submittedAt) return null;
  return secondsBetween(assignment.startedAt, submittedAt);
}

function calculateScore(assignment, submittedAt) {
  const elapsed = elapsedSeconds(assignment, submittedAt);
  if (elapsed === null || !assignment.endsAt) return 0;

  const max = Number(assignment.max);
  const durationSeconds = Math.max(1, Math.round(Number(assignment.durationMinutes || 1) * 60));
  const submittedDate = parseLocalInputValue(submittedAt);
  const endDate = parseLocalInputValue(assignment.endsAt);
  if (!submittedDate || !endDate) return 0;
  const submittedTime = submittedDate.getTime();
  const endTime = endDate.getTime();

  if (submittedTime <= endTime) return max;

  const raw = max * (durationSeconds / Math.max(durationSeconds + 1, elapsed));
  return Math.max(0, Math.round(raw * 10) / 10);
}

function submissionStatus(assignment, submittedAt) {
  if (!submittedAt) return { label: "ยังไม่ส่ง", className: "danger", key: "missing" };
  if (!assignment.endsAt) return { label: "รอเริ่ม", className: "warn", key: "pending" };
  const submittedDate = parseLocalInputValue(submittedAt);
  const endDate = parseLocalInputValue(assignment.endsAt);
  if (!submittedDate || !endDate) return { label: "เวลาผิด", className: "danger", key: "missing" };
  const submittedTime = submittedDate.getTime();
  const endTime = endDate.getTime();
  if (submittedTime <= endTime) return { label: "ทันเวลา", className: "good", key: "on-time" };
  return { label: "ส่งช้า", className: "warn", key: "late" };
}

function studentTotal(studentId) {
  return gradebookAssignments().reduce((sum, assignment) => {
    const item = getSubmission(studentId, assignment.id);
    return sum + (item.confirmed ? Number(item.confirmedScore || 0) : 0);
  }, 0);
}

function missingCount(studentId) {
  return gradebookAssignments().filter((assignment) => !getSubmission(studentId, assignment.id).confirmed).length;
}

function percent(value, max) {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}

function formatScore(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMinutes(value) {
  if (value === null || value === undefined) return "-";
  if (value < 60) return `${value} นาที`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
}

function formatElapsedSeconds(value) {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  if (hours) return `${hours} ชม. ${pad2(minutes)} นาที`;
  if (minutes) return `${minutes} นาที ${pad2(seconds)} วิ`;
  return `${seconds} วิ`;
}

function formatDurationSeconds(totalSeconds) {
  if (totalSeconds === null) return "--";
  const prefix = totalSeconds < 0 ? "เลยเวลา " : "";
  const seconds = Math.abs(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  if (hours) return `${prefix}${hours} ชม. ${String(minutes).padStart(2, "0")} นาที`;
  return `${prefix}${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatThaiDateTime(value, withSeconds = false) {
  if (!value) return "-";
  const date = parseLocalInputValue(value);
  if (!date) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined
  });
}

function scoreStatus(total, max, missing) {
  const rate = percent(total, max);
  if (missing > 0) return { label: "ยังมีค้างส่ง", className: "danger" };
  if (rate >= 85) return { label: "ตรงเวลาดี", className: "good" };
  if (rate >= 60) return { label: "มีส่งช้าบ้าง", className: "warn" };
  return { label: "ควรติดตาม", className: "danger" };
}

function allSubmissionStats() {
  const stats = { submitted: 0, onTime: 0, late: 0, missing: 0 };
  const assignments = gradebookAssignments();
  state.students.forEach((student) => {
    assignments.forEach((assignment) => {
      const item = getSubmission(student.id, assignment.id);
      if (!item.confirmed) {
        stats.missing += 1;
      } else {
        stats.submitted += 1;
        if (item.confirmedStatus === "on-time") stats.onTime += 1;
        if (item.confirmedStatus === "late") stats.late += 1;
      }
    });
  });
  return stats;
}

function renderDashboard() {
  const query = elements.summarySearch.value.trim().toLowerCase();
  const assignments = gradebookAssignments();
  const max = totalMax();
  const rows = state.students
    .map((student) => {
      const total = studentTotal(student.id);
      const missing = missingCount(student.id);
      return { ...student, total, missing, rate: percent(total, max) };
    })
    .filter((student) => student.name.toLowerCase().includes(query) || String(student.no).includes(query))
    .sort((a, b) => b.total - a.total);

  elements.summaryHead.innerHTML = `
    <tr>
      <th>เลขที่</th>
      <th>นักเรียน</th>
      ${assignments.map((assignment) => `<th>${escapeHtml(assignment.title)}<br>${assignment.max} คะแนน</th>`).join("")}
      <th>รวม</th>
      <th>ความคืบหน้า</th>
      <th>สถานะ</th>
    </tr>
  `;

  elements.summaryBody.innerHTML = rows
    .map((student) => {
      const status = scoreStatus(student.total, max, student.missing);
      return `
        <tr>
          <td>${student.no}</td>
          <td class="student-name">${escapeHtml(student.name)}</td>
          ${assignments
            .map((assignment) => {
              const item = getSubmission(student.id, assignment.id);
              return `
                <td class="score-cell">
                  <span>${item.confirmed ? `${formatScore(Number(item.confirmedScore || 0))}/${assignment.max}` : "-"}</span>
                  <small class="confirm-state ${item.confirmed ? "confirmed" : "unconfirmed"}">${item.confirmed ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}</small>
                </td>
              `;
            })
            .join("")}
          <td class="score-cell">${formatScore(student.total)}/${max}</td>
          <td>
            <div class="progress" aria-label="${student.rate}%">
              <span style="width: ${student.rate}%"></span>
            </div>
          </td>
          <td><span class="badge ${status.className}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");

  const totals = state.students.map((student) => studentTotal(student.id));
  const average = totals.length ? totals.reduce((sum, score) => sum + score, 0) / totals.length : 0;
  const stats = allSubmissionStats();

  elements.studentCount.textContent = state.students.length;
  elements.averageScore.textContent = formatScore(Math.round(average * 10) / 10);
  elements.totalMaxA.textContent = max;
  elements.completeCount.textContent = stats.onTime;
  elements.followCount.textContent = stats.late + stats.missing;

  renderInsights();
}

function renderInsights() {
  const items = gradebookAssignments().map((assignment) => {
    const rows = state.students.map((student) => {
      const item = getSubmission(student.id, assignment.id);
      const elapsed = item.confirmed ? elapsedMinutes(assignment, item.confirmedSubmittedAt || item.submittedAt) : null;
      const status = item.confirmed
        ? { key: item.confirmedStatus || "missing" }
        : { key: "missing" };
      return { elapsed, status };
    });
    const submittedRows = rows.filter((row) => row.elapsed !== null);
    const onTime = rows.filter((row) => row.status.key === "on-time").length;
    const late = rows.filter((row) => row.status.key === "late").length;
    const missing = rows.filter((row) => row.status.key === "missing").length;
    const averageElapsed = submittedRows.length
      ? Math.round(submittedRows.reduce((sum, row) => sum + row.elapsed, 0) / submittedRows.length)
      : null;

    return { ...assignment, onTime, late, missing, averageElapsed };
  });

  if (!items.length) {
    elements.insights.innerHTML = `
      <article class="empty-insight">
        <strong>ยังไม่มีคะแนนที่ยืนยัน</strong>
        <span>กดยืนยันคะแนนในหน้ากรอกเวลาส่งงาน แล้ว Dashboard จะสรุปจังหวะเวลาส่งงานให้ทันที</span>
      </article>
    `;
    return;
  }

  const totalSlots = items.length * state.students.length || 1;
  const totals = items.reduce(
    (sum, assignment) => ({
      onTime: sum.onTime + assignment.onTime,
      late: sum.late + assignment.late,
      missing: sum.missing + assignment.missing
    }),
    { onTime: 0, late: 0, missing: 0 }
  );
  const submitted = totals.onTime + totals.late;
  const onTimeRate = percent(totals.onTime, totalSlots);
  const lateRate = percent(totals.late, totalSlots);
  const missingRate = Math.max(0, 100 - onTimeRate - lateRate);
  const averageElapsed = (() => {
    const values = items.map((assignment) => assignment.averageElapsed).filter((value) => value !== null);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  })();

  elements.insights.innerHTML = `
    <div class="insight-dashboard">
      <div class="timing-hero">
        <div class="donut" style="--on:${onTimeRate}; --late:${lateRate}; --missing:${missingRate}">
          <strong>${onTimeRate}%</strong>
          <span>ทันเวลา</span>
        </div>
        <div class="timing-copy">
          <strong>${submitted}/${totalSlots}</strong>
          <span>รายการที่มีการส่งงานแล้ว</span>
        </div>
      </div>

      <div class="timing-metrics">
        <div>
          <span>ทันเวลา</span>
          <strong>${totals.onTime}</strong>
        </div>
        <div>
          <span>ส่งช้า</span>
          <strong>${totals.late}</strong>
        </div>
        <div>
          <span>ยังไม่ส่ง</span>
          <strong>${totals.missing}</strong>
        </div>
        <div>
          <span>เวลาเฉลี่ย</span>
          <strong>${formatMinutes(averageElapsed)}</strong>
        </div>
      </div>

      <div class="timing-breakdown" aria-label="สัดส่วนการส่งงานทั้งหมด">
        <span class="on-time" style="width: ${onTimeRate}%"></span>
        <span class="late" style="width: ${lateRate}%"></span>
        <span class="missing" style="width: ${missingRate}%"></span>
      </div>

      <div class="assignment-dashboard-list">
        ${items
          .map((assignment) => {
            const total = state.students.length || 1;
            const onTimeWidth = percent(assignment.onTime, total);
            const lateWidth = percent(assignment.late, total);
            const missingWidth = Math.max(0, 100 - onTimeWidth - lateWidth);
            return `
              <article class="assignment-card">
                <div class="assignment-card-head">
                  <strong>${escapeHtml(assignment.title)}</strong>
                  <span>${onTimeWidth}% ทันเวลา</span>
                </div>
                <div class="timing-breakdown small" aria-label="ทันเวลา ${assignment.onTime} ส่งช้า ${assignment.late} ยังไม่ส่ง ${assignment.missing}">
                  <span class="on-time" style="width: ${onTimeWidth}%"></span>
                  <span class="late" style="width: ${lateWidth}%"></span>
                  <span class="missing" style="width: ${missingWidth}%"></span>
                </div>
                <div class="assignment-stats">
                  <span>ทัน ${assignment.onTime}</span>
                  <span>ช้า ${assignment.late}</span>
                  <span>ค้าง ${assignment.missing}</span>
                  <span>เฉลี่ย ${formatMinutes(assignment.averageElapsed)}</span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function syncAssignmentControls(assignment) {
  elements.assignmentTitleInput.value = assignment.title;
  elements.assignmentMaxInput.value = assignment.max;
  elements.assignmentDurationInput.value = assignment.durationMinutes;
  elements.assignmentDeadlineInput.value = assignment.endsAt || "";
}

function renderTimer() {
  const assignment = selectedAssignment();
  const now = new Date();
  elements.liveClock.textContent = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  if (!assignment) {
    elements.timerStart.textContent = "ยังไม่มีงาน";
    elements.timerEnd.textContent = "ยังไม่กำหนด";
    elements.timerRemaining.textContent = "--";
    return;
  }

  elements.timerStart.textContent = assignment.startedAt ? formatThaiDateTime(assignment.startedAt, true) : "ยังไม่เริ่ม";
  elements.timerEnd.textContent = assignment.endsAt ? formatThaiDateTime(assignment.endsAt, true) : "ยังไม่กำหนด";
  elements.timerRemaining.textContent = assignment.endsAt ? formatDurationSeconds(secondsBetweenNow(assignment.endsAt)) : "--";
}

function renderEntry() {
  const assignment = selectedAssignment();
  if (!assignment) {
    elements.entryList.innerHTML = "";
    elements.assignmentMeta.textContent = "ยังไม่มีงาน";
    elements.assignmentTitleInput.value = "";
    elements.assignmentMaxInput.value = "";
    elements.assignmentDurationInput.value = "";
    elements.assignmentDeadlineInput.value = "";
    renderTimer();
    return;
  }

  syncAssignmentControls(assignment);
  renderTimer();

  const query = elements.entrySearch.value.trim().toLowerCase();
  const filter = elements.statusFilter.value;
  elements.assignmentMeta.textContent =
    `${assignment.title} | เต็ม ${assignment.max} คะแนน | ให้ทำ ${assignment.durationMinutes} นาที | สิ้นสุด ${formatThaiDateTime(assignment.endsAt, true)}`;

  const rows = state.students
    .filter((student) => student.name.toLowerCase().includes(query) || String(student.no).includes(query))
    .filter((student) => {
      const item = getSubmission(student.id, assignment.id);
      const status = submissionStatus(assignment, item.submittedAt);
      if (filter === "on-time") return status.key === "on-time";
      if (filter === "late") return status.key === "late";
      if (filter === "missing") return status.key === "missing";
      return true;
    });

  elements.entryList.innerHTML = rows
    .map((student) => {
      const item = getSubmission(student.id, assignment.id);
      const elapsed = elapsedSeconds(assignment, item.submittedAt);
      const score = calculateScore(assignment, item.submittedAt);
      const status = submissionStatus(assignment, item.submittedAt);
      const confirmedText = item.confirmed ? `ยืนยัน ${formatScore(Number(item.confirmedScore || 0))}/${assignment.max}` : "ยังไม่ยืนยัน";
      const confirmedClass = item.confirmed ? "confirmed" : "unconfirmed";
      return `
        <article class="entry-row timed-row" data-student-id="${student.id}">
          <div class="student-main">
            <strong>${student.no}</strong>
            <div class="student-name">${escapeHtml(student.name)}</div>
          </div>
          <div class="submission-controls">
            <label class="submitted-at-field">
              <span>เวลาส่งจริง</span>
              <input class="submitted-at-input" type="datetime-local" step="1" value="${item.submittedAt || ""}" />
            </label>
            <button class="secondary-btn submit-now" type="button">ส่งตอนนี้</button>
            <div class="status-cell">
              <span class="badge ${status.className}">${status.label}</span>
              <small class="time-note">${formatElapsedSeconds(elapsed)}</small>
            </div>
            <div class="score-cell-view">
              <strong class="computed-score">${item.submittedAt ? `${formatScore(score)}/${assignment.max}` : "-"}</strong>
              <small class="confirm-state ${confirmedClass}">${confirmedText}</small>
            </div>
            <button class="primary-btn confirm-score" type="button">ยืนยัน</button>
            <button class="ghost-btn danger-btn delete-student" type="button" title="ลบนักเรียน">ลบ</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  elements.termInput.value = state.term || "";
  renderDashboard();
  renderEntry();
}

function updateSubmissionFromRow(row) {
  const studentId = row.dataset.studentId;
  const assignmentId = selectedAssignment().id;
  const item = getSubmission(studentId, assignmentId);
  const submittedAt = row.querySelector(".submitted-at-input").value;
  const timeChanged = item.confirmed && submittedAt !== item.confirmedSubmittedAt;
  item.submittedAt = submittedAt;
  if (timeChanged) {
    item.confirmed = false;
    item.confirmedScore = null;
    item.confirmedAt = "";
    item.confirmedSubmittedAt = "";
    item.confirmedStatus = "";
  }
  saveState();
  renderDashboard();
}

function updateSelectedAssignment() {
  const assignment = selectedAssignment();
  if (!assignment) return;
  assignment.title = elements.assignmentTitleInput.value.trim() || assignment.title;
  assignment.max = Math.max(1, Number(elements.assignmentMaxInput.value || 1));
  assignment.durationMinutes = Math.max(1, Number(elements.assignmentDurationInput.value || 1));
  if (assignment.startedAt) {
    assignment.endsAt = addMinutesToInputValue(assignment.startedAt, assignment.durationMinutes);
  }
  saveState();
  renderDashboard();
  renderEntry();
}

function startSelectedAssignment() {
  const assignment = selectedAssignment();
  if (!assignment) return;
  if (hasConfirmedScores(assignment.id)) {
    switchToNewAssignment();
    return startSelectedAssignment();
  }
  assignment.title = elements.assignmentTitleInput.value.trim() || assignment.title;
  assignment.max = Math.max(1, Number(elements.assignmentMaxInput.value || 1));
  assignment.durationMinutes = Math.max(1, Number(elements.assignmentDurationInput.value || 1));
  assignment.startedAt = nowLocalInputValue();
  assignment.endsAt = addMinutesToInputValue(assignment.startedAt, assignment.durationMinutes);
  elements.assignmentDeadlineInput.value = assignment.endsAt;
  saveState();
  renderAll();
}

function resetSelectedAssignment() {
  const assignment = selectedAssignment();
  if (!assignment) return;
  if (hasConfirmedScores(assignment.id)) {
    switchToNewAssignment();
    return;
  }
  assignment.startedAt = "";
  assignment.endsAt = "";
  state.students.forEach((student) => {
    const item = getSubmission(student.id, assignment.id);
    item.submittedAt = "";
    item.confirmed = false;
    item.confirmedScore = null;
    item.confirmedAt = "";
    item.confirmedSubmittedAt = "";
    item.confirmedStatus = "";
  });
  saveState();
  renderAll();
}

function confirmStudentScore(row) {
  const assignment = selectedAssignment();
  const studentId = row.dataset.studentId;
  const item = getSubmission(studentId, assignment.id);
  const submittedAt = row.querySelector(".submitted-at-input").value;
  if (!submittedAt) {
    window.alert("กรุณาบันทึกเวลาส่งก่อนยืนยันคะแนน");
    return;
  }
  item.submittedAt = submittedAt;
  item.confirmed = true;
  item.confirmedScore = calculateScore(assignment, submittedAt);
  item.confirmedAt = nowLocalInputValue();
  item.confirmedSubmittedAt = submittedAt;
  item.confirmedStatus = submissionStatus(assignment, submittedAt).key;
  saveState();
  renderAll();
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportSummaryCsv() {
  const assignments = gradebookAssignments();
  if (!assignments.length) {
    window.alert("ยังไม่มีคะแนนที่ยืนยันสำหรับส่งออก CSV");
    return;
  }

  const header = [
    "ภาคเรียน",
    "เลขที่",
    "ชื่อนักเรียน",
    ...assignments.flatMap((assignment) => [
      `${assignment.title} (${assignment.max})`,
      `${assignment.title} สถานะ`,
      `${assignment.title} เวลาส่ง`
    ]),
    "คะแนนรวม",
    "คะแนนเต็มรวม"
  ];

  const rows = state.students
    .slice()
    .sort((a, b) => a.no - b.no)
    .map((student) => {
      const total = studentTotal(student.id);
      return [
        state.term || "",
        student.no,
        student.name,
        ...assignments.flatMap((assignment) => {
          const item = getSubmission(student.id, assignment.id);
          return [
            item.confirmed ? formatScore(Number(item.confirmedScore || 0)) : "",
            item.confirmed ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน",
            item.confirmedSubmittedAt || item.submittedAt || ""
          ];
        }),
        formatScore(total),
        totalMax()
      ];
    });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const term = (state.term || "term").replace(/[^\wก-๙-]+/g, "_");
  link.href = url;
  link.download = `summary_scores_${term}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function deleteStudent(studentId) {
  const student = state.students.find((item) => item.id === studentId);
  if (student && !window.confirm(`ลบนักเรียน ${student.name} ออกจากรายชื่อ?`)) return;
  state.students = state.students.filter((student) => student.id !== studentId);
  delete state.submissions[studentId];
  saveState();
  renderAll();
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    elements.tabs.forEach((item) => item.classList.remove("active"));
    elements.pages.forEach((page) => page.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.page}-page`).classList.add("active");
    renderAll();
  });
});

elements.summarySearch.addEventListener("input", renderDashboard);
elements.exportCsv.addEventListener("click", exportSummaryCsv);
elements.termInput.addEventListener("input", () => {
  state.term = elements.termInput.value.trim();
  saveState();
});
elements.entrySearch.addEventListener("input", renderEntry);
elements.statusFilter.addEventListener("change", renderEntry);
elements.startAssignment.addEventListener("click", startSelectedAssignment);
elements.resetAssignment.addEventListener("click", resetSelectedAssignment);

elements.assignmentTitleInput.addEventListener("change", updateSelectedAssignment);
elements.assignmentMaxInput.addEventListener("change", updateSelectedAssignment);
elements.assignmentDurationInput.addEventListener("change", updateSelectedAssignment);

elements.entryList.addEventListener("input", (event) => {
  const row = event.target.closest(".entry-row");
  if (!row || event.target.classList.contains("delete-student") || event.target.classList.contains("confirm-score")) return;
  updateSubmissionFromRow(row);
});

elements.entryList.addEventListener("change", (event) => {
  const row = event.target.closest(".entry-row");
  if (!row) return;
  updateSubmissionFromRow(row);
  renderEntry();
});

elements.entryList.addEventListener("click", (event) => {
  const confirmButton = event.target.closest(".confirm-score");
  if (confirmButton) {
    confirmStudentScore(confirmButton.closest(".entry-row"));
    return;
  }

  const submitButton = event.target.closest(".submit-now");
  if (submitButton) {
    const row = submitButton.closest(".entry-row");
    row.querySelector(".submitted-at-input").value = nowLocalInputValue();
    updateSubmissionFromRow(row);
    renderEntry();
    return;
  }

  const deleteButton = event.target.closest(".delete-student");
  if (!deleteButton) return;
  const row = deleteButton.closest(".entry-row");
  deleteStudent(row.dataset.studentId);
});

elements.markAllSubmitted.addEventListener("click", () => {
  const assignmentId = selectedAssignment().id;
  const now = nowLocalInputValue();
  state.students.forEach((student) => {
    const item = getSubmission(student.id, assignmentId);
    if (!item.submittedAt) item.submittedAt = now;
  });
  saveState();
  renderAll();
});

elements.resetData.addEventListener("click", () => {
  if (!window.confirm("รีเซ็ตคะแนนทั้งหมดและล้างใบงานทั้งหมด? รายชื่อนักเรียนและภาคเรียนจะยังอยู่")) return;
  resetAllScores();
  saveState();
  renderAll();
});

elements.addStudent.addEventListener("click", () => {
  elements.newStudentNo.value = state.students.length + 1;
  elements.newStudentName.value = "";
  elements.studentDialog.showModal();
});

elements.addAssignment.addEventListener("click", switchToNewAssignment);

elements.saveStudent.addEventListener("click", () => {
  const no = Number(elements.newStudentNo.value);
  const name = elements.newStudentName.value.trim();
  if (!no || !name) return;
  const id = `s${Date.now()}`;
  state.students.push({ id, no, name });
  state.students.sort((a, b) => a.no - b.no);
  state.submissions[id] = {};
  state.assignments.forEach((assignment) => getSubmission(id, assignment.id));
  saveState();
  elements.studentDialog.close();
  renderAll();
});

renderAll();
setInterval(renderTimer, 1000);
