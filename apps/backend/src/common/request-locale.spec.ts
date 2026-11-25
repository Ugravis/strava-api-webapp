import type { Request } from 'express';
import { requestLocale } from './request-locale';

function request(
  cookies: Record<string, string>,
  acceptLanguage?: string,
  header?: string,
) {
  const headers: Record<string, string | undefined> = {
    'accept-language': acceptLanguage,
    'x-locale': header,
  };
  return {
    cookies,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('requestLocale', () => {
  it('takes the language told by the site first', () => {
    expect(requestLocale(request({ NEXT_LOCALE: 'de' }, 'fr', 'es'))).toBe(
      'es',
    );
  });

  it('prefers the language chosen on the site', () => {
    expect(requestLocale(request({ NEXT_LOCALE: 'de' }, 'fr-FR,fr'))).toBe(
      'de',
    );
  });

  it('ignores a cookie naming an unknown language', () => {
    expect(requestLocale(request({ NEXT_LOCALE: 'xx' }, 'it-IT'))).toBe('it');
  });

  it('takes the first supported language of the browser, by weight', () => {
    expect(requestLocale(request({}, 'pt-BR;q=0.9,es;q=0.8,fr;q=0.5,ja'))).toBe(
      'es',
    );
  });

  it('falls back to English', () => {
    expect(requestLocale(request({}, 'ja,pt'))).toBe('en');
    expect(requestLocale(request({}))).toBe('en');
  });
});
