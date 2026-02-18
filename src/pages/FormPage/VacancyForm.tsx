import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { VacancyFormData, vacancySchema, formatPhoneKG } from './schemas'
import {
	useGetCategoriesQuery,
	useGetSubcategoriesQuery,
} from '../../store/store'
import { FormField } from '.'
import { AddressAutocomplete2GIS, ElegantSelect } from '../../../App'

interface BaseEntity {
	id: number
	name: string
}

interface Sphere extends BaseEntity {
	icon?: string
}

interface Props {
	initialData?: Partial<VacancyFormData> | null
	onSubmit: (data: VacancyFormData) => void
	onMediaChange: (photos: File[], videos: File[]) => void
	loading: boolean
	cities: BaseEntity[]
	spheres: Sphere[]
	telegramId: number
}

// Оригинальный стиль инпутов с переменными темы
const inputClass =
	'w-full bg-main border border-white/10 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-4 ring-transparent focus:ring-red-500/5 focus:border-red-700/30 transition-all placeholder:text-hint/30 text-main shadow-sm'
export const VacancyForm: React.FC<Props> = ({
	initialData,
	onSubmit,
	onMediaChange,
	loading,
	cities,
	spheres,
	telegramId,
}) => {
	const defaultValues: VacancyFormData = {
		cityId: 1,
		sphereId: 0,
		categoryId: 0,
		subcategoryId: 0,
		minAge: 0,
		maxAge: 0,
		preferredGender: 'ANY',
		phone: '+996',
		experienceInYear: 0,
		salary: '',
		schedule: '',
		companyName: '',
		title: '',
		description: '',
		address: null,
		latitude: null,
		longitude: null,
	}

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(vacancySchema),
		defaultValues: {
			...defaultValues,
			...(initialData || {}),
		} as VacancyFormData,
	})

	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	// RTK Query для динамических списков
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

	useEffect(() => {
		if (initialData) reset(initialData)
	}, [initialData, reset])

	useEffect(() => {
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos, onMediaChange])

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
			<FormField label='Название вакансии' error={errors.title?.message}>
				<Controller
					name='title'
					control={control}
					render={({ field }) => (
						<input
							{...field}
							placeholder='Напр: Повар'
							className={inputClass}
						/>
					)}
				/>
			</FormField>

			<div className='grid grid-cols-2 gap-4'>
				<FormField label='Мин. возраст' error={errors.minAge?.message}>
					<Controller
						name='minAge'
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
								className={inputClass}
							/>
						)}
					/>
				</FormField>
				<FormField label='Макс. возраст' error={errors.maxAge?.message}>
					<Controller
						name='maxAge'
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
								className={inputClass}
							/>
						)}
					/>
				</FormField>
			</div>

			<Controller
				name='preferredGender'
				control={control}
				render={({ field }) => (
					<ElegantSelect
						label='Кого вы ищете?'
						value={field.value}
						options={[
							{ id: 'ANY', name: 'Не важно', icon: '👥' },
							{ id: 'MALE', name: 'Мужской', icon: '👨' },
							{ id: 'FEMALE', name: 'Женский', icon: '👩' },
						]}
						onChange={field.onChange}
						placeholder=''
					/>
				)}
			/>

			{/* Контрастный блок выбора сферы */}
			<div className='space-y-6 p-6 bg-secondary/50 rounded-[2.5rem] border border-white/5 shadow-sm'>
				<Controller
					name='cityId'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							label='Город'
							value={field.value}
							options={cities}
							onChange={field.onChange}
							placeholder=''
						/>
					)}
				/>
				<Controller
					name='sphereId'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							label='Сфера'
							value={field.value}
							options={spheres}
							onChange={(val) => {
								field.onChange(val)
								setValue('categoryId', 0)
								setValue('subcategoryId', 0)
							}}
							placeholder=''
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
									label='Категория'
									value={field.value}
									options={categories}
									onChange={(val) => {
										field.onChange(val)
										setValue('subcategoryId', 0)
									}}
									placeholder={
										isCatLoading
											? 'Загрузка...'
											: 'Выберите категорию'
									}
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
									label='Подкатегория'
									value={field.value ?? 0}
									options={subcategories}
									onChange={field.onChange}
									placeholder={
										isSubCatLoading
											? 'Загрузка...'
											: 'Выберите подкатегорию'
									}
								/>
							</div>
						)}
					/>
				)}
			</div>

			<div className='space-y-4'>
				<label className='block text-sm font-black text-main uppercase tracking-widest ml-1'>
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
					<label className='flex-1 h-14 bg-secondary text-main rounded-2xl flex items-center justify-center cursor-pointer border border-white/10 active:scale-95 transition-all'>
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

			<div className='grid grid-cols-2 gap-4'>
				<FormField label='Зарплата' error={errors.salary?.message}>
					<Controller
						name='salary'
						control={control}
						render={({ field }) => (
							<input
								{...field}
								placeholder='80 000 сом'
								className={inputClass}
							/>
						)}
					/>
				</FormField>
				<FormField
					label='Опыт (лет)'
					error={errors.experienceInYear?.message}
				>
					<Controller
						name='experienceInYear'
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

			<div className='grid grid-cols-2 gap-4'>
				<FormField label='График' error={errors.schedule?.message}>
					<Controller
						name='schedule'
						control={control}
						render={({ field }) => (
							<input
								{...field}
								placeholder='5/2'
								className={inputClass}
							/>
						)}
					/>
				</FormField>
				<FormField label='Компания' error={errors.companyName?.message}>
					<Controller
						name='companyName'
						control={control}
						render={({ field }) => (
							<input
								{...field}
								placeholder='Название фирмы'
								className={inputClass}
							/>
						)}
					/>
				</FormField>
			</div>

			<Controller
				name='address'
				control={control}
				render={({ field }) => (
					<AddressAutocomplete2GIS
						value={field.value || ''}
						onChange={(d) => {
							setValue('address', d.address)
							setValue('latitude', d.lat)
							setValue('longitude', d.lng)
						}}
					/>
				)}
			/>

			<FormField label='Телефон' error={errors.phone?.message}>
				<Controller
					name='phone'
					control={control}
					render={({ field }) => (
						<input
							{...field}
							onChange={(e) =>
								field.onChange(formatPhoneKG(e.target.value))
							}
							className={inputClass}
						/>
					)}
				/>
			</FormField>

			<FormField label='Описание' error={errors.description?.message}>
				<Controller
					name='description'
					control={control}
					render={({ field }) => (
						<textarea
							{...field}
							className='w-full bg-main border border-white/5 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none text-main'
							placeholder='Опишите обязанности...'
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
						: 'Опубликовать'}
			</button>
		</form>
	)
}
