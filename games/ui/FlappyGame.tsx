import React, { useEffect, useRef, useState } from 'react'

const tg = window.Telegram?.WebApp

export const FlappyGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [score, setScore] = useState(0)
	const [gameOver, setGameOver] = useState(false)
	const [gameStarted, setGameStarted] = useState(false)

	// Настройки игры
	const GRAVITY = 0.25
	const JUMP = -5
	const PIPE_SPEED = 2.5
	const PIPE_SPAWN_RATE = 1500 // мс
	const BIRD_SIZE = 34

	const gameState = useRef({
		birdY: 250,
		velocity: 0,
		pipes: [] as { x: number; top: number; passed: boolean }[],
		frame: 0,
	})

	const jump = () => {
		if (!gameStarted) {
			setGameStarted(true)
			return
		}
		if (gameOver) {
			resetGame()
			return
		}
		gameState.current.velocity = JUMP
		tg?.HapticFeedback?.impactOccurred('light')
	}

	const resetGame = () => {
		gameState.current = {
			birdY: 250,
			velocity: 0,
			pipes: [],
			frame: 0,
		}
		setScore(0)
		setGameOver(false)
		setGameStarted(true)
	}

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let animationFrameId: number

		const render = () => {
			const { current: s } = gameState
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Фон (Градиент)
			const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
			grad.addColorStop(0, '#70c5ce')
			grad.addColorStop(1, '#4ec0ca')
			ctx.fillStyle = grad
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			if (gameStarted && !gameOver) {
				// Физика птицы
				s.velocity += GRAVITY
				s.birdY += s.velocity

				// Генерация труб
				if (s.frame % 90 === 0) {
					const minPipeHeight = 50
					const maxPipeHeight = canvas.height - 200
					const topHeight =
						Math.floor(
							Math.random() * (maxPipeHeight - minPipeHeight + 1),
						) + minPipeHeight
					s.pipes.push({
						x: canvas.width,
						top: topHeight,
						passed: false,
					})
				}

				// Движение труб
				s.pipes.forEach((pipe, index) => {
					pipe.x -= PIPE_SPEED

					// Проверка счета
					if (!pipe.passed && pipe.x < 50) {
						pipe.passed = true
						setScore((prev) => prev + 1)
						tg?.HapticFeedback?.impactOccurred('medium')
					}

					// Коллизии
					const gap = 150
					if (
						50 + BIRD_SIZE > pipe.x &&
						50 < pipe.x + 60 &&
						(s.birdY < pipe.top ||
							s.birdY + BIRD_SIZE > pipe.top + gap)
					) {
						setGameOver(true)
						tg?.HapticFeedback?.notificationOccurred('error')
					}

					// Удаление труб за экраном
					if (pipe.x < -60) s.pipes.splice(index, 1)
				})

				// Проверка пола/потолка
				if (s.birdY > canvas.height || s.birdY < 0) {
					setGameOver(true)
					tg?.HapticFeedback?.notificationOccurred('error')
				}

				s.frame++
			}

			// Отрисовка труб
			ctx.fillStyle = '#73bf2e'
			ctx.strokeStyle = '#558022'
			ctx.lineWidth = 3
			s.pipes.forEach((pipe) => {
				const gap = 150
				// Верхняя
				ctx.fillRect(pipe.x, 0, 60, pipe.top)
				ctx.strokeRect(pipe.x, 0, 60, pipe.top)
				// Нижняя
				ctx.fillRect(pipe.x, pipe.top + gap, 60, canvas.height)
				ctx.strokeRect(pipe.x, pipe.top + gap, 60, canvas.height)
			})

			// Отрисовка птицы (Смайлик или иконка)
			ctx.font = '34px serif'
			ctx.fillText('🚀', 50, s.birdY + BIRD_SIZE)

			if (!gameStarted) {
				ctx.fillStyle = 'white'
				ctx.font = 'bold 24px system-ui'
				ctx.textAlign = 'center'
				ctx.fillText(
					'НАЖМИ, ЧТОБЫ ЛЕТЕТЬ',
					canvas.width / 2,
					canvas.height / 2,
				)
			}

			if (gameOver) {
				ctx.fillStyle = 'rgba(0,0,0,0.5)'
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				ctx.fillStyle = 'white'
				ctx.font = 'bold 40px system-ui'
				ctx.textAlign = 'center'
				ctx.fillText(
					'GAME OVER',
					canvas.width / 2,
					canvas.height / 2 - 20,
				)
				ctx.font = '20px system-ui'
				ctx.fillText(
					'НАЖМИ ДЛЯ РЕСТАРТА',
					canvas.width / 2,
					canvas.height / 2 + 30,
				)
			}

			animationFrameId = requestAnimationFrame(render)
		}

		render()
		return () => cancelAnimationFrame(animationFrameId)
	}, [gameStarted, gameOver])

	return (
		<div className='fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center touch-none overflow-hidden'>
			<div className='absolute top-12 left-6 right-6 flex justify-between items-center z-10'>
				<button
					onClick={onBack}
					className='w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white text-2xl'
				>
					←
				</button>
				<div className='bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl text-white font-black text-2xl'>
					{score}
				</div>
			</div>

			<canvas
				ref={canvasRef}
				width={window.innerWidth}
				height={window.innerHeight}
				onClick={jump}
				className='w-full h-full'
			/>
		</div>
	)
}
