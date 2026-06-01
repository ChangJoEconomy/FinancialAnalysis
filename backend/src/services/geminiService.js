const DEFAULT_MODEL = 'gemini-3-flash-preview';

export async function generateGeminiJson({
  prompt,
  model = process.env.LLM_MODEL || DEFAULT_MODEL,
  temperature = 0.2,
  maxOutputTokens = 4096
}) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('LLM_API_KEY is not set.'), { statusCode: 500 });
  }

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  url.searchParams.set('key', apiKey);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json'
        }
      })
    });
  } catch (error) {
    const cause = error.cause;
    const reason = cause?.code && cause?.hostname
      ? `${cause.code} ${cause.hostname}`
      : error.message;

    throw Object.assign(new Error(`Gemini network request failed: ${reason}`), {
      statusCode: 503,
      cause
    });
  }

  const rawBody = await response.text();
  const body = parseJsonOrNull(rawBody);

  if (!response.ok) {
    const apiError = body?.error;
    throw Object.assign(new Error(apiError?.message || 'Gemini request failed.'), {
      statusCode: response.status,
      details: apiError || body || { rawBody: rawBody.slice(0, 500) }
    });
  }

  const candidate = body?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  if (!text) {
    throw Object.assign(new Error('Gemini response did not include text.'), {
      statusCode: 502,
      details: {
        finishReason: candidate?.finishReason || null,
        usageMetadata: body?.usageMetadata || null
      }
    });
  }

  return {
    model,
    text,
    json: parseGeminiJsonText(text),
    finishReason: candidate?.finishReason || null,
    usageMetadata: body?.usageMetadata || null
  };
}

function parseGeminiJsonText(text) {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw Object.assign(new Error('Gemini response must be valid JSON.'), {
      statusCode: 502,
      details: {
        parseError: error.message,
        text: text.slice(0, 1000)
      }
    });
  }
}

function parseJsonOrNull(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
