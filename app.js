const STORAGE_KEY = 'studyflow-tasks-v1';
const SUBJECTS_KEY = 'studyflow-subjects-v1';
const UPDATES_URL = './data/updates.json';

const SUBJECTS = [
  'Matematika 1',
  'Matematika 2',
  'Matematika 3',
  'Diskretne matematičke strukture',
  'Numerička analiza',
  'Elementi teorije algoritama',
  'Matematika i muzika',
  'Matematička logika i primene',
  'Matematički softverski paketi',
  'Osnovi kompjuterske geometrije',
  'Uvod u matematičko programiranje',
  'Opšte obaveštenje',
];

const LOCAL_UPDATES = [
  {
    id: '944',
    subject: 'Matematika 2',
    title: 'Prijave za polaganje usmenih ispita iz Matematike 2 - septembarski ispitni rok',
    date: '01.09.2026.',
    deadline: 'najkasnije do 02.09.',
    url: 'https://math.fon.bg.ac.rs/aktivnosti/944',
  },
  {
    id: '943',
    subject: 'Matematika 1',
    title: 'Prijave za polaganje usmenih ispita iz Matematike 1 - septembarski ispitni rok',
    date: '01.09.2026.',
    deadline: 'najkasnije do 01.09. do 23:59',
    url: 'https://math.fon.bg.ac.rs/aktivnosti/943',
  },
  {
    id: '940',
    subject: 'Diskretne matematičke strukture',
    title: 'Prijave za polaganje usmenog ispita iz Diskretnih matematičkih struktura - septembarski ispitni rok',
    date: '29.08.2026.',
    deadline: 'najkasnije do 29.08. do 23:59',
    url: 'https://math.fon.bg.ac.rs/aktivnosti/940',
  },
  {
    id: '936',
    subject: 'Matematika 1',
    title: 'Prijave za polaganje pismenog ispita iz Matematike 1 - septembarski ispitni rok',
    date: '26.08.2026.',
    deadline: 'najkasnije do 27.08.',
    url: 'https://math.fon.bg.ac.rs/aktivnosti/936',
  },
];

const elements = {
  todayLabel: document.querySelector('#today-label'),
  progressRing: document.querySelector('#progress-ring'),
  progressValue: document.querySelector('#progress-value'),
  openCount: document.querySelector('#open-count'),
  dueCount: document.querySelector('#due-count'),
  doneCount: document.querySelector('#done-count'),
  taskList: document.querySelector('#task-list'),
  emptyState: document.querySelector('#empty-state'),
  template: document.querySelector('#task-template'),
  dialog: document.querySelector('#task-dialog'),
  form: document.querySelector('#task-form'),
  title: document.querySelector('#task-title'),
  subject: document.querySelector('#task-subject'),
  date: document.querySelector('#task-date'),
  priority: document.querySelector('#task-priority'),
  subjectOptions: document.querySelector('#subject-options'),
  subjectCount: document.querySelector('#subject-count'),
  updatesList: document.querySelector('#updates-list'),
  updatesStatus: document.querySelector('#updates-status'),
  refreshUpdates: document.querySelector('#refresh-updates'),
};

let tasks = loadTasks();
let activeFilter = 'all';
let selectedSubjects = loadSubjects();

function loadSubjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUBJECTS_KEY));
    return Array.isArray(saved) ? saved : ['Matematika 1', 'Opšte obaveštenje'];
  } catch {
    return ['Matematika 1', 'Opšte obaveštenje'];
  }
}

function renderSubjectOptions() {
  elements.subjectOptions.replaceChildren();
  SUBJECTS.forEach((subject) => {
    const label = document.createElement('label');
    label.className = 'subject-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = subject;
    input.checked = selectedSubjects.includes(subject);
    input.addEventListener('change', () => {
      selectedSubjects = [...elements.subjectOptions.querySelectorAll('input:checked')].map((item) => item.value);
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(selectedSubjects));
      updateSubjectCount();
      loadDepartmentUpdates();
    });
    label.append(input, document.createTextNode(subject));
    elements.subjectOptions.append(label);
  });
  updateSubjectCount();
}

function updateSubjectCount() {
  elements.subjectCount.textContent = `(${selectedSubjects.length})`;
}

function isFromLast30Days(update) {
  const match = update.date?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return false;
  const published = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return published >= thirtyDaysAgo && published <= today;
}

function isDeadlinePassed(update) {
  if (!update.deadline) return false;
  const deadlineDate = update.deadline.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
  if (!deadlineDate) return false;
  const publishedYear = update.date?.match(/\b(\d{4})\b/)?.[1];
  const year = Number(deadlineDate[3] || publishedYear || new Date().getFullYear());
  const month = Number(deadlineDate[2]) - 1;
  const day = Number(deadlineDate[1]);
  const time = update.deadline.match(/(?:do\s*)?(\d{1,2})[:.](\d{2})(?!\.)/i);
  const hour = time ? Number(time[1]) : 23;
  const minute = time ? Number(time[2]) : 59;
  return new Date() > new Date(year, month, day, hour, minute, 59);
}

