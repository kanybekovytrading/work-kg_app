// import { apiService } from '@/apiService'
// import { useState } from 'react'

// export const BoostModal: React.FC<{
// 	isOpen: boolean
// 	onClose: () => void
// 	id: number
// 	type: 'res' | 'vac'
// 	tid: number
// 	onSuccess: () => void
// }> = ({ isOpen, onClose, id, type, tid, onSuccess }) => {
// 	const { showToast } = useToast()
// 	const [loading, setLoading] = useState(false)

// 	if (!isOpen) return null

// 	const handleBoost = async (method: 'points' | 'money') => {
// 		setLoading(true)
// 		tg?.HapticFeedback?.impactOccurred('medium')
// 		try {
// 			if (type === 'vac') {
// 				if (method === 'points')
// 					await apiService.boostVacancyPoints(id, tid)
// 				else {
// 					const res = await apiService.boostVacancyMoney(id, tid)
// 					if (res.paymentUrl) tg.openLink(res.paymentUrl)
// 				}
// 			} else {
// 				if (method === 'points')
// 					await apiService.boostResumePoints(id, tid)
// 				else {
// 					const res = await apiService.boostResumeMoney(id, tid)
// 					if (res.paymentUrl) tg.openLink(res.paymentUrl)
// 				}
// 			}
// 			showToast('Заявка на подъем принята! 🚀', 'success')
// 			onSuccess()
// 			onClose()
// 		} catch (e) {
// 			showToast('Ошибка при активации', 'error')
// 		} finally {
// 			setLoading(false)
// 		}
// 	}

// 	return (
// 		<div className='fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4'>
// 			<div
// 				className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
// 				onClick={onClose}
// 			/>
// 			<div className='relative w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-12 sm:pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl'>
// 				<div className='w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 sm:hidden' />
// 				<div className='text-center space-y-3 mb-8'>
// 					<div className='w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce'>
// 						🚀
// 					</div>
// 					<h3 className='text-2xl font-black text-slate-900'>
// 						Поднять в топ
// 					</h3>
// 					<p className='text-slate-500 font-medium text-sm'>
// 						Ваше объявление будет первым в результатах поиска на 24
// 						часа. Это даст в 5 раз больше просмотров!
// 					</p>
// 				</div>

// 				<div className='space-y-4'>
// 					<button
// 						onClick={() => handleBoost('points')}
// 						disabled={loading}
// 						className='w-full flex items-center justify-between p-5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50'
// 					>
// 						<div className='flex items-center gap-3'>
// 							<span className='text-2xl'>🎁</span>
// 							<div className='text-left'>
// 								<div className='font-black leading-tight'>
// 									За баллы
// 								</div>
// 								<div className='text-[10px] font-bold opacity-80 uppercase tracking-widest'>
// 									200 баллов / 24ч
// 								</div>
// 							</div>
// 						</div>
// 						<span className='font-black text-xl'>→</span>
// 					</button>

// 					<button
// 						onClick={() => handleBoost('money')}
// 						disabled={loading}
// 						className='w-full flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-3xl text-slate-900 active:bg-slate-50 active:scale-95 transition-all disabled:opacity-50'
// 					>
// 						<div className='flex items-center gap-3'>
// 							<span className='text-2xl'>💵</span>
// 							<div className='text-left'>
// 								<div className='font-black leading-tight'>
// 									За деньги
// 								</div>
// 								<div className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
// 									20 сом / 24ч
// 								</div>
// 							</div>
// 						</div>
// 						<span className='font-black text-xl'>→</span>
// 					</button>
// 				</div>

// 				<button
// 					onClick={onClose}
// 					className='w-full mt-6 text-slate-400 text-sm font-bold uppercase tracking-widest'
// 				>
// 					Отмена
// 				</button>
// 			</div>
// 		</div>
// 	)
// }
