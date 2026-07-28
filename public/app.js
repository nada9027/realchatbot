const $ = (id) => document.getElementById(id);
// Apps Script 웹 앱 배포 후 생성된 /exec URL을 여기에 붙여 넣으세요.
const BACKEND_URL = 'hhttps://script.google.com/macros/s/AKfycbz9FkqubkSmZE-AMKs0AT1n9iU3TnJZhep8207ilSqVf9M48gERSDLDnPmz2A8Rpz6I/exec';
const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
let student = JSON.parse(sessionStorage.getItem('studentProfile') || 'null');
let replyIndex = 0;
const first = '안녕! 나는 전기의 작용을 아직 잘 모르는 AI 제자 루미야.\n전기가 흐르려면 회로가 어떻게 되어야 하는지 가르쳐 줄래?';
const replies = [
  '아, 전기가 흐르는 길이 이어져야 하는구나. 그런데 전구가 전지의 한쪽에만 연결되어도 켜질까?',
  '조금 더 알 것 같아. 왜 전지와 전구가 모두 연결되어야 하는지 예를 들어 설명해 줄래?',
  '고마워! 이제 내가 이해한 내용을 정리해 볼게. 빠진 부분이 있으면 고쳐 줘.'
];
function addMessage(role, text, note = '') { const bubble = document.createElement('div'); bubble.className = `message ${role}`; bubble.textContent = text; $('messages').append(bubble); if(note){const tip=document.createElement('div');tip.className='chat-note';tip.textContent=note;$('messages').append(tip)} $('messages').scrollTop=$('messages').scrollHeight; }
function resetChat(){ $('messages').innerHTML=''; replyIndex=0; addMessage('ai',first,'💡 설명 팁 · “왜 그런지”와 생활 속 예시를 함께 말해 보세요.'); }
function isBackendReady() { return BACKEND_URL.startsWith('https://script.google.com/'); }
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
function setBackendStatus(text, connected = false) {
  $('backendStatus').textContent = text;
  $('backendStatus').classList.toggle('connected', connected);
}
async function requestBackend(payload) {
  const query = new URLSearchParams(payload);
  const response = await fetch(`${BACKEND_URL}?${query.toString()}`, { method: 'GET', cache: 'no-store' });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || '백엔드 응답 오류');
  return data;
}
async function sendReply(studentMessage) {
  if (!isBackendReady()) {
    window.setTimeout(() => { addMessage('ai', replies[replyIndex % replies.length]); replyIndex += 1; }, 280);
    return;
  }
  setBackendStatus('저장 중…');
  try {
    const data = await requestBackend({ action: 'chat', sessionId: SESSION_ID, classNumber: student.classNumber, studentNumber: student.studentNumber, message: studentMessage, replyIndex });
    addMessage('ai', data.reply);
    replyIndex += 1;
    setBackendStatus('APPS SCRIPT 연결됨', true);
  } catch (error) {
    addMessage('ai', '잠시 연결이 불안정해요. 다시 보내 주세요.');
    setBackendStatus('연결 확인 필요');
    console.error(error);
  }
}
$('chatForm').addEventListener('submit',(e)=>{e.preventDefault();const text=$('chatInput').value.trim();if(!text)return;addMessage('student',text);$('chatInput').value='';sendReply(text);});
document.querySelectorAll('.quick').forEach((button)=>button.addEventListener('click',()=>{$('chatInput').value=`${button.textContent} `;$('chatInput').focus();}));
$('resetChat').addEventListener('click',resetChat);
$('saveReflection').addEventListener('click',async()=>{const reflection=$('reflectionInput').value.trim();if(!reflection)return $('reflectionInput').focus();const button=$('saveReflection');button.disabled=true;try{if(isBackendReady()){await requestBackend({action:'reflection',sessionId:SESSION_ID,classNumber:student.classNumber,studentNumber:student.studentNumber,reflection});} $('reflectionState').textContent='저장했어요 ✓';$('reflectionState').classList.add('saved');button.textContent='성찰 저장 완료';}catch(error){button.disabled=false;$('reflectionState').textContent='저장 실패 · 다시 시도';console.error(error);}});
$('mobileMenu').addEventListener('click',()=>document.querySelector('.nav-links').classList.toggle('open'));
if (student) showStudentArea();
$('loginForm').addEventListener('submit', loginStudent);
resetChat();
