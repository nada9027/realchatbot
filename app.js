const $ = (id) => document.getElementById(id);

const supabaseConfig = window.SUPABASE_CONFIG || {};
const hasSupabaseConfig = supabaseConfig.url?.startsWith('https://')
  && supabaseConfig.anonKey
  && !supabaseConfig.anonKey.includes('여기에');
const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
let student = JSON.parse(sessionStorage.getItem('studentProfile') || 'null');
let replyIndex = 0;

const first = '안녕! 나는 전기의 작용을 아직 잘 모르는 AI 제자 글꽃이야.\n전기가 흐르려면 회로가 어떻게 되어야 하는지 가르쳐 줄래?';
const replies = [
  '아, 전기가 흐르는 길이 이어져야 하는구나. 그런데 전구가 전지의 한쪽에만 연결되어도 켜질까?',
  '조금 더 알 것 같아. 왜 전지와 전구가 모두 연결되어야 하는지 예를 들어 설명해 줄래?',
  '고마워! 이제 내가 이해한 내용을 정리해 볼게. 빠진 부분이 있으면 고쳐 줘.'
];

function addMessage(role, text, note = '') {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  $('messages').append(bubble);
  if (note) {
    const tip = document.createElement('div');
    tip.className = 'chat-note';
    tip.textContent = note;
    $('messages').append(tip);
  }
  $('messages').scrollTop = $('messages').scrollHeight;
}

function resetChat() {
  $('messages').innerHTML = '';
  replyIndex = 0;
  addMessage('ai', first, '💡 설명 팁 · “왜 그런지”와 생활 속 예시를 함께 말해 보세요.');
}

function setStatus(text, connected = false) {
  $('backendStatus').textContent = text;
  $('backendStatus').classList.toggle('connected', connected);
}

function showStudentArea() {
  if (!student) return;
  $('loginGate').classList.add('hidden');
  $('studentBadge').textContent = `${student.classNumber}반 ${student.studentNumber}번`;
  $('studentBadge').title = '클릭하면 다른 학생으로 바꿀 수 있어요';
  $('studentBadge').onclick = () => {
    sessionStorage.removeItem('studentProfile');
    window.location.reload();
  };
}

function loginStudent(event) {
  event.preventDefault();
  const classNumber = $('classInput').value.trim();
  const studentNumber = $('numberInput').value.trim();
  if (!classNumber || !studentNumber) return;
  student = { classNumber, studentNumber };
  sessionStorage.setItem('studentProfile', JSON.stringify(student));
  showStudentArea();
}

async function saveLog(data) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('learning_logs').insert({
    research_code: `${data.classNumber}-${data.studentNumber}`,
    class_number: data.classNumber,
    student_number: data.studentNumber,
    condition: 'demo',
    session_id: SESSION_ID,
    event_type: data.eventType,
    student_message: data.studentMessage || null,
    ai_message: data.aiMessage || null,
    reflection: data.reflection || null,
    prompt_version: 'demo-static-v1'
  });
  if (error) throw error;
  return true;
}

async function sendReply(studentMessage) {
  const reply = replies[replyIndex % replies.length];
  addMessage('ai', reply);
  replyIndex += 1;

  if (!supabaseClient) {
    setStatus('SUPABASE 설정 필요');
    return;
  }

  setStatus('저장 중…');
  try {
    await saveLog({
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      eventType: 'chat',
      studentMessage,
      aiMessage: reply
    });
    setStatus('SUPABASE 저장됨', true);
  } catch (error) {
    setStatus('저장 오류 확인 필요');
    console.error('Supabase chat log error:', error);
  }
}

$('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  addMessage('student', text);
  $('chatInput').value = '';
  sendReply(text);
});

document.querySelectorAll('.quick').forEach((button) => button.addEventListener('click', () => {
  $('chatInput').value = `${button.textContent} `;
  $('chatInput').focus();
}));

$('resetChat').addEventListener('click', resetChat);

$('saveReflection').addEventListener('click', async () => {
  const reflection = $('reflectionInput').value.trim();
  if (!reflection) return $('reflectionInput').focus();
  const button = $('saveReflection');
  button.disabled = true;

  try {
    if (!supabaseClient) throw new Error('Supabase 설정이 필요합니다.');
    await saveLog({
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      eventType: 'reflection',
      reflection
    });
    $('reflectionState').textContent = '저장했어요 ✓';
    $('reflectionState').classList.add('saved');
    button.textContent = '성찰 저장 완료';
  } catch (error) {
    button.disabled = false;
    $('reflectionState').textContent = '저장 오류 확인 필요';
    console.error('Supabase reflection log error:', error);
  }
});

$('mobileMenu').addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('open'));
if (student) showStudentArea();
$('loginForm').addEventListener('submit', loginStudent);
if (!supabaseClient) setStatus('SUPABASE 설정 대기');
resetChat();
