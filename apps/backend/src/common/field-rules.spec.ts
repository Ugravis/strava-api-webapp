import { BadRequestException } from '@nestjs/common';
import type { FieldRules } from '@kilotrace/shared/rules';
import { assertRules } from './field-rules';

interface Badge {
  name: string | null;
  threshold: number | null;
  availableFrom: string | null;
  endsAt: string | null;
}

const RULES: FieldRules<Badge> = {
  name: { type: 'text', required: true, maxLength: 5 },
  threshold: { type: 'number', required: true, min: 1, max: 10, unit: 'km' },
  availableFrom: { type: 'date' },
  endsAt: {
    type: 'date',
    after: { field: 'availableFrom', message: 'La fin doit suivre le début.' },
  },
};

const refusal = (run: () => void) => {
  try {
    run();
  } catch (error) {
    return (error as BadRequestException).getResponse();
  }
  return null;
};

describe('assertRules', () => {
  it('accepts a row following its rules', () => {
    expect(
      refusal(() =>
        assertRules(RULES, {
          name: 'Ultra',
          threshold: 3,
          availableFrom: '2026-01-01',
          endsAt: '2026-02-01T10:00:00.000Z',
        }),
      ),
    ).toBeNull();
  });

  it('names the first field refused', () => {
    expect(
      refusal(() => assertRules(RULES, { name: null, threshold: 3 })),
    ).toEqual({
      code: 'INVALID_FIELD',
      field: 'name',
      message: 'Champ obligatoire.',
    });
    expect(
      refusal(() => assertRules(RULES, { name: 'Ultra', threshold: 30 })),
    ).toMatchObject({
      field: 'threshold',
      message: 'Le nombre doit être entre 1 et 10 km.',
    });
  });

  it('checks a patch against the stored row', () => {
    const row = {
      name: 'Ultra',
      threshold: 3,
      availableFrom: '2026-05-01',
      endsAt: null,
    };
    expect(
      refusal(() =>
        assertRules(
          RULES,
          { endsAt: '2026-04-01T10:00:00.000Z' },
          { partial: true, row },
        ),
      ),
    ).toMatchObject({ field: 'endsAt' });
    // A start moved after the stored end refuses the end.
    expect(
      refusal(() =>
        assertRules(
          RULES,
          { availableFrom: '2026-06-01' },
          {
            partial: true,
            row: { ...row, endsAt: '2026-05-15T00:00:00.000Z' },
          },
        ),
      ),
    ).toMatchObject({ field: 'endsAt' });
    expect(
      refusal(() =>
        assertRules(RULES, { threshold: 4 }, { partial: true, row }),
      ),
    ).toBeNull();
  });
});
