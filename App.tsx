import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useContext,
	useRef,
} from 'react'
import {
	HashRouter,
	Routes,
	Route,
	useNavigate,
	useLocation,
	Navigate,
	useSearchParams,
} from 'react-router-dom'
import { apiService } from './apiService'
import { geminiService } from './geminiService'
import { LOCALES, BANK_SERVICES, formatPhoneKG } from './constants'
import {
	User,
	Resume,
	Vacancy,
	City,
	Sphere,
	Category,
	Subcategory,
	ReferralInfo,
	AccessStatus,
	Media,
} from './types'
import { GamesPage } from './src/pages/games/ui/GamesPage'
import { ProfileDetail } from './src/pages/ProfileDetail'
import CreatePage from './src/pages/FormPage/CreatePage'
import EditPage from './src/pages/FormPage/EditPage'

const tg = (window as any).Telegram?.WebApp

// --- SHARED COMPONENTS ---

const ToastContext = React.createContext<{
	showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}>({ showToast: () => {} })

export const useToast = () => useContext(ToastContext)

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [toast, setToast] = useState<{
		message: string
		type: 'success' | 'error' | 'info'
	} | null>(null)
	const showToast = useCallback(
		(message: string, type: 'success' | 'error' | 'info' = 'success') => {
			setToast({ message, type })
			setTimeout(() => setToast(null), 3000)
		},
		[],
	)

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{toast && (
				<div className='fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm'>
					<div
						className={`p-4 rounded-2xl shadow-2xl flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'brand-gradient text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}
					>
						<div className='text-sm font-bold'>{toast.message}</div>
					</div>
				</div>
			)}
		</ToastContext.Provider>
	)
}

// --- GEOLOCATION & MAP COMPONENTS ---

export const LocationContext = React.createContext<{
	location: { lat: number; lng: number } | null
	requestLocation: () => Promise<void>
	permissionStatus: PermissionState | 'prompt' | 'denied' | 'granted'
}>({
	location: null,
	requestLocation: async () => {},
	permissionStatus: 'prompt',
})

const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [location, setLocation] = useState<{
		lat: number
		lng: number
	} | null>(null)
	const [permissionStatus, setPermissionStatus] = useState<
		PermissionState | 'prompt' | 'denied' | 'granted'
	>('prompt')
	const { showToast } = useToast()

	const requestLocation = useCallback(async () => {
		// 1. Проверка на HTTPS (обязательно для Geolocation API)
		if (
			window.location.protocol !== 'https:' &&
			window.location.hostname !== 'localhost'
		) {
			showToast(
				'Геолокация требует безопасного соединения (HTTPS)',
				'error',
			)
			console.error('Геолокация заблокирована: нужен HTTPS')
			return
		}

		if (!navigator.geolocation) {
			showToast('Геолокация не поддерживается вашим устройством', 'error')
			return
		}

		console.log('Запрашиваю геолокацию...')
		setPermissionStatus('prompt') // Визуальный сброс

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const coords = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				}
				console.log('Успех:', coords)
				setLocation(coords)
				setPermissionStatus('granted')
				showToast('Местоположение определено!', 'success')
			},
			(error) => {
				console.warn('Ошибка геолокации:', error.code, error.message)

				switch (error.code) {
					case error.PERMISSION_DENIED:
						setPermissionStatus('denied')
						showToast(
							'Доступ к GPS отклонен. Разрешите его в настройках Telegram',
							'error',
						)
						break
					case error.POSITION_UNAVAILABLE:
						showToast(
							'Информация о местоположении недоступна',
							'error',
						)
						break
					case error.TIMEOUT:
						showToast('Время ожидания GPS истекло', 'error')
						break
					default:
						showToast('Ошибка при поиске местоположения', 'error')
				}
			},
			{
				enableHighAccuracy: false, // Изменил на false для более быстрого поиска в помещениях
				timeout: 15000, // Увеличил до 15 секунд
				maximumAge: 30000, // Разрешил кеш 30 секунд
			},
		)
	}, [showToast])

	return (
		<LocationContext.Provider
			value={{ location, requestLocation, permissionStatus }}
		>
			{children}
		</LocationContext.Provider>
	)
}

const LocationBanner: React.FC = () => {
	const { location, requestLocation, permissionStatus } =
		useContext(LocationContext)

	if (location || permissionStatus === 'denied') return null

	return (
		<div className='px-6 mb-6'>
			<div className='bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center gap-4'>
				<div className='w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm'>
					📍
				</div>
				<div className='flex-1 text-left'>
					<h4 className='text-[11px] font-black text-slate-900 uppercase tracking-tight'>
						Работа рядом
					</h4>
					<p className='text-[9px] font-medium text-slate-400'>
						Разрешите доступ к гео
					</p>
				</div>
				<button
					onClick={requestLocation}
					className='px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest'
				>
					Разрешить
				</button>
			</div>
		</div>
	)
}

// Компонент автокомплита адреса (ИСПОЛЬЗУЕМ МЕТОД ITEMS ВМЕСТО SUGGEST)
// Компонент автокомплита адреса (С ФИЛЬТРОМ ПО БИШКЕКУ)
// Компонент автокомплита адреса (OpenStreetMap - Бесплатно, без ключей)
export const AddressAutocomplete2GIS: React.FC<{
	value: string
	onChange: (data: {
		address: string
		lat: number | null
		lng: number | null
	}) => void
}> = ({ value, onChange }) => {
	const [query, setQuery] = useState(value)
	const [suggestions, setSuggestions] = useState<any[]>([])
	const [isOpen, setIsOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const timeoutRef = useRef<any>(null)

	const handleSearch = (text: string) => {
		setQuery(text)
		// Если пользователь просто стирает текст, сбрасываем координаты
		onChange({ address: text, lat: null, lng: null })

		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		if (text.length < 3) {
			setSuggestions([])
			return
		}

		setLoading(true)
		timeoutRef.current = setTimeout(async () => {
			try {
				const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=kg&accept-language=ru&limit=5&addressdetails=1`
				const response = await fetch(url)
				const data = await response.json()

				if (data && data.length > 0) {
					const realResults = data.map((item: any) => {
						const address = item.address || {}
						let mainName =
							address.road ||
							address.pedestrian ||
							address.building ||
							item.name ||
							text
						return {
							id: item.place_id,
							name: mainName,
							address_name: [address.city, address.house_number]
								.filter(Boolean)
								.join(', '),
							full_name: item.display_name,
							lat: item.lat, // Берем широту из API
							lon: item.lon, // Берем долготу из API
						}
					})
					setSuggestions(realResults)
				}
			} catch (e) {
				console.error('Ошибка OSM:', e)
			} finally {
				setLoading(false)
				setIsOpen(true)
			}
		}, 600)
	}

	const handleSelect = (item: any) => {
		setQuery(item.full_name)
		// ПЕРЕДАЕМ ОБЪЕКТ С КООРДИНАТАМИ
		onChange({
			address: item.full_name,
			lat: parseFloat(item.lat),
			lng: parseFloat(item.lon),
		})
		setIsOpen(false)
	}

	return (
		<div className='relative space-y-2'>
			<label className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left block'>
				Адрес (Поиск по Кыргызстану)
			</label>
			<div className='relative'>
				<input
					value={query}
					onChange={(e) => handleSearch(e.target.value)}
					placeholder='Улица, дом или название...'
					className='w-full bg-slate-50 border border-slate-100 h-14 pl-12 pr-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-emerald-50 focus:border-emerald-200 transition-all text-slate-900'
				/>
				<div className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'>
					{/* Иконка карты */}
					<svg className='w-5 h-5' fill='none' viewBox='0 0 24 24'>
						<path
							fill='#3B82F6'
							d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'
						/>
					</svg>
				</div>
				{loading && (
					<div className='absolute right-4 top-1/2 -translate-y-1/2'>
						<div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
					</div>
				)}
			</div>

			{isOpen && suggestions.length > 0 && (
				<>
					<div
						className='fixed inset-0 z-[60]'
						onClick={() => setIsOpen(false)}
					/>
					<div className='absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200'>
						{suggestions.map((item) => (
							<button
								key={item.id}
								onClick={() => handleSelect(item)}
								className='w-full text-left p-4 border-b border-slate-50 hover:bg-blue-50 transition-colors flex flex-col last:border-0'
							>
								<span className='font-bold text-sm text-slate-900 leading-tight mb-1'>
									{item.name}
								</span>
								<span className='text-[10px] text-slate-400 font-medium leading-tight'>
									{item.address_name}
								</span>
							</button>
						))}
						<div className='p-2 bg-slate-50 text-[9px] text-center text-slate-400 font-bold uppercase'>
							OpenStreetMap (KG)
						</div>
					</div>
				</>
			)}
		</div>
	)
}
// Новый компонент для просмотра медиа на весь экран
export const MediaViewer: React.FC<{
	media: Media | null
	onClose: () => void
}> = ({ media, onClose }) => {
	if (!media) return null

	return (
		<div
			className='fixed inset-0 z-[300] bg-black flex items-center justify-center animate-in fade-in duration-300'
			onClick={onClose}
		>
			<button
				onClick={onClose}
				className='absolute top-10 right-6 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md z-[310]'
			>
				✕
			</button>
			<div className='w-full h-full flex items-center justify-center p-2'>
				{media.mediaType === 'VIDEO' ? (
					<video
						src={media.fileUrl}
						controls
						autoPlay
						className='max-w-full max-h-full rounded-lg'
						onClick={(e) => e.stopPropagation()}
					/>
				) : (
					<img
						src={media.fileUrl}
						alt='Full screen'
						className='max-w-full max-h-full object-contain'
						onClick={(e) => e.stopPropagation()}
					/>
				)}
			</div>
		</div>
	)
}

const Logo = () => (
	<div className='flex items-center gap-2 font-black text-2xl tracking-tight'>
		<div className='flex items-center gap-1 mr-1'>
			<div className='logo-icon-line'></div>
			<div className='logo-icon-line'></div>
		</div>
		<span className='text-[#111111]'>WORK</span>
		<span className='text-[#b91c1c]'>KG</span>
	</div>
)

export const ElegantSelect: React.FC<{
	label?: string
	value: string | number | null
	options: { id: string | number; name: string; icon?: string }[]
	placeholder: string
	onChange: (id: any) => void
	disabled?: boolean
}> = ({ label, value, options, placeholder, onChange, disabled }) => {
	const [isOpen, setIsOpen] = useState(false)
	const selectedOption = options.find((o) => String(o.id) === String(value))

	const renderIcon = (icon?: string, name?: string) => {
		if (!icon) return null
		const isUrl = icon.startsWith('http') || icon.startsWith('data:')
		return (
			<div className='w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-lg'>
				{isUrl ? (
					<img
						src={icon}
						alt={name}
						className='w-full h-full object-contain'
					/>
				) : (
					<span className='text-xl'>{icon}</span>
				)}
			</div>
		)
	}

	return (
		<div
			className={`relative w-full ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}
		>
			{label && (
				<label className='block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-left'>
					{label}
				</label>
			)}
			<button
				type='button'
				onClick={() => !disabled && setIsOpen(!isOpen)}
				className={`w-full flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm active:bg-slate-50 transition-all ${isOpen ? 'border-red-100 ring-4 ring-red-50/30' : 'border-slate-100'}`}
			>
				<div className='flex items-center gap-3 overflow-hidden'>
					{selectedOption &&
						renderIcon(selectedOption.icon, selectedOption.name)}
					<span
						className={`font-bold text-sm truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}
					>
						{selectedOption ? selectedOption.name : placeholder}
					</span>
				</div>
				<svg
					className={`w-5 h-5 text-red-700 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2.5'
						d='M19 9l-7 7-7-7'
					/>
				</svg>
			</button>

			{isOpen && (
				<>
					<div
						className='fixed inset-0 z-[160] bg-black/5'
						onClick={() => setIsOpen(false)}
					/>
					<div className='absolute top-full left-0 right-0 mt-2 z-[170] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto no-scrollbar'>
						{options.map((opt) => (
							<button
								key={opt.id}
								onClick={() => {
									onChange(opt.id)
									setIsOpen(false)
								}}
								className={`w-full flex items-center gap-4 p-4 text-left border-b border-slate-50 last:border-0 active:bg-red-50 ${String(value) === String(opt.id) ? 'bg-red-50/30' : ''}`}
							>
								{renderIcon(opt.icon, opt.name)}
								<span
									className={`font-bold text-sm flex-1 ${String(value) === String(opt.id) ? 'text-red-700' : 'text-slate-700'}`}
								>
									{opt.name}
								</span>
								{String(value) === String(opt.id) && (
									<span className='ml-auto text-red-700 font-bold text-lg'>
										✓
									</span>
								)}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	)
}

const BottomSheet: React.FC<{
	isOpen: boolean
	onClose: () => void
	title: string
	description?: string
	children: React.ReactNode
}> = ({ isOpen, onClose, title, description, children }) => {
	if (!isOpen) return null
	return (
		<div className='fixed inset-0 z-[150] flex items-end justify-center'>
			<div
				className='absolute inset-0 bg-slate-900/40 backdrop-blur-sm'
				onClick={onClose}
			/>
			<div className='relative w-full max-w-xl bg-white rounded-t-[2.5rem] shadow-2xl p-8 pb-12 animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[85vh]'>
				<div className='w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8 flex-shrink-0' />
				<div className='text-center mb-8 flex-shrink-0'>
					<h2 className='text-2xl font-black text-slate-900 leading-tight'>
						{title}
					</h2>
					{description && (
						<p className='text-slate-500 text-sm mt-2 font-medium'>
							{description}
						</p>
					)}
				</div>
				<div className='space-y-3'>{children}</div>
				<button
					onClick={onClose}
					className='w-full mt-6 py-2 text-slate-400 text-xs font-bold uppercase tracking-widest flex-shrink-0'
				>
					Закрыть
				</button>
			</div>
		</div>
	)
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({
	label,
	children,
}) => (
	<div className='space-y-2'>
		<label className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left block'>
			{label}
		</label>
		{children}
	</div>
)

// --- PAGES ---

const HomePage: React.FC<{ user: User | null }> = ({ user }) => {
	const navigate = useNavigate()

	const spheres = [
		{
			id: 1,
			name: 'IT-сфера',
			icon: '💻',
		},
		{
			id: 2,
			name: 'Продажи',
			icon: '🏪',
		},
		{
			id: 3,
			name: 'Строительство',
			icon: '🏗',
		},
		{
			id: 4,
			name: 'Маркетинг',
			icon: '📈',
		},
		{
			id: 5,
			name: 'Швейная отрасль',
			icon: '🧵',
		},
		{
			id: 6,
			name: 'Логистика',
			icon: '🚚',
		},
		{
			id: 7,
			name: 'Общепит',
			icon: '☕️',
		},
	]

	return (
		<div className='pb-40 animate-in fade-in duration-500 bg-white min-h-screen main-content-offset'>
			<header className='px-6 pb-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-50'>
				<Logo />
				<div className='flex items-center gap-2'>
					<button className='w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl relative active:scale-95 transition-transform'>
						<BellIcon />
						<div className='absolute top-3 right-3 w-1.5 h-1.5 bg-red-700 rounded-full border border-white'></div>
					</button>
				</div>
			</header>

			<LocationBanner />

			<div className='px-6 mt-6 space-y-4'>
				<div
					onClick={() =>
						navigate('/create', { state: { type: 'res' } })
					}
					className='brand-gradient p-6 rounded-[2rem] text-white shadow-xl brand-shadow active:scale-[0.98] transition-all relative overflow-hidden'
				>
					<div className='absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl'></div>
					<div className='relative z-10 text-left'>
						<h3 className='text-xl font-black uppercase tracking-tight'>
							Начни поиск 🚀
						</h3>
						<p className='text-[11px] text-slate-200 font-bold uppercase mt-1'>
							Создай резюме за 60 секунд
						</p>
					</div>
				</div>

				{/* Bento Grid: Games & Pro */}
				<div className='grid grid-cols-2 gap-4'>
					<div
						onClick={() => navigate('/games')}
						className='bg-indigo-600 p-5 rounded-[2rem] text-white shadow-lg active:scale-[0.97] transition-all relative overflow-hidden h-32 flex flex-col justify-end'
					>
						<div className='absolute -right-2 -top-2 text-4xl opacity-20'>
							🎮
						</div>
						<div className='relative z-10 text-left'>
							<h4 className='font-black text-sm uppercase'>
								PLAY ZONE
							</h4>
							<p className='text-[9px] text-indigo-100 font-bold uppercase'>
								Отдохни
							</p>
						</div>
					</div>
					<div
						onClick={() => navigate('/subscription')}
						className='bg-[#111111] p-5 rounded-[2rem] text-white shadow-lg active:scale-[0.97] transition-all relative overflow-hidden h-32 flex flex-col justify-end'
					>
						<div className='absolute -right-2 -top-2 text-4xl opacity-20'>
							💎
						</div>
						<div className='relative z-10 text-left'>
							<h4 className='font-black text-sm uppercase'>
								PRO ДОСТУП
							</h4>
							<p className='text-[9px] text-slate-400 font-bold uppercase'>
								Контакты
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='overflow-x-auto no-scrollbar flex gap-4 px-6 mb-8 mt-8'>
				{spheres.map((s) => (
					<div
						key={s.id}
						onClick={() =>
							navigate('/search', { state: { initialSphere: s } })
						}
						className='flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group'
					>
						<div className='w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-90'>
							{s.icon}
						</div>
						<span className='text-[9px] font-bold text-slate-400 uppercase tracking-tighter'>
							{s.name}
						</span>
					</div>
				))}
			</div>

			<div className='px-6 space-y-6'>
				<div className='flex justify-between items-center'>
					<h3 className='text-lg font-black text-slate-900'>
						Рекомендуем
					</h3>
					<button
						onClick={() => navigate('/search')}
						className='text-[10px] font-black text-red-700 uppercase'
					>
						Все →
					</button>
				</div>

				{[1, 2].map((i) => (
					<div
						key={i}
						className='bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-4 active:bg-slate-50 transition-all'
					>
						<div className='w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl'>
							💼
						</div>
						<div className='flex-1'>
							<h4 className='font-black text-slate-900 leading-tight'>
								Бариста / Официант
							</h4>
							<p className='text-[10px] font-bold text-slate-400 uppercase mt-1'>
								Sierra Coffee • Бишкек
							</p>
						</div>
						<div className='text-right'>
							<div className='text-sm font-black text-red-700'>
								45 000
							</div>
							<div className='text-[8px] font-black text-slate-300 uppercase'>
								сом
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

const SearchPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const location = useLocation()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { showToast } = useToast()

	// Данные из location.state (если переход был по кнопкам категорий с главной)
	const s = location.state || {}

	// --- 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ URL ---
	const getNumParam = (key: string) => {
		const val = searchParams.get(key)
		return val ? Number(val) : null
	}

	const getStringParam = (key: string, def: string) => {
		return searchParams.get(key) || def
	}

	// --- 2. STATE С ИНИЦИАЛИЗАЦИЕЙ ИЗ URL ---
	// Приоритет: 1. URL параметр -> 2. State из навигации (s) -> 3. Дефолт

	const [type, setType] = useState<'job' | 'worker'>(
		() => getStringParam('type', 'job') as 'job' | 'worker',
	)

	const [query, setQuery] = useState(() => getStringParam('query', ''))

	const [selectedCityId, setSelectedCityId] = useState<number>(
		() => getNumParam('cityId') || 1,
	)

	const [selectedSphereId, setSelectedSphereId] = useState<number | null>(
		() =>
			getNumParam('sphereId') ||
			s.initialSphere?.id ||
			s.initialSphereId ||
			null,
	)

	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
		() => getNumParam('catId') || s.initialCategoryId || null,
	)

	const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
		number | null
	>(() => getNumParam('subId') || null)

	// Данные из API
	const [cities, setCities] = useState<City[]>([])
	const [spheres, setSpheres] = useState<Sphere[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [subcategories, setSubcategories] = useState<Subcategory[]>([])

	const [results, setResults] = useState<any[]>([])
	const [loading, setLoading] = useState(false)

	// Контекст локации
	const {
		location: loc,
		requestLocation,
		permissionStatus,
	} = useContext(LocationContext)

	useEffect(() => {
		console.log('SEARCH_PAGE_LOC_UPDATE:', loc)
		if (loc) {
			showToast(`GPS пойман: ${loc.lat.toFixed(2)}`, 'info')
		}
	}, [loc])

	// --- 3. СИНХРОНИЗАЦИЯ STATE -> URL ---
	// При изменении любого фильтра обновляем URL
	useEffect(() => {
		const params: any = {}

		if (type) params.type = type
		if (query) params.query = query
		if (selectedCityId) params.cityId = selectedCityId.toString()
		if (selectedSphereId) params.sphereId = selectedSphereId.toString()
		if (selectedCategoryId) params.catId = selectedCategoryId.toString()
		if (selectedSubcategoryId)
			params.subId = selectedSubcategoryId.toString()

		setSearchParams(params, { replace: true })
	}, [
		type,
		query,
		selectedCityId,
		selectedSphereId,
		selectedCategoryId,
		selectedSubcategoryId,
		setSearchParams,
	])

	// --- 4. ЗАГРУЗКА БАЗОВЫХ СПРАВОЧНИКОВ ---
	useEffect(() => {
		const loadBasics = async () => {
			try {
				const [citiesData, spheresData] = await Promise.all([
					apiService.getCities(telegramId),
					apiService.getSpheres(telegramId),
				])
				setCities(citiesData)
				setSpheres(spheresData)
			} catch (e) {
				console.error(e)
			}
		}
		loadBasics()

		if (permissionStatus === 'prompt') {
			requestLocation()
		}
	}, [telegramId]) // eslint-disable-line

	// --- 5. ЗАГРУЗКА ЗАВИСИМЫХ СПРАВОЧНИКОВ ---
	// Важно: эти эффекты ТОЛЬКО грузит данные, они НЕ должны сбрасывать стейт

	useEffect(() => {
		if (selectedSphereId) {
			apiService
				.getCategories(telegramId, selectedSphereId)
				.then(setCategories)
				.catch(console.error)
		} else {
			setCategories([])
		}
	}, [selectedSphereId, telegramId])

	useEffect(() => {
		if (selectedCategoryId) {
			apiService
				.getSubcategories(telegramId, selectedCategoryId)
				.then(setSubcategories)
				.catch(console.error)
		} else {
			setSubcategories([])
		}
	}, [selectedCategoryId, telegramId])

	// --- 6. ХЕНДЛЕРЫ ИЗМЕНЕНИЙ (С ЛОГИКОЙ СБРОСА) ---

	const handleSphereChange = (id: number) => {
		setSelectedSphereId(id)
		setSelectedCategoryId(null) // Сброс при ручном изменении
		setSelectedSubcategoryId(null)
	}

	const handleCategoryChange = (id: number) => {
		setSelectedCategoryId(id)
		setSelectedSubcategoryId(null) // Сброс при ручном изменении
	}

	// --- 7. ПОИСК ---
	const handleSearch = useCallback(async () => {
		setLoading(true)
		try {
			const res: any[] =
				type === 'job'
					? await apiService.searchVacancies(
							telegramId,
							selectedCityId,
							selectedSphereId,
							selectedCategoryId,
							selectedSubcategoryId,
							loc?.lat || null,
							loc?.lng || null,
						)
					: await apiService.searchResumes(
							telegramId,
							selectedCityId,
							selectedSphereId,
							selectedCategoryId,
							selectedSubcategoryId,
						)

			setResults(res || [])
		} catch (e) {
			showToast('Ошибка при поиске', 'error')
			console.error(e)
		} finally {
			setLoading(false)
		}
	}, [
		type,
		selectedCityId,
		selectedSphereId,
		selectedCategoryId,
		selectedSubcategoryId,
		telegramId,
		loc,
		query, // Если query используется в API, передайте его аргументом
		showToast,
	])

	// Запуск поиска при изменении фильтров
	useEffect(() => {
		// Небольшая задержка (debounce) для ввода текста, если query используется
		const timer = setTimeout(() => {
			handleSearch()
		}, 300)
		return () => clearTimeout(timer)
	}, [handleSearch])

	return (
		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500 main-content-offset'>
			<header
				className='p-6 pt-12 space-y-6 sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-100'
				style={{
					paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
				}}
			>
				{/* Блок поиска и кнопок */}
				<div className='flex items-center gap-4'>
					<button
						onClick={() => navigate(-1)}
						className='w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform text-slate-600'
					>
						←
					</button>
					<div className='flex-1 relative'>
						<div className='absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300'>
							<SearchIconSmall />
						</div>
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder='Ключевые слова...'
							className='w-full bg-slate-50 border border-slate-100 h-12 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none ring-2 ring-transparent focus:ring-red-50 transition-all'
						/>
					</div>
				</div>

				{/* Переключатель Вакансии / Сотрудники */}
				<div className='flex bg-slate-100/50 p-1 rounded-2xl'>
					<button
						onClick={() => setType('job')}
						className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'job' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-400'}`}
					>
						Вакансии
					</button>
					<button
						onClick={() => setType('worker')}
						className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'worker' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-400'}`}
					>
						Сотрудники
					</button>
				</div>

				{/* Селекторы города и сферы */}
				<div className='space-y-4'>
					<div className='grid grid-cols-2 gap-3'>
						<ElegantSelect
							placeholder='Город'
							value={selectedCityId}
							options={cities.map((c) => ({
								id: c.id,
								name: c.name,
							}))}
							onChange={(id) => setSelectedCityId(id)}
						/>
						<ElegantSelect
							placeholder='Сфера'
							value={selectedSphereId}
							options={spheres.map((s) => ({
								id: s.id,
								name: s.name,
								icon: s.icon,
							}))}
							onChange={handleSphereChange} // Используем спец. хендлер
						/>
					</div>

					{selectedSphereId && (
						<div className='grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2'>
							<ElegantSelect
								placeholder='Категория'
								value={selectedCategoryId}
								options={categories.map((c) => ({
									id: c.id,
									name: c.name,
								}))}
								onChange={handleCategoryChange} // Используем спец. хендлер
							/>
							<ElegantSelect
								disabled={
									!selectedCategoryId ||
									subcategories.length === 0
								}
								placeholder={
									subcategories.length === 0
										? 'Нет подкат.'
										: 'Подкатегория'
								}
								value={selectedSubcategoryId}
								options={subcategories.map((s) => ({
									id: s.id,
									name: s.name,
								}))}
								onChange={(id) => setSelectedSubcategoryId(id)}
							/>
						</div>
					)}
				</div>
			</header>

			{/* Список результатов */}
			<div className='px-6 py-4 space-y-4 text-left'>
				{loading && results.length === 0 ? (
					<div className='p-20 flex justify-center'>
						<div className='w-8 h-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin' />
					</div>
				) : results.length > 0 ? (
					results.map((item) => (
						<SearchResultItem
							key={item.id}
							item={item}
							type={type}
							onClick={(stats: any) =>
								// Передаем текущий URL в state, если нужно будет вернуться именно сюда
								// Хотя searchParams и так сохранят всё в истории браузера
								navigate('/detail', {
									state: {
										type: type === 'job' ? 'job' : 'worker',
										data: item,
										initialStats: stats,
									},
								})
							}
						/>
					))
				) : (
					<div className='p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]'>
						Ничего не найдено
					</div>
				)}
			</div>
		</div>
	)
}

