import express from 'express';
import { PrismaClient } from '@prisma/client';
import { assert } from 'superstruct';
import { CreateOrder, CreateProduct, CreateUser, PatchProduct, PatchUser } from './structs.js';

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

// users
app.post('/users', async (req, res) => {
  assert(req.body, CreateUser);
  const { userPreference, ...userFields } = req.body;

  const user = await prisma.user.create({
    data: {
      ...userFields,
      userPreference: {
        create: userPreference,
      },
    },
    include: {
      userPreference: true,
    },
  });
  user.user;
  res.status(201).send(user);
});

app.get('/users', async (req, res) => {
  const { offset = 0, limit = 0, order = 'newest' } = req.query;
  let orderBy;
  switch (order) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }
  const users = await prisma.user.findMany({
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit),
    include: {
      userPreference: true,
    },
  });
  res.send(users);
});

app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { userPreference: true },
  });
  if (user) {
    res.send(user);
  } else {
    res.status(404).send({ message: 'Cannot find given id' });
  }
});

app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  assert(req.body, PatchUser);
  const { userPreference, ...userFields } = req.body;
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...userFields,
      userPreference: {
        update: userPreference,
      },
    },
    include: {
      userPreference: true,
    },
  });
  res.send(user);
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.delete({
    where: { id },
  });
  res.send(user);
});

// products
app.post('/products', async (req, res) => {
  const data = req.body;
  assert(data, CreateProduct);
  const product = await prisma.product.create({
    data,
  });
  res.status(201).send(product);
});

app.get('/products', async (req, res) => {
  const { offset = 0, limit = 0, order = 'newest', category } = req.query;
  let orderBy;
  switch (order) {
    case 'priceLowest':
      orderBy = { price: 'asc' };
      break;
    case 'priceHighest':
      orderBy = { price: 'desc' };
      break;
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }
  const where = category ? { category } : {};
  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit),
  });
  res.send(products);
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({
    where: { id },
  });
  res.send(product);
});

app.patch('/products/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  assert(data, PatchProduct);
  const product = await prisma.product.update({
    where: { id },
    data,
  });
  res.send(product);
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.delete({
    where: { id },
  });
  res.send(product);
});

// Orders
app.get('/orders', async (req, res) => {
  const data = await prisma.order.findMany();
  res.send(data);
});

app.post('/orders', async (req, res) => {
  assert(req.body, CreateOrder);
  const { orderItems, ...orderProperties } = req.body;

  const productIds = orderItems.map((orderItem) => orderItem.productId);

  function getQuantity(productId) {
    const orderItem = orderItems.find((orderItem) => orderItem.productId === productId);
    return orderItem.quantity;
  }

  // 재고가 충분한가?
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const isSufficientStock = products.every((product) => {
    const { id, stock } = product;
    return stock >= getQuantity(id);
  });

  if (!isSufficientStock) {
    return res.status(500).send({ message: 'Insufficient Stock' });
  }

  const queries = productIds.map((id) => {
    return prisma.product.update({
      where: { id },
      data: { stock: { decrement: getQuantity(id) } },
    });
  });

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        user: {
          connect: { id: orderProperties.userId },
        },
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: true,
      },
    }),
    ...queries,
  ]);

  res.send(order);
});

app.listen(process.env.PORT || 3000, () => console.log(`Server started`));
