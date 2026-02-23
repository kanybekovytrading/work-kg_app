import React, { useContext, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	useGetResumeDetailQuery,
	useGetVacancyDetailQuery,
	useGetResumeStatsQuery,
	useGetVacancyStatsQuery,
	useTrackContactClickMutation,
} from '../../src/store/store'
import { DetailRow, LocationContext, MediaViewer, useToast } from '../../App'
import { Media, Vacancy, Resume } from '../../types'

const tg = (window as any).Telegram?.WebApp

export const ProfileDetail: React.FC<{ telegramId: number }> = ({
	telegramId,
}) => {
	const location = useLocation()
	const navigate = useNavigate()
	const { type, data } = location.state || {}
	const { showToast } = useToast()
	const { location: userLocation } = useContext(LocationContext)

	const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)

	// --- RTK QUERY ---
	const { data: newData, isLoading: itemLoading } =
		type === 'worker'
			? useGetResumeDetailQuery(
					{ id: data?.id, tid: telegramId, isProfile: true },
					{ skip: !data?.id },
				)
			: useGetVacancyDetailQuery(
					{ id: data?.id, tid: telegramId, isProfile: true },
					{ skip: !data?.id },
				)

	let item: any = newData
	const { data: stats } =
		type === 'worker'
			? useGetResumeStatsQuery(data?.id, { skip: !data?.id })
			: useGetVacancyStatsQuery(data?.id, { skip: !data?.id })

	const [trackContactClick] = useTrackContactClickMutation()

	const isJob = type === 'job' || type === 'vac'
	const vacancy = isJob ? (item as Vacancy) : null
	const resume = !isJob ? (item as Resume) : null

	const handleContactClick = (platform: 'whatsapp' | 'telegram') => {
		if (!item) return
		trackContactClick({
			type: isJob ? 'job' : 'worker',
			id: item.id,
			tid: telegramId,
		})
		showToast(`Переходим в ${platform}...`, 'success')

		const phoneRaw = (item as any).phone || ''
		const phone = phoneRaw.replace(/\D/g, '')

		if (platform === 'whatsapp') {
			const url = `https://wa.me/${phone}`
			if (tg) tg.openLink(url, { try_instant_view: false })
			else window.open(url, '_blank')
		} else {
			let username = item.telegramUsername || (item as any).userName || ''
			username = username.replace(/^@/, '')
			const url = `https://t.me/${username}`
			if (tg) tg.openTelegramLink(url)
			else window.open(url, '_blank')
		}
	}

	const open2GISRoute = () => {
		if (!item?.address) return
		const fullAddress = `${item.cityName}, ${item.address}`.trim()
		const encodedAddress = encodeURIComponent(fullAddress)
		let url = `https://2gis.kg/search/${encodedAddress}`
		if (userLocation?.lat && userLocation?.lng)
			url += `?m=${userLocation.lng},${userLocation.lat}%2F15`
		if (tg) tg.openLink(url)
		else window.open(url, '_blank')
	}

	const isLocked = useMemo(() => {
		const phone = (item as any)?.phone
		if (!phone) return false
		return String(phone).includes('*')
	}, [item])

	const navigateToRelatedSearch = () => {
		if (!item) return
		navigate('/search', {
			state: {
				initialType: isJob ? 'worker' : 'job',
				initialCityId: item.cityId,
				initialSphereId: (item as any).sphereId,
				initialCategoryId: item.categoryId,
				initialSubcategoryId: item.subcategoryId,
			},
		})
	}

	if (itemLoading || !item)
		return (
			<div className='min-h-screen flex items-center justify-center bg-main'>
				<div className='w-10 h-10 border-[3px] border-red-700 border-t-transparent rounded-full animate-spin' />
			</div>
		)

	return (
		<>
			<MediaViewer
				media={selectedMedia}
				onClose={() => setSelectedMedia(null)}
			/>
			<div className='pb-32 animate-in fade-in duration-500 bg-main min-h-screen text-main'>
				<header
					className='px-6 py-4 flex items-center justify-between sticky top-0 bg-main/95 backdrop-blur-md z-50 border-b border-white/5'
					style={{
						paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
					}}
				>
					<button
						onClick={() => navigate(-1)}
						className='w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-main active:scale-90 transition-all'
					>
						<svg
							className='w-5 h-5'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2.5'
								d='M15 19l-7-7 7-7'
							/>
						</svg>
					</button>
				</header>

				<div className='px-6 pt-6 space-y-8 text-left'>
					<section className='space-y-4'>
						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<span className='text-[10px] font-black text-hint uppercase tracking-widest'>
									{item.cityName} • {item.categoryName}
								</span>
								{item.isActive !== false && (
									<span className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse'></span>
								)}
							</div>
							<h1 className='text-3xl font-black text-main leading-tight'>
								{isJob ? vacancy?.title : resume?.name}
							</h1>
							{isJob && vacancy?.companyName && (
								<p className='text-sm font-bold text-red-800 flex items-center gap-2'>
									<CompanyIcon />
									{vacancy.companyName}
								</p>
							)}
						</div>
						<div className='inline-flex items-center px-6 py-3 bg-secondary text-main text-xl font-black rounded-2xl border border-white/5 shadow-sm'>
							{isJob
								? vacancy?.salary || 'ЗП не указана'
								: `${resume?.experience}г. опыта`}
						</div>
					</section>

					{item.media && item.media.length > 0 && (
						<section className='space-y-4'>
							<h4 className='text-[10px] font-black text-hint uppercase tracking-widest px-1'>
								Галерея работ
							</h4>
							<div className='flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 px-1'>
								{[...item.media]
									.sort((a: Media) =>
										a.mediaType === 'VIDEO' ? -1 : 1,
									)
									.map((m: Media) => (
										<div
											key={m.id}
											onClick={() => setSelectedMedia(m)}
											className='flex-shrink-0 w-[85%] sm:w-80 h-56 bg-black rounded-[2.5rem] overflow-hidden shadow-xl border border-white/5 snap-center relative group cursor-pointer'
										>
											{m.mediaType === 'VIDEO' ? (
												<>
													<video
														src={m.fileUrl}
														className='w-full h-full object-cover pointer-events-none'
													/>
													<div className='absolute inset-0 flex items-center justify-center bg-black/20'>
														<div className='w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center'>
															<div className='w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-1'></div>
														</div>
													</div>
												</>
											) : (
												<img
													src={m.fileUrl}
													alt=''
													className='w-full h-full object-cover transition-transform duration-500 group-active:scale-110'
												/>
											)}
										</div>
									))}
							</div>
						</section>
					)}

					{/* БЛОК РЕКОМЕНДАЦИИ (BENTO) */}
					<div
						onClick={navigateToRelatedSearch}
						className='mx-1 p-5 bg-[#111111] rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer overflow-hidden relative'
					>
						<div className='absolute -right-4 -top-4 w-24 h-24 bg-red-800/20 blur-2xl rounded-full'></div>
						<div className='flex items-center gap-4 relative z-10'>
							<div className='w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl'>
								{isJob ? '🔍' : '💼'}
							</div>
							<div className='text-left'>
								<div className='text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5'>
									Рекомендация
								</div>
								<div className='text-sm font-black text-white leading-tight'>
									{isJob
										? 'Найти сотрудников в этой категории'
										: 'Посмотреть вакансии в этой сфере'}
								</div>
							</div>
						</div>
						<div className='w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform'>
							<svg
								className='w-4 h-4'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='3'
									d='M9 5l7 7-7 7'
								/>
							</svg>
						</div>
					</div>

					<section className='bg-secondary p-6 rounded-[2.5rem] border border-white/5 space-y-6'>
						<h4 className='text-[10px] font-black text-hint uppercase tracking-widest'>
							Ключевые детали
						</h4>
						<div className='grid grid-cols-1 gap-6'>
							{isJob && (
								<DetailRow
									icon={<ClockIconSmall />}
									label='График работы'
									value={vacancy?.schedule || 'Не указано'}
								/>
							)}
							<DetailRow
								icon={<ExpIconSmall />}
								label='Опыт'
								value={`${isJob ? vacancy?.experienceInYear : resume?.experience} лет`}
							/>

							{isJob && vacancy?.address && (
								<div
									onClick={open2GISRoute}
									className='cursor-pointer active:opacity-70 transition-opacity'
								>
									<DetailRow
										icon={<LocIconSmall />}
										label='Адрес / Район (Карта)'
										value={vacancy.address}
									/>
									<div className='pl-[56px] text-[9px] font-bold text-emerald-600 uppercase mt-1 flex items-center gap-1'>
										<RouteIcon />
										<span>Открыть маршрут в 2GIS</span>
									</div>
								</div>
							)}
							<DetailRow
								icon={<UserIconSmall />}
								label='Условия'
								value={
									isJob
										? `Возраст: ${vacancy?.minAge}-${vacancy?.maxAge} • Пол: ${vacancy?.preferredGender === 'MALE' ? 'Мужчина' : vacancy?.preferredGender === 'FEMALE' ? 'Женщина' : 'Любой'}`
										: `Возраст: ${resume?.age} • Пол: ${resume?.gender === 'MALE' ? 'Мужчина' : 'Женщина'}`
								}
							/>
						</div>
					</section>

					<section className='space-y-4'>
						<h4 className='text-[10px] font-black text-hint uppercase tracking-widest px-1'>
							Подробное описание
						</h4>
						<div className='text-main/80 leading-relaxed whitespace-pre-wrap font-medium text-sm px-1'>
							{item.description}
						</div>
					</section>

					<section className='flex items-center justify-between px-2 pt-4 border-t border-white/5 text-[10px] font-black text-hint uppercase tracking-widest'>
						<div className='flex items-center gap-4'>
							<span className='flex items-center gap-1.5'>
								<ViewIcon /> {stats?.viewsCount || 0}
							</span>
							<span className='flex items-center gap-1.5'>
								<ClickIcon /> {stats?.contactClicksCount || 0}
							</span>
						</div>
						<span>
							{item.createdAt
								? new Date(item.createdAt).toLocaleDateString()
								: 'Сегодня'}
						</span>
					</section>
				</div>

				<div className='fixed bottom-0 left-0 right-0 p-6 bg-main/90 backdrop-blur-2xl border-t border-white/5 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'>
					<div className='max-w-xl mx-auto'>
						<div className='grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-300'>
							<button
								onClick={() => handleContactClick('whatsapp')}
								className='h-16 bg-[#075e54] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all'
							>
								WhatsApp
							</button>
							<button
								onClick={() => handleContactClick('telegram')}
								className='h-16 bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all'
							>
								Telegram
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

// Вспомогательные иконки (сохранил твой стиль)
const CompanyIcon = () => (
	<svg
		className='w-4 h-4'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
		/>
	</svg>
)
const RouteIcon = () => (
	<svg
		className='w-3 h-3'
		fill='none'
		viewBox='0 0 24 24'
		stroke='currentColor'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
		/>
	</svg>
)
const ClockIconSmall = () => (
	<svg
		className='w-4 h-4'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		/>
	</svg>
)
const ExpIconSmall = () => (
	<svg
		className='w-4 h-4'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
		/>
	</svg>
)
const LocIconSmall = () => (
	<svg
		className='w-4 h-4'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
		/>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
		/>
	</svg>
)
const UserIconSmall = () => (
	<svg
		className='w-4 h-4'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
		/>
	</svg>
)
const ViewIcon = () => (
	<svg
		className='w-3.5 h-3.5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		/>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
		/>
	</svg>
)
const ClickIcon = () => (
	<svg
		className='w-3.5 h-3.5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5'
		/>
	</svg>
)
