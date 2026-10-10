// app.js - هسته مدیریت داده‌ها و منطق سامانه کلاس ششم الف

// تاریخ روز به فرمت شمسی استاندارد
function getTodayShamsiString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d).split('/');
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

// متغیرهای ذخیره‌سازی محلی
let students = JSON.parse(localStorage.getItem('cls6_students')) || (typeof OFFICIAL_STUDENTS !== 'undefined' ? OFFICIAL_STUDENTS : []);
let attendanceHistory = JSON.parse(localStorage.getItem('cls6_att_history')) || {};
let homeworkSessions = JSON.parse(localStorage.getItem('cls6_hw_sessions')) || [];
let activeHwId = localStorage.getItem('cls6_active_hw_id') || null;
let studentNotes = JSON.parse(localStorage.getItem('cls6_student_notes')) || {};
let activeProfileStudentId = null;
let evalSessions = JSON.parse(localStorage.getItem('cls6_eval_sessions')) || {};
let classGroups = JSON.parse(localStorage.getItem('cls6_groups')) || [];
let pickedList = JSON.parse(localStorage.getItem('cls6_picked')) || [];
let currentAttendanceDate = getTodayShamsiString();

function persistState() {
  localStorage.setItem('cls6_students', JSON.stringify(students));
  localStorage.setItem('cls6_att_history', JSON.stringify(attendanceHistory));
  localStorage.setItem('cls6_hw_sessions', JSON.stringify(homeworkSessions));
  localStorage.setItem('cls6_active_hw_id', activeHwId);
  localStorage.setItem('cls6_eval_sessions', JSON.stringify(evalSessions));
  localStorage.setItem('cls6_student_notes', JSON.stringify(studentNotes));
  localStorage.setItem('cls6_groups', JSON.stringify(classGroups));
  localStorage.setItem('cls6_picked', JSON.stringify(pickedList));
}

function showToast(msg, icon = '✅') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;
  el.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => el.classList.add('translate-y-20', 'opacity-0'), 2500);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// مدیریت تعویض تب‌ها
function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('bg-white', 'text-indigo-800', 'font-extrabold', 'shadow-sm');
    b.classList.add('text-white/80');
  });

  const targetSec = document.getElementById('section-' + id);
  if (targetSec) targetSec.classList.remove('hidden');

  const curBtn = document.getElementById('tab-' + id);
  if (curBtn) {
    curBtn.classList.remove('text-white/80');
    curBtn.classList.add('bg-white', 'text-indigo-800', 'font-extrabold', 'shadow-sm');
  }

  if (id === 'homework') renderHomeworkView();
  if (id === 'attendance') renderAttendanceView();
  if (id === 'gamification') renderLeaderboard();
  if (id === 'groups') renderGroupsView();
  if (id === 'eval') renderEvalSection();
  if (id === 'roster') renderRoster();
  if (id === 'parent-msg') renderParentMsgView();
}
// فرهنگ نام دروس
const SUBJECT_MAP = {
  all: 'مجموع کل',
  math: 'ریاضی',
  persian: 'فارسی',
  science: 'علوم',
  quran: 'قرآن و هدیه‌ها',
  social: 'مطالعات',
  thinking: 'تفکر',
  general: 'عمومی/اخلاق'
};

// دریافت مثبت‌های یک درس مشخص یا مجموع کل دروس
function getStudentPoints(student, subject = 'all') {
  if (!student.subjectPoints) student.subjectPoints = {};

  // اگر مجموع کل خواسته شده باشد، فقط جمع درس‌ها برگردانده می‌شود
  if (subject === 'all') {
    return Object.values(student.subjectPoints).reduce((a, b) => a + b, 0);
  }
  return student.subjectPoints[subject] || 0;
}

// ثبت مثبت با تفکیک درس
function addPoints(studentId, delta, subject = null) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;

  // اگر درس مشخص نشده بود، از فیلتر جاری یا درس عمومی استفاده می‌شود
  if (!subject) {
    const filter = document.getElementById('leaderboardSubjectFilter')?.value;
    subject = (filter && filter !== 'all') ? filter : 'general';
  }

  if (!s.subjectPoints) s.subjectPoints = {};
  s.subjectPoints[subject] = (s.subjectPoints[subject] || 0) + delta;
  
  // بروزرسانی مجموع کلی
s.points = getStudentPoints(s, 'all');

  persistState();
  const subName = SUBJECT_MAP[subject] || 'کلاسی';
  showToast(`${delta > 0 ? '+۱ مثبت' : '-۱ منفی'} در درس «${subName}» برای ${s.name} ثبت شد.`);

  const gamSec = document.getElementById('section-gamification');
  if (gamSec && !gamSec.classList.contains('hidden')) renderLeaderboard();

  const rosSec = document.getElementById('section-roster');
  if (rosSec && !rosSec.classList.contains('hidden')) renderRoster();
}

