import * as s from 'superstruct';
import isEmail from 'is-email';
import isUuid from 'is-uuid';

export const CreateUser = s.object({
  email: s.define('email', isEmail),
  firstName: s.size(s.string(), 1, 30),
  lastName: s.size(s.string(), 1, 30),
  address: s.string(),
  userPreference: s.object({
    receiveEmail: s.boolean(),
  }),
});

export const PatchUser = s.partial(CreateUser);

const CATEGORIES = [
  'FASHION',
  'BEAUTY',
  'SPORTS',
  'ELECTRONICS',
  'HOME_INTERIOR',
  'HOUSEHOLD_SUPPLIES',
  'KITCHENWARE',
];

export const CreateProduct = s.object({
  name: s.size(s.string(), 1, 60),
  description: s.string(),
  category: s.enums(CATEGORIES),
  price: s.min(s.number(), 0),
  stock: s.min(s.integer(), 0),
});

export const PatchProduct = s.partial(CreateProduct);

export const CreateOrder = s.object({
  userId: s.define('Uuid', (value) => isUuid.v4(value)),
  orderItems: s.array(
    s.object({
      productId: s.define('Uuid', (value) => isUuid.v4(value)),
      unitPrice: s.min(s.number(), 0),
      quantity: s.min(s.integer(), 1),
    }),
  ),
});
