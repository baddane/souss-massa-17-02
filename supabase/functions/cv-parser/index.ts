import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// Configuration Gemini API
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent'

// Configuration Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!GEMINI_API_KEY || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string
    }>
  }>
}

interface ParsedCV {
  name: string
  email: string
  phone: string
  address: string
  education: Array<{
    degree: string
    school: string
    year: string
  }>
  experience: Array<{
    position: string
    company: string
    duration: string
    description: string
  }>
  skills: string[]
  languages: string[]
  summary: string
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    
    if (req.method === 'POST' && url.pathname === '/parse-cv') {
      return await parseCV(req)
    }
    
    if (req.method === 'POST' && url.pathname === '/parse-company-doc') {
      return await parseCompanyDoc(req)
    }
    
    return new Response('Not Found', { status: 404 })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function parseCV(req: Request): Promise<Response> {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string

  if (!file || !userId) {
    return new Response(JSON.stringify({ error: 'Missing file or user_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Convertir le fichier en base64
  const arrayBuffer = await file.arrayBuffer()
  const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  
  // Appeler Gemini API pour parser le CV
  const cvData = await extractCVData(base64Content, file.type)
  
  // Mettre à jour le profil étudiant dans Supabase
  const { data, error } = await supabase
    .from('student_profiles')
    .update({
      first_name: cvData.name.split(' ')[0],
      last_name: cvData.name.split(' ').slice(1).join(' '),
      phone: cvData.phone,
      address: cvData.address,
      education_level: cvData.education[0]?.degree || '',
      field_of_study: cvData.education[0]?.school || '',
      skills: cvData.skills,
      languages: cvData.languages,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()

  if (error) {
    throw error
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: cvData,
    profile_updated: data 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function parseCompanyDoc(req: Request): Promise<Response> {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string

  if (!file || !userId) {
    return new Response(JSON.stringify({ error: 'Missing file or user_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Convertir le fichier en base64
  const arrayBuffer = await file.arrayBuffer()
  const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  
  // Appeler Gemini API pour parser le document entreprise
  const companyData = await extractCompanyData(base64Content, file.type)
  
  // Mettre à jour le profil entreprise dans Supabase
  const { data, error } = await supabase
    .from('company_profiles')
    .update({
      company_name: companyData.name,
      company_description: companyData.description,
      industry: companyData.industry,
      company_size: companyData.size,
      website_url: companyData.website,
      address: companyData.address,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()

  if (error) {
    throw error
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: companyData,
    profile_updated: data 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function extractCVData(base64Content: string, mimeType: string): Promise<ParsedCV> {
  const prompt = `
    Analyze this CV/resume document and extract the following information:
    
    1. Full name
    2. Email address
    3. Phone number
    4. Address
    5. Education history (degree, school, year)
    6. Work experience (position, company, duration, description)
    7. Skills (list)
    8. Languages (list)
    9. Professional summary
    
    Return the result in JSON format with the following structure:
    {
      "name": "string",
      "email": "string", 
      "phone": "string",
      "address": "string",
      "education": [{"degree": "string", "school": "string", "year": "string"}],
      "experience": [{"position": "string", "company": "string", "duration": "string", "description": "string"}],
      "skills": ["string"],
      "languages": ["string"],
      "summary": "string"
    }
    
    Document content: ${base64Content}
  `

  const geminiRequest: GeminiRequest = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(geminiRequest)
  })

  const result = await response.json()
  
  // Extraire le texte de la réponse Gemini
  const text = result.candidates[0].content.parts[0].text
  
  // Parser le JSON retourné par Gemini
  const cvData = JSON.parse(text.replace(/```json|```/g, '').trim())
  
  return cvData
}

async function extractCompanyData(base64Content: string, mimeType: string): Promise<any> {
  const prompt = `
    Analyze this company document (Kbis, registration document, etc.) and extract:
    
    1. Company name
    2. Company description/business activity
    3. Industry sector
    4. Company size/number of employees
    5. Website URL
    6. Address
    7. Registration number
    8. Legal form
    
    Return in JSON format:
    {
      "name": "string",
      "description": "string",
      "industry": "string", 
      "size": "string",
      "website": "string",
      "address": "string",
      "registration_number": "string",
      "legal_form": "string"
    }
    
    Document content: ${base64Content}
  `

  const geminiRequest: GeminiRequest = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(geminiRequest)
  })

  const result = await response.json()
  
  const text = result.candidates[0].content.parts[0].text
  const companyData = JSON.parse(text.replace(/```json|```/g, '').trim())
  
  return companyData
}

// Pour le développement local
if (import.meta.main) {
  serve(() => new Response('Supabase Edge Function'))
}