// رندر تابلوی مثبت‌ها با پشتیبانی از فیلتر درس
function renderLeaderboard() {
  const grid = document.getElementById('leaderboardGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const currentSubject = document.getElementById('leaderboardSubjectFilter')?.value || 'all';
  
  // مرتب‌سازی دانش‌آموزان بر اساس نمره درس فیلترشده
  const sorted = [...students].sort((a, b) => getStudentPoints(b, currentSubject) - getStudentPoints(a, currentSubject));

  sorted.forEach((s, idx) => {
    const pts = getStudentPoints(s, currentSubject);
    let rankBadge = `${idx + 1}`;
    let borderClass = 'border-slate-200';
    if (idx === 0) { rankBadge = '🥇'; borderClass = 'border-amber-400 bg-amber-50/40'; }
    else if (idx === 1) { rankBadge = '🥈'; borderClass = 'border-slate-300 bg-slate-50/60'; }
    else if (idx === 2) { rankBadge = '🥉'; borderClass = 'border-amber-600/40 bg-amber-50/30'; }

    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${borderClass} shadow-sm flex items-center justify-between bg-white`;
    item.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'text-base' : 'bg-slate-100 text-slate-600'}">
          ${rankBadge}
        </span>
        <div>
          <div class="font-extrabold text-xs text-slate-800">${s.name}</div>
          <div class="text-[10px] text-slate-400">
            ${currentSubject === 'all' ? `فرزند: ${s.father}` : `درس: ${SUBJECT_MAP[currentSubject]}`}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="addPoints(${s.id}, 1, '${currentSubject === 'all' ? 'general' : currentSubject}')" class="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black transition active:scale-90">+</button>
        <span class="font-black text-xs min-w-[24px] text-center font-mono ${pts > 0 ? 'text-emerald-700' : pts < 0 ? 'text-rose-600' : 'text-slate-600'}">${pts}</span>
        <button onclick="addPoints(${s.id}, -1, '${currentSubject === 'all' ? 'general' : currentSubject}')" class="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-black transition active:scale-90">-</button>
      </div>
    `;
    grid.appendChild(item);
  });
}

function resetAllPointsPrompt() {
  if (confirm('آیا مایلید مثبت‌ها و امتیازات همه دانش‌آموزان برای آغاز دوره جدید صفر شود؟')) {
    students.forEach(s => {
      s.points = 0;
      s.subjectPoints = {}; // ریست شدن مثبت‌های هر درس
    });
    persistState();
    renderLeaderboard();
    showToast('کلیه مثبت‌ها صفر شدند.');
  }
}

// ==========================================
// ماژول تکالیف کلاسی
// ==========================================
function initDefaultHomeworkIfEmpty() {
  if (homeworkSessions.length === 0) {
    const defaultHw = {
      id: 'hw_' + Date.now(),
      subject: 'ریاضی',
      title: 'حل کار در کلاس و تمرین ص ۲۴ (کسرها)',
      date: getTodayShamsiString(),
      records: {}
    };
    students.forEach(s => { defaultHw.records[s.id] = { status: 'انجام داده', note: '' }; });
    homeworkSessions.push(defaultHw);
    activeHwId = defaultHw.id;
    persistState();
  }
  if (!activeHwId && homeworkSessions.length > 0) {
    activeHwId = homeworkSessions[0].id;
  }
}

function renderHomeworkView() {
  initDefaultHomeworkIfEmpty();
  const listEl = document.getElementById('hwSessionList');
  if (!listEl) return;
  listEl.innerHTML = '';

  homeworkSessions.forEach(hw => {
    const isActive = hw.id === activeHwId;
    const total = students.length;
    const done = Object.values(hw.records || {}).filter(r => r.status === 'انجام داده').length;
    const item = document.createElement('div');
    item.className = `p-3 rounded-xl border cursor-pointer transition ${isActive ? 'bg-indigo-50/80 border-indigo-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`;
    item.onclick = () => { activeHwId = hw.id; persistState(); renderHomeworkView(); };
    item.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-extrabold text-xs text-indigo-700">${hw.subject}</span>
        <span class="text-[10px] text-slate-400 font-mono">${hw.date}</span>
      </div>
      <div class="font-bold text-xs text-slate-800 mt-1 line-clamp-1">${hw.title}</div>
      <div class="flex items-center justify-between text-[10px] text-slate-500 mt-2">
        <span>انجام شده: <strong>${done}/${total}</strong></span>
        <span class="px-1.5 py-0.5 rounded font-mono font-bold ${done === total ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
          ${Math.round((done / (total || 1)) * 100)}%
        </span>
      </div>
    `;
    listEl.appendChild(item);
  });

  renderActiveHwTable();
}

function renderActiveHwTable() {
  const activeHw = homeworkSessions.find(h => h.id === activeHwId);
  if (!activeHw) return;

  document.getElementById('activeHwSubjectBadge').innerText = activeHw.subject;
  document.getElementById('activeHwTitle').innerText = activeHw.title;
  
  const doneCount = Object.values(activeHw.records || {}).filter(r => r.status === 'انجام داده').length;
  const incompleteCount = Object.values(activeHw.records || {}).filter(r => r.status === 'ناقص').length;
  const notDoneCount = Object.values(activeHw.records || {}).filter(r => r.status === 'انجام نداده').length;

  document.getElementById('activeHwMeta').innerText = `تاریخ: ${activeHw.date} • ${doneCount} انجام شده | ${incompleteCount} ناقص | ${notDoneCount} انجام‌نشده`;

  const tbody = document.getElementById('hwTableBody');
  tbody.innerHTML = '';

  students.forEach((s, idx) => {
    const rec = (activeHw.records && activeHw.records[s.id]) || { status: 'انجام داده', note: '' };
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-3 text-center font-bold text-slate-500">${idx + 1}</td>
      <td class="p-3">
        <div class="font-extrabold text-slate-800">${s.name}</div>
        <div class="text-[10px] text-slate-400">پدر: ${s.father}</div>
      </td>
      <td class="p-3 text-center">
        <div class="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
          <button onclick="setStudentHwStatus(${s.id}, 'انجام داده')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'انجام داده' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">انجام شده</button>
          <button onclick="setStudentHwStatus(${s.id}, 'ناقص')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'ناقص' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">ناقص</button>
          <button onclick="setStudentHwStatus(${s.id}, 'انجام نداده')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'انجام نداده' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">نداده</button>
        </div>
      </td>
      <td class="p-3">
        <input type="text" value="${rec.note || ''}" onchange="setStudentHwNote(${s.id}, this.value)" placeholder="بازخورد برای اولیا..." class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none text-xs">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function createHomeworkSession() {
  const subject = document.getElementById('newHwSubject').value;
  const title = document.getElementById('newHwTitle').value.trim();
  const date = document.getElementById('newHwDate').value.trim() || getTodayShamsiString();

  if (!title) return alert('لطفاً عنوان تکلیف را وارد کنید.');

  const newHw = { id: 'hw_' + Date.now(), subject, title, date, records: {} };
  students.forEach(s => { newHw.records[s.id] = { status: 'انجام داده', note: '' }; });

  homeworkSessions.unshift(newHw);
  activeHwId = newHw.id;
  persistState();
  closeModal('newHwModal');
  renderHomeworkView();
  showToast('تکلیف جدید ثبت شد.');
}

function markAllActiveHw(status) {
  const hw = homeworkSessions.find(h => h.id === activeHwId);
  if (!hw) return;
  students.forEach(s => {
    if (!hw.records[s.id]) hw.records[s.id] = { note: '' };
    hw.records[s.id].status = status;
  });
  persistState();
  renderActiveHwTable();
  renderHomeworkView();
  showToast('همه تکالیف تأیید شدند.');
}

function setStudentHwStatus(studentId, status) {
  const hw = homeworkSessions.find(h => h.id === activeHwId);
  if (!hw) return;
  if (!hw.records[studentId]) hw.records[studentId] = { note: '' };
  hw.records[studentId].status = status;
  persistState();
  renderActiveHwTable();
  showToast('وضعیت تکلیف بروز شد.');
}

function setStudentHwNote(studentId, note) {
  const hw = homeworkSessions.find(h => h.id === activeHwId);
  if (!hw) return;
  if (!hw.records[studentId]) hw.records[studentId] = { status: 'انجام داده' };
  hw.records[studentId].note = note;
  persistState();
  showToast('یادداشت تکلیف ذخیره شد.');
}

function deleteActiveHomework() {
  if (!confirm('آیا از حذف این جلسه تکلیف اطمینان دارید؟')) return;
  homeworkSessions = homeworkSessions.filter(h => h.id !== activeHwId);
  activeHwId = homeworkSessions.length > 0 ? homeworkSessions[0].id : null;
  persistState();
  renderHomeworkView();
  showToast('جلسه تکلیف حذف گردید.', '🗑️');
}

// ==========================================
// ماژول تقویم و حضور و غیاب
// ==========================================
function getAttendanceForDate(dStr) {
  if (!attendanceHistory[dStr]) {
    attendanceHistory[dStr] = {};
    students.forEach(s => { attendanceHistory[dStr][s.id] = { status: 'حاضر', note: '' }; });
    persistState();
  }
  return attendanceHistory[dStr];
}

function renderAttendanceView() {
  document.getElementById('attCurrentDate').value = currentAttendanceDate;
  const dayData = getAttendanceForDate(currentAttendanceDate);
  
  let present = 0, absent = 0, late = 0;
  students.forEach(s => {
    const st = (dayData[s.id] && dayData[s.id].status) || 'حاضر';
    if (st === 'حاضر') present++;
    else if (st === 'غایب') absent++;
    else if (st === 'تاخیر') late++;
  });

  document.getElementById('statPresent').innerText = present;
  document.getElementById('statAbsent').innerText = absent;
  document.getElementById('statLate').innerText = late;

  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '';

  students.forEach((s, idx) => {
    const rec = dayData[s.id] || { status: 'حاضر', note: '' };
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-3 text-center font-bold text-slate-500">${idx + 1}</td>
      <td class="p-3">
        <div class="font-extrabold text-slate-800">${s.name}</div>
        <div class="text-[10px] text-slate-400">پدر: ${s.father}</div>
      </td>
      <td class="p-3 text-center">
        <div class="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
          <button onclick="setStudentAttStatus(${s.id}, 'حاضر')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'حاضر' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">حاضر</button>
          <button onclick="setStudentAttStatus(${s.id}, 'غایب')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'غایب' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">غایب</button>
          <button onclick="setStudentAttStatus(${s.id}, 'تاخیر')" class="px-2.5 py-1 rounded-lg text-xs font-black transition ${rec.status === 'تاخیر' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">تاخیر</button>
        </div>
      </td>
      <td class="p-3">
        <input type="text" value="${rec.note || ''}" onchange="setStudentAttNote(${s.id}, this.value)" placeholder="ثبت علت موجه یا زمان تاخیر..." class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none text-xs">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setStudentAttStatus(studentId, status) {
  const dayData = getAttendanceForDate(currentAttendanceDate);
  if (!dayData[studentId]) dayData[studentId] = { note: '' };
  dayData[studentId].status = status;
  persistState();
  renderAttendanceView();
  showToast(`وضعیت ${status} ثبت گردید.`);
}

function setStudentAttNote(studentId, note) {
  const dayData = getAttendanceForDate(currentAttendanceDate);
  if (!dayData[studentId]) dayData[studentId] = { status: 'حاضر' };
  dayData[studentId].note = note;
  persistState();
  showToast('یادداشت حضور و غیاب ذخیره شد.');
}

function markAllAttendance(status) {
  const dayData = getAttendanceForDate(currentAttendanceDate);
  students.forEach(s => {
    if (!dayData[s.id]) dayData[s.id] = { note: '' };
    dayData[s.id].status = status;
  });
  persistState();
  renderAttendanceView();
  showToast('همه دانش‌آموزان به عنوان حاضر ثبت شدند.');
}

let dayOffset = 0;
function changeAttendanceDay(delta) {
  dayOffset += delta;
  currentAttendanceDate = getTodayShamsiString(dayOffset);
  renderAttendanceView();
}

function setAttendanceToToday() {
  dayOffset = 0;
  currentAttendanceDate = getTodayShamsiString();
  renderAttendanceView();
}

// ==========================================
// ماژول گروه‌بندی تعاملی
// ==========================================
function initDefaultGroupsIfEmpty() {
  if (classGroups.length === 0) autoGenerateGroups();
}

function autoGenerateGroups() {
  const groupCount = parseInt(document.getElementById('groupCountSelect')?.value) || 8;
  const shuffled = [...students].sort(() => 0.5 - Math.random());
  const newGroups = [];
  const defaultNames = ['بوعلی سینا', 'ابوریحان بیرونی', 'خوارزمی', 'خیام', 'فارابی', 'زکریای رازی', 'حافظ', 'سعدی', 'فردوسی', 'شهریار'];

  for (let i = 0; i < groupCount; i++) {
    newGroups.push({
      id: 'grp_' + (i + 1),
      name: `گروه ${defaultNames[i] || (i + 1)}`,
      studentIds: []
    });
  }

  shuffled.forEach((s, idx) => {
    newGroups[idx % groupCount].studentIds.push(s.id);
  });

  classGroups = newGroups;
  persistState();
  renderGroupsView();
  showToast('گروه‌بندی خودکار انجام شد.');
}

function renderGroupsView() {
  initDefaultGroupsIfEmpty();
  const grid = document.getElementById('groupsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  document.getElementById('groupTotalBadge').innerText = classGroups.length;

  classGroups.forEach(group => {
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between";

    let membersHtml = '';
    group.studentIds.forEach(sId => {
      const s = students.find(x => x.id === sId);
      if (!s) return;

      let moveOptions = `<option value="">انتقال به...</option>`;
      classGroups.forEach(og => {
        if (og.id !== group.id) moveOptions += `<option value="${og.id}">${og.name}</option>`;
      });

      membersHtml += `
        <li class="py-1.5 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0">
          <span class="font-bold text-slate-800 text-xs">${s.name}</span>
          <select onchange="moveStudentGroup(${s.id}, '${group.id}', this.value)" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none">
            ${moveOptions}
          </select>
        </li>
      `;
    });

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between border-b pb-2 mb-2">
          <input type="text" value="${group.name}" onchange="renameGroup('${group.id}', this.value)" class="font-black text-xs text-indigo-700 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-600 focus:outline-none w-3/4">
          <span class="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full">${group.studentIds.length} نفر</span>
        </div>
        <ul class="divide-y divide-slate-100 max-h-56 overflow-y-auto custom-scroll pr-1">
          ${membersHtml || '<li class="text-[11px] text-slate-400 py-3 text-center">عضوی ندارد</li>'}
        </ul>
      </div>
      <div class="pt-2 border-t flex justify-end">
        <button onclick="deleteGroup('${group.id}')" class="text-[10px] text-rose-600 hover:underline font-bold">حذف این گروه</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renameGroup(groupId, newName) {
  const g = classGroups.find(x => x.id === groupId);
  if (g) { g.name = newName; persistState(); showToast('نام گروه تغییر یافت.'); }
}

function moveStudentGroup(studentId, fromGroupId, toGroupId) {
  if (!toGroupId) return;
  const fromG = classGroups.find(x => x.id === fromGroupId);
  const toG = classGroups.find(x => x.id === toGroupId);
  if (fromG && toG) {
    fromG.studentIds = fromG.studentIds.filter(id => id !== studentId);
    toG.studentIds.push(studentId);
    persistState();
    renderGroupsView();
    showToast('دانش‌آموز جابه‌جا شد.');
  }
}

function addNewCustomGroup() {
  classGroups.push({ id: 'grp_' + Date.now(), name: `گروه جدید ${classGroups.length + 1}`, studentIds: [] });
  persistState();
  renderGroupsView();
  showToast('گروه جدید اضافه شد.');
}

function deleteGroup(groupId) {
  if (classGroups.length <= 1) return alert('حداقل یک گروه باید وجود داشته باشد.');
  if (!confirm('اعضای گروه به سایر گروه‌ها منتقل شوند؟')) return;
  const targetG = classGroups.find(g => g.id === groupId);
  const remainingG = classGroups.find(g => g.id !== groupId);
  if (targetG && remainingG) {
    remainingG.studentIds.push(...targetG.studentIds);
    classGroups = classGroups.filter(g => g.id !== groupId);
    persistState();
    renderGroupsView();
    showToast('گروه حذف شد.');
  }
}

// ==========================================
// ماژول جلسات ارزشیابی و نمرات
// ==========================================
function initDefaultEvalIfEmpty() {
  const subjects = ['math', 'persian', 'science', 'quran', 'social', 'thinking', 'tech'];
  subjects.forEach(sub => {
    if (!evalSessions[sub] || evalSessions[sub].length === 0) {
      evalSessions[sub] = [{ id: 'eval_1', title: 'ارزشیابی آغازین مهرماه', date: '۱۴۰۵/۰۷/۱۰', grades: {} }];
      students.forEach(s => { evalSessions[sub][0].grades[s.id] = { desc: 'خیلی خوب', score: 20, note: '' }; });
    }
  });
  persistState();
}

function renderEvalSection() {
  initDefaultEvalIfEmpty();
  const sub = document.getElementById('evalSubjectSelect').value;
  const sessSelect = document.getElementById('evalSessionSelect');
  sessSelect.innerHTML = '';

  (evalSessions[sub] || []).forEach(sess => {
    const opt = document.createElement('option');
    opt.value = sess.id;
    opt.innerText = `${sess.title} (${sess.date})`;
    sessSelect.appendChild(opt);
  });

  renderEvalTable();
}

function renderEvalTable() {
  const sub = document.getElementById('evalSubjectSelect').value;
  const sessId = document.getElementById('evalSessionSelect').value;
  const sess = (evalSessions[sub] || []).find(s => s.id === sessId);
  const tbody = document.getElementById('evalTableBody');
  tbody.innerHTML = '';
  if (!sess) return;

  students.forEach((s, idx) => {
    const g = (sess.grades && sess.grades[s.id]) || { desc: 'خیلی خوب', score: '', note: '' };
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-3 text-center font-bold text-slate-500">${idx + 1}</td>
      <td class="p-3">
        <div class="font-extrabold text-slate-800">${s.name}</div>
        <div class="text-[10px] text-slate-400 font-mono">کد: ${s.code}</div>
      </td>
      <td class="p-3 text-center">
        <select onchange="updateStudentEvalGrade('${sub}', '${sess.id}', ${s.id}, 'desc', this.value)" class="border rounded-lg px-2 py-1 text-xs font-bold ${
          g.desc === 'خیلی خوب' ? 'bg-emerald-50 text-emerald-700' :
          g.desc === 'خوب' ? 'bg-blue-50 text-blue-700' :
          g.desc === 'قابل قبول' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
        }">
          <option value="خیلی خوب" ${g.desc === 'خیلی خوب' ? 'selected' : ''}>خیلی خوب</option>
          <option value="خوب" ${g.desc === 'خوب' ? 'selected' : ''}>خوب</option>
          <option value="قابل قبول" ${g.desc === 'قابل قبول' ? 'selected' : ''}>قابل قبول</option>
          <option value="نیازمند تلاش" ${g.desc === 'نیازمند تلاش' ? 'selected' : ''}>نیازمند تلاش</option>
        </select>
      </td>
      <td class="p-3 text-center">
        <input type="number" min="0" max="20" step="0.25" value="${g.score !== undefined ? g.score : ''}" onchange="updateStudentEvalGrade('${sub}', '${sess.id}', ${s.id}, 'score', this.value)" class="w-16 border rounded-lg text-center py-1 font-bold font-mono">
      </td>
      <td class="p-3">
        <input type="text" value="${g.note || ''}" onchange="updateStudentEvalGrade('${sub}', '${sess.id}', ${s.id}, 'note', this.value)" placeholder="بازخورد کیفی..." class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none text-xs">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateStudentEvalGrade(sub, sessId, studentId, field, value) {
  const sess = (evalSessions[sub] || []).find(s => s.id === sessId);
  if (!sess) return;
  if (!sess.grades[studentId]) sess.grades[studentId] = {};
  sess.grades[studentId][field] = value;
  persistState();
  showToast('نمره/ارزیابی ثبت گردید.');
}

function createEvalSession() {
  const sub = document.getElementById('evalSubjectSelect').value;
  const title = document.getElementById('newEvalTitle').value.trim();
  const date = document.getElementById('newEvalDate').value.trim() || getTodayShamsiString();

  if (!title) return alert('عنوان ارزشیابی الزامی است.');

  const newSess = { id: 'eval_' + Date.now(), title, date, grades: {} };
  students.forEach(s => { newSess.grades[s.id] = { desc: 'خیلی خوب', score: 20, note: '' }; });

  if (!evalSessions[sub]) evalSessions[sub] = [];
  evalSessions[sub].push(newSess);
  persistState();
  closeModal('newEvalModal');
  renderEvalSection();
  showToast('جلسه ارزشیابی اضافه شد.');
}

function exportEvalToCSV() {
  const sub = document.getElementById('evalSubjectSelect').value;
  const sessId = document.getElementById('evalSessionSelect').value;
  const sess = (evalSessions[sub] || []).find(s => s.id === sessId);
  if (!sess) return;

  let csv = '\uFEFFکد دانش آموزی,نام و نام خانوادگی,نام پدر,سطح توصیفی,نمره عددی,ملاحظات\n';
  students.forEach(s => {
    const g = (sess.grades && sess.grades[s.id]) || { desc: '', score: '', note: '' };
    csv += `"${s.code}","${s.name}","${s.father}","${g.desc}","${g.score}","${g.note || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `کاربرگ_ششم_الف_${sess.title}.csv`;
  link.click();
}

// ==========================================
// ماژول اسامی و پرونده دانش‌آموز
// ==========================================
function renderRoster() {
  const q = (document.getElementById('rosterSearch')?.value || '').trim().toLowerCase();
  const tbody = document.getElementById('rosterTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  students
    .filter(s => s.name.toLowerCase().includes(q) || s.code.includes(q))
    .forEach((s, idx) => {
      let totalAbsents = 0;
      Object.values(attendanceHistory).forEach(day => {
        if (day[s.id] && day[s.id].status === 'غایب') totalAbsents++;
      });

      let totalHwIssues = 0;
      homeworkSessions.forEach(hw => {
        if (hw.records && hw.records[s.id] && (hw.records[s.id].status === 'انجام نداده' || hw.records[s.id].status === 'ناقص')) {
          totalHwIssues++;
        }
      });

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
      tr.innerHTML = `
        <td class="p-3 text-center font-bold text-slate-500">${idx + 1}</td>
        <td class="p-3 font-mono font-bold text-slate-700">${s.code}</td>
        <td class="p-3 font-extrabold text-slate-900">${s.name}</td>
        <td class="p-3 text-slate-600">${s.father}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full font-black text-xs ${s.points > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
            ⭐ ${s.points || 0}
          </span>
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full font-bold ${totalAbsents > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}">
            ${totalAbsents} روز
          </span>
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full font-bold ${totalHwIssues > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
            ${totalHwIssues} مورد
          </span>
        </td>
        <td class="p-3 text-center">
          <button onclick="openStudentProfile(${s.id})" class="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition">
            مشاهده پرونده
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// ==========================================
// موتور پرونده همه‌جانبه دانش‌آموز (Dossier Engine)
// ==========================================
function openStudentProfile(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  activeProfileStudentId = id;

  // ۱. هدر و مشخصات
  document.getElementById('profName').innerText = s.name;
  document.getElementById('profMeta').innerText = `کد دانش‌آموزی: ${s.code} | فرزند: ${s.father}`;
  document.getElementById('profPointsBadge').innerText = `⭐ ${s.points || 0} مثبت کلاسی`;
  document.getElementById('profAvatar').innerText = s.name.charAt(0);
  document.getElementById('newNoteDate').value = getTodayShamsiString();

  // ۲. استخراج آمار غیبت‌ها
  let absCount = 0;
  const absListHtml = [];
  Object.keys(attendanceHistory).sort().reverse().forEach(d => {
    const rec = attendanceHistory[d][s.id];
    if (rec && rec.status !== 'حاضر') {
      if (rec.status === 'غایب') absCount++;
      absListHtml.push(`
        <div class="p-2 rounded-xl bg-white border border-slate-100 flex justify-between items-center">
          <span class="font-mono text-slate-600">${d}</span>
          <span class="px-2 py-0.5 rounded-lg font-bold ${rec.status === 'غایب' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}">
            ${rec.status} ${rec.note ? `(${rec.note})` : ''}
          </span>
        </div>
      `);
    }
  });
  document.getElementById('profStatAbsent').innerText = `${absCount} جلسه`;
  document.getElementById('profLogAbsentCount').innerText = absCount;
  document.getElementById('profLogAbsentList').innerHTML = absListHtml.length > 0 ? absListHtml.join('') : '<div class="text-slate-400 p-3 text-center">هیچ غیبت یا تاخیری ثبت نشده است.</div>';
  const subPts = s.subjectPoints || {};
  const breakdownText = Object.keys(subPts).length > 0 
    ? Object.keys(subPts).map(k => `${SUBJECT_MAP[k]}: ${subPts[k]}`).join(' | ')
    : 'هنوز مثبتی ثبت نشده است';
  
  document.getElementById('profPointsBadge').title = breakdownText;
  document.getElementById('profStatPoints').innerHTML = `
    <span>${getStudentPoints(s, 'all')} امتیاز</span>
    <span class="block text-[9px] text-slate-400 font-normal truncate mt-0.5" title="${breakdownText}">${breakdownText}</span>
  `;

  // ۳. استخراج آمار تکالیف
  let hwIssuesCount = 0;
  const hwListHtml = [];
  homeworkSessions.forEach(hw => {
    const r = hw.records && hw.records[s.id];
    if (r && (r.status === 'انجام نداده' || r.status === 'ناقص')) {
      hwIssuesCount++;
      hwListHtml.push(`
        <div class="p-2 rounded-xl bg-white border border-slate-100 flex justify-between items-center">
          <div>
            <span class="font-bold text-slate-800">${hw.subject}:</span>
            <span class="text-slate-600 mr-1">${hw.title}</span>
            <span class="text-[10px] text-slate-400 font-mono block">${hw.date}</span>
          </div>
          <span class="px-2 py-0.5 rounded-lg font-bold ${r.status === 'انجام نداده' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}">
            ${r.status}
          </span>
        </div>
      `);
    }
  });
  document.getElementById('profStatHw').innerText = `${hwIssuesCount} مورد`;
  document.getElementById('profLogHwCount').innerText = hwIssuesCount;
  document.getElementById('profLogHwList').innerHTML = hwListHtml.length > 0 ? hwListHtml.join('') : '<div class="text-slate-400 p-3 text-center">تمام تکالیف منظم و تحویل‌شده هستند.</div>';

  // ۴. امتیازات و تعداد یادداشت‌ها
renderStudentNotesList(id);

  // ۵. جدول کارنامه همه دروس
  renderStudentGradesTable(id);

  // بازگشت به تب اول پرونده
  switchDossierTab('notes');
  openModal('studentProfileModal');
}

function switchDossierTab(tabId) {
  document.querySelectorAll('.dossier-sec').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.dossier-tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'border-b-2', 'border-indigo-600');
    btn.classList.add('text-slate-500');
  });

  document.getElementById('dossierSec-' + tabId).classList.remove('hidden');
  const cur = document.getElementById('dossierTab-' + tabId);
  cur.classList.remove('text-slate-500');
  cur.classList.add('bg-indigo-50', 'text-indigo-700', 'border-b-2', 'border-indigo-600');
}

function renderStudentNotesList(studentId) {
  const container = document.getElementById('profNotesContainer');
  const notes = studentNotes[studentId] || [];
  document.getElementById('profStatNotes').innerText = `${notes.length} یادداشت`;
  container.innerHTML = '';

  if (notes.length === 0) {
    container.innerHTML = '<div class="text-slate-400 text-xs p-4 text-center border border-dashed rounded-xl">هنوز هیچ یادداشت مشاوره‌ای یا رفتاری برای این دانش‌آموز ثبت نشده است.</div>';
    return;
  }

  notes.slice().reverse().forEach((n, idx) => {
    const realIndex = notes.length - 1 - idx;
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs";
    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">${n.category}</span>
          <span class="text-[10px] text-slate-400 font-mono">${n.date}</span>
        </div>
        <button onclick="deleteStudentNote(${studentId}, ${realIndex})" class="text-rose-500 hover:text-rose-700 text-xs font-bold">حذف</button>
      </div>
      <p class="text-slate-700 leading-relaxed font-medium">${n.text}</p>
    `;
    container.appendChild(card);
  });
}

function saveStudentNote() {
  if (!activeProfileStudentId) return;
  const text = document.getElementById('newNoteText').value.trim();
  const category = document.getElementById('newNoteCategory').value;
  const date = document.getElementById('newNoteDate').value.trim() || getTodayShamsiString();

  if (!text) return alert('متن یادداشت نمی‌تواند خالی باشد.');

  if (!studentNotes[activeProfileStudentId]) studentNotes[activeProfileStudentId] = [];
  studentNotes[activeProfileStudentId].push({ text, category, date, id: Date.now() });

  persistState();
  document.getElementById('newNoteText').value = '';
  renderStudentNotesList(activeProfileStudentId);
  showToast('یادداشت در پرونده ثبت شد.');
}

function deleteStudentNote(studentId, noteIndex) {
  if (!confirm('آیا این یادداشت حذف شود؟')) return;
  studentNotes[studentId].splice(noteIndex, 1);
  persistState();
  renderStudentNotesList(studentId);
  showToast('یادداشت حذف گردید.', '🗑️');
}

function renderStudentGradesTable(studentId) {
  const tbody = document.getElementById('profGradesTableBody');
  tbody.innerHTML = '';
  const subjectTitles = {
    math: 'ریاضی',
    persian: 'فارسی و نگارش',
    science: 'علوم تجربی',
    quran: 'قرآن و هدیه‌ها',
    social: 'مطالعات اجتماعی',
    thinking: 'تفکر و پژوهش',
    tech: 'کار و فناوری'
  };

  Object.keys(subjectTitles).forEach(subKey => {
    const sessions = evalSessions[subKey] || [];
    let lastDesc = '---';
    let lastScore = '---';
    let lastNote = '---';

    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      const g = (lastSession.grades && lastSession.grades[studentId]) || {};
      if (g.desc) lastDesc = g.desc;
      if (g.score !== undefined && g.score !== '') lastScore = g.score;
      if (g.note) lastNote = g.note;
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-3 font-extrabold text-slate-800">${subjectTitles[subKey]}</td>
      <td class="p-3 text-center">
        <span class="px-2.5 py-1 rounded-lg font-bold text-xs ${
          lastDesc === 'خیلی خوب' ? 'bg-emerald-50 text-emerald-700' :
          lastDesc === 'خوب' ? 'bg-blue-50 text-blue-700' :
          lastDesc === 'قابل قبول' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
        }">${lastDesc}</span>
      </td>
      <td class="p-3 text-center font-bold font-mono text-slate-700">${lastScore}</td>
      <td class="p-3 text-slate-500 text-xs">${lastNote}</td>
    `;
    tbody.appendChild(tr);
  });
}

function printStudentDossier() {
  const printContent = document.getElementById('dossierPrintArea').innerHTML;
  const sName = document.getElementById('profName').innerText;
  const sMeta = document.getElementById('profMeta').innerText;

  const printWindow = window.open('', '', 'width=800,height=900');
  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>پرونده کلاسی ${sName}</title>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 20px; direction: rtl; color: #222; }
          h2 { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
          p { color: #666; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 12px; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>کاربرگ جامع پرونده فرآیندی دانش‌آموز: ${sName}</h2>
        <p>${sMeta} • دبستان حاج فیض (پایه ششم الف)</p>
        <hr>
        ${printContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// ==========================================
// گردونه پرسش (همراه با دکمه ثبت مستقیم مثبت)
// ==========================================
let isRolling = false;
function rollPicker() {
  if (isRolling) return;
  const unpicked = students.filter(s => !pickedList.includes(s.id));
  if (unpicked.length === 0) {
    alert('تمام دانش‌آموزان در این دور پاسخ داده‌اند! دور از سر گرفته می‌شود.');
    resetPicker();
    return;
  }

  const selectedSub = document.getElementById('pickerSubjectSelect')?.value || 'math';
  const subName = SUBJECT_MAP[selectedSub] || 'کلاسی';

  isRolling = true;
  const box = document.getElementById('pickerBox');
  let count = 0;
  const interval = setInterval(() => {
    const rand = unpicked[Math.floor(Math.random() * unpicked.length)];
    box.innerHTML = `<span class="text-3xl font-black text-slate-400">${rand.name}</span>`;
    count++;
    if (count > 16) {
      clearInterval(interval);
      const chosen = unpicked[Math.floor(Math.random() * unpicked.length)];
      pickedList.push(chosen.id);
      persistState();
      box.innerHTML = `
        <div class="space-y-2">
          <span class="text-xs bg-indigo-100 text-indigo-800 font-black px-3 py-0.5 rounded-full">نوبت پاسخگویی: درس ${subName}</span>
          <div class="text-3xl font-black text-indigo-700">${chosen.name}</div>
          <div class="text-xs text-slate-500 font-bold">فرزند: ${chosen.father}</div>
          <div class="pt-2 flex justify-center gap-2">
            <button onclick="addPoints(${chosen.id}, 1, '${selectedSub}')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95">
              ⭐ +۱ مثبت در ${subName}
            </button>
          </div>
        </div>
      `;
      document.getElementById('pickedBadge').innerText = pickedList.length;
      isRolling = false;
    }
  }, 70);
}

function resetPicker() {
  pickedList = [];
  persistState();
  document.getElementById('pickedBadge').innerText = 0;
  document.getElementById('pickerBox').innerHTML = '<span class="text-2xl font-black text-indigo-700">آماده برای شروع دور جدید</span>';
}

// ==========================================
// تایمر کلاسی
// ==========================================
let timerSec = 15 * 60;
let timerInt = null;

function formatTimer(s) {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function setTimerSec(sec) {
  clearInterval(timerInt);
  timerInt = null;
  timerSec = sec;
  document.getElementById('timerBtn').innerText = '▶️ شروع زمان';
  document.getElementById('timerText').innerText = formatTimer(timerSec);
}

function toggleTimer() {
  const btn = document.getElementById('timerBtn');
  if (timerInt) {
    clearInterval(timerInt);
    timerInt = null;
    btn.innerText = '▶️ ادامه زمان';
  } else {
    btn.innerText = '⏸️ توقف زمان';
    timerInt = setInterval(() => {
      if (timerSec > 0) {
        timerSec--;
        document.getElementById('timerText').innerText = formatTimer(timerSec);
      } else {
        clearInterval(timerInt);
        timerInt = null;
        btn.innerText = '▶️ شروع مجدد';
        alert('⏰ زمان به پایان رسید!');
      }
    }, 1000);
  }
}

function resetTimer() {
  setTimerSec(15 * 60);
}

// ==========================================
// پشتیبان‌گیری، بازیابی و ریست
// ==========================================
function backupAllData() {
const pack = { students, attendanceHistory, homeworkSessions, evalSessions, classGroups, pickedList, studentNotes };
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup_class6_complete_${Date.now()}.json`;
  a.click();
  showToast('نسخه پشتیبان دریافت شد.');
}

function restorePrompt() {
  const fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.accept = '.json';
  fileInp.onchange = e => {
    const file = e.target.files[0];
    const r = new FileReader();
    r.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.studentNotes) studentNotes = data.studentNotes;
        if (data.students) students = data.students;
        if (data.attendanceHistory) attendanceHistory = data.attendanceHistory;
        if (data.homeworkSessions) homeworkSessions = data.homeworkSessions;
        if (data.evalSessions) evalSessions = data.evalSessions;
        if (data.classGroups) classGroups = data.classGroups;
        if (data.pickedList) pickedList = data.pickedList;
        persistState();
        switchTab('homework');
        showToast('داده‌ها با موفقیت بازیابی شدند.');
      } catch(err) {
        alert('فایل پشتیبان نامعتبر است.');
      }
    };
    r.readAsText(file);
  };
  fileInp.click();
}

function resetAllToDefault() {
  if (confirm('آیا مطمئن هستید؟ تمام داده‌ها به فهرست ۴۰ نفره رسمی دبستان حاج فیض بازنشانی می‌شود.')) {
    localStorage.clear();
    students = (typeof OFFICIAL_STUDENTS !== 'undefined') ? JSON.parse(JSON.stringify(OFFICIAL_STUDENTS)) : [];
    attendanceHistory = {};
    homeworkSessions = [];
    evalSessions = {};
    classGroups = [];
    pickedList = [];
    activeHwId = null;
    persistState();
    location.reload();
  }
}

// مقداردهی اولیه هنگام لود صفحه
window.onload = () => {
  const hwDate = document.getElementById('newHwDate');
  if (hwDate) hwDate.value = getTodayShamsiString();
  const evalDate = document.getElementById('newEvalDate');
  if (evalDate) evalDate.value = getTodayShamsiString();
  initDefaultHomeworkIfEmpty();
  initDefaultGroupsIfEmpty();
  initDefaultEvalIfEmpty();
  switchTab('homework');
};

// ==========================================
// ماژول پیام‌ساز هوشمند شاد و اولیا
// ==========================================
function renderParentMsgView() {
  const select = document.getElementById('msgStudentSelect');
  if (!select) return;
  select.innerHTML = '';

  students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.innerText = `${s.name} (فرزند: ${s.father})`;
    select.appendChild(opt);
  });

  // محاسبه سریع آمار غایبین امروز و تکالیف ناقص
  const todayAtt = attendanceHistory[currentAttendanceDate] || {};
  let todayAbsentsCount = 0;
  students.forEach(s => {
    if (todayAtt[s.id] && todayAtt[s.id].status === 'غایب') todayAbsentsCount++;
  });
  document.getElementById('badgeFastAbsent').innerText = todayAbsentsCount;

  const curHw = homeworkSessions.find(h => h.id === activeHwId);
  let curHwIssuesCount = 0;
  if (curHw && curHw.records) {
    students.forEach(s => {
      const st = curHw.records[s.id]?.status;
      if (st === 'انجام نداده' || st === 'ناقص') curHwIssuesCount++;
    });
  }
  document.getElementById('badgeFastHw').innerText = curHwIssuesCount;

  updateGeneratedMessage();
}

