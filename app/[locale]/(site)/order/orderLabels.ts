/**
 * Every word the order form shows, resolved on the server (the form is a
 * client component and cannot read the catalogue itself).
 */
export interface OrderFormLabels {
  fields: Record<
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
  /** The three parts of the form, numbered on the page. */
  sections: Record<'quantity' | 'contact' | 'delivery', string>;
  quantity: {
    hint: string;
    /** Under the 1, 2 and 3 cards: « voiture », « voitures »… */
    cars: [string, string, string];
    more: string;
    stickers: string;
    fewer: string;
    oneMore: string;
  };
  /** On a delivery card before a wilaya is chosen. */
  feeAfterWilaya: string;
  /** A delivery fee of 0. */
  free: string;
  extras: string;
  total: Record<'stickers' | 'delivery' | 'deliveryPending' | 'total' | 'nothingNow', string>;
  actions: Record<'order' | 'ordering', string>;
  /** Shown by the button when fields need fixing. */
  checkFields: string;
  reassurance: string;
  errors: Record<string, string>;
  notice: string;
}
