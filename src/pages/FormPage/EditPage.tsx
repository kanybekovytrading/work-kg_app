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

	// Получаем данные из state навигации
	const { type, existingData } = location.state || {}

	const [loading, setLoading] = useState(false)
	const [cities, setCities] = useState([])
	const [spheres, setSpheres] = useState([])

	// Новые файлы, выбранные в процессе редактирования
	const [newPhotos, setNewPhotos] = useState<File[]>([])
	const [newVideos, setNewVideos] = useState<File[]>([])

	useEffect(() => {
		if (!existingData) {
			navigate('/profile')
			return
		}
		apiService.getCities(telegramId).then(setCities)
		apiService.getSpheres(telegramId).then(setSpheres)
	}, [telegramId, existingData, navigate])

	const handleUpdate = async (formData: any) => {
		setLoading(true)
		try {
			const isVac = type === 'vac' || type === 'job'
			const id = existingData.id

			// 1. Обновляем текстовые данные
			if (isVac) {
				await apiService.updateVacancy(id, telegramId, formData)
			} else {
				await apiService.updateResume(id, telegramId, formData)
			}

			// 2. Если пользователь выбрал НОВЫЕ фото/видео во время редактирования — догружаем их
			for (const file of newPhotos) {
				if (isVac)
					await apiService.uploadVacancyPhoto(id, telegramId, file)
				else await apiService.uploadResumePhoto(id, telegramId, file)
			}
			for (const file of newVideos) {
				if (isVac)
					await apiService.uploadVacancyVideo(id, telegramId, file)
				else await apiService.uploadResumeVideo(id, telegramId, file)
			}

			showToast('Изменения сохранены! ✨')
			navigate('/profile')
		} catch (e) {
			showToast('Ошибка при обновлении', 'error')
		} finally {
			setLoading(false)
		}
	}

	/**
	 * Подготовка данных:
	 * Превращаем вложенные объекты API в плоские ID для react-hook-form
	 */
	const preparedData = existingData
		? {
				...existingData,
				cityId: existingData.city?.id || existingData.cityId,
				sphereId: existingData.sphere?.id || existingData.sphereId,
				categoryId:
					existingData.category?.id || existingData.categoryId,
				subcategoryId:
					existingData.subcategory?.id || existingData.subcategoryId,
			}
		: null

	return (
		<div className='bg-white min-h-screen pb-20'>
			<header
				className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100'
				style={{
					paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
				}}
			>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600'
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
						initialData={preparedData}
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
						initialData={preparedData}
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
