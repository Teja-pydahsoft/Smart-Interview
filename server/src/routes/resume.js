const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const { PDFDocument } = require('pdf-lib');
const { createWorker } = require('tesseract.js');
const natural = require('natural');
const { tokenizer } = natural;

const router = express.Router();

// Configure logging for better diagnostics
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),
};

// Create upload directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// Configure upload settings with improved validation
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Increased to 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error(`Only ${allowed.join(', ')} files are allowed`));
    }
    cb(null, true);
  },
});

/**
 * Enhanced PDF text extraction with multiple strategies and OCR fallback
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileStats = await fs.promises.stat(filePath);
  logger.info(`Processing file: ${filePath} (${(fileStats.size / 1024 / 1024).toFixed(2)}MB)`);
  
  if (ext === '.pdf') {
    const buf = await fs.promises.readFile(filePath);
    let extractionResults = [];
    let extractedText = '';
    
    // Strategy 1: pdfjs-dist extraction (best for digital PDFs)
    try {
      const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
      if (pdfjs && typeof pdfjs.getDocument === 'function') {
        const loadingTask = pdfjs.getDocument({ data: buf });
        const pdf = await loadingTask.promise;
        logger.info(`pdfjs-dist: Successfully loaded PDF with ${pdf.numPages} pages`);
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          
          // Improved text extraction with position awareness
          const items = content.items.sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
              return a.transform[4] - b.transform[4];
            }
            return b.transform[5] - a.transform[5];
          });
          
          let lastY = null;
          let pageText = '';
          
          for (const item of items) {
            if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
              pageText += '\n';
            }
            pageText += item.str || '';
            lastY = item.transform[5];
          }
          
          fullText += pageText + '\n\n';
        }
        
        if (fullText.trim().length) {
          logger.info(`pdfjs-dist: Extracted ${fullText.length} characters`);
          extractionResults.push({
            method: 'pdfjs-dist',
            text: fullText,
            quality: fullText.split(/\s+/).length > 50 ? 'high' : 'low'
          });
          extractedText = fullText;
        } else {
          logger.warn('pdfjs-dist: Extracted empty text');
        }
      }
    } catch (err) {
      logger.error(`pdfjs-dist extraction failed: ${err.message}`);
    }
    
    // Strategy 2: pdf-parse (alternative parser with different approach)
    try {
      let parseFn;
      try {
        const mod = await import('pdf-parse');
        parseFn = mod.default || mod;
      } catch {
        parseFn = require('pdf-parse');
      }
      
      if (typeof parseFn === 'function') {
        const data = await parseFn(buf);
        if (data && typeof data.text === 'string' && data.text.trim().length) {
          logger.info(`pdf-parse: Extracted ${data.text.length} characters`);
          extractionResults.push({
            method: 'pdf-parse',
            text: data.text,
            quality: data.text.split(/\s+/).length > 50 ? 'high' : 'low'
          });
          
          // Use pdf-parse result if it's better than pdfjs-dist
          if (!extractedText || data.text.length > extractedText.length * 1.2) {
            extractedText = data.text;
          }
        } else {
          logger.warn('pdf-parse: Extracted empty text');
        }
      }
    } catch (err) {
      logger.error(`pdf-parse extraction failed: ${err.message}`);
    }
    
    // Strategy 3: OCR with Tesseract.js for scanned documents
    if (!extractedText || extractedText.length < 100) {
      try {
        // Check if PDF might be scanned (low text extraction results)
        const isPotentiallyScanned = !extractedText || extractedText.length < 200;
        
        if (isPotentiallyScanned) {
          logger.info('Detected potential scanned PDF, attempting OCR extraction');
          
          // Load PDF document with pdf-lib
          const pdfDoc = await PDFDocument.load(buf);
          const worker = await createWorker('eng');
          let ocrText = '';
          
          // Process first 5 pages maximum for performance
          const pageCount = Math.min(pdfDoc.getPageCount(), 5);
          
          for (let i = 0; i < pageCount; i++) {
            try {
              // Convert page to image and perform OCR
              const page = pdfDoc.getPage(i);
              const { width, height } = page.getSize();
              
              // Use external tool to render PDF page to image
              const tempImagePath = path.join(uploadDir, `temp_ocr_${Date.now()}.png`);
              await new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                exec(`magick convert -density 300 "${filePath}"[${i}] -quality 100 "${tempImagePath}"`, (error) => {
                  if (error) {
                    logger.error(`Failed to convert PDF page to image: ${error.message}`);
                    reject(error);
                  } else {
                    resolve();
                  }
                });
              });
              
              // Perform OCR on the image
              if (fs.existsSync(tempImagePath)) {
                const { data: { text } } = await worker.recognize(tempImagePath);
                ocrText += text + '\n\n';
                
                // Clean up temp file
                fs.unlinkSync(tempImagePath);
              }
            } catch (pageErr) {
              logger.error(`OCR failed for page ${i}: ${pageErr.message}`);
            }
          }
          
          await worker.terminate();
          
          if (ocrText.trim().length) {
            logger.info(`OCR: Extracted ${ocrText.length} characters`);
            extractionResults.push({
              method: 'tesseract-ocr',
              text: ocrText,
              quality: 'medium'
            });
            
            // Use OCR result if other methods failed
            if (!extractedText || ocrText.length > extractedText.length * 1.5) {
              extractedText = ocrText;
            }
          } else {
            logger.warn('OCR: Extracted empty text');
          }
        }
      } catch (ocrErr) {
        logger.error(`OCR extraction failed: ${ocrErr.message}`);
      }
    }
    
    // Return best extraction result or throw error
    if (extractedText && extractedText.trim().length) {
      // Clean up the text (remove excessive whitespace, normalize line breaks)
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      logger.info(`Final extracted text length: ${extractedText.length} characters`);
      return extractedText;
    }
    
    throw new Error('PDF_TEXT_EXTRACTION_FAILED');
  }
  
  if (ext === '.docx' || ext === '.doc') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result?.value || '';
      logger.info(`mammoth: Extracted ${text.length} characters from document`);
      return text;
    } catch (docErr) {
      logger.error(`Document extraction failed: ${docErr.message}`);
      throw new Error('DOCUMENT_PARSE_FAILED');
    }
  }
  
  throw new Error('UNSUPPORTED_FILE_TYPE');
}

/**
 * Enhanced resume parsing with section detection and structured data extraction
 * @param {string} text - Raw text content from resume
 * @returns {Object} - Structured resume data
 */
