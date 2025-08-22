import { Hono } from 'hono'
import type { CloudflareBindings, EducationalContent } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Get all educational content
app.get('/content', async (c) => {
  try {
    const { env } = c
    const category = c.req.query('category')
    const contentType = c.req.query('type')
    
    let query = 'SELECT * FROM educational_content WHERE 1=1'
    const params: any[] = []
    
    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }
    
    if (contentType) {
      query += ' AND content_type = ?'
      params.push(contentType)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const content = await env.DB.prepare(query).bind(...params).all()
    
    return c.json({ content: content.results })
    
  } catch (error) {
    console.error('Get content error:', error)
    return c.json({ error: 'Failed to get educational content' }, 500)
  }
})

// Get single piece of content
app.get('/content/:id', async (c) => {
  try {
    const contentId = c.req.param('id')
    const { env } = c
    
    const content = await env.DB.prepare(
      'SELECT * FROM educational_content WHERE id = ?'
    ).bind(contentId).first<EducationalContent>()
    
    if (!content) {
      return c.json({ error: 'Content not found' }, 404)
    }
    
    // Increment view count
    await env.DB.prepare(
      'UPDATE educational_content SET view_count = view_count + 1 WHERE id = ?'
    ).bind(contentId).run()
    
    return c.json({ content })
    
  } catch (error) {
    console.error('Get content by ID error:', error)
    return c.json({ error: 'Failed to get content' }, 500)
  }
})

// Search educational content
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q')
    
    if (!query) {
      return c.json({ error: 'Search query is required' }, 400)
    }
    
    const { env } = c
    
    const results = await env.DB.prepare(
      `SELECT * FROM educational_content 
       WHERE title LIKE ? OR description LIKE ? OR content LIKE ?
       ORDER BY view_count DESC, created_at DESC
       LIMIT 20`
    ).bind(`%${query}%`, `%${query}%`, `%${query}%`).all()
    
    return c.json({ results: results.results })
    
  } catch (error) {
    console.error('Search content error:', error)
    return c.json({ error: 'Failed to search content' }, 500)
  }
})

// Get content categories
app.get('/categories', async (c) => {
  try {
    const { env } = c
    
    const categories = await env.DB.prepare(
      `SELECT category, COUNT(*) as count 
       FROM educational_content 
       GROUP BY category 
       ORDER BY count DESC`
    ).all()
    
    return c.json({ categories: categories.results })
    
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({ error: 'Failed to get categories' }, 500)
  }
})

// Get featured content
app.get('/featured', async (c) => {
  try {
    const { env } = c
    
    const featured = await env.DB.prepare(
      `SELECT * FROM educational_content 
       ORDER BY view_count DESC 
       LIMIT 6`
    ).all()
    
    return c.json({ featured: featured.results })
    
  } catch (error) {
    console.error('Get featured content error:', error)
    return c.json({ error: 'Failed to get featured content' }, 500)
  }
})

export { app as educationRoutes }