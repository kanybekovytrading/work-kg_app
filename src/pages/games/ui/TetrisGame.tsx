import React, { useState, useEffect, useCallback } from 'react'

const tg = window.Telegram?.WebApp

const TETRIS_ROWS = 20
const TETRIS_COLS = 10
const TETRIS_SHAPES: any = {
	I: [[1, 1, 1, 1]],
	J: [
		[1, 0, 0],
		[1, 1, 1],
	],
	L: [
		[0, 0, 1],
		[1, 1, 1],
	],
	O: [
		[1, 1],
		[1, 1],
	],
	S: [
		[0, 1, 1],
		[1, 1, 0],
	],
	T: [
		[0, 1, 0],
		[1, 1, 1],
	],
	Z: [
		[1, 1, 0],
		[0, 1, 1],
	],
}
const TETRIS_COLORS: any = {
	I: 'bg-cyan-400',
	J: 'bg-blue-500',
	L: 'bg-orange-500',
	O: 'bg-yellow-400',
	S: 'bg-green-500',
	T: 'bg-purple-500',
	Z: 'bg-red-500',
}

export const TetrisGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const [grid, setGrid] = useState(
		Array(TETRIS_ROWS)
			.fill(null)
			.map(() => Array(TETRIS_COLS).fill(null)),
	)
	const [activePiece, setActivePiece] = useState<any>(null)
	const [score, setScore] = useState(0)
	const [gameOver, setGameOver] = useState(false)

	const checkColl = (pos: any, shape: any[][], g: any[][]) => {
		for (let y = 0; y < shape.length; y++) {
			for (let x = 0; x < shape[y].length; x++) {
				if (shape[y][x]) {
					const nx = pos.x + x,
						ny = pos.y + y
					if (
						nx < 0 ||
						nx >= TETRIS_COLS ||
						ny >= TETRIS_ROWS ||
						(ny >= 0 && g[ny][nx])
					)
						return true
				}
			}
		}
		return false
	}

	const spawn = useCallback(() => {
		const types = Object.keys(TETRIS_SHAPES)
		const type = types[
			Math.floor(Math.random() * types.length)
		] as keyof typeof TETRIS_SHAPES
		const shape = TETRIS_SHAPES[type]
		const piece = { pos: { x: 3, y: 0 }, shape, type }
		if (checkColl(piece.pos, shape, grid)) {
			setGameOver(true)
			tg?.HapticFeedback?.notificationOccurred('error')
		} else setActivePiece(piece)
	}, [grid])

	const move = (dx: number, dy: number) => {
		if (!activePiece || gameOver) return
		const np = { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy }
		if (!checkColl(np, activePiece.shape, grid)) {
			setActivePiece({ ...activePiece, pos: np })
			if (dx !== 0) tg?.HapticFeedback?.selectionChanged()
			return true
		} else if (dy > 0) {
			const newGrid = grid.map((r) => [...r])
			activePiece.shape.forEach((r: any, y: number) =>
				r.forEach((v: any, x: number) => {
					if (v)
						newGrid[activePiece.pos.y + y][activePiece.pos.x + x] =
							activePiece.type
				}),
			)
			let cleared = 0
			const filtered = newGrid.filter((r) => {
				const full = r.every((c) => c !== null)
				if (full) cleared++
				return !full
			})
			if (cleared > 0) tg?.HapticFeedback?.notificationOccurred('success')

			while (filtered.length < TETRIS_ROWS)
				filtered.unshift(Array(TETRIS_COLS).fill(null))
			setScore((s) => s + cleared * 100)
			setGrid(filtered)
			setActivePiece(null)
			spawn()
		}
		return false
	}

	useEffect(() => {
		if (!activePiece && !gameOver) spawn()
	}, [activePiece, gameOver, spawn])

	useEffect(() => {
		const i = setInterval(() => move(0, 1), 800)
		return () => clearInterval(i)
	}, [activePiece, grid, gameOver])

	return (
		<div className='min-h-screen bg-gray-100 p-4 flex flex-col items-center fixed inset-0 z-[60] safe-area-pt'>
			<button
				onClick={onBack}
				className='self-start text-purple-700 font-black mb-4 bg-white px-4 py-2 rounded-xl'
			>
				← ВЫХОД
			</button>
			<div className='bg-white p-2 rounded-2xl shadow-md flex gap-8 px-6 mb-4'>
				<div className='text-center font-black text-purple-700'>
					<p className='text-[8px] opacity-40 uppercase'>Score</p>
					{score}
				</div>
			</div>
			<div className='bg-gray-900 p-1 rounded-xl border-4 border-gray-800 grid grid-cols-10 gap-px bg-gray-700 shadow-2xl'>
				{grid.map((r, y) =>
					r.map((c, x) => {
						let color = 'bg-gray-900'
						if (c) color = TETRIS_COLORS[c]
						if (activePiece) {
							const py = y - activePiece.pos.y,
								px = x - activePiece.pos.x
							if (
								py >= 0 &&
								py < activePiece.shape.length &&
								px >= 0 &&
								px < activePiece.shape[0].length &&
								activePiece.shape[py][px]
							)
								color = TETRIS_COLORS[activePiece.type]
						}
						return (
							<div
								key={`${x}-${y}`}
								className={`w-6 h-6 ${color} border border-white/5 rounded-sm transition-colors duration-75`}
							/>
						)
					}),
				)}
			</div>
			{gameOver && (
				<div
					className='absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-2xl backdrop-blur-sm z-10'
					onClick={() => {
						setGrid(
							Array(TETRIS_ROWS)
								.fill(null)
								.map(() => Array(TETRIS_COLS).fill(null)),
						)
						setScore(0)
						setGameOver(false)
					}}
				>
					GAME OVER
					<br />
					<span className='text-sm font-normal'>Tap to restart</span>
				</div>
			)}

			<div className='mt-8 grid grid-cols-3 gap-4'>
				<div />
				<ControlBtn
					icon='↻'
					onClick={() => {
						const ns = activePiece.shape[0].map((_: any, i: any) =>
							activePiece.shape.map((r: any) => r[i]).reverse(),
						)
						if (!checkColl(activePiece.pos, ns, grid))
							setActivePiece({ ...activePiece, shape: ns })
					}}
					color='bg-purple-600 text-white'
				/>
				<div />
				<ControlBtn
					icon='◀'
					onClick={() => move(-1, 0)}
					color='bg-white text-slate-900'
				/>
				<ControlBtn
					icon='▼'
					onClick={() => move(0, 1)}
					color='bg-white text-slate-900'
				/>
				<ControlBtn
					icon='▶'
					onClick={() => move(1, 0)}
					color='bg-white text-slate-900'
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
		}}
		className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center text-2xl shadow active:scale-90 transition-all font-black border-b-4 border-black/10`}
	>
		{icon}
	</button>
)
