# AI 제자 교실

학생이 자신의 말로 설명하고, 챗봇과 대화한 뒤, 배운 내용을 성찰하는 정적 웹 프로토타입입니다. 학생의 반·번호와 대화·성찰 기록은 Supabase의 `learning_logs` 테이블에 저장합니다.

## Supabase 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. Supabase 대시보드의 **SQL Editor**에서 `supabase/schema.sql` 전체를 실행합니다.
3. **Project Settings → API**에서 Project URL과 `publishable` 또는 `anon` 키를 확인합니다.
4. 루트의 `supabase-config.js`에 두 값을 입력합니다.

```js
window.SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-publishable-or-anon-key'
};
```

브라우저 코드에는 publishable/anon 키만 사용해야 합니다. `service_role` 키는 절대 입력하거나 GitHub에 올리지 않습니다.

`schema.sql`은 학생에게 `INSERT`만 허용하고 `SELECT`, `UPDATE`, `DELETE` 정책은 만들지 않습니다. 따라서 학생은 기록을 추가할 수 있지만 다른 학생의 기록을 볼 수 없고, 연구자는 Supabase 대시보드에서 전체 기록을 확인할 수 있습니다.

## 교사 기록 화면

학생별 대화 기록을 웹페이지에서 확인하려면 다음 순서로 설정합니다.

1. Supabase 대시보드의 **Authentication → Users**에서 교사 이메일과 비밀번호 계정을 만듭니다.
2. 해당 사용자의 UUID를 복사합니다.
3. SQL Editor에서 다음을 실행합니다. `교사_UUID` 부분만 실제 UUID로 바꿉니다.

```sql
insert into public.teacher_profiles (user_id)
values ('교사_UUID');
```

4. `teacher-login.html`에서 교사 계정으로 로그인합니다.
5. 로그인 후 `teacher.html`에서 학생 목록을 선택하면 채팅과 성찰을 시간순으로 볼 수 있습니다.

학생은 여전히 `INSERT`만 할 수 있고, 교사 계정만 `learning_logs`를 조회할 수 있습니다.

## 로컬 실행

별도 서버 없이 `index.html`을 브라우저로 열어 화면을 확인할 수 있습니다. Supabase 저장까지 테스트하려면 루트 폴더에서 다음처럼 정적 서버를 실행하세요.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

## Vercel 배포

이 프로젝트는 빌드가 필요 없는 정적 웹사이트입니다. Vercel에서 GitHub 저장소를 연결한 뒤 Framework Preset은 `Other`, Build Command는 비워 두고 Output Directory는 `.`로 배포하면 됩니다. `supabase-config.js`가 루트에 있고 `index.html`과 같은 위치에 있어야 합니다.

## Gemini API 연결

Gemini API를 사용하려면 Vercel 프로젝트의 **Settings → Environment Variables**에 다음 변수를 추가합니다.

```text
GEMINI_API_KEY=Google AI Studio에서 발급한 키
```

`GEMINI_API_KEY`는 `api/chat.js`에서만 읽습니다. 프론트엔드 파일이나 GitHub에 키를 작성하지 않습니다. 환경변수를 추가하거나 수정한 뒤에는 새 배포가 필요합니다.

학생이 선택한 `글챗봇`은 `misconception`, `꽃챗봇`은 `comparison` 조건으로 `api/chat.js`의 서로 다른 시스템 프롬프트를 사용합니다. API 응답이 생성된 뒤 학생 메시지와 AI 응답은 기존처럼 Supabase에 저장됩니다.

## 설계 원칙

- AI가 정답을 먼저 설명하지 않고 학생의 설명을 기다림
- 한 번에 한 질문만 하여 설명·질문·오개념 교정의 순환을 만듦
- 교사가 검토한 오개념만 제한적으로 제시
- 학생을 점수화하지 않고 마지막에 자기 말로 성찰
- 실명·연락처 등 개인정보를 입력하지 않도록 화면에 고지
- 과목/학년/단원/학습 목표를 교사가 직접 변경 가능

## 저장되는 항목

`learning_logs`에는 연구 코드, 반·번호, 세션 ID, 활동 유형, 학생 메시지, 챗봇 메시지, 성찰 내용, 프롬프트 버전, 저장 시각이 기록됩니다. 현재 챗봇 응답은 API가 아닌 데모용 고정 응답이며, `condition` 값은 `demo`로 저장됩니다.

## 연구 적용 전 점검

실제 적용 전에는 연구 코드 사용, 개인정보 최소 수집, 보관기간 설정, 입력값 검증, 프롬프트 버전 관리, 전문가 내용타당도 검증, IRB 승인을 마련하세요. 현재 버전은 연구용 시범 프로토타입입니다.
