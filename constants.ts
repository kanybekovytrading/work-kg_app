import { BankService } from './types'

export const CONFIG = {
	API_BASE_URL: 'https://workkg.com/api',
	CHANNEL_LINK: 'https://t.me/work_random',
	SUPPORT_LINK: 'https://t.me/fastjob_support',
	GAMES_LINK: 'https://t.me/fastjob_kg_bot/games',
	GEMINI_API_KEY: 'AIzaSyBUHB3jiODzLHOeWC0baVWtRtNVIyO587o',
}

export const LOCALES = {
	RU: {
		search_job: 'Найти работу',
		search_worker: 'Найти сотрудника',
		profile: 'Профиль',
		create: 'Создать',
		subscription: 'PRO Доступ',
		balance: 'Баланс',
		withdraw: 'Вывод средств',
		bonuses: 'Бонусы',
		back: 'Назад',
		copy: 'Копировать',
	},
}

export const BANK_SERVICES: Record<string, BankService> = {
	MBANK: {
		id: 'averspay-elqr-mbank',
		code: null,
		name: 'MBank',
		icon: 'https://mbank.kg/favicon.ico',
		min: 1,
		max: 99000,
	},
	BAKAI_24: {
		id: 'c1f045ca-0f9f-48bf-8a2f-2566dc55bb45',
		code: '4398',
		name: 'Бакай24',
		icon: 'https://bakai.kg/favicon.ico',
		min: 10,
		max: 99999,
	},
	OPTIMA_BANK: {
		id: '7132d037-abc3-4f82-a621-c4c01c874f51',
		code: '5428',
		name: 'Оптима Банк',
		icon: 'https://www.optimabank.kg/favicon.ico',
		min: 15,
		max: 95000,
	},
	DEMIR_BANK: {
		id: '37f2500c-99e0-4ac3-b563-18029eaa9b84',
		code: '5221',
		name: 'Демир Банк',
		icon: 'https://www.demirbank.kg/favicon.ico',
		min: 10,
		max: 50000,
	},
	ELDIK_BANK: {
		id: '0ab40b4d-a06c-42a2-ba18-15e2240f40a3',
		code: '4019',
		name: 'Элдик Банк (РСК)',
		icon: 'https://rsk.kg/favicon.ico',
		min: 101,
		max: 69999,
	},
	ELCART: {
		id: '25dd4456-b390-4c89-9287-8fb4782e0a5c',
		code: '4417',
		name: 'Элкарт',
		icon: 'https://elcart.kg/favicon.ico',
		min: 20,
		max: 15000,
	},
	KICB: {
		id: '5f9b81a9-aef2-4027-81f3-08d8796e6c68',
		code: '4910',
		name: 'KICB Банк',
		icon: 'https://kicb.net/favicon.ico',
		min: 5,
		max: 99999,
	},
	AIYL_BANK: {
		id: '1e67f6f3-abc6-41b1-a243-06a1a6090026',
		code: '4543',
		name: 'Айыл Банк',
		icon: 'https://ab.kg/favicon.ico',
		min: 5,
		max: 50000,
	},
	BAI_TUSHUM: {
		id: '49922384-ea51-4218-b8ae-d3331048261e',
		code: '5523',
		name: 'Бай-Тушум',
		icon: 'https://www.baitushum.kg/favicon.ico',
		min: 20,
		max: 69999,
	},
	SIMBANK: {
		id: '9a097ba1-6eb4-421a-bee2-a174bbf94576',
		code: '5475',
		name: 'Simbank',
		icon: 'https://simbank.kg/favicon.ico',
		min: 50,
		max: 69000,
	},
	TULPAR: {
		id: 'f89ba382-74d3-4d9d-94e5-1e2125ae3814',
		code: '3982',
		name: 'Карта Тулпар',
		icon: 'https://tulpar-card.kg/favicon.ico',
		min: 1,
		max: 90000,
	},
	KKB: {
		id: '0d03508e-0858-4606-8b80-fca4677e37fa',
		code: '4425',
		name: 'Кыргызкоммерцбанк',
		icon: 'https://kkb.kg/favicon.ico',
		min: 20,
		max: 69999,
	},
}
export const formatPhoneKG = (input: string) => {
	// Extract only digits
	let digits = input.replace(/\D/g, '')

	// Ensure it starts with 996
	if (!digits.startsWith('996')) {
		digits = '996' + digits
	}

	// Limit to 12 digits (996 + 9 digits)
	digits = digits.slice(0, 12)

	// Return in format: +996700123456
	return '+' + digits
}
