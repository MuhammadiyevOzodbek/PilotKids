import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Kurslar ro'yxati (kirgan bo'lsa progress bilan). Token AuthContext'da bo'lsa
// api client uni avtomatik qo'shadi.
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/api/courses').then((d) => d.courses),
  })
}

// Leaderboard (top 10, XP bo'yicha)
export function useRanking() {
  return useQuery({
    queryKey: ['ranking'],
    queryFn: () => api.get('/api/ranking').then((d) => d.leaderboard),
  })
}
