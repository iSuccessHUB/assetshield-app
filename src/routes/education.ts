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
    
    // Try database first, fallback to mock data if DB not available
    let featured
    try {
      if (env?.DB) {
        const result = await env.DB.prepare(
          `SELECT * FROM educational_content 
           ORDER BY view_count DESC 
           LIMIT 6`
        ).all()
        featured = result.results
      }
    } catch (dbError) {
      console.log('Database not available, using mock data')
    }
    
    // Fallback to mock educational content if database fails
    if (!featured || featured.length === 0) {
      featured = [
        {
          id: 1,
          title: "Asset Protection Basics: Getting Started",
          description: "Learn the fundamental principles of asset protection and why it's essential for preserving your wealth.",
          content_type: "article",
          category: "basics",
          author: "AssetShield Legal Team",
          reading_time: 8,
          difficulty_level: "beginner",
          view_count: 2850,
          created_at: new Date().toISOString(),
          excerpt: "Understanding the basic concepts of asset protection is the first step toward securing your financial future..."
        },
        {
          id: 2,
          title: "LLC vs Trust: Choosing the Right Structure",
          description: "Compare Limited Liability Companies and Asset Protection Trusts to determine the best option for your needs.",
          content_type: "guide",
          category: "structures",
          author: "Sarah Mitchell, JD",
          reading_time: 12,
          difficulty_level: "intermediate",
          view_count: 2340,
          created_at: new Date().toISOString(),
          excerpt: "Selecting the right legal structure is crucial for effective asset protection. This comprehensive guide..."
        },
        {
          id: 3,
          title: "Offshore Asset Protection: International Strategies",
          description: "Explore international asset protection strategies and jurisdictions for maximum privacy and security.",
          content_type: "article",
          category: "offshore",
          author: "Michael Rodriguez, Esq.",
          reading_time: 15,
          difficulty_level: "advanced",
          view_count: 1890,
          created_at: new Date().toISOString(),
          excerpt: "International asset protection offers enhanced privacy and security through carefully selected jurisdictions..."
        },
        {
          id: 4,
          title: "Common Asset Protection Mistakes to Avoid",
          description: "Identify and avoid the most frequent mistakes that can compromise your asset protection strategy.",
          content_type: "checklist",
          category: "planning",
          author: "Jennifer Walsh, CPA",
          reading_time: 6,
          difficulty_level: "beginner",
          view_count: 1750,
          created_at: new Date().toISOString(),
          excerpt: "Avoiding common pitfalls is essential for maintaining effective asset protection. Learn about the mistakes..."
        },
        {
          id: 5,
          title: "Estate Planning Integration with Asset Protection",
          description: "Learn how to integrate asset protection strategies with your overall estate planning goals.",
          content_type: "guide",
          category: "estate-planning",
          author: "Robert Chen, JD, LLM",
          reading_time: 18,
          difficulty_level: "advanced",
          view_count: 1620,
          created_at: new Date().toISOString(),
          excerpt: "Effective estate planning requires coordination with asset protection strategies to ensure comprehensive..."
        },
        {
          id: 6,
          title: "Asset Protection for Medical Professionals",
          description: "Specialized asset protection strategies tailored for doctors, surgeons, and healthcare practitioners.",
          content_type: "case-study",
          category: "professionals",
          author: "Dr. Amanda Foster, MD, JD",
          reading_time: 10,
          difficulty_level: "intermediate",
          view_count: 1480,
          created_at: new Date().toISOString(),
          excerpt: "Medical professionals face unique liability risks that require specialized asset protection approaches..."
        }
      ]
    }
    
    return c.json({ featured })
    
  } catch (error) {
    console.error('Get featured content error:', error)
    return c.json({ error: 'Failed to get featured content' }, 500)
  }
})

export { app as educationRoutes }