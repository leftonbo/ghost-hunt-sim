import i18next from 'i18next'
import en from '../locales/en.json'
import ja from '../locales/ja.json'

export type AppLanguage = 'ja' | 'en'

const LANGUAGE_STORAGE_KEY = 'ghost-hunt-sim.language'
const SUPPORTED_LANGUAGES: AppLanguage[] = ['ja', 'en']

const resources = {
  ja: { translation: ja },
  en: { translation: en },
} as const

function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // ストレージ非対応環境では永続化を諦め、表示更新は継続する。
  }
}

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value === 'ja' || value === 'en'
}

function resolveInitialLanguage(): AppLanguage {
  const storedLanguage = readStoredLanguage()
  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ja'
}

function syncDocumentLanguage(): void {
  document.documentElement.lang = getCurrentLanguage()
  document.title = t('ui.documentTitle')
}

/**
 * i18next を初期化し、初期表示言語を決定する。
 * @returns 初期化後の現在言語
 */
export async function initI18n(): Promise<AppLanguage> {
  const language = resolveInitialLanguage()

  if (!i18next.isInitialized) {
    await i18next.init({
      resources,
      lng: language,
      fallbackLng: 'ja',
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: {
        escapeValue: false,
      },
    })
  } else if (i18next.language !== language) {
    await i18next.changeLanguage(language)
  }

  syncDocumentLanguage()
  return getCurrentLanguage()
}

/**
 * 指定言語へ切り替え、永続化する。
 * @param language 切替先の言語コード
 */
export async function changeLanguage(language: AppLanguage): Promise<void> {
  await i18next.changeLanguage(language)
  persistLanguage(language)
  syncDocumentLanguage()
}

/**
 * 現在有効な言語コードを取得する。
 * @returns 現在言語
 */
export function getCurrentLanguage(): AppLanguage {
  const resolvedLanguage = i18next.resolvedLanguage ?? i18next.language
  return resolvedLanguage === 'en' ? 'en' : 'ja'
}

/**
 * 翻訳キーから文言を取得する。
 * @param key 翻訳キー
 * @param options 補間オプション
 * @returns 翻訳済み文字列
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options)
}

/**
 * data 属性が付いた DOM 要素へ翻訳文言を反映する。
 * @param root 翻訳対象のルートノード
 */
export function applyDocumentTranslations(root: ParentNode = document): void {
  const elements = root.querySelectorAll<HTMLElement>(
    '[data-i18n], [data-i18n-title], [data-i18n-aria-label]',
  )

  for (const element of elements) {
    if (element.dataset.i18n) {
      element.textContent = t(element.dataset.i18n)
    }
    if (element.dataset.i18nTitle) {
      element.title = t(element.dataset.i18nTitle)
    }
    if (element.dataset.i18nAriaLabel) {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel))
    }
  }

  syncDocumentLanguage()
}
