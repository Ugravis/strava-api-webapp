/** Outcome of a back-office Server Action, told by a toast. */
export interface ActionResult {
  ok: boolean;
  message: string;
}

export type Action = (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
