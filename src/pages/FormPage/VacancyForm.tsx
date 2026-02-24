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

const tg = (window as any).Telegram?.WebApp

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
	formRef: React.RefObject<HTMLFormElement>
}

const inputClass =
	'w-full bg-secondary border border-white/5 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-4 ring-transparent focus:ring-red-500/10 transition-all placeholder:text-hint/40 text-main shadow-sm'

export const VacancyForm: React.FC<Props> = ({
	initialData,
	onSubmit,
	onMediaChange,
	loading,
	cities,
	spheres,
	telegramId,
	formRef,
}) => {
	const {
		control,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors, isValid },
	} = useForm({
		resolver: zodResolver(vacancySchema),
		mode: 'onChange', // Чтобы MainButton знала статус валидации
		defaultValues: (initialData as VacancyFormData) || {
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
		},
	})

	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	const allValues = watch()
	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	// --- 1. РАБОТА С ЧЕРНОВИКАМИ (CloudStorage) ---
	useEffect(() => {
		// При монтировании проверяем облако на наличие черновика
		if (!initialData && tg.CloudStorage) {
			tg.CloudStorage.getItem(
				'vacancy_draft',
				(err: any, value: string) => {
					if (value) {
						try {
							const draft = JSON.parse(value)
							reset(draft)
						} catch (e) {
							console.error('Draft error', e)
						}
					}
				},
			)
		}
	}, [])

	useEffect(() => {
		// Сохраняем черновик при каждом изменении (кроме режима редактирования)
		if (!initialData && !loading) {
			const timer = setTimeout(() => {
				tg.CloudStorage.setItem(
					'vacancy_draft',
					JSON.stringify(allValues),
				)
			}, 1000)
			return () => clearTimeout(timer)
		}
	}, [allValues, initialData])

	// --- 2. УПРАВЛЕНИЕ MAIN BUTTON ---
	useEffect(() => {
		const mainButton = tg.MainButton

		if (loading) {
			mainButton.showProgress()
			mainButton.disable()
		} else {
			mainButton.hideProgress()
			mainButton.setParams({
				text: initialData ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'ОПУБЛИКОВАТЬ',
				color: '#b91c1c',
				text_color: '#ffffff',
				is_visible: true,
				is_active: true,
			})
		}

		const handleMainClick = () => {
			if (isValid) {
				handleSubmit(onSubmit)()
			} else {
				tg.HapticFeedback.notificationOccurred('error')
				tg.showAlert('Пожалуйста, заполните все обязательные поля')
			}
		}

		mainButton.onClick(handleMainClick)
		return () => {
			mainButton.offClick(handleMainClick)
			mainButton.hide()
		}
	}, [loading, isValid, handleSubmit, onSubmit, initialData])

	// --- 3. ДИНАМИЧЕСКИЕ ДАННЫЕ ---
	const { data: categories = [], isFetching: isCatLoading } =
		useGetCategoriesQuery(
			{ tid: telegramId, sid: selectedSphere },
			{ skip: !selectedSphere },
		)
	const { data: subcategories = [], isFetching: isSubCatLoading } =
		useGetSubcategoriesQuery(
			{ tid: telegramId, cid: selectedCategory },
			{ skip: !selectedCategory },
		)

	useEffect(() => {
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos, onMediaChange])

	// Хендлер удаления медиа
	const removeMedia = (index: number, type: 'photo' | 'video') => {
		tg.HapticFeedback.impactOccurred('light')
		if (type === 'photo') {
			setSelectedPhotos((prev) => prev.filter((_, i) => i !== index))
		} else {
			setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
		}
	}

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit(onSubmit)}
			className='space-y-6 pb-20'
		>
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
						onChange={(val) => {
							tg.HapticFeedback.selectionChanged()
							field.onChange(val)
						}}
						placeholder=''
					/>
				)}
			/>

			<div className='space-y-6 p-6 bg-secondary/40 rounded-[2.5rem] border border-white/5 shadow-inner'>
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
								tg.HapticFeedback.selectionChanged()
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
										tg.HapticFeedback.selectionChanged()
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

			{/* Медиа Блок с превью */}
			<div className='space-y-4'>
				<label className='block text-[10px] font-black text-hint uppercase tracking-widest ml-1'>
					Фото и Видео
				</label>
				<div className='flex gap-2'>
					<label className='flex-1 h-14 bg-[#111111] text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all'>
						<input
							type='file'
							multiple
							accept='image/*'
							className='hidden'
							onChange={(e) => {
								if (e.target.files) {
									tg.HapticFeedback.impactOccurred('medium')
									setSelectedPhotos([
										...selectedPhotos,
										...Array.from(e.target.files),
									])
								}
							}}
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
							onChange={(e) => {
								if (e.target.files) {
									tg.HapticFeedback.impactOccurred('medium')
									setSelectedVideos([
										...selectedVideos,
										...Array.from(e.target.files),
									])
								}
							}}
						/>
						<span className='text-[10px] font-black uppercase'>
							+ Видео ({selectedVideos.length})
						</span>
					</label>
				</div>

				{/* Превью файлов */}
				<div className='flex gap-3 overflow-x-auto no-scrollbar py-2'>
					{selectedPhotos.map((file, i) => (
						<div
							key={i}
							className='relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-white/10'
						>
							<img
								src={URL.createObjectURL(file)}
								className='w-full h-full object-cover'
								alt=''
							/>
							<button
								onClick={() => removeMedia(i, 'photo')}
								className='absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-bold'
							>
								×
							</button>
						</div>
					))}
					{selectedVideos.map((file, i) => (
						<div
							key={i}
							className='relative shrink-0 w-20 h-20 rounded-2xl bg-black border border-white/10 flex items-center justify-center'
						>
							<span className='text-xs text-white font-bold'>
								VIDEO
							</span>
							<button
								onClick={() => removeMedia(i, 'video')}
								className='absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-bold'
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
								value={field.value || ''}
								onChange={(e) =>
									field.onChange(
										e.target.value === ''
											? ''
											: Number(e.target.value),
									)
								}
								placeholder='Опыт'
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
								placeholder='Название'
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
							tg.HapticFeedback.selectionChanged()
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
							className='w-full bg-secondary border border-white/5 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none text-main placeholder:text-hint/40'
							placeholder='Опишите вакансию подробно...'
						/>
					)}
				/>
			</FormField>

			{/* HTML кнопка скрыта, так как мы используем MainButton, но оставлена для корректной работы formRef.requestSubmit() */}
			<button type='submit' className='hidden' />
		</form>
	)
}
