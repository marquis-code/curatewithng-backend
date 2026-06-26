const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const products = await db.collection('gifts').find({
    isApproved: true,
    isAvailable: true,
    isDeleted: false,
    stock: { $gt: 0 },
    occasions: { $in: ['valentines'] },
    price: { $gte: 500000, $lte: 5000000 },
  }).toArray();
  console.log('Products found:', products.length);
  if (products.length > 0) {
    console.log(products.map(p => ({ name: p.name, price: p.price, tags: p.tags })));
  }
  process.exit(0);
}
run();
