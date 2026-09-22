import { describe, expect, it } from 'vitest';
import { fieldsOfStep, ORDER_STEPS, REVIEW_STEP, stepWithField } from '@/app/[locale]/(site)/order/orderSteps';
import { orderInputSchema } from '@/lib/validation/order';

describe('the order steps', () => {
  const asked = ORDER_STEPS.flatMap((step) => [...step.fields]);

  it('asks for every field of the order, each on exactly one step', () => {
    const wanted = Object.keys(orderInputSchema(10).shape).sort();
    expect([...asked].sort()).toEqual(wanted);
    expect(new Set(asked).size).toBe(asked.length);
  });

  it('ends on a step that asks for nothing: the review', () => {
    expect(ORDER_STEPS[REVIEW_STEP]?.id).toBe('review');
    expect(fieldsOfStep(REVIEW_STEP)).toEqual([]);
    expect(fieldsOfStep(99)).toEqual([]);
  });

  it('sends a refused field back to the step that asks for it', () => {
    expect(stepWithField(['customerName'])).toBe(1);
    expect(stepWithField(['address'])).toBe(2);
    // The earliest step wins, so the customer fixes things in order.
    expect(stepWithField(['address', 'phone'])).toBe(1);
    expect(stepWithField(['nothing-of-ours'])).toBeNull();
  });
});
