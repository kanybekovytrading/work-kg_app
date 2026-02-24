import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { configureStore } from '@reduxjs/toolkit'
import {
	Category,
	City,
	Resume,
	Sphere,
	Subcategory,
	User,
	Vacancy,
	ReferralInfo,
	AccessStatus,
} from '@/types'

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || 'https://workkg.com/api'

export const workKgApi = createApi({
	reducerPath: 'workKgApi',
	baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
	tagTypes: [
		'User',
		'Vacancy',
		'Resume',
		'ProfileList',
		'Subscription',
		'Stats',
		'Referral',
	],
	endpoints: (builder) => ({
		// --- ПОЛЬЗОВАТЕЛЬ ---
		getUser: builder.query<User, number>({
			query: (id) => `/bot/users/${id}`,
			providesTags: ['User'],
		}),
		registerUser: builder.mutation<void, any>({
			query: (data) => ({
				url: '/bot/users/register',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['User'],
		}),

		// --- СПРАВОЧНИКИ ---
		getCities: builder.query<City[], number>({
			query: (id) => `/cities/${id}`,
			keepUnusedDataFor: 3600,
		}),
		getSpheres: builder.query<Sphere[], number>({
			query: (id) => `/categories/sphere/${id}`,
			keepUnusedDataFor: 3600,
		}),
		getCategories: builder.query<Category[], { tid: number; sid: number }>({
			query: ({ tid, sid }) => `/categories/${tid}/${sid}`,
			keepUnusedDataFor: 3600,
		}),
		getSubcategories: builder.query<
			Subcategory[],
			{ tid: number; cid: number }
		>({
			query: ({ tid, cid }) => `/subcategories/category/${tid}/${cid}`,
			keepUnusedDataFor: 3600,
		}),

		// --- ЗАГРУЗКА МЕДИА (BATCH ТОЛЬКО ДЛЯ ВАКАНСИЙ) ---
		uploadMediaBatch: builder.mutation<
			void,
			{
				entity: 'vacancies' | 'resumes' // Добавили выбор сущности
				id: number
				tid: number
				files: File[]
			}
		>({
			query: ({ entity, id, tid, files }) => {
				const formData = new FormData()
				files.forEach((file) => {
					formData.append('files', file)
				})

				return {
					// Динамический URL: /bot/vacancies/... или /bot/resumes/...
					url: `/bot/${entity}/${id}/media/batch`,
					method: 'POST',
					body: formData,
					params: { telegramId: tid },
				}
			},
			// Умная инвалидация кэша в зависимости от того, что обновляли
			invalidatesTags: (result, error, { entity, id }) => [
				{ type: entity === 'vacancies' ? 'Vacancy' : 'Resume', id },
				'ProfileList',
			],
		}),

		// Для резюме пока оставляем старый метод или создаем новый,
		// если бэкенд поддерживает batch и для резюме - скажи, добавлю.
		// Пока оставил uploadMediaMutation удаленным, как ты просил.

		// --- ОСТАЛЬНЫЕ МЕТОДЫ (Без изменений) ---
		updateVacancyStatus: builder.mutation<
			void,
			{ id: number; tid: number; isActive: boolean }
		>({
			query: ({ id, tid, isActive }) => ({
				url: `/bot/vacancies/${id}/status`,
				method: 'PUT',
				params: { telegramId: tid, isActive },
			}),
			invalidatesTags: ['ProfileList', 'Vacancy'],
		}),
		updateResumeStatus: builder.mutation<
			void,
			{ id: number; tid: number; isActive: boolean }
		>({
			query: ({ id, tid, isActive }) => ({
				url: `/bot/resumes/${id}/status`,
				method: 'PUT',
				params: { telegramId: tid, isActive },
			}),
			invalidatesTags: ['ProfileList', 'Resume'],
		}),
		deleteVacancy: builder.mutation<void, { id: number; tid: number }>({
			query: ({ id, tid }) => ({
				url: `/bot/vacancies/${id}`,
				method: 'DELETE',
				params: { telegramId: tid },
			}),
			invalidatesTags: ['ProfileList'],
		}),
		deleteResume: builder.mutation<void, { id: number; tid: number }>({
			query: ({ id, tid }) => ({
				url: `/bot/resumes/${id}`,
				method: 'DELETE',
				params: { telegramId: tid },
			}),
			invalidatesTags: ['ProfileList'],
		}),
		searchVacancies: builder.query<Vacancy[], any>({
			query: (args) => {
				const { tid, userLatitude, userLongitude, ...filters } = args
				const queryParams: any = { telegramId: tid }
				if (typeof userLatitude === 'number')
					queryParams.userLatitude = userLatitude
				if (typeof userLongitude === 'number')
					queryParams.userLongitude = userLongitude

				return {
					url: '/bot/search/vacancies',
					method: 'POST',
					body: filters,
					params: queryParams,
				}
			},
			transformResponse: (response: { results: Vacancy[] }) =>
				response.results,
		}),
		searchResumes: builder.query<Resume[], any>({
			query: ({ tid, ...body }) => ({
				url: '/bot/search/resumes',
				method: 'POST',
				body,
				params: { telegramId: tid },
			}),
			transformResponse: (response: { results: Resume[] }) =>
				response.results,
		}),
		getVacancyDetail: builder.query<
			Vacancy,
			{ id: number; tid: number; isProfile: boolean }
		>({
			query: ({ id, tid, isProfile }) => ({
				url: `/bot/vacancies/${id}/${tid}`,
				params: { isProfile },
			}),
			providesTags: (result, error, { id }) => [{ type: 'Vacancy', id }],
		}),
		getResumeDetail: builder.query<
			Resume,
			{ id: number; tid: number; isProfile: boolean }
		>({
			query: ({ id, tid, isProfile }) => ({
				url: `/bot/resumes/${id}/${tid}`,
				params: { isProfile },
			}),
			providesTags: (result, error, { id }) => [{ type: 'Resume', id }],
		}),
		createVacancy: builder.mutation<Vacancy, { tid: number; data: any }>({
			query: ({ tid, data }) => ({
				url: '/bot/vacancies',
				method: 'POST',
				body: data,
				params: { telegramId: tid },
			}),
			invalidatesTags: ['ProfileList', 'Vacancy'],
		}),
		updateVacancy: builder.mutation<
			Vacancy,
			{ id: number; tid: number; data: any }
		>({
			query: ({ id, tid, data }) => ({
				url: `/bot/vacancies/${id}/update/${tid}`,
				method: 'PUT',
				body: data,
			}),
			invalidatesTags: (result, error, { id }) => [
				'ProfileList',
				{ type: 'Vacancy', id },
			],
		}),
		createResume: builder.mutation<Resume, { tid: number; data: any }>({
			query: ({ tid, data }) => ({
				url: '/bot/resumes',
				method: 'POST',
				body: data,
				params: { telegramId: tid },
			}),
			invalidatesTags: ['ProfileList', 'Resume'],
		}),
		updateResume: builder.mutation<
			Resume,
			{ id: number; tid: number; data: any }
		>({
			query: ({ id, tid, data }) => ({
				url: `/bot/resumes/${id}/update/${tid}`,
				method: 'PUT',
				body: data,
			}),
			invalidatesTags: (result, error, { id }) => [
				'ProfileList',
				{ type: 'Resume', id },
			],
		}),
		getUserVacancies: builder.query<Vacancy[], number>({
			query: (tid) => `/bot/vacancies/user/${tid}`,
			providesTags: ['ProfileList'],
		}),
		getUserResumes: builder.query<Resume[], number>({
			query: (tid) => `/bot/resumes/user/${tid}`,
			providesTags: ['ProfileList'],
		}),
		getRecommendedVacancies: builder.query<
			Vacancy[],
			{ tid: number; limit?: number }
		>({
			query: ({ tid, limit = 10 }) => ({
				url: `/bot/recommended/vacancies`,
				params: { telegramId: tid, limit },
			}),
			providesTags: ['Vacancy'],
		}),
		getVacancyStats: builder.query<any, number>({
			query: (id) => `/statistic/vacancies/${id}`,
			providesTags: (result, error, id) => [{ type: 'Stats', id }],
		}),
		getResumeStats: builder.query<any, number>({
			query: (id) => `/statistic/resumes/${id}`,
			providesTags: (result, error, id) => [{ type: 'Stats', id }],
		}),
		trackView: builder.mutation<
			void,
			{ type: 'job' | 'worker'; id: number }
		>({
			query: ({ type, id }) => ({
				url: `/statistic/${type === 'job' ? 'vacancies' : 'resumes'}/${id}/view`,
				method: 'POST',
			}),
			invalidatesTags: (result, error, { id }) => [{ type: 'Stats', id }],
		}),
		trackContactClick: builder.mutation<
			void,
			{ type: 'job' | 'worker'; id: number; tid: number }
		>({
			query: ({ type, id, tid }) => ({
				url: `/statistic/${type === 'job' ? 'vacancies' : 'resumes'}/${id}/contact-click`,
				method: 'POST',
				params: { telegramId: tid },
			}),
			invalidatesTags: (result, error, { id }) => [{ type: 'Stats', id }],
		}),
		checkAccess: builder.query<AccessStatus, number>({
			query: (tid) => `/bot/access/${tid}/check`,
		}),
		getSubscriptionStatus: builder.query<any, number>({
			query: (tid) => `/bot/subscriptions/${tid}/status`,
			providesTags: ['Subscription'],
		}),
		getReferralInfo: builder.query<ReferralInfo, number>({
			query: (tid) => `/bot/referrals/${tid}/info`,
			providesTags: ['Referral'],
		}),
		checkSocialTask: builder.query<any, { tid: number; taskId: string }>({
			query: ({ tid, taskId }) => ({
				url: `/bot/tasks/${taskId}/check`,
				params: { telegramId: tid },
			}),
		}),
		withdrawPoints: builder.mutation<any, { tid: number; data: any }>({
			query: ({ tid, data }) => ({
				url: '/bot/points/withdraw',
				method: 'POST',
				body: data,
				headers: { 'X-Telegram-Id': tid.toString() },
				responseHandler: async (response) => {
					if (
						response.status === 204 ||
						response.headers.get('content-length') === '0'
					)
						return {}
					const text = await response.text()
					try {
						return JSON.parse(text)
					} catch {
						return { status: text || 'success' }
					}
				},
			}),
			invalidatesTags: ['User'],
		}),
		createPayment: builder.mutation<any, { tid: number; planType: string }>(
			{
				query: ({ tid, planType }) => ({
					url: `/bot/payments/create/${tid}`,
					method: 'POST',
					body: {
						planType,
						redirectUrl: 'https://t.me/work_random_bot',
					},
				}),
			},
		),
		boostVacancy: builder.mutation<void, { id: number; tid: number }>({
			query: ({ id, tid }) => ({
				url: `/bot/boost/vacancies/${id}/points`,
				method: 'POST',
				params: { telegramId: tid },
			}),
			invalidatesTags: ['User', 'ProfileList', 'Vacancy'],
		}),
		boostResume: builder.mutation<void, { id: number; tid: number }>({
			query: ({ id, tid }) => ({
				url: `/bot/boost/resumes/${id}/points`,
				method: 'POST',
				params: { telegramId: tid },
			}),
			invalidatesTags: ['User', 'ProfileList', 'Resume'],
		}),
		getBoostStatus: builder.query<any, { type: 'vac' | 'res'; id: number }>(
			{
				query: ({ type, id }) =>
					`/bot/boost/${type === 'vac' ? 'vacancies' : 'resumes'}/${id}/status`,
			},
		),
	}),
})

export const {
	useGetUserQuery,
	useRegisterUserMutation,
	useGetCitiesQuery,
	useGetSpheresQuery,
	useGetCategoriesQuery,
	useGetSubcategoriesQuery,
	useSearchVacanciesQuery,
	useSearchResumesQuery,
	useGetVacancyDetailQuery,
	useGetResumeDetailQuery,
	useCreateVacancyMutation,
	useUpdateVacancyMutation,
	useCreateResumeMutation,
	useUpdateResumeMutation,
	useGetUserVacanciesQuery,
	useGetUserResumesQuery,
	useGetRecommendedVacanciesQuery,
	useGetVacancyStatsQuery,
	useGetResumeStatsQuery,
	useTrackViewMutation,
	useTrackContactClickMutation,
	useCheckAccessQuery,
	useGetSubscriptionStatusQuery,
	useGetReferralInfoQuery,
	useCheckSocialTaskQuery,
	useWithdrawPointsMutation,
	useCreatePaymentMutation,
	useBoostVacancyMutation,
	useBoostResumeMutation,
	useGetBoostStatusQuery,
	useUpdateVacancyStatusMutation,
	useUpdateResumeStatusMutation,
	useDeleteVacancyMutation,
	useDeleteResumeMutation,
	// Экспортируем новый хук
	useUploadMediaBatchMutation,
} = workKgApi

export const store = configureStore({
	reducer: { [workKgApi.reducerPath]: workKgApi.reducer },
	middleware: (getDefault) => getDefault().concat(workKgApi.middleware),
})
