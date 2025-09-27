import { JSDOM } from 'jsdom';
import { Company } from './schema';
import { LightpandaCloudClient } from './lightpandaCloud';

export class CompanyEnricherCloud {
  private lightpandaClient: LightpandaCloudClient;

  constructor(lightpandaClient: LightpandaCloudClient) {
    this.lightpandaClient = lightpandaClient;
  }

  async enrichCompany(
    jobHtml: string,
    hiringOrgName?: string, 
    hiringOrgUrl?: string
  ): Promise<Partial<Company>> {
    const company: Partial<Company> = {
      name: hiringOrgName || '',
      data_sources: []
    };

    try {
      // Step 1: Try to find company information from the job page HTML
      if (!company.name) {
        company.name = this.extractCompanyNameFromHtml(jobHtml);
      }

      // Step 2: Find company website if not provided
      let companyWebsite = hiringOrgUrl;
      if (!companyWebsite) {
        companyWebsite = this.findCompanyWebsiteFromHtml(jobHtml, company.name || '');
      }

      if (companyWebsite) {
        company.website = companyWebsite;
        company.data_sources!.push(companyWebsite);
      }

      // Step 3: Enrich from official website
      if (companyWebsite) {
        await this.enrichFromOfficialWebsite(company, companyWebsite);
      }

      // Step 4: Try Wikipedia
      if (company.name) {
        await this.enrichFromWikipedia(company, company.name);
      }

      // Step 5: Try LinkedIn company page (if publicly accessible)
      if (company.name) {
        await this.enrichFromLinkedIn(company, company.name);
      }

      return company;
    } catch (error) {
      console.error('Error enriching company:', error);
      return company;
    }
  }

  private extractCompanyNameFromHtml(html: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const selectors = [
        '[data-testid*="company"]',
        '[class*="company"]',
        '.employer',
        '[data-test="company"]',
        'a[href*="/company/"]',
        'a[href*="/companies/"]'
      ];

      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent?.trim();
            if (text && text.length > 1 && text.length < 100) {
              return text;
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error('Error extracting company name from HTML:', error);
    }

    return '';
  }

  private findCompanyWebsiteFromHtml(html: string, companyName: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Look for links that might be company websites
      const links = Array.from(document.querySelectorAll('a')).map(link => ({
        href: link.href,
        text: link.textContent?.trim() || ''
      }));

      // Filter for potential company websites
      for (const link of links) {
        const href = link.href.toLowerCase();
        const text = link.text.toLowerCase();
        
        // Skip obvious non-company links
        if (href.includes('mailto:') || 
            href.includes('tel:') || 
            href.includes('linkedin.com/in/') ||
            href.includes('twitter.com') ||
            href.includes('facebook.com')) {
          continue;
        }

        // Look for company domain patterns
        if ((text.includes('website') || text.includes('company') || text.includes('visit')) &&
            (href.includes('.com') || href.includes('.org') || href.includes('.io'))) {
          return link.href;
        }

        // Look for domain that might match company name
        if (companyName && href.includes(companyName.toLowerCase().replace(/\s+/g, ''))) {
          return link.href;
        }
      }
    } catch (error) {
      console.error('Error finding company website:', error);
    }

