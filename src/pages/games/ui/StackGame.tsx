import React, { useState, useEffect } from 'react'

const tg = window.Telegram?.WebApp

export const StackGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const [score, setScore] = useState(0)
	const [gameOver, setGameOver] = useState(false)
	const [blocks, setBlocks] = useState([{ width: 80, x: 10 }])
	const [currentX, setCurrentX] = useState(0)
	const [direction, setDirection] = useState(1)
	const [isPlaying, setIsPlaying] = useState(false)

	useEffect(() => {
		if (!isPlaying || gameOver) return
		const interval = setInterval(() => {
			setCurrentX((x) => {
				if (x >= 100 - blocks[blocks.length - 1].width) setDirection(-1)
				if (x <= 0) setDirection(1)
				return x + direction * 2.5
			})
		}, 20)
		return () => clearInterval(interval)
	}, [isPlaying, gameOver, direction, blocks])

	const handleStack = () => {
		if (gameOver) return
		if (!isPlaying) {
			setIsPlaying(true)
			return
		}
		const lastBlock = blocks[blocks.length - 1]
		const prevBlock = blocks[blocks.length - 2] || { x: 0, width: 100 }
		const diff = currentX - prevBlock.x
		const newWidth = lastBlock.width - Math.abs(diff)

		if (newWidth <= 0) {
			setGameOver(true)
			tg?.HapticFeedback?.notificationOccurred('error')
		} else {
			tg?.HapticFeedback?.impactOccurred('medium')
			setScore((s) => s + 1)
			setBlocks([
				...blocks,
				{ width: newWidth, x: diff > 0 ? currentX : prevBlock.x },
			])
			setCurrentX(0)
		}
	}

	return (
		<div
			className='min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center overflow-hidden fixed inset-0 z-[60] safe-area-pt'
			onClick={handleStack}
		>
			<button
				onClick={(e) => {
					e.stopPropagation()
					onBack()
				}}
				className='self-start text-pink-400 font-black mb-10'
			>
				← ВЫХОД
			</button>
			<div className='text-center mb-8'>
				<p className='text-6xl font-black mb-2'>{score}</p>
				<p className='opacity-50 text-[10px] font-bold uppercase tracking-widest'>
					Stack Height
				</p>
			</div>
			<div className='relative w-full max-w-[250px] h-[400px] bg-slate-800/50 rounded-3xl border-4 border-slate-700 flex flex-col-reverse p-2 overflow-hidden shadow-2xl'>
				{blocks.map((b, i) => (
					<div
						key={i}
						className='h-8 rounded-md mb-1 shadow-lg'
						style={{
							width: `${b.width}%`,
							marginLeft: `${b.x}%`,
							backgroundColor: `hsl(${200 + i * 12}, 70%, 60%)`,
						}}
					/>
				))}
				{!gameOver && isPlaying && (
					<div
						className='h-8 bg-white rounded-md absolute shadow-[0_0_20px_white]'
						style={{
							width: `${blocks[blocks.length - 1].width}%`,
							left: `${currentX + 4}%`,
							bottom: `${blocks.length * 36 + 8}px`,
						}}
					/>
				)}
				{!isPlaying && !gameOver && (
					<div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
						<p className='font-black text-xl animate-pulse text-white drop-shadow-lg'>
							ТАПНИ ДЛЯ СТАРТА
						</p>
					</div>
				)}
				{gameOver && (
					<div className='absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center animate-in zoom-in backdrop-blur-sm'>
						<p className='text-4xl font-black mb-4'>GAME OVER</p>
						<button
							onClick={(e) => {
								e.stopPropagation()
								setBlocks([{ width: 80, x: 10 }])
								setScore(0)
								setGameOver(false)
								setIsPlaying(false)
							}}
							className='bg-white text-red-600 px-10 py-3 rounded-2xl font-black shadow-xl active:scale-95 transition-transform'
						>
							ЗАНОВО
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
