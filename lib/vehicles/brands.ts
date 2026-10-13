/**
 * Car makes seen on Algerian roads, most common first, each with the models
 * people actually drive — offered as suggestions on the activation screen, so
 * most owners tap twice instead of typing. Anything missing goes under
 * « Autre » (lib/validation/activation.ts), so the list never blocks anyone.
 */
export interface CarBrand {
  name: string;
  models: readonly string[];
}

export const CAR_BRANDS: readonly CarBrand[] = [
  { name: 'Renault', models: ['Symbol', 'Clio', 'Mégane', 'Kangoo', 'Logan', 'Sandero', 'Duster', 'Captur', 'Express', 'Master', 'Trafic'] },
  { name: 'Dacia', models: ['Logan', 'Sandero', 'Sandero Stepway', 'Duster', 'Dokker', 'Lodgy'] },
  { name: 'Peugeot', models: ['208', '301', '2008', '308', '3008', '5008', '206', '207', '307', '406', '407', 'Partner', 'Expert', 'Boxer'] },
  { name: 'Hyundai', models: ['Accent', 'i10', 'i20', 'Elantra', 'Tucson', 'Santa Fe', 'Creta', 'Atos', 'Getz', 'H-1', 'H100'] },
  { name: 'Kia', models: ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Sorento', 'Seltos', 'K2700'] },
  { name: 'Volkswagen', models: ['Golf', 'Polo', 'Caddy', 'Passat', 'Jetta', 'Tiguan', 'Touareg', 'T-Roc', 'Amarok'] },
  { name: 'Toyota', models: ['Corolla', 'Yaris', 'Hilux', 'Land Cruiser', 'Prado', 'RAV4', 'Hiace', 'Fortuner'] },
  { name: 'Chevrolet', models: ['Spark', 'Aveo', 'Sail', 'Optra', 'Cruze', 'Captiva'] },
  { name: 'Suzuki', models: ['Swift', 'Alto', 'Celerio', 'Dzire', 'Vitara', 'Jimny', 'Baleno'] },
  { name: 'Fiat', models: ['Tipo', 'Doblo', '500', 'Punto', 'Panda', 'Ducato', 'Fiorino'] },
  { name: 'Citroën', models: ['C3', 'C4', 'C-Elysée', 'Berlingo', 'Jumpy', 'Jumper', 'C5 Aircross'] },
  { name: 'Seat', models: ['Ibiza', 'Leon', 'Arona', 'Ateca'] },
  { name: 'Skoda', models: ['Octavia', 'Fabia', 'Rapid', 'Kodiaq', 'Superb'] },
  { name: 'Nissan', models: ['Sunny', 'Micra', 'Qashqai', 'Navara', 'Patrol', 'X-Trail', 'Juke'] },
  { name: 'Chery', models: ['Tiggo 2', 'Tiggo 4', 'Tiggo 7', 'Tiggo 8', 'Arrizo 5'] },
  { name: 'Geely', models: ['Coolray', 'Emgrand', 'GX3', 'Tugella'] },
  { name: 'Mercedes-Benz', models: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'Sprinter', 'Vito'] },
  { name: 'BMW', models: ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5'] },
  { name: 'Audi', models: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'] },
  { name: 'Ford', models: ['Fiesta', 'Focus', 'Ranger', 'Transit', 'Kuga'] },
  { name: 'Opel', models: ['Corsa', 'Astra', 'Insignia', 'Combo'] },
  { name: 'Mitsubishi', models: ['L200', 'Pajero', 'ASX', 'Outlander'] },
  { name: 'Isuzu', models: ['D-Max', 'NPR'] },
  { name: 'MG', models: ['ZS', 'MG5', 'HS', 'RX5'] },
  { name: 'Jetour', models: ['X70', 'Dashing'] },
  { name: 'Mazda', models: ['Mazda 2', 'Mazda 3', 'CX-3', 'CX-5'] },
  { name: 'Honda', models: ['Civic', 'Jazz', 'CR-V'] },
  { name: 'Great Wall', models: ['Wingle', 'Haval H6'] },
];

/** The models suggested once a brand is chosen; none for « Autre » or an unknown name. */
export function modelsFor(brand: string): readonly string[] {
  return CAR_BRANDS.find((entry) => entry.name === brand)?.models ?? [];
}
