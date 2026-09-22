import type { OrderStepId } from './orderSteps';

/**
 * Every word the order form shows, resolved on the server (the form is a
 * client component and cannot read the catalogue itself).
 */
export interface OrderFormLabels {
  fields: Record<
    | 'quantity'
    | 'name'
    | 'phone'
    | 'phoneHint'
    | 'email'
    | 'emailHint'
    | 'wilaya'
    | 'wilayaPlaceholder'
    | 'commune'
    | 'address'
    | 'deliveryType'
    | 'home'
    | 'stopdesk'
    | 'notes'
    | 'notesHint',
    string
  >;
  steps: Record<OrderStepId, string>;
  /** "Étape 1 sur 4", one per step. */
  progress: string[];
  summary: Record<'title' | 'unitPrice' | 'quantity' | 'delivery' | 'deliveryUnknown' | 'total' | 'cod', string>;
  actions: Record<'continue' | 'back' | 'edit' | 'confirm' | 'confirming', string>;
  errors: Record<string, string>;
  notice: string;
}