function updateGeneratedMessage() {
  const sId = parseInt(document.getElementById('msgStudentSelect').value);
  const s = students.find(x => x.id === sId);
  if (!s) return;

  const template = document.getElementById('msgTemplateSelect').value;
  const msgBox = document.getElementById('generatedMsgBox');

  // جمع‌آوری آمار واقعی دانش‌آموز
  let totalAbsents = 0;
  Object.values(attendanceHistory).forEach(day => {
    if (day[s.id] && day[s.id].status === 'غایب') totalAbsents++;
  });

  let totalHwIssues = 0;
  homeworkSessions.forEach(hw => {
    const r = hw.records && hw.records[s.id];
    if (r && (r.status === 'انجام نداده' || r.status === 'ناقص')) totalHwIssues++;
  });

  const todayStatus = (attendanceHistory[currentAttendanceDate] && attendanceHistory[currentAttendanceDate][s.id]) || { status: 'حاضر' };
  const curHw = homeworkSessions.find(h => h.id === activeHwId);
  const curHwStatus = (curHw && curHw.records && curHw.records[s.id]) || { status: 'انجام داده' };

  let text = '';

  if (template === 'weekly') {
    text = `بنام خدا
اولیاء محترم دانش‌آموز گرامی «${s.name}»
با سلام و احترام؛

گزارش روند آموزشی و تربیتی فرزندتان در پایه ششم الف (دبستان حاج فیض) تا تاریخ ${currentAttendanceDate}:
🔹 وضعیت مثبت‌ها و تلاش کلاسی: ${s.points || 0} امتیاز
🔹 مجموع جلسات غیبت ثبت‌شده: ${totalAbsents} روز
🔹 وضعیت پیگیری و تحویل تکالیف: ${totalHwIssues === 0 ? 'بسیار منظم و کامل' : `${totalHwIssues} مورد نقص یا عدم تحویل`}

خواهشمند است جهت تثبیت مفاهیم، نظارت بر استمرار یادگیری و تمرینات منزل را مدنظر قرار دهید.
با تشکر - کمالی (آموزگار ششم)`;
  } 
  else if (template === 'today_absent') {
    text = `بنام خدا
اولیاء محترم دانش‌آموز گرامی «${s.name}»
با سلام و احترام؛

به استحضار می‌رساند فرزندتان در تاریخ امروز (${currentAttendanceDate}) در کلاس درس حاضر نبوده است.
لطفاً جهت ثبت دلیل غیبت و پیگیری تکالیف تدریس‌شده امروز، در پیام‌رسان شاد اطلاع‌رسانی فرمایید.

با تشکر - دبستان حاج فیض (ششم الف)`;
  } 
  else if (template === 'homework_warning') {
    text = `بنام خدا
اولیاء محترم دانش‌آموز گرامی «${s.name}»
با سلام؛

به اطلاع می‌رساند در جلسه آموزشی اخیر، وضعیت تکلیف درس (${curHw ? curHw.subject : 'مربوطه'}) فرزندتان «${curHwStatus.status}» ثبت گردیده است.
عنوان تکلیف: ${curHw ? curHw.title : 'تمرین کلاسی'}

لطفاً ضمن بررسی دفتر فرزندتان، بر تکمیل و اصلاح آن نظارت فرمایید تا در جلسه آتی مورد ارزیابی قرار گیرد.
با احترام - کمالی`;
  } 
  else if (template === 'encourage') {
    text = `بنام خدا
اولیاء ارجمند دانش‌آموز توانمند «${s.name}»
با سلام و احترام؛

بدین‌وسیله از تلاش، انضباط و مشارکت فعال فرزندتان در کلاس درس و کسب ${s.points || 0} امتیاز مثبت تشکر و قدردانی می‌شود. استمرار این روند موجب شکوفایی هرچه بیشتر ایشان در امتحانات نهایی پایه ششم خواهد بود.

با آرزوی موفقیت روزافزون - کمالی (آموزگار پایه ششم)`;
  }

  msgBox.value = text;
  document.getElementById('msgCharCount').innerText = `تعداد حروف: ${text.length}`;
}