function renderDepartmentUpdates(updates) {
  elements.updatesList.replaceChildren();
  updates.forEach((update) => {
    const item = document.createElement('li');
    item.className = 'update-item';
    const expired = isDeadlinePassed(update);
    item.classList.toggle('expired', expired);
    const link = document.createElement('a');
    link.href = update.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.innerHTML = `
      <span class="update-topline">
        <span class="update-subject"></span>
        <span class="update-meta">
          ${expired ? '<span class="expired-badge">Rok prošao</span>' : ''}
          <time class="update-date"></time>
        </span>
      </span>
      <strong class="update-title"></strong>
      ${update.deadline ? '<p class="update-deadline"></p>' : ''}
    `;
    link.querySelector('.update-subject').textContent = update.subject;
    link.querySelector('.update-date').textContent = update.date || '';
    link.querySelector('.update-title').textContent = update.title;
    if (update.deadline) link.querySelector('.update-deadline').textContent = `Rok: ${update.deadline} · proveri original`;
    item.append(link);
    elements.updatesList.append(item);
  });
}

async function loadDepartmentUpdates() {
  elements.refreshUpdates.classList.add('loading');
  elements.updatesStatus.textContent = 'Proveravam nove prijave…';
  try {
    const response = await fetch(`${UPDATES_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Feed nije dostupan');
    const data = await response.json();
    const updates = data.updates.filter((update) => selectedSubjects.includes(update.subject) && isFromLast30Days(update));
    renderDepartmentUpdates(updates);
    const checkedAt = data.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'nepoznato';
    elements.updatesStatus.textContent = updates.length
      ? `${updates.length} pronađenih objava · provereno ${checkedAt}`
      : `Nema prijava za izabrane predmete · provereno ${checkedAt}`;
  } catch (error) {
    if (location.protocol === 'file:') {
      const updates = LOCAL_UPDATES.filter((update) => selectedSubjects.includes(update.subject) && isFromLast30Days(update));
      renderDepartmentUpdates(updates);
      elements.updatesStatus.textContent = `${updates.length} pronađenih objava · lokalni pregled`;
    } else {
      elements.updatesStatus.textContent = 'Trenutno ne mogu da učitam obaveštenja. Pokušaj ponovo.';
    }
  } finally {
    elements.refreshUpdates.classList.remove('loading');
  }
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(value) {
  if (!value) return 'No due date';
  const today = localDateString();
  if (value === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === localDateString(tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function visibleTasks() {
  const today = localDateString();
  return tasks.filter((task) => {
    if (activeFilter === 'today') return task.date === today;
    if (activeFilter === 'open') return !task.completed;
    if (activeFilter === 'done') return task.completed;
    return true;
  });
}

function updateSummary() {
  const today = localDateString();
  const done = tasks.filter((task) => task.completed).length;
  const open = tasks.length - done;
  const due = tasks.filter((task) => !task.completed && task.date === today).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  elements.openCount.textContent = open;
  elements.dueCount.textContent = due;
  elements.doneCount.textContent = done;
  elements.progressValue.textContent = `${progress}%`;
  elements.progressRing.style.setProperty('--progress', `${progress}%`);
}

function render() {
  elements.taskList.replaceChildren();
  const filtered = visibleTasks();

  filtered
    .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.date || '9999').localeCompare(b.date || '9999'))
    .forEach((task) => {
      const item = elements.template.content.firstElementChild.cloneNode(true);
      item.dataset.id = task.id;
      item.classList.toggle('completed', task.completed);
      item.querySelector('.task-title').textContent = task.title;
      item.querySelector('.task-subject').textContent = task.subject || 'General';
      item.querySelector('.task-date').textContent = formatDate(task.date);
      item.querySelector('.priority-dot').classList.add(`priority-${task.priority}`);
      item.querySelector('.check-button').setAttribute('aria-label', task.completed ? 'Mark task open' : 'Mark task complete');
      elements.taskList.append(item);
    });

  elements.emptyState.hidden = filtered.length > 0;
  updateSummary();
}

function addTask(formData) {
  tasks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: formData.get('title').trim(),
    subject: formData.get('subject').trim(),
    date: formData.get('date'),
    priority: formData.get('priority'),
    completed: false,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
}

elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric'
}).format(new Date());
elements.date.value = localDateString();

document.querySelector('#open-form').addEventListener('click', () => {
  elements.dialog.showModal();
  setTimeout(() => elements.title.focus(), 50);
});
document.querySelector('#close-form').addEventListener('click', () => elements.dialog.close());

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  addTask(new FormData(elements.form));
  elements.form.reset();
  elements.date.value = localDateString();
  elements.dialog.close();
});

elements.taskList.addEventListener('click', (event) => {
  const item = event.target.closest('.task-item');
  if (!item) return;
  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (event.target.closest('.check-button')) task.completed = !task.completed;
  if (event.target.closest('.delete-button')) tasks = tasks.filter((entry) => entry.id !== item.dataset.id);
  saveTasks();
  render();
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.filter.active').classList.remove('active');
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    render();
  });
});

document.querySelector('#clear-done').addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

elements.refreshUpdates.addEventListener('click', loadDepartmentUpdates);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
}

renderSubjectOptions();
loadDepartmentUpdates();
render();
