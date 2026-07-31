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
let chatHistory = [];

const botProfiles = {
  geul: {
    label: '글챗봇',
    condition: 'misconception',
    promptVersion: 'geul-misconception-v1',
    first: '안녕! 나는 전기의 작용을 아직 잘 모르는 AI 제자 글이야.\n전지가 전구의 한쪽에만 연결되어도 전기가 흐를 수 있는지 가르쳐 줄래?',
    replies: [
      '음, 전구가 전지에 연결되어 있으니까 한쪽 단자만 연결해도 전기가 갈 수 있지 않을까? 왜 안 되는지 설명해 줄래?',
      '전기가 흐르는 길이 이어져야 한다는 말은 알겠어. 그런데 전구가 전지와 연결되어 있으면 길이 있는 것 아닌가?',
      '네 설명을 듣고 보니 내 생각에 빠진 부분이 있는 것 같아. 전류가 흐르는 조건을 다시 정리해서 말해 줄래?'
    ]
  },
  kkot: {
    label: '꽃챗봇',
    condition: 'comparison',
    promptVersion: 'kkot-general-v1',
    first: '안녕! 나는 전기의 작용을 함께 공부하는 AI 제자 꽃이야.\n전기가 흐르려면 회로가 어떻게 되어야 하는지 네 말로 설명해 줄래?',
    replies: [
      '설명을 잘 들었어. 전기가 흐르는 조건을 회로의 연결 상태와 관련지어 다시 말해 볼래?',
      '좋은 설명이야. 전지와 전구를 연결한 생활 속 예시를 하나 들어 줄 수 있어?',
      '이해한 내용을 정리해 볼게. 빠진 부분이나 더 정확하게 고칠 부분이 있으면 알려 줘.'
    ]
  }
};

function getBotProfile() {
  return botProfiles[student?.botType] || botProfiles.geul;
}

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
  const profile = getBotProfile();
  addMessage('ai', profile.first, '💡 설명 팁 · “왜 그런지”와 생활 속 예시를 함께 말해 보세요.');
  chatHistory = [];
}

function setStatus(text, connected = false) {
  $('backendStatus').textContent = text;
  $('backendStatus').classList.toggle('connected', connected);
}

function showStudentArea() {
  if (!student) return;
  $('loginGate').classList.add('hidden');
  $('studentBadge').textContent = `${student.classNumber}반 ${student.studentNumber}번`;
  const profile = getBotProfile();
  $('studentBadge').textContent += ` · ${profile.label}`;
  $('chatbotName').textContent = `${profile.label}, 나의 AI 제자`;
  $('activityDescription').textContent = profile.condition === 'misconception'
    ? '오개념을 가진 AI 제자 글에게 전기 회로를 설명해 보세요.'
    : '일반적인 AI 제자 꽃에게 전기 회로를 설명해 보세요.';
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
  const botType = document.querySelector('input[name="botType"]:checked')?.value;
  if (!classNumber || !studentNumber || !botType) return;
  student = { classNumber, studentNumber, botType };
  sessionStorage.setItem('studentProfile', JSON.stringify(student));
  showStudentArea();
}

async function saveLog(data) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('learning_logs').insert({
    research_code: `${data.classNumber}-${data.studentNumber}`,
    class_number: data.classNumber,
    student_number: data.studentNumber,
    condition: data.condition || getBotProfile().condition,
    session_id: SESSION_ID,
    event_type: data.eventType,
    student_message: data.studentMessage || null,
    ai_message: data.aiMessage || null,
    reflection: data.reflection || null,
    prompt_version: data.promptVersion || getBotProfile().promptVersion
  });
  if (error) throw error;
  return true;
}

async function sendReply(studentMessage) {
  const profile = getBotProfile();
  if (!supabaseClient) {
    setStatus('SUPABASE 설정 필요');
    return;
  }

  setStatus('AI가 답변을 만드는 중…');
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: studentMessage,
        condition: profile.condition,
        history: chatHistory
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AI 응답 오류');

    const reply = result.answer;
    addMessage('ai', reply);
    replyIndex += 1;
    chatHistory.push({ role: 'user', parts: [{ text: studentMessage }] });
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });

    setStatus('AI 응답 · 저장 중…');
    await saveLog({
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      eventType: 'chat',
      studentMessage,
      aiMessage: reply,
      condition: profile.condition,
      promptVersion: profile.promptVersion
    });
    setStatus('SUPABASE 저장됨', true);
  } catch (error) {
    setStatus('AI 응답 오류 확인 필요');
    addMessage('ai', '잠시 문제가 생겼어요. 다시 한 번 보내 주세요.');
    console.error('AI chat error:', error);
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
      reflection,
      condition: getBotProfile().condition,
      promptVersion: getBotProfile().promptVersion
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