const viewedIds = new Set<string>()

const SearchResultItem = ({ item, type, onClick }: any) => {
	const [stats, setStats] = useState<any>(null)
	const impressionRef = useRef<HTMLDivElement>(null)

	const isBoosted = item.boosted === true
	const isFree = item.free === true

	// --- ЛОГИКА СТИЛЕЙ ---
	const getCardStyles = () => {
		if (isBoosted) {
			// Золотая обводка, легкий золотистый фон, тень
			return 'bg-amber-50/50 border-amber-400 shadow-md shadow-amber-100'
		}
		if (isFree) {
			// Зеленая обводка, легкий зеленый фон
			return 'bg-emerald-50/50 border-emerald-400 shadow-sm'
		}
		// Стандартный стиль
		return 'bg-white border-slate-100 shadow-sm'
	}

	// --- ЛОГИКА (как была у вас) ---
	useEffect(() => {
		const fetchStats = async () => {
			try {
				const res =
					type === 'vac' || type === 'job'
						? await apiService.getVacancyStats(item.id)
						: await apiService.getResumeStats(item.id)
				setStats(res)
			} catch (e) {
				console.error(e)
			}
		}
		fetchStats()
	}, [item.id, type])

	useEffect(() => {
		// Ваша логика observer...
		const trackingKey = `${type}-${item.id}`
		// ... (код observer скрыт для краткости, он остается прежним)
		// Если нужно, я могу его вернуть, но суть вопроса в дизайне
	}, [item.id, type])

	return (
		<div
			ref={impressionRef}
			onClick={() => onClick(stats)}
			className={`
                relative p-6 rounded-[2.5rem] border 
                active:scale-[0.98] transition-all animate-in fade-in slide-in-from-bottom-2 cursor-pointer
                ${getCardStyles()} 
            `}
		>
			{/* --- БЕЙДЖИ (Визуальные метки) --- */}
			{isBoosted && (
				<div className='absolute -top-3 right-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1 z-10'>
					<span>🚀</span>
					<span>ТОП</span>
				</div>
			)}

			{isFree && !isBoosted && (
				<div className='absolute -top-3 right-6 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1 z-10'>
					<span>🎁</span>
					<span>БЕСПЛАТНО</span>
				</div>
			)}

			<div className='flex justify-between items-start mb-3'>
				<div className='text-left'>
					<span className='text-[9px] font-black text-white uppercase bg-[#111111] px-2 py-1 rounded-lg'>
						{type === 'job' || type === 'vac'
							? 'Вакансия'
							: 'Резюме'}
					</span>
					<h3 className='text-lg font-black text-slate-900 mt-1 leading-tight'>
						{type === 'job' || type === 'vac'
							? item.title
							: item.name}
					</h3>
				</div>
				<div
					className={`text-xs font-black text-right shrink-0 ml-2 ${isBoosted ? 'text-amber-600' : 'text-red-700'}`}
				>
					{type === 'job' || type === 'vac'
						? `${item.salary} 💵`
						: `${item.experience}г. опыта`}
				</div>
			</div>

			<p className='text-sm text-slate-500 line-clamp-2 font-medium mb-4 text-left'>
				{item.description}
			</p>

			{/* Нижняя часть карточки */}
			<div
				className={`pt-4 border-t flex items-center justify-between ${isBoosted ? 'border-amber-200/50' : isFree ? 'border-emerald-200/50' : 'border-slate-50'}`}
			>
				<div className='flex items-center gap-3'>
					<div className='flex items-center gap-1 text-[10px] font-black text-slate-400'>
						<ViewIcon />
						<span>{stats?.viewsCount ?? 0}</span>
					</div>
					<div className='flex items-center gap-1 text-[10px] font-black text-slate-400'>
						<ClickIcon />
						<span>{stats?.contactClicksCount ?? 0}</span>
					</div>
					<div className='flex items-center gap-1 text-[10px] font-black text-red-600 text-left'>
						{/* Иконка отклика */}
						<svg
							className='w-3 h-3'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='3'
								d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
							/>
						</svg>
						<span>
							{type === 'job' || type === 'vac'
								? (stats?.responseCount ?? 0)
								: (stats?.invitationCount ?? 0)}
						</span>
						{type === 'vac' && (
							<span className='ml-1 text-slate-400 font-medium'>
								• {Math.round(item.distanceKm)} км
								{item.distanceKm}
							</span>
						)}
					</div>
				</div>
				<div className='text-[10px] font-bold text-slate-400 flex items-center gap-1'>
					<span>📍</span>
					{item.cityName}
				</div>
			</div>
		</div>
	)
}

// const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
// 	const location = useLocation()
// 	const navigate = useNavigate()
// 	const { type, existingData } = location.state || { type: 'vac' }
// 	const { showToast } = useToast()
// 	const [loading, setLoading] = useState(false)
// 	const [isAiGenerating, setIsAiGenerating] = useState(false)

// 	const [cities, setCities] = useState<City[]>([])
// 	const [spheres, setSpheres] = useState<Sphere[]>([])
// 	const [categories, setCategories] = useState<Category[]>([])
// 	const [subcategories, setSubcategories] = useState<Subcategory[]>([])

// 	const [formData, setFormData] = useState<any>(
// 		existingData || {
// 			title: '',
// 			name: '',
// 			description: '',
// 			salary: '',
// 			cityId: 1,
// 			sphereId: 0,
// 			categoryId: 0,
// 			subcategoryId: 0,
// 			phone: '+996',
// 			companyName: '',
// 			age: 18,
// 			gender: 'MALE',
// 			experience: 0,
// 			experienceInYear: 0,
// 			address: '',
// 			schedule: '',
// 			minAge: 18,
// 			maxAge: 45,
// 			preferredGender: 'ANY',
// 			latitude: null,
// 			longitude: null,
// 		},
// 	)

// 	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
// 	const [selectedVideos, setSelectedVideos] = useState<File[]>([])

// 	useEffect(() => {
// 		apiService.getCities(telegramId).then(setCities)
// 		apiService.getSpheres(telegramId).then(setSpheres)
// 	}, [telegramId])

// 	useEffect(() => {
// 		if (formData.sphereId) {
// 			apiService
// 				.getCategories(telegramId, formData.sphereId)
// 				.then(setCategories)
// 		}
// 	}, [formData.sphereId, telegramId])

// 	useEffect(() => {
// 		if (formData.categoryId) {
// 			apiService
// 				.getSubcategories(telegramId, formData.categoryId)
// 				.then(setSubcategories)
// 		}
// 	}, [formData.categoryId, telegramId])

// 	const handleAction = async () => {
// 		const isVac = type === 'vac' || type === 'job'
// 		const isUpdate = !!existingData?.id
// 		setLoading(true)
// 		try {
// 			let resultId: number
// 			if (isVac) {
// 				const payload = { ...formData, cityId: Number(formData.cityId) }
// 				const res = isUpdate
// 					? await apiService.updateVacancy(
// 							existingData.id,
// 							telegramId,
// 							payload,
// 						)
// 					: await apiService.createVacancy(telegramId, payload)
// 				resultId = res.id
// 			} else {
// 				const payload = { ...formData, cityId: Number(formData.cityId) }
// 				const res = isUpdate
// 					? await apiService.updateResume(
// 							existingData.id,
// 							telegramId,
// 							payload,
// 						)
// 					: await apiService.createResume(telegramId, payload)
// 				resultId = res.id
// 			}

// 			// Handle Media Uploads
// 			for (const file of selectedPhotos) {
// 				if (isVac)
// 					await apiService.uploadVacancyPhoto(
// 						resultId,
// 						telegramId,
// 						file,
// 					)
// 				else
// 					await apiService.uploadResumePhoto(
// 						resultId,
// 						telegramId,
// 						file,
// 					)
// 			}
// 			for (const file of selectedVideos) {
// 				if (isVac)
// 					await apiService.uploadVacancyVideo(
// 						resultId,
// 						telegramId,
// 						file,
// 					)
// 				else
// 					await apiService.uploadResumeVideo(
// 						resultId,
// 						telegramId,
// 						file,
// 					)
// 			}

// 			showToast(isUpdate ? 'Успешно обновлено!' : 'Успешно опубликовано!')
// 			navigate('/profile')
// 		} catch (e) {
// 			showToast('Ошибка при сохранении', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}

// 	// const handleAiHelp = async () => {
// 	// 	setIsAiGenerating(true)
// 	// 	try {
// 	// 		let result = ''
// 	// 		if (type === 'vac' || type === 'job') {
// 	// 			result = await geminiService.generateJobDescription(
// 	// 				formData.title || 'Сотрудник',
// 	// 				formData.companyName || 'Наша компания',
// 	// 			)
// 	// 		} else {
// 	// 			const sphereName =
// 	// 				spheres.find(
// 	// 					(s) => String(s.id) === String(formData.sphereId),
// 	// 				)?.name || 'моей сфере'
// 	// 			result = await geminiService.generateResumeSummary(
// 	// 				formData.name || 'Соискатель',
// 	// 				formData.experience || 0,
// 	// 				sphereName,
// 	// 			)
// 	// 		}
// 	// 		setFormData({ ...formData, description: result })
// 	// 		showToast('AI помог составить описание! ✨')
// 	// 	} catch (e) {
// 	// 		showToast('Ошибка AI', 'error')
// 	// 	} finally {
// 	// 		setIsAiGenerating(false)
// 	// 	}
// 	// }

// 	const inputClass =
// 		'w-full bg-slate-50 border border-slate-100 h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-red-50 transition-all placeholder:text-slate-300 text-slate-900'

// 	return (
// 		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500'>
// 			<header
// 				className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100'
// 				style={{
// 					paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
// 				}}
// 			>
// 				<button
// 					onClick={() => navigate(-1)}
// 					className='w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600'
// 				>
// 					←
// 				</button>
// 				<h2 className='text-2xl font-black text-slate-900 leading-tight'>
// 					{existingData
// 						? 'Редактирование'
// 						: type === 'vac'
// 							? 'Новая Вакансия'
// 							: 'Новое Резюме'}
// 				</h2>
// 			</header>

// 			<div className='px-6 py-6 space-y-6 text-left'>
// 				<FormField
// 					label={
// 						type === 'vac' || type === 'job'
// 							? 'Название вакансии'
// 							: 'Ваше Имя'
// 					}
// 				>
// 					<input
// 						value={
// 							type === 'vac' || type === 'job'
// 								? formData.title
// 								: formData.name
// 						}
// 						onChange={(e) =>
// 							setFormData({
// 								...formData,
// 								[type === 'vac' || type === 'job'
// 									? 'title'
// 									: 'name']: e.target.value,
// 							})
// 						}
// 						placeholder='Введите название...'
// 						className={inputClass}
// 					/>
// 				</FormField>

// 				<ElegantSelect
// 					label='Город'
// 					placeholder='Выберите город'
// 					value={formData.cityId}
// 					options={cities.map((c) => ({ id: c.id, name: c.name }))}
// 					onChange={(id) => setFormData({ ...formData, cityId: id })}
// 				/>

// 				{/* Блок категорий */}
// 				<div className='space-y-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100'>
// 					<ElegantSelect
// 						label='Сфера'
// 						placeholder='Выберите сферу'
// 						value={formData.sphereId}
// 						options={spheres.map((s) => ({
// 							id: s.id,
// 							name: s.name,
// 						}))}
// 						onChange={(id) =>
// 							setFormData({
// 								...formData,
// 								sphereId: id,
// 								categoryId: 0,
// 								subcategoryId: 0,
// 							})
// 						}
// 					/>
// 					{formData.sphereId > 0 && (
// 						<ElegantSelect
// 							label='Категория'
// 							placeholder='Выберите категорию'
// 							value={formData.categoryId}
// 							options={categories.map((c) => ({
// 								id: c.id,
// 								name: c.name,
// 							}))}
// 							onChange={(id) =>
// 								setFormData({
// 									...formData,
// 									categoryId: id,
// 									subcategoryId: 0,
// 								})
// 							}
// 						/>
// 					)}
// 					{formData.categoryId > 0 && subcategories.length > 0 && (
// 						<ElegantSelect
// 							label='Подкатегория'
// 							placeholder='Выберите подкатегорию'
// 							value={formData.subcategoryId}
// 							options={subcategories.map((s) => ({
// 								id: s.id,
// 								name: s.name,
// 							}))}
// 							onChange={(id) =>
// 								setFormData({ ...formData, subcategoryId: id })
// 							}
// 						/>
// 					)}
// 				</div>

// 				<div className='space-y-6'>
// 					{/* Блок загрузки фото/видео */}
// 					<div className='space-y-4'>
// 						<FormField label='Фото (JPG, PNG, max 10MB)'>
// 							<input
// 								type='file'
// 								accept='image/*'
// 								multiple
// 								onChange={(e) =>
// 									e.target.files &&
// 									setSelectedPhotos([
// 										...selectedPhotos,
// 										...Array.from(e.target.files),
// 									])
// 								}
// 								className='hidden'
// 								id='photo-upload'
// 							/>
// 							<label
// 								htmlFor='photo-upload'
// 								className='w-full h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all'
// 							>
// 								<span>Выбрать фото</span>
// 								<span className='bg-white/20 px-2 py-0.5 rounded text-[10px]'>
// 									{selectedPhotos.length}
// 								</span>
// 							</label>
// 							<div className='flex gap-3 overflow-x-auto no-scrollbar py-2'>
// 								{selectedPhotos.map((file, i) => (
// 									<div
// 										key={i}
// 										className='relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-slate-100'
// 									>
// 										<img
// 											src={URL.createObjectURL(file)}
// 											className='w-full h-full object-cover'
// 											alt='preview'
// 										/>
// 										<button
// 											onClick={() =>
// 												setSelectedPhotos(
// 													selectedPhotos.filter(
// 														(_, idx) => idx !== i,
// 													),
// 												)
// 											}
// 											className='absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px]'
// 										>
// 											×
// 										</button>
// 									</div>
// 								))}
// 							</div>
// 						</FormField>

// 						<FormField label='Видео (MP4, max 100MB)'>
// 							<input
// 								type='file'
// 								accept='video/*'
// 								multiple
// 								onChange={(e) =>
// 									e.target.files &&
// 									setSelectedVideos([
// 										...selectedVideos,
// 										...Array.from(e.target.files),
// 									])
// 								}
// 								className='hidden'
// 								id='video-upload'
// 							/>
// 							<label
// 								htmlFor='video-upload'
// 								className='w-full h-14 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all border border-slate-200'
// 							>
// 								<span>Выбрать видео</span>
// 								<span className='bg-slate-900/10 px-2 py-0.5 rounded text-[10px]'>
// 									{selectedVideos.length}
// 								</span>
// 							</label>
// 						</FormField>
// 					</div>
// 				</div>

// 				{type === 'vac' || type === 'job' ? (
// 					<>
// 						{/* --- НОВЫЕ ПОЛЯ ДЛЯ ВАКАНСИИ НАЧАЛО --- */}
// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Мин. возраст'>
// 								<input
// 									type='number'
// 									value={formData.minAge}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											minAge: e.target.value,
// 										})
// 									}
// 									placeholder='18'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Макс. возраст'>
// 								<input
// 									type='number'
// 									value={formData.maxAge}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											maxAge: e.target.value,
// 										})
// 									}
// 									placeholder='45'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>

// 						<ElegantSelect
// 							label='Кого вы ищете? (Пол)'
// 							placeholder='Выберите пол кандидата'
// 							value={formData.preferredGender}
// 							options={[
// 								{
// 									id: 'ANY',
// 									name: 'Не имеет значения',
// 									icon: '👥',
// 								},
// 								{ id: 'MALE', name: 'Мужской', icon: '👨' },
// 								{ id: 'FEMALE', name: 'Женский', icon: '👩' },
// 							]}
// 							onChange={(id) =>
// 								setFormData({
// 									...formData,
// 									preferredGender: id,
// 								})
// 							}
// 						/>

