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
import { formatPhoneKG } from '../../../constants'

const tg = (window as any).Telegram?.WebApp

// Оригинальный стиль инпутов с поддержкой темы
const inputClass =
	'w-full bg-secondary border border-white/5 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-4 ring-transparent focus:ring-red-500/10 transition-all placeholder:text-hint/40 text-main shadow-sm'

interface Props {
	initialData?: any
	onSubmit: (data: ResumeFormData) => void
	onMediaChange: (photos: File[], videos: File[]) => void
	loading: boolean
	cities: any[]
	spheres: any[]
	telegramId: number
	formRef: React.RefObject<HTMLFormElement> // Добавлено для связи с CreatePage
}

export const ResumeForm: React.FC<Props> = ({
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
	} = useForm<ResumeFormData>({
		resolver: zodResolver(resumeSchema) as any,
		mode: 'onChange', // Чтобы статус isValid обновлялся для MainButton
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
			phone: '+996',
		},
	})

	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

	const allValues = watch()
	const selectedSphere = watch('sphereId')
	const selectedCategory = watch('categoryId')

	// --- 1. CLOUD STORAGE (ЧЕРНОВИК) ---
	useEffect(() => {
		if (!initialData && tg.CloudStorage) {
			tg.CloudStorage.getItem(
				'resume_draft',
				(err: any, value: string) => {
					if (value) {
						try {
							reset(JSON.parse(value))
						} catch (e) {
							console.error('Draft load error', e)
						}
					}
				},
			)
		}
	}, [initialData, reset])

	useEffect(() => {
		if (!initialData && !loading) {
			const timer = setTimeout(() => {
				tg.CloudStorage.setItem(
					'resume_draft',
					JSON.stringify(allValues),
				)
			}, 1000)
			return () => clearTimeout(timer)
		}
	}, [allValues, initialData, loading])

	// --- 2. MAIN BUTTON INTEGRATION ---
	useEffect(() => {
		const mainButton = tg.MainButton

		mainButton.setParams({
			text: initialData ? 'СОХРАНИТЬ РЕЗЮМЕ' : 'ОПУБЛИКОВАТЬ РЕЗЮМЕ',
			color: '#111111', // Черный как в вашем стиле
			text_color: '#ffffff',
			is_visible: true,
			is_active: true,
		})

		const handleMainClick = () => {
			if (isValid) {
				handleSubmit(onSubmit)()
			} else {
				tg.HapticFeedback.notificationOccurred('error')
				tg.showAlert('Пожалуйста, заполните все поля корректно')
			}
		}

		mainButton.onClick(handleMainClick)
		return () => {
			mainButton.offClick(handleMainClick)
			mainButton.hide()
		}
	}, [isValid, initialData, handleSubmit, onSubmit])

	// Управление лоадером в кнопке
	useEffect(() => {
		if (loading) tg.MainButton.showProgress()
		else tg.MainButton.hideProgress()
	}, [loading])

	// --- 3. ДАННЫЕ И МЕДИА ---
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
		onMediaChange(selectedPhotos, selectedVideos)
	}, [selectedPhotos, selectedVideos, onMediaChange])

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
			className='space-y-6 pb-24'
		>
			{/* Ваше Имя */}
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

			<div className='grid grid-cols-2 gap-4'>
				<Controller
					name='gender'
					control={control}
					render={({ field }) => (
						<ElegantSelect
							label='Пол'
							value={field.value}
							options={[
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
				<FormField label='Телефон' error={errors.phone?.message}>
					<Controller
						name='phone'
						control={control}
						render={({ field }) => (
							<input
								{...field}
								onChange={(e) =>
									field.onChange(
										formatPhoneKG(e.target.value),
									)
								}
								className={inputClass}
							/>
						)}
					/>
				</FormField>
			</div>

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
							label='Желаемая сфера'
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
									value={field.value}
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

			{/* Блок Медиа */}
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
								type='button'
								onClick={() => removeMedia(i, 'photo')}
								className='absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center'
							>
								×
							</button>
						</div>
					))}
					{selectedVideos.map((file, i) => (
						<div
							key={i}
							className='relative shrink-0 w-20 h-20 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center'
						>
							<span className='text-[8px] text-white font-bold'>
								VIDEO
							</span>
							<button
								type='button'
								onClick={() => removeMedia(i, 'video')}
								className='absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center'
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
							className='w-full bg-secondary border border-white/5 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none text-main placeholder:text-hint/40'
							placeholder='Расскажите о своих сильных сторонах...'
						/>
					)}
				/>
			</FormField>

			{/* Скрытая кнопка для работы requestSubmit */}
			<button type='submit' className='hidden' />
		</form>
	)
}
