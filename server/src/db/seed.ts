import { db } from './index.js'
import {
  ranks,
  categories,
  courses,
  users,
  enrollments,
  notifications,
  subscriptions,
} from './schema.js'
import { hashPassword } from '../lib/hash.js'
import { clearRankCache } from '../lib/rank.js'

// mockData.js dan ko'chirilgan seed ma'lumotlari.
const RANKS = [
  { name: 'Junior Engineer', emoji: '🥉', minXp: 0, color: '#CD7F32' },
  { name: 'Robotics Explorer', emoji: '🥈', minXp: 1000, color: '#C0C0C0' },
  { name: 'Future Engineer', emoji: '🥇', minXp: 2500, color: '#FFD700' },
  { name: 'Master Engineer', emoji: '💎', minXp: 5000, color: '#06B6D4' },
  { name: 'PilotKids Legend', emoji: '🚀', minXp: 10000, color: '#2563EB' },
]

const CATEGORIES = [
  { name: 'Robototexnika', slug: 'robototexnika' },
  { name: 'Arduino', slug: 'arduino' },
  { name: 'Elektronika', slug: 'elektronika' },
  { name: 'Sensorlar', slug: 'sensorlar' },
  { name: 'Muhandislik', slug: 'muhandislik' },
  { name: '3D Dizayn', slug: '3d-dizayn' },
  { name: 'Dasturlash Asoslari', slug: 'dasturlash-asoslari' },
]

const COURSES = [
  { title: 'Robototexnika Asoslari', slug: 'robototexnika-asoslari', category: 'Robototexnika', difficulty: 'Boshlang\'ich', duration: '8 hafta', lessons: 24, thumbnail: 'robotics', progress: 75 },
  { title: 'Arduino Dasturlash', slug: 'arduino-dasturlash', category: 'Arduino', difficulty: 'O\'rta', duration: '6 hafta', lessons: 18, thumbnail: 'arduino', progress: 45 },
  { title: 'Elektronika Sxemalari', slug: 'elektronika-sxemalari', category: 'Elektronika', difficulty: 'Boshlang\'ich', duration: '5 hafta', lessons: 15, thumbnail: 'electronics', progress: 100 },
  { title: 'Sensorlar va IoT', slug: 'sensorlar-va-iot', category: 'Sensorlar', difficulty: 'O\'rta', duration: '7 hafta', lessons: 21, thumbnail: 'sensors', progress: 20 },
  { title: 'Muhandislik Dizayni', slug: 'muhandislik-dizayni', category: 'Muhandislik', difficulty: 'Yuqori', duration: '10 hafta', lessons: 30, thumbnail: 'engineering', progress: 0 },
  { title: '3D Modellashtirish', slug: '3d-modellashtirish', category: '3D Dizayn', difficulty: 'O\'rta', duration: '6 hafta', lessons: 16, thumbnail: '3d', progress: 60 },
  { title: 'Python Dasturlash', slug: 'python-dasturlash', category: 'Dasturlash Asoslari', difficulty: 'Boshlang\'ich', duration: '8 hafta', lessons: 22, thumbnail: 'coding', progress: 30 },
  { title: 'Robot Qo\'l Yig\'ish', slug: 'robot-qol-yigish', category: 'Robototexnika', difficulty: 'Yuqori', duration: '12 hafta', lessons: 36, thumbnail: 'robot-arm', progress: 10 },
]

// leaderboard — Sardor Karimov = demo user (isCurrentUser). rank matnlari mockda
// bor edi, lekin API rank'ni XP'dan hisoblaydi (izchilroq).
const LEADERBOARD = [
  { name: 'Aziza Rahimova', email: 'aziza.rahimova@pilotkids.uz', xp: 12450, badges: 12, weeklyXp: 850 },
  { name: 'Jasur Toshmatov', email: 'jasur.toshmatov@pilotkids.uz', xp: 9870, badges: 10, weeklyXp: 720 },
  { name: 'Malika Yusupova', email: 'malika.yusupova@pilotkids.uz', xp: 8650, badges: 9, weeklyXp: 680 },
  { name: 'Sardor Karimov', email: 'demo@pilotkids.uz', xp: 4850, badges: 6, weeklyXp: 420, isDemo: true },
  { name: 'Dilshod Mirzayev', email: 'dilshod.mirzayev@pilotkids.uz', xp: 4320, badges: 5, weeklyXp: 380 },
  { name: 'Nodira Aliyeva', email: 'nodira.aliyeva@pilotkids.uz', xp: 3890, badges: 5, weeklyXp: 350 },
  { name: 'Bekzod Karimov', email: 'bekzod.karimov@pilotkids.uz', xp: 3450, badges: 4, weeklyXp: 310 },
  { name: 'Zarina Umarova', email: 'zarina.umarova@pilotkids.uz', xp: 2980, badges: 4, weeklyXp: 290 },
  { name: 'Rustam Ismoilov', email: 'rustam.ismoilov@pilotkids.uz', xp: 2340, badges: 3, weeklyXp: 250 },
  { name: 'Gulnora Saidova', email: 'gulnora.saidova@pilotkids.uz', xp: 1890, badges: 2, weeklyXp: 180 },
]

