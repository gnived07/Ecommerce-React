import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
const adminPassword = process.env.SEED_ADMIN_PASSWORD

if (!adminEmail || !adminPassword || adminPassword.length < 12) {
  throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters before seeding.')
}

const categories = [
  {
    name: 'Women', slug: 'women', description: 'Relaxed tailoring and considered everyday layers.', sortOrder: 1,
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Men', slug: 'men', description: 'Useful layers, honest fabrics, and easy proportions.', sortOrder: 2,
    imageUrl: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Objects', slug: 'objects', description: 'The small things that travel well and stay in rotation.', sortOrder: 3,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
  },
]

const products = [
  ['the-cascade-wool-coat', 'The Cascade Wool Coat', 'women', 'A softly structured coat with room for the layers beneath.', 'Italian wool blend', 1899000, 'Oat', 'photo-1539109136881-3be0616acf4b', true],
  ['everyday-linen-shirt', 'Everyday Linen Shirt', 'women', 'An easy linen shirt, cut with a little extra room through the body.', 'European flax linen', 499000, 'Natural', 'photo-1490481651871-ab68de25d43d', true],
  ['tailored-column-trouser', 'Tailored Column Trouser', 'women', 'A long, clean line in a softly draping fabric with a considered rise.', 'Recycled wool blend', 799000, 'Charcoal', 'photo-1485230895905-ec40ba36b9bc', false],
  ['fine-knit-crew', 'Fine Knit Crew', 'women', 'A light, layerable knit with a neat rib at the collar and cuffs.', 'Merino wool and cotton', 649000, 'Ecru', 'photo-1539533018447-63fcce2678e3', false],
  ['soft-structure-blazer', 'Soft Structure Blazer', 'women', 'A relaxed blazer with the shape of tailoring and the ease of a cardigan.', 'Linen and viscose', 1299000, 'Stone', 'photo-1529139574466-a303027c1d8b', true],
  ['weekend-cotton-dress', 'Weekend Cotton Dress', 'women', 'An uncomplicated cotton dress that moves easily from morning to evening.', 'Organic cotton poplin', 699000, 'Ink', 'photo-1515886657613-9f3515b0c78f', false],
  ['relaxed-wool-overshirt', 'Relaxed Wool Overshirt', 'men', 'A substantial overshirt that wears well open or buttoned as a light jacket.', 'Recycled wool blend', 1499000, 'Moss', 'photo-1519085360753-af0119f7cbe7', true],
  ['cotton-utility-jacket', 'Cotton Utility Jacket', 'men', 'A practical layer with generous pockets and a clean, pared-back finish.', 'Organic cotton canvas', 1199000, 'Olive', 'photo-1516826957135-700dedea698c', false],
  ['everyday-oxford-shirt', 'Everyday Oxford Shirt', 'men', 'A softly washed button-down, made to be worn in and worn often.', 'Cotton oxford cloth', 499000, 'Blue stripe', 'photo-1506794778202-cad84cf45f1d', false],
  ['pleated-easy-trouser', 'Pleated Easy Trouser', 'men', 'A single pleat and a generous leg give this everyday trouser its quiet shape.', 'Cotton twill', 799000, 'Cocoa', 'photo-1517365830460-955ce3ccd263', false],
  ['heavyweight-tee', 'Heavyweight Tee', 'men', 'A considered everyday tee in a dense, soft cotton jersey.', 'Organic cotton jersey', 299000, 'Chalk', 'photo-1506629905607-d9a7fa3c8d34', false],
  ['merino-crew-knit', 'Merino Crew Knit', 'men', 'A close but comfortable knit that sits neatly under a coat or overshirt.', 'Merino wool', 899000, 'Deep navy', 'photo-1512436991641-6745cdb1723f', true],
  ['weekender-leather-tote', 'Weekender Leather Tote', 'objects', 'A generous carryall in supple leather with a pocket for the small things.', 'Responsibly sourced leather', 1299000, 'Espresso', 'photo-1553062407-98eeb64c6a62', true],
  ['travel-wash-pouch', 'Travel Wash Pouch', 'objects', 'A compact canvas pouch for the useful things you take everywhere.', 'Waxed cotton canvas', 229000, 'Sand', 'photo-1490312278390-ab64016e0aa9', false],
  ['everyday-wool-scarf', 'Everyday Wool Scarf', 'objects', 'A soft, generous scarf with a fine brushed finish and simple fringe.', 'Lambswool', 349000, 'Camel', 'photo-1529139574466-a303027c1d8b', false],
  ['canvas-carry-all', 'Canvas Carry-All', 'objects', 'A sturdy canvas bag sized for the day, with an easy shoulder strap.', 'Heavyweight cotton canvas', 499000, 'Natural', 'photo-1553062407-98eeb64c6a62', false],
  ['wool-watch-cap', 'Wool Watch Cap', 'objects', 'A neat ribbed cap in warm merino, finished with a comfortable fold.', 'Merino wool', 299000, 'Charcoal', 'photo-1512436991641-6745cdb1723f', false],
  ['everyday-leather-belt', 'Everyday Leather Belt', 'objects', 'A simple leather belt with a brushed metal buckle and clean edges.', 'Vegetable-tanned leather', 449000, 'Dark brown', 'photo-1490312278390-ab64016e0aa9', false],
]

const imageUrl = (photoId) => `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=85`

try {
  const categoryRows = await Promise.all(categories.map((category) => prisma.category.upsert({
    where: { slug: category.slug },
    create: category,
    update: category,
  })))
  const categoryIds = Object.fromEntries(categoryRows.map((category) => [category.slug, category.id]))

  for (const [index, [slug, name, category, description, material, price, color, photoId, featured]] of products.entries()) {
    const current = await prisma.product.findUnique({ where: { slug }, select: { id: true } })
    if (current) {
      await prisma.product.update({ where: { id: current.id }, data: { name, description, material, featured, published: true } })
      continue
    }

    const sizes = category === 'objects' ? ['One size'] : ['S', 'M', 'L']
    await prisma.product.create({
      data: {
        name, slug, description,
        details: `${description} Designed with a focus on ease, useful details, and a shape that works across seasons.`,
        material, care: 'Cold wash with like colours. Dry flat or hang to air.',
        categoryId: categoryIds[category], featured, published: true,
        images: { create: [
          { url: imageUrl(photoId), alt: `${name} in ${color.toLowerCase()}`, sortOrder: 0 },
          { url: imageUrl(products[(index + 1) % products.length][7]), alt: `${name}, alternate view`, sortOrder: 1 },
        ] },
        variants: { create: sizes.map((size, sizeIndex) => ({
          sku: `${slug}-${size.toLowerCase().replaceAll(' ', '-')}`.toUpperCase(),
          size, color, priceCents: price, stock: category === 'objects' ? 12 : 8 + sizeIndex * 2,
        })) },
      },
    })
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, firstName: 'FitCheck', lastName: 'Admin', passwordHash, role: 'ADMIN' },
    update: { firstName: 'FitCheck', lastName: 'Admin', passwordHash, role: 'ADMIN' },
  })
  console.log(`FitCheck seed complete: ${products.length} products, ${categories.length} categories, admin ${adminEmail}`)
} finally {
  await prisma.$disconnect()
}
