import React, { useState } from 'react'
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
	useUploadVacancyMediaBatchMutation,
} from '../../store/store'

const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	const { type } = location.state || { type: 'vac' }
	const isVac = type === 'vac' || type === 'job'

	const { data: cities = [], isLoading: isStaticLoading } =
		useGetCitiesQuery(telegramId)
	const { data: spheres = [], isLoading: isSpheresLoading } =
		useGetSpheresQuery(telegramId)

	const [createVacancy] = useCreateVacancyMutation()
	const [createResume] = useCreateResumeMutation()
	const [uploadVacancyBatch] = useUploadVacancyMediaBatchMutation()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [statusText, setStatusText] = useState('')
	const [photos, setPhotos] = useState<File[]>([])
	const [videos, setVideos] = useState<File[]>([])

	// --- 1. ОБРАБОТКА ФАЙЛОВ (Только фото) ---
	const processFiles = async (
		originalPhotos: File[],
		originalVideos: File[],
	) => {
		const processedPhotos: File[] = []

		// Сжимаем ФОТО, чтобы они не весили по 10Мб
		if (originalPhotos.length > 0) {
			setStatusText('Оптимизация фото...')
			for (const file of originalPhotos) {
				try {
					// Если фото > 1Мб, сжимаем
					if (file.size > 1024 * 1024) {
						const compressed = await imageCompression(file, {
							maxSizeMB: 1,
							maxWidthOrHeight: 1280,
							useWebWorker: true,
						})
						processedPhotos.push(
							new File([compressed], file.name, {
								type: compressed.type,
							}),
						)
					} else {
						processedPhotos.push(file)
					}
				} catch (e) {
					processedPhotos.push(file)
				}
			}
		}

		// Видео не трогаем, отправляем оригиналы (самый стабильный путь для ТГ)
		return { processedPhotos, processedVideos: originalVideos }
	}

	const handleCreate = async (formData: any) => {
		setIsSubmitting(true)
		setStatusText('Создание записи...')

		try {
			// 1. Создаем саму запись
			const res = isVac
				? await createVacancy({
						tid: telegramId,
						data: formData,
					}).unwrap()
				: await createResume({
						tid: telegramId,
						data: formData,
					}).unwrap()

			// 2. Готовим файлы (сжимаем только фото)
			const { processedPhotos, processedVideos } = await processFiles(
				photos,
				videos,
			)
			const finalFiles = [...processedPhotos, ...processedVideos]

			// 3. Загружаем всё пачкой
			if (finalFiles.length > 0) {
				setStatusText('Загрузка медиа на сервер...')
				await uploadVacancyBatch({
					vacancyId: res.id,
					tid: telegramId,
					files: finalFiles,
				}).unwrap()
			}

			showToast('Успешно опубликовано! 🚀')
			navigate('/profile')
		} catch (e) {
			console.error(e)
			showToast('Ошибка. Проверьте размер файлов или интернет', 'error')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (isStaticLoading || isSpheresLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-10 h-10 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='bg-white min-h-screen pb-10'>
			<header className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b'>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center active:scale-90 transition-transform'
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

				{/* Лоадер для пользователя */}
				{isSubmitting && (
					<div className='fixed inset-0 z-[100] flex items-center justify-center p-6'>
						{/* Задний фон с глубоким размытием */}
						<div className='absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500' />

						{/* Карточка лоадера */}
						<div className='relative bg-white/10 border border-white/20 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-full max-w-[320px] overflow-hidden animate-in zoom-in-95 duration-300'>
							{/* Декоративное свечение на фоне */}
							<div className='absolute -top-10 -left-10 w-32 h-32 bg-main/30 rounded-full blur-3xl animate-pulse' />
							<div className='absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700' />

							{/* Кастомный Spinner */}
							<div className='relative w-20 h-20 mb-8'>
								{/* Внешнее кольцо */}
								<div className='absolute inset-0 border-4 border-white/10 rounded-full'></div>
								{/* Бегущее кольцо */}
								<div className='absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin'></div>
								{/* Центральная точка с пульсацией */}
								<div className='absolute inset-[35%] bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]'></div>
							</div>

							{/* Текстовый блок */}
							<div className='space-y-3 text-center relative z-10'>
								<h3 className='text-white text-xl font-black tracking-tight leading-tight uppercase italic'>
									{statusText}
								</h3>
								<div className='flex justify-center gap-1'>
									<span className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]'></span>
									<span className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]'></span>
									<span className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce'></span>
								</div>
								<p className='text-white/60 text-sm font-medium leading-relaxed px-4'>
									Оптимизируем данные для моментальной
									загрузки. Пожалуйста, не закрывайте.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default CreatePage
