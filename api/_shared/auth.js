function getHeader(req, name) {
  if (!req?.headers) return undefined;
  const lower = name.toLowerCase();
  if (lower in req.headers) return req.headers[lower];
  const entries = Object.entries(req.headers);
  for (const [key, value] of entries) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function decodeClientPrincipal(value) {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}

function extractClaim(claims, types) {
  if (!Array.isArray(claims)) return null;
  for (const type of types) {
    const match = claims.find((claim) => claim?.typ === type);
    if (match && typeof match.val === "string" && match.val.length > 0) {
      return match.val;
    }
  }
  return null;
}

function getAuthenticatedUser(req) {
  const principalHeader = getHeader(req, "x-ms-client-principal");
  if (!principalHeader) {
    return null;
  }
  const principal = decodeClientPrincipal(principalHeader);
  if (!principal) return null;

  const userId =
    principal.userId ||
    extractClaim(principal.claims, [
      "sub",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    ]);

  if (!userId) return null;

  return {
    id: String(userId),
    identityProvider: principal.identityProvider || "unknown",
    userDetails: principal.userDetails || null,
    claims: principal.claims || [],
  };
}

module.exports = {
  getAuthenticatedUser,
  getHeader,
};
