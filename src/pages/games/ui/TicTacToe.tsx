import React, { useState, useEffect } from 'react'

const tg = window.Telegram?.WebApp

export const TicTacToeGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const [board, setBoard] = useState(Array(9).fill(null))
	const [isPlayerTurn, setIsPlayerTurn] = useState(true)

	const winLines = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6],
	]

	const checkWinner = (sq: any[]) => {
		for (let [a, b, c] of winLines) {
			if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a]
		}
		return sq.every((s) => s !== null) ? 'Draw' : null
	}

	const winner = checkWinner(board)

	useEffect(() => {
		if (!isPlayerTurn && !winner) {
			const timer = setTimeout(() => {
				makeBotMove()
			}, 600)
			return () => clearTimeout(timer)
		}
	}, [isPlayerTurn, winner])

	const makeBotMove = () => {
		const sq = [...board]
		const winMove = findLogicMove(sq, 'O')
		if (winMove !== null) return commitMove(winMove)
		const blockMove = findLogicMove(sq, 'X')
		if (blockMove !== null) return commitMove(blockMove)
		const empty = sq
			.map((v, i) => (v === null ? i : null))
			.filter((v) => v !== null)
		if (empty.length > 0) {
			const random = empty[Math.floor(Math.random() * empty.length)]
			commitMove(random as number)
		}
	}

	const findLogicMove = (sq: any[], mark: string) => {
		for (let [a, b, c] of winLines) {
			const line = [sq[a], sq[b], sq[c]]
			if (
				line.filter((v) => v === mark).length === 2 &&
				line.filter((v) => v === null).length === 1
			) {
				if (sq[a] === null) return a
				if (sq[b] === null) return b
				if (sq[c] === null) return c
			}
		}
		return null
	}

	const commitMove = (i: number) => {
		setBoard((prev) => {
			const next = [...prev]
			next[i] = isPlayerTurn ? 'X' : 'O'
			return next
		})
		setIsPlayerTurn(!isPlayerTurn)
		tg?.HapticFeedback?.impactOccurred('light')
	}

	const handleUserClick = (i: number) => {
		if (board[i] || winner || !isPlayerTurn) return
		commitMove(i)
	}

	return (
		<div className='min-h-screen bg-gray-50 p-4 flex flex-col items-center animate-in fade-in duration-300 fixed inset-0 z-[60] safe-area-pt'>
			<button
				onClick={onBack}
				className='self-start text-blue-700 font-black mb-6 bg-white px-4 py-2 rounded-xl shadow-sm'
			>
				← ВЫХОД
			</button>

			<div className='text-center mb-10'>
				<h2 className='text-3xl font-black uppercase tracking-tighter text-slate-800'>
					{winner
						? winner === 'Draw'
							? 'Ничья! 🤝'
							: `🎉 Победил: ${winner}`
						: isPlayerTurn
							? '❌ Твой ход'
							: '⭕ Ход бота...'}
				</h2>
				<p className='text-[10px] font-bold opacity-40 mt-1 uppercase tracking-widest'>
					Difficulty: Smart Bot
				</p>
			</div>

			<div className='grid grid-cols-3 gap-3 bg-gray-200 p-3 rounded-3xl shadow-inner border border-gray-300'>
				{board.map((v, i) => (
					<div
						key={i}
						onClick={() => handleUserClick(i)}
						className='w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-5xl font-black shadow active:scale-90 transition-transform cursor-pointer select-none'
					>
						<span
							className={
								v === 'X' ? 'text-red-500' : 'text-blue-500'
							}
						>
							{v}
						</span>
					</div>
				))}
			</div>

			<button
				onClick={() => {
					setBoard(Array(9).fill(null))
					setIsPlayerTurn(true)
				}}
				className='mt-12 bg-gray-900 text-white px-12 py-4 rounded-3xl font-black shadow-xl active:scale-95 transition-all'
			>
				ОЧИСТИТЬ
			</button>
		</div>
	)
}
