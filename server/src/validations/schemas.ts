import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lsin'),
  email: z.string().trim().email('Email noto\'g\'ri formatda'),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lsin'),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Email noto\'g\'ri formatda'),
  password: z.string().min(1, 'Parol kiriting'),
})

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lsin').optional(),
    avatarUrl: z.string().url('Avatar URL noto\'g\'ri').nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.avatarUrl !== undefined, {
    message: 'Kamida bitta maydon o\'zgartirilishi kerak',
  })

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
  newPassword: z.string().min(6, 'Yangi parol kamida 6 ta belgidan iborat bo\'lsin'),
})

export const progressSchema = z.object({
  progress: z.number().int().min(0).max(100),
})
