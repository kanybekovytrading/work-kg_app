import React, { useState, useEffect, useCallback } from 'react'

const tg = window.Telegram?.WebApp

export const SnakeGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const size = 15
	const [snake, setSnake] = useState([{ x: 7, y: 7 }])
	const [food, setFood] = useState({ x: 5, y: 5 })
	const [dir, setDir] = useState({ x: 0, y: -1 })
	const [score, setScore] = useState(0)
	const [gameOver, setGameOver] = useState(false)

	const move = useCallback(() => {
		if (gameOver) return
		setSnake((prev) => {
			const head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y }
			if (
				head.x < 0 ||
				head.x >= size ||
				head.y < 0 ||
				head.y >= size ||
				prev.some((s) => s.x === head.x && s.y === head.y)
			) {
				setGameOver(true)
				tg?.HapticFeedback?.notificationOccurred('error')
				return prev
			}
			const newSnake = [head, ...prev]
			if (head.x === food.x && head.y === food.y) {
				setScore((s) => s + 1)
				tg?.HapticFeedback?.impactOccurred('medium')
				setFood({
					x: Math.floor(Math.random() * size),
					y: Math.floor(Math.random() * size),
				})
			} else newSnake.pop()
			return newSnake
		})
	}, [dir, food, gameOver, size])

	useEffect(() => {
		const i = setInterval(move, 200)
		return () => clearInterval(i)
	}, [move])

	return (
		<div className='min-h-screen bg-green-50 p-4 flex flex-col items-center fixed inset-0 z-[60] safe-area-pt overflow-hidden'>
			<button
				onClick={onBack}
				className='self-start text-green-800 font-black mb-4 bg-white px-4 py-2 rounded-xl shadow-sm'
			>
				← ВЫХОД
			</button>
			<div className='mb-4 bg-white px-8 py-2 rounded-2xl shadow-sm text-center font-black text-green-600'>
				<p className='text-[8px] opacity-40 uppercase'>Points</p>
				{score}
			</div>
			<div
				className='relative bg-gray-900 rounded-2xl border-8 border-gray-800 overflow-hidden shadow-2xl'
				style={{
					width: '300px',
					height: '300px',
					display: 'grid',
					gridTemplateColumns: `repeat(${size}, 1fr)`,
				}}
			>
				{Array.from({ length: size * size }).map((_, i) => {
					const x = i % size,
						y = Math.floor(i / size)
					const isS = snake.some((s) => s.x === x && s.y === y)
					const isF = food.x === x && food.y === y
					return (
						<div
							key={i}
							className={`${isS ? 'bg-green-500 rounded-sm' : isF ? 'bg-red-500 rounded-full animate-pulse' : ''} border border-white/5`}
						/>
					)
				})}
				{gameOver && (
					<div className='absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-in zoom-in'>
						<p className='text-red-500 font-black text-2xl mb-4 text-center'>
							GAME OVER
						</p>
						<button
							onClick={() => {
								setSnake([{ x: 7, y: 7 }])
								setScore(0)
								setGameOver(false)
							}}
							className='bg-green-600 text-white px-8 py-2 rounded-xl font-bold active:scale-95 transition-transform'
						>
							RETRY
						</button>
					</div>
				)}
			</div>
			<div className='mt-8 grid grid-cols-3 gap-3'>
				<div />
				<ControlBtn
					icon='▲'
					onClick={() => setDir({ x: 0, y: -1 })}
					color='bg-green-600 text-white'
				/>
				<div />
				<ControlBtn
					icon='◀'
					onClick={() => setDir({ x: -1, y: 0 })}
					color='bg-green-600 text-white'
				/>
				<ControlBtn
					icon='▼'
					onClick={() => setDir({ x: 0, y: 1 })}
					color='bg-green-600 text-white'
				/>
				<ControlBtn
					icon='▶'
					onClick={() => setDir({ x: 1, y: 0 })}
					color='bg-green-600 text-white'
				/>
			</div>
		</div>
	)
}

const ControlBtn = ({ icon, onClick, color }: any) => (
	<button
		onClick={(e) => {
			e.stopPropagation()
			onClick()
			tg?.HapticFeedback?.impactOccurred('light')
		}}
		className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center text-2xl shadow active:scale-90 transition-all font-black border-b-4 border-black/10`}
	>
		{icon}
	</button>
)