function parseResumeContent(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    logger.warn('Empty text provided for resume parsing');
    return {
      sections: {},
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certifications: [],
      internships: [],
      tags: []
    };
  }
  
  // Normalize text for consistent processing
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Section detection patterns
  const sectionPatterns = {
    education: /\b(education|academic background|academic history|academic qualification|degree|university|college)\b/i,
    experience: /\b(experience|work experience|employment|work history|professional experience|career)\b/i,
    projects: /\b(projects|personal projects|academic projects|project experience)\b/i,
    skills: /\b(skills|technical skills|core competencies|competencies|expertise|proficiencies)\b/i,
    certifications: /\b(certifications|certificates|professional certifications|credentials)\b/i,
    summary: /\b(summary|professional summary|profile|about me|objective|career objective)\b/i
  };
  
  // Split text into lines for processing
  const lines = normalizedText.split('\n');
  
  // Detect sections in the resume
  const sections = {};
  let currentSection = 'header';
  const sectionContent = { header: [] };
  
  // First pass: identify section headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if line is a potential section header
    const isPotentialHeader = 
      line.length < 50 && 
      (line === line.toUpperCase() || 
       line.match(/^[A-Z][a-z]/) || 
       line.match(/^[A-Z][\w\s]+:$/));
    
    if (isPotentialHeader) {
      let detectedSection = null;
      
      // Check against section patterns
      for (const [section, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(line)) {
          detectedSection = section;
          break;
        }
      }
      
      if (detectedSection) {
        currentSection = detectedSection;
        sections[currentSection] = { startLine: i, title: line };
        sectionContent[currentSection] = [];
      }
    }
    
    // Add line to current section
    sectionContent[currentSection].push(line);
  }
  
  // Second pass: determine section boundaries
  const sectionNames = Object.keys(sections);
  for (let i = 0; i < sectionNames.length; i++) {
    const currentName = sectionNames[i];
    const nextName = sectionNames[i + 1];
    
    if (nextName) {
      sections[currentName].endLine = sections[nextName].startLine - 1;
    } else {
      sections[currentName].endLine = lines.length - 1;
    }
    
    sections[currentName].content = sectionContent[currentName].join('\n');
  }
  
  // Extract education information
  const education = [];
  if (sections.education) {
    const eduText = sections.education.content;
    const eduEntries = eduText.split(/\n{2,}|\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*(present|current|now)/i);
    
    for (const entry of eduEntries) {
      if (entry.trim().length < 10) continue;
      
      const degreeMatch = entry.match(/\b(Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.E\.|M\.E\.|B\.Tech|M\.Tech|Associate)\b[^,;.]*(\bof\b|\bin\b)[^,;.]*/i);
      const institutionMatch = entry.match(/\b(University|College|Institute|School)\b[^,;.]*/i);
      const yearMatch = entry.match(/\b(20\d{2}|19\d{2})\s*-\s*(20\d{2}|19\d{2}|present|current|now)\b/i);
      const gpaMatch = entry.match(/\bGPA\s*:?\s*(\d+\.\d+|\d+\/\d+)/i);
      
      if (degreeMatch || institutionMatch) {
        education.push({
          degree: degreeMatch ? degreeMatch[0].trim() : '',
          institution: institutionMatch ? institutionMatch[0].trim() : '',
          period: yearMatch ? yearMatch[0].trim() : '',
          gpa: gpaMatch ? gpaMatch[1] : '',
          rawText: entry.trim()
        });
      }
    }
  }
  
  // Extract experience information
  const experience = [];
  if (sections.experience) {
    const expText = sections.experience.content;
    const expEntries = expText.split(/\n{2,}|\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*(present|current|now)/i);
    
    for (const entry of expEntries) {
      if (entry.trim().length < 10) continue;
      
      const companyMatch = entry.match(/^([^•\n-][^•\n]*?)(?:,|\n|$)/m);
      const titleMatch = entry.match(/\b(Software Engineer|Developer|Engineer|Intern|Manager|Director|Lead|Analyst|Consultant)\b[^,;.]*/i);
      const dateMatch = entry.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*-\s*(Present|Current|Now)\b/i);
      
      // Extract bullet points
      const bullets = entry.match(/[•\-*]\s*[^\n•\-*]*/g) || [];
      
      if (companyMatch || titleMatch) {
        experience.push({
          company: companyMatch ? companyMatch[1].trim() : '',
          title: titleMatch ? titleMatch[0].trim() : '',
          period: dateMatch ? dateMatch[0].trim() : '',
          description: bullets.map(b => b.replace(/^[•\-*]\s*/, '').trim()),
          isInternship: /intern/i.test(entry),
          rawText: entry.trim()
        });
      }
    }
  }
  
  // Extract projects information
  const projects = [];
  if (sections.projects) {
    const projText = sections.projects.content;
    const projEntries = projText.split(/\n{2,}|(?:^|\n)[\w\s]+:(?:\n|$)/);
    
    for (const entry of projEntries) {
      if (entry.trim().length < 10) continue;
      
      const titleMatch = entry.match(/^([^•\n][^•\n]*?)(?:,|\n|$)/m);
      const techMatch = entry.match(/\b(using|with|built\s+with|developed\s+with|technologies?:)\s+([^.;]*)/i);
      
      // Extract bullet points
      const bullets = entry.match(/[•\-*]\s*[^\n•\-*]*/g) || [];
      
      if (titleMatch) {
        projects.push({
          title: titleMatch[1].trim(),
          technologies: techMatch ? techMatch[2].trim() : '',
          description: bullets.map(b => b.replace(/^[•\-*]\s*/, '').trim()),
          rawText: entry.trim()
        });
      }
    }
  }
  
  // Extract skills
  const skills = [];
  const skillCategories = {
    languages: /\b(Java|Python|C\+\+|JavaScript|TypeScript|HTML|CSS|SQL|Ruby|Go|Swift|Kotlin|PHP|Rust|Scala|R|MATLAB|Perl|Shell|Bash)\b/i,
    frameworks: /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|ASP\.NET|Laravel|Ruby on Rails|TensorFlow|PyTorch|Keras|Pandas|NumPy|Bootstrap|jQuery|Redux|Next\.js)\b/i,
    databases: /\b(MySQL|PostgreSQL|MongoDB|SQLite|Oracle|SQL Server|Redis|Cassandra|DynamoDB|Firebase|Elasticsearch|Neo4j)\b/i,
    tools: /\b(Git|Docker|Kubernetes|AWS|Azure|GCP|Jenkins|Travis CI|CircleCI|Jira|Confluence|Slack|VS Code|IntelliJ|Eclipse|Postman|Figma|Sketch|Adobe XD)\b/i,
    concepts: /\b(Agile|Scrum|Kanban|CI\/CD|TDD|OOP|Functional Programming|Microservices|REST API|GraphQL|Machine Learning|Deep Learning|Data Science|Big Data|Cloud Computing|DevOps|SRE)\b/i
  };
  
  if (sections.skills) {
    const skillsText = sections.skills.content;
    
    // Extract skills by category
    for (const [category, pattern] of Object.entries(skillCategories)) {
      const matches = normalizedText.match(new RegExp(pattern, 'gi')) || [];
      const uniqueMatches = [...new Set(matches.map(m => m.trim()))];
      
      for (const skill of uniqueMatches) {
        skills.push({
          name: skill,
          category
        });
      }
    }
    
    // Extract additional skills from the skills section
    const skillLines = skillsText.split('\n');
    for (const line of skillLines) {
      const skillList = line.split(/[,:|•]/);
      for (const skill of skillList) {
        const trimmed = skill.trim();
        if (trimmed && trimmed.length > 1 && trimmed.length < 30) {
          // Check if skill is already added
          if (!skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
            skills.push({
              name: trimmed,
              category: 'other'
            });
          }
        }
      }
    }
  }
  
  // Extract certifications
  const certifications = [];
  const certWords = ['certificate', 'certification', 'certified', 'credential'];
  const certLines = normalizedText.split('\n').filter(line => 
    certWords.some(word => line.toLowerCase().includes(word))
  );
  
  for (const line of certLines) {
    certifications.push(line.trim());
  }
  
  // Extract internships
  const internships = experience
    .filter(exp => exp.isInternship)
    .map(exp => `${exp.title} at ${exp.company}`);
  
  // Extract domain tags
  const tags = new Set();
  const domains = [
    'frontend', 'backend', 'full stack', 'data science', 'machine learning',
    'devops', 'mobile', 'cloud', 'cybersecurity', 'artificial intelligence',
    'web development', 'software engineering', 'ui/ux', 'database', 'networking'
  ];
  
  for (const domain of domains) {
    if (normalizedText.toLowerCase().includes(domain)) {
      tags.add(domain);
    }
  }
  
  // Add tags based on skills
  const skillToDomain = {
    'React': 'frontend',
    'Angular': 'frontend',
    'Vue': 'frontend',
    'HTML': 'frontend',
    'CSS': 'frontend',
    'Node.js': 'backend',
    'Express': 'backend',
    'Django': 'backend',
    'Flask': 'backend',
    'Spring': 'backend',
    'TensorFlow': 'machine learning',
    'PyTorch': 'machine learning',
    'Keras': 'machine learning',
    'AWS': 'cloud',
    'Azure': 'cloud',
    'GCP': 'cloud',
    'Docker': 'devops',
    'Kubernetes': 'devops',
    'Jenkins': 'devops',
    'React Native': 'mobile',
    'Flutter': 'mobile',
    'Swift': 'mobile',
    'Kotlin': 'mobile'
  };
  
  for (const skill of skills) {
    const domain = skillToDomain[skill.name];
    if (domain) {
      tags.add(domain);
    }
  }
  
  return {
    sections,
    education,
    experience,
    projects,
    skills,
    certifications,
    internships,
    tags: Array.from(tags)
  };
}

