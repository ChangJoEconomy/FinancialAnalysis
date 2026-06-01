import {
  findLatestAnalysisRun,
  listMetricAnalysisItems
} from '../repositories/aiAnalysisRepository.js';
import { findAnalysisSettingByIdForUser } from '../repositories/analysisSettingsRepository.js';
import { findStockById } from '../repositories/stockRepository.js';
import {
  createChatMessage,
  createChatSession,
  findOwnedChatSession,
  listChatMessagesForOwnedSession,
  touchChatSession
} from '../repositories/userScopedRepository.js';
import { generateGeminiJson } from './geminiService.js';

const LLM_PROMPT_VERSION = 'llm-financial-v1';
const ANALYSIS_TYPE = 'financial';

export async function startChatSession(authContext, payload = {}) {
  if (payload.stockId) {
    const stock = await findStockById(payload.stockId);
    if (!stock) {
      throw Object.assign(new Error('Stock not found.'), { statusCode: 404 });
    }
  }

  if (payload.settingId) {
    const setting = await findAnalysisSettingByIdForUser(authContext.userId, payload.settingId);
    if (!setting) {
      throw Object.assign(new Error('Analysis setting not found.'), { statusCode: 404 });
    }
  }

  return createChatSession(authContext.userId, payload);
}

export async function sendChatMessage(authContext, chatSessionId, payload = {}) {
  const question = payload.message?.trim();
  if (!question) {
    throw badRequest('message is required.');
  }

  const session = await findOwnedChatSession(authContext.userId, chatSessionId);
  if (!session) {
    throw Object.assign(new Error('Chat session not found.'), { statusCode: 404 });
  }

  const history = await listChatMessagesForOwnedSession(authContext.userId, chatSessionId);
  const analysis = session.stock_id
    ? await findLatestAnalysisRun({
        stockId: session.stock_id,
        analysisType: ANALYSIS_TYPE,
        promptVersion: LLM_PROMPT_VERSION,
        settingId: session.setting_id || null
      })
    : null;
  const metrics = analysis ? await listMetricAnalysisItems(analysis.analysis_id) : [];

  const userMessage = await createChatMessage({
    chatSessionId,
    role: 'user',
    messageText: question,
    relatedAnalysisId: analysis?.analysis_id || null
  });

  const llm = await generateChatAnswerWithFallback({
    prompt: buildChatPrompt({ session, history, question, analysis, metrics }),
    analysis
  });
  const answer = llm.answer;

  const assistantMessage = await createChatMessage({
    chatSessionId,
    role: 'assistant',
    messageText: answer,
    relatedAnalysisId: analysis?.analysis_id || null,
    tokenCount: llm.usageMetadata?.candidatesTokenCount || null
  });

  await touchChatSession(chatSessionId);

  return {
    session,
    analysisId: analysis?.analysis_id || null,
    userMessage,
    assistantMessage,
    llm: {
      model: llm.model,
      finishReason: llm.finishReason,
      fallback: llm.fallback,
      error: llm.error
    }
  };
}

async function generateChatAnswerWithFallback({ prompt, analysis }) {
  try {
    const llm = await generateGeminiJson({
      prompt,
      temperature: 0.3,
      maxOutputTokens: 2048
    });

    return {
      answer: normalizeAnswer(llm.json),
      model: llm.model,
      finishReason: llm.finishReason,
      usageMetadata: llm.usageMetadata,
      fallback: false,
      error: null
    };
  } catch (error) {
    return {
      answer: buildFallbackAnswer(analysis),
      model: 'rules-v1-fallback',
      finishReason: null,
      usageMetadata: null,
      fallback: true,
      error: error.message
    };
  }
}

function buildFallbackAnswer(analysis) {
  if (!analysis) {
    return '현재 연결된 재무 분석 결과가 없어 구체적인 답변을 만들기 어렵습니다. 먼저 종목 분석을 실행한 뒤 다시 질문해 주세요. 이 내용은 매수나 매도 추천이 아닙니다.';
  }

  return `${analysis.summary_text} ${analysis.caution_text}`;
}

function buildChatPrompt({ session, history, question, analysis, metrics }) {
  return [
    '너는 초보 투자자를 위한 주식 재무 해설 도우미다.',
    '매수, 매도, 보유 추천을 하지 않는다.',
    '목표가, 수익률 보장, 근거 없는 전망을 말하지 않는다.',
    '사용자가 물은 내용에 직접 답하고, 판단에 필요한 추가 확인 포인트를 알려준다.',
    '응답은 반드시 {"answer_text":"..."} 형태의 JSON 객체 하나만 반환한다.',
    '',
    '대화 대상:',
    JSON.stringify({
      stock: session.stocks || null,
      latest_analysis: analysis
        ? {
            analysis_id: analysis.analysis_id,
            overall_signal: analysis.overall_signal,
            overall_score: analysis.overall_score,
            summary_text: analysis.summary_text,
            reason_text: analysis.reason_text,
            caution_text: analysis.caution_text
          }
        : null,
      metrics: metrics.map((metric) => ({
        metric_code: metric.metric_code,
        metric_value: metric.metric_value,
        signal: metric.signal,
        reason_text: metric.reason_text
      })),
      recent_messages: history.slice(-6).map((message) => ({
        role: message.role,
        message_text: message.message_text
      })),
      question
    }, null, 2)
  ].join('\n');
}

function normalizeAnswer(json) {
  const answer = typeof json?.answer_text === 'string' ? json.answer_text.trim() : '';
  if (!answer) {
    throw Object.assign(new Error('Gemini chat response did not include answer_text.'), { statusCode: 502 });
  }

  return answer;
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
