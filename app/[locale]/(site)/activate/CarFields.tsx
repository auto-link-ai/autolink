'use client';

import { useState } from 'react';
import { OTHER_BRAND } from '@/lib/validation/activation';
import { CAR_BRANDS, modelsFor } from '@/lib/vehicles/brands';
import { Field, INPUT } from '../_auth/fields';

export interface CarLabels {
  brand: string;
  chooseBrand: string;
  otherBrand: string;
  brandOther: string;
  model: string;
  modelPlaceholder: string;
}

/**
 * Make and model, the way people know their car: the make from a list (most
 * common first, « Autre » for the rest), the model typed with the usual ones
 * of that make suggested underneath.
 */
export function CarFields({
  labels,
  errors,
  required,
}: {
  labels: CarLabels;
  errors: { brand?: string; brandOther?: string; model?: string };
  required: boolean;
}) {
  const [brand, setBrand] = useState('');
  const models = modelsFor(brand);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="car-brand" label={labels.brand} error={errors.brand && brand !== OTHER_BRAND ? errors.brand : undefined}>
        <select
          id="car-brand"
          name="brand"
          required={required}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className={`${INPUT} appearance-none`}
        >
          <option value="" disabled>
            {labels.chooseBrand}
          </option>
          {CAR_BRANDS.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))}
          <option value={OTHER_BRAND}>{labels.otherBrand}</option>
        </select>
      </Field>
      {brand === OTHER_BRAND && (
        <Field id="car-brand-other" label={labels.brandOther} error={errors.brandOther}>
          <input id="car-brand-other" name="brandOther" required={required} maxLength={40} autoFocus className={INPUT} />
        </Field>
      )}
      <Field id="car-model" label={labels.model} error={errors.model}>
        <input
          id="car-model"
          name="model"
          required={required}
          maxLength={40}
          list="car-models"
          placeholder={models[0] ? `${labels.modelPlaceholder} ${models[0]}` : undefined}
          autoComplete="off"
          className={INPUT}
        />
        <datalist id="car-models">
          {models.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </Field>
    </div>
  );
}