/**
 * Resume upload and parsing endpoint
 * Handles file upload, text extraction, and structured resume parsing
 */
router.post('/upload', requireAuth, upload.single('resume'), async (req, res) => {
  const startTime = Date.now();
  const logContext = { userId: req.userId };
  
  try {
    if (!req.file) {
      logger.warn('No file uploaded', logContext);
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select a resume file to upload'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    logger.info(`Processing resume upload: ${fileType} file, ${(fileSize/1024/1024).toFixed(2)}MB`, {
      ...logContext,
      fileType,
      fileSize,
      fileName: req.file.filename
    });

    // Extract text from file with enhanced error handling
    let text = '';
    let parseError = null;
    let resumeData = {
      sections: {},
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certifications: [],
      internships: [],
      tags: []
    };

    try {
      // Step 1: Extract raw text from the document
      text = await extractTextFromFile(filePath);
      logger.info(`Text extraction successful: ${text.length} characters`, logContext);
      
      // Step 2: Parse the resume content into structured data
      if (text && text.trim().length > 0) {
        resumeData = parseResumeContent(text);
        logger.info('Resume parsing successful', {
          ...logContext,
          sectionCount: Object.keys(resumeData.sections).length,
          educationCount: resumeData.education.length,
          experienceCount: resumeData.experience.length,
          skillsCount: resumeData.skills.length
        });
      } else {
        logger.warn('Empty text extracted from resume', logContext);
        parseError = 'EMPTY_TEXT_EXTRACTED';
      }
    } catch (parseErr) {
      parseError = parseErr.message || 'UNKNOWN_PARSING_ERROR';
      logger.error(`Resume parsing error: ${parseError}`, {
        ...logContext,
        error: parseErr.stack || parseErr.toString()
      });
      
      // Continue with empty data rather than failing completely
      text = text || '';
    }

    // Step 3: Update user profile with resume data
    const updateData = {
      'profile.resumeUrl': fileUrl,
      'profile.resumeText': text,
      'profile.lastUpdated': new Date(),
      'profile.certifications': resumeData.certifications,
      'profile.internships': resumeData.internships,
      'profile.tags': resumeData.tags,
    };
    
    // Add structured data if available
    if (resumeData.education.length > 0) {
      updateData['profile.education'] = resumeData.education;
    }
    
    if (resumeData.experience.length > 0) {
      updateData['profile.experience'] = resumeData.experience;
    }
    
    if (resumeData.skills.length > 0) {
      updateData['profile.skills'] = resumeData.skills;
    }
    
    if (resumeData.projects.length > 0) {
      updateData['profile.projects'] = resumeData.projects;
    }

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true }
    );

    // Step 4: Return response with appropriate data and warnings
    const processingTime = Date.now() - startTime;
    logger.info(`Resume processing completed in ${processingTime}ms`, logContext);
    
    const response = { 
      user,
      resumeData: {
        education: resumeData.education,
        experience: resumeData.experience,
        skills: resumeData.skills,
        projects: resumeData.projects,
        certifications: resumeData.certifications,
        internships: resumeData.internships,
        tags: resumeData.tags
      },
      processingTime
    };
    
    // Add warnings if there were parsing issues
    if (parseError) {
      response.warnings = [{
        type: 'parsing_issue',
        message: 'We had some difficulty extracting all information from your resume.',
        details: parseError
      }];
      
      // Provide specific guidance based on error type
      if (parseError === 'PDF_TEXT_EXTRACTION_FAILED') {
        response.warnings.push({
          type: 'scanned_pdf',
          message: 'Your PDF appears to be scanned or image-based. For best results, please upload a digital PDF.'
        });
      }
    }
    
    // Check for potentially incomplete parsing
    if (text.length > 500 && 
        resumeData.education.length === 0 && 
        resumeData.experience.length === 0) {
      response.warnings = response.warnings || [];
      response.warnings.push({
        type: 'incomplete_parsing',
        message: 'We extracted text but couldn\'t identify education or experience sections. Please check your resume formatting.'
      });
    }

    return res.json(response);
  } catch (err) {
    // Handle specific error types
    if (err && err.message === 'UNSUPPORTED_FILE_TYPE') {
      logger.warn(`Unsupported file type: ${req.file?.originalname}`, logContext);
      return res.status(415).json({ 
        error: 'Unsupported file type',
        message: 'Please upload a PDF, DOC, or DOCX file.'
      });
    }
    
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      logger.warn('File size limit exceeded', logContext);
      return res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 15MB.'
      });
    }
    
    // Log detailed error for debugging
    logger.error('Resume upload failed:', {
      ...logContext,
      error: err.stack || err.toString(),
      message: err.message
    });
    
    // Return user-friendly error
    return res.status(500).json({ 
      error: 'Resume processing failed',
      message: 'We encountered an issue processing your resume. Please try again with a different file format or contact support.'
    });
  }
});

