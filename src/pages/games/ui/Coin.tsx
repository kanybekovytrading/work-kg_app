import React, { useState, useEffect, useRef, useCallback } from 'react'

// Настройки игры
const INNER_RADIUS = 80
const OUTER_RADIUS = 135
const PLAYER_SIZE = 24
const ROTATION_SPEED = 1.8

interface Entity {
	id: number
	angle: number
	orbit: 'inner' | 'outer'
}

const CorsairsGame: React.FC = () => {
	const [score, setScore] = useState(0)
	const [gameState, setGameState] = useState<
		'start' | 'playing' | 'gameover'
	>('start')
	const [playerOrbit, setPlayerOrbit] = useState<'inner' | 'outer'>('outer')
	const [rotation, setRotation] = useState(0)

	const [coins, setCoins] = useState<Entity[]>([])
	const [obstacles, setObstacles] = useState<Entity[]>([])

	const requestRef = useRef<number>(0)
	const rotationRef = useRef<number>(0)
	const lastSpawnRef = useRef<number>(0)

	// Спавн объектов
	const spawnObject = useCallback(() => {
		const isObstacle = Math.random() > 0.6
		const orbit = Math.random() > 0.5 ? 'inner' : 'outer'
		const angle = (rotationRef.current + 180 + Math.random() * 90) % 360

		const newObj = { id: Date.now(), angle, orbit }

		if (isObstacle) {
			setObstacles((prev) => [...prev.slice(-5), newObj])
		} else {
			setCoins((prev) => [...prev.slice(-10), newObj])
		}
	}, [])

	// Игровой цикл
	const update = useCallback(() => {
		if (gameState !== 'playing') return

		rotationRef.current = (rotationRef.current + ROTATION_SPEED) % 360
		setRotation(rotationRef.current)

		// Логика спавна каждые N градусов
		if (Math.abs(rotationRef.current - lastSpawnRef.current) > 40) {
			spawnObject()
			lastSpawnRef.current = rotationRef.current
		}

		// Проверка столкновений
		const checkCollision = (entities: Entity[], tolerance: number) => {
			return entities.find((ent) => {
				if (ent.orbit !== playerOrbit) return false
				const diff = Math.min(
					Math.abs(rotationRef.current - ent.angle),
					360 - Math.abs(rotationRef.current - ent.angle),
				)
				return diff < tolerance
			})
		}

		// Сбор монет
		const hitCoin = checkCollision(coins, 10)
		if (hitCoin) {
			setScore((s) => s + 1)
			setCoins((prev) => prev.filter((c) => c.id !== hitCoin.id))
		}

		// Столкновение с препятствием
		if (checkCollision(obstacles, 8)) {
			setGameState('gameover')
		}

		requestRef.current = requestAnimationFrame(update)
	}, [gameState, playerOrbit, coins, obstacles, spawnObject])

	useEffect(() => {
		requestRef.current = requestAnimationFrame(update)
		return () => cancelAnimationFrame(requestRef.current!)
	}, [update])

	const toggleOrbit = () => {
		if (gameState !== 'playing') {
			setScore(0)
			setCoins([])
			setObstacles([])
			setGameState('playing')
			return
		}
		setPlayerOrbit((prev) => (prev === 'inner' ? 'outer' : 'inner'))
	}

	const getPos = (angle: number, orbit: 'inner' | 'outer') => {
		const r = orbit === 'inner' ? INNER_RADIUS : OUTER_RADIUS
		const rad = (angle - 90) * (Math.PI / 180)
		return {
			x: Math.cos(rad) * r,
			y: Math.sin(rad) * r,
		}
	}

	return (
		<div className='fixed inset-0 bg-[#e0f7fa] flex flex-col items-center justify-center font-sans select-none touch-none overflow-hidden'>
			{/* Шапка */}
			<div className='absolute top-10 w-full max-w-xs flex justify-between px-6 items-center'>
				<div className='text-gray-600 font-bold uppercase tracking-widest text-sm'>
					Level 1
				</div>
				<div className='flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full shadow-sm'>
					<span className='text-xl font-black text-gray-800'>
						{score}
					</span>
					<div className='w-4 h-4 bg-yellow-400 border-2 border-yellow-600 rounded-full' />
				</div>
			</div>

			{/* Игровое поле */}
			<div className='relative w-[320px] h-[320px] flex items-center justify-center'>
				{/* Декоративные круги (пути) */}
				<div className='absolute w-[160px] h-[160px] border border-black/5 rounded-full' />
				<div className='absolute w-[270px] h-[270px] border border-black/5 rounded-full' />

				{/* Центральный остров */}
				<div className='absolute w-32 h-32 bg-[#ffcc80] rounded-full shadow-inner flex items-center justify-center z-10 border-4 border-[#f0b26a]'>
					<div className='flex flex-col items-center'>
						<div className='w-8 h-8 bg-gray-400 rounded-sm rotate-45 mb-1 shadow-md border-2 border-gray-500 flex items-center justify-center'>
							<div className='w-2 h-2 bg-gray-600 rounded-full' />
						</div>
						<span className='text-[#5d4037] font-black text-sm uppercase tracking-tighter'>
							work kg
						</span>
					</div>
				</div>

				{/* Монеты */}
				{coins.map((coin) => {
					const pos = getPos(coin.angle, coin.orbit)
					return (
						<div
							key={coin.id}
							className='absolute w-4 h-4 bg-yellow-400 border-2 border-yellow-600 rounded-full z-20'
							style={{
								transform: `translate(${pos.x}px, ${pos.y}px)`,
							}}
						/>
					)
				})}

				{/* Препятствия */}
				{obstacles.map((obs) => {
					const pos = getPos(obs.angle, obs.orbit)
					return (
						<div
							key={obs.id}
							className='absolute w-6 h-6 bg-gray-500 rounded-full z-20 border-b-4 border-gray-700 shadow-sm'
							style={{
								transform: `translate(${pos.x}px, ${pos.y}px)`,
							}}
						/>
					)
				})}

				{/* Игрок (Корабль) */}
				<div
					className='absolute z-30 transition-all duration-150 ease-out'
					style={{
						transform: `translate(${getPos(rotation, playerOrbit).x}px, ${getPos(rotation, playerOrbit).y}px) rotate(${rotation}deg)`,
					}}
				>
					<div
						className='w-6 h-8 bg-slate-800'
						style={{
							clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
						}}
					/>
				</div>

				{/* Game Over Overlay */}
				{gameState === 'gameover' && (
					<div className='absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center'>
						<h2 className='text-2xl font-black text-red-600'>
							CRASHED!
						</h2>
						<p className='text-gray-600 font-bold'>
							Score: {score}
						</p>
						<button
							onClick={toggleOrbit}
							className='mt-2 text-blue-500 font-bold underline'
						>
							Try Again
						</button>
					</div>
				)}
			</div>

			{/* Кнопка управления */}
			<button
				onMouseDown={toggleOrbit}
				className='mt-20 w-28 h-28 bg-[#ffca28] rounded-full shadow-[0_8px_0_#f57f17] active:shadow-none active:translate-y-2 flex items-center justify-center transition-all outline-none group'
			>
				<div className='bg-white/30 p-4 rounded-full group-active:scale-90 transition-transform'>
					<svg
						className='w-12 h-12 text-white'
						viewBox='0 0 24 24'
						fill='currentColor'
					>
						<path d='M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z' />
					</svg>
				</div>
			</button>

			{/* Инструкция */}
			{gameState === 'start' && (
				<div className='absolute bottom-10 text-gray-400 font-medium animate-bounce'>
					Tap button to START and SWITCH orbits
				</div>
			)}
		</div>
	)
}

export default CorsairsGame
