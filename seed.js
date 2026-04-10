const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Product = require('./models/Product');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@luxuryperfume.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Admin user created:', adminUser.email);

    // Create test user
    const testUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('Test user created:', testUser.email);

    // Create sample products
    const products = [
      {
        name: 'Royal Oud',
        description: 'A luxurious blend of rare oud wood, sandalwood, and amber. This masterpiece captures the essence of Arabian royalty with rich, deep notes that evolve throughout the day. Perfect for evening occasions and special moments.',
        price: 299.99,
        originalPrice: 349.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800', alt: 'Royal Oud' }
        ],
        stockQuantity: 50,
        lowStockThreshold: 10,
        sku: 'ROYAL-OUD-001',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Bergamot, Pink Pepper',
          middle: 'Rare Oud Wood, Rose',
          base: 'Sandalwood, Amber, Musk'
        },
        isFeatured: true,
        ratings: { average: 4.8, count: 124 }
      },
      {
        name: 'Midnight Jasmine',
        description: 'An enchanting nocturnal floral fragrance featuring jasmine absolute, ylang-ylang, and a hint of moonflower. Creates an aura of mystery and elegance that lingers throughout the night.',
        price: 189.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800', alt: 'Midnight Jasmine' }
        ],
        stockQuantity: 75,
        lowStockThreshold: 15,
        sku: 'MID-JAS-002',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Mandarin, Nectarine',
          middle: 'Jasmine Absolute, Ylang-Ylang',
          base: 'White Musk, Sandalwood'
        },
        isFeatured: true,
        ratings: { average: 4.6, count: 89 }
      },
      {
        name: 'Golden Elixir',
        description: 'A warm, sensual fragrance inspired by ancient Egyptian perfumery. Notes of honey, saffron, and vanilla create a rich, intoxicating scent that evokes luxury and opulence.',
        price: 249.99,
        originalPrice: 299.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800', alt: 'Golden Elixir' }
        ],
        stockQuantity: 30,
        lowStockThreshold: 8,
        sku: 'GOLD-ELX-003',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Saffron, Orange Blossom',
          middle: 'Turkish Rose, Honey',
          base: 'Vanilla, Benzoin, Oud'
        },
        isFeatured: true,
        ratings: { average: 4.9, count: 156 }
      },
      {
        name: 'Ocean Breeze',
        description: 'A fresh, aquatic fragrance capturing the essence of a Mediterranean coastline. Crisp sea notes blend with citrus and Mediterranean herbs for an invigorating, clean scent experience.',
        price: 149.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800', alt: 'Ocean Breeze' }
        ],
        stockQuantity: 100,
        lowStockThreshold: 20,
        sku: 'OCN-BRZ-004',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Lemon, Bergamot, Sea Salt',
          middle: 'Marine Accord, Lavender',
          base: 'Cedarwood, White Musk'
        },
        isFeatured: false,
        ratings: { average: 4.4, count: 67 }
      },
      {
        name: 'Arabian Oil - Amber Dreams',
        description: 'A traditional Arabian perfume oil crafted with the finest amber, musk, and exotic spices. Long-lasting oil format perfect for those who prefer concentrated, intimate fragrances.',
        price: 79.99,
        category: 'oil',
        images: [
          { url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', alt: 'Amber Dreams Oil' }
        ],
        stockQuantity: 200,
        lowStockThreshold: 30,
        sku: 'AMB-DRM-005',
        brand: 'Luxury Perfume',
        size: '12ml',
        notes: {
          top: 'Cardamom, Cinnamon',
          middle: 'Amber, Rose',
          base: 'Musk, Sandalwood, Oud'
        },
        isFeatured: true,
        ratings: { average: 4.7, count: 203 }
      },
      {
        name: 'Rose Absolute',
        description: 'Pure rose perfume oil extracted from Damask roses. This romantic, feminine oil captures the essence of fresh roses in full bloom. Perfect for romantic occasions or daily wear.',
        price: 99.99,
        category: 'oil',
        images: [
          { url: 'https://images.unsplash.com/photo-1616606103915-dea7be788566?w=800', alt: 'Rose Absolute Oil' }
        ],
        stockQuantity: 150,
        lowStockThreshold: 25,
        sku: 'ROS-ABS-006',
        brand: 'Luxury Perfume',
        size: '10ml',
        notes: {
          top: 'Fresh Rose, Geranium',
          middle: 'Rose Absolute, Peony',
          base: 'White Musk, Powder'
        },
        isFeatured: false,
        ratings: { average: 4.5, count: 112 }
      },
      {
        name: 'Luxury Gift Set - Signature Collection',
        description: 'Our most popular gift set featuring three signature fragrances in 50ml bottles: Royal Oud, Midnight Jasmine, and Golden Elixir. Presented in an elegant gift box with ribbon.',
        price: 499.99,
        originalPrice: 599.99,
        category: 'gift set',
        images: [
          { url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800', alt: 'Gift Set' }
        ],
        stockQuantity: 25,
        lowStockThreshold: 5,
        sku: 'GIFT-SIG-007',
        brand: 'Luxury Perfume',
        size: '3x50ml',
        notes: {
          top: 'Various',
          middle: 'Various',
          base: 'Various'
        },
        isFeatured: true,
        ratings: { average: 4.8, count: 78 }
      },
      {
        name: 'Velvet Noir',
        description: 'A sophisticated evening fragrance with deep, sensual notes of black orchid, patchouli, and dark chocolate. Perfect for night events and special occasions.',
        price: 279.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800', alt: 'Velvet Noir' }
        ],
        stockQuantity: 5,
        lowStockThreshold: 10,
        sku: 'VEL-NOR-008',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Black Orchid, Plum',
          middle: 'Dark Chocolate, Incense',
          base: 'Patchouli, Vanilla, Leather'
        },
        isFeatured: false,
        ratings: { average: 4.7, count: 45 }
      },
      {
        name: 'Citrus Sunrise',
        description: 'An energizing daytime fragrance featuring bright citrus notes, fresh herbs, and a clean, modern dry down. Perfect for the office or active lifestyles.',
        price: 129.99,
        category: 'perfume',
        images: [
          { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800', alt: 'Citrus Sunrise' }
        ],
        stockQuantity: 80,
        lowStockThreshold: 15,
        sku: 'CIT-SUN-009',
        brand: 'Luxury Perfume',
        size: '100ml',
        notes: {
          top: 'Lemon, Grapefruit, Bergamot',
          middle: 'Basil, Green Tea',
          base: 'Cedar, White Musk'
        },
        isFeatured: false,
        ratings: { average: 4.3, count: 93 }
      },
      {
        name: 'Musk Pure',
        description: 'A clean, skin-like musk fragrance that enhances your natural scent. This versatile scent is perfect for everyday wear and layering with other fragrances.',
        price: 69.99,
        category: 'oil',
        images: [
          { url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', alt: 'Musk Pure Oil' }
        ],
        stockQuantity: 0,
        lowStockThreshold: 20,
        sku: 'MUS-PUR-010',
        brand: 'Luxury Perfume',
        size: '10ml',
        notes: {
          top: 'Aldehydes',
          middle: 'White Musk',
          base: 'Soft Powder'
        },
        isFeatured: false,
        ratings: { average: 4.2, count: 167 }
      }
    ];

    await Product.insertMany(products);
    console.log('Created', products.length, 'products');

    console.log('\n✓ Seed data created successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@luxuryperfume.com / admin123');
    console.log('User: john@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
