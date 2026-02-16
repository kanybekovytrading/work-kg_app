import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiService } from '../../../apiService'
import { useToast } from '../../../App'
import { VacancyForm } from './VacancyForm'
import { ResumeForm } from './ResumeForm'

const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const { showToast } = useToast()
	const { type } = location.state || { type: 'vac' }

	const [loading, setLoading] = useState(false)
	const [cities, setCities] = useState([])
	const [spheres, setSpheres] = useState([])
	const [photos, setPhotos] = useState<File[]>([])
	const [videos, setVideos] = useState<File[]>([])

	useEffect(() => {
		apiService.getCities(telegramId).then(setCities)
		apiService.getSpheres(telegramId).then(setSpheres)
	}, [telegramId])

	const handleCreate = async (formData: any) => {
		setLoading(true)
		try {
			const isVac = type === 'vac' || type === 'job'
			const res = isVac
				? await apiService.createVacancy(telegramId, formData)
				: await apiService.createResume(telegramId, formData)

			const resultId = res.id

			// Загрузка медиа
			for (const f of photos) {
				isVac
					? await apiService.uploadVacancyPhoto(
							resultId,
							telegramId,
							f,
						)
					: await apiService.uploadResumePhoto(
							resultId,
							telegramId,
							f,
						)
			}
			for (const v of videos) {
				isVac
					? await apiService.uploadVacancyVideo(
							resultId,
							telegramId,
							v,
						)
					: await apiService.uploadResumeVideo(
							resultId,
							telegramId,
							v,
						)
			}

			showToast('Успешно опубликовано!')
			navigate('/profile')
		} catch (e) {
			showToast('Ошибка при создании', 'error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='bg-white min-h-screen pb-10 animate-in fade-in duration-500'>
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
					{type === 'vac' ? 'Новая вакансия' : 'Новое резюме'}
				</h2>
			</header>
			<div className='p-6'>
				{type === 'vac' || type === 'job' ? (
					<VacancyForm
						telegramId={telegramId}
						cities={cities}
						spheres={spheres}
						onSubmit={handleCreate}
						onMediaChange={(p, v) => {
							setPhotos(p)
							setVideos(v)
						}}
						loading={loading}
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
						loading={loading}
					/>
				)}
			</div>
		</div>
	)
}

export default CreatePage
