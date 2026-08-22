import { useCallback, useState } from "react";
import type { z } from "zod";

import { toMessage } from "@/lib/errors";
import { fieldErrors } from "@/lib/validation";

/**
 * Zod-backed form state: values, per-field errors, a submit-level error, and a
 * pending flag. Every screen was repeating this by hand; centralising it means
 * validation, error mapping, and the try/finally around submission behave the
 * same everywhere.
 */
export function useForm<TOut, TFields extends Record<string, string>>(
  schema: z.ZodType<TOut>,
  initial: TFields
) {
  const [values, setValues] = useState<TFields>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TFields, string>>>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback((key: keyof TFields, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Validates, then runs `onValid` only if the shape holds. Anything thrown
   * inside `onValid` surfaces as the form-level error, so screens never need
   * their own try/catch.
   */
  const submit = useCallback(
    async (onValid: (data: TOut) => Promise<void> | void) => {
      setFormError(null);
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        setErrors(fieldErrors(parsed.error) as Partial<Record<keyof TFields, string>>);
        return;
      }

      setErrors({});
      setSubmitting(true);
      try {
        await onValid(parsed.data);
      } catch (e) {
        setFormError(toMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [schema, values]
  );

  return {
    values,
    setField,
    errors,
    formError,
    setFormError,
    submitting,
    submit,
  };
}
