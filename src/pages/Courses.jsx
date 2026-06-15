import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import CourseCard from '../components/ui/CourseCard'
import PageTransition from '../components/ui/PageTransition'
import { courses, COURSE_CATEGORIES } from '../data/mockData'

export default function Courses() {
  const [category, setCategory] = useState('Barchasi')
  const [search, setSearch] = useState('')

  const filtered = courses.filter((c) => {
    const matchCat = category === 'Barchasi' || c.category === category
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Kurslar</h1>
          <p className="text-slate-500 mt-2">Robototexnika va muhandislik kurslarini kashf eting</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors duration-300 group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Kurs qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300 hover:border-primary/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {['Barchasi', ...COURSE_CATEGORIES].map((cat) => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                category === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md'
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <CourseCard course={course} />
            </motion.div>
          ))}
        </div>
      </PageTransition>
    </DashboardLayout>
  )
}
