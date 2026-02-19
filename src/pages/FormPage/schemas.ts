// schemas.ts
import * as z from 'zod'

const commonFields = {
	cityId: z.number().min(1, 'Выберите город'),
	sphereId: z.number().min(1, 'Выберите сферу'),
	categoryId: z.number().min(1, 'Выберите категорию'),
	subcategoryId: z.number().optional(),
	description: z
		.string()
		.min(10, 'Описание слишком короткое (мин. 10 симв.)'),
}

export const vacancySchema = z.object({
	...commonFields,
	title: z.string().min(2, 'Введите название вакансии'),
	companyName: z.string().min(2, 'Укажите название компании'),
	minAge: z.number().min(14, 'От 14 лет').optional(),
	maxAge: z.number().max(100, 'До 100 лет').optional(),
	salary: z.string().min(1, 'Укажите зарплату'),
	experienceInYear: z.number().default(0),
	schedule: z.string().min(2, 'Укажите график (напр. 5/2)'),
	phone: z.string().min(10, 'Введите корректный номер'),
	// nullable() добавляем, чтобы совместиться с API, если придет null
	address: z.string().optional().nullable(),
	latitude: z.number().optional().nullable(),
	longitude: z.number().optional().nullable(),
	preferredGender: z.enum(['MALE', 'FEMALE', 'ANY']),
})

export const resumeSchema = z.object({
	...commonFields,
	name: z.string().min(2, 'Введите ваше имя'),
	age: z.coerce.number().min(14, 'Минимум 14 лет').max(100),
	experience: z.coerce.number().default(0),
	gender: z.enum(['MALE', 'FEMALE']),
	phone: z.string().min(10, 'Введите корректный номер'),
})

export type VacancyFormData = z.infer<typeof vacancySchema>
export type ResumeFormData = z.infer<typeof resumeSchema>

export const formatPhoneKG = (val: string) => {
	let digits = val.replace(/\D/g, '')
	if (!digits.startsWith('996')) digits = '996' + digits
	return '+' + digits.slice(0, 12)
}
