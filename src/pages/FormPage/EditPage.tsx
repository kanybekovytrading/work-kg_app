import React, { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'
import { useToast } from '../../../App'
import {
	useGetCitiesQuery,
	useGetSpheresQuery,
	useGetVacancyDetailQuery,
	useGetResumeDetailQuery,
	useUpdateVacancyMutation,
	useUpdateResumeMutation,
	useUploadVacancyMediaBatchMutation,
} from '../../store/store'

const EditPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	const state = location.state || {}
	const type = state.type
	const targetId = state.id || state.existingData?.id
	const isVac = type === 'vac' || type === 'job'

	const { data: cities = [] } = useGetCitiesQuery(telegramId)
	const { data: spheres = [] } = useGetSpheresQuery(telegramId)

	const { data: vacData, isLoading: vacLoading } = useGetVacancyDetailQuery(
		{ id: targetId, tid: telegramId, isProfile: true },
		{ skip: !isVac || !targetId },
	)
	const { data: resData, isLoading: resLoading } = useGetResumeDetailQuery(
		{ id: targetId, tid: telegramId, isProfile: true },
		{ skip: isVac || !targetId },
	)

	const [updateVacancy] = useUpdateVacancyMutation()
	const [updateResume] = useUpdateResumeMutation()
	const [uploadMediaBatch] = useUploadVacancyMediaBatchMutation()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [statusText, setStatusText] = useState('')
	const [newPhotos, setNewPhotos] = useState<File[]>([])
	const [newVideos, setNewVideos] = useState<File[]>([])

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

	// --- 1. ОБРАБОТКА ФАЙЛОВ (Только фото) ---
	const processFiles = async (
		originalPhotos: File[],
		originalVideos: File[],
	) => {
		const processedPhotos: File[] = []

		if (originalPhotos.length > 0) {
			setStatusText('Оптимизация новых фото...')
			for (const file of originalPhotos) {
				try {
					// Сжимаем фото больше 1Мб
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

		// Видео возвращаем как есть для стабильности в Telegram
		return { processedPhotos, processedVideos: originalVideos }
	}

	const handleUpdate = async (formData: any) => {
		if (!targetId) return
		setIsSubmitting(true)
		setStatusText('Сохранение изменений...')

		try {
			// 1. Сначала обновляем текстовую информацию
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

			// 2. Обрабатываем и загружаем новые медиа, если они добавлены
			if (newPhotos.length > 0 || newVideos.length > 0) {
				const { processedPhotos, processedVideos } = await processFiles(
					newPhotos,
					newVideos,
				)
				const finalFiles = [...processedPhotos, ...processedVideos]

				if (finalFiles.length > 0) {
					setStatusText('Загрузка медиа на сервер...')
					await uploadMediaBatch({
						vacancyId: targetId,
						tid: telegramId,
						files: finalFiles,
					}).unwrap()
				}
			}

			showToast('Изменения сохранены! ✨')
			navigate('/profile')
		} catch (e) {
			console.error(e)
			showToast('Ошибка при сохранении. Проверьте интернет', 'error')
		} finally {
			setIsSubmitting(false)
		}
	}

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

export default EditPage
