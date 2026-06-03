const DEFAULT_MAX_JSON_BODY_BYTES = 1024 * 1024;

export function sendJson(res, body, statusCode = 200) {
  res.writeHead(statusCode, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req, { maxBytes = DEFAULT_MAX_JSON_BODY_BYTES } = {}) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      throw Object.assign(new Error('Request body is too large.'), {
        statusCode: 413
      });
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  const contentType = req.headers['content-type'] || '';
  if (!String(contentType).toLowerCase().includes('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json.'), {
      statusCode: 415
    });
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), {
      statusCode: 400
    });
  }
}

export function sendError(res, statusCode, code, message) {
  sendJson(res, { error: { code, message } }, statusCode);
}

export function sendNotFound(res) {
  sendError(res, 404, 'NOT_FOUND', 'Route not found.');
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}
