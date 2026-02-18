import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResumeFormData, resumeSchema } from './schemas'
import {
	useGetCategoriesQuery,
	useGetSubcategoriesQuery,
} from '../../store/store'
import { FormField } from '.'
import { ElegantSelect } from '../../../App'

// Оригинальный стиль инпутов с поддержкой темы
const inputClass =
	'w-full bg-main border border-white/10 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-4 ring-transparent focus:ring-red-500/5 focus:border-red-700/30 transition-all placeholder:text-hint/30 text-main shadow-sm'

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
		resolver: zodResolver(resumeSchema) as any,
		defaultValues: initialData || {
			name: '',
			cityId: 1,
			sphereId: 0,
			categoryId: 0,
			subcategoryId: 0,
			age: 0,
			experience: 0,
			gender: 'MALE',
			description: '',
		},
	})

	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	// RTK Query для категорий и подкатегорий
	const { data: categories = [], isFetching: isCatLoading } =
		useGetCategoriesQuery(
			{ tid: telegramId, sid: selectedSphere },
			{ skip: selectedSphere === 0 },
		)

	const { data: subcategories = [], isFetching: isSubCatLoading } =
		useGetSubcategoriesQuery(
			{ tid: telegramId, cid: selectedCategory },
			{ skip: selectedCategory === 0 },
		)

	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	useEffect(() => {
		if (initialData) reset(initialData)
	}, [initialData, reset])

	useEffect(() => {
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos, onMediaChange])

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
			<FormField label='Ваше Имя' error={errors.name?.message}>
				<Controller
					name='name'
					control={control}
					render={({ field }) => (
						<input
							{...field}
							placeholder='Иван Иванов'
							className={inputClass}
						/>
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
								value={field.value || ''}
								onChange={(e) =>
									field.onChange(
										e.target.value === ''
											? ''
											: Number(e.target.value),
									)
								}
								placeholder='18'
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
								value={field.value || ''}
								onChange={(e) =>
									field.onChange(
										e.target.value === ''
											? ''
											: Number(e.target.value),
									)
								}
								placeholder='Лет опыта'
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
						placeholder=''
						label='Пол'
						value={field.value}
						options={[
							{ id: 'MALE', name: 'Мужской', icon: '👨' },
							{ id: 'FEMALE', name: 'Женский', icon: '👩' },
						]}
						onChange={field.onChange}
					/>
				)}
			/>

			{/* Bento-блок выбора сферы (оставляем bg-secondary для структуры, но инпуты внутри будут белыми) */}
			<div className='space-y-6 p-6 bg-secondary/50 rounded-[2.5rem] border border-white/5'>
				<Controller
					name='cityId'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							placeholder=''
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
							placeholder=''
							label='Желаемая сфера'
							value={field.value}
							options={spheres}
							onChange={(val) => {
								field.onChange(val)
								setValue('categoryId', 0)
								setValue('subcategoryId', 0)
							}}
						/>
					)}
				/>
				{selectedSphere > 0 && (
					<Controller
						name='categoryId'
						control={control}
						render={({ field }) => (
							<div className={isCatLoading ? 'opacity-60' : ''}>
								<ElegantSelect
									placeholder={
										isCatLoading
											? 'Загрузка...'
											: 'Выберите категорию'
									}
									label='Категория'
									value={field.value}
									options={categories}
									onChange={(val) => {
										field.onChange(val)
										setValue('subcategoryId', 0)
									}}
								/>
							</div>
						)}
					/>
				)}
				{selectedCategory > 0 && subcategories.length > 0 && (
					<Controller
						name='subcategoryId'
						control={control}
						render={({ field }) => (
							<div
								className={isSubCatLoading ? 'opacity-60' : ''}
							>
								<ElegantSelect
									placeholder={
										isSubCatLoading
											? 'Загрузка...'
											: 'Выберите подкатегорию'
									}
									label='Подкатегория'
									value={field.value}
									options={subcategories}
									onChange={field.onChange}
								/>
							</div>
						)}
					/>
				)}
			</div>

			<div className='space-y-4'>
				<label className='block text-xs font-black text-hint uppercase tracking-widest ml-1'>
					Фото и Видео
				</label>
				<div className='flex gap-2'>
					<label className='flex-1 h-14 bg-[#111111] text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all'>
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
						<span className='text-[10px] font-black uppercase'>
							+ Фото ({selectedPhotos.length})
						</span>
					</label>
					<label className='flex-1 h-14 bg-main text-main rounded-2xl flex items-center justify-center cursor-pointer border border-white/10 active:scale-95 transition-all'>
						<input
							type='file'
							multiple
							accept='video/*'
							className='hidden'
							onChange={(e) =>
								e.target.files &&
								setSelectedVideos([
									...selectedVideos,
									...Array.from(e.target.files),
								])
							}
						/>
						<span className='text-[10px] font-black uppercase'>
							+ Видео ({selectedVideos.length})
						</span>
					</label>
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
							className='w-full bg-main border border-white/10 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none text-main shadow-sm'
							placeholder='Расскажите о себе...'
						/>
					)}
				/>
			</FormField>

			<button
				type='submit'
				disabled={loading}
				className='w-full py-6 bg-[#111111] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all'
			>
				{loading
					? 'Загрузка...'
					: initialData
						? 'Сохранить изменения'
						: 'Опубликовать резюме'}
			</button>
		</form>
	)
}
