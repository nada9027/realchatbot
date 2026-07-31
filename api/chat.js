const prompts = {
  misconception: `
너는 '글챗봇'이라는 AI 제자다.
학생이 너를 가르치는 학습 활동에 참여하고 있다.

학습 주제: 전기 회로
의도적으로 가지고 있는 오개념:
전지의 한쪽 단자만 전구에 연결되어도 전류가 흐를 수 있다고 생각한다.

대화 규칙:
- 처음부터 정답을 말하지 않는다.
- 자신의 생각을 그럴듯하고 일관되게 유지한다.
- 학생에게 왜 그렇게 생각하는지 근거와 예시를 묻는다.
- 학생의 설명 중 맞는 부분은 인정하지만 핵심 오개념은 바로 포기하지 않는다.
- 학생이 반례, 그림, 실험 결과를 제시하면 조금씩 생각을 수정한다.
- 학생이 충분한 근거를 제시한 뒤에만 자신의 생각을 정리한다.
- 한 번에 질문 하나만 한다.
- 답변은 학생이 읽기 쉽도록 2~4문장으로 작성한다.
`,
  comparison: `
너는 '꽃챗봇'이라는 일반적인 학습 지원 AI다.
학생이 전기 회로를 자신의 말로 설명하도록 돕는다.

대화 규칙:
- 학생의 설명을 먼저 듣고 짧게 요약한다.
- 필요한 경우 정확한 힌트와 생활 속 예시를 제공한다.
- 의도적으로 틀린 주장을 하지 않는다.
- 학생의 설명에서 부족한 부분을 친절하게 알려 준다.
- 한 번에 질문 하나만 한다.
- 답변은 학생이 읽기 쉽도록 2~4문장으로 작성한다.
- 마지막에는 학생이 배운 내용을 자기 말로 정리하게 한다.
`
};

function isValidHistory(history) {
  return Array.isArray(history) && history.every((item) => (
    item
    && (item.role === 'user' || item.role === 'model')
    && Array.isArray(item.parts)
    && item.parts.length > 0
    && typeof item.parts[0].text === 'string'
  ));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { message, condition, history = [] } = request.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return response.status(400).json({ error: '학생 메시지가 없습니다.' });
  }

  if (!isValidHistory(history) || history.length > 30) {
    return response.status(400).json({ error: '대화 기록 형식이 올바르지 않습니다.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const selectedCondition = condition === 'misconception' ? 'misconception' : 'comparison';
  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message.trim().slice(0, 4000) }] }
  ];

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompts[selectedCondition] }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 300
          }
        })
      }
    );

    const result = await geminiResponse.json();
    if (!geminiResponse.ok) {
      console.error('Gemini API error:', result);
      return response.status(502).json({ error: 'Gemini API 호출에 실패했습니다.' });
    }

    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!answer) {
      return response.status(502).json({ error: 'Gemini가 답변을 반환하지 않았습니다.' });
    }

    return response.status(200).json({ answer, condition: selectedCondition });
  } catch (error) {
    console.error('Gemini request error:', error);
    return response.status(500).json({ error: 'AI 서버와 연결하지 못했습니다.' });
  }
}
