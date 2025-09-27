import { Page } from 'puppeteer-core';
import { Job } from './schema';

interface JsonLdData {
  '@type'?: string | string[];
  [key: string]: any;
}

export class JobExtractor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async extractJob(url: string): Promise<Partial<Job>> {
    const job: Partial<Job> = {
      source_url: url,
      raw_schema_org: {}
    };

    try {
      // First try to extract from JSON-LD
      const jsonLdData = await this.extractJsonLd();
      if (jsonLdData) {
        Object.assign(job, this.mapJsonLdToJob(jsonLdData));
        job.raw_schema_org = jsonLdData;
      }

      // Fill missing fields with DOM extraction
      await this.fillMissingFieldsFromDOM(job);

      return job;
    } catch (error) {
      console.error('Error extracting job data:', error);
      return job;
    }
  }

  private async extractJsonLd(): Promise<JsonLdData | null> {
    try {
      const jsonLdScripts = await this.page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        return scripts.map(script => {
          try {
            return JSON.parse(script.textContent || '');
          } catch {
            return null;
          }
        }).filter(Boolean);
      });

      // Find JobPosting in the JSON-LD data
      for (const data of jsonLdScripts) {
        if (this.isJobPosting(data)) {
          return data;
        }
        
        // Check if it's an array containing JobPosting
        if (Array.isArray(data)) {
          const jobPosting = data.find(item => this.isJobPosting(item));
          if (jobPosting) return jobPosting;
        }

        // Check nested structures
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          const jobPosting = data['@graph'].find((item: any) => this.isJobPosting(item));
          if (jobPosting) return jobPosting;
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting JSON-LD:', error);
      return null;
    }
  }

  private isJobPosting(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const type = data['@type'];
    if (typeof type === 'string') return type === 'JobPosting';
    if (Array.isArray(type)) return type.includes('JobPosting');
    return false;
  }

  private mapJsonLdToJob(data: JsonLdData): Partial<Job> {
    const job: Partial<Job> = {};

    // Basic fields
    if (data.title) job.title = String(data.title);
    if (data.description) job.description_text = String(data.description);
    
    // Date fields
    if (data.datePosted) job.posting_date = this.parseDate(data.datePosted);
    if (data.validThrough) job.application_deadline = this.parseDate(data.validThrough);

    // Location
    const jobLocation = data.jobLocation;
    if (jobLocation) {
      job.location = {
        city: '',
        region: '',
        country: '',
        remote_policy: ''
      };

      if (jobLocation.address) {
        const address = jobLocation.address;
        if (address.addressLocality) job.location.city = String(address.addressLocality);
        if (address.addressRegion) job.location.region = String(address.addressRegion);
        if (address.addressCountry) job.location.country = String(address.addressCountry);
      }

      // Check for remote work indicators
      const locationText = JSON.stringify(jobLocation).toLowerCase();
      if (locationText.includes('remote') || locationText.includes('home')) {
        job.location.remote_policy = 'remote';
        job.work_model = 'remote';
      }
    }

    // Salary
    const baseSalary = data.baseSalary;
    if (baseSalary && baseSalary.value) {
      job.salary = {
        min: null,
        max: null,
        currency: '',
        period: ''
      };

      const value = baseSalary.value;
      if (value.minValue !== undefined) job.salary.min = Number(value.minValue);
      if (value.maxValue !== undefined) job.salary.max = Number(value.maxValue);
      if (value.value !== undefined && !job.salary.min && !job.salary.max) {
        job.salary.min = job.salary.max = Number(value.value);
      }
      
      if (value.currency) job.salary.currency = String(value.currency);
      if (value.unitText) {
        job.salary.period = this.normalizePeriod(String(value.unitText));
      }
    }

    // Employment type
    if (data.employmentType) {
      const empType = String(data.employmentType).toLowerCase();
      job.contract_type = this.normalizeContractType(empType);
    }

    // Experience requirements
    if (data.experienceRequirements) {
      const expReq = String(data.experienceRequirements);
      const years = this.extractYearsFromText(expReq);
      if (years.min_years !== null || years.max_years !== null) {
        job.required_experience = years;
      }
    }

    // Education requirements
    if (data.educationRequirements) {
      job.required_education = String(data.educationRequirements);
    }

    // Skills
    if (data.skills) {
      const skills = Array.isArray(data.skills) ? data.skills : [data.skills];
      job.hard_skills = skills.map(skill => String(skill));
    }

    // Responsibilities
    if (data.responsibilities) {
      const responsibilities = Array.isArray(data.responsibilities) 
        ? data.responsibilities 
        : [data.responsibilities];
      job.responsibilities = responsibilities.map(resp => String(resp));
    }

    // Work model from job location type
    if (data.jobLocationType) {
      const locationType = String(data.jobLocationType).toLowerCase();
      if (locationType.includes('telecommute') || locationType.includes('remote')) {
        job.work_model = 'remote';
      }
    }

    return job;
  }

  private async fillMissingFieldsFromDOM(job: Partial<Job>): Promise<void> {
    try {
      // Extract title if missing
      if (!job.title) {
        job.title = await this.extractTitle();
      }

      // Extract description if missing
      if (!job.description_text) {
        job.description_text = await this.extractDescription();
      }

      // Extract seniority from title
      if (job.title) {
        job.role_seniority = this.extractSeniority(job.title);
      }

      // Extract work model from description
      if (!job.work_model && job.description_text) {
        job.work_model = this.extractWorkModel(job.description_text);
      }

      // Extract additional information from page content
      const pageContent = await this.page.evaluate(() => document.body.textContent || '');
      
      // Extract skills from content
      if ((!job.hard_skills || job.hard_skills.length === 0) && pageContent) {
        const skills = this.extractSkillsFromText(pageContent);
        job.hard_skills = skills.hard;
        job.soft_skills = skills.soft;
        job.tech_stack = skills.tech;
      }

      // Extract salary if missing
      if (!job.salary?.min && !job.salary?.max) {
        const salaryInfo = this.extractSalaryFromText(pageContent);
        if (salaryInfo.min || salaryInfo.max) {
          job.salary = salaryInfo;
        }
      }

      // Extract location if missing
      if (!job.location?.city && !job.location?.country) {
        job.location = await this.extractLocation();
      }

    } catch (error) {
      console.error('Error filling missing fields from DOM:', error);
    }
  }

  private async extractTitle(): Promise<string> {
    const selectors = [
      'h1[data-testid*="job-title"]',
      'h1[class*="job-title"]',
      'h1[class*="position"]',
      '.job-title',
      '[data-test="job-title"]',
      'h1',
      '[class*="title"] h1',
      '[class*="header"] h1'
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.evaluate(el => el.textContent?.trim());
          if (text && text.length > 5 && text.length < 200) {
            return text;
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  private async extractDescription(): Promise<string> {
    const selectors = [
      '[data-testid*="job-description"]',
      '[class*="job-description"]',
      '[class*="description"]',
      '.job-details',
      '[data-test="job-description"]',
      '.content',
      '.body'
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.evaluate(el => el.textContent?.trim());
          if (text && text.length > 100) {
            return text;
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  private async extractLocation(): Promise<{ city: string; region: string; country: string; remote_policy: string }> {
    const selectors = [
      '[data-testid*="location"]',
      '[class*="location"]',
      '.job-location',
      '[data-test="location"]'
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.evaluate(el => el.textContent?.trim());
          if (text) {
            return this.parseLocation(text);
          }
        }
      } catch {
        continue;
      }
    }

    return { city: '', region: '', country: '', remote_policy: '' };
  }

  private extractSeniority(title: string): string {
    const seniorityKeywords = {
      'intern': ['intern', 'internship', 'stage'],
      'entry': ['entry', 'graduate', 'junior', 'jr'],
      'mid': ['mid', 'intermediate', 'mid-level'],
      'senior': ['senior', 'sr', 'experienced'],
      'lead': ['lead', 'team lead', 'tech lead'],
      'principal': ['principal', 'staff', 'architect'],
      'director': ['director', 'head of', 'vp', 'vice president'],
      'c-level': ['ceo', 'cto', 'cfo', 'coo', 'chief']
    };

    const lowerTitle = title.toLowerCase();
    
    for (const [level, keywords] of Object.entries(seniorityKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return level;
      }
    }

    return '';
  }

  private extractWorkModel(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('remote') && lowerText.includes('office')) {
      return 'hybrid';
    }
    
    if (lowerText.includes('remote') || lowerText.includes('work from home') || lowerText.includes('wfh')) {
      return 'remote';
    }
    
    if (lowerText.includes('on-site') || lowerText.includes('office')) {
      return 'on-site';
    }
    
    return '';
  }

  private extractSkillsFromText(text: string): { hard: string[]; soft: string[]; tech: string[] } {
    const techSkills = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
      'nodejs', 'express', 'django', 'flask', 'spring', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'mysql', 'postgresql', 'mongodb', 'redis',
      'git', 'jenkins', 'gitlab', 'github', 'jira', 'confluence'
    ];

    const softSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving',
      'analytical', 'creative', 'adaptable', 'organized', 'detail-oriented'
    ];

    const lowerText = text.toLowerCase();
    
    const foundTech = techSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
    const foundSoft = softSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
    
    // Extract additional hard skills using patterns
    const skillPatterns = /(?:experience with|knowledge of|proficient in|skilled in)\s+([^.]+)/gi;
    const hardSkills = [...foundTech];
    
    let match;
    while ((match = skillPatterns.exec(text)) !== null) {
      const skillText = match[1].trim();
      if (skillText.length < 100) { // Avoid very long matches
        hardSkills.push(...skillText.split(/[,;&]+/).map(s => s.trim()).filter(s => s.length > 2));
      }
    }

    return {
      hard: [...new Set(hardSkills)].slice(0, 20), // Limit and dedupe
      soft: [...new Set(foundSoft)].slice(0, 10),
      tech: [...new Set(foundTech)].slice(0, 15)
    };
  }

  private extractSalaryFromText(text: string): { min: number | null; max: number | null; currency: string; period: string } {
    // Patterns for salary extraction
    const salaryPatterns = [
      /(\$|€|£|USD|EUR|GBP)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per\s+year|\/year|annually|per\s+month|\/month|per\s+hour|\/hour)?/gi,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(\$|€|£|USD|EUR|GBP)\s*(per\s+year|\/year|annually|per\s+month|\/month|per\s+hour|\/hour)?/gi
    ];

    for (const pattern of salaryPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const [, currency, min, max, period] = match;
        return {
          min: this.parseNumber(min),
          max: this.parseNumber(max),
          currency: this.normalizeCurrency(currency),
          period: this.normalizePeriod(period || 'year')
        };
      }
    }

    return { min: null, max: null, currency: '', period: '' };
  }

  private parseLocation(locationText: string): { city: string; region: string; country: string; remote_policy: string } {
    const location = { city: '', region: '', country: '', remote_policy: '' };
    
    if (locationText.toLowerCase().includes('remote')) {
      location.remote_policy = 'remote';
    }

    // Parse "City, State, Country" format
    const parts = locationText.split(',').map(p => p.trim());
    if (parts.length >= 1) location.city = parts[0];
    if (parts.length >= 2) location.region = parts[1];
    if (parts.length >= 3) location.country = parts[2];

    return location;
  }

  private parseDate(dateString: string): string {
    try {
      return new Date(dateString).toISOString();
    } catch {
      return dateString;
    }
  }

  private parseNumber(numString: string): number {
    return parseInt(numString.replace(/[,\s]/g, ''), 10);
  }

  private normalizeCurrency(currency: string): string {
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      'usd': 'USD',
      'eur': 'EUR',
      'gbp': 'GBP'
    };

    return currencyMap[currency.toLowerCase()] || currency.toUpperCase();
  }

  private normalizePeriod(period: string): string {
    const lowerPeriod = period.toLowerCase();
    if (lowerPeriod.includes('year') || lowerPeriod.includes('annual')) return 'year';
    if (lowerPeriod.includes('month')) return 'month';
    if (lowerPeriod.includes('hour')) return 'hour';
    if (lowerPeriod.includes('day')) return 'day';
    return 'year';
  }

  private normalizeContractType(empType: string): string {
    if (empType.includes('full')) return 'full-time';
    if (empType.includes('part')) return 'part-time';
    if (empType.includes('contract')) return 'contract';
    if (empType.includes('intern')) return 'internship';
    if (empType.includes('temporary')) return 'temporary';
    return empType;
  }

  private extractYearsFromText(text: string): { min_years: number | null; max_years: number | null } {
    const yearPatterns = [
      /(\d+)\s*-\s*(\d+)\s*years?/i,
      /(\d+)\+?\s*years?/i,
      /minimum\s+(\d+)\s*years?/i,
      /at\s+least\s+(\d+)\s*years?/i
    ];

    for (const pattern of yearPatterns) {
      const match = pattern.exec(text);
      if (match) {
        if (match[2]) {
          return { min_years: parseInt(match[1]), max_years: parseInt(match[2]) };
        } else {
          return { min_years: parseInt(match[1]), max_years: null };
        }
      }
    }

    return { min_years: null, max_years: null };
  }
}
