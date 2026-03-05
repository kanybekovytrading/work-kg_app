import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SnakeGame } from './SnakeGame'
import { TetrisGame } from './TetrisGame'
import { TicTacToeGame } from './TicTacToe'
import { StackGame } from './StackGame'
import { SubwaySurferGame } from './SubwaySurferGame'
import { FlappyGame } from './FlappyGame'
import { DurakGame } from './DurakGame'
import CorsairsGame from './Coin' // Исправил импорт, предполагая, что это одна игра

const tg = window.Telegram?.WebApp

export const GamesPage: React.FC = () => {
	const [currentGame, setCurrentGame] = useState<string | null>(null)
	const navigate = useNavigate()

	// Обработка кнопки "Назад" в самом Telegram (опционально)
	useEffect(() => {
		if (currentGame) {
			tg?.BackButton.show()
			tg?.BackButton.onClick(() => setCurrentGame(null))
		} else {
			tg?.BackButton.hide()
		}
		return () => {
			tg?.BackButton.offClick(() => setCurrentGame(null))
		}
	}, [currentGame])

	// Рендер активной игры
	if (currentGame === 'stack')
		return <StackGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'coin') return <CorsairsGame />
	if (currentGame === 'tetris')
		return <TetrisGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'snake')
		return <SnakeGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'tictactoe')
		return <TicTacToeGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'surfer')
		return <SubwaySurferGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'flappy')
		return <FlappyGame onBack={() => setCurrentGame(null)} />
	if (currentGame === 'durak')
		return <DurakGame onBack={() => setCurrentGame(null)} />

	return (
		<div className='min-h-screen bg-slate-50 pb-32 animate-in fade-in duration-500'>
			{/* Header */}
			<div className='bg-white px-5 pt-6 pb-6 rounded-b-[2.5rem] shadow-sm mb-6 relative z-20'>
				<div className='flex items-center justify-between mb-4'>
					<button
						onClick={() => navigate('/')}
						className='w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-90 transition-transform'
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
					<div className='flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full'>
						<span className='w-2 h-2 bg-indigo-500 rounded-full animate-pulse'></span>
						<span className='text-[10px] font-black text-indigo-500 uppercase tracking-wider'>
							Online
						</span>
					</div>
				</div>
				<h2 className='text-3xl font-black text-slate-900 leading-tight'>
					Игровая
					<br />
					<span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600'>
						Зона
					</span>{' '}
					🎮
				</h2>
				<p className='text-xs font-bold text-slate-400 uppercase tracking-widest mt-2'>
					Выбирай и побеждай
				</p>
			</div>

			{/* Content Grid */}
			<div className='px-4 grid grid-cols-2 gap-3'>
				{/* Featured / Large Cards */}
				<GameCard
					title='COIN FLIP'
					desc='Испытай удачу'
					icon='🪙'
					gradient='bg-gradient-to-br from-amber-400 to-orange-600'
					onClick={() => setCurrentGame('coin')}
					isWide
					badge='HOT'
				/>

				<GameCard
					title='Дурак'
					desc='Онлайн'
					icon='🃏'
					gradient='bg-gradient-to-br from-emerald-600 to-teal-800'
					onClick={() => setCurrentGame('durak')}
					isWide
				/>

				{/* Standard Cards */}
				<GameCard
					title='Subway'
					desc='Беги!'
					icon='🏃'
					gradient='bg-gradient-to-br from-blue-500 to-indigo-600'
					onClick={() => setCurrentGame('surfer')}
				/>

				<GameCard
					title='Flappy'
					desc='Лети!'
					icon='🚀'
					gradient='bg-gradient-to-br from-cyan-400 to-blue-500'
					onClick={() => setCurrentGame('flappy')}
				/>

				<GameCard
					title='Stack'
					desc='Строитель'
					icon='🏗️'
					gradient='bg-gradient-to-br from-rose-400 to-pink-600'
					onClick={() => setCurrentGame('stack')}
				/>

				<GameCard
					title='Тетрис'
					desc='Классика'
					icon='🧱'
					gradient='bg-gradient-to-br from-purple-500 to-violet-700'
					onClick={() => setCurrentGame('tetris')}
				/>

				<GameCard
					title='Змейка'
					desc='Ням-ням'
					icon='🐍'
					gradient='bg-gradient-to-br from-lime-500 to-green-600'
					onClick={() => setCurrentGame('snake')}
				/>

				<GameCard
					title='X / O'
					desc='Логика'
					icon='❌'
					gradient='bg-gradient-to-br from-slate-600 to-slate-800'
					onClick={() => setCurrentGame('tictactoe')}
				/>
			</div>
		</div>
	)
}

// Компонент карточки игры
interface GameCardProps {
	title: string
	desc: string
	icon: string
	gradient: string
	onClick: () => void
	isWide?: boolean
	badge?: string
}

function GameCard({
	title,
	desc,
	icon,
	gradient,
	onClick,
	isWide,
	badge,
}: GameCardProps) {
	return (
		<button
			onClick={() => {
				tg?.HapticFeedback?.impactOccurred('light')
				onClick()
			}}
			className={`
        relative overflow-hidden rounded-[2rem] text-left transition-all duration-300
        active:scale-[0.96] shadow-lg shadow-indigo-100 hover:shadow-xl
        ${isWide ? 'col-span-2 p-6 h-32' : 'col-span-1 p-5 h-40'}
        ${gradient}
      `}
		>
			{/* Декоративные элементы */}
			<div className='absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6'></div>
			<div className='absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full blur-xl -ml-4 -mb-4'></div>

			{badge && (
				<div className='absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10'>
					<span className='text-[9px] font-black text-white uppercase tracking-widest'>
						{badge}
					</span>
				</div>
			)}

			<div className='relative z-10 flex flex-col h-full justify-between'>
				<div
					className={`
            bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner text-2xl
            ${isWide ? 'w-12 h-12' : 'w-10 h-10 mb-2'}
          `}
				>
					{icon}
				</div>

				<div>
					<h3 className='font-black text-white text-lg leading-tight tracking-tight uppercase'>
						{title}
					</h3>
					<p className='text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5'>
						{desc}
					</p>
				</div>
			</div>

			{/* Кнопка Play (визуальная) */}
			{isWide && (
				<div className='absolute bottom-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-lg active:scale-90 transition-transform'>
					<svg
						className='w-4 h-4 ml-0.5'
						fill='currentColor'
						viewBox='0 0 24 24'
					>
						<path d='M8 5v14l11-7z' />
					</svg>
				</div>
			)}
		</button>
	)
}
