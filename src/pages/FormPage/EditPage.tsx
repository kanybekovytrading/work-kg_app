import React, { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'
import { useToast } from '../../../App'
// Импортируем хуки из твоего API Slice
import {
	useGetCitiesQuery,
	useGetSpheresQuery,
	useGetVacancyDetailQuery,
	useGetResumeDetailQuery,
	useUpdateVacancyMutation,
	useUpdateResumeMutation,
	useUploadMediaMutation,
} from '../../store/store'

const EditPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	const state = location.state || {}
	const type = state.type
	const targetId = state.id || state.existingData?.id
	const isVac = type === 'vac' || type === 'job'

	// 1. Загрузка справочников (из кэша, если уже загружены)
	const { data: cities = [] } = useGetCitiesQuery(telegramId)
	const { data: spheres = [] } = useGetSpheresQuery(telegramId)

	// 2. Загрузка данных конкретной записи
	// Используем skip, чтобы не делать лишний запрос
	const { data: vacData, isLoading: vacLoading } = useGetVacancyDetailQuery(
		{ id: targetId, tid: telegramId, isProfile: true },
		{ skip: !isVac || !targetId },
	)
	const { data: resData, isLoading: resLoading } = useGetResumeDetailQuery(
		{ id: targetId, tid: telegramId, isProfile: true },
		{ skip: isVac || !targetId },
	)

	// 3. Мутации
	const [updateVacancy] = useUpdateVacancyMutation()
	const [updateResume] = useUpdateResumeMutation()
	const [uploadMedia] = useUploadMediaMutation()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [newPhotos, setNewPhotos] = useState<File[]>([])
	const [newVideos, setNewVideos] = useState<File[]>([])

	// Подготавливаем данные для формы (превращаем объекты в ID)
	const initialData = useMemo(() => {
		const data: any = isVac ? vacData : resData
		if (!data) return null

		return {
			...data,
			cityId: data.city?.id || data.cityId,
			sphereId: data.sphere?.id || data.sphereId,
			categoryId: data.category?.id || data.categoryId,
			subcategoryId: data.subcategory?.id || data.subcategoryId,
			experienceInYear: data.experienceInYear
				? Number(data.experienceInYear)
				: 0,
			experience: data.experience ? Number(data.experience) : 0,
		}
	}, [isVac, vacData, resData])

	const handleUpdate = async (formData: any) => {
		if (!targetId) return

		setIsSubmitting(true)
		try {
			// 1. Обновляем текст
			if (isVac) {
				await updateVacancy({
					id: targetId,
					tid: telegramId,
					data: formData,
				}).unwrap()
			} else {
				await updateResume({
					id: targetId,
					tid: telegramId,
					data: formData,
				}).unwrap()
			}

			const entity = isVac ? 'vacancies' : 'resumes'

			// 2. Загружаем НОВЫЕ фото
			for (const file of newPhotos) {
				await uploadMedia({
					entity,
					id: targetId,
					tid: telegramId,
					file,
					mediaType: 'photo',
				}).unwrap()
			}

			// 3. Загружаем НОВЫЕ видео
			for (const file of newVideos) {
				await uploadMedia({
					entity,
					id: targetId,
					tid: telegramId,
					file,
					mediaType: 'video',
				}).unwrap()
			}

			showToast('Изменения сохранены! ✨')
			navigate('/profile')
		} catch (e) {
			console.error(e)
			showToast('Ошибка при обновлении', 'error')
		} finally {
			setIsSubmitting(false)
		}
	}

	// Общий лоадер: ждем данные вакансии/резюме
	const isLoading = isVac ? vacLoading : resLoading

	if (isLoading || !initialData) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='bg-main min-h-screen pb-20 animate-in fade-in duration-300'>
			<header
				className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-main/90 backdrop-blur-md z-40 border-b border-white/5'
				style={{
					paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
				}}
			>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-main active:scale-95 transition-transform'
				>
					←
				</button>
				<h2 className='text-2xl font-black text-main'>
					Редактирование
				</h2>
			</header>

			<div className='p-6'>
				{isVac ? (
					<VacancyForm
						telegramId={telegramId}
						cities={cities}
						spheres={spheres}
						initialData={initialData}
						onSubmit={handleUpdate}
						onMediaChange={(p, v) => {
							setNewPhotos(p)
							setNewVideos(v)
						}}
						loading={isSubmitting}
					/>
				) : (
					<ResumeForm
						telegramId={telegramId}
						cities={cities}
						spheres={spheres}
						initialData={initialData}
						onSubmit={handleUpdate}
						onMediaChange={(p, v) => {
							setNewPhotos(p)
							setNewVideos(v)
						}}
						loading={isSubmitting}
					/>
				)}
			</div>
		</div>
	)
}

export default EditPage
