import { JobData } from './schema';

export class DataNormalizer {
  private static readonly COUNTRY_CODES: { [key: string]: string } = {
    'usa': 'US',
    'united states': 'US',
    'america': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'england': 'GB',
    'britain': 'GB',
    'canada': 'CA',
    'germany': 'DE',
    'deutschland': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'netherlands': 'NL',
    'holland': 'NL',
    'australia': 'AU',
    'japan': 'JP',
    'china': 'CN',
    'india': 'IN',
    'brazil': 'BR',
    'mexico': 'MX',
    'russia': 'RU',
    'poland': 'PL',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'switzerland': 'CH',
    'austria': 'AT',
    'belgium': 'BE',
    'ireland': 'IE',
    'portugal': 'PT',
    'czech republic': 'CZ',
    'hungary': 'HU',
    'romania': 'RO',
    'greece': 'GR',
    'turkey': 'TR',
    'israel': 'IL',
    'south africa': 'ZA',
    'singapore': 'SG',
    'hong kong': 'HK',
    'south korea': 'KR',
    'taiwan': 'TW',
    'thailand': 'TH',
    'malaysia': 'MY',
    'indonesia': 'ID',
    'philippines': 'PH',
    'vietnam': 'VN',
    'argentina': 'AR',
    'chile': 'CL',
    'colombia': 'CO',
    'peru': 'PE',
    'ukraine': 'UA',
    'estonia': 'EE',
    'latvia': 'LV',
    'lithuania': 'LT',
    'croatia': 'HR',
    'slovenia': 'SI',
    'slovakia': 'SK',
    'bulgaria': 'BG',
    'serbia': 'RS',
    'bosnia': 'BA',
    'montenegro': 'ME',
    'north macedonia': 'MK',
    'albania': 'AL',
    'moldova': 'MD',
    'belarus': 'BY',
    'georgia': 'GE',
    'armenia': 'AM',
    'azerbaijan': 'AZ',
    'kazakhstan': 'KZ',
    'uzbekistan': 'UZ',
    'kyrgyzstan': 'KG',
    'tajikistan': 'TJ',
    'turkmenistan': 'TM',
    'afghanistan': 'AF',
    'pakistan': 'PK',
    'bangladesh': 'BD',
    'sri lanka': 'LK',
    'myanmar': 'MM',
    'cambodia': 'KH',
    'laos': 'LA',
    'mongolia': 'MN',
    'nepal': 'NP',
    'bhutan': 'BT',
    'maldives': 'MV'
  };

  private static readonly CURRENCY_CODES: { [key: string]: string } = {
    '$': 'USD',
    'usd': 'USD',
    'dollar': 'USD',
    'dollars': 'USD',
    '€': 'EUR',
    'eur': 'EUR',
    'euro': 'EUR',
    'euros': 'EUR',
    '£': 'GBP',
    'gbp': 'GBP',
    'pound': 'GBP',
    'pounds': 'GBP',
    'cad': 'CAD',
    'aud': 'AUD',
    'jpy': 'JPY',
    '¥': 'JPY',
    'yen': 'JPY',
    'chf': 'CHF',
    'sek': 'SEK',
    'nok': 'NOK',
    'dkk': 'DKK',
    'pln': 'PLN',
    'czk': 'CZK',
    'huf': 'HUF',
    'ron': 'RON',
    'bgn': 'BGN',
    'hrk': 'HRK',
    'rub': 'RUB',
    'inr': 'INR',
    'cny': 'CNY',
    'sgd': 'SGD',
    'hkd': 'HKD',
    'krw': 'KRW',
    'twd': 'TWD',
    'thb': 'THB',
    'myr': 'MYR',
    'idr': 'IDR',
    'php': 'PHP',
    'vnd': 'VND',
    'brl': 'BRL',
    'ars': 'ARS',
    'clp': 'CLP',
    'cop': 'COP',
    'pen': 'PEN',
    'mxn': 'MXN',
    'uah': 'UAH',
    'ils': 'ILS',
    'zar': 'ZAR',
    'try': 'TRY'
  };

