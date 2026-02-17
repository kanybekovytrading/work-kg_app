// --- ОБЩИЕ ТИПЫ ---
export interface City {
	id: number
	name: string
}

export interface Sphere {
	id: number
	name: string
	icon?: string
}

export interface Category {
	id: number
	name: string
	sphereId?: number
}

export interface Subcategory {
	id: number
	name: string
	categoryId?: number
}

// --- МЕДИА ---
export interface Media {
	id: number
	mediaType: 'PHOTO' | 'VIDEO'
	fileUrl: string
	fileName?: string
	fileSize?: number
	displayOrder?: number
	uploadedAt?: string
}

// --- ПОЛЬЗОВАТЕЛЬ ---
export interface User {
	telegramId: number
	username: string
	firstName: string
	lastName?: string
	language: string
	balance: number
}

// --- ВАКАНСИЯ ---
export interface Vacancy {
	id: number
	title: string
	description: string
	salary: string
	companyName: string
	phone: string
	cityName: string
	cityId: number
	categoryName: string
	categoryId: number
	subcategoryName?: string
	subcategoryId?: number
	experienceInYear: number
	isActive: boolean | null
	telegramUsername?: string
	createdAt: string
	address: string
	schedule: string
	minAge: number
	maxAge: number
	preferredGender: 'ANY' | 'MALE' | 'FEMALE'
	media: Media[]
	// Поля для UI (добавлены для поиска)
	boosted?: boolean
	free?: boolean
	distanceKm?: number
}

// --- РЕЗЮМЕ ---
export interface Resume {
	id: number
	name: string
	age: number
	gender: 'MALE' | 'FEMALE'
	cityName: string
	cityId: number
	categoryName: string
	categoryId: number
	subcategoryName?: string
	subcategoryId?: number
	experience: number
	description: string
	isActive: boolean | null
	telegramUsername?: string
	createdAt: string
	media: Media[]
	// Поля для UI
	boosted?: boolean
	free?: boolean
}

// --- СТАТИСТИКА ---
export interface EntityStats {
	viewsCount: number
	contactClicksCount: number
	responseCount?: number // Для вакансий
	invitationCount?: number // Для резюме
}

// --- ДОСТУП И ПОДПИСКА ---
export interface AccessStatus {
	hasPro: boolean
	expiresAt?: string
	canSearchEmployees: boolean
	canSearchJobs: boolean
}

export interface SubscriptionStatus {
	hasActiveSubscription: boolean
	planType: 'THREE_DAYS' | 'ONE_WEEK' | 'ONE_MONTH' | null
	startDate: string | null
	endDate: string | null
	daysLeft: number
}

// --- ПАРТНЕРКА И ВЫВОД ---
export interface ReferralInfo {
	referralCode?: string
	referralLink: string
	referralsCount: number
	rewardPerReferral: number
}

export interface BankService {
	id: string
	code: string | null
	name: string
	icon: string
	min?: number
	max?: number
}

export interface WithdrawalInfo {
	currentPoints: number
	pointsPerSom: number
}
