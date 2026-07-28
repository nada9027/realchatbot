/**
 * AI, 들어봐 — Google Apps Script 백엔드
 *
 * 1) 이 파일을 Apps Script 프로젝트에 붙여넣습니다.
 * 2) SPREADSHEET_ID를 자신의 Google Sheets ID로 바꿉니다.
 * 3) 웹 앱으로 배포한 뒤 URL을 public/app.js의 BACKEND_URL에 넣습니다.
 */

const SPREADSHEET_ID = '18ak5gw9-im_TXct7g0wPrcpF__UhptrK6KFjikb2igk';
const SHEET_NAME = 'chat_logs';
const BACKEND_VERSION = '2026-07-28-v3';

function doGet(e) {
  const params = e && e.parameter;
  if (!params || !params.action) {
    return json_({ ok: true, version: BACKEND_VERSION, message: 'AI, 들어봐 backend is running.' });
  }
  if (params.action === 'ping') return json_({ ok: true, version: BACKEND_VERSION, message: 'ping ok' });
  return handleRequest_(params);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    return handleRequest_(body);
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function handleRequest_(body) {
  try {
    const action = body.action || 'chat';
    const sheet = getSheet_();

    if (action === 'reflection') {
      appendLog_(sheet, {
        sessionId: body.sessionId,
        classNumber: body.classNumber,
        studentNumber: body.studentNumber,
        action: 'reflection',
        studentMessage: body.reflection || '',
        aiReply: ''
      });
      return json_({ ok: true, saved: true });
    }

    const studentMessage = String(body.message || '').trim();
    if (!studentMessage) return json_({ ok: false, error: 'message is required' });

    const reply = makeDemoReply_(studentMessage, Number(body.replyIndex || 0));
    appendLog_(sheet, {
      sessionId: body.sessionId,
      classNumber: body.classNumber,
      studentNumber: body.studentNumber,
      action: 'chat',
      studentMessage,
      aiReply: reply
    });

    return json_({ ok: true, reply });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function getSheet_() {
  if (SPREADSHEET_ID.indexOf('여기에_') === 0) {
    throw new Error('Code.gs의 SPREADSHEET_ID를 먼저 설정하세요.');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'sessionId', 'classNumber', 'studentNumber', 'action', 'studentMessage', 'aiReply']);
  }
  return sheet;
}

function appendLog_(sheet, data) {
  sheet.appendRow([
    new Date(),
    data.sessionId || '',
    data.classNumber || '',
    data.studentNumber || '',
    data.action || '',
    data.studentMessage || '',
    data.aiReply || ''
  ]);
}

function makeDemoReply_(message, replyIndex) {
  const replies = [
    '아, 전기가 흐르는 길이 이어져야 하는구나. 그런데 전구가 전지의 한쪽에만 연결되어도 켜질까?',
    '조금 더 알 것 같아. 왜 전지와 전구가 모두 연결되어야 하는지 생활 속 예시로 설명해 줄래?',
    '고마워! 이제 내가 이해한 내용을 정리해 볼게. 빠진 부분이나 잘못 이해한 점이 있으면 고쳐 줘.'
  ];

  if (message.includes('힌트')) {
    return '힌트: 전지, 전선, 전구가 하나의 끊기지 않은 길을 이루는지 생각해 봐.';
  }
  return replies[replyIndex % replies.length];
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
