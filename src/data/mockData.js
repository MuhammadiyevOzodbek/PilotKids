export const RANKS = [
  { name: 'Junior Engineer', emoji: '🥉', minXp: 0, color: '#CD7F32' },
  { name: 'Robotics Explorer', emoji: '🥈', minXp: 1000, color: '#C0C0C0' },
  { name: 'Future Engineer', emoji: '🥇', minXp: 2500, color: '#FFD700' },
  { name: 'Master Engineer', emoji: '💎', minXp: 5000, color: '#06B6D4' },
  { name: 'PilotKids Legend', emoji: '🚀', minXp: 10000, color: '#2563EB' },
]

export const COURSE_CATEGORIES = [
  'Robototexnika',
  'Arduino',
  'Elektronika',
  'Sensorlar',
  'Muhandislik',
  '3D Dizayn',
  'Dasturlash Asoslari',
]

export const courses = [
  { id: 1, title: 'Robototexnika Asoslari', category: 'Robototexnika', difficulty: 'Boshlang\'ich', duration: '8 hafta', progress: 75, lessons: 24, thumbnail: 'robotics' },
  { id: 2, title: 'Arduino Dasturlash', category: 'Arduino', difficulty: 'O\'rta', duration: '6 hafta', progress: 45, lessons: 18, thumbnail: 'arduino' },
  { id: 3, title: 'Elektronika SXemalari', category: 'Elektronika', difficulty: 'Boshlang\'ich', duration: '5 hafta', progress: 100, lessons: 15, thumbnail: 'electronics' },
  { id: 4, title: 'Sensorlar va IoT', category: 'Sensorlar', difficulty: 'O\'rta', duration: '7 hafta', progress: 20, lessons: 21, thumbnail: 'sensors' },
  { id: 5, title: 'Muhandislik Dizayni', category: 'Muhandislik', difficulty: 'Yuqori', duration: '10 hafta', progress: 0, lessons: 30, thumbnail: 'engineering' },
  { id: 6, title: '3D Modellashtirish', category: '3D Dizayn', difficulty: 'O\'rta', duration: '6 hafta', progress: 60, lessons: 16, thumbnail: '3d' },
  { id: 7, title: 'Python Dasturlash', category: 'Dasturlash Asoslari', difficulty: 'Boshlang\'ich', duration: '8 hafta', progress: 30, lessons: 22, thumbnail: 'coding' },
  { id: 8, title: 'Robot Qo\'l Yig\'ish', category: 'Robototexnika', difficulty: 'Yuqori', duration: '12 hafta', progress: 10, lessons: 36, thumbnail: 'robot-arm' },
]

export const leaderboard = [
  { id: 1, name: 'Aziza Rahimova', xp: 12450, rank: 'PilotKids Legend', avatar: 'AR', badges: 12, weeklyXp: 850 },
  { id: 2, name: 'Jasur Toshmatov', xp: 9870, rank: 'Master Engineer', avatar: 'JT', badges: 10, weeklyXp: 720 },
  { id: 3, name: 'Malika Yusupova', xp: 8650, rank: 'Master Engineer', avatar: 'MY', badges: 9, weeklyXp: 680 },
  { id: 4, name: 'Sardor Karimov', xp: 4850, rank: 'Robotics Explorer', avatar: 'SK', badges: 6, weeklyXp: 420, isCurrentUser: true },
  { id: 5, name: 'Dilshod Mirzayev', xp: 4320, rank: 'Robotics Explorer', avatar: 'DM', badges: 5, weeklyXp: 380 },
  { id: 6, name: 'Nodira Aliyeva', xp: 3890, rank: 'Future Engineer', avatar: 'NA', badges: 5, weeklyXp: 350 },
  { id: 7, name: 'Bekzod Karimov', xp: 3450, rank: 'Future Engineer', avatar: 'BK', badges: 4, weeklyXp: 310 },
  { id: 8, name: 'Zarina Umarova', xp: 2980, rank: 'Future Engineer', avatar: 'ZU', badges: 4, weeklyXp: 290 },
  { id: 9, name: 'Rustam Ismoilov', xp: 2340, rank: 'Robotics Explorer', avatar: 'RI', badges: 3, weeklyXp: 250 },
  { id: 10, name: 'Gulnora Saidova', xp: 1890, rank: 'Junior Engineer', avatar: 'GS', badges: 2, weeklyXp: 180 },
]

