import axios from 'axios'
import {
	User,
	City,
	Sphere,
	Category,
	Subcategory,
	Vacancy,
	Resume,
	ReferralInfo,
	AccessStatus,
} from './types'
import { CONFIG } from './constants'

// Assuming the base URL from provided information
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const client = axios.create({
	baseURL: API_BASE_URL || 'https://workkg.com/api',
	timeout: 30000,
})

export const apiService = {
	// User
	async getUser(id: number): Promise<User> {
		const res = await client.get<User>(`/bot/users/${id}`)
		return res.data
	},

	async registerUser(data: any) {
		return client.post('/bot/users/register', data)
	},

	// Locations & Categories
	async getCities(id: number): Promise<City[]> {
		const res = await client.get<City[]>(`/cities/${id}`)
		return res.data
	},

	async getSpheres(id: number): Promise<Sphere[]> {
		const res = await client.get<Sphere[]>(`/categories/sphere/${id}`)
		return res.data
	},

	async getCategories(tid: number, sid: number): Promise<Category[]> {
		const res = await client.get<Category[]>(`/categories/${tid}/${sid}`)
		return res.data
	},

	async getSubcategories(tid: number, cid: number): Promise<Subcategory[]> {
		const res = await client.get<Subcategory[]>(
			`/subcategories/category/${tid}/${cid}`,
		)
		return res.data
	},

	// Search
	async searchVacancies(
		tid: number,
		cityId: number,
		sphereId: number,
		categoryId: number,
		subcategoryId: number,
		lat?: number, // Добавляем широту
		lng?: number, // Добавляем долготу
	): Promise<Vacancy[]> {
		const res = await client.post<{ results: Vacancy[] }>(
			'/bot/search/vacancies',
			{
				cityId,
				categoryId,
				subcategoryId,
				sphereId,
			},
			{
				params: {
					telegramId: tid,
					userLatitude: lat, // Передаем реальную широту
					userLongitude: lng, // Передаем реальную долготу
				},
			},
		)
		return res.data.results
	},

	async searchResumes(
		tid: number,
		cityId: number,
		sphereId: number,
		categoryId: number,
		subcategoryId: number,
	): Promise<Resume[]> {
		const res = await client.post<{ results: Resume[] }>(
			'/bot/search/resumes',
			{
				cityId,
				categoryId,
				subcategoryId,
				sphereId,
			},
			{ params: { telegramId: tid } },
		)
		return res.data.results
	},

	// Detail Fetching
	async getVacancy(
		id: number,
		telegramId: number,
		isProfile: boolean,
	): Promise<Vacancy> {
		const res = await client.get<Vacancy>(
			`/bot/vacancies/${id}/${telegramId}`,
			{
				params: { isProfile },
			},
		)
		return res.data
	},

	async getResume(
		id: number,
		telegramId: number,
		isProfile: boolean,
	): Promise<Resume> {
		const res = await client.get<Resume>(
			`/bot/resumes/${id}/${telegramId}`,
			{
				params: { isProfile },
			},
		)
		return res.data
	},

	// Record Creation
	async createVacancy(tid: number, data: any): Promise<Vacancy> {
		const res = await client.post<Vacancy>('/bot/vacancies', data, {
			params: { telegramId: tid },
		})
		return res.data
	},

	async updateVacancy(id: number, tid: number, data: any): Promise<Vacancy> {
		const res = await client.put<Vacancy>(
			`/bot/vacancies/${id}/update/${tid}`,
			data,
		)
		return res.data
	},

	async createResume(tid: number, data: any): Promise<Resume> {
		const res = await client.post<Resume>('/bot/resumes', data, {
			params: { telegramId: tid },
		})
		return res.data
	},

	async updateResume(id: number, tid: number, data: any): Promise<Resume> {
		const res = await client.put<Resume>(
			`/bot/resumes/${id}/update/${tid}`,
			data,
		)
		return res.data
	},

	// Media Uploads
	async uploadVacancyPhoto(
		vacancyId: number,
		telegramId: number,
		file: File,
	) {
		const formData = new FormData()
		formData.append('file', file)
		return client.post(
			`/bot/vacancies/${vacancyId}/media/photo`,
			formData,
			{
				params: { telegramId },
				headers: { 'Content-Type': 'multipart/form-data' },
			},
		)
	},

	async uploadVacancyVideo(
		vacancyId: number,
		telegramId: number,
		file: File,
	) {
		const formData = new FormData()
		formData.append('file', file)
		return client.post(
			`/bot/vacancies/${vacancyId}/media/video`,
			formData,
			{
				params: { telegramId },
				headers: { 'Content-Type': 'multipart/form-data' },
			},
		)
	},

	async uploadResumePhoto(resumeId: number, telegramId: number, file: File) {
		const formData = new FormData()
		formData.append('file', file)
		return client.post(`/bot/resumes/${resumeId}/media/photo`, formData, {
			params: { telegramId },
			headers: { 'Content-Type': 'multipart/form-data' },
		})
	},

	async uploadResumeVideo(resumeId: number, telegramId: number, file: File) {
		const formData = new FormData()
		formData.append('file', file)
		return client.post(`/bot/resumes/${resumeId}/media/video`, formData, {
			params: { telegramId },
			headers: { 'Content-Type': 'multipart/form-data' },
		})
	},

	// Profile Management
	async getUserVacancies(tid: number): Promise<Vacancy[]> {
		const res = await client.get<Vacancy[]>(`/bot/vacancies/user/${tid}`)
		return res.data
	},

	async getUserResumes(tid: number): Promise<Resume[]> {
		const res = await client.get<Resume[]>(`/bot/resumes/user/${tid}`)
		return res.data
	},

	// Stats & Status
	async getVacancyStats(id: number) {
		const res = await client.get(`/statistic/vacancies/${id}`)
		return res.data
	},

	async getResumeStats(id: number) {
		const res = await client.get(`/statistic/resumes/${id}`)
		return res.data
	},

	async trackView(type: 'job' | 'worker', id: number) {
		const endpoint =
			type === 'job'
				? `/statistic/vacancies/${id}/view`
				: `/statistic/resumes/${id}/view`
		return client.post(endpoint)
	},

	async getRecommendedVacancies(
		telegramId: number,
		limit: number = 10,
	): Promise<Vacancy[]> {
		const res = await client.get<Vacancy[]>(`/bot/recommended/vacancies`, {
			params: { telegramId, limit },
		})
		return res.data
	},

	async trackContactClick(type: 'job' | 'worker', id: number, tid: number) {
		const endpoint =
			type === 'job'
				? `/statistic/vacancies/${id}/contact-click`
				: `/statistic/resumes/${id}/contact-click`
		return client.post(endpoint, null, { params: { telegramId: tid } })
	},

	async checkAccess(tid: number): Promise<AccessStatus> {
		const res = await client.get<AccessStatus>(`/bot/access/${tid}/check`)
		return res.data
	},

	async apiGetReferralInfo(tid: number): Promise<ReferralInfo> {
		const res = await client.get<ReferralInfo>(`/bot/referrals/${tid}/info`)
		return res.data
	},

	async checkSocialTask(tid: number, taskId: string) {
		const res = await client.get(`/bot/tasks/${taskId}/check`, {
			params: { telegramId: tid },
		})
		return res.data
	},

	async withdrawPoints(tid: number, data: any) {
		return client.post('/bot/points/withdraw', data, {
			headers: { 'X-Telegram-Id': tid },
		})
	},

	async createPayment(tid: number, planType: string) {
		const res = await client.post<{ paymentUrl: string }>(
			`/bot/payments/create/${tid}`,
			{ planType, redirectUrl: 'https://t.me/work_random_bot' },
		)
		return res.data
	},

	async boostVacancyPoints(id: number, telegramId: number) {
		return client.post(`/bot/boost/vacancies/${id}/points`, null, {
			params: { telegramId },
		})
	},
	async boostResumePoints(id: number, telegramId: number) {
		return client.post(`/bot/boost/resumes/${id}/points`, null, {
			params: { telegramId },
		})
	},
	async getBoostStatus(type: 'vac' | 'res', id: number) {
		const url =
			type === 'vac'
				? `/bot/boost/vacancies/${id}/status`
				: `/bot/boost/resumes/${id}/status`
		const res = await client.get(url)
		return res.data
	},
	getSubscriptionStatus: async (telegramId: number) => {
		const response = await client.get(
			`/bot/subscriptions/${telegramId}/status`,
		)
		return response.data // Должен вернуть объект SubscriptionStatus
	},
}
