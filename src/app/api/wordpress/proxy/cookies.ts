export function getResponseSetCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers);
  }

  const setCookie = headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}
