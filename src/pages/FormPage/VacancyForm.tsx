import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { VacancyFormData, vacancySchema, formatPhoneKG } from './schemas'
import { apiService } from '../../../apiService'
import { FormField } from '.'
import { AddressAutocomplete2GIS, ElegantSelect } from '../../../App'

const inputClass =
	'w-full bg-slate-50 border border-slate-100 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-red-50 transition-all placeholder:text-slate-300 text-slate-900'

interface Props {
	initialData?: any
	onSubmit: (data: VacancyFormData) => void
	onMediaChange: (photos: File[], videos: File[]) => void
	loading: boolean
	cities: any[]
	spheres: any[]
	telegramId: number
}

export const VacancyForm: React.FC<Props> = ({
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
	} = useForm<VacancyFormData>({
		resolver: zodResolver(vacancySchema) as any,
		defaultValues: initialData || {
			cityId: 1,
			sphereId: 0,
			categoryId: 0,
			subcategoryId: 0,
			minAge: 18,
			maxAge: 45,
			preferredGender: 'ANY',
			phone: '+996',
		},
	})

	const [categories, setCategories] = useState([])
	const [subcategories, setSubcategories] = useState([])
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

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

	useEffect(() => {
		if (selectedCategory > 0)
			apiService
				.getSubcategories(telegramId, selectedCategory)
				.then(setSubcategories)
	}, [selectedCategory, telegramId])

	return (
		<form onSubmit={handleSubmit(onSubmit as any)} className='space-y-6'>
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
								{...field}
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
								{...field}
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
							{ id: 'ANY', name: 'Не важно' },
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
								value={field.value}
								options={subcategories}
								onChange={field.onChange}
							/>
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
								className='absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px]'
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
			</div>

			<FormField label='Компания' error={errors.companyName?.message}>
				<Controller
					name='companyName'
					control={control}
					render={({ field }) => (
						<input {...field} className={inputClass} />
					)}
				/>
			</FormField>

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
							className='w-full bg-slate-50 border border-slate-100 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none'
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
