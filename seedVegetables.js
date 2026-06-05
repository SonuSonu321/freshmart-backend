require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');

const vegetables = [
  { name: 'Potato (Aloo)', price: 30, discountPrice: 25, unit: 'kg', description: 'Fresh farm potatoes, perfect for all Indian dishes.', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', featured: true },
  { name: 'Onion (Pyaz)', price: 40, discountPrice: 35, unit: 'kg', description: 'Premium quality onions with strong aroma.', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400', featured: true },
  { name: 'Tomato (Tamatar)', price: 35, discountPrice: 28, unit: 'kg', description: 'Fresh red tomatoes, perfect for curries and salads.', image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400', featured: true },
  { name: 'Brinjal (Baingan)', price: 30, discountPrice: 25, unit: 'kg', description: 'Fresh purple brinjal for bharta and curry.', image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400', featured: false },
  { name: 'Lady Finger (Bhindi)', price: 40, discountPrice: 32, unit: 'kg', description: 'Tender green okra, great for bhindi masala.', image: 'https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=400', featured: false },
  { name: 'Cauliflower (Phool Gobhi)', price: 45, discountPrice: 38, unit: 'piece', description: 'Fresh white cauliflower for aloo gobhi.', image: 'https://images.unsplash.com/photo-1568584711271-6c929fb49b60?w=400', featured: false },
  { name: 'Cabbage (Patta Gobhi)', price: 30, discountPrice: 25, unit: 'piece', description: 'Crispy fresh cabbage for salads and sabzi.', image: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400', featured: false },
  { name: 'Carrot (Gajar)', price: 35, discountPrice: 28, unit: 'kg', description: 'Crunchy orange carrots for juices and halwa.', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', featured: true },
  { name: 'Radish (Mooli)', price: 25, discountPrice: null, unit: 'kg', description: 'Fresh white radish for paratha and salads.', image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400', featured: false },
  { name: 'Beetroot (Chukandar)', price: 35, discountPrice: 28, unit: 'kg', description: 'Fresh beetroot rich in iron and nutrients.', image: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=400', featured: false },
  { name: 'Bottle Gourd (Lauki)', price: 25, discountPrice: 20, unit: 'piece', description: 'Fresh lauki for healthy curry and kofta.', image: 'https://images.unsplash.com/photo-1635849090842-3ced9b3b7f6a?w=400', featured: false },
  { name: 'Bitter Gourd (Karela)', price: 40, discountPrice: 32, unit: 'kg', description: 'Fresh karela packed with health benefits.', image: 'https://images.unsplash.com/photo-1603048674062-b41b7cebf1a8?w=400', featured: false },
  { name: 'Ridge Gourd (Turai)', price: 30, discountPrice: 25, unit: 'kg', description: 'Fresh turai for light sabzi.', image: 'https://images.unsplash.com/photo-1635849090842-3ced9b3b7f6a?w=400', featured: false },
  { name: 'Pumpkin (Kaddu)', price: 25, discountPrice: 20, unit: 'kg', description: 'Fresh pumpkin for halwa and sabzi.', image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400', featured: false },
  { name: 'Capsicum (Shimla Mirch)', price: 60, discountPrice: 50, unit: 'kg', description: 'Colorful capsicum for paneer dishes and pizza.', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400', featured: false },
  { name: 'Green Chilli (Hari Mirch)', price: 30, discountPrice: 25, unit: 'gram', description: 'Fresh green chillies for perfect spice.', image: 'https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=400', featured: false },
  { name: 'Cucumber (Kheera)', price: 30, discountPrice: 25, unit: 'kg', description: 'Fresh cucumbers for salads and raita.', image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400', featured: false },
  { name: 'Ginger (Adrak)', price: 80, discountPrice: 65, unit: 'gram', description: 'Fresh aromatic ginger root.', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400', featured: false },
  { name: 'Garlic (Lahsun)', price: 60, discountPrice: 50, unit: 'gram', description: 'Fresh garlic pods for flavourful cooking.', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400', featured: false },
  { name: 'Spinach (Palak)', price: 25, discountPrice: 20, unit: 'piece', description: 'Tender fresh spinach leaves loaded with iron.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', featured: true },
  { name: 'Fenugreek Leaves (Methi)', price: 20, discountPrice: null, unit: 'piece', description: 'Fresh methi for methi paratha and aloo methi.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', featured: false },
  { name: 'Coriander Leaves (Dhaniya)', price: 15, discountPrice: null, unit: 'piece', description: 'Fresh coriander for garnish and chutney.', image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400', featured: false },
  { name: 'Mustard Greens (Sarson)', price: 20, discountPrice: null, unit: 'piece', description: 'Fresh sarson for sarson da saag.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', featured: false },
  { name: 'Curry Leaves (Kadi Patta)', price: 10, discountPrice: null, unit: 'piece', description: 'Fresh curry leaves for tadka and seasoning.', image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400', featured: false },
  { name: 'Mint Leaves (Pudina)', price: 15, discountPrice: null, unit: 'piece', description: 'Fresh mint for chutney and raita.', image: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400', featured: false },
  { name: 'Green Peas (Matar)', price: 60, discountPrice: 50, unit: 'kg', description: 'Fresh green peas for matar paneer and pulao.', image: 'https://images.unsplash.com/photo-1563288262-27dc5e534b4a?w=400', featured: true },
  { name: 'Green Beans (French Beans)', price: 50, discountPrice: 40, unit: 'kg', description: 'Tender French beans for stir fry.', image: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=400', featured: false },
  { name: 'Cluster Beans (Gawar Phali)', price: 40, discountPrice: 32, unit: 'kg', description: 'Fresh gawar phali for Rajasthani sabzi.', image: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=400', featured: false },
  { name: 'Broad Beans (Sem Phali)', price: 45, discountPrice: 36, unit: 'kg', description: 'Fresh sem phali for curry.', image: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=400', featured: false },
  { name: 'Sweet Corn (Bhutta)', price: 20, discountPrice: null, unit: 'piece', description: 'Fresh sweet corn for roasting and soups.', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400', featured: false },
  { name: 'Mushroom', price: 80, discountPrice: 65, unit: 'gram', description: 'Fresh button mushrooms for pasta and curry.', image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400', featured: true },
  { name: 'Sweet Potato (Shakarkandi)', price: 35, discountPrice: 28, unit: 'kg', description: 'Fresh sweet potatoes rich in vitamins.', image: 'https://images.unsplash.com/photo-1596780628888-49f6f48b4c7d?w=400', featured: false },
  { name: 'Drumstick (Sahjan)', price: 40, discountPrice: 32, unit: 'piece', description: 'Fresh drumsticks for sambar and curry.', image: 'https://images.unsplash.com/photo-1568584711271-6c929fb49b60?w=400', featured: false },
  { name: 'Tinda (Round Gourd)', price: 30, discountPrice: 25, unit: 'kg', description: 'Fresh tinda for light and healthy sabzi.', image: 'https://images.unsplash.com/photo-1635849090842-3ced9b3b7f6a?w=400', featured: false },
  { name: 'Parwal (Pointed Gourd)', price: 35, discountPrice: 28, unit: 'kg', description: 'Fresh parwal for traditional curry.', image: 'https://images.unsplash.com/photo-1635849090842-3ced9b3b7f6a?w=400', featured: false },
  { name: 'Arbi (Colocasia)', price: 40, discountPrice: 32, unit: 'kg', description: 'Fresh arbi for fry and curry.', image: 'https://images.unsplash.com/photo-1596780628888-49f6f48b4c7d?w=400', featured: false },
  { name: 'Turnip (Shalgam)', price: 25, discountPrice: 20, unit: 'kg', description: 'Fresh turnip for Punjabi dishes.', image: 'https://images.unsplash.com/photo-1568584711271-6c929fb49b60?w=400', featured: false },
  { name: 'Amaranth Leaves (Chaulai)', price: 20, discountPrice: null, unit: 'piece', description: 'Fresh chaulai leaves rich in protein.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', featured: false },
  { name: 'Raw Banana (Kachha Kela)', price: 30, discountPrice: 25, unit: 'piece', description: 'Fresh raw banana for kofta and chips.', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', featured: false },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let cat = await Category.findOne({ slug: 'vegetables' });
    if (!cat) {
      cat = await Category.create({ name: 'Vegetables', slug: 'vegetables', description: 'Fresh vegetables', order: 1 });
    }

    let added = 0, skipped = 0;
    for (const v of vegetables) {
      const exists = await Product.findOne({ name: v.name });
      if (exists) { skipped++; continue; }
      const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      await Product.create({
        name: v.name, slug, category: cat._id,
        price: v.price, discountPrice: v.discountPrice || undefined,
        description: v.description, images: [v.image],
        stockQuantity: 100, unit: v.unit,
        isAvailable: true, isFeatured: v.featured || false,
        averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        numReviews: Math.floor(Math.random() * 50) + 5
      });
      console.log(`Added: ${v.name}`);
      added++;
    }
    console.log(`Done! Added: ${added}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
