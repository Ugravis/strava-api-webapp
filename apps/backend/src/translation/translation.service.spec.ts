import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('translates nothing without a key', async () => {
    const service = new TranslationService({ deeplApiKey: null });

    expect(service.enabled).toBe(false);
    await expect(service.translate(['Bonjour'], 'en')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the free endpoint of a free key, English as American English', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          translations: [{ detected_source_language: 'FR', text: 'Hello' }],
        }),
    });
    const service = new TranslationService({ deeplApiKey: 'key:fx' });

    await expect(service.translate(['Bonjour'], 'en')).resolves.toEqual([
      { text: 'Hello', detectedSource: 'fr' },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-free.deepl.com/v2/translate');
    expect(JSON.parse(init.body as string)).toEqual({
      text: ['Bonjour'],
      target_lang: 'EN-US',
      formality: 'prefer_less',
    });
  });

  it('answers null when DeepL fails, so the text stays as written', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 456 });
    const service = new TranslationService({ deeplApiKey: 'key' });

    await expect(
      service.translate(['Bonjour'], 'de', { source: 'fr' }),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepl.com/v2/translate',
      expect.anything(),
    );
  });

  it('translates from French with the glossary of the site, created once', async () => {
    const json = (body: unknown) => ({
      ok: true,
      json: () => Promise.resolve(body),
    });
    fetchMock
      .mockResolvedValueOnce(
        json({
          glossaries: [
            {
              glossary_id: 'old',
              name: 'kilotrace-fr-de-00000000',
              ready: true,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json({ glossary_id: 'new', name: 'x' }))
      .mockResolvedValue(
        json({
          translations: [{ detected_source_language: 'FR', text: 'Kacheln' }],
        }),
      );
    const service = new TranslationService({ deeplApiKey: 'key:fx' });

    await service.translate(['tuiles'], 'de', { source: 'fr' });
    await service.translate(['gares'], 'de', { source: 'fr' });

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'GET https://api-free.deepl.com/v3/glossaries',
      'DELETE https://api-free.deepl.com/v3/glossaries/old',
      'POST https://api-free.deepl.com/v3/glossaries',
      'POST https://api-free.deepl.com/v2/translate',
      'POST https://api-free.deepl.com/v2/translate',
    ]);
    expect(JSON.parse(calls[3][1].body as string)).toMatchObject({
      glossary_id: 'new',
      source_lang: 'FR',
    });
  });
});
