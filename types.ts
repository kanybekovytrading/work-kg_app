export interface City {
	id: number
	name: string
}

export interface Sphere {
	id: number
	name: string
}

export interface Category {
	id: number
	name: string
}

export interface Subcategory {
	id: number
	name: string
}

export interface AccessStatus {
	canSearchEmployees: boolean
	canSearchJobs: boolean
}

export interface WithdrawalInfo {
	currentPoints: number
	pointsPerSom: number
}

export interface ReferralInfo {
	referralCode: string
	referralLink: string
	referralsCount: number
	rewardPerReferral: number
}

export interface BankService {
	id: string
	code: string | null
	name: string
	icon: string
	min: number
	max: number
}

export interface User {
	telegramId: number
	username: string
	firstName: string
	lastName?: string
	language: string
	balance: number
}

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
	sphereId: number
}

export interface Subcategory {
	id: number
	name: string
	categoryId: number
}

export interface Media {
	id: number
	mediaType: 'PHOTO' | 'VIDEO'
	fileUrl: string
	fileName: string
	fileSize: number
	displayOrder: number
	uploadedAt: string
}

export interface Vacancy {
	id: number
	title: string
	description: string
	salary: string
	companyName: string
	phone: string
	cityName: string
	cityId?: number
	categoryName: string
	categoryId?: number
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
}

export interface Resume {
	id: number
	name: string
	age: number
	gender: 'MALE' | 'FEMALE'
	cityName: string
	cityId?: number
	categoryName: string
	categoryId?: number
	subcategoryName?: string
	subcategoryId?: number
	experience: number
	description: string
	isActive: boolean | null
	telegramUsername?: string
	createdAt: string
	media: Media[]
}

export interface ReferralInfo {
	referralsCount: number
	rewardPerReferral: number
	referralLink: string
}

export interface AccessStatus {
	hasPro: boolean
	expiresAt?: string
}
