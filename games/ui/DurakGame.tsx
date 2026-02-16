import React, { useState, useEffect, useCallback } from 'react'

const tg = window.Telegram?.WebApp

type Suit = '♠' | '♣' | '♥' | '♦'
type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

interface Card {
	id: string
	suit: Suit
	rank: Rank
	value: number
}

const SUITS: Suit[] = ['♠', '♣', '♥', '♦']
const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUE: Record<Rank, number> = {
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	J: 11,
	Q: 12,
	K: 13,
	A: 14,
}

export const DurakGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const [deck, setDeck] = useState<Card[]>([])
	const [playerHand, setPlayerHand] = useState<Card[]>([])
	const [botHand, setBotHand] = useState<Card[]>([])
	const [trump, setTrump] = useState<Card | null>(null)
	const [table, setTable] = useState<
		{ attack: Card; defense?: Card; id: number }[]
	>([])
	const [attacker, setAttacker] = useState<'player' | 'bot'>('player')
	const [status, setStatus] = useState('Ваш ход')
	const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null)

	// Логика боя
	const canBeat = useCallback(
		(attack: Card, defense: Card) => {
			if (!trump) return false
			if (defense.suit === attack.suit)
				return defense.value > attack.value
			return defense.suit === trump.suit && attack.suit !== trump.suit
		},
		[trump],
	)

	// Добор карт
	const refill = (d: Card[], p: Card[], b: Card[]) => {
		let newD = [...d],
			newP = [...p],
			newB = [...b]
		if (attacker === 'player') {
			while (newP.length < 6 && newD.length > 0) newP.push(newD.shift()!)
			while (newB.length < 6 && newD.length > 0) newB.push(newD.shift()!)
		} else {
			while (newB.length < 6 && newD.length > 0) newB.push(newD.shift()!)
			while (newP.length < 6 && newD.length > 0) newP.push(newD.shift()!)
		}
		return { newD, newP, newB }
	}

	const initGame = useCallback(() => {
		const cards: Card[] = []
		SUITS.forEach((suit) =>
			RANKS.forEach((rank) =>
				cards.push({
					id: Math.random().toString(),
					suit,
					rank,
					value: RANK_VALUE[rank],
				}),
			),
		)
		const shuffled = cards.sort(() => Math.random() - 0.5)
		const p = shuffled.splice(0, 6),
			b = shuffled.splice(0, 6),
			t = shuffled[shuffled.length - 1]
		setDeck(shuffled)
		setPlayerHand(p)
		setBotHand(b)
		setTrump(t)
		setTable([])
		setAttacker('player')
		setGameOver(null)
		setStatus('Ваш ход')
	}, [])

	useEffect(() => {
		initGame()
	}, [initGame])

	// ИИ Бота
	useEffect(() => {
		if (
			gameOver ||
			(attacker === 'player' && table.every((pair) => pair.defense))
		)
			return

		const timer = setTimeout(() => {
			if (attacker === 'bot') {
				// Бот атакует
				if (table.length === 0) {
					const card = botHand.sort((a, b) => a.value - b.value)[0]
					setBotHand((h) => h.filter((c) => c.id !== card.id))
					setTable([{ attack: card, id: Date.now() }])
				} else {
					const ranks = table.flatMap((p) => [
						p.attack.rank,
						p.defense?.rank,
					])
					const playable = botHand.filter((c) =>
						ranks.includes(c.rank),
					)
					if (
						playable.length > 0 &&
						table.length < 6 &&
						playerHand.length > 0
					) {
						const card = playable[0]
						setBotHand((h) => h.filter((c) => c.id !== card.id))
						setTable((t) => [
							...t,
							{ attack: card, id: Date.now() },
						])
					}
				}
			} else {
				// Бот защищается
				const toDefend = table.find((p) => !p.defense)
				if (toDefend) {
					const playable = botHand
						.filter((c) => canBeat(toDefend.attack, c))
						.sort((a, b) => a.value - b.value)
					if (playable.length > 0) {
						const card = playable[0]
						setBotHand((h) => h.filter((c) => c.id !== card.id))
						setTable((t) =>
							t.map((p) =>
								p.id === toDefend.id
									? { ...p, defense: card }
									: p,
							),
						)
					} else {
						setStatus('Бот берет карты')
						const all = table.flatMap(
							(p) =>
								[p.attack, p.defense].filter(Boolean) as Card[],
						)
						setBotHand((h) => [...h, ...all])
						setTable([])
						const { newD, newP, newB } = refill(deck, playerHand, [
							...botHand,
							...all,
						])
						setDeck(newD)
						setPlayerHand(newP)
						setBotHand(newB)
					}
				}
			}
		}, 1000)
		return () => clearTimeout(timer)
	}, [attacker, table, botHand, playerHand, deck, trump, gameOver])

	const playerAction = (card: Card) => {
		if (attacker === 'player') {
			const ranks = table.flatMap((p) => [p.attack.rank, p.defense?.rank])
			if (table.length > 0 && !ranks.includes(card.rank)) return
			setPlayerHand((h) => h.filter((c) => c.id !== card.id))
			setTable((t) => [...t, { attack: card, id: Date.now() }])
		} else {
			const toDef = table.find((p) => !p.defense)
			if (toDef && canBeat(toDef.attack, card)) {
				setPlayerHand((h) => h.filter((c) => c.id !== card.id))
				setTable((t) =>
					t.map((p) =>
						p.id === toDef.id ? { ...p, defense: card } : p,
					),
				)
			}
		}
	}

	const endTurn = () => {
		const isTaking = attacker === 'bot' && table.some((p) => !p.defense)
		const all = table.flatMap(
			(p) => [p.attack, p.defense].filter(Boolean) as Card[],
		)
		if (isTaking) {
			setPlayerHand((h) => [...h, ...all])
			setAttacker('bot')
		} else {
			setAttacker(attacker === 'player' ? 'bot' : 'player')
		}
		setTable([])
		const { newD, newP, newB } = refill(
			deck,
			isTaking ? [...playerHand, ...all] : playerHand,
			botHand,
		)
		setDeck(newD)
		setPlayerHand(newP)
		setBotHand(newB)
	}

	useEffect(() => {
		if (deck.length === 0) {
			if (playerHand.length === 0) setGameOver('win')
			else if (botHand.length === 0) setGameOver('lose')
		}
	}, [playerHand, botHand, deck])

	return (
		<div className='fixed inset-0 bg-[#143d26] z-[100] flex flex-col items-center justify-between py-8 text-white overflow-hidden select-none font-sans'>
			{/* Хедер с Козырем и Колодой */}
			<div className='w-full px-6 flex justify-between items-end h-32'>
				<button
					onClick={onBack}
					className='bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase mb-auto'
				>
					Выход
				</button>

				<div className='relative flex flex-col items-center'>
					<div className='text-[9px] font-black uppercase opacity-40 mb-1'>
						Колода: {deck.length}
					</div>
					<div className='relative w-16 h-24 flex items-center justify-center'>
						{/* Козырная карта (лежит горизонтально) */}
						{trump && (
							<div className='absolute rotate-90 translate-x-4 transition-transform shadow-2xl'>
								<CardView card={trump} />
							</div>
						)}
						{/* Рубашка колоды */}
						{deck.length > 1 && (
							<div className='relative w-16 h-24 bg-blue-900 border-2 border-white/30 rounded-lg shadow-xl flex items-center justify-center overflow-hidden'>
								<div className='absolute inset-0 opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:10px_10px]'></div>
								<div className='text-[8px] font-black rotate-[-45deg] opacity-30'>
									WORK.KG
								</div>
							</div>
						)}
					</div>
				</div>

				<div className='w-10 mb-auto'>
					{/* Маленький индикатор масти, если карта под колодой плохо видна */}
					<div
						className={`text-3xl ${trump?.suit === '♥' || trump?.suit === '♦' ? 'text-red-500' : 'text-white'}`}
					>
						{trump?.suit}
					</div>
				</div>
			</div>

			{/* Бот */}
			<div className='flex -space-x-8 opacity-80'>
				{botHand.map((_, i) => (
					<div
						key={i}
						className='w-12 h-16 bg-blue-950 border border-white/20 rounded-lg shadow-xl'
					/>
				))}
			</div>

			{/* Поле боя */}
			<div className='flex-1 w-full flex flex-col items-center justify-center px-4 relative'>
				<div className='absolute top-4 text-[10px] font-black uppercase text-emerald-400/40 tracking-widest'>
					{status}
				</div>
				<div className='grid grid-cols-3 gap-3'>
					{table.map((p) => (
						<div key={p.id} className='relative w-16 h-24'>
							<CardView card={p.attack} />
							{p.defense && (
								<div className='absolute top-4 left-4 z-10 scale-105'>
									<CardView card={p.defense} />
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Игрок */}
			<div className='w-full space-y-4'>
				<div className='flex flex-wrap justify-center gap-1 px-4 h-32 overflow-y-auto'>
					{playerHand
						.sort((a, b) => a.value - b.value)
						.map((c) => (
							<div
								key={c.id}
								onClick={() => playerAction(c)}
								className='transform active:scale-90 transition-transform'
							>
								<CardView card={c} />
							</div>
						))}
				</div>
				<div className='px-10 flex gap-3'>
					{((attacker === 'player' &&
						table.length > 0 &&
						table.every((p) => p.defense)) ||
						(attacker === 'bot' && table.length > 0)) && (
						<button
							onClick={endTurn}
							className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all ${attacker === 'bot' ? 'bg-red-600' : 'bg-emerald-600'}`}
						>
							{attacker === 'bot' ? 'Взять' : 'Бито'}
						</button>
					)}
				</div>
			</div>

			{gameOver && (
				<div className='absolute inset-0 bg-black/90 z-[300] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300'>
					<div className='text-8xl mb-6'>
						{gameOver === 'win' ? '🏆' : '🤡'}
					</div>
					<h2 className='text-4xl font-black uppercase'>
						{gameOver === 'win' ? 'Ты победил!' : 'Ты дурак!'}
					</h2>
					<button
						onClick={initGame}
						className='mt-10 px-12 py-4 bg-white text-black rounded-2xl font-black uppercase'
					>
						Заново
					</button>
				</div>
			)}
		</div>
	)
}

const CardView = ({ card }: { card: Card }) => {
	const isRed = card.suit === '♥' || card.suit === '♦'
	return (
		<div className='w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-between p-1 shadow-xl border border-black/10'>
			<div
				className={`w-full text-left text-[11px] font-black px-1 ${isRed ? 'text-red-600' : 'text-black'}`}
			>
				{card.rank}
			</div>
			<div
				className={`text-2xl leading-none ${isRed ? 'text-red-600' : 'text-black'}`}
			>
				{card.suit}
			</div>
			<div
				className={`w-full text-right text-[11px] font-black px-1 rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}
			>
				{card.rank}
			</div>
		</div>
	)
}