    return '';
  }

  private async enrichFromOfficialWebsite(company: Partial<Company>, websiteUrl: string): Promise<void> {
    try {
      // Scrape the homepage
      const result = await this.lightpandaClient.scrape(websiteUrl, {
        waitTime: 3000,
        javascript: true
      });

      if (result.success && result.data?.html) {
        await this.extractFromHomepage(company, result.data.html);
        
        // Try visiting /about, /company, /careers pages
        const subPaths = ['/about', '/company', '/about-us', '/careers'];
        
        for (const subPath of subPaths) {
          try {
            const subUrl = new URL(subPath, websiteUrl).href;
            const subResult = await this.lightpandaClient.scrape(subUrl, {
              waitTime: 2000,
              javascript: true
            });

            if (subResult.success && subResult.data?.html) {
              await this.extractFromAboutPage(company, subResult.data.html);
            }
          } catch {
            // Continue if subpage doesn't exist
          }
        }
      }
    } catch (error) {
      console.error(`Error enriching from website ${websiteUrl}:`, error);
    }
  }

  private async extractFromHomepage(company: Partial<Company>, html: string): Promise<void> {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract meta description
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      if (metaDescription && !company.about_summary) {
        company.about_summary = metaDescription;
      }

      // Look for industry keywords in content
      const pageContent = document.body.textContent || '';
      
      if (!company.industry) {
        company.industry = this.extractIndustry(pageContent);
      }

      // Look for company size indicators
      if (!company.size_employees?.min && !company.size_employees?.max) {
        const sizeInfo = this.extractCompanySize(pageContent);
        if (sizeInfo.min || sizeInfo.max) {
          company.size_employees = sizeInfo;
        }
      }

      // Extract founding year
      if (!company.founded_year) {
        company.founded_year = this.extractFoundingYear(pageContent);
      }

      // Extract location from footer or contact info
      if (!company.hq_location?.city) {
        company.hq_location = this.extractHeadquarters(pageContent);
      }

    } catch (error) {
      console.error('Error extracting from homepage:', error);
    }
  }

  private async extractFromAboutPage(company: Partial<Company>, html: string): Promise<void> {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const pageContent = document.body.textContent || '';
      
      // Update about summary if we find a better one
      const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim() || '');

      const longParagraph = paragraphs.find(p => p.length > 100 && p.length < 500);
      if (longParagraph && !company.about_summary) {
        company.about_summary = longParagraph;
      }

      // Extract values and culture
      if (!company.work_culture) {
        company.work_culture = { values: [], benefits: [], remote_policy: '' };
      }

      const values = this.extractValues(pageContent);
      if (values.length > 0) {
        company.work_culture.values = values;
      }

      const benefits = this.extractBenefits(pageContent);
      if (benefits.length > 0) {
        company.work_culture.benefits = benefits;
      }

    } catch (error) {
      console.error('Error extracting from about page:', error);
    }
  }

  private async enrichFromWikipedia(company: Partial<Company>, companyName: string): Promise<void> {
    try {
      const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(companyName.replace(/\s+/g, '_'))}`;
      
      const result = await this.lightpandaClient.scrape(wikipediaUrl, {
        waitTime: 2000,
        javascript: false  // Wikipedia doesn't need JS
      });

      if (result.success && result.data?.html) {
        const dom = new JSDOM(result.data.html);
        const pageContent = dom.window.document.body.textContent || '';
        
        // Check if this is actually a company page
        if (pageContent.includes('company') || pageContent.includes('corporation') || pageContent.includes('founded')) {
          company.wikipedia_url = wikipediaUrl;
          company.data_sources!.push(wikipediaUrl);

          // Extract founding year from Wikipedia
          if (!company.founded_year) {
            const foundingMatch = pageContent.match(/founded[:\s]+(\d{4})/i);
            if (foundingMatch) {
              company.founded_year = parseInt(foundingMatch[1]);
            }
          }

          // Extract industry from Wikipedia
          if (!company.industry) {
            const industryMatch = pageContent.match(/industry[:\s]+([^.\n]+)/i);
            if (industryMatch) {
              company.industry = industryMatch[1].trim();
            }
          }

          // Extract better summary from first paragraph
          const document = dom.window.document;
          const paras = document.querySelectorAll('#mw-content-text p');
          for (const para of paras) {
            const text = para.textContent?.trim();
            if (text && text.length > 100) {
              if (text.length > (company.about_summary?.length || 0)) {
                company.about_summary = text;
              }
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enriching from Wikipedia:', error);
    }
  }

  private async enrichFromLinkedIn(company: Partial<Company>, companyName: string): Promise<void> {
    try {
      // Only attempt LinkedIn if we can reasonably construct a URL
      const linkedinUrl = `https://www.linkedin.com/company/${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, '-'))}`;
      
      const result = await this.lightpandaClient.scrape(linkedinUrl, {
        waitTime: 3000,
        javascript: true
      });

      if (result.success && result.data?.html) {
        const dom = new JSDOM(result.data.html);
        const document = dom.window.document;
        
        // Check if we can access the page (not blocked by login)
        const title = document.title;
        if (!title.includes('Sign In') && !title.includes('Join LinkedIn')) {
          company.linkedin_url = linkedinUrl;
          company.data_sources!.push(linkedinUrl);

          // Extract basic info if available publicly
          const pageContent = document.body.textContent || '';
          
          if (!company.about_summary) {
            // Try to find company description
            const descElements = document.querySelectorAll('[data-test-id*="description"], .org-about-us-organization-description__text');
            for (const elem of descElements) {
              const text = elem.textContent?.trim();
              if (text && text.length > 50) {
                company.about_summary = text;
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enriching from LinkedIn:', error);
    }
  }

  // Utility methods (same as in original CompanyEnricher)
  private extractIndustry(content: string): string {
    const industries = [
      'technology', 'software', 'fintech', 'healthcare', 'finance', 'consulting',
      'retail', 'e-commerce', 'education', 'manufacturing', 'automotive', 'aerospace',
      'telecommunications', 'media', 'entertainment', 'energy', 'utilities', 'real estate',
      'logistics', 'transportation', 'hospitality', 'travel', 'insurance', 'banking'
    ];

    const lowerContent = content.toLowerCase();
    
    for (const industry of industries) {
      if (lowerContent.includes(industry)) {
        return industry.charAt(0).toUpperCase() + industry.slice(1);
      }
    }

    return '';
  }

  private extractCompanySize(content: string): { min: number | null; max: number | null } {
    const sizePatterns = [
      /(\d+)\s*-\s*(\d+)\s*employees/i,
      /(\d+)\+?\s*employees/i,
      /(small|medium|large)\s*company/i,
      /team\s+of\s+(\d+)/i
    ];

    for (const pattern of sizePatterns) {
      const match = pattern.exec(content);
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]) };
        } else if (match[1] && !isNaN(parseInt(match[1]))) {
          const size = parseInt(match[1]);
          return { min: size, max: null };
        } else if (match[1]) {
          // Handle text-based sizes
          const sizeText = match[1].toLowerCase();
          if (sizeText === 'small') return { min: 1, max: 50 };
          if (sizeText === 'medium') return { min: 51, max: 500 };
          if (sizeText === 'large') return { min: 501, max: null };
        }
      }
    }

    return { min: null, max: null };
  }

  private extractFoundingYear(content: string): number | null {
    const yearPatterns = [
      /founded[:\s]+(\d{4})/i,
      /established[:\s]+(\d{4})/i,
      /since[:\s]+(\d{4})/i,
      /(\d{4})[^\d]*founded/i
    ];

    for (const pattern of yearPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          return year;
        }
      }
    }

    return null;
  }

  private extractHeadquarters(content: string): { city: string; region: string; country: string } {
    const hqPatterns = [
      /headquarter[^.]*?([A-Z][a-z]+),?\s*([A-Z][a-z]*),?\s*([A-Z][a-z]+)/i,
      /based\s+in[^.]*?([A-Z][a-z]+),?\s*([A-Z][a-z]*),?\s*([A-Z][a-z]+)/i,
      /located\s+in[^.]*?([A-Z][a-z]+),?\s*([A-Z][a-z]*),?\s*([A-Z][a-z]+)/i
    ];

    for (const pattern of hqPatterns) {
      const match = pattern.exec(content);
      if (match) {
        return {
          city: match[1] || '',
          region: match[2] || '',
          country: match[3] || ''
        };
      }
    }

    return { city: '', region: '', country: '' };
  }

  private extractValues(content: string): string[] {
    const valueKeywords = [
      'innovation', 'integrity', 'excellence', 'collaboration', 'respect',
      'transparency', 'quality', 'customer focus', 'teamwork', 'accountability',
      'diversity', 'sustainability', 'growth', 'trust', 'passion'
    ];

    const lowerContent = content.toLowerCase();
    const foundValues = valueKeywords.filter(value => lowerContent.includes(value));

    return foundValues.slice(0, 8); // Limit to top 8 values
  }

  private extractBenefits(content: string): string[] {
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'retirement',
      'remote work', 'flexible hours', 'pto', 'vacation', 'sick leave',
      'parental leave', 'stock options', 'equity', 'bonus', 'tuition reimbursement',
      'gym membership', 'wellness', 'commuter benefits', 'lunch', 'snacks'
    ];

    const lowerContent = content.toLowerCase();
    const foundBenefits = benefitKeywords.filter(benefit => lowerContent.includes(benefit));

    return foundBenefits.slice(0, 10); // Limit to top 10 benefits
  }
}