export const benefits = [
  { icon: 'Cpu', title: 'Amaliy Loyihalar', desc: 'Haqiqiy robotlar yig\'ish va dasturlash orqali o\'rganing' },
  { icon: 'Users', title: 'Mentor Qo\'llab-quvvatlash', desc: 'Tajribali muhandislar tomonidan yo\'l-yo\'riq' },
  { icon: 'Trophy', title: 'Sertifikatlar', desc: 'Har bir kursni tugatganda rasmiy sertifikat oling' },
  { icon: 'Zap', title: 'Interaktiv Darslar', desc: 'Video, simulyator va jonli mashg\'ulotlar' },
  { icon: 'Shield', title: 'Xavfsiz Muhit', desc: 'Bolalar uchun maxsus himoyalangan platforma' },
  { icon: 'TrendingUp', title: 'Progress Kuzatuvi', desc: 'Ota-onalar uchun batafsil hisobotlar' },
]

export const roadmap = [
  { step: 1, title: 'Asoslar', desc: 'Elektronika va dasturlash asoslarini o\'rganing', icon: 'BookOpen' },
  { step: 2, title: 'Arduino', desc: 'Mikrokontrollerlar bilan ishlashni boshlang', icon: 'CircuitBoard' },
  { step: 3, title: 'Sensorlar', desc: 'Atrof-muhitni sezuvchi qurilmalar yarating', icon: 'Radio' },
  { step: 4, title: 'Robototexnika', desc: 'O\'z robotingizni loyihalang va yig\'ing', icon: 'Bot' },
  { step: 5, title: 'Loyiha', desc: 'Yakuniy loyihani taqdim eting va sertifikat oling', icon: 'Award' },
]

export const achievements = [
  { student: 'Aziza R.', project: 'Avtonom Robot', award: 'Oltin Medal', date: '2025' },
  { student: 'Jasur T.', project: 'Smart Uy Tizimi', award: 'Kumush Medal', date: '2025' },
  { student: 'Malika Y.', project: '3D Printer Robot', award: 'Bronza Medal', date: '2024' },
  { student: 'Sardor K.', project: 'Line Follower', award: 'Eng Yaxshi Loyiha', date: '2024' },
]

export const faqs = [
  { q: 'PilotKids kimlar uchun?', a: 'PilotKids 8-18 yoshdagi bolalar va o\'smirlar uchun mo\'ljallangan. Dasturlash tajribasi talab qilinmaydi.' },
  { q: 'Qanday qurilmalar kerak?', a: 'Kompyuter yoki planshet va internet yetarli. Ba\'zi kurslar uchun Arduino to\'plami tavsiya etiladi.' },
  { q: 'Obuna qanday bekor qilinadi?', a: 'Har qanday vaqtda sozlamalar bo\'limidan obunani bekor qilishingiz mumkin.' },
  { q: 'Sertifikatlar haqiqiymi?', a: 'Ha, barcha sertifikatlar PilotKids tomonidan tasdiqlangan va portfolio uchun ishlatilishi mumkin.' },
  { q: 'Bepul sinov mavjudmi?', a: 'Ha, 7 kunlik bepul sinov davri mavjud. Kredit karta talab qilinmaydi.' },
]

export const testimonials = [
  { name: 'Dilnoza Karimova', role: 'Ota-ona', text: 'Farzandim robototexnikani juda yaxshi o\'rgandi. PilotKids ajoyib platforma!', rating: 5 },
  { name: 'Bobur Toshmatov', role: '12 yosh', text: 'O\'z robotimni yig\'dim va maktabda ko\'rgazmada ishtirok etdim. Zo\'r!', rating: 5 },
  { name: 'Feruza Mirzayeva', role: 'Ota-ona', text: 'Mentorlar juda sabrli va professional. Farzandim har kuni darslarni kutadi.', rating: 5 },
]

export const weeklyChartData = [
  { day: 'Du', hours: 1.5 },
  { day: 'Se', hours: 2 },
  { day: 'Ch', hours: 1 },
  { day: 'Pa', hours: 2.5 },
  { day: 'Ju', hours: 3 },
  { day: 'Sh', hours: 2 },
  { day: 'Ya', hours: 1 },
]

export const notifications = [
  { id: 1, text: 'Yangi dars: Sensorlar moduli 3', time: '2 soat oldin', unread: true },
  { id: 2, text: 'Sertifikat tayyor: Elektronika Asoslari', time: '1 kun oldin', unread: true },
  { id: 3, text: 'Haftalik reytingda 4-o\'rin!', time: '2 kun oldin', unread: false },
]

export const upcomingLessons = [
  { id: 1, title: 'Arduino: PWM Signallar', time: 'Bugun, 16:00', course: 'Arduino Dasturlash' },
  { id: 2, title: 'Sensor Kalibrlash', time: 'Ertaga, 14:00', course: 'Sensorlar va IoT' },
  { id: 3, title: 'Robot Chiziq Kuzatuvchi', time: 'Juma, 15:00', course: 'Robototexnika Asoslari' },
]
