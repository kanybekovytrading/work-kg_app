import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SnakeGame } from './SnakeGame'
import { TetrisGame } from './TetrisGame'
import { TicTacToeGame } from './TicTacToe'
import { StackGame } from './StackGame'
import { SubwaySurferGame } from './SubwaySurferGame'
import { FlappyGame } from './FlappyGame'
import { DurakGame } from './DurakGame'

const tg = window.Telegram?.WebApp

export const GamesPage: React.FC = () => {
	const [currentGame, setCurrentGame] = useState<string | null>(null)
	const navigate = useNavigate()

	if (currentGame === 'stack')
		return <StackGame onBack={() => setCurrentGame(null)} />
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
		<div className='px-5 space-y-6 pb-32 animate-in fade-in duration-500'>
			<div className='bg-slate-900 p-8 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden'>
				<div className='absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/30 blur-3xl rounded-full'></div>
				<button
					onClick={() => navigate('/')}
					className='absolute top-6 left-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-90 transition-all'
				>
					←
				</button>
				<h2 className='text-3xl font-black italic tracking-tight mb-2 relative z-10 mt-4'>
					PLAY ZONE
				</h2>
				<p className='text-xs font-black text-indigo-300 uppercase tracking-[0.4em] relative z-10'>
					Отвлекись от работы
				</p>
			</div>

			<div className='space-y-4'>
				<GameCard
					title='FLAPPY KG'
					desc='Стань лучшим сотрудником'
					icon='🚀'
					color='bg-amber-500' // Оранжевый цвет для привлечения внимания
					onClick={() => setCurrentGame('flappy')}
				/>
				<GameCard
					title='RUN KG'
					desc='Уклоняйся от препятствий!'
					icon='🏃'
					color='bg-blue-600'
					onClick={() => setCurrentGame('surfer')}
				/>
				<GameCard
					title='STACK KG'
					desc='Построй башню'
					icon='🏗️'
					color='bg-rose-500'
					onClick={() => setCurrentGame('stack')}
				/>
				<GameCard
					title='ДУРАК KG'
					desc='Карточная классика'
					icon='🃏'
					color='bg-[#1a472a]' // Зеленый цвет сукна
					onClick={() => setCurrentGame('durak')}
				/>
				<GameCard
					title='ТЕТРИС'
					desc='Классика'
					icon='🧱'
					color='bg-purple-700'
					onClick={() => setCurrentGame('tetris')}
				/>
				<GameCard
					title='ЗМЕЙКА'
					desc='Ням-ням'
					icon='🐍'
					color='bg-emerald-600'
					onClick={() => setCurrentGame('snake')}
				/>
				<GameCard
					title='КРЕСТИКИ'
					desc='Игра с ботом'
					icon='❌'
					color='bg-slate-800'
					onClick={() => setCurrentGame('tictactoe')}
				/>
			</div>
		</div>
	)
}

function GameCard({ title, desc, icon, color, onClick }: any) {
	return (
		<div
			onClick={() => {
				onClick()
				tg?.HapticFeedback?.impactOccurred('medium')
			}}
			className={`${color} rounded-[2.5rem] p-6 text-white flex justify-between items-center shadow-xl active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden`}
		>
			<div className='absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-4 -mt-4'></div>
			<div className='flex items-center gap-5 relative z-10'>
				<div className='text-3xl bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm'>
					{icon}
				</div>
				<div>
					<h3 className='font-black text-xl leading-none uppercase italic tracking-tight'>
						{title}
					</h3>
					<p className='text-[10px] opacity-80 font-bold uppercase mt-1 tracking-widest'>
						{desc}
					</p>
				</div>
			</div>
			<div className='bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl backdrop-blur-md'>
				➜
			</div>
		</div>
	)
}
