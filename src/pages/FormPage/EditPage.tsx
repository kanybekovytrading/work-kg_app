import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'
import { useToast } from '../../../App'
import { apiService } from '../../../apiService'

const EditPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()

	// Ожидаем, что в state передали { type: 'vac' | 'res', id: number }
	// Поддерживаем старый формат (existingData) для совместимости, вытаскивая оттуда ID
	const state = location.state || {}
	const type = state.type
	const targetId = state.id || state.existingData?.id

	const [loading, setLoading] = useState(true)
	const [initialData, setInitialData] = useState<any>(null)

	const [cities, setCities] = useState([])
	const [spheres, setSpheres] = useState([])

	// Новые файлы, выбранные в процессе редактирования
	const [newPhotos, setNewPhotos] = useState<File[]>([])
	const [newVideos, setNewVideos] = useState<File[]>([])

	// 1. Загрузка справочников и Данных вакансии/резюме
	useEffect(() => {
		if (!targetId || !type) {
			navigate('/profile')
			return
		}

		const fetchData = async () => {
			setLoading(true)
			try {
				// Запускаем все запросы параллельно для скорости
				const isVac = type === 'vac' || type === 'job'

				// Формируем промис для получения основных данных
				// Важно: isProfile = true, так как это редактирование
				const mainDataPromise = isVac
					? apiService.getVacancy(targetId, telegramId, true)
					: apiService.getResume(targetId, telegramId, true)

				const [mainData, citiesData, spheresData] = await Promise.all([
					mainDataPromise,
					apiService.getCities(telegramId),
					apiService.getSpheres(telegramId),
				])

				setCities(citiesData)
				setSpheres(spheresData)

				// Подготавливаем данные для формы (превращаем объекты в ID)
				const prepared = prepareDataForForm(mainData)
				setInitialData(prepared)
			} catch (e) {
				console.error(e)
				showToast('Ошибка при загрузке данных', 'error')
				navigate('/profile')
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [telegramId, targetId, type, navigate, showToast])

	// Вспомогательная функция для преобразования данных API в формат формы
	const prepareDataForForm = (data: any) => {
		if (!data) return null
		return {
			...data,
			// Если API возвращает объект city: {id: 1, name: ...}, берем id
			// Если API возвращает просто cityId, берем его
			cityId: data.city?.id || data.cityId,
			sphereId: data.sphere?.id || data.sphereId,
			categoryId: data.category?.id || data.categoryId,
			subcategoryId: data.subcategory?.id || data.subcategoryId,
			// Гарантируем, что experienceInYear это число
			experienceInYear: data.experienceInYear
				? Number(data.experienceInYear)
				: 0,
			// Для резюме
			experience: data.experience ? Number(data.experience) : 0,
		}
	}

	const handleUpdate = async (formData: any) => {
		setLoading(true)
		try {
			const isVac = type === 'vac' || type === 'job'

			// 1. Обновляем текстовые данные
			if (isVac) {
				await apiService.updateVacancy(targetId, telegramId, formData)
			} else {
				await apiService.updateResume(targetId, telegramId, formData)
			}

			// 2. Загружаем НОВЫЕ медиафайлы (если выбрали)
			// Примечание: Старые фото обычно остаются на сервере, если API обновления не стирает их.
			for (const file of newPhotos) {
				if (isVac)
					await apiService.uploadVacancyPhoto(
						targetId,
						telegramId,
						file,
					)
				else
					await apiService.uploadResumePhoto(
						targetId,
						telegramId,
						file,
					)
			}
			for (const file of newVideos) {
				if (isVac)
					await apiService.uploadVacancyVideo(
						targetId,
						telegramId,
						file,
					)
				else
					await apiService.uploadResumeVideo(
						targetId,
						telegramId,
						file,
					)
			}

			showToast('Изменения сохранены! ✨')
			navigate('/profile')
		} catch (e) {
			console.error(e)
			showToast('Ошибка при обновлении', 'error')
		} finally {
			setLoading(false)
		}
	}

	if (loading && !initialData) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='bg-white min-h-screen pb-20 animate-in fade-in duration-300'>
			<header
				className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100'
				style={{
					paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
				}}
			>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-transform'
				>
					←
				</button>
				<h2 className='text-2xl font-black text-slate-900'>
					Редактирование
				</h2>
			</header>

			<div className='p-6'>
				{type === 'vac' || type === 'job' ? (
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
						loading={loading}
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
						loading={loading}
					/>
				)}
			</div>
		</div>
	)
}

export default EditPage
