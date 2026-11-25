import { registerAs } from '@nestjs/config';

export interface TranslationConfig {
  /** DeepL API key; free ones end with `:fx` and use the free endpoint. Null: nothing is translated. */
  deeplApiKey: string | null;
}

export default registerAs('translation', (): TranslationConfig => ({
  deeplApiKey: process.env.DEEPL_API_KEY || null,
}));
