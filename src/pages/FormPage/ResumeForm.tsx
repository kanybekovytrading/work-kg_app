import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResumeFormData, resumeSchema } from './schemas'
import { apiService } from '@/apiService'
import { FormField } from '.'
import { ElegantSelect } from '@/App'

const inputClass =
	'w-full bg-slate-50 border border-slate-100 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-red-50 transition-all placeholder:text-slate-300 text-slate-900'

interface Props {
	initialData?: any
	onSubmit: (data: ResumeFormData) => void
	onMediaChange: (photos: File[], videos: File[]) => void
	loading: boolean
	cities: any[]
	spheres: any[]
	telegramId: number
}

export const ResumeForm: React.FC<Props> = ({
	initialData,
	onSubmit,
	onMediaChange,
	loading,
	cities,
	spheres,
	telegramId,
}) => {
	const {
		control,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm<ResumeFormData>({
		resolver: zodResolver(resumeSchema),
		defaultValues: initialData || {
			cityId: 1,
			sphereId: 0,
			categoryId: 0,
			age: 18,
			experience: 0,
			gender: 'MALE',
		},
	})

	const [categories, setCategories] = useState([])
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])
	const selectedSphere = watch('sphereId')

	useEffect(() => {
		if (initialData) reset(initialData)
	}, [initialData, reset])
	useEffect(() => {
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos])

	useEffect(() => {
		if (selectedSphere > 0)
			apiService
				.getCategories(telegramId, selectedSphere)
				.then(setCategories)
	}, [selectedSphere, telegramId])

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
			<FormField label='Ваше Имя' error={errors.name?.message}>
				<Controller
					name='name'
					control={control}
					render={({ field }) => (
						<input {...field} className={inputClass} />
					)}
				/>
			</FormField>

			<div className='grid grid-cols-2 gap-4'>
				<FormField label='Возраст' error={errors.age?.message}>
					<Controller
						name='age'
						control={control}
						render={({ field }) => (
							<input
								type='number'
								{...field}
								className={inputClass}
							/>
						)}
					/>
				</FormField>
				<FormField
					label='Опыт (лет)'
					error={errors.experience?.message}
				>
					<Controller
						name='experience'
						control={control}
						render={({ field }) => (
							<input
								type='number'
								{...field}
								className={inputClass}
							/>
						)}
					/>
				</FormField>
			</div>

			<Controller
				name='gender'
				control={control}
				render={({ field }) => (
					<ElegantSelect
						label='Пол'
						value={field.value}
						options={[
							{ id: 'MALE', name: 'Мужской' },
							{ id: 'FEMALE', name: 'Женский' },
						]}
						onChange={field.onChange}
					/>
				)}
			/>

			<div className='space-y-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100'>
				<Controller
					name='cityId'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							label='Город'
							value={field.value}
							options={cities}
							onChange={field.onChange}
						/>
					)}
				/>
				<Controller
					name='sphereId'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							label='Желаемая сфера'
							value={field.value}
							options={spheres}
							onChange={(val) => {
								field.onChange(val)
								setValue('categoryId', 0)
							}}
						/>
					)}
				/>
				{selectedSphere > 0 && (
					<Controller
						name='categoryId'
						control={control}
						render={({ field }) => (
							<ElegantSelect
								label='Категория'
								value={field.value}
								options={categories}
								onChange={field.onChange}
							/>
						)}
					/>
				)}
			</div>

			{/* Блок Медиа (такой же как в вакансии) */}
			<div className='space-y-4'>
				<label className='block text-sm font-bold text-slate-700 ml-1'>
					Фото профиля / Работы
				</label>
				<label className='w-full h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg'>
					<input
						type='file'
						multiple
						accept='image/*'
						className='hidden'
						onChange={(e) =>
							e.target.files &&
							setSelectedPhotos([
								...selectedPhotos,
								...Array.from(e.target.files),
							])
						}
					/>
					<span className='text-xs font-black uppercase tracking-wider'>
						Добавить фото ({selectedPhotos.length})
					</span>
				</label>
				<div className='flex gap-2 overflow-x-auto py-2'>
					{selectedPhotos.map((f, i) => (
						<img
							key={i}
							src={URL.createObjectURL(f)}
							className='w-16 h-16 rounded-xl object-cover border'
						/>
					))}
				</div>
			</div>

			<FormField
				label='О себе / Навыки'
				error={errors.description?.message}
			>
				<Controller
					name='description'
					control={control}
					render={({ field }) => (
						<textarea
							{...field}
							className='w-full bg-slate-50 border border-slate-100 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none'
						/>
					)}
				/>
			</FormField>

			<button
				type='submit'
				disabled={loading}
				className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest'
			>
				{loading ? 'Загрузка...' : 'Опубликовать резюме'}
			</button>
		</form>
	)
}