/**
 * Get parsed resume data endpoint
 * Returns the structured resume data for the authenticated user
 */
router.get('/parsed-data', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.profile || !user.profile.resumeText) {
      return res.status(404).json({
        error: 'No resume found',
        message: 'Please upload a resume first'
      });
    }
    
    // Parse the resume text if it exists but structured data doesn't
    let resumeData = {
      education: user.profile.education || [],
      experience: user.profile.experience || [],
      skills: user.profile.skills || [],
      projects: user.profile.projects || [],
      certifications: user.profile.certifications || [],
      internships: user.profile.internships || [],
      tags: user.profile.tags || []
    };
    
    // If we have resume text but no structured data, parse it again
    if (user.profile.resumeText && 
        (!resumeData.education.length && !resumeData.experience.length)) {
      try {
        const parsedData = parseResumeContent(user.profile.resumeText);
        resumeData = {
          education: parsedData.education,
          experience: parsedData.experience,
          skills: parsedData.skills,
          projects: parsedData.projects,
          certifications: parsedData.certifications,
          internships: parsedData.internships,
          tags: parsedData.tags
        };
        
        // Update the user profile with the newly parsed data
        await User.findByIdAndUpdate(req.userId, {
          $set: {
            'profile.education': resumeData.education,
            'profile.experience': resumeData.experience,
            'profile.skills': resumeData.skills,
            'profile.projects': resumeData.projects,
            'profile.certifications': resumeData.certifications,
            'profile.internships': resumeData.internships,
            'profile.tags': resumeData.tags
          }
        });
      } catch (parseErr) {
        logger.error(`Failed to parse existing resume: ${parseErr.message}`, {
          userId: req.userId
        });
      }
    }
    
    return res.json({ resumeData });
  } catch (err) {
    logger.error('Failed to retrieve parsed resume data:', {
      userId: req.userId,
      error: err.stack || err.toString()
    });
    
    return res.status(500).json({
      error: 'Failed to retrieve resume data',
      message: 'An error occurred while retrieving your resume data'
    });
  }
});

module.exports = router;
