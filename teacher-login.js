const supabaseConfig = window.SUPABASE_CONFIG || {};
const hasSupabaseConfig = supabaseConfig.url?.startsWith('https://')
  && supabaseConfig.anonKey
  && !supabaseConfig.anonKey.includes('여기에');
const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

const message = document.getElementById('teacherLoginMessage');

document.getElementById('teacherLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    message.textContent = 'Supabase 설정을 먼저 확인해 주세요.';
    return;
  }

  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  message.textContent = '로그인 중…';

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById('teacherEmail').value.trim(),
    password: document.getElementById('teacherPassword').value
  });

  if (error) {
    button.disabled = false;
    message.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.';
    console.error('Teacher login error:', error);
    return;
  }

  window.location.href = './teacher.html';
});
