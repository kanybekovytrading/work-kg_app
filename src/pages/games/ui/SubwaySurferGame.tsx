import React, { useState, useEffect } from 'react'

const tg = window.Telegram?.WebApp

export const SubwaySurferGame: React.FC<{ onBack: () => void }> = ({
	onBack,
}) => {
	const [lane, setLane] = useState(0)
	const [obstacles, setObstacles] = useState<any[]>([])
	const [score, setScore] = useState(0)
	const [speed, setSpeed] = useState(1.5)
	const [gameOver, setGameOver] = useState(false)

	useEffect(() => {
		if (gameOver) return
		const gameLoop = setInterval(() => {
			setObstacles((prev) => {
				let nextObstacles = prev
					.map((obs) => ({ ...obs, y: obs.y + speed }))
					.filter((obs) => obs.y < 120)
				if (Math.random() < 0.05 && nextObstacles.length < 5) {
					const newLane = Math.floor(Math.random() * 3) - 1
					if (
						!nextObstacles.some(
							(o) => o.y < 15 && o.lane === newLane,
						)
					) {
						const type = Math.random() > 0.3 ? 'barrier' : 'coin'
						nextObstacles.push({
							lane: newLane,
							y: -20,
							type,
							id: Date.now() + Math.random(),
						})
					}
				}
				return nextObstacles
			})
			setScore((s) => s + 1)
			setSpeed((s) => Math.min(s + 0.001, 3.5))
		}, 20)
		return () => clearInterval(gameLoop)
	}, [gameOver, speed])

	useEffect(() => {
		if (gameOver) return
		obstacles.forEach((obs) => {
			if (obs.y > 75 && obs.y < 95 && obs.lane === lane) {
				if (obs.type === 'barrier') {
					setGameOver(true)
					tg?.HapticFeedback?.notificationOccurred('error')
				} else if (obs.type === 'coin' && !obs.collected) {
					obs.collected = true
					setScore((s) => s + 500)
					tg?.HapticFeedback?.impactOccurred('light')
				}
			}
		})
	}, [obstacles, lane, gameOver])

	const move = (dir: number) => {
		if (gameOver) return
		const next = lane + dir
		if (next >= -1 && next <= 1) {
			setLane(next)
			tg?.HapticFeedback?.impactOccurred('medium')
		}
	}

	return (
		<div className='min-h-screen bg-sky-300 relative overflow-hidden flex flex-col items-center touch-none fixed inset-0 z-[60]'>
			<div className='absolute top-4 left-4 right-4 z-20 flex justify-between items-start safe-area-pt'>
				<button
					onClick={onBack}
					className='bg-white/90 px-4 py-2 rounded-xl font-black text-blue-600 shadow-lg'
				>
					ВЫХОД
				</button>
				<div className='bg-yellow-400 px-6 py-2 rounded-2xl border-b-4 border-yellow-600 shadow-xl'>
					<p className='text-yellow-900 font-black text-xl'>
						{Math.floor(score / 10)}m
					</p>
				</div>
			</div>
			<div className='w-full h-full absolute top-0 flex items-end justify-center perspective-[500px] overflow-hidden bg-gradient-to-b from-sky-300 to-green-100'>
				<div className='w-[600px] h-[200%] bg-gray-600 relative origin-bottom transform-3d rotate-x-[60deg] flex justify-center border-l-8 border-r-8 border-white/20'>
					<div className='absolute inset-y-0 left-1/3 w-2 bg-dashed border-r-2 border-white/30 h-full'></div>
					<div className='absolute inset-y-0 right-1/3 w-2 bg-dashed border-l-2 border-white/30 h-full'></div>
					<div
						className='absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.1)_50%)] bg-[length:100%_100px] animate-[slide_1s_linear_infinite]'
						style={{ animationDuration: `${1 / speed}s` }}
					></div>
				</div>
			</div>
			<div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
				<div className='w-[300px] h-full relative'>
					{obstacles.map((obs) => {
						if (obs.collected) return null
						const scale = 0.5 + (obs.y / 100) * 0.5
						const opacity = obs.y < 0 ? 0 : 1
						const perspectiveOffset =
							obs.lane * 100 * (0.5 + obs.y / 200)
						return (
							<div
								key={obs.id}
								className='absolute transition-transform duration-[20ms] will-change-transform flex items-center justify-center'
								style={{
									top: `${obs.y}%`,
									left: `50%`,
									width: '80px',
									height: '80px',
									transform: `translate(-50%, -50%) translate(${perspectiveOffset}px, 0) scale(${scale})`,
									opacity: opacity,
									zIndex: Math.floor(obs.y),
								}}
							>
								{obs.type === 'barrier' ? (
									<div className='w-full h-full bg-red-500 rounded-lg border-4 border-white shadow-xl flex items-center justify-center text-4xl'>
										🚧
									</div>
								) : (
									<div className='w-2/3 h-2/3 bg-yellow-400 rounded-full border-4 border-yellow-200 shadow-[0_0_20px_gold] animate-spin-slow flex items-center justify-center text-2xl'>
										🪙
									</div>
								)}
							</div>
						)
					})}
					<div
						className='absolute bottom-[10%] left-1/2 w-20 h-24 transition-all duration-200 ease-out z-50 flex flex-col items-center'
						style={{
							transform: `translateX(-50%) translateX(${lane * 100}px)`,
						}}
					>
						<div className='text-6xl animate-bounce drop-shadow-2xl filter'>
							🏃
						</div>
						<div className='w-12 h-3 bg-black/20 rounded-full blur-sm mt-[-5px]'></div>
					</div>
				</div>
			</div>
			{gameOver && (
				<div className='absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300'>
					<h2 className='text-5xl font-black text-white mb-2 italic transform -skew-x-12'>
						CRASHED!
					</h2>
					<div className='text-yellow-400 text-2xl font-bold mb-8'>
						Score: {Math.floor(score / 10)}m
					</div>
					<button
						onClick={() => {
							setGameOver(false)
							setScore(0)
							setObstacles([])
							setSpeed(1.5)
							setLane(0)
						}}
						className='bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full font-black text-xl shadow-[0_10px_0_rgb(29,78,216)] active:shadow-none active:translate-y-[10px] transition-all'
					>
						TRY AGAIN
					</button>
				</div>
			)}
			<div className='absolute inset-0 z-10 grid grid-cols-2'>
				<div
					className='h-full active:bg-white/5'
					onClick={() => move(-1)}
				/>
				<div
					className='h-full active:bg-white/5'
					onClick={() => move(1)}
				/>
			</div>
		</div>
	)
}