  static normalize(data: {
    job?: Partial<JobData['job']>;
    company?: Partial<JobData['company']>;
    metadata?: Partial<JobData['metadata']>;
  }): JobData {
    const normalized: JobData = {
      job: {
        source_url: '',
        title: '',
        role_seniority: '',
        department_function: '',
        contract_type: '',
        work_model: '',
        location: { city: '', region: '', country: '', remote_policy: '' },
        salary: { min: null, max: null, currency: '', period: '' },
        required_experience: { min_years: null, max_years: null },
        required_education: '',
        languages: [],
        hard_skills: [],
        soft_skills: [],
        tech_stack: [],
        responsibilities: [],
        nice_to_have: [],
        visa_sponsorship: null,
        relocation: null,
        posting_date: '',
        application_deadline: '',
        description_text: '',
        raw_schema_org: {},
        detected_duplicates: []
      },
      company: {
        name: '',
        aka: [],
        website: '',
        linkedin_url: '',
        wikipedia_url: '',
        industry: '',
        company_type: '',
        founded_year: null,
        size_employees: { min: null, max: null },
        hq_location: { city: '', region: '', country: '' },
        locations: [],
        work_culture: { values: [], benefits: [], remote_policy: '' },
        funding: { status: '', latest_round: '', investors: [] },
        public_ticker: '',
        about_summary: '',
        data_sources: []
      },
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda+puppeteer',
        notes: []
      }
    };

    // Deep merge the provided data
    if (data.job) {
      Object.assign(normalized.job, data.job);
    }
    if (data.company) {
      Object.assign(normalized.company, data.company);
    }
    if (data.metadata) {
      Object.assign(normalized.metadata, data.metadata);
    }

    // Apply normalization rules
    this.normalizeJob(normalized.job);
    this.normalizeCompany(normalized.company);
    
