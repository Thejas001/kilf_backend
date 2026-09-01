import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Validates req.body/query/params against a zod schema shaped as
 * { body?, query?, params? } and replaces them with the parsed (and
 * coerced/defaulted) values.
 */
export function validate(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    }) as { body?: unknown; query?: unknown; params?: unknown };

    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query as typeof req.query;
    if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;

    next();
  };
}
