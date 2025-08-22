import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const i18nRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Get translations for a specific language
i18nRoutes.get('/translations/:language', async (c) => {
  try {
    const language = c.req.param('language')
    const context = c.req.query('context') // optional filter by context
    
    let query = `SELECT key, translation, context FROM translations WHERE language_code = ?`
    const params = [language]
    
    if (context) {
      query += ` AND context = ?`
      params.push(context)
    }
    
    query += ` ORDER BY key`
    
    const translations = await c.env.DB.prepare(query).bind(...params).all()
    
    // Convert to key-value object for easier frontend use
    const translationMap = {}
    translations.results?.forEach(row => {
      translationMap[row.key] = row.translation
    })
    
    return c.json({
      success: true,
      language,
      translations: translationMap,
      count: Object.keys(translationMap).length
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch translations' }, 500)
  }
})

// Get all available languages
i18nRoutes.get('/languages', async (c) => {
  try {
    const languages = await c.env.DB.prepare(`
      SELECT DISTINCT language_code, COUNT(*) as translation_count
      FROM translations 
      GROUP BY language_code
      ORDER BY language_code
    `).all()
    
    const languageInfo = {
      'en': { name: 'English', native: 'English', flag: '🇺🇸' },
      'es': { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
      'fr': { name: 'French', native: 'Français', flag: '🇫🇷' },
      'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
      'it': { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
      'pt': { name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
      'zh': { name: 'Chinese', native: '中文', flag: '🇨🇳' },
      'ja': { name: 'Japanese', native: '日本語', flag: '🇯🇵' }
    }
    
    const enrichedLanguages = languages.results?.map(lang => ({
      code: lang.language_code,
      translationCount: lang.translation_count,
      ...languageInfo[lang.language_code]
    }))
    
    return c.json({
      success: true,
      languages: enrichedLanguages || []
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch languages' }, 500)
  }
})

// Add or update translation
i18nRoutes.post('/translations', async (c) => {
  try {
    const { key, language_code, translation, context } = await c.req.json()
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO translations (key, language_code, translation, context, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(key, language_code, translation, context || null).run()
    
    return c.json({
      success: true,
      message: 'Translation saved successfully'
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to save translation' }, 500)
  }
})

// Bulk import translations
i18nRoutes.post('/translations/bulk', async (c) => {
  try {
    const { language_code, translations } = await c.req.json()
    
    const stmt = c.env.DB.prepare(`
      INSERT OR REPLACE INTO translations (key, language_code, translation, context, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
    
    let imported = 0
    for (const [key, data] of Object.entries(translations)) {
      const translation = typeof data === 'string' ? data : data.translation
      const context = typeof data === 'object' ? data.context : null
      
      await stmt.bind(key, language_code, translation, context).run()
      imported++
    }
    
    return c.json({
      success: true,
      imported,
      message: `Successfully imported ${imported} translations`
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to import translations' }, 500)
  }
})

// Get user's language preference
i18nRoutes.get('/user-preference', async (c) => {
  try {
    const userId = c.req.header('user-id') || '1'
    
    const preference = await c.env.DB.prepare(`
      SELECT language, timezone, currency, jurisdiction
      FROM user_preferences 
      WHERE user_id = ?
    `).bind(userId).first()
    
    return c.json({
      success: true,
      preferences: preference || {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        jurisdiction: 'US'
      }
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch user preferences' }, 500)
  }
})

// Update user's language preference
i18nRoutes.post('/user-preference', async (c) => {
  try {
    const userId = c.req.header('user-id') || '1'
    const { language, timezone, currency, jurisdiction } = await c.req.json()
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO user_preferences 
      (user_id, language, timezone, currency, jurisdiction, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(userId, language, timezone, currency, jurisdiction).run()
    
    return c.json({
      success: true,
      message: 'Language preference updated successfully'
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to update language preference' }, 500)
  }
})

// Auto-detect user language from headers
i18nRoutes.get('/detect-language', (c) => {
  try {
    const acceptLanguage = c.req.header('Accept-Language') || 'en'
    const userAgent = c.req.header('User-Agent') || ''
    
    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=')
        return {
          code: code.split('-')[0].toLowerCase(), // Get main language code
          quality: qValue ? parseFloat(qValue) : 1.0
        }
      })
      .sort((a, b) => b.quality - a.quality)
    
    // Supported languages
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja']
    
    // Find best match
    const detectedLanguage = languages.find(lang => 
      supportedLanguages.includes(lang.code)
    )?.code || 'en'
    
    // Detect country/jurisdiction from user agent or other hints
    let jurisdiction = 'US'
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      // Could enhance with more sophisticated detection
      jurisdiction = 'US'
    }
    
    return c.json({
      success: true,
      detected: {
        language: detectedLanguage,
        jurisdiction,
        confidence: detectedLanguage !== 'en' ? 0.8 : 0.9
      },
      available: supportedLanguages
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to detect language' }, 500)
  }
})

// Get localized content
i18nRoutes.get('/content/:type', async (c) => {
  try {
    const contentType = c.req.param('type') // legal_terms, privacy_policy, etc.
    const language = c.req.query('language') || 'en'
    const jurisdiction = c.req.query('jurisdiction') || 'US'
    
    // Mock localized content - in production, this could come from a CMS
    const content = {
      legal_terms: {
        en: {
          title: 'Terms of Service',
          content: 'These terms govern your use of AssetShield App...',
          lastUpdated: '2024-08-22'
        },
        es: {
          title: 'Términos de Servicio',
          content: 'Estos términos rigen el uso de AssetShield App...',
          lastUpdated: '2024-08-22'
        },
        fr: {
          title: 'Conditions d\'Utilisation',
          content: 'Ces conditions régissent votre utilisation d\'AssetShield App...',
          lastUpdated: '2024-08-22'
        },
        de: {
          title: 'Nutzungsbedingungen',
          content: 'Diese Bedingungen regeln Ihre Nutzung von AssetShield App...',
          lastUpdated: '2024-08-22'
        }
      },
      privacy_policy: {
        en: {
          title: 'Privacy Policy',
          content: 'We value your privacy and are committed to protecting your personal information...',
          lastUpdated: '2024-08-22'
        },
        es: {
          title: 'Política de Privacidad',
          content: 'Valoramos su privacidad y nos comprometemos a proteger su información personal...',
          lastUpdated: '2024-08-22'
        },
        fr: {
          title: 'Politique de Confidentialité',
          content: 'Nous valorisons votre vie privée et nous nous engageons à protéger vos informations personnelles...',
          lastUpdated: '2024-08-22'
        },
        de: {
          title: 'Datenschutzrichtlinie',
          content: 'Wir schätzen Ihre Privatsphäre und verpflichten uns, Ihre persönlichen Daten zu schützen...',
          lastUpdated: '2024-08-22'
        }
      }
    }
    
    return c.json({
      success: true,
      contentType,
      language,
      jurisdiction,
      content: content[contentType]?.[language] || content[contentType]?.['en'] || null
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch localized content' }, 500)
  }
})