function copyGeneratedMessage() {
  const msgBox = document.getElementById('generatedMsgBox');
  navigator.clipboard.writeText(msgBox.value).then(() => {
    showToast('متن پیام در کلیپ‌بورد کپی شد (آماده ارسال در شاد)');
  });
}

function loadFastMessages(type) {
  const container = document.getElementById('fastMsgContainer');
  const list = document.getElementById('fastMsgList');
  const title = document.getElementById('fastMsgTitle');
  list.innerHTML = '';
  container.classList.remove('hidden');

  if (type === 'absent') {
    title.innerText = `🚨 لیست غایبین امروز (${currentAttendanceDate}) جهت اطلاع‌رسانی به اولیا:`;
    const todayAtt = attendanceHistory[currentAttendanceDate] || {};
    const absents = students.filter(s => todayAtt[s.id] && todayAtt[s.id].status === 'غایب');

    if (absents.length === 0) {
      list.innerHTML = '<span class="text-xs text-emerald-600 font-bold p-2">هیچ غایبی برای امروز ثبت نشده است.</span>';
      return;
    }

    absents.forEach(s => {
      const card = document.createElement('div');
      card.className = "p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 flex justify-between items-center text-xs";
      const quickTxt = `اولیاء گرامی «${s.name}»، فرزندتان در تاریخ ${currentAttendanceDate} در کلاس حضور نداشته است. لطفاً علت غیبت را در شاد اعلام فرمایید.`;
      card.innerHTML = `
        <span class="font-extrabold text-slate-800">${s.name} (پدر: ${s.father})</span>
        <button onclick="navigator.clipboard.writeText('${quickTxt}').then(() => showToast('متن غیبت ${s.name} کپی شد'))" class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-sm">
          📋 کپی پیام غیبت
        </button>
      `;
      list.appendChild(card);
    });
  } else if (type === 'hw_issues') {
    title.innerText = '📝 لیست کسانی که در تکلیف جاری نقص داشته‌اند:';
    const curHw = homeworkSessions.find(h => h.id === activeHwId);
    if (!curHw || !curHw.records) return;

    const issues = students.filter(s => {
      const st = curHw.records[s.id]?.status;
      return st === 'انجام نداده' || st === 'ناقص';
    });

    if (issues.length === 0) {
      list.innerHTML = '<span class="text-xs text-emerald-600 font-bold p-2">همه دانش‌آموزان تکلیف را کامل انجام داده‌اند.</span>';
      return;
    }

    issues.forEach(s => {
      const st = curHw.records[s.id]?.status;
      const card = document.createElement('div');
      card.className = "p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex justify-between items-center text-xs";
      const quickTxt = `اولیاء گرامی «${s.name}»، تکلیف درس ${curHw.subject} (${curHw.title}) فرزندتان «${st}» ثبت گردید. لطفاً بر تکمیل آن نظارت فرمایید.`;
      card.innerHTML = `
        <div>
          <span class="font-extrabold text-slate-800">${s.name}</span>
          <span class="text-[10px] text-amber-800 font-bold mr-1">(${st})</span>
        </div>
        <button onclick="navigator.clipboard.writeText('${quickTxt}').then(() => showToast('پیام تکلیف ${s.name} کپی شد'))" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-sm">
          📋 کپی پیام تکلیف
        </button>
      `;
      list.appendChild(card);
    });
  }
}