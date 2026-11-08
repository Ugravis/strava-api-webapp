import { checkField, type FieldRules } from "@kilotrace/shared/rules";
import { useEffect, useRef, useState } from "react";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import type { DetailEditKind, DetailEditKinds, DetailFieldEdit } from "./edit-types";
import { isEmptyValue, REQUIRED, sameValue } from "./field-edit";

/* The state of a draft, apart from the forms drawing it (`draft.tsx`). */

/** What the server answers a draft: `field` puts its message under that field; `id` is the row created. */
export interface DetailDraftResult extends ActionResult {
  field?: string;
  id?: string;
}

/** The value a draft holds for a kind: a `File` picked for an image, or its URL. */
type Held<E extends DetailEditKind> = E extends "image" ? File | string | null : DetailEditKinds[E]["value"];

/** A field bound to the draft: the options of its kind, without its value nor its save. */
export type DetailDraftSpec<T, E extends DetailEditKind> = Omit<DetailEditKinds[E], "kind" | "value" | "onSave" | "validate" | "required" | "draft"> & {
  kind: E;
  /** Refused empty, a star after its label. Its condition may hang on other fields. */
  required?: boolean;
  /** Its reason, or null; given every value of the draft, so as to hang on another field. */
  validate?: (value: Held<E>, values: T) => string | null;
  /** After a change made by the user, e.g. setting the default of another field. */
  onChange?: (value: Held<E>) => void;
};

export interface DetailDraft<T> {
  values: T;
  /** Sets a value from the page (a default following a choice): not a change of the user, `touched` stays false. */
  set: <K extends keyof T>(name: K, value: T[K]) => void;
  /** Changed by the user since the draft opened. */
  touched: (name: keyof T) => boolean;
  /** The `edit` of a `DetailField` or a `DetailColumnField` typing `name`. */
  bind: <E extends DetailEditKind>(name: keyof T & string, spec: DetailDraftSpec<T, E>) => DetailFieldEdit<E> & { kind?: E };
  /** Unlike what it opened with. */
  dirty: boolean;
  saving: boolean;
}

const differ = <T extends object>(a: T, b: T) => Object.keys({ ...a, ...b }).some((key) => !sameValue(a[key as keyof T], b[key as keyof T]));

/**
 * The state of a draft of `initial`, its fields typed while `active`. At
 * rest, a new `initial` (the row loaded again) replaces it. `submit` judges
 * every field bound (required, typed, `validate`), shows the errors and
 * focuses the first one, else hands the values to `onSubmit`.
 */