const DEMO_NOTIFICATIONS = [
  'Yangi dars: Sensorlar moduli 3',
  'Sertifikat tayyor: Elektronika Asoslari',
  'Haftalik reytingda 4-o\'rin!',
]

async function seed() {
  console.log('🌱 Seed boshlandi...')

  // Idempotent — FK-xavfsiz tartibda tozalash
  await db.delete(subscriptions)
  await db.delete(notifications)
  await db.delete(enrollments)
  await db.delete(users)
  await db.delete(courses)
  await db.delete(categories)
  await db.delete(ranks)
  console.log('  🧹 Eski ma\'lumotlar tozalandi')

  // Ranks
  await db.insert(ranks).values(
    RANKS.map((r, i) => ({ ...r, sortOrder: i }))
  )
  console.log(`  🏅 ${RANKS.length} daraja qo'shildi`)

  // Categories → name->id map
  const insertedCats = await db.insert(categories).values(CATEGORIES).returning()
  const catId = new Map(insertedCats.map((c) => [c.name, c.id]))
  console.log(`  📁 ${insertedCats.length} toifa qo'shildi`)

  // Courses → slug->id map
  const insertedCourses = await db
    .insert(courses)
    .values(
      COURSES.map((c) => {
        const categoryId = catId.get(c.category)
        if (!categoryId) throw new Error(`Toifa topilmadi: ${c.category}`)
        return {
          title: c.title,
          slug: c.slug,
          description: `${c.title} — ${c.category} yo'nalishidagi amaliy kurs.`,
          categoryId,
          difficulty: c.difficulty,
          duration: c.duration,
          totalLessons: c.lessons,
          thumbnail: c.thumbnail,
          isPremium: c.difficulty === 'Yuqori',
        }
      })
    )
    .returning()
  const courseIdBySlug = new Map(insertedCourses.map((c) => [c.slug, c.id]))
  console.log(`  📚 ${insertedCourses.length} kurs qo'shildi`)

  // Users — demo uchun 'demo1234', boshqalar uchun placeholder parol
  const demoHash = await hashPassword('demo1234')
  const otherHash = await hashPassword('password123')

  const insertedUsers = await db
    .insert(users)
    .values(
      LEADERBOARD.map((u) => ({
        name: u.name,
        email: u.email,
        passwordHash: u.isDemo ? demoHash : otherHash,
        xp: u.xp,
        weeklyXp: u.weeklyXp,
        badges: u.badges,
        isPremium: Boolean(u.isDemo),
      }))
    )
    .returning()
  console.log(`  👤 ${insertedUsers.length} foydalanuvchi qo'shildi`)

  const demo = insertedUsers.find((u) => u.email === 'demo@pilotkids.uz')
  if (!demo) throw new Error('Demo user yaratilmadi')

  // Demo user'ning kurslarga yozilishi (mockdagi progress qiymatlari)
  const demoEnrollments = COURSES.filter((c) => c.progress > 0).map((c) => {
    const courseId = courseIdBySlug.get(c.slug)
    if (!courseId) throw new Error(`Kurs topilmadi: ${c.slug}`)
    return {
      userId: demo.id,
      courseId,
      progressPercent: c.progress,
      completedAt: c.progress >= 100 ? new Date() : null,
    }
  })
  await db.insert(enrollments).values(demoEnrollments)
  console.log(`  🎓 Demo user ${demoEnrollments.length} kursga yozildi`)

  // Demo notifications
  await db.insert(notifications).values(
    DEMO_NOTIFICATIONS.map((message, i) => ({
      userId: demo.id,
      message,
      read: i === 2,
    }))
  )

  // Demo Premium obuna
  await db.insert(subscriptions).values({
    userId: demo.id,
    plan: 'Premium',
    status: 'active',
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  })
  console.log('  💳 Demo Premium obuna qo\'shildi')

  clearRankCache()
  console.log('✅ Seed tugadi! Demo: demo@pilotkids.uz / demo1234')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed xatosi:', err)
    process.exit(1)
  })
