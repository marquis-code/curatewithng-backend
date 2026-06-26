import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { VendorsService } from './modules/vendors/vendors.service';
import { GiftsService } from './modules/gifts/gifts.service';
import { OrdersService } from './modules/orders/orders.service';
import { UserRole, BudgetTier, OrderStatus, PaymentStatus } from './shared/types';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const vendorsService = app.get(VendorsService);
  const giftsService = app.get(GiftsService);
  const ordersService = app.get(OrdersService);
  const dbConnection = app.get<Connection>(getConnectionToken());

  console.log('--- Aggressively Seeding Database for Demo ---');

  // 1. Wipe Existing DB
  console.log('Wiping database collections...');
  try {
    await dbConnection.dropDatabase();
    console.log('Database wiped successfully.');
  } catch (error) {
    console.warn('Could not wipe database entirely:', error);
  }

  // 2. Create System Admin
  console.log('Creating Admin...');
  const admin = await usersService.create({
    email: 'admin@curatewithng.com',
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.ADMIN,
    phone: '+2348000000000',
    isVerified: true,
    isActive: true,
  });

  // 3. Create Vendors
  console.log('Creating Vendors...');
  const vendorData = [
    {
      user: {
        email: 'vendor1@curatewithng.com',
        firstName: 'Oluwa',
        lastName: 'Luxury',
        role: UserRole.VENDOR,
        phone: '+2348011111111',
        isVerified: true,
        isActive: true,
      },
      profile: {
        businessName: 'Oluwa Luxury Hampers',
        description: 'Premium curated gift hampers for all occasions.',
        categories: ['hampers', 'luxury'],
        location: { state: 'Lagos', city: 'Lekki', address: '14 Admiralty Way' },
        bankDetails: { bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Oluwa Luxury Ltd' },
        isApproved: true,
      }
    },
    {
      user: {
        email: 'vendor2@curatewithng.com',
        firstName: 'Tech',
        lastName: 'Gadgets',
        role: UserRole.VENDOR,
        phone: '+2348022222222',
        isVerified: true,
        isActive: true,
      },
      profile: {
        businessName: 'TechGadgets NG',
        description: 'The best tech gifts and accessories.',
        categories: ['electronics', 'gadgets'],
        location: { state: 'Lagos', city: 'Ikeja', address: 'Computer Village' },
        bankDetails: { bankName: 'Access Bank', accountNumber: '9876543210', accountName: 'TechGadgets NG' },
        isApproved: true,
      }
    },
    {
      user: {
        email: 'vendor3@curatewithng.com',
        firstName: 'Bella',
        lastName: 'Beauty',
        role: UserRole.VENDOR,
        phone: '+2348033333333',
        isVerified: true,
        isActive: true,
      },
      profile: {
        businessName: 'Bella Beauty & Skincare',
        description: 'Authentic beauty, skincare, and wellness products.',
        categories: ['beauty', 'skincare'],
        location: { state: 'Abuja', city: 'Wuse', address: 'Plot 100 Wuse 2' },
        bankDetails: { bankName: 'Zenith Bank', accountNumber: '1122334455', accountName: 'Bella Beauty' },
        isApproved: true,
      }
    }
  ];

  const vendorDocs = [];
  for (const v of vendorData) {
    const user = await usersService.create(v.user);
    // Overriding isApproved if the service ignores it in DTO
    const vendor = await vendorsService.create(user._id.toString(), v.profile);
    
    // Manually approve vendor for demo purposes directly using Mongoose model via Service if needed. 
    // Wait, DTO doesn't have isApproved, it's set by Admin. We might need to manually update DB.
    await dbConnection.collection('vendors').updateOne(
      { _id: vendor._id },
      { $set: { isApproved: true } }
    );

    vendorDocs.push({ user, vendor });
  }

  // 4. Create Gifts
  console.log('Creating Gifts...');
  const giftData = [
    // Vendor 1 (Hampers)
    {
      vendorIndex: 0,
      gift: {
        name: 'The Ultimate Celebration Hamper',
        description: 'A massive basket filled with premium wines, imported chocolates, crackers, and exotic cheeses.',
        category: 'hampers',
        tags: ['luxury', 'wine', 'chocolate', 'anniversary'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-hamper1.jpg'],
        price: 15000000, // 150k NGN
        occasions: ['anniversary', 'wedding', 'corporate'],
        recipientTypes: ['couple', 'corporate', 'family'],
        budgetTier: BudgetTier.LUXURY,
        stock: 10,
      }
    },
    {
      vendorIndex: 0,
      gift: {
        name: 'Sweet Tooth Box',
        description: 'Assortment of fine candies and truffles in a beautiful pink box.',
        category: 'hampers',
        tags: ['candy', 'sweet', 'cute'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-sweet.jpg'],
        price: 3500000, // 35k NGN
        occasions: ['birthday', 'just-because', 'valentines'],
        recipientTypes: ['her', 'kids', 'friend'],
        budgetTier: BudgetTier.MID,
        stock: 25,
      }
    },
    // Vendor 2 (Tech)
    {
      vendorIndex: 1,
      gift: {
        name: 'Noise Cancelling Wireless Headphones',
        description: 'Industry-leading noise canceling over-ear headphones with 30-hour battery life.',
        category: 'electronics',
        tags: ['tech', 'audio', 'headphones'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-headphones.jpg'],
        price: 25000000, // 250k NGN
        occasions: ['birthday', 'graduation', 'anniversary'],
        recipientTypes: ['him', 'teen', 'corporate'],
        budgetTier: BudgetTier.PREMIUM,
        stock: 5,
      }
    },
    {
      vendorIndex: 1,
      gift: {
        name: 'Smart Fitness Watch',
        description: 'Track your health, workouts, and receive notifications on the go.',
        category: 'electronics',
        tags: ['fitness', 'smartwatch', 'tech'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-watch.jpg'],
        price: 8500000, // 85k NGN
        occasions: ['birthday', 'new-year', 'just-because'],
        recipientTypes: ['him', 'her', 'teen'],
        budgetTier: BudgetTier.MID,
        stock: 15,
      }
    },
    // Vendor 3 (Beauty)
    {
      vendorIndex: 2,
      gift: {
        name: 'Radiance Skincare Set',
        description: 'A 5-piece skincare set for glowing, hydrated skin. Includes serum, moisturizer, and cleanser.',
        category: 'beauty',
        tags: ['skincare', 'glow', 'self-care'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-skincare.jpg'],
        price: 4500000, // 45k NGN
        occasions: ['birthday', 'valentines', 'mothers-day'],
        recipientTypes: ['her', 'mom'],
        budgetTier: BudgetTier.MID,
        stock: 20,
      }
    },
    {
      vendorIndex: 2,
      gift: {
        name: 'Luxury Perfume Collection',
        description: 'A set of three miniature luxury perfumes from top designer brands.',
        category: 'beauty',
        tags: ['perfume', 'fragrance', 'luxury'],
        images: ['https://res.cloudinary.com/djd18sqhi/image/upload/v1/curatewithng/demo-perfume.jpg'],
        price: 12000000, // 120k NGN
        occasions: ['anniversary', 'birthday', 'valentines'],
        recipientTypes: ['her', 'him'],
        budgetTier: BudgetTier.PREMIUM,
        stock: 8,
      }
    }
  ];

  const giftDocs = [];
  for (const g of giftData) {
    const vendorId = vendorDocs[g.vendorIndex].vendor._id.toString();
    const gift = await giftsService.create(vendorId, g.gift);
    
    // Manually approve and make available for demo
    await dbConnection.collection('gifts').updateOne(
      { _id: gift._id },
      { $set: { isApproved: true, isAvailable: true } }
    );
    giftDocs.push(gift);
  }

  // 5. Create Shoppers
  console.log('Creating Shoppers...');
  const shopper1 = await usersService.create({
    email: 'shopper1@curatewithng.com',
    firstName: 'Demo',
    lastName: 'Shopper',
    role: UserRole.USER,
    phone: '+2348044444444',
    isVerified: true,
    isActive: true,
  });

  const shopper2 = await usersService.create({
    email: 'shopper2@curatewithng.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.USER,
    phone: '+2348055555555',
    isVerified: true,
    isActive: true,
  });

  // 6. Create Orders
  console.log('Creating Orders...');
  
  // Shopper 1 orders the Ultimate Hamper
  const order1Gift = giftDocs[0];
  await ordersService.create(shopper1._id.toString(), {
    items: [
      {
        giftId: order1Gift._id.toString(),
        vendorId: order1Gift.vendorId.toString(),
        quantity: 1,
        unitPrice: order1Gift.price,
      }
    ],
    recipient: {
      name: 'Mr. & Mrs. Adelaja',
      phone: '+2348066666666',
      address: '15 Victoria Island, Lagos',
      note: 'Happy Anniversary!',
      deliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    }
  });

  // Manually update the first order to PAID and PROCESSING
  const ordersList = await dbConnection.collection('orders').find().toArray();
  if (ordersList.length > 0) {
    await dbConnection.collection('orders').updateOne(
      { _id: ordersList[0]._id },
      { 
        $set: { 
          paymentStatus: PaymentStatus.PAID, 
          status: OrderStatus.PROCESSING,
          paystackReference: 'demo_ref_12345'
        } 
      }
    );
  }

  // Shopper 2 orders Skincare and Watch
  const order2Gift1 = giftDocs[4]; // Skincare
  const order2Gift2 = giftDocs[3]; // Watch
  await ordersService.create(shopper2._id.toString(), {
    items: [
      {
        giftId: order2Gift1._id.toString(),
        vendorId: order2Gift1.vendorId.toString(),
        quantity: 2,
        unitPrice: order2Gift1.price,
      },
      {
        giftId: order2Gift2._id.toString(),
        vendorId: order2Gift2.vendorId.toString(),
        quantity: 1,
        unitPrice: order2Gift2.price,
      }
    ],
    recipient: {
      name: 'John Doe',
      phone: '+2348077777777',
      address: 'Plot 20, Gwarinpa, Abuja',
      note: 'Happy Birthday John!',
      deliveryDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    }
  });

  console.log('--------------------------------------------------');
  console.log('Demo Data Seeding Complete!');
  console.log('You can log in with:');
  console.log('Admin: admin@curatewithng.com / Password123!');
  console.log('Vendor: vendor1@curatewithng.com / Password123!');
  console.log('Shopper: shopper1@curatewithng.com / Password123!');
  console.log('--------------------------------------------------');

  await app.close();
}

bootstrap();
