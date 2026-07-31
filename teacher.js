const supabaseConfig = window.SUPABASE_CONFIG || {};
const hasSupabaseConfig = supabaseConfig.url?.startsWith('https://')
  && supabaseConfig.anonKey
  && !supabaseConfig.anonKey.includes('여기에');
const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

const state = { logs: [], students: [], selectedKey: null };
const $ = (id) => document.getElementById(id);

function setMessage(text, isError = false) {
  $('dashboardMessage').textContent = text;
  $('dashboardMessage').classList.toggle('error', isError);
}

function studentKey(log) {
  return `${log.class_number || '-'}-${log.student_number || '-'}`;
}

function studentLabel(log) {
  return `${log.class_number || '-'}반 ${log.student_number || '-'}번`;
}

function buildStudents(logs) {
  const grouped = new Map();
  logs.forEach((log) => {
    const key = studentKey(log);
    if (!grouped.has(key)) grouped.set(key, { key, label: studentLabel(log), sessions: new Set(), latest: log.created_at });
    const item = grouped.get(key);
    item.sessions.add(log.session_id);
    if (new Date(log.created_at) > new Date(item.latest)) item.latest = log.created_at;
  });
  return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko', { numeric: true }));
}

function renderStudentList() {
  const query = $('studentSearch').value.trim().toLowerCase();
  const visible = state.students.filter((student) => student.label.toLowerCase().includes(query));
  $('studentCount').textContent = `${state.students.length}명`;
  $('studentList').innerHTML = '';
  if (!visible.length) {
    $('studentList').innerHTML = '<p class="student-list-empty">아직 기록이 없습니다.</p>';
    return;
  }
  visible.forEach((student) => {
    const button = document.createElement('button');
    button.className = `student-item ${state.selectedKey === student.key ? 'selected' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${student.label}</strong><span>${student.sessions.size}개 세션</span>`;
    button.addEventListener('click', () => {
      state.selectedKey = student.key;
      renderStudentList();
      renderConversation(student);
    });
    $('studentList').append(button);
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderConversation(student) {
  const logs = state.logs.filter((log) => studentKey(log) === student.key)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  $('emptyState').classList.add('hidden');
  $('conversationView').classList.remove('hidden');
  $('selectedStudent').textContent = student.label;
  $('selectedSessionCount').textContent = `${student.sessions.size}개 세션 · ${logs.length}개 기록`;
  $('conversationTimeline').innerHTML = '';

  let currentSession = null;
  logs.forEach((log) => {
    if (currentSession !== log.session_id) {
      currentSession = log.session_id;
      const sessionLabel = document.createElement('div');
      sessionLabel.className = 'session-divider';
      sessionLabel.textContent = `세션 ${currentSession.slice(0, 8)}`;
      $('conversationTimeline').append(sessionLabel);
    }
    const card = document.createElement('article');
    card.className = `record-card ${log.event_type}`;
    const title = log.event_type === 'reflection' ? '성찰' : '챗봇 대화';
    card.innerHTML = `<div class="record-meta"><strong>${title}</strong><time>${formatDate(log.created_at)}</time></div>`;
    if (log.student_message) card.append(makeTextBlock('학생', log.student_message, 'student-text'));
    if (log.ai_message) card.append(makeTextBlock('AI 제자', log.ai_message, 'ai-text'));
    if (log.reflection) card.append(makeTextBlock('학생 성찰', log.reflection, 'reflection-text'));
    $('conversationTimeline').append(card);
  });
}

function makeTextBlock(label, text, className) {
  const block = document.createElement('div');
  block.className = `record-text ${className}`;
  block.innerHTML = `<span>${label}</span><p></p>`;
  block.querySelector('p').textContent = text;
  return block;
}

async function loadLogs() {
  if (!supabaseClient) return setMessage('Supabase 설정을 확인해 주세요.', true);
  setMessage('기록을 불러오는 중…');
  const { data, error } = await supabaseClient.from('learning_logs').select('*').order('created_at', { ascending: true });
  if (error) {
    setMessage('기록을 불러오지 못했습니다. 교사 계정 권한과 RLS 정책을 확인해 주세요.', true);
    console.error('Teacher log query error:', error);
    return;
  }
  state.logs = data || [];
  state.students = buildStudents(state.logs);
  renderStudentList();
  if (state.selectedKey) {
    const selected = state.students.find((student) => student.key === state.selectedKey);
    if (selected) renderConversation(selected);
  }
  setMessage(`${state.logs.length}개의 기록을 불러왔습니다.`);
}

async function init() {
  if (!supabaseClient) return setMessage('Supabase 설정을 확인해 주세요.', true);
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return window.location.replace('./teacher-login.html');
  $('teacherEmailLabel').textContent = session.user.email || '교사 계정';
  await loadLogs();
}

$('refreshButton').addEventListener('click', loadLogs);
$('studentSearch').addEventListener('input', renderStudentList);
$('logoutButton').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.replace('./teacher-login.html');
});
init();
