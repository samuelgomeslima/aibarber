function jsonResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  };
}

function errorResponse(status, message, extra = {}) {
  return jsonResponse(status, {
    error: message,
    ...extra,
  });
}

module.exports = {
  jsonResponse,
  errorResponse,
};
