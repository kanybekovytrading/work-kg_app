import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../../App'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'
// Импортируем хуки из твоего нового API Slice
import {
	useGetCitiesQuery,
	useGetSpheresQuery,
	useCreateVacancyMutation,
	useCreateResumeMutation,
	useUploadMediaMutation,
} from '../../store/store'

const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	const { type } = location.state || { type: 'vac' }
	const isVac = type === 'vac' || type === 'job'

	// 1. Получаем справочники (RTK Query сам их закеширует)
	const { data: cities = [], isLoading: isStaticLoading } =
		useGetCitiesQuery(telegramId)
	const { data: spheres = [], isLoading: isSpheresLoading } =
		useGetSpheresQuery(telegramId)

	// 2. Инициализируем мутации
	const [createVacancy] = useCreateVacancyMutation()
	const [createResume] = useCreateResumeMutation()
	const [uploadMedia] = useUploadMediaMutation()

	// Локальное состояние для процесса отправки и файлов
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [photos, setPhotos] = useState<File[]>([])
	const [videos, setVideos] = useState<File[]>([])

	const handleCreate = async (formData: any) => {
		setIsSubmitting(true)
		try {
			// А) Создаем основную запись (Вакансия или Резюме)
			const res = isVac
				? await createVacancy({
						tid: telegramId,
						data: formData,
					}).unwrap()
				: await createResume({
						tid: telegramId,
						data: formData,
					}).unwrap()

			const resultId = res.id
			const entity = isVac ? 'vacancies' : 'resumes'

			// Б) Загрузка фото по очереди
			for (const file of photos) {
				await uploadMedia({
					entity,
					id: resultId,
					tid: telegramId,
					file,
					mediaType: 'photo',
				}).unwrap()
			}

			// В) Загрузка видео по очереди
			for (const file of videos) {
				await uploadMedia({
					entity,
					id: resultId,
					tid: telegramId,
					file,
					mediaType: 'video',
				}).unwrap()
			}

			showToast('Успешно опубликовано!')
			navigate('/profile')
		} catch (e) {
			console.error('Ошибка создания:', e)
			showToast('Ошибка при создании', 'error')
		} finally {
			setIsSubmitting(false)
		}
	}

	// Общий лоадер для первичной загрузки справочников
	if (isStaticLoading || isSpheresLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-10 h-10 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='bg-white min-h-screen pb-10 animate-in fade-in duration-500'>
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
					{isVac ? 'Новая вакансия' : 'Новое резюме'}
				</h2>
			</header>

			<div className='p-6'>
				{isVac ? (
					<VacancyForm
						telegramId={telegramId}
						cities={cities}
						spheres={spheres}
						onSubmit={handleCreate}
						onMediaChange={(p, v) => {
							setPhotos(p)
							setVideos(v)
						}}
						loading={isSubmitting}
					/>
				) : (
					<ResumeForm
						telegramId={telegramId}
						cities={cities}
						spheres={spheres}
						onSubmit={handleCreate}
						onMediaChange={(p, v) => {
							setPhotos(p)
							setVideos(v)
						}}
						loading={isSubmitting}
					/>
				)}
			</div>
		</div>
	)
}

export default CreatePage