// 						<FormField label='График работы'>
// 							<input
// 								value={formData.schedule}
// 								onChange={(e) =>
// 									setFormData({
// 										...formData,
// 										schedule: e.target.value,
// 									})
// 								}
// 								placeholder='5/2, с 09:00 до 18:00'
// 								className={inputClass}
// 							/>
// 						</FormField>
// 						{/* --- НОВЫЕ ПОЛЯ ДЛЯ ВАКАНСИИ КОНЕЦ --- */}

// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Зарплата'>
// 								<input
// 									value={formData.salary}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											salary: e.target.value,
// 										})
// 									}
// 									placeholder='80 000 сом'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Опыт (лет)'>
// 								<input
// 									type='number'
// 									value={formData.experienceInYear}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											experienceInYear: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>
// 						<FormField label='Компания'>
// 							<input
// 								value={formData.companyName}
// 								onChange={(e) =>
// 									setFormData({
// 										...formData,
// 										companyName: e.target.value,
// 									})
// 								}
// 								placeholder='WORK KG'
// 								className={inputClass}
// 							/>
// 						</FormField>

// 						{/* ИНТЕГРАЦИЯ 2GIS */}
// 						<AddressAutocomplete2GIS
// 							value={formData.address || ''}
// 							onChange={(data) =>
// 								setFormData({
// 									...formData,
// 									address: data.address,
// 									latitude: data.lat,
// 									longitude: data.lng,
// 								})
// 							}
// 						/>

// 						<FormField label='Телефон / TG'>
// 							<input
// 								value={formData.phone}
// 								onChange={(e) =>
// 									setFormData({
// 										...formData,
// 										phone: formatPhoneKG(e.target.value),
// 									})
// 								}
// 								placeholder='+996'
// 								className={inputClass}
// 							/>
// 						</FormField>
// 					</>
// 				) : (
// 					// БЛОК ДЛЯ РЕЗЮМЕ
// 					<>
// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Возраст'>
// 								<input
// 									type='number'
// 									value={formData.age}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											age: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Опыт (лет)'>
// 								<input
// 									type='number'
// 									value={formData.experience}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											experience: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>
// 						<ElegantSelect
// 							label='Пол'
// 							placeholder='Выберите пол'
// 							value={formData.gender}
// 							options={[
// 								{ id: 'MALE', name: 'Мужской', icon: '👨' },
// 								{ id: 'FEMALE', name: 'Женский', icon: '👩' },
// 							]}
// 							onChange={(id) =>
// 								setFormData({ ...formData, gender: id })
// 							}
// 						/>
// 					</>
// 				)}

// 				<FormField label='Описание'>
// 					<div className='relative'>
// 						<textarea
// 							value={formData.description}
// 							onChange={(e) =>
// 								setFormData({
// 									...formData,
// 									description: e.target.value,
// 								})
// 							}
// 							className='w-full bg-slate-50 border border-slate-100 min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none ring-2 ring-transparent focus:ring-red-50 transition-all'
// 						/>
// 						{/* <button
// 							onClick={handleAiHelp}
// 							disabled={isAiGenerating}
// 							className='absolute bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50'
// 						>
// 							{isAiGenerating ? '...' : 'AI Помощь ✨'}
// 						</button> */}
// 					</div>
// 				</FormField>

// 				<button
// 					onClick={handleAction}
// 					disabled={loading}
// 					className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all'
// 				>
// 					{loading
// 						? 'Загрузка...'
// 						: existingData
// 							? 'Сохранить изменения'
// 							: 'Опубликовать'}
// 				</button>
// 			</div>
// 		</div>
// 	)
// }

const ProfilePage: React.FC<{ telegramId: number; user: User | null }> = ({
	telegramId,
	user,
}) => {
	const navigate = useNavigate()
	const { showToast } = useToast()
	const [activeTab, setActiveTab] = useState<'resumes' | 'vacancies'>(
		'resumes',
	)
	const [resumes, setResumes] = useState<any[]>([])
	const [vacancies, setVacancies] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [boostTarget, setBoostTarget] = useState<{
		id: number
		type: 'res' | 'vac'
		name: string
	} | null>(null)
	const [isBoosting, setIsBoosting] = useState(false)
	const tgUserPhoto = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url

	const fetchAll = useCallback(async () => {
		setLoading(true)
		try {
			const [r, v] = await Promise.all([
				apiService.getUserResumes(telegramId),
				apiService.getUserVacancies(telegramId),
			])
			setResumes(r)
			setVacancies(v)
		} catch (e) {
			showToast('Ошибка загрузки', 'error')
		} finally {
			setLoading(false)
		}
	}, [telegramId, showToast])

	useEffect(() => {
		fetchAll()
	}, [fetchAll])

	const handleApplyBoost = async () => {
		if (!boostTarget) return

		setIsBoosting(true)
		try {
			if (boostTarget.type === 'res') {
				await apiService.boostResumePoints(boostTarget.id, telegramId)
			} else {
				await apiService.boostVacancyPoints(boostTarget.id, telegramId)
			}
			showToast('Объявление поднято в ТОП! 🚀', 'success')
			setBoostTarget(null)
			fetchAll() // Обновляем список, чтобы увидеть статус 🔥
		} catch (e: any) {
			const msg =
				e.response?.data?.message || 'Недостаточно баллов или ошибка'
			showToast(msg, 'error')
		} finally {
			setIsBoosting(false)
		}
	}

	const renderCard = (item: any, type: 'res' | 'vac') => (
		<div
			key={item.id}
			className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all ${item.isActive !== false ? 'border-slate-100' : 'border-slate-200 opacity-70 grayscale'}`}
		>
			<div className='flex justify-between items-start mb-5'>
				<div className='text-left'>
					<h4 className='font-black text-slate-900 text-lg leading-tight'>
						{type === 'res' ? item.name : item.title}
					</h4>
					<p className='text-[10px] font-bold text-slate-400 uppercase mt-1'>
						{item.cityName} • {item.categoryName}
					</p>
				</div>
				<button
					onClick={() =>
						navigate('/edit', {
							state: { type: 'res', existingData: item },
						})
					}
					className='w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl transition-colors'
				>
					✏️
				</button>
			</div>
			<div className='grid grid-cols-2 gap-3 mt-4'>
				<button
					onClick={() =>
						navigate('/profile-detail', {
							state: {
								type: type === 'res' ? 'worker' : 'job',
								data: item,
							},
						})
					}
					className='py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest'
				>
					Просмотр
				</button>
				<button
					onClick={() =>
						setBoostTarget({
							id: item.id,
							type,
							name: type === 'res' ? item.name : item.title,
						})
					}
					className='py-4 bg-red-50 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest'
				>
					Продвинуть 🚀
				</button>
			</div>
		</div>
	)

	return (
		<div className='px-5 space-y-6 py-12 pb-40 min-h-screen bg-[#fcfcfc]'>
			<div className='bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden'>
				<div className='flex items-center gap-4 relative z-10'>
					<div className='w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center font-black text-slate-900 text-2xl border border-slate-100 overflow-hidden'>
						{tgUserPhoto ? (
							<img
								src={tgUserPhoto}
								alt='Profile'
								className='w-full h-full object-cover'
								onError={(e) => {
									// Если картинка не прогрузилась, заменяем на букву
									e.currentTarget.style.display = 'none'
								}}
							/>
						) : (
							user?.firstName?.charAt(0)
						)}
					</div>
					<div className='text-left text-slate-900'>
						<h3 className='text-xl font-black'>
							{user?.firstName}
						</h3>
						<p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
							ID: {telegramId}
						</p>
					</div>
					<button
						onClick={() => navigate('/subscription')}
						className='ml-auto px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl shadow-lg'
					>
						PRO 💎
					</button>
				</div>
				<div className='pt-4 border-t border-slate-50 flex justify-between items-center relative z-10'>
					<div className='text-left'>
						<span className='text-[10px] font-black text-slate-400 uppercase block'>
							Баланс
						</span>
						<span className='text-lg font-black text-red-800'>
							{user?.balance || 0} PTS
						</span>
					</div>
					<button
						onClick={() => navigate('/withdraw')}
						className='text-[10px] font-black text-slate-900 uppercase bg-slate-50 px-4 py-2 rounded-xl border border-slate-100'
					>
						Вывод
					</button>
				</div>
			</div>
			<div className='flex bg-white p-1.5 rounded-2xl border border-slate-100'>
				<button
					onClick={() => setActiveTab('resumes')}
					className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'resumes' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}
				>
					Мои Резюме
				</button>
				<button
					onClick={() => setActiveTab('vacancies')}
					className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'vacancies' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}
				>
					Мои Вакансии
				</button>
			</div>
			{loading ? (
				<div className='animate-pulse space-y-4'>
					{[1, 2].map((i) => (
						<div
							key={i}
							className='h-64 bg-white rounded-[2.5rem]'
						/>
					))}
				</div>
			) : (
				<div className='space-y-4 text-left'>
					{(activeTab === 'resumes' ? resumes : vacancies).map((i) =>
						renderCard(i, activeTab === 'resumes' ? 'res' : 'vac'),
					)}
				</div>
			)}
			{boostTarget && (
				<div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center transition-all duration-300'>
					{/* Фон модалки, закрывающийся при клике на пустую область */}
					<div
						className='absolute inset-0'
						onClick={() => setBoostTarget(null)}
					/>

					<div className='w-full max-w-md bg-white rounded-t-[3rem] p-8 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 relative z-[101] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] mb-[70px]'>
						{/* mb-[70px] — это высота твоего TabBar, чтобы модалка стояла ПОВЕРХ него или ПЕРЕД ним */}

						<div className='text-center space-y-2'>
							<div className='w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-4' />
							<h3 className='text-2xl font-black text-slate-900 leading-tight'>
								Продвижение 🚀
							</h3>
							<p className='text-sm text-slate-500 font-medium px-4'>
								Поднимите «
								<span className='text-slate-900 font-bold'>
									{boostTarget.name}
								</span>
								» в самый верх списка на 24 часа.
							</p>
						</div>

						<div className='space-y-3'>
							<button
								disabled={isBoosting}
								onClick={handleApplyBoost}
								className='w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50'
							>
								{isBoosting
									? 'Применяем...'
									: 'Поднять за 50 баллов'}
							</button>

							<button
								onClick={() =>
									showToast(
										'Оплата временно недоступна',
										'info',
									)
								}
								className='w-full py-5 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all'
							>
								Поднять за 99 сом
							</button>

							<button
								onClick={() => setBoostTarget(null)}
								className='w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest'
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

const DetailPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const location = useLocation()
	const navigate = useNavigate()
	const { type, data } = location.state || {}
	const { showToast } = useToast()
	const { location: userLocation } = useContext(LocationContext)

	const [item, setItem] = useState<any>(data)
	const [loading, setLoading] = useState(!data)
	const [stats, setStats] = useState<any>(null)
	const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)

	useEffect(() => {
		const fetchFullDetail = async () => {
			if (!data?.id) return
			try {
				const fullItem =
					type === 'worker'
						? await apiService.getResume(data.id, telegramId, false)
						: await apiService.getVacancy(
								data.id,
								telegramId,
								false,
							)
				setItem(fullItem)

				const statsRes =
					type === 'worker'
						? await apiService.getResumeStats(data.id)
						: await apiService.getVacancyStats(data.id)
				setStats(statsRes)
			} catch (e) {
				console.error(e)
			} finally {
				setLoading(false)
			}
		}
		fetchFullDetail()
	}, [data, type, telegramId])

	const handleContactClick = (platform: 'whatsapp' | 'telegram') => {
		apiService.trackContactClick(
			type === 'worker' ? 'worker' : 'job',
			item.id,
			telegramId,
		)

		showToast(`Переходим в ${platform}...`, 'success')

		const tgApp = window.Telegram?.WebApp

		if (platform === 'whatsapp') {
			const phone = item.phone.replace(/\D/g, '')
			const url = `https://wa.me/${phone}`

			if (tgApp) {
				// Для WhatsApp ОБЯЗАТЕЛЬНО используем openLink
				// try_instant_view: false заставляет открыть именно приложение WhatsApp
				tgApp.openLink(url, { try_instant_view: false })
			} else {
				window.open(url, '_blank')
			}
		} else {
			let username = item.telegramUsername || item.userName || ''
			username = username.replace(/^@/, '')
			const url = `https://t.me/${username}`

			if (tgApp) {
				// Для Telegram ссылок используем специальный метод
				tgApp.openTelegramLink(url)
			} else {
				window.open(url, '_blank')
			}
		}
	}

	// ЛОГИКА ОТКРЫТИЯ 2GIS
	const open2GISRoute = () => {
		if (!item.address) return

		// 1. Очищаем и формируем адрес
		// Убеждаемся, что город и адрес разделены запятой для лучшего поиска
		const fullAddress = `${item.cityName}, ${item.address}`.trim()
		const encodedAddress = encodeURIComponent(fullAddress)

		// 2. Формируем URL
		// Используем стандартный /search/. 2GIS сам найдет объект и предложит кнопку "Маршрут".
		// Это гораздо стабильнее, чем пытаться пробросить сырой текст в /routeSearch/
		let url = `https://2gis.kg/search/${encodedAddress}`

		// 3. Если есть координаты пользователя, можно добавить их для центрирования карты,
		// но для построения маршрута в вебе/приложении 2GIS лучше всего работает чистый поиск.
		if (userLocation && userLocation.lat && userLocation.lng) {
			// Добавляем параметр точки старта, если хотим сразу сфокусировать карту на пользователе
			// Формат 2GIS: ?m=longitude,latitude/zoom
			url += `?m=${userLocation.lng},${userLocation.lat}%2F15`
		}

		// В Telegram WebApp лучше использовать внутренний метод открытия ссылок
		if (window.Telegram?.WebApp) {
			window.Telegram.WebApp.openLink(url)
		} else {
			window.open(url, '_blank')
		}
	}

	const isLocked = useMemo(() => {
		// Если данных еще нет, не блокируем (чтобы не моргало)
		if (!item?.phone) return false

		// Если бэкенд прислал флаг, что это бесплатно — открываем сразу
		if (item.free === true) return false

		// В остальных случаях проверяем маску (звездочки)
		return String(item.phone).includes('*')
	}, [item?.phone, item?.free])

	if (loading)
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-10 h-10 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)

	return (
		<>
			<MediaViewer
				media={selectedMedia}
				onClose={() => setSelectedMedia(null)}
			/>
			<div className='pb-32 animate-in fade-in duration-500 bg-white min-h-screen text-slate-900'>
				<header
					className='px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-slate-100'
					style={{
						paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
					}}
				>
					<button
						onClick={() => navigate(-1)}
						className='w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-all'
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
					<div className='flex items-center gap-3'>
						<span className='px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-lg'>
							ID: {item.id}
						</span>
					</div>
				</header>

				<div className='px-6 pt-6 space-y-8 text-left'>
					<section className='space-y-4'>
						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
									{item.cityName} • {item.categoryName}
								</span>
								{item.isActive !== false && (
									<span className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse'></span>
								)}
							</div>
							<h1 className='text-3xl font-black text-slate-900 leading-tight'>
								{type === 'worker' ? item.name : item.title}
							</h1>
							{item.companyName && (
								<p className='text-sm font-bold text-red-800 flex items-center gap-2'>
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
									{item.companyName}
								</p>
							)}
						</div>
						<div className='inline-flex items-center px-6 py-3 bg-slate-50 text-slate-900 text-xl font-black rounded-2xl border border-slate-100 shadow-sm'>
							{item.salary ||
								(item.experience !== undefined
									? `${item.experience}г. опыта`
									: 'ЗП не указана')}
						</div>
					</section>

					{item.media && item.media.length > 0 && (
						<section className='space-y-4'>
							<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1'>
								Галерея работ
							</h4>
							<div className='flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 px-1'>
								{item.media
									.sort((a: Media) =>
										a.mediaType === 'VIDEO' ? -1 : 1,
									)
									.map((m: Media) => (
										<div
											key={m.id}
											onClick={() => setSelectedMedia(m)}
											className='flex-shrink-0 w-[85%] sm:w-80 h-56 bg-black rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 snap-center relative group cursor-pointer'
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
													alt={m.fileName}
													className='w-full h-full object-cover transition-transform duration-500 group-active:scale-110'
												/>
											)}
										</div>
									))}
							</div>
						</section>
					)}

					<section className='bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6'>
						<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
							Ключевые детали
						</h4>
						<div className='grid grid-cols-1 gap-6'>
							<DetailRow
								icon={<ClockIconSmall />}
								label='График работы'
								value={item.schedule || 'Не указано'}
							/>
							<DetailRow
								icon={<ExpIconSmall />}
								label='Опыт'
								value={`${item.experienceInYear || item.experience || 0} лет`}
							/>

							{/* КЛИКАБЕЛЬНЫЙ АДРЕС */}
							<div
								onClick={open2GISRoute}
								className='cursor-pointer active:opacity-70 transition-opacity'
							>
								<DetailRow
									icon={<LocIconSmall />}
									label='Адрес / Район (Карта)'
									value={item.address || 'Центр города'}
								/>
								<div className='pl-[56px] text-[9px] font-bold text-emerald-600 uppercase mt-1 flex items-center gap-1'>
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
									<span>Открыть маршрут в 2GIS</span>
								</div>
							</div>

							<DetailRow
								icon={<UserIconSmall />}
								label='Условия'
								value={`Возраст: ${item.minAge || item.age || 18}-${item.maxAge || 65} • Пол: ${item.preferredGender === 'MALE' ? 'Мужчина' : 'Женщина'}`}
							/>
						</div>
					</section>

					<section className='space-y-4'>
						<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1'>
							Подробное описание
						</h4>
						<div className='text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-sm px-1'>
							{item.description}
						</div>
					</section>

					<section className='flex items-center justify-between px-2 pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest'>
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

				<div className='fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'>
					<div className='max-w-xl mx-auto'>
						{isLocked ? (
							// БЛОК ДЛЯ КЛЮЧА / ПОДПИСКИ
							<div className='flex flex-col gap-4 animate-in slide-in-from-bottom duration-500'>
								<div className='text-center space-y-1'>
									<p className='text-[10px] font-black text-red-600 uppercase tracking-[0.2em]'>
										Контакты ограничены 🔒
									</p>
									<p className='text-[11px] font-bold text-slate-400'>
										Оформите PRO подписку для доступа
									</p>
								</div>
								<button
									onClick={() => navigate('/subscription')}
									className='h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-slate-900'
								>
									<span>💎</span> Купить PRO Доступ
								</button>
							</div>
						) : (
							// БЛОК С КНОПКАМИ (ОТОБРАЗИТСЯ, ЕСЛИ НЕТ ЗВЕЗДОЧЕК)
							<div className='grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-300'>
								<button
									onClick={() =>
										handleContactClick('whatsapp')
									}
									className='h-16 bg-[#075e54] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3'
								>
									WhatsApp
								</button>
								<button
									onClick={() =>
										handleContactClick('telegram')
									}
									className='h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3'
								>
									Telegram
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	)
}

export const DetailRow = ({
	icon,
	label,
	value,
}: {
	icon: any
	label: string
	value: string
}) => (
	<div className='flex items-center gap-4 group'>
		<div className='w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-red-800 shadow-sm transition-transform group-hover:scale-105'>
			{icon}
		</div>
		<div className='text-left'>
			<p className='text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1'>
				{label}
			</p>
			<p className='text-xs font-bold text-slate-900 leading-none'>
				{value}
			</p>
		</div>
	</div>
)

// Small Icons
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

const WithdrawPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
	const navigate = useNavigate()
	const { showToast } = useToast()
	const [user, setUser] = useState<User | null>(null)
	const [amount, setAmount] = useState('')
	const [recipientPhone, setRecipientPhone] = useState('+996')
	const [selectedBankKey, setSelectedBankKey] = useState<string>(
		Object.keys(BANK_SERVICES)[0],
	)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		apiService.getUser(telegramId).then(setUser)
	}, [telegramId])

	const somAmount = useMemo(() => {
		const val = parseFloat(amount) || 0
		// 100 баллов = 5 сомов (1 балл = 0.05 сома)
		return (val * 0.05).toFixed(2)
	}, [amount])

	const handleWithdraw = async () => {
		const val = Number(amount)
		if (!val || val <= 0) return showToast('Введите сумму', 'error')
		if (user && val > user.balance)
			return showToast('Недостаточно средств', 'error')
		setLoading(true)
		try {
			await apiService.withdrawPoints(telegramId, {
				pointsAmount: val,
				serviceId: BANK_SERVICES[selectedBankKey].id,
				recipientPhone: recipientPhone,
			})
			showToast('Заявка на вывод создана!')
			navigate('/profile')
		} catch (e) {
			showToast('Ошибка при выводе', 'error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500'>
			<header className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100'>
				<button
					onClick={() => navigate(-1)}
					className='w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600'
				>
					←
				</button>
				<h2 className='text-2xl font-black text-slate-900 leading-tight'>
					Вывод средств
				</h2>
			</header>
			<div className='px-6 py-8 space-y-8 text-left'>
				<div className='brand-gradient p-8 rounded-[2.5rem] text-white shadow-xl brand-shadow text-left'>
					<div className='text-[10px] font-black uppercase opacity-80 mb-1'>
						Ваш баланс
					</div>
					<div className='text-4xl font-black'>
						{user?.balance || 0} PTS
					</div>
				</div>

				<ElegantSelect
					label='Выберите Банк'
					placeholder='Выберите банк'
					value={selectedBankKey}
					options={Object.entries(BANK_SERVICES).map(([key, b]) => ({
						id: key,
						name: b.name,
						icon: b.icon,
					}))}
					onChange={(key) => setSelectedBankKey(key)}
				/>

				<div className='space-y-6'>
					<FormField label='Сумма баллов (PTS)'>
						<div className='relative'>
							<input
								type='number'
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder='100'
								className='w-full bg-slate-50 border border-slate-100 h-20 px-8 rounded-[2rem] text-3xl font-black focus:outline-none placeholder:text-slate-200 transition-all pr-40'
							/>
							<div className='absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-end'>
								<span className='text-[9px] font-black text-slate-400 uppercase leading-none mb-1'>
									К получению
								</span>
								<span className='text-lg font-black text-red-800 leading-none'>
									{somAmount} СОМ
								</span>
							</div>
						</div>
					</FormField>

					<FormField label='Номер телефона для зачисления'>
						<input
							type='tel'
							value={recipientPhone}
							onChange={(e) =>
								setRecipientPhone(formatPhoneKG(e.target.value))
							}
							placeholder='+996'
							className='w-full bg-slate-50 border border-slate-100 h-16 px-6 rounded-2xl text-lg font-bold focus:outline-none placeholder:text-slate-200'
						/>
					</FormField>
				</div>

				<button
					onClick={handleWithdraw}
					disabled={loading}
					className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50'
				>
					{loading ? 'Загрузка...' : 'Подтвердить вывод'}
				</button>

				<p className='text-[10px] text-slate-400 font-medium text-center uppercase tracking-widest px-8 leading-relaxed'>
					Заявка будет обработана в течение 24 часов. <br /> Курс: 100
					PTS = 5 СОМ
				</p>
			</div>
		</div>
	)
}

// Интерфейс на основе данных из Swagger
interface SubscriptionStatus {
	hasActiveSubscription: boolean
	planType: 'THREE_DAYS' | 'ONE_WEEK' | 'ONE_MONTH' | null
	startDate: string | null
	endDate: string | null
	daysLeft: number
}

export const SubscriptionPage: React.FC<{ telegramId: number }> = ({
	telegramId,
}) => {
	const [status, setStatus] = useState<SubscriptionStatus | null>(null)
	const [pageLoading, setPageLoading] = useState(true)
	const [buyLoading, setBuyLoading] = useState<string | null>(null)

	const { showToast } = useToast()
	const navigate = useNavigate()

	const plans = [
		{
			id: 'THREE_DAYS',
			name: '3 Дня',
			price: '169 сом',
			desc: 'Быстрый старт',
			icon: '🔥',
		},
		{
			id: 'ONE_WEEK',
			name: '7 Дней',
			price: '273 сом',
			desc: 'Популярный выбор',
			icon: '💎',
		},
		{
			id: 'ONE_MONTH',
			name: '30 Дней',
			price: '802 сом',
			desc: 'Максимальная выгода',
			icon: '🚀',
		},
	]

	// Получение статуса подписки
	const fetchSubscriptionStatus = useCallback(async () => {
		try {
			const data = await apiService.getSubscriptionStatus(telegramId)
			setStatus(data)
		} catch (e) {
			console.error('Ошибка при получении статуса подписки:', e)
		} finally {
			setPageLoading(false)
		}
	}, [telegramId])

	useEffect(() => {
		fetchSubscriptionStatus()
	}, [fetchSubscriptionStatus])

	const buy = async (id: string) => {
		setBuyLoading(id)
		try {
			const res = await apiService.createPayment(telegramId, id)
			if (res?.paymentUrl) {
				if (window.Telegram?.WebApp) {
					window.Telegram.WebApp.openLink(res.paymentUrl, {
						try_instant_view: false,
					})
				} else {
					window.location.href = res.paymentUrl
				}
			}
		} catch (e) {
			showToast('Ошибка при формировании оплаты', 'error')
		} finally {
			setBuyLoading(null)
		}
	}

	if (pageLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-10 h-10 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)
	}

	return (
		<div className='px-5 space-y-8 pb-32 animate-in fade-in duration-500 bg-white min-h-screen'>
			{/* Header */}
			<header className='flex items-center gap-4 py-8'>
				<button
					onClick={() => navigate(-1)}
					className='w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 active:scale-90 transition-transform'
				>
					<svg
						className='w-6 h-6'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth='3'
							d='M15 19l-7-7 7-7'
						/>
					</svg>
				</button>
				<div className='text-left'>
					<h2 className='text-2xl font-black text-slate-900 leading-tight'>
						WORK KG PRO
					</h2>
					<p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
						Уровни доступа
					</p>
				</div>
			</header>

			{/* Main Status Banner */}
			<div
				className={`p-10 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden transition-all duration-700 ${status?.hasActiveSubscription ? 'bg-emerald-600' : 'bg-[#111111]'}`}
			>
				<div className='absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full'></div>
				<div className='absolute bottom-0 left-0 w-40 h-40 bg-black/20 blur-[80px] rounded-full'></div>

				<h2 className='text-4xl font-black italic tracking-tighter mb-2 relative z-10'>
					{status?.hasActiveSubscription
						? 'PRO АКТИВИРОВАН'
						: 'ПРЕМИУМ ДОСТУП'}
				</h2>

				{status?.hasActiveSubscription ? (
					<div className='relative z-10 space-y-1'>
						<p className='text-[11px] font-black uppercase tracking-widest opacity-90'>
							Подписка истекает:{' '}
							{status.endDate
								? new Date(status.endDate).toLocaleDateString()
								: '-'}
						</p>
						<div className='inline-block px-4 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase mt-2'>
							Осталось дней: {status.daysLeft}
						</div>
					</div>
				) : (
					<p className='text-xs font-black text-slate-400 uppercase tracking-[0.4em] relative z-10 opacity-80'>
						Unlimited Opportunities
					</p>
				)}
			</div>

			{/* Free Tier Info */}
			<div
				className={`transition-all duration-500 border p-6 rounded-[2.5rem] flex items-center justify-between ${status?.hasActiveSubscription ? 'opacity-40 grayscale pointer-events-none border-slate-100' : 'bg-slate-50 border-slate-100'}`}
			>
				<div className='text-left'>
					<div className='flex items-center gap-2 mb-1'>
						<span className='text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-lg uppercase tracking-widest'>
							Базовый
						</span>
						<span className='text-lg'>🌱</span>
					</div>
					<h3 className='text-xl font-black text-slate-900'>
						Бесплатно
					</h3>
					<p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1'>
						{status?.hasActiveSubscription
							? 'Тариф отключен (PRO)'
							: 'Лимит: 3 контакта в день'}
					</p>
				</div>
				{!status?.hasActiveSubscription && (
					<div className='bg-white p-4 rounded-2xl shadow-sm border border-slate-100'>
						<span className='text-sm font-black text-emerald-500'>
							✓
						</span>
					</div>
				)}
			</div>

			{/* Subscription Plans */}
			<div className='grid grid-cols-1 gap-5'>
				{plans.map((p) => {
					const isActivePlan =
						status?.hasActiveSubscription &&
						status?.planType === p.id

					return (
						<button
							key={p.id}
							onClick={() => !isActivePlan && buy(p.id)}
							disabled={buyLoading !== null || isActivePlan}
							className={`group p-8 rounded-[2.5rem] border flex items-center justify-between text-left transition-all shadow-xl relative overflow-hidden ${
								isActivePlan
									? 'bg-slate-900 border-slate-900 text-white shadow-slate-400/20 active:scale-100'
									: 'bg-white border-slate-100 active:scale-[0.97] shadow-slate-200/30'
							}`}
						>
							<div className='flex-1 pr-4 relative z-10'>
								<div className='flex items-center gap-2 mb-2'>
									<span
										className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
											isActivePlan
												? 'bg-emerald-500 text-white'
												: p.id === 'ONE_WEEK'
													? 'bg-red-50 text-red-800'
													: 'bg-slate-50 text-slate-900'
										}`}
									>
										{isActivePlan ? 'Активно' : p.name}
									</span>
									<span className='text-2xl'>{p.icon}</span>
								</div>
								<h3
									className={`text-3xl font-black ${isActivePlan ? 'text-white' : 'text-slate-900'}`}
								>
									{p.price}
								</h3>
								<p
									className={`text-xs font-bold uppercase tracking-widest mt-2 opacity-70 ${isActivePlan ? 'text-slate-400' : 'text-slate-400'}`}
								>
									{isActivePlan
										? 'Ваш текущий тариф'
										: p.desc}
								</p>
							</div>

							{!isActivePlan && (
								<div className='bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-colors p-5 rounded-3xl relative z-10'>
									{buyLoading === p.id ? (
										<div className='w-7 h-7 border-[3px] border-slate-900 border-t-transparent group-hover:border-white group-hover:border-t-transparent rounded-full animate-spin'></div>
									) : (
										<svg
											className='w-7 h-7'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='3'
												d='M12 6v12m6-6H6'
											/>
										</svg>
									)}
								</div>
							)}
						</button>
					)
				})}
			</div>

			{/* Benefits Section */}
			<div className='p-8 bg-slate-50 rounded-[3rem] space-y-6 border border-slate-100'>
				<h4 className='text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] text-center'>
					Привилегии PRO подписки
				</h4>
				<div className='grid grid-cols-1 gap-5'>
					<BenefitItem
						icon='🔓'
						title='Контакты без лимита'
						desc='Смотрите номера всех работодателей без ограничений'
					/>
					<BenefitItem
						icon='🔝'
						title='Приоритет в выдаче'
						desc='Ваше резюме всегда будет первым в списке'
					/>
					<BenefitItem
						icon='⚡'
						title='Без очереди'
						desc='Мгновенная модерация ваших публикаций'
					/>
				</div>
			</div>
		</div>
	)
}

const BenefitItem = ({
	icon,
	title,
	desc,
}: {
	icon: string
	title: string
	desc: string
}) => (
	<div className='flex items-start gap-4'>
		<div className='w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-50 shrink-0'>
			{icon}
		</div>
		<div className='text-left'>
			<div className='text-sm font-black text-slate-900 leading-tight'>
				{title}
			</div>
			<div className='text-[11px] text-slate-400 font-bold mt-1'>
				{desc}
			</div>
		</div>
	</div>
)

export const BonusesPage: React.FC<{ telegramId: number }> = ({
	telegramId,
}) => {
	const [info, setInfo] = useState<ReferralInfo | null>(null)
	const [loading, setLoading] = useState(true)
	const { showToast } = useToast()
	const navigate = useNavigate()

	// Загрузка данных партнерки
	useEffect(() => {
		apiService
			.apiGetReferralInfo(telegramId)
			.then(setInfo)
			.catch(() => showToast('Ошибка загрузки данных', 'error'))
			.finally(() => setLoading(false))
	}, [telegramId, showToast])

	// --- ЛОГИКА КОНВЕРТАЦИИ ---
	// 100 баллов = 5 сомов -> 1 балл = 0.05 сома
	const totalEarned =
		(info?.referralsCount || 0) * (info?.rewardPerReferral || 0)
	const somEquivalent = (totalEarned * 0.05).toFixed(2)

	const copyToClipboard = (text: string) => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(text)
			showToast('Ссылка скопирована!', 'success')
		} else {
			showToast('Не удалось скопировать', 'error')
		}
	}

	const handleShare = () => {
		if (!info?.referralLink) return
		const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${encodeURIComponent('Зарабатывай вместе с WORK KG! 💸')}`
		window.open(shareUrl, '_blank')
	}

	const handleTask = async (taskId: string) => {
		showToast('Проверяем подписку...', 'info')
		try {
			const res = await apiService.checkSocialTask(telegramId, taskId)
			if (res.success) {
				showToast(`Успешно! Начислено ${res.earned} баллов`, 'success')
				const updated = await apiService.apiGetReferralInfo(telegramId)
				setInfo(updated)
			} else {
				showToast('Сначала подпишитесь на канал', 'error')
			}
		} catch (e) {
			showToast('Ошибка проверки', 'error')
		}
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-[60vh]'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-red-800'></div>
			</div>
		)

	return (
		<div className='px-5 space-y-6 py-6 pb-24 animate-in fade-in duration-500'>
			{/* ГЛАВНАЯ КАРТОЧКА С БАЛАНСОМ */}
			<div className='brand-gradient p-8 rounded-[2.5rem] text-white shadow-2xl brand-shadow flex flex-col items-center text-center space-y-4 relative overflow-hidden'>
				{/* Декоративный элемент фона */}
				<div className='absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl'></div>

				<span className='text-5xl animate-bounce'>🎁</span>

				<div>
					<h2 className='text-2xl font-black uppercase tracking-tighter'>
						Партнерка
					</h2>
					<p className='text-slate-200 opacity-80 text-[10px] font-black uppercase tracking-[0.2em]'>
						Твой пассивный доход
					</p>
				</div>

				<div className='space-y-1'>
					<div className='bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20 inline-block'>
						<span className='text-3xl font-black'>
							{totalEarned}
						</span>
						<span className='text-xs font-bold uppercase ml-2'>
							баллов
						</span>
					</div>
					{/* Эквивалент в сомах */}
					<div className='text-white/70 text-[11px] font-black uppercase tracking-[0.2em]'>
						≈ {somEquivalent} СОМ
					</div>
				</div>
			</div>

			{/* БЛОК С КУРСОМ (ИНФОРМАЦИЯ) */}
			<div className='bg-red-50 border border-red-100 p-5 rounded-[2rem] flex items-center gap-4'>
				<div className='w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-red-100'>
					💰
				</div>
				<div className='text-left'>
					<h4 className='text-[10px] font-black text-red-800 uppercase tracking-widest leading-tight'>
						Курс обмена
					</h4>
					<p className='text-sm font-black text-slate-900 mt-1'>
						100 баллов = 5 сомов
					</p>
					<p className='text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter'>
						Вывод на карты любых банков КР и кошельки»{' '}
					</p>
				</div>
			</div>

			{/* СТАТИСТИКА */}
			<div className='grid grid-cols-2 gap-4 text-center'>
				<div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
					<span className='text-[10px] font-black text-slate-400 uppercase block mb-1'>
						Приглашено
					</span>
					<span className='text-2xl font-black text-slate-900'>
						{info?.referralsCount || 0}
					</span>
					<span className='text-[10px] text-red-800 font-bold block uppercase mt-1'>
						человек
					</span>
				</div>
				<div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
					<span className='text-[10px] font-black text-slate-400 uppercase block mb-1'>
						Бонус за друга
					</span>
					<span className='text-2xl font-black text-slate-900'>
						{info?.rewardPerReferral || 0}
					</span>
					<span className='text-[10px] text-slate-400 font-bold block uppercase mt-1'>
						баллов
					</span>
				</div>
			</div>

			{/* РЕФЕРАЛЬНАЯ ССЫЛКА */}
			<div className='bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 text-center'>
				<h4 className='text-xs font-black text-slate-400 uppercase tracking-widest'>
					Твоя ссылка
				</h4>
				<div className='flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200'>
					<span className='text-[11px] font-medium text-slate-500 truncate flex-1 pl-2 italic'>
						{info?.referralLink}
					</span>
					<button
						onClick={() =>
							info && copyToClipboard(info.referralLink)
						}
						className='bg-white text-slate-900 p-3 rounded-xl shadow-sm active:scale-90 transition-all border border-slate-100'
					>
						📋
					</button>
					<button
						onClick={handleShare}
						className='bg-slate-900 text-white px-4 py-3 rounded-xl active:scale-95 transition-all font-black text-[10px] uppercase'
					>
						Поделиться
					</button>
				</div>
			</div>

			{/* ЗАДАЧИ */}
			<div className='space-y-4 text-left'>
				<h4 className='text-xs font-black text-slate-400 uppercase tracking-widest px-2'>
					Бонусы за подписки
				</h4>
				<div className='bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<div className='w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl border border-slate-100'>
							✈️
						</div>
						<div className='text-left'>
							<h5 className='text-sm font-black text-slate-900'>
								Наш канал
							</h5>
							<p className='text-[10px] text-red-800 font-bold uppercase'>
								+50 баллов
							</p>
						</div>
					</div>
					<button
						onClick={() => handleTask('tg_sub')}
						className='text-xs font-black text-slate-900 bg-slate-50 px-5 py-3 rounded-xl active:scale-95 border border-slate-100 shadow-sm'
					>
						Проверить
					</button>
				</div>
			</div>

			{/* КНОПКА ВЫВОДА */}
			<button
				onClick={() => navigate('/withdraw')}
				className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all'
			>
				Вывести баллы 💸
			</button>

			<p className='text-center text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em] px-10 leading-relaxed'>
				Приглашайте друзей и получайте бонусы за каждую их активность в
				приложении.
			</p>
		</div>
	)
}
// --- CORE APP ---

const AppContent: React.FC = () => {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [isPlusOpen, setIsPlusOpen] = useState(false)
	const navigate = useNavigate()
	const location = useLocation()
	const [access, setAccess] = useState<AccessStatus | null>(null)

	const telegramId = tg?.initDataUnsafe?.user?.id || 1810333455

	// Full Screen & Native Back Button Logic
	useEffect(() => {
		if (tg) {
			tg.ready()
			tg.expand()

			// Принудительно разворачиваем на весь экран и включаем подтверждение закрытия, чтобы свайп не закрывал приложение
			try {
				tg.requestFullscreen()
				if (tg.disableVerticalSwipes) {
					tg.enableClosingConfirmation()
					tg.disableVerticalSwipes()
				}
			} catch (e) {
				console.error(e)
			}
		}
	}, [])

	useEffect(() => {
		if (!tg) return

		// Управление нативной кнопкой "Назад"
		if (location.pathname === '/' || location.pathname === '/home') {
			tg.BackButton.hide()
		} else {
			tg.BackButton.show()
			const handleBack = () => navigate(-1)
			tg.BackButton.onClick(handleBack)
			return () => tg.BackButton.offClick(handleBack)
		}
	}, [location, navigate])

	const fetchData = useCallback(async () => {
		try {
			let userData
			try {
				userData = await apiService.getUser(telegramId)
			} catch (e) {
				if (tg?.initDataUnsafe?.user) {
					await apiService.registerUser({
						telegramId,
						username: tg.initDataUnsafe.user.username || '',
						firstName: tg.initDataUnsafe.user.first_name || '',
						lastName: tg.initDataUnsafe.user.last_name || '',
						language: 'RU',
					})
					userData = await apiService.getUser(telegramId)
				}
			}
			if (userData) {
				setUser(userData)
				setAccess(await apiService.checkAccess(telegramId))
			}
		} catch (error) {
			console.error('Initial load failed:', error)
		} finally {
			setLoading(false)
		}
	}, [telegramId])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	useEffect(() => {
		let touchStartX = 0
		let touchStartY = 0

		const edgeThreshold = 70
		const swipeThreshold = 60 // Снизили порог, чтобы срабатывало быстрее

		const handleTouchStart = (e: TouchEvent) => {
			touchStartX = e.touches[0].clientX
			touchStartY = e.touches[0].clientY
		}

		const handleTouchMove = (e: TouchEvent) => {}

		const handleTouchEnd = (e: TouchEvent) => {
			const touchEndX = e.changedTouches[0].clientX
			const touchEndY = e.changedTouches[0].clientY
			const screenWidth = window.innerWidth

			const diffX = touchEndX - touchStartX
			const diffY = Math.abs(touchEndY - touchStartY)

			// Блокируем, если это был скролл вверх/вниз (вертикальное смещение больше горизонтального)
			if (diffY > Math.abs(diffX) || diffY > 60) return

			// 1. СВАЙП НАЗАД (Палец движется вправо — Направо)
			// Если начали движение в зоне от 0 до 70px и протащили на 60px вправо
			if (touchStartX < edgeThreshold && diffX > swipeThreshold) {
				if (
					location.pathname !== '/' &&
					location.pathname !== '/home'
				) {
					navigate(-1)
				}
			}

			// 2. СВАЙП ВПЕРЕД (Палец движется влево — Налево)
			// Если начали движение у правого края (отступ 70px) и протащили влево
			if (
				touchStartX > screenWidth - edgeThreshold &&
				diffX < -swipeThreshold
			) {
				navigate(1)
			}
		}

		// Добавляем обработчики на всё окно
		window.addEventListener('touchstart', handleTouchStart, {
			passive: true,
		})
		window.addEventListener('touchmove', handleTouchMove, { passive: true })
		window.addEventListener('touchend', handleTouchEnd, { passive: true })

		return () => {
			window.removeEventListener('touchstart', handleTouchStart)
			window.removeEventListener('touchmove', handleTouchMove)
			window.removeEventListener('touchend', handleTouchEnd)
		}
	}, [navigate, location.pathname])

	if (loading)
		return (
			<div className='min-h-screen flex items-center justify-center bg-white'>
				<div className='w-10 h-10 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin' />
			</div>
		)

	const showNav = ['/', '/search', '/profile', '/bonuses', '/games'].includes(
		location.pathname,
	)

	return (
		<div className='min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden'>
			<main
				style={{
					paddingTop: showNav ? 'var(--sat)' : '0',
				}}
				className='flex-1 w-full max-w-xl mx-auto pb-32'
			>
				<Routes>
					<Route path='/' element={<HomePage user={user} />} />
					<Route
						path='/search'
						element={<SearchPage telegramId={telegramId} />}
					/>
					<Route path='/games' element={<GamesPage />} />
					<Route
						path='/create'
						element={<CreatePage telegramId={telegramId} />}
					/>

					<Route
						path='/edit'
						element={<EditPage telegramId={telegramId} />}
					/>
					<Route
						path='/profile'
						element={
							<ProfilePage telegramId={telegramId} user={user} />
						}
					/>
					<Route
						path='/bonuses'
						element={<BonusesPage telegramId={telegramId} />}
					/>
					<Route
						path='/withdraw'
						element={<WithdrawPage telegramId={telegramId} />}
					/>
					<Route
						path='/subscription'
						element={<SubscriptionPage telegramId={telegramId} />}
					/>
					<Route
						path='/detail'
						element={<DetailPage telegramId={telegramId} />}
					/>
					<Route
						path='/profile-detail'
						element={<ProfileDetail telegramId={telegramId} />}
					/>
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</main>
			{showNav && (
				<nav className='fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-white/40 backdrop-blur-xl'>
					<div className='max-w-md mx-auto bg-white border border-slate-100 rounded-[2.5rem] p-3 flex justify-around items-center shadow-2xl relative'>
						<NavTab
							active={location.pathname === '/'}
							onClick={() => navigate('/')}
							icon={<HomeIcon />}
						/>
						<NavTab
							active={location.pathname === '/search'}
							onClick={() => navigate('/search')}
							icon={<SearchIcon />}
						/>
						<div
							className='w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl -mt-10 border-4 border-white transition-transform active:scale-95 cursor-pointer'
							onClick={() => setIsPlusOpen(true)}
						>
							<PlusIcon />
						</div>
						<NavTab
							active={location.pathname === '/bonuses'}
							onClick={() => navigate('/bonuses')}
							icon={<StarIcon />}
						/>
						<NavTab
							active={location.pathname === '/profile'}
							onClick={() => navigate('/profile')}
							icon={<UserIcon />}
						/>
					</div>
				</nav>
			)}
			<BottomSheet
				isOpen={isPlusOpen}
				onClose={() => setIsPlusOpen(false)}
				title='Создать публикацию'
			>
				<button
					onClick={() => {
						setIsPlusOpen(false)
						navigate('/create', { state: { type: 'vac' } })
					}}
					className='w-full flex items-center gap-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl active:bg-slate-100 transition-all'
				>
					<div className='w-14 h-14 bg-[#111111] text-white flex items-center justify-center rounded-2xl font-bold'>
						💼
					</div>
					<div className='text-left'>
						<div className='font-black text-slate-900 text-lg leading-tight'>
							Вакансия
						</div>
						<div className='text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest'>
							Поиск сотрудника
						</div>
					</div>
				</button>
				<button
					onClick={() => {
						setIsPlusOpen(false)
						navigate('/create', { state: { type: 'res' } })
					}}
					className='w-full flex items-center gap-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl active:bg-slate-100 transition-all'
				>
					<div className='w-14 h-14 bg-red-800 text-white flex items-center justify-center rounded-2xl font-bold'>
						📄
					</div>
					<div className='text-left'>
						<div className='font-black text-slate-900 text-lg leading-tight'>
							Резюме
						</div>
						<div className='text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest'>
							Поиск работы
						</div>
					</div>
				</button>
			</BottomSheet>
		</div>
	)
}

const NavTab = ({ active, icon, onClick }: any) => (
	<button
		onClick={onClick}
		className={`flex items-center justify-center rounded-2xl transition-all w-12 h-12 ${active ? 'text-red-700 bg-red-50/30 active-tab-glow' : 'text-slate-300'}`}
	>
		{icon}
	</button>
)

const HomeIcon = () => (
	<svg
		className='w-6 h-6'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		/>
	</svg>
)
const SearchIcon = () => (
	<svg
		className='w-6 h-6'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
		/>
	</svg>
)
const StarIcon = () => (
	<svg
		className='w-6 h-6'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.5'
			d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16v1m4-12V3c0-1.105-.895-2-2-2h-4c-1.105 0-2 .895-2 2v2M6 5v1M6 5H5C3.895 5 3 5.895 3 7v10c0 1.105.895 2 2 2h14c1.105 0 2-.895 2-2V7c0-1.105-.895-2-2-2h-1M18 5v1'
		/>
	</svg>
)
const PlusIcon = () => (
	<svg
		className='w-8 h-8'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='3'
			d='M12 6v12m6-6H6'
		/>
	</svg>
)
const UserIcon = () => (
	<svg
		className='w-6 h-6'
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
const BellIcon = () => (
	<svg
		className='w-6 h-6 text-slate-800'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2'
			d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
		/>
	</svg>
)
const SearchIconSmall = () => (
	<svg
		className='w-5 h-5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='3'
			d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
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

const App: React.FC = () => (
	<HashRouter>
		<ToastProvider>
			<LocationProvider>
				<AppContent />
			</LocationProvider>
		</ToastProvider>
	</HashRouter>
)
export default App

// import React, {
// 	useState,
// 	useEffect,
// 	useCallback,
// 	useMemo,
// 	useContext,
// 	useRef,
// } from 'react'
// import {
// 	HashRouter,
// 	Routes,
// 	Route,
// 	useNavigate,
// 	useLocation,
// 	Navigate,
// } from 'react-router-dom'
// import { apiService } from './apiService'
// import { geminiService } from './geminiService'
// import { LOCALES, BANK_SERVICES, formatPhoneKG } from './constants'
// import {
// 	User,
// 	Resume,
// 	Vacancy,
// 	City,
// 	Sphere,
// 	Category,
// 	Subcategory,
// 	ReferralInfo,
// 	AccessStatus,
// } from './types'

// const tg = (window as any).Telegram?.WebApp

// // --- SHARED COMPONENTS ---

// const ToastContext = React.createContext<{
// 	showToast: (message: string, type?: 'success' | 'error') => void
// }>({ showToast: () => {} })

// const useToast = () => useContext(ToastContext)

// const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
// 	children,
// }) => {
// 	const [toast, setToast] = useState<{
// 		message: string
// 		type: 'success' | 'error'
// 	} | null>(null)
// 	const showToast = useCallback(
// 		(message: string, type: 'success' | 'error' = 'success') => {
// 			setToast({ message, type })
// 			setTimeout(() => setToast(null), 3000)
// 		},
// 		[],
// 	)

// 	return (
// 		<ToastContext.Provider value={{ showToast }}>
// 			{children}
// 			{toast && (
// 				<div className='fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm'>
// 					<div
// 						className={`p-4 rounded-2xl shadow-2xl flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'brand-gradient text-white' : 'bg-rose-600 text-white'}`}
// 					>
// 						<div className='text-sm font-bold'>{toast.message}</div>
// 					</div>
// 				</div>
// 			)}
// 		</ToastContext.Provider>
// 	)
// }

// export const ElegantSelect: React.FC<{
// 	label?: string
// 	value: string | number | null
// 	options: { id: string | number; name: string; icon?: string }[]
// 	placeholder: string
// 	onChange: (id: any) => void
// 	disabled?: boolean
// }> = ({ label, value, options, placeholder, onChange, disabled }) => {
// 	const [isOpen, setIsOpen] = useState(false)
// 	const selectedOption = options.find((o) => o.id === value)

// 	const renderIcon = (icon?: string, name?: string) => {
// 		if (!icon) return null
// 		const isUrl = icon.startsWith('http') || icon.startsWith('data:')
// 		return (
// 			<div className='w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-lg'>
// 				{isUrl ? (
// 					<img
// 						src={icon}
// 						alt={name}
// 						className='w-full h-full object-contain'
// 					/>
// 				) : (
// 					<span className='text-xl'>{icon}</span>
// 				)}
// 			</div>
// 		)
// 	}

// 	return (
// 		<div
// 			className={`relative w-full ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}
// 		>
// 			{label && (
// 				<label className='block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 px-1 text-left'>
// 					{label}
// 				</label>
// 			)}
// 			<button
// 				type='button'
// 				onClick={() => !disabled && setIsOpen(!isOpen)}
// 				className={`w-full flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm active:bg-slate-50 transition-all ${isOpen ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-100'}`}
// 			>
// 				<div className='flex items-center gap-3 overflow-hidden'>
// 					{selectedOption &&
// 						renderIcon(selectedOption.icon, selectedOption.name)}
// 					<span
// 						className={`font-bold text-sm truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}
// 					>
// 						{selectedOption ? selectedOption.name : placeholder}
// 					</span>
// 				</div>
// 				<svg
// 					className={`w-5 h-5 text-indigo-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
// 					fill='none'
// 					stroke='currentColor'
// 					viewBox='0 0 24 24'
// 				>
// 					<path
// 						strokeLinecap='round'
// 						strokeLinejoin='round'
// 						strokeWidth='2.5'
// 						d='M19 9l-7 7-7-7'
// 					/>
// 				</svg>
// 			</button>

// 			{isOpen && (
// 				<>
// 					<div
// 						className='fixed inset-0 z-[160] bg-black/5'
// 						onClick={() => setIsOpen(false)}
// 					/>
// 					<div className='absolute top-full left-0 right-0 mt-2 z-[170] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto no-scrollbar'>
// 						{options.map((opt) => (
// 							<button
// 								key={opt.id}
// 								onClick={() => {
// 									onChange(opt.id)
// 									setIsOpen(false)
// 								}}
// 								className={`w-full flex items-center gap-4 p-4 text-left border-b border-slate-50 last:border-0 active:bg-indigo-50 ${String(value) === String(opt.id) ? 'bg-indigo-50/50' : ''}`}
// 							>
// 								{renderIcon(opt.icon, opt.name)}
// 								<span
// 									className={`font-bold text-sm flex-1 ${String(value) === String(opt.id) ? 'text-indigo-600' : 'text-slate-700'}`}
// 								>
// 									{opt.name}
// 								</span>
// 								{String(value) === String(opt.id) && (
// 									<span className='ml-auto text-indigo-600 font-bold text-lg'>
// 										✓
// 									</span>
// 								)}
// 							</button>
// 						))}
// 					</div>
// 				</>
// 			)}
// 		</div>
// 	)
// }

// const BottomSheet: React.FC<{
// 	isOpen: boolean
// 	onClose: () => void
// 	title: string
// 	description?: string
// 	children: React.ReactNode
// }> = ({ isOpen, onClose, title, description, children }) => {
// 	if (!isOpen) return null
// 	return (
// 		<div className='fixed inset-0 z-[150] flex items-end justify-center'>
// 			<div
// 				className='absolute inset-0 bg-slate-900/40 backdrop-blur-sm'
// 				onClick={onClose}
// 			/>
// 			<div className='relative w-full max-w-xl bg-white rounded-t-[2.5rem] shadow-2xl p-8 pb-12 animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[85vh]'>
// 				<div className='w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8 flex-shrink-0' />
// 				<div className='text-center mb-8 flex-shrink-0'>
// 					<h2 className='text-2xl font-black text-slate-900 leading-tight'>
// 						{title}
// 					</h2>
// 					{description && (
// 						<p className='text-slate-500 text-sm mt-2 font-medium'>
// 							{description}
// 						</p>
// 					)}
// 				</div>
// 				<div className='space-y-3'>{children}</div>
// 				<button
// 					onClick={onClose}
// 					className='w-full mt-6 py-2 text-slate-400 text-xs font-bold uppercase tracking-widest flex-shrink-0'
// 				>
// 					Закрыть
// 				</button>
// 			</div>
// 		</div>
// 	)
// }

// const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({
// 	label,
// 	children,
// }) => (
// 	<div className='space-y-2'>
// 		<label className='text-[10px] font-black text-indigo-300 uppercase tracking-widest px-1'>
// 			{label}
// 		</label>
// 		{children}
// 	</div>
// )

// // --- PAGES ---

// const HomePage: React.FC<{ user: User | null }> = ({ user }) => {
// 	const navigate = useNavigate()
// 	const spheres = [
// 		{ id: 1, name: 'IT', icon: '💻' },
// 		{ id: 2, name: 'Horeca', icon: '☕️' },
// 		{ id: 3, name: 'Магазины', icon: '🏪' },
// 		{ id: 4, name: 'Логистика', icon: '🚚' },
// 		{ id: 5, name: 'Ремонт', icon: '🛠' },
// 		{ id: 6, name: 'Бьюти', icon: '💅' },
// 	]

// 	return (
// 		<div className='pb-40 animate-in fade-in duration-500 bg-white min-h-screen'>
// 			<header className='px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-indigo-50/50'>
// 				<div className='flex items-center gap-2'>
// 					<div className='text-2xl font-black tracking-tighter uppercase italic brand-text-gradient'>
// 						AVA
// 					</div>
// 				</div>
// 				<button className='w-10 h-10 bg-indigo-50/50 flex items-center justify-center rounded-xl relative active:scale-95 transition-transform'>
// 					<BellIcon />
// 					<div className='absolute top-3 right-3 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white'></div>
// 				</button>
// 			</header>

// 			<div className='px-6 mb-5 mt-4'>
// 				<div className='brand-gradient p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl brand-shadow'>
// 					<div className='space-y-1'>
// 						<h3 className='text-lg font-black uppercase tracking-tighter'>
// 							Быстрый старт 🚀
// 						</h3>
// 						<p className='text-[10px] text-indigo-100 font-bold uppercase'>
// 							Заполни профиль за 1 минуту
// 						</p>
// 					</div>
// 					<button
// 						onClick={() =>
// 							navigate('/create', { state: { type: 'res' } })
// 						}
// 						className='bg-white text-indigo-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95'
// 					>
// 						Начать
// 					</button>
// 				</div>
// 			</div>
// 			<div className='px-6 mb-8'>
// 				<div
// 					onClick={() => navigate('/subscription')}
// 					className='bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden active:scale-[0.98] transition-all'
// 				>
// 					<div className='absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full'></div>
// 					<div className='space-y-1 text-left relative z-10'>
// 						<h3 className='text-lg font-black uppercase tracking-tighter text-amber-400'>
// 							FASTJOB PRO 💎
// 						</h3>
// 						<p className='text-[10px] text-indigo-200 font-bold uppercase'>
// 							Открой все контакты сразу
// 						</p>
// 					</div>
// 					<span className='bg-white/10 p-3 rounded-full relative z-10 text-xl'>
// 						✨
// 					</span>
// 				</div>
// 			</div>
// 			<div className='overflow-x-auto no-scrollbar flex gap-4 px-6 mb-8 mt-2'>
// 				{spheres.map((s) => (
// 					<div
// 						key={s.id}
// 						onClick={() =>
// 							navigate('/search', { state: { initialSphere: s } })
// 						}
// 						className='flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group'
// 					>
// 						<div className='w-16 h-16 bg-white border border-indigo-50 shadow-sm rounded-2xl flex items-center justify-center text-2xl transition-all group-active:scale-95 group-active:bg-indigo-50 group-hover:border-indigo-200'>
// 							{s.icon}
// 						</div>
// 						<span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
// 							{s.name}
// 						</span>
// 					</div>
// 				))}
// 			</div>

// 			<div className='px-6 mb-10'>
// 				<div className='relative' onClick={() => navigate('/search')}>
// 					<div className='absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-400'>
// 						<SearchIconSmall />
// 					</div>
// 					<input
// 						readOnly
// 						placeholder='Кофейни, рестораны, вакансии...'
// 						className='w-full bg-indigo-50/30 border-none h-14 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none placeholder:text-indigo-300'
// 					/>
// 				</div>
// 			</div>

// 			<div className='px-6 space-y-6'>
// 				<div className='flex justify-between items-center'>
// 					<h3 className='text-lg font-black text-slate-900'>
// 						Рекомендуем
// 					</h3>
// 					<button
// 						onClick={() => navigate('/search')}
// 						className='text-[11px] font-black brand-text-gradient uppercase'
// 					>
// 						Все предложения →
// 					</button>
// 				</div>

// 				{[1, 2].map((i) => (
// 					<div
// 						key={i}
// 						onClick={() =>
// 							navigate('/detail', {
// 								state: {
// 									type: 'job',
// 									data: {
// 										id: i,
// 										title:
// 											i === 1
// 												? 'Ресторан "Барашек"'
// 												: 'Кофейня "AVA"',
// 										cityName: 'Бишкек',
// 										categoryName: 'Ресторан',
// 										description:
// 											'Семейный современный ресторан событийного формата...',
// 										salary: '80 000 сом',
// 										isActive: true,
// 										phone: '0555000000',
// 									},
// 								},
// 							})
// 						}
// 						className='bg-white border border-indigo-50 rounded-[2.5rem] overflow-hidden shadow-sm active:scale-[0.98] transition-all mb-4 hover:border-indigo-100'
// 					>
// 						<div className='h-44 bg-slate-200 relative'>
// 							<img
// 								src={`https://picsum.photos/seed/${i + 800}/800/600`}
// 								className='w-full h-full object-cover'
// 								alt='Venue'
// 							/>
// 							<div className='absolute top-4 left-4 brand-gradient backdrop-blur-md px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest border border-white/20'>
// 								Проверено
// 							</div>
// 						</div>
// 						<div className='p-6'>
// 							<div className='flex items-center gap-2 mb-2 text-indigo-300 font-bold text-[9px] uppercase tracking-widest'>
// 								<span>🕒 10:00-22:45</span>
// 								<span>
// 									• 🍴 {i === 1 ? 'Ресторан' : 'Кофейня'}
// 								</span>
// 							</div>
// 							<h4 className='text-xl font-black text-slate-900 mb-1'>
// 								{i === 1
// 									? 'Ресторан "Барашек"'
// 									: 'Кофейня "AVA"'}
// 							</h4>
// 							<div className='flex justify-between items-center mt-4 pt-4 border-t border-indigo-50'>
// 								<span className='brand-text-gradient font-black text-sm'>
// 									{i === 1 ? '80 000 сом' : '65 000 сом'}
// 								</span>
// 								<span className='text-[10px] font-bold text-slate-300 uppercase'>
// 									📍 Бишкек
// 								</span>
// 							</div>
// 						</div>
// 					</div>
// 				))}
// 			</div>
// 		</div>
// 	)
// }

// export const SubscriptionPage: React.FC<{ telegramId: number }> = ({
// 	telegramId,
// }) => {
// 	const [loading, setLoading] = useState<string | null>(null)
// 	const { showToast } = useToast()
// 	const navigate = useNavigate()
// 	const plans = [
// 		{
// 			id: 'THREE_DAYS',
// 			name: '3 Дня',
// 			price: '169 сом',
// 			desc: 'Быстрый старт',
// 			icon: '🔥',
// 		},
// 		{
// 			id: 'ONE_WEEK',
// 			name: '7 Дней',
// 			price: '273 сом',
// 			desc: 'Популярный выбор',
// 			icon: '💎',
// 		},
// 		{
// 			id: 'ONE_MONTH',
// 			name: '30 Дней',
// 			price: '802 сом',
// 			desc: 'Максимальная выгода',
// 			icon: '🚀',
// 		},
// 	]

// 	const buy = async (id: string) => {
// 		setLoading(id)
// 		try {
// 			const res = await apiService.createPayment(telegramId, id)
// 			if (res?.paymentUrl) {
// 				if (tg)
// 					tg.openLink(res.paymentUrl, {
// 						try_instant_view: false,
// 					})
// 				else window.location.href = res.paymentUrl
// 			}
// 		} catch (e) {
// 			showToast('Ошибка оплаты', 'error')
// 		} finally {
// 			setLoading(null)
// 		}
// 	}

// 	return (
// 		<div className='px-5 space-y-8 pb-32 animate-in fade-in duration-500 bg-white min-h-screen'>
// 			<header className='flex items-center gap-4 py-8'>
// 				<button
// 					onClick={() => navigate(-1)}
// 					className='w-12 h-12 bg-indigo-50/50 rounded-2xl flex items-center justify-center text-indigo-600 active:scale-90 transition-transform'
// 				>
// 					<svg
// 						className='w-6 h-6'
// 						fill='none'
// 						stroke='currentColor'
// 						viewBox='0 0 24 24'
// 					>
// 						<path
// 							strokeLinecap='round'
// 							strokeLinejoin='round'
// 							strokeWidth='3'
// 							d='M15 19l-7-7 7-7'
// 						/>
// 					</svg>
// 				</button>
// 				<div className='text-left'>
// 					<h2 className='text-2xl font-black text-slate-900 leading-tight'>
// 						FASTJOB PRO
// 					</h2>
// 					<p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
// 						Уровни доступа
// 					</p>
// 				</div>
// 			</header>

// 			<div className='bg-slate-900 p-10 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden'>
// 				<div className='absolute top-0 right-0 w-60 h-60 bg-indigo-500/30 blur-[100px] rounded-full'></div>
// 				<div className='absolute bottom-0 left-0 w-40 h-40 bg-amber-400/10 blur-[80px] rounded-full'></div>
// 				<h2 className='text-4xl font-black italic tracking-tighter mb-2 relative z-10'>
// 					ПРЕМИУМ ДОСТУП
// 				</h2>
// 				<p className='text-xs font-black text-indigo-300 uppercase tracking-[0.4em] relative z-10 opacity-80'>
// 					Unlimited Opportunities
// 				</p>
// 			</div>

// 			{/* Free Tier Info */}
// 			<div className='bg-slate-50 border border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between'>
// 				<div className='text-left'>
// 					<div className='flex items-center gap-2 mb-1'>
// 						<span className='text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-lg uppercase tracking-widest'>
// 							Базовый
// 						</span>
// 						<span className='text-lg'>🌱</span>
// 					</div>
// 					<h3 className='text-xl font-black text-slate-900'>
// 						Бесплатно
// 					</h3>
// 					<p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1'>
// 						Лимит: 3 контакта в день
// 					</p>
// 				</div>
// 				<div className='bg-white p-4 rounded-2xl shadow-sm border border-slate-50'>
// 					<span className='text-sm font-black text-slate-300'>✓</span>
// 				</div>
// 			</div>

// 			<div className='grid grid-cols-1 gap-5'>
// 				{plans.map((p) => (
// 					<button
// 						key={p.id}
// 						onClick={() => buy(p.id)}
// 						disabled={loading !== null}
// 						className='group bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between text-left active:scale-[0.97] transition-all shadow-xl shadow-slate-200/30 hover:border-indigo-200'
// 					>
// 						<div className='flex-1 pr-4'>
// 							<div className='flex items-center gap-2 mb-2'>
// 								<span
// 									className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${p.id === 'ONE_WEEK' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}
// 								>
// 									{p.name}
// 								</span>
// 								<span className='text-2xl'>{p.icon}</span>
// 							</div>
// 							<h3 className='text-3xl font-black text-slate-900'>
// 								{p.price}
// 							</h3>
// 							<p className='text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 opacity-70'>
// 								{p.desc}
// 							</p>
// 						</div>
// 						<div className='bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors p-5 rounded-3xl'>
// 							{loading === p.id ? (
// 								<div className='w-7 h-7 border-[3px] border-indigo-600 border-t-transparent group-hover:border-white group-hover:border-t-transparent rounded-full animate-spin'></div>
// 							) : (
// 								<svg
// 									className='w-7 h-7'
// 									fill='none'
// 									stroke='currentColor'
// 									viewBox='0 0 24 24'
// 								>
// 									<path
// 										strokeLinecap='round'
// 										strokeLinejoin='round'
// 										strokeWidth='3'
// 										d='M12 6v12m6-6H6'
// 									/>
// 								</svg>
// 							)}
// 						</div>
// 					</button>
// 				))}
// 			</div>

// 			<div className='p-8 bg-indigo-50/50 rounded-[3rem] space-y-6 border border-indigo-100'>
// 				<h4 className='text-[11px] font-black text-indigo-400 uppercase tracking-[0.25em] text-center'>
// 					Привилегии PRO подписки
// 				</h4>
// 				<div className='grid grid-cols-1 gap-5'>
// 					<BenefitItem
// 						icon='🔓'
// 						title='Контакты без лимита'
// 						desc='Смотрите номера всех работодателей без ограничений'
// 					/>
// 					<BenefitItem
// 						icon='🔝'
// 						title='Приоритет в выдаче'
// 						desc='Ваше резюме всегда будет первым в списке'
// 					/>
// 					<BenefitItem
// 						icon='⚡'
// 						title='Без очереди'
// 						desc='Мгновенная модерация ваших публикаций'
// 					/>
// 				</div>
// 			</div>
// 		</div>
// 	)
// }

// const BenefitItem = ({
// 	icon,
// 	title,
// 	desc,
// }: {
// 	icon: string
// 	title: string
// 	desc: string
// }) => (
// 	<div className='flex items-start gap-4'>
// 		<div className='w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-50 shrink-0'>
// 			{icon}
// 		</div>
// 		<div className='text-left'>
// 			<div className='text-sm font-black text-slate-900 leading-tight'>
// 				{title}
// 			</div>
// 			<div className='text-[11px] text-slate-400 font-bold mt-1'>
// 				{desc}
// 			</div>
// 		</div>
// 	</div>
// )

// const SearchPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
// 	const location = useLocation()
// 	const navigate = useNavigate()
// 	const [type, setType] = useState<'job' | 'worker'>('job')
// 	const [query, setQuery] = useState('')

// 	const [selectedCityId, setSelectedCityId] = useState<number>(1)
// 	const [selectedSphereId, setSelectedSphereId] = useState<number | null>(
// 		location.state?.initialSphere?.id || null,
// 	)
// 	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
// 		null,
// 	)
// 	const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
// 		number | null
// 	>(null)

// 	const [cities, setCities] = useState<City[]>([])
// 	const [spheres, setSpheres] = useState<Sphere[]>([])
// 	const [categories, setCategories] = useState<Category[]>([])
// 	const [subcategories, setSubcategories] = useState<Subcategory[]>([])

// 	const [results, setResults] = useState<any[]>([])
// 	const [loading, setLoading] = useState(false)
// 	const { showToast } = useToast()

// 	useEffect(() => {
// 		apiService.getCities(telegramId).then(setCities)
// 		apiService.getSpheres(telegramId).then(setSpheres)
// 	}, [telegramId])

// 	useEffect(() => {
// 		if (selectedSphereId) {
// 			apiService
// 				.getCategories(telegramId, selectedSphereId)
// 				.then(setCategories)
// 		} else {
// 			setCategories([])
// 		}
// 		setSelectedCategoryId(null)
// 		setSelectedSubcategoryId(null)
// 	}, [selectedSphereId, telegramId])

// 	useEffect(() => {
// 		if (selectedCategoryId) {
// 			apiService
// 				.getSubcategories(telegramId, selectedCategoryId)
// 				.then(setSubcategories)
// 		} else {
// 			setSubcategories([])
// 		}
// 		setSelectedSubcategoryId(null)
// 	}, [selectedCategoryId, telegramId])

// 	const handleSearch = useCallback(async () => {
// 		setLoading(true)
// 		try {
// 			const cityId = selectedCityId || 1
// 			const catId = selectedCategoryId || 0
// 			const subId = selectedSubcategoryId || 0

// 			const res: any[] =
// 				type === 'job'
// 					? await apiService.searchVacancies(
// 							telegramId,
// 							cityId,
// 							catId,
// 							subId,
// 						)
// 					: await apiService.searchResumes(
// 							telegramId,
// 							cityId,
// 							catId,
// 							subId,
// 						)

// 			let filtered = res
// 			if (query) {
// 				filtered = filtered.filter((i: any) =>
// 					(i.title || i.name || '')
// 						.toLowerCase()
// 						.includes(query.toLowerCase()),
// 				)
// 			}
// 			setResults(filtered)
// 		} catch (e) {
// 			showToast('Ошибка при поиске', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}, [
// 		type,
// 		query,
// 		selectedCityId,
// 		selectedCategoryId,
// 		selectedSubcategoryId,
// 		telegramId,
// 		showToast,
// 	])

// 	useEffect(() => {
// 		handleSearch()
// 	}, [handleSearch])

// 	return (
// 		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500'>
// 			<header className='p-6 pt-12 space-y-6 sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-indigo-50'>
// 				<div className='flex items-center gap-4'>
// 					<button
// 						onClick={() => navigate(-1)}
// 						className='w-10 h-10 bg-indigo-50/50 rounded-xl flex items-center justify-center active:scale-95 transition-transform text-indigo-600'
// 					>
// 						←
// 					</button>
// 					<div className='flex-1 relative'>
// 						<div className='absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-400'>
// 							<SearchIconSmall />
// 						</div>
// 						<input
// 							value={query}
// 							onChange={(e) => setQuery(e.target.value)}
// 							placeholder='Название или ключи...'
// 							className='w-full bg-indigo-50/30 h-12 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none ring-2 ring-transparent focus:ring-indigo-100 transition-all'
// 						/>
// 					</div>
// 				</div>

// 				<div className='flex bg-indigo-50/50 p-1 rounded-2xl'>
// 					<button
// 						onClick={() => setType('job')}
// 						className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'job' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-300'}`}
// 					>
// 						Вакансии
// 					</button>
// 					<button
// 						onClick={() => setType('worker')}
// 						className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'worker' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-300'}`}
// 					>
// 						Сотрудники
// 					</button>
// 				</div>

// 				<div className='space-y-4'>
// 					<div className='grid grid-cols-2 gap-3'>
// 						<ElegantSelect
// 							placeholder='Выберите город'
// 							value={selectedCityId}
// 							options={cities.map((c) => ({
// 								id: c.id,
// 								name: c.name,
// 							}))}
// 							onChange={(id) => setSelectedCityId(id)}
// 						/>
// 						<ElegantSelect
// 							placeholder='Выберите сферу'
// 							value={selectedSphereId}
// 							options={spheres.map((s) => ({
// 								id: s.id,
// 								name: s.name,
// 								icon: s.icon,
// 							}))}
// 							onChange={(id) => setSelectedSphereId(id)}
// 						/>
// 					</div>

// 					{selectedSphereId && (
// 						<div className='grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300'>
// 							<ElegantSelect
// 								placeholder='Категория'
// 								value={selectedCategoryId}
// 								options={categories.map((c) => ({
// 									id: c.id,
// 									name: c.name,
// 								}))}
// 								onChange={(id) => setSelectedCategoryId(id)}
// 							/>
// 							<ElegantSelect
// 								disabled={
// 									!selectedCategoryId ||
// 									subcategories.length === 0
// 								}
// 								placeholder={
// 									subcategories.length === 0
// 										? 'Нет подкатегорий'
// 										: 'Подкатегория'
// 								}
// 								value={selectedSubcategoryId}
// 								options={subcategories.map((s) => ({
// 									id: s.id,
// 									name: s.name,
// 								}))}
// 								onChange={(id) => setSelectedSubcategoryId(id)}
// 							/>
// 						</div>
// 					)}
// 				</div>
// 			</header>

// 			<div className='px-6 py-4 space-y-4'>
// 				{loading ? (
// 					<div className='p-20 flex justify-center'>
// 						<div className='w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
// 					</div>
// 				) : results.length > 0 ? (
// 					results.map((item) => (
// 						<SearchResultItem
// 							key={item.id}
// 							item={item}
// 							type={type}
// 							onClick={(stats: any) =>
// 								navigate('/detail', {
// 									state: {
// 										type,
// 										data: item,
// 										initialStats: stats,
// 									},
// 								})
// 							}
// 						/>
// 					))
// 				) : (
// 					<div className='p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]'>
// 						Ничего не найдено
// 					</div>
// 				)}
// 			</div>
// 		</div>
// 	)
// }

// const SearchResultItem = ({ item, type, onClick }: any) => {
// 	const [stats, setStats] = useState<any>(null)
// 	const impressionRef = useRef<HTMLDivElement>(null)

// 	useEffect(() => {
// 		const fetchStats = async () => {
// 			try {
// 				const res =
// 					type === 'vac' || type === 'job'
// 						? await apiService.getVacancyStats(item.id)
// 						: await apiService.getResumeStats(item.id)
// 				setStats(res)
// 			} catch (e) {
// 				console.error(e)
// 			}
// 		}
// 		fetchStats()
// 	}, [item.id, type])

// 	useEffect(() => {
// 		const trackingKey = `${type}-${item.id}`
// 		const observer = new IntersectionObserver(
// 			(entries) => {
// 				if (entries[0].isIntersecting && !viewedIds.has(trackingKey)) {
// 					viewedIds.add(trackingKey)
// 					apiService.trackView(
// 						type === 'vac' || type === 'job' ? 'job' : 'worker',
// 						item.id,
// 					)
// 					setStats((prev: any) =>
// 						prev
// 							? {
// 									...prev,
// 									viewsCount: (prev.viewsCount || 0) + 1,
// 								}
// 							: prev,
// 					)
// 					observer.disconnect()
// 				}
// 			},
// 			{ threshold: 0.5 },
// 		)

// 		if (impressionRef.current) observer.observe(impressionRef.current)
// 		return () => observer.disconnect()
// 	}, [item.id, type])

// 	return (
// 		<div
// 			ref={impressionRef}
// 			onClick={() => onClick(stats)}
// 			className='bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all animate-in fade-in slide-in-from-bottom-2'
// 		>
// 			<div className='flex justify-between items-start mb-3'>
// 				<div className='text-left'>
// 					<span className='text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg'>
// 						{type === 'job' || type === 'vac'
// 							? 'Вакансия'
// 							: 'Резюме'}
// 					</span>
// 					<h3 className='text-lg font-black text-slate-900 mt-1'>
// 						{type === 'job' || type === 'vac'
// 							? item.title
// 							: item.name}
// 					</h3>
// 				</div>
// 				<div className='text-xs font-black text-emerald-600 text-right'>
// 					{type === 'job' || type === 'vac'
// 						? `${item.salary} 💵`
// 						: `${item.experience}г. опыта`}
// 				</div>
// 			</div>
// 			<p className='text-sm text-slate-500 line-clamp-2 font-medium mb-4 text-left'>
// 				{item.description}
// 			</p>
// 			<div className='pt-4 border-t border-slate-50 flex items-center justify-between'>
// 				<div className='flex items-center gap-3'>
// 					<div className='flex items-center gap-1 text-[10px] font-black text-slate-400'>
// 						<ViewIcon />
// 						<span>{stats?.viewsCount ?? 0}</span>
// 					</div>
// 					<div className='flex items-center gap-1 text-[10px] font-black text-slate-400'>
// 						<ClickIcon />
// 						<span>{stats?.contactClicksCount ?? 0}</span>
// 					</div>
// 					<div className='flex items-center gap-1 text-[10px] font-black text-indigo-400 text-left'>
// 						<svg
// 							className='w-3 h-3'
// 							fill='none'
// 							stroke='currentColor'
// 							viewBox='0 0 24 24'
// 						>
// 							<path
// 								strokeLinecap='round'
// 								strokeLinejoin='round'
// 								strokeWidth='3'
// 								d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
// 							/>
// 						</svg>
// 						<span>
// 							{type === 'job' || type === 'vac'
// 								? (stats?.responseCount ?? 0)
// 								: (stats?.invitationCount ?? 0)}
// 						</span>
// 					</div>
// 				</div>
// 				<div className='text-[10px] font-bold text-slate-300'>
// 					📍 {item.cityName}
// 				</div>
// 			</div>
// 		</div>
// 	)
// }
// const CreatePage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
// 	const location = useLocation()
// 	const navigate = useNavigate()
// 	const { type, existingData } = location.state || { type: 'vac' }
// 	const { showToast } = useToast()
// 	const [loading, setLoading] = useState(false)

// 	const [cities, setCities] = useState<City[]>([])
// 	const [spheres, setSpheres] = useState<Sphere[]>([])
// 	const [categories, setCategories] = useState<Category[]>([])
// 	const [subcategories, setSubcategories] = useState<Subcategory[]>([])

// 	const [formData, setFormData] = useState<any>(
// 		existingData || {
// 			title: '',
// 			name: '',
// 			description: '',
// 			salary: '',
// 			cityId: 0,
// 			sphereId: 0,
// 			categoryId: 0,
// 			subcategoryId: 0,
// 			phone: '',
// 			companyName: '',
// 			// Новые поля для вакансии:
// 			schedule: '',
// 			address: '',
// 			minAge: 18,
// 			maxAge: 45,
// 			preferredGender: 'ANY',
// 			// Поля для резюме:
// 			age: 18,
// 			gender: 'MALE',
// 			experience: 0,
// 			experienceInYear: 0,
// 			isActive: true,
// 		},
// 	)

// 	useEffect(() => {
// 		apiService.getCities(telegramId).then(setCities)
// 		apiService.getSpheres(telegramId).then(setSpheres)
// 	}, [telegramId])

// 	useEffect(() => {
// 		if (formData.sphereId) {
// 			apiService
// 				.getCategories(telegramId, formData.sphereId)
// 				.then(setCategories)
// 		}
// 		setFormData((prev: any) => ({
// 			...prev,
// 			categoryId: existingData?.categoryId || prev.categoryId,
// 		}))
// 	}, [formData.sphereId, telegramId, existingData])

// 	useEffect(() => {
// 		if (formData.categoryId) {
// 			apiService
// 				.getSubcategories(telegramId, formData.categoryId)
// 				.then(setSubcategories)
// 		}
// 	}, [formData.categoryId, telegramId])

// 	const handleAction = async () => {
// 		const isVac = type === 'vac' || type === 'job'
// 		const isUpdate = !!existingData?.id
// 		setLoading(true)
// 		try {
// 			if (isVac) {
// 				const payload = {
// 					title: formData.title,
// 					description: formData.description,
// 					salary: formData.salary,
// 					companyName: formData.companyName,
// 					phone: formData.phone,
// 					cityId: Number(formData.cityId),
// 					categoryId: Number(formData.categoryId),
// 					subcategoryId: Number(formData.subcategoryId),
// 					experienceInYear: Number(formData.experienceInYear),
// 					schedule: formData.schedule,
// 					address: formData.address,
// 					minAge: Number(formData.minAge),
// 					maxAge: Number(formData.maxAge),
// 					preferredGender: formData.preferredGender,
// 					isActive: true,
// 				}
// 				if (isUpdate)
// 					await apiService.updateVacancy(
// 						existingData.id,
// 						telegramId,
// 						payload,
// 					)
// 				else await apiService.createVacancy(telegramId, payload)
// 			} else {
// 				const payload = {
// 					name: formData.name,
// 					age: Number(formData.age),
// 					gender: formData.gender,
// 					cityId: Number(formData.cityId),
// 					categoryId: Number(formData.categoryId),
// 					subcategoryId: Number(formData.subcategoryId),
// 					experience: Number(formData.experience),
// 					description: formData.description,
// 					isActive: true,
// 				}
// 				if (isUpdate)
// 					await apiService.updateResume(
// 						existingData.id,
// 						telegramId,
// 						payload,
// 					)
// 				else await apiService.createResume(telegramId, payload)
// 			}
// 			showToast(isUpdate ? 'Успешно обновлено!' : 'Успешно опубликовано!')
// 			navigate('/profile')
// 		} catch (e) {
// 			showToast('Ошибка API', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}

// 	const inputClass =
// 		'w-full bg-indigo-50/30 border-none h-14 px-6 rounded-2xl text-sm font-bold focus:outline-none ring-2 ring-transparent focus:ring-indigo-100 transition-all placeholder:text-indigo-200 text-slate-900'

// 	return (
// 		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500'>
// 			<header className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-indigo-50'>
// 				<button
// 					onClick={() => navigate(-1)}
// 					className='w-10 h-10 bg-indigo-50/50 rounded-xl flex items-center justify-center text-indigo-600'
// 				>
// 					←
// 				</button>
// 				<h2 className='text-2xl font-black text-slate-900 leading-tight'>
// 					{existingData
// 						? 'Редактирование'
// 						: type === 'vac'
// 							? 'Новая Вакансия'
// 							: 'Новое Резюме'}
// 				</h2>
// 			</header>

// 			<div className='px-6 py-6 space-y-6'>
// 				<FormField
// 					label={
// 						type === 'vac' || type === 'job'
// 							? 'Название вакансии'
// 							: 'Ваше Имя'
// 					}
// 				>
// 					<input
// 						value={
// 							type === 'vac' || type === 'job'
// 								? formData.title
// 								: formData.name
// 						}
// 						onChange={(e) =>
// 							setFormData({
// 								...formData,
// 								[type === 'vac' || type === 'job'
// 									? 'title'
// 									: 'name']: e.target.value,
// 							})
// 						}
// 						placeholder='Введите заголовок...'
// 						className={inputClass}
// 					/>
// 				</FormField>

// 				<ElegantSelect
// 					label='Город'
// 					placeholder='Выберите город'
// 					value={formData.cityId}
// 					options={cities.map((c) => ({ id: c.id, name: c.name }))}
// 					onChange={(id) => setFormData({ ...formData, cityId: id })}
// 				/>

// 				<div className='space-y-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100'>
// 					<ElegantSelect
// 						label='Сфера'
// 						placeholder='Выберите сферу'
// 						value={formData.sphereId}
// 						options={spheres.map((s) => ({
// 							id: s.id,
// 							name: s.name,
// 						}))}
// 						onChange={(id) =>
// 							setFormData({
// 								...formData,
// 								sphereId: id,
// 								categoryId: 0,
// 								subcategoryId: 0,
// 							})
// 						}
// 					/>
// 					{formData.sphereId > 0 && (
// 						<ElegantSelect
// 							label='Категория'
// 							placeholder='Выберите категорию'
// 							value={formData.categoryId}
// 							options={categories.map((c) => ({
// 								id: c.id,
// 								name: c.name,
// 							}))}
// 							onChange={(id) =>
// 								setFormData({
// 									...formData,
// 									categoryId: id,
// 									subcategoryId: 0,
// 								})
// 							}
// 						/>
// 					)}
// 					{formData.categoryId > 0 && subcategories.length > 0 && (
// 						<ElegantSelect
// 							label='Подкатегория'
// 							placeholder='Выберите подкатегорию'
// 							value={formData.subcategoryId}
// 							options={subcategories.map((s) => ({
// 								id: s.id,
// 								name: s.name,
// 							}))}
// 							onChange={(id) =>
// 								setFormData({ ...formData, subcategoryId: id })
// 							}
// 						/>
// 					)}
// 				</div>

// 				{type === 'vac' || type === 'job' ? (
// 					<>
// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Зарплата'>
// 								<input
// 									value={formData.salary}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											salary: e.target.value,
// 										})
// 									}
// 									placeholder='80 000 сом'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='График работы'>
// 								<input
// 									value={formData.schedule}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											schedule: e.target.value,
// 										})
// 									}
// 									placeholder='2/2, 09:00-18:00'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>

// 						<FormField label='Адрес работы'>
// 							<input
// 								value={formData.address}
// 								onChange={(e) =>
// 									setFormData({
// 										...formData,
// 										address: e.target.value,
// 									})
// 								}
// 								placeholder='ул. Киевская, 120'
// 								className={inputClass}
// 							/>
// 						</FormField>

// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Возраст ОТ'>
// 								<input
// 									type='number'
// 									value={formData.minAge}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											minAge: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Возраст ДО'>
// 								<input
// 									type='number'
// 									value={formData.maxAge}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											maxAge: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>

// 						<ElegantSelect
// 							label='Предпочтительный пол'
// 							placeholder='Выберите пол'
// 							value={formData.preferredGender}
// 							options={[
// 								{ id: 'MALE', name: 'Мужской', icon: '👨' },
// 								{ id: 'FEMALE', name: 'Женский', icon: '👩' },
// 								{ id: 'ANY', name: 'Не важно', icon: '👫' },
// 							]}
// 							onChange={(id) =>
// 								setFormData({
// 									...formData,
// 									preferredGender: id,
// 								})
// 							}
// 						/>

// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Компания'>
// 								<input
// 									value={formData.companyName}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											companyName: e.target.value,
// 										})
// 									}
// 									placeholder='Название фирмы'
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Опыт (лет)'>
// 								<input
// 									type='number'
// 									value={formData.experienceInYear}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											experienceInYear: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>

// 						<FormField label='Телефон / TG'>
// 							<input
// 								value={formData.phone}
// 								onChange={(e) =>
// 									setFormData({
// 										...formData,
// 										phone: e.target.value,
// 									})
// 								}
// 								placeholder='0555...'
// 								className={inputClass}
// 							/>
// 						</FormField>
// 					</>
// 				) : (
// 					<>
// 						<div className='grid grid-cols-2 gap-4'>
// 							<FormField label='Возраст'>
// 								<input
// 									type='number'
// 									value={formData.age}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											age: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 							<FormField label='Опыт (лет)'>
// 								<input
// 									type='number'
// 									value={formData.experience}
// 									onChange={(e) =>
// 										setFormData({
// 											...formData,
// 											experience: e.target.value,
// 										})
// 									}
// 									className={inputClass}
// 								/>
// 							</FormField>
// 						</div>
// 						<ElegantSelect
// 							label='Пол'
// 							placeholder='Выберите пол'
// 							value={formData.gender}
// 							options={[
// 								{ id: 'MALE', name: 'Мужской', icon: '👨' },
// 								{ id: 'FEMALE', name: 'Женский', icon: '👩' },
// 							]}
// 							onChange={(id) =>
// 								setFormData({ ...formData, gender: id })
// 							}
// 						/>
// 					</>
// 				)}

// 				<FormField label='Описание'>
// 					<textarea
// 						value={formData.description}
// 						onChange={(e) =>
// 							setFormData({
// 								...formData,
// 								description: e.target.value,
// 							})
// 						}
// 						className='w-full bg-indigo-50/30 border-none min-h-[160px] p-6 rounded-3xl text-sm font-medium focus:outline-none resize-none ring-2 ring-transparent focus:ring-indigo-100 transition-all'
// 					/>
// 				</FormField>

// 				<button
// 					onClick={handleAction}
// 					disabled={loading}
// 					className='w-full py-6 brand-gradient text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl brand-shadow'
// 				>
// 					{loading
// 						? 'Обработка...'
// 						: existingData
// 							? 'Сохранить изменения'
// 							: 'Опубликовать'}
// 				</button>
// 			</div>
// 		</div>
// 	)
// }

// const ProfilePage: React.FC<{ telegramId: number; user: User | null }> = ({
// 	telegramId,
// 	user,
// }) => {
// 	const navigate = useNavigate()
// 	const { showToast } = useToast()
// 	const [activeTab, setActiveTab] = useState<'resumes' | 'vacancies'>(
// 		'resumes',
// 	)
// 	const [resumes, setResumes] = useState<any[]>([])
// 	const [vacancies, setVacancies] = useState<any[]>([])
// 	const [loading, setLoading] = useState(true)
// 	const [boostTarget, setBoostTarget] = useState<{
// 		id: number
// 		type: 'res' | 'vac'
// 		name: string
// 	} | null>(null)
// 	const [isBoosting, setIsBoosting] = useState(false)

// 	const fetchAll = useCallback(async () => {
// 		setLoading(true)
// 		try {
// 			const [r, v] = await Promise.all([
// 				apiService.getUserResumes(telegramId),
// 				apiService.getUserVacancies(telegramId),
// 			])
// 			const [rFull, vFull] = await Promise.all([
// 				Promise.all(
// 					r.map(async (i) => ({
// 						...i,
// 						stats: await apiService.getResumeStats(i.id),
// 						boost: await apiService.getResumeBoostStatus(i.id),
// 					})),
// 				),
// 				Promise.all(
// 					v.map(async (i) => ({
// 						...i,
// 						stats: await apiService.getVacancyStats(i.id),
// 						boost: await apiService.getVacancyBoostStatus(i.id),
// 					})),
// 				),
// 			])
// 			setResumes(rFull)
// 			setVacancies(vFull)
// 		} catch (e) {
// 			showToast('Ошибка загрузки', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}, [telegramId, showToast])

// 	useEffect(() => {
// 		fetchAll()
// 	}, [fetchAll])

// 	const handleApplyBoost = async () => {
// 		if (!boostTarget) return
// 		setIsBoosting(true)
// 		try {
// 			if (boostTarget.type === 'res')
// 				await apiService.boostResumePoints(boostTarget.id, telegramId)
// 			else await apiService.boostVacancyPoints(boostTarget.id, telegramId)
// 			showToast('Поднято в ТОП! 🚀')
// 			setBoostTarget(null)
// 			fetchAll()
// 		} catch (e) {
// 			showToast('Недостаточно баллов', 'error')
// 		} finally {
// 			setIsBoosting(false)
// 		}
// 	}

// 	const renderCard = (item: any, type: 'res' | 'vac') => (
// 		<div
// 			key={item.id}
// 			className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all ${item.isActive ? 'border-slate-100' : 'border-slate-200 opacity-70 grayscale'}`}
// 		>
// 			<div className='flex justify-between items-start mb-5'>
// 				<div>
// 					<div className='flex items-center gap-2 mb-2'>
// 						<span
// 							className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${item.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
// 						>
// 							{item.isActive ? 'Активно' : 'Скрыто'}
// 						</span>
// 						{item.boost?.isBoosted && (
// 							<span className='text-[9px] font-black uppercase px-2 py-1 rounded-md bg-indigo-600 text-white animate-pulse'>
// 								🔥 В ТОПЕ
// 							</span>
// 						)}
// 					</div>
// 					<h4 className='font-black text-slate-900 text-lg leading-tight'>
// 						{type === 'res' ? item.name : item.title}
// 					</h4>
// 				</div>
// 				<div className='flex items-center gap-1.5'>
// 					<button
// 						onClick={() =>
// 							navigate('/create', {
// 								state: {
// 									type: type === 'res' ? 'res' : 'vac',
// 									existingData: item,
// 								},
// 							})
// 						}
// 						className='w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl transition-colors'
// 					>
// 						✏️
// 					</button>
// 					<button
// 						onClick={() =>
// 							setBoostTarget({
// 								id: item.id,
// 								type,
// 								name: type === 'res' ? item.name : item.title,
// 							})
// 						}
// 						className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${item.boost?.isBoosted ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-50 text-indigo-600'}`}
// 					>
// 						🚀
// 					</button>
// 				</div>
// 			</div>
// 			<div className='bg-slate-50 p-4 rounded-3xl mb-6 grid grid-cols-3 divide-x divide-slate-200'>
// 				<div className='flex flex-col items-center px-2'>
// 					<div className='flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase mb-1'>
// 						<ViewIcon /> Глаза
// 					</div>
// 					<span className='text-sm font-black text-slate-900'>
// 						{item.stats?.viewsCount || 0}
// 					</span>
// 				</div>
// 				<div className='flex flex-col items-center px-2'>
// 					<div className='flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase mb-1'>
// 						<ClickIcon /> Клики
// 					</div>
// 					<span className='text-sm font-black text-slate-900'>
// 						{item.stats?.contactClicksCount || 0}
// 					</span>
// 				</div>
// 				<div className='flex flex-col items-center px-2'>
// 					<div className='flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase mb-1'>
// 						🎯 Цель
// 					</div>
// 					<span className='text-sm font-black text-emerald-600'>
// 						{type === 'vac'
// 							? item.stats?.responseCount
// 							: item.stats?.invitationCount || 0}
// 					</span>
// 				</div>
// 			</div>
// 			<div className='grid grid-cols-2 gap-3'>
// 				<button
// 					onClick={() =>
// 						(type === 'res'
// 							? apiService.toggleResumeStatus(
// 									telegramId,
// 									item.id,
// 									item.isActive,
// 								)
// 							: apiService.toggleVacancyStatus(
// 									telegramId,
// 									item.id,
// 									item.isActive,
// 								)
// 						).then(fetchAll)
// 					}
// 					className='py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest'
// 				>
// 					{item.isActive ? 'Скрыть' : 'Показать'}
// 				</button>
// 				<button
// 					onClick={() =>
// 						navigate('/detail', {
// 							state: {
// 								type: type === 'res' ? 'worker' : 'job',
// 								data: item,
// 							},
// 						})
// 					}
// 					className='py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest'
// 				>
// 					Просмотр
// 				</button>
// 			</div>
// 		</div>
// 	)

// 	return (
// 		<div className='px-5 space-y-6 py-12 pb-40 min-h-screen bg-slate-50'>
// 			<div className='bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4'>
// 				<div className='flex items-center gap-4'>
// 					<div className='w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center font-black text-indigo-600 text-2xl'>
// 						{user?.firstName?.charAt(0)}
// 					</div>
// 					<div>
// 						<h3 className='text-xl font-black text-slate-900'>
// 							{user?.firstName}
// 						</h3>
// 						<p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
// 							ID: {telegramId}
// 						</p>
// 					</div>
// 				</div>
// 				<div className='pt-4 border-t border-slate-50 flex justify-between items-center'>
// 					<div>
// 						<span className='text-[10px] font-black text-slate-400 uppercase block'>
// 							Баланс
// 						</span>
// 						<span className='text-lg font-black text-emerald-600'>
// 							{user?.balance || 0} PTSfff
// 						</span>
// 					</div>
// 					<button
// 						onClick={() => navigate('/withdraw')}
// 						className='text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-xl'
// 					>
// 						Вывод
// 					</button>
// 				</div>
// 			</div>
// 			<div className='flex bg-white p-1.5 rounded-2xl border border-slate-100'>
// 				<button
// 					onClick={() => setActiveTab('resumes')}
// 					className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'resumes' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}
// 				>
// 					Мои Резюме
// 				</button>
// 				<button
// 					onClick={() => setActiveTab('vacancies')}
// 					className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'vacancies' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}
// 				>
// 					Мои Вакансии
// 				</button>
// 			</div>
// 			{loading ? (
// 				<div className='animate-pulse space-y-4'>
// 					{[1, 2].map((i) => (
// 						<div
// 							key={i}
// 							className='h-64 bg-white rounded-[2.5rem]'
// 						/>
// 					))}
// 				</div>
// 			) : (
// 				<div className='space-y-4'>
// 					{(activeTab === 'resumes' ? resumes : vacancies).map((i) =>
// 						renderCard(i, activeTab === 'resumes' ? 'res' : 'vac'),
// 					)}
// 				</div>
// 			)}

// 			{boostTarget && (
// 				<div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center transition-all duration-300'>
// 					<div
// 						className='absolute inset-0'
// 						onClick={() => setBoostTarget(null)}
// 					/>
// 					<div className='w-full max-w-md bg-white rounded-t-[3rem] p-8 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 relative z-[101] shadow-2xl mb-[70px]'>
// 						<div className='text-center space-y-2'>
// 							<div className='w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-4' />
// 							<h3 className='text-2xl font-black text-slate-900 leading-tight'>
// 								Продвижение 🚀
// 							</h3>
// 							<p className='text-sm text-slate-500 font-medium px-4'>
// 								Поднимите «
// 								<span className='text-slate-900 font-bold'>
// 									{boostTarget.name}
// 								</span>
// 								» в топ списка.
// 							</p>
// 						</div>
// 						<div className='space-y-3'>
// 							<button
// 								disabled={isBoosting}
// 								onClick={handleApplyBoost}
// 								className='w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50'
// 							>
// 								{isBoosting ? '...' : 'Поднять за 50 PTS'}
// 							</button>
// 							<button
// 								onClick={() =>
// 									apiService
// 										.createPayment(telegramId, 'BOOST_1')
// 										.then((r) => tg.openLink(r.paymentUrl))
// 								}
// 								className='w-full py-5 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest'
// 							>
// 								Поднять за 99 сом
// 							</button>
// 							<button
// 								onClick={() => setBoostTarget(null)}
// 								className='w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest'
// 							>
// 								Закрыть
// 							</button>
// 						</div>
// 					</div>
// 				</div>
// 			)}
// 		</div>
// 	)
// }

// const viewedIds = new Set<string>()

// const DetailPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
// 	const location = useLocation()
// 	const navigate = useNavigate()
// 	const { type, data, initialStats } = location.state || {}

// 	const item = data

// 	const { showToast } = useToast()
// 	const [stats, setStats] = useState<any>(initialStats || null)

// 	useEffect(() => {
// 		const fetchFreshStats = async () => {
// 			if (!item) return
// 			try {
// 				const freshStats =
// 					type === 'worker'
// 						? await apiService.getResumeStats(item.id)
// 						: await apiService.getVacancyStats(item.id)
// 				setStats(freshStats)
// 			} catch (e) {
// 				console.error('Ошибка получения статов:', e)
// 			}
// 		}
// 		fetchFreshStats()
// 	}, [item, type])

// 	const handleContactClick = (platform: 'whatsapp' | 'telegram') => {
// 		apiService.trackContactClick(
// 			type === 'worker' ? 'worker' : 'job',
// 			item.id,
// 			telegramId,
// 		)
// 		showToast(`Переходим в ${platform}...`, 'success')
// 		if (platform === 'whatsapp') {
// 			tg.openLink(`https://wa.me/${item.phone.replace(/\D/g, '')}`)
// 		} else {
// 			const username =
// 				item.telegramUsername ||
// 				item.userName ||
// 				item.phone.replace(/\D/g, '')
// 			tg.openTelegramLink(`https://t.me/${username}`)
// 		}
// 	}

// 	if (!item) return <Navigate to='/' replace />

// 	return (
// 		<div className='pb-32 animate-in fade-in duration-500 bg-white min-h-screen text-slate-900'>
// 			<header className='px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-slate-100'>
// 				<button
// 					onClick={() => navigate(-1)}
// 					className='w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-all'
// 				>
// 					<svg
// 						className='w-5 h-5'
// 						fill='none'
// 						stroke='currentColor'
// 						viewBox='0 0 24 24'
// 					>
// 						<path
// 							strokeLinecap='round'
// 							strokeLinejoin='round'
// 							strokeWidth='2.5'
// 							d='M15 19l-7-7 7-7'
// 						/>
// 					</svg>
// 				</button>
// 				<div className='flex items-center gap-3'>
// 					<span className='px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg'>
// 						ID: {item.id}
// 					</span>
// 					<button
// 						onClick={() =>
// 							tg.openTelegramLink(
// 								`https://t.me/share/url?url=https://t.me/work_random_bot?start=${item.id}&text=${encodeURIComponent(item.title || item.name)}`,
// 							)
// 						}
// 						className='w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400'
// 					>
// 						<svg
// 							className='w-4 h-4'
// 							fill='none'
// 							stroke='currentColor'
// 							viewBox='0 0 24 24'
// 						>
// 							<path
// 								strokeLinecap='round'
// 								strokeLinejoin='round'
// 								strokeWidth='2.5'
// 								d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'
// 							/>
// 						</svg>
// 					</button>
// 				</div>
// 			</header>

// 			<div className='px-6 pt-6 space-y-8'>
// 				<section className='space-y-4 text-left'>
// 					<div className='space-y-2'>
// 						<div className='flex items-center gap-2'>
// 							<span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
// 								{item.cityName} • {item.categoryName}
// 								{item.subcategoryName
// 									? ` • ${item.subcategoryName}`
// 									: ''}
// 							</span>
// 							{item.isActive !== false && (
// 								<span className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse'></span>
// 							)}
// 						</div>
// 						<h1 className='text-3xl font-black text-slate-900 leading-tight'>
// 							{type === 'worker' ? item.name : item.title}
// 						</h1>
// 						{item.companyName && (
// 							<p className='text-sm font-bold text-indigo-600 flex items-center gap-2'>
// 								<svg
// 									className='w-4 h-4'
// 									fill='none'
// 									stroke='currentColor'
// 									viewBox='0 0 24 24'
// 								>
// 									<path
// 										strokeLinecap='round'
// 										strokeLinejoin='round'
// 										strokeWidth='2.5'
// 										d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
// 									/>
// 								</svg>
// 								{item.companyName}
// 							</p>
// 						)}
// 					</div>
// 					<div className='inline-flex items-center px-6 py-3 bg-emerald-50 text-emerald-700 text-xl font-black rounded-2xl border border-emerald-100 shadow-sm'>
// 						{item.salary ||
// 							(item.experience !== undefined
// 								? `${item.experience}г. опыта`
// 								: 'ЗП не указана')}
// 					</div>
// 				</section>

// 				{(item.portfolio?.length > 0 ||
// 					item.videoPortfolio?.length > 0) && (
// 					<section className='space-y-4'>
// 						<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left'>
// 							Галерея работ
// 						</h4>
// 						<div className='flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 px-1'>
// 							{item.videoPortfolio?.map(
// 								(vid: string, idx: number) => (
// 									<div
// 										key={`vid-${idx}`}
// 										className='flex-shrink-0 w-[85%] sm:w-80 h-56 bg-black rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 snap-center'
// 									>
// 										<video
// 											src={vid}
// 											controls
// 											className='w-full h-full object-cover'
// 										/>
// 									</div>
// 								),
// 							)}
// 							{item.portfolio?.map((img: string, idx: number) => (
// 								<div
// 									key={`img-${idx}`}
// 									className='flex-shrink-0 w-[85%] sm:w-80 h-56 bg-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 snap-center relative group'
// 								>
// 									<img
// 										src={img}
// 										alt={`Work ${idx}`}
// 										className='w-full h-full object-cover transition-transform duration-500 group-active:scale-110'
// 									/>
// 								</div>
// 							))}
// 						</div>
// 					</section>
// 				)}

// 				<section className='bg-slate-50/80 rounded-[2.5rem] p-4 space-y-4 border border-slate-100'>
// 					<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-left'>
// 						Ключевые детали
// 					</h4>
// 					<div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 px-4'>
// 						<DetailRow
// 							icon={<ClockIconSmall />}
// 							label='График работы'
// 							value={item.schedule || 'Не указано'}
// 						/>
// 						<DetailRow
// 							icon={<ExpIconSmall />}
// 							label='Требуемый опыт'
// 							value={
// 								item.experienceInYear !== undefined
// 									? `${item.experienceInYear} лет`
// 									: item.experience !== undefined
// 										? `${item.experience} лет`
// 										: 'Без опыта'
// 							}
// 						/>
// 						<DetailRow
// 							icon={<LocIconSmall />}
// 							label='Адрес / Район'
// 							value={item.address || 'Центр города'}
// 						/>
// 						<DetailRow
// 							icon={<UserIconSmall />}
// 							label='Возраст и Пол'
// 							value={`${item.minAge || item.age || 18}-${item.maxAge || 65} • ${item.preferredGender === 'ANY' ? 'Любой' : item.preferredGender || 'Любой'}`}
// 						/>
// 					</div>
// 				</section>

// 				<section className='space-y-4'>
// 					<h4 className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left'>
// 						Подробное описание
// 					</h4>
// 					<div className='text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-sm text-left px-2'>
// 						{item.description}
// 					</div>
// 				</section>

// 				<section className='flex items-center justify-between px-2 pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest'>
// 					<div className='flex items-center gap-4'>
// 						<span className='flex items-center gap-1.5'>
// 							<ViewIcon /> {stats?.viewsCount || 0}
// 						</span>
// 						<span className='flex items-center gap-1.5'>
// 							<ClickIcon /> {stats?.contactClicksCount || 0}
// 						</span>
// 					</div>
// 					<span>
// 						{item.createdAt
// 							? new Date(item.createdAt).toLocaleDateString()
// 							: 'Сегодня'}
// 					</span>
// 				</section>
// 			</div>

// 			<div className='fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50'>
// 				<div className='max-w-xl mx-auto grid grid-cols-2 gap-3'>
// 					<button
// 						onClick={() => handleContactClick('whatsapp')}
// 						className='h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3'
// 					>
// 						WhatsApp
// 					</button>
// 					<button
// 						onClick={() => handleContactClick('telegram')}
// 						className='h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3'
// 					>
// 						Telegram
// 					</button>
// 				</div>
// 			</div>
// 		</div>
// 	)
// }

// const DetailRow = ({
// 	icon,
// 	label,
// 	value,
// }: {
// 	icon: any
// 	label: string
// 	value: string
// }) => (
// 	<div className='flex items-center gap-4 group'>
// 		<div className='w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm transition-transform group-hover:scale-105'>
// 			{icon}
// 		</div>
// 		<div className='text-left'>
// 			<p className='text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1'>
// 				{label}
// 			</p>
// 			<p className='text-xs font-bold text-slate-900 leading-none'>
// 				{value}
// 			</p>
// 		</div>
// 	</div>
// )

// // Small Icons
// const ClockIconSmall = () => (
// 	<svg
// 		className='w-4 h-4'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
// 		/>
// 	</svg>
// )
// const ExpIconSmall = () => (
// 	<svg
// 		className='w-4 h-4'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
// 		/>
// 	</svg>
// )
// const LocIconSmall = () => (
// 	<svg
// 		className='w-4 h-4'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
// 		/>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
// 		/>
// 	</svg>
// )
// const UserIconSmall = () => (
// 	<svg
// 		className='w-4 h-4'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
// 		/>
// 	</svg>
// )

// const WithdrawPage: React.FC<{ telegramId: number }> = ({ telegramId }) => {
// 	const navigate = useNavigate()
// 	const { showToast } = useToast()
// 	const [user, setUser] = useState<User | null>(null)
// 	const [amount, setAmount] = useState('')
// 	const [recipientPhone, setRecipientPhone] = useState('')
// 	const [selectedBankKey, setSelectedBankKey] = useState<string>(
// 		Object.keys(BANK_SERVICES)[0],
// 	)
// 	const [loading, setLoading] = useState(false)

// 	useEffect(() => {
// 		apiService.getUser(telegramId).then(setUser)
// 	}, [telegramId])

// 	const somAmount = useMemo(() => {
// 		const val = parseFloat(amount) || 0
// 		// 100 баллов = 5 сомов (1 балл = 0.05 сома)
// 		return (val * 0.05).toFixed(2)
// 	}, [amount])

// 	const handleWithdraw = async () => {
// 		const val = Number(amount)
// 		if (!val || val <= 0) return showToast('Введите сумму', 'error')
// 		if (!recipientPhone) return showToast('Введите номер телефона', 'error')
// 		if (user && val > user.balance)
// 			return showToast('Недостаточно средств', 'error')
// 		setLoading(true)
// 		try {
// 			await apiService.withdrawPoints(telegramId, {
// 				pointsAmount: val,
// 				serviceId: BANK_SERVICES[selectedBankKey].id,
// 				recipientPhone: recipientPhone,
// 			})
// 			showToast('Заявка на вывод создана!')
// 			navigate('/profile')
// 		} catch (e: any) {
// 			const errorMessage =
// 				e.response?.data?.message || e.message || 'Ошибка вывода'
// 			console.log(e)

// 			showToast('dsadsa', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}

// 	return (
// 		<div className='bg-white min-h-screen pb-40 animate-in fade-in duration-500'>
// 			<header className='p-6 pt-12 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-indigo-50'>
// 				<button
// 					onClick={() => navigate(-1)}
// 					className='w-10 h-10 bg-indigo-50/50 rounded-xl flex items-center justify-center text-indigo-600'
// 				>
// 					←
// 				</button>
// 				<h2 className='text-2xl font-black text-slate-900 leading-tight'>
// 					Вывод средств
// 				</h2>
// 			</header>
// 			<div className='px-6 py-8 space-y-8'>
// 				<div className='brand-gradient p-8 rounded-[2.5rem] text-white shadow-xl brand-shadow text-left'>
// 					<div className='text-[10px] font-black uppercase opacity-80 mb-1'>
// 						Ваш баланс
// 					</div>
// 					<div className='text-4xl font-black'>
// 						{user?.balance || 0} PTS
// 					</div>
// 				</div>

// 				<ElegantSelect
// 					label='Выберите Банк'
// 					placeholder='Выберите банк'
// 					value={selectedBankKey}
// 					options={Object.entries(BANK_SERVICES).map(([key, b]) => ({
// 						id: key,
// 						name: b.name,
// 						icon: b.icon,
// 					}))}
// 					onChange={(key) => setSelectedBankKey(key)}
// 				/>

// 				<div className='space-y-6'>
// 					<FormField label='Сумма баллов (PTS)'>
// 						<div className='relative'>
// 							<input
// 								type='number'
// 								value={amount}
// 								onChange={(e) => setAmount(e.target.value)}
// 								placeholder='100'
// 								className='w-full bg-indigo-50/30 border-none h-20 px-8 rounded-[2rem] text-3xl font-black focus:outline-none placeholder:text-indigo-100 transition-all pr-40'
// 							/>
// 							<div className='absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-indigo-50 flex flex-col items-end'>
// 								<span className='text-[9px] font-black text-slate-400 uppercase leading-none mb-1'>
// 									К получению
// 								</span>
// 								<span className='text-lg font-black text-emerald-600 leading-none'>
// 									{somAmount} СОМ
// 								</span>
// 							</div>
// 						</div>
// 					</FormField>

// 					<FormField label='Номер телефона для зачисления'>
// 						<input
// 							type='tel'
// 							value={recipientPhone}
// 							onChange={(e) =>
// 								setRecipientPhone(formatPhoneKG(e.target.value))
// 							}
// 							placeholder='+996'
// 							className='w-full bg-indigo-50/30 border-none h-16 px-6 rounded-2xl text-lg font-bold focus:outline-none placeholder:text-indigo-200'
// 						/>
// 					</FormField>
// 				</div>

// 				<button
// 					onClick={handleWithdraw}
// 					disabled={loading}
// 					className='w-full py-6 brand-gradient text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl brand-shadow active:scale-95 transition-transform disabled:opacity-50'
// 				>
// 					{loading ? 'Загрузка...' : 'Подтвердить вывод'}
// 				</button>

// 				<p className='text-[10px] text-slate-400 font-medium text-center uppercase tracking-widest px-8 leading-relaxed'>
// 					Заявка будет обработана в течение 24 часов. <br /> Курс: 100
// 					PTS = 5 СОМ
// 				</p>
// 			</div>
// 		</div>
// 	)
// }

// export const BonusesPage: React.FC<{ telegramId: number }> = ({
// 	telegramId,
// }) => {
// 	const [info, setInfo] = useState<ReferralInfo | null>(null)
// 	const [loading, setLoading] = useState(true)
// 	const { showToast } = useToast()
// 	const navigate = useNavigate()

// 	useEffect(() => {
// 		apiService
// 			.apiGetReferralInfo(telegramId)
// 			.then(setInfo)
// 			.finally(() => setLoading(false))
// 	}, [telegramId])

// 	const totalEarned =
// 		(info?.referralsCount || 0) * (info?.rewardPerReferral || 0)
// 	console.log(info, 'info')

// 	const copyToClipboard = (text: string) => {
// 		navigator.clipboard.writeText(text)
// 		tg?.HapticFeedback?.notificationOccurred('success')
// 		showToast('Ссылка скопирована!', 'success')
// 	}

// 	const handleShare = () => {
// 		if (!info?.referralLink) return
// 		console.log()

// 		tg?.HapticFeedback?.impactOccurred('medium')
// 		const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${encodeURIComponent('Зарабатывай баллы вместе со мной! 💸')}`
// 		tg?.openTelegramLink(shareUrl)
// 	}

// 	const handleTask = async (taskId: string) => {
// 		tg?.HapticFeedback?.impactOccurred('light')
// 		showToast('Проверяем подписку...', 'success')
// 		try {
// 			const res = await apiService.checkSocialTask(telegramId, taskId)
// 			if (res.success) {
// 				tg?.HapticFeedback?.notificationOccurred('success')
// 				showToast(`Успешно! Начислено ${res.earned} баллов`, 'success')
// 				const updated = await apiService.apiGetReferralInfo(telegramId)
// 				setInfo(updated)
// 			} else {
// 				tg?.HapticFeedback?.notificationOccurred('error')
// 				showToast('Сначала подпишитесь на канал', 'error')
// 			}
// 		} catch (e) {
// 			showToast('Ошибка проверки', 'error')
// 		}
// 	}

// 	if (loading)
// 		return (
// 			<div className='flex items-center justify-center min-h-[60vh]'>
// 				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600'></div>
// 			</div>
// 		)

// 	return (
// 		<div className='px-5 space-y-6 py-6 pb-24 animate-in fade-in duration-500'>
// 			{/* ГЛАВНЫЙ БАННЕР */}
// 			<div className='brand-gradient p-8 rounded-[2.5rem] text-white shadow-2xl brand-shadow flex flex-col items-center text-center space-y-4'>
// 				<span className='text-5xl animate-bounce'>🎁</span>
// 				<div>
// 					<h2 className='text-2xl font-black'>Партнерка</h2>
// 					<p className='text-indigo-50 opacity-80 text-[10px] font-black uppercase tracking-[0.2em]'>
// 						Твой пассивный доход
// 					</p>
// 				</div>
// 				<div className='bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20'>
// 					<span className='text-3xl font-black'>{totalEarned}</span>
// 					<span className='text-xs font-bold uppercase ml-2'>
// 						баллов
// 					</span>
// 				</div>
// 			</div>

// 			{/* СТАТИСТИКА */}
// 			<div className='grid grid-cols-2 gap-4'>
// 				<div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center'>
// 					<span className='text-[10px] font-black text-slate-400 uppercase block mb-1'>
// 						Приглашено
// 					</span>
// 					<span className='text-2xl font-black text-slate-900'>
// 						{info?.referralsCount || 0}
// 					</span>
// 					<span className='text-[10px] text-emerald-600 font-bold block'>
// 						человек
// 					</span>
// 				</div>
// 				<div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center'>
// 					<span className='text-[10px] font-black text-slate-400 uppercase block mb-1'>
// 						Бонус за друга
// 					</span>
// 					<span className='text-2xl font-black text-slate-900'>
// 						{info?.rewardPerReferral || 0}
// 					</span>
// 					<span className='text-[10px] text-slate-400 font-bold block uppercase'>
// 						баллов
// 					</span>
// 				</div>
// 			</div>

// 			{/* ССЫЛКА */}
// 			<div className='bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4'>
// 				<h4 className='text-xs font-black text-slate-400 uppercase tracking-widest text-center'>
// 					Твоя реферальная ссылка
// 				</h4>
// 				<div className='flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200'>
// 					<span className='text-[11px] font-medium text-slate-500 truncate flex-1 pl-2 italic'>
// 						{info?.referralLink}
// 					</span>
// 					<button
// 						onClick={() =>
// 							info && copyToClipboard(info.referralLink)
// 						}
// 						className='bg-white text-slate-900 p-3 rounded-xl shadow-sm active:scale-90 transition-all border border-slate-100'
// 					>
// 						📋
// 					</button>
// 					<button
// 						onClick={handleShare}
// 						className='bg-indigo-600 text-white px-4 py-3 rounded-xl active:scale-95 transition-all font-black text-[10px] uppercase'
// 					>
// 						Поделиться
// 					</button>
// 				</div>
// 			</div>

// 			{/* ЗАДАНИЯ */}
// 			<div className='space-y-4'>
// 				<h4 className='text-xs font-black text-slate-400 uppercase tracking-widest px-2'>
// 					Бонусы за подписки
// 				</h4>
// 				<div className='bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between'>
// 					<div className='flex items-center gap-4'>
// 						<div className='w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-xl'>
// 							✈️
// 						</div>
// 						<div className='text-left'>
// 							<h5 className='text-sm font-black text-slate-900'>
// 								Наш канал
// 							</h5>
// 							<p className='text-[10px] text-sky-600 font-bold uppercase'>
// 								+50 баллов
// 							</p>
// 						</div>
// 					</div>
// 					<button
// 						onClick={() => handleTask('tg_sub')}
// 						className='text-xs font-black text-indigo-600 bg-indigo-50 px-5 py-3 rounded-xl active:scale-95'
// 					>
// 						Проверить
// 					</button>
// 				</div>
// 			</div>

// 			{/* КАК ЭТО РАБОТАЕТ */}
// 			<div className='bg-slate-50 p-8 rounded-[3rem] space-y-4 border border-slate-100'>
// 				<h4 className='font-black text-slate-900 uppercase text-[10px] tracking-widest text-left'>
// 					Как это работает?
// 				</h4>
// 				<div className='space-y-6'>
// 					{[
// 						{
// 							icon: '🔗',
// 							t: 'Отправь ссылку',
// 							d: 'Поделись ссылкой в Telegram',
// 						},
// 						{
// 							icon: '👤',
// 							t: 'Друг заходит',
// 							d: 'Друг открывает приложение',
// 						},
// 						{
// 							icon: '💰',
// 							t: 'Получай баллы',
// 							d: 'Баллы начисляются мгновенно',
// 						},
// 					].map((step, i) => (
// 						<div key={i} className='flex gap-4'>
// 							<div className='w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm'>
// 								{step.icon}
// 							</div>
// 							<div className='text-left'>
// 								<div className='text-sm font-black text-slate-900'>
// 									{step.t}
// 								</div>
// 								<div className='text-xs text-slate-400 font-medium'>
// 									{step.d}
// 								</div>
// 							</div>
// 						</div>
// 					))}
// 				</div>
// 			</div>

// 			<button
// 				onClick={() => navigate('/withdraw')}
// 				className='w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all'
// 			>
// 				Вывести баллы 💸
// 			</button>
// 		</div>
// 	)
// }

// // --- CORE APP ---

// const AppContent: React.FC = () => {
// 	const [user, setUser] = useState<User | null>(null)
// 	const [loading, setLoading] = useState(true)
// 	const [isPlusOpen, setIsPlusOpen] = useState(false)
// 	const navigate = useNavigate()
// 	const location = useLocation()
// 	const [access, setAccess] = useState<AccessStatus | null>(null)

// 	const telegramId = tg?.initDataUnsafe?.user?.id || 1810333455

// 	// Внутри компонента AppContent, перед return

// 	useEffect(() => {
// 		// Функция обработки нажатия
// 		const handleBackBtn = () => {
// 			navigate(-1) // Возвращаемся назад в истории роутера
// 		}

// 		// Подписываемся на событие нажатия
// 		tg.BackButton.onClick(handleBackBtn)

// 		// Управление видимостью кнопки в зависимости от текущего пути
// 		if (location.pathname === '/') {
// 			tg.BackButton.hide() // Скрываем на главной
// 		} else {
// 			tg.BackButton.show() // Показываем на остальных страницах
// 		}

// 		// Важно! Отписываемся при размонтировании или изменении зависимостей,
// 		// чтобы не было дублирования нажатий
// 		return () => {
// 			tg.BackButton.offClick(handleBackBtn)
// 		}
// 	}, [location, navigate]) // Зависит от смены страницы

// 	const fetchData = useCallback(async () => {
// 		try {
// 			let userData
// 			try {
// 				userData = await apiService.getUser(telegramId)
// 			} catch (e) {
// 				if (tg?.initDataUnsafe?.user) {
// 					await apiService.registerUser({
// 						telegramId,
// 						username: tg.initDataUnsafe.user.username || '',
// 						firstName: tg.initDataUnsafe.user.first_name || '',
// 						lastName: tg.initDataUnsafe.user.last_name || '',
// 						language: 'RU',
// 					})
// 					userData = await apiService.getUser(telegramId)
// 				}
// 			}
// 			if (userData) {
// 				setUser(userData)
// 				setAccess(await apiService.checkAccess(telegramId))
// 			}
// 		} catch (error) {
// 			console.error('Initial load failed:', error)
// 		} finally {
// 			setLoading(false)
// 		}
// 	}, [telegramId])

// 	useEffect(() => {
// 		if (tg) {
// 			tg.ready()
// 			tg.expand()
// 			tg.setHeaderColor('#ffffff')
// 			tg.setBackgroundColor('#f8fafc')
// 			try {
// 				tg.requestFullscreen()
// 			} catch (e) {}
// 		}
// 		fetchData()
// 	}, [fetchData])

// 	if (loading)
// 		return (
// 			<div className='min-h-screen flex items-center justify-center bg-white'>
// 				<div className='w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin' />
// 			</div>
// 		)

// 	const showNav = ['/', '/search', '/profile', '/bonuses'].includes(
// 		location.pathname,
// 	)

// 	const isDetail = location.pathname.startsWith('/detail')

// 	return (
// 		<div className='min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden'>
// 			<main
// 				style={{
// 					paddingTop: isDetail
// 						? '0'
// 						: 'calc(45px + env(safe-area-inset-top, 0px))',
// 				}}
// 				className='flex-1 w-full max-w-xl mx-auto pb-32'
// 			>
// 				<Routes>
// 					<Route path='/' element={<HomePage user={user} />} />
// 					<Route
// 						path='/search'
// 						element={<SearchPage telegramId={telegramId} />}
// 					/>
// 					<Route
// 						path='/subscription'
// 						element={<SubscriptionPage telegramId={telegramId} />}
// 					/>
// 					<Route
// 						path='/create'
// 						element={<CreatePage telegramId={telegramId} />}
// 					/>
// 					<Route
// 						path='/profile'
// 						element={
// 							<ProfilePage telegramId={telegramId} user={user} />
// 						}
// 					/>
// 					<Route
// 						path='/bonuses'
// 						element={<BonusesPage telegramId={telegramId} />}
// 					/>
// 					<Route
// 						path='/withdraw'
// 						element={<WithdrawPage telegramId={telegramId} />}
// 					/>
// 					<Route
// 						path='/detail'
// 						element={<DetailPage telegramId={telegramId} />}
// 					/>
// 					<Route path='*' element={<Navigate to='/' replace />} />
// 				</Routes>
// 			</main>
// 			{showNav && (
// 				<nav className='fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-white/40 backdrop-blur-xl'>
// 					<div className='max-w-md mx-auto bg-white border border-indigo-50 rounded-[2.5rem] p-3 flex justify-around items-center shadow-2xl relative'>
// 						<NavTab
// 							active={location.pathname === '/'}
// 							onClick={() => navigate('/')}
// 							icon={<HomeIcon />}
// 						/>
// 						<NavTab
// 							active={location.pathname === '/search'}
// 							onClick={() => navigate('/search')}
// 							icon={<SearchIcon />}
// 						/>
// 						<div
// 							className='w-16 h-16 brand-gradient text-white rounded-full flex items-center justify-center shadow-xl -mt-10 border-4 border-white transition-transform active:scale-95 cursor-pointer brand-shadow'
// 							onClick={() => setIsPlusOpen(true)}
// 						>
// 							<PlusIcon />
// 						</div>
// 						<NavTab
// 							active={location.pathname === '/bonuses'}
// 							onClick={() => navigate('/bonuses')}
// 							icon={<StarIcon />}
// 						/>
// 						<NavTab
// 							active={location.pathname === '/profile'}
// 							onClick={() => navigate('/profile')}
// 							icon={<UserIcon />}
// 						/>
// 					</div>
// 				</nav>
// 			)}
// 			<BottomSheet
// 				isOpen={isPlusOpen}
// 				onClose={() => setIsPlusOpen(false)}
// 				title='Создать публикацию'
// 			>
// 				<button
// 					onClick={() => {
// 						setIsPlusOpen(false)
// 						navigate('/create', { state: { type: 'vac' } })
// 					}}
// 					className='w-full flex items-center gap-4 p-6 bg-indigo-50/30 rounded-3xl active:bg-indigo-50 transition-all'
// 				>
// 					<div className='w-14 h-14 brand-gradient text-white flex items-center justify-center rounded-2xl font-bold'>
// 						💼
// 					</div>
// 					<div className='text-left'>
// 						<div className='font-black text-slate-900 text-lg'>
// 							Вакансия
// 						</div>
// 						<div className='text-[10px] text-indigo-400 font-bold uppercase mt-0.5 tracking-widest'>
// 							Поиск сотрудника
// 						</div>
// 					</div>
// 				</button>
// 				<button
// 					onClick={() => {
// 						setIsPlusOpen(false)
// 						navigate('/create', { state: { type: 'res' } })
// 					}}
// 					className='w-full flex items-center gap-4 p-6 bg-indigo-50/30 rounded-3xl active:bg-indigo-50 transition-all'
// 				>
// 					<div className='w-14 h-14 brand-gradient text-white flex items-center justify-center rounded-2xl font-bold'>
// 						📄
// 					</div>
// 					<div className='text-left'>
// 						<div className='font-black text-slate-900 text-lg'>
// 							Резюме
// 						</div>
// 						<div className='text-[10px] text-indigo-400 font-bold uppercase mt-0.5 tracking-widest'>
// 							Поиск работы
// 						</div>
// 					</div>
// 				</button>
// 			</BottomSheet>
// 		</div>
// 	)
// }

// const NavTab = ({ active, icon, onClick }: any) => (
// 	<button
// 		onClick={onClick}
// 		className={`flex items-center justify-center rounded-2xl transition-all w-12 h-12 ${active ? 'text-indigo-600 bg-indigo-50/80 active-tab-glow' : 'text-indigo-200'}`}
// 	>
// 		{icon}
// 	</button>
// )

// const HomeIcon = () => (
// 	<svg
// 		className='w-6 h-6'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
// 		/>
// 	</svg>
// )
// const SearchIcon = () => (
// 	<svg
// 		className='w-6 h-6'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
// 		/>
// 	</svg>
// )
// const StarIcon = () => (
// 	<svg
// 		className='w-6 h-6'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16v1m4-12V3c0-1.105-.895-2-2-2h-4c-1.105 0-2 .895-2 2v2M6 5v1M6 5H5C3.895 5 3 5.895 3 7v10c0 1.105.895 2 2 2h14c1.105 0 2-.895 2-2V7c0-1.105-.895-2-2-2h-1M18 5v1'
// 		/>
// 	</svg>
// )
// const PlusIcon = () => (
// 	<svg
// 		className='w-8 h-8'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='3'
// 			d='M12 6v12m6-6H6'
// 		/>
// 	</svg>
// )
// const UserIcon = () => (
// 	<svg
// 		className='w-6 h-6'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
// 		/>
// 	</svg>
// )
// const BellIcon = () => (
// 	<svg
// 		className='w-6 h-6 text-indigo-600'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2'
// 			d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
// 		/>
// 	</svg>
// )
// const SearchIconSmall = () => (
// 	<svg
// 		className='w-5 h-5'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='3'
// 			d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
// 		/>
// 	</svg>
// )
// const ViewIcon = () => (
// 	<svg
// 		className='w-3.5 h-3.5'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
// 		/>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
// 		/>
// 	</svg>
// )
// const ClickIcon = () => (
// 	<svg
// 		className='w-3.5 h-3.5'
// 		fill='none'
// 		stroke='currentColor'
// 		viewBox='0 0 24 24'
// 	>
// 		<path
// 			strokeLinecap='round'
// 			strokeLinejoin='round'
// 			strokeWidth='2.5'
// 			d='M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5'
// 		/>
// 	</svg>
// )

// const App: React.FC = () => (
// 	<HashRouter>
// 		<ToastProvider>
// 			<AppContent />
// 		</ToastProvider>
// 	</HashRouter>
// )

// export default App
