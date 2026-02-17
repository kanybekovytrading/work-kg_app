import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { VacancyFormData, vacancySchema, formatPhoneKG } from './schemas'
import { apiService } from '../../../apiService'
import { FormField } from '.'
import { AddressAutocomplete2GIS, ElegantSelect } from '../../../App'

// Типы для справочников
interface BaseEntity {
	id: number
	name: string
}

interface Sphere extends BaseEntity {
	icon?: string
}

interface Props {
	// Partial позволяет передавать неполные данные, но мы ожидаем совпадение с типами Zod
	initialData?: Partial<VacancyFormData> | null
	onSubmit: (data: VacancyFormData) => void
	onMediaChange: (photos: File[], videos: File[]) => void
	loading: boolean
	cities: BaseEntity[]
	spheres: Sphere[]
	telegramId: number
}

const inputClass =
	'w-full bg-slate-50 border border-slate-100 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-red-50 transition-all placeholder:text-slate-300 text-slate-900'

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
		minAge: 18,
		maxAge: 45,
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

	const [categories, setCategories] = useState<BaseEntity[]>([])
	const [subcategories, setSubcategories] = useState<BaseEntity[]>([])
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	useEffect(() => {
		if (initialData) {
			reset(initialData)
		}
	}, [initialData, reset])

	useEffect(() => {
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos, onMediaChange])

	useEffect(() => {
		if (selectedSphere > 0)
			apiService
				.getCategories(telegramId, selectedSphere)
				.then((res: BaseEntity[]) => setCategories(res))
	}, [selectedSphere, telegramId])

	useEffect(() => {
		if (selectedCategory > 0)
			apiService
				.getSubcategories(telegramId, selectedCategory)
				.then((res: BaseEntity[]) => setSubcategories(res))
	}, [selectedCategory, telegramId])

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
								value={field.value}
								onChange={(e) =>
									field.onChange(
										e.target.value
											? Number(e.target.value)
											: 0,
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
								value={field.value}
								onChange={(e) =>
									field.onChange(
										e.target.value
											? Number(e.target.value)
											: 0,
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
						placeholder=''
						label='Кого вы ищете?'
						value={field.value}
						options={[
							{ id: 'ANY', name: 'Не важно', icon: '👥' },
							{ id: 'MALE', name: 'Мужской', icon: '👨' },
							{ id: 'FEMALE', name: 'Женский', icon: '👩' },
						]}
						// Приведение типа здесь безопасно, так как мы знаем опции
						onChange={(val) =>
							field.onChange(val as 'ANY' | 'MALE' | 'FEMALE')
						}
					/>
				)}
			/>

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
							label='Сфера'
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
							<ElegantSelect
								placeholder=''
								label='Категория'
								value={field.value}
								options={categories}
								onChange={(val) => {
									field.onChange(val)
									setValue('subcategoryId', 0)
								}}
							/>
						)}
					/>
				)}
				{selectedCategory > 0 && subcategories.length > 0 && (
					<Controller
						name='subcategoryId'
						control={control}
						render={({ field }) => (
							<ElegantSelect
								placeholder=''
								label='Подкатегория'
								// Если subcategoryId undefined/null, ставим 0 для селекта
								value={field.value ?? 0}
								options={subcategories}
								onChange={field.onChange}
							/>
						)}
					/>
				)}
			</div>

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
								value={field.value}
								onChange={(e) =>
									field.onChange(
										e.target.value
											? Number(e.target.value)
											: 0,
									)
								}
								placeholder='0'
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
							<input {...field} className={inputClass} />
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
						onChange={(d: {
							address: string
							lat: number
							lng: number
						}) => {
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
							className='w-full bg-slate-50 border border-slate-100 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none'
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
						: 'Опубликовать'}
			</button>
		</form>
	)
}
