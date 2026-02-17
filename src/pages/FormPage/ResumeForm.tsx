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

	// Следим за изменениями для зависимых запросов
	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	// --- RTK QUERY ХУКИ ВМЕСТО СТАРЫХ EFFECT ---

	// Категории (авто-запрос при смене сферы)
	const { data: categories = [], isFetching: isCatLoading } =
		useGetCategoriesQuery(
			{ tid: telegramId, sid: selectedSphere },
			{ skip: selectedSphere === 0 }, // Не грузим, если сфера не выбрана
		)

	// Подкатегории (авто-запрос при смене категории)
	const { data: subcategories = [], isFetching: isSubCatLoading } =
		useGetSubcategoriesQuery(
			{ tid: telegramId, cid: selectedCategory },
			{ skip: selectedCategory === 0 }, // Не грузим, если категория не выбрана
		)

	// Состояния для медиа
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	// Инициализация данных при редактировании
	useEffect(() => {
		if (initialData) reset(initialData)
	}, [initialData, reset])

	// Передача медиа в родительский компонент
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
								// Если значение 0 или undefined, показываем пустую строку
								value={field.value === 0 ? '' : field.value}
								onChange={(e) => {
									const val = e.target.value
									// Исправлено: позволяем полю быть пустым при вводе
									field.onChange(
										val === '' ? '' : Number(val),
									)
								}}
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
								// Исправлено: убираем принудительный 0 при отображении
								value={field.value === 0 ? '' : field.value}
								onChange={(e) => {
									const val = e.target.value
									// Исправлено: позволяем полю быть пустым при вводе
									field.onChange(
										val === '' ? '' : Number(val),
									)
								}}
								placeholder='Напишите свой опыт'
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

			{/* Блок Выбора сферы деятельности */}
			<div className='space-y-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100'>
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
								// Сбрасываем зависимые поля
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
							<div
								className={
									isCatLoading
										? 'opacity-60 pointer-events-none'
										: ''
								}
							>
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
								className={
									isSubCatLoading
										? 'opacity-60 pointer-events-none'
										: ''
								}
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

			{/* Блок Медиа */}
			<div className='space-y-4'>
				<label className='block text-sm font-bold text-slate-700 ml-1'>
					Фото и Видео
				</label>
				<div className='flex gap-2'>
					<label className='flex-1 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all'>
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
							+ Фото ({selectedPhotos.length})
						</span>
					</label>
					<label className='flex-1 h-14 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-200 active:scale-95 transition-all'>
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
						<span className='text-xs font-black uppercase tracking-wider'>
							+ Видео ({selectedVideos.length})
						</span>
					</label>
				</div>

				{/* Превью фото */}
				<div className='flex gap-3 overflow-x-auto no-scrollbar py-2'>
					{selectedPhotos.map((file, i) => (
						<div
							key={i}
							className='relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-slate-100'
						>
							<img
								src={URL.createObjectURL(file)}
								className='w-full h-full object-cover'
								alt='preview'
							/>
							<button
								type='button'
								onClick={() =>
									setSelectedPhotos(
										selectedPhotos.filter(
											(_, idx) => idx !== i,
										),
									)
								}
								className='absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center'
							>
								×
							</button>
						</div>
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
							className='w-full bg-slate-50 border border-slate-100 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none'
							placeholder='Расскажите о своих сильных сторонах...'
						/>
					)}
				/>
			</FormField>

			<button
				type='submit'
				disabled={loading}
				className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all'
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