export function useDetailDraft<T extends object>(initial: T, { active = true, rules }: { active?: boolean; rules?: FieldRules<T> } = {}) {
  const [values, setValues] = useState(initial);
  const [base, setBase] = useState(initial);
  const [seen, setSeen] = useState(() => JSON.stringify(initial));
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [left, setLeft] = useState<ReadonlySet<string>>(new Set());
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [server, setServer] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Remounts the fields, dropping what they typed.
  const [generation, setGeneration] = useState(0);
  const [focusAsked, setFocusAsked] = useState(0);
  const ref = useRef<HTMLFormElement>(null);

  const key = JSON.stringify(initial);
  if (!active && key !== seen) {
    setSeen(key);
    setValues(initial);
    setBase(initial);
  }

  useEffect(() => {
    if (!focusAsked) return;
    const field = ref.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    if (!field) return;
    scrollToCentre(field);
    field.focus({ preventScroll: true });
  }, [focusAsked]);

  const forget = (name: string) => {
    setServer((all) => (name in all ? Object.fromEntries(Object.entries(all).filter(([each]) => each !== name)) : all));
    setFormError(null);
  };
  const set = <K extends keyof T>(name: K, value: T[K]) => setValues((all) => ({ ...all, [name]: value }));

  const form: DetailDraft<T> = {
    values,
    set,
    touched: (name) => touched.has(name as string),
    dirty: differ(values, base),
    saving,
    bind: (name, { kind, required: asked, validate, onChange, ...options }) => {
      const value = values[name as keyof T] as never;
      // The shared rule of the field, unless the spec says otherwise.
      const rule = rules?.[name as keyof T];
      const required = asked ?? (!!rule && "required" in rule && !!rule.required);
      const bounds = rule?.type === "number" ? { min: rule.min, max: rule.max } : {};
      const ruled = (held: unknown) => (rule ? checkField(rule, held && typeof held === "object" && "value" in held ? (held as { value: unknown }).value : held, values as Record<string, unknown>) : null);
      const own = typed[name] ?? server[name] ?? (required && isEmptyValue(value) ? REQUIRED : ((validate ? validate(value, values) : ruled(value)) ?? null));
      return {
        ...bounds,
        ...options,
        kind,
        // An image shows the file picked: `draft.raw`.
        value,
        required,
        onSave: async (next: unknown) => {
          set(name as keyof T, next as T[keyof T]);
          setTouched((all) => new Set(all).add(name));
          forget(name);
          onChange?.(next as never);
        },
        draft: {
          active,
          invalid: !!own,
          error: submitted || left.has(name) || name in server ? own : null,
          required,
          disabled: saving,
          raw: value,
          onTyped: (error: string | null) =>
            setTyped((all) => {
              if (error) return { ...all, [name]: error };
              return name in all ? Object.fromEntries(Object.entries(all).filter(([each]) => each !== name)) : all;
            }),
          // Left untouched (e.g. focused at opening), nothing told before submitting.
          onLeave: () => (touched.has(name) || name in typed) && setLeft((all) => (all.has(name) ? all : new Set(all).add(name))),
        },
      } as never;
    },
  };

  const reset = () => {
    setValues(base);
    setTouched(new Set());
    setLeft(new Set());
    setTyped({});
    setServer({});
    setFormError(null);
    setSubmitted(false);
    setGeneration((n) => n + 1);
  };

  const submit = async (onSubmit: (values: T) => Promise<DetailDraftResult | ActionResult | void>): Promise<DetailDraftResult | null> => {
    if (saving) return null;
    // Told by the fields drawn, a field hidden (of another choice) judged by none.
    const wrong = ref.current?.querySelectorAll("[data-draft-invalid]").length ?? 0;
    if (wrong > 0) {
      setSubmitted(true);
      setFormError(wrong > 1 ? `${wrong} champs à corriger.` : "Un champ à corriger.");
      setFocusAsked((n) => n + 1);
      return null;
    }
    setSaving(true);
    setFormError(null);
    try {
      const outcome = (await onSubmit(values)) ?? { ok: true, message: "" };
      if (outcome.ok) {
        // Nothing left unsaved: the panel no longer asks before leaving.
        setBase(values);
        setSubmitted(false);
        setLeft(new Set());
        return outcome;
      }
      const field: string | undefined = (outcome as DetailDraftResult).field;
      if (field) {
        setServer({ [field]: outcome.message });
        setFocusAsked((n) => n + 1);
      } else setFormError(outcome.message);
    } catch {
      setFormError("L'enregistrement a échoué. Réessayer.");
    } finally {
      setSaving(false);
    }
    return null;
  };

  return { form, ref, reset, submit, generation, formError };
}

/**
 * Scrolls the box around `field` (the body of the panel) to set it in its
 * middle; the page beneath stays where it is, which `scrollIntoView` would move too.
 */
function scrollToCentre(field: HTMLElement) {
  let box = field.parentElement;
  while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
  if (!box) return field.scrollIntoView({ block: "nearest" });
  const [at, frame] = [field.getBoundingClientRect(), box.getBoundingClientRect()];
  box.scrollBy({ top: at.top + at.height / 2 - (frame.top + frame.height / 2), behavior: "smooth" });
}
