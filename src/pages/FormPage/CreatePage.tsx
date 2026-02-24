import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { useToast } from '../../../App'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'
import {
	useGetCitiesQuery,
	useGetSpheresQuery,
	useCreateVacancyMutation,
	useCreateResumeMutation,
	useUploadMediaBatchMutation,
} from '../../store/store'

const tg = (window as any).Telegram?.WebApp

const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	const { type } = location.state || { type: 'vac' }
	const isVac = type === 'vac' || type === 'job'

	const { data: cities = [], isLoading: isStaticLoading } =
		useGetCitiesQuery(telegramId)
	const { data: spheres = [] } = useGetSpheresQuery(telegramId)

	const [createVacancy] = useCreateVacancyMutation()
	const [createResume] = useCreateResumeMutation()
	const [uploadMediaBatch] = useUploadMediaBatchMutation()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [statusText, setStatusText] = useState('')
	const [photos, setPhotos] = useState<File[]>([])
	const [videos, setVideos] = useState<File[]>([])

	// --- 1. ВТОРИЧНАЯ КНОПКА (ОТМЕНА) ---
	useEffect(() => {
		if (!tg) return
		const secondaryButton = tg.SecondaryButton

		if (tg.isVersionAtLeast('7.0')) {
			secondaryButton.setParams({
				text: 'ОТМЕНА',
				is_visible: true,
				color: tg.themeParams.secondary_bg_color,
				text_color: tg.themeParams.text_color,
			})

			const handleCancel = () => {
				tg.HapticFeedback.impactOccurred('light')
				navigate(-1)
			}

			secondaryButton.offClick(handleCancel)
			secondaryButton.onClick(handleCancel)
			return () => {
				secondaryButton.offClick(handleCancel)
				secondaryButton.hide()
			}
		}
	}, [navigate])

	// --- 2. ЛОГИКА СЖАТИЯ И СОХРАНЕНИЯ ---
	const processFiles = async (
		originalPhotos: File[],
		originalVideos: File[],
	) => {
		const processedPhotos: File[] = []
		if (originalPhotos.length > 0) {
			setStatusText('Оптимизация фото...')
			for (const file of originalPhotos) {
				try {
					const compressed = await imageCompression(file, {
						maxSizeMB: 0.8,
						maxWidthOrHeight: 1280,
					})
					processedPhotos.push(
						new File([compressed], file.name, {
							type: compressed.type,
						}),
					)
				} catch (e) {
					processedPhotos.push(file)
				}
			}
		}
		return { processedPhotos, processedVideos: originalVideos }
	}

	const handleCreate = async (formData: any) => {
		if (isSubmitting) return
		setIsSubmitting(true)
		setStatusText('Создание...')

		try {
			// Создаем запись
			const res = isVac
				? await createVacancy({
						tid: telegramId,
						data: formData,
					}).unwrap()
				: await createResume({
						tid: telegramId,
						data: formData,
					}).unwrap()

			// Обрабатываем медиа
			const { processedPhotos, processedVideos } = await processFiles(
				photos,
				videos,
			)
			const finalFiles = [...processedPhotos, ...processedVideos]

			if (finalFiles.length > 0) {
				setStatusText('Загрузка медиа...')
				await uploadMediaBatch({
					entity: isVac ? 'vacancies' : 'resumes',
					id: res.id,
					tid: telegramId,
					files: finalFiles,
				}).unwrap()
			}

			tg.HapticFeedback.notificationOccurred('success')
			showToast('Успешно опубликовано! 🚀')
			navigate('/profile')
		} catch (e) {
			tg.HapticFeedback.notificationOccurred('error')
			showToast('Ошибка при сохранении', 'error')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (isStaticLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-main'>
				<div className='w-10 h-10 border-4 border-red-700 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='bg-main min-h-screen pb-32 animate-in fade-in'>
			<header className='p-6 pt-[calc(var(--sat)+1rem)] flex items-center gap-4 sticky top-0 bg-main/90 backdrop-blur-md z-40 border-b border-white/5'>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-main'
				>
					←
				</button>
				<h2 className='text-2xl font-black text-main leading-tight'>
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

				{isSubmitting && (
					<div className='fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in'>
						<div className='bg-main border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-full max-w-[280px]'>
							<div className='w-16 h-16 mb-6 relative'>
								<div className='absolute inset-0 border-4 border-secondary rounded-full'></div>
								<div className='absolute inset-0 border-4 border-t-red-700 rounded-full animate-spin'></div>
							</div>
							<h3 className='text-main text-lg font-black uppercase italic tracking-tighter'>
								{statusText}
							</h3>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default CreatePage