    return normalized;
  }

  private static normalizeJob(job: JobData['job']): void {
    // Normalize location
    if (job.location) {
      job.location.country = this.normalizeCountry(job.location.country);
      job.location.city = this.capitalizeFirst(job.location.city);
      job.location.region = this.capitalizeFirst(job.location.region);
    }

    // Normalize salary
    if (job.salary) {
      job.salary.currency = this.normalizeCurrency(job.salary.currency);
      job.salary.period = this.normalizePeriod(job.salary.period);
      
      // Ensure salary range is logical (min <= max)
      if (job.salary.min && job.salary.max && job.salary.min > job.salary.max) {
        [job.salary.min, job.salary.max] = [job.salary.max, job.salary.min];
      }
    }

    // Normalize contract type
    job.contract_type = this.normalizeContractType(job.contract_type);
    
    // Normalize work model
    job.work_model = this.normalizeWorkModel(job.work_model);

    // Normalize seniority
    job.role_seniority = this.normalizeSeniority(job.role_seniority);

    // Normalize and deduplicate arrays
    job.languages = this.normalizeStringArray(job.languages);
    job.hard_skills = this.normalizeSkillsArray(job.hard_skills);
    job.soft_skills = this.normalizeSkillsArray(job.soft_skills);
    job.tech_stack = this.normalizeSkillsArray(job.tech_stack);
    job.responsibilities = this.normalizeStringArray(job.responsibilities);
    job.nice_to_have = this.normalizeStringArray(job.nice_to_have);
    
    // Normalize strings
    job.title = this.cleanString(job.title);
    job.department_function = this.cleanString(job.department_function);
    job.required_education = this.cleanString(job.required_education);
    job.description_text = this.cleanString(job.description_text);

    // Validate dates
    job.posting_date = this.normalizeDate(job.posting_date);
    job.application_deadline = this.normalizeDate(job.application_deadline);
  }

  private static normalizeCompany(company: JobData['company']): void {
    // Normalize company name and AKAs
    company.name = this.cleanString(company.name);
    company.aka = this.normalizeStringArray(company.aka);

    // Normalize URLs
    company.website = this.normalizeUrl(company.website);
    company.linkedin_url = this.normalizeUrl(company.linkedin_url);
    company.wikipedia_url = this.normalizeUrl(company.wikipedia_url);

    // Normalize location
    if (company.hq_location) {
      company.hq_location.country = this.normalizeCountry(company.hq_location.country);
      company.hq_location.city = this.capitalizeFirst(company.hq_location.city);
      company.hq_location.region = this.capitalizeFirst(company.hq_location.region);
    }

    // Normalize other locations
    company.locations = company.locations.map(loc => ({
      city: this.capitalizeFirst(loc.city),
      region: this.capitalizeFirst(loc.region),
      country: this.normalizeCountry(loc.country)
    }));

    // Normalize work culture arrays
    if (company.work_culture) {
      company.work_culture.values = this.normalizeStringArray(company.work_culture.values);
      company.work_culture.benefits = this.normalizeStringArray(company.work_culture.benefits);
      company.work_culture.remote_policy = this.normalizeWorkModel(company.work_culture.remote_policy);
    }

    // Normalize funding
    if (company.funding) {
      company.funding.investors = this.normalizeStringArray(company.funding.investors);
      company.funding.status = this.cleanString(company.funding.status);
      company.funding.latest_round = this.cleanString(company.funding.latest_round);
    }

    // Normalize employee size range
    if (company.size_employees?.min && company.size_employees?.max && 
        company.size_employees.min > company.size_employees.max) {
      [company.size_employees.min, company.size_employees.max] = 
        [company.size_employees.max, company.size_employees.min];
    }

    // Normalize other fields
    company.industry = this.capitalizeFirst(company.industry);
    company.company_type = this.cleanString(company.company_type);
    company.public_ticker = company.public_ticker.toUpperCase();
    company.about_summary = this.cleanString(company.about_summary);
    company.data_sources = this.normalizeStringArray(company.data_sources);
  }

  private static normalizeCountry(country: string): string {
    if (!country) return '';
    
    const normalized = country.toLowerCase().trim();
    return this.COUNTRY_CODES[normalized] || country.toUpperCase();
  }

  private static normalizeCurrency(currency: string): string {
    if (!currency) return '';
    
    const normalized = currency.toLowerCase().trim();
    return this.CURRENCY_CODES[normalized] || currency.toUpperCase();
  }

  private static normalizePeriod(period: string): string {
    if (!period) return '';
    
    const p = period.toLowerCase().trim();
    if (p.includes('year') || p.includes('annual') || p.includes('yearly')) return 'year';
    if (p.includes('month') || p.includes('monthly')) return 'month';
    if (p.includes('week') || p.includes('weekly')) return 'week';
    if (p.includes('day') || p.includes('daily')) return 'day';
    if (p.includes('hour') || p.includes('hourly')) return 'hour';
    
    return period;
  }

  private static normalizeContractType(contractType: string): string {
    if (!contractType) return '';
    
    const ct = contractType.toLowerCase().trim();
    if (ct.includes('full') && ct.includes('time')) return 'full-time';
    if (ct.includes('part') && ct.includes('time')) return 'part-time';
    if (ct.includes('contract')) return 'contract';
    if (ct.includes('freelance')) return 'freelance';
    if (ct.includes('intern')) return 'internship';
    if (ct.includes('temporary') || ct.includes('temp')) return 'temporary';
    if (ct.includes('permanent')) return 'permanent';
    
    return contractType;
  }

  private static normalizeWorkModel(workModel: string): string {
    if (!workModel) return '';
    
    const wm = workModel.toLowerCase().trim();
    if (wm.includes('remote')) return 'remote';
    if (wm.includes('hybrid')) return 'hybrid';
    if (wm.includes('on-site') || wm.includes('onsite') || wm.includes('office')) return 'on-site';
    
    return workModel;
  }

  private static normalizeSeniority(seniority: string): string {
    if (!seniority) return '';
    
    const s = seniority.toLowerCase().trim();
    if (s.includes('intern')) return 'internship';
    if (s.includes('entry') || s.includes('graduate') || s.includes('junior') || s.includes('jr')) return 'junior';
    if (s.includes('mid') || s.includes('intermediate')) return 'mid-level';
    if (s.includes('senior') || s.includes('sr')) return 'senior';
    if (s.includes('lead') || s.includes('team lead')) return 'lead';
    if (s.includes('principal') || s.includes('staff')) return 'principal';
    if (s.includes('director') || s.includes('head') || s.includes('vp') || s.includes('vice president')) return 'director';
    if (s.includes('c-level') || s.includes('ceo') || s.includes('cto') || s.includes('cfo') || s.includes('chief')) return 'executive';
    
    return seniority;
  }

  private static normalizeStringArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return [];
    
    return arr
      .map(item => this.cleanString(item))
      .filter(item => item.length > 0)
      .filter((item, index, array) => array.indexOf(item) === index) // Remove duplicates
      .slice(0, 50); // Reasonable limit
  }

  private static normalizeSkillsArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return [];
    
    return arr
      .map(skill => {
        const cleaned = this.cleanString(skill);
        // Preserve original case for skills that are commonly capitalized
        const lowerCleaned = cleaned.toLowerCase();
        
        // Common tech skills that should maintain specific capitalization
        const techCaseMap: { [key: string]: string } = {
          'javascript': 'JavaScript',
          'typescript': 'TypeScript',
          'nodejs': 'Node.js',
          'reactjs': 'React.js',
          'react': 'React',
          'angular': 'Angular',
          'vue': 'Vue.js',
          'vuejs': 'Vue.js',
          'html': 'HTML',
          'css': 'CSS',
          'sql': 'SQL',
          'nosql': 'NoSQL',
          'mysql': 'MySQL',
          'postgresql': 'PostgreSQL',
          'mongodb': 'MongoDB',
          'redis': 'Redis',
          'elasticsearch': 'Elasticsearch',
          'docker': 'Docker',
          'kubernetes': 'Kubernetes',
          'aws': 'AWS',
          'azure': 'Microsoft Azure',
          'gcp': 'Google Cloud Platform',
          'git': 'Git',
          'github': 'GitHub',
          'gitlab': 'GitLab',
          'jira': 'JIRA',
          'jenkins': 'Jenkins',
          'python': 'Python',
          'java': 'Java',
          'php': 'PHP',
          'ruby': 'Ruby',
          'go': 'Go',
          'rust': 'Rust',
          'swift': 'Swift',
          'kotlin': 'Kotlin',
          'scala': 'Scala',
          'c++': 'C++',
          'c#': 'C#'
        };

        return techCaseMap[lowerCleaned] || cleaned;
      })
      .filter(skill => skill.length > 0)
      .filter((skill, index, array) => 
        array.findIndex(s => s.toLowerCase() === skill.toLowerCase()) === index
      ) // Remove case-insensitive duplicates
      .slice(0, 30); // Reasonable limit for skills
  }

  private static normalizeUrl(url: string): string {
    if (!url) return '';
    
    const cleaned = url.trim();
    if (cleaned.startsWith('//')) {
      return `https:${cleaned}`;
    }
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      return `https://${cleaned}`;
    }
    
    return cleaned;
  }

  private static normalizeDate(date: string): string {
    if (!date) return '';
    
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return date; // Return original if can't parse
      }
      return parsed.toISOString();
    } catch {
      return date;
    }
  }

  private static cleanString(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .substring(0, 1000); // Reasonable length limit
  }

  private static capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
