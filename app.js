const $ = (id) => document.getElementById(id);
let replyIndex = 0;

const firstMessage = '안녕! 나는 전기의 작용을 아직 잘 모르는 AI 제자 루미야.\n전기가 흐르려면 회로가 어떻게 되어야 하는지 가르쳐 줄래?';
const replies = [
  '아, 전기가 흐르는 길이 끊어지지 않아야 하는구나! 그런데 전구가 전지의 한쪽에만 연결되어도 켜질까?',
  '조금 더 알 것 같아. 왜 전지와 전구가 모두 연결되어야 하는지, 전기가 흐르는 길을 따라 설명해 줄래?',
  '고마워! 내가 이해한 내용을 내 말로 정리해 볼게. 혹시 빠진 부분이 있으면 고쳐 줘.'
];

function message(role, content, helper = '') {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.textContent = content;
  $('messages').append(bubble);
  if (helper) {
    const note = document.createElement('div');
    note.className = 'conversation-tip';
    note.textContent = helper;
    $('messages').append(note);
  }
  $('messages').scrollTop = $('messages').scrollHeight;
}

function resetConversation() {
  $('messages').innerHTML = '';
  replyIndex = 0;
  message('ai', firstMessage, '💡 설명 팁 · “왜 그런지”와 생활 속 예시를 함께 말해 보세요.');
}

function addStaticReply() {
  window.setTimeout(() => {
    message('ai', replies[replyIndex % replies.length]);
    replyIndex += 1;
  }, 250);
}

$('loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  $('loginView').classList.add('is-hidden');
  $('activityView').classList.remove('is-hidden');
  $('activityView').setAttribute('aria-hidden', 'false');
  $('headerStatus').textContent = `수업 코드 · ${$('classCode').value.toUpperCase()}`;
  resetConversation();
  $('input').focus();
});

$('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = $('input').value.trim();
  if (!value) return;
  message('student', value);
  $('input').value = '';
  addStaticReply();
});

document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
  $('input').value = `${chip.textContent} `;
  $('input').focus();
}));

$('restart').addEventListener('click', resetConversation);
$('saveReflection').addEventListener('click', () => {
  const input = $('reflectionInput');
  if (!input.value.trim()) return input.focus();
  $('saveReflection').textContent = '저장했어요 ✓';
  $('saveReflection').disabled = true;
});
