import { LocationContext } from '../../App'
import { useContext } from 'react'

export const GeoPromoCard: React.FC = () => {
	const { location, requestLocation, isDenied, openSettings } =
		useContext(LocationContext)

	if (location) return null // Если локация уже есть, не показываем

	return (
		<div className='px-6 mb-6'>
			<div className='bg-red-50 border-2 border-red-100 p-6 rounded-[2.5rem] relative overflow-hidden shadow-sm'>
				<div className='relative z-10 flex flex-col gap-3'>
					<div className='flex items-center gap-3'>
						<div className='w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm'>
							📍
						</div>
						<div className='text-left'>
							<h4 className='text-lg font-black text-slate-900 leading-tight'>
								Найти работу рядом?
							</h4>
							<p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
								Покажем вакансии в вашем районе
							</p>
						</div>
					</div>

					<button
						onClick={isDenied ? openSettings : requestLocation}
						className='w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] active:scale-[0.98] transition-all'
					>
						{isDenied
							? 'Открыть настройки'
							: 'Поделиться геолокацией'}
					</button>
				</div>
				{/* Декор */}
				<div className='absolute -right-4 -bottom-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl'></div>
			</div>
		</div>
	)
}
