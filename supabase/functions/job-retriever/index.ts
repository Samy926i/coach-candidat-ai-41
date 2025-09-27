import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LightpandaResponse {
  html?: string;
  screenshot?: string;
  pdf?: string;
  metadata?: unknown;
}

function json(res: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(res), {
    ...init,
    headers: { ...(init.headers || {}), ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function first<T>(arr: ArrayLike<T> | null | undefined): T | undefined {
  return arr && arr.length > 0 ? (arr as any)[0] : undefined;
}

function extractJsonLd(doc: any): any | null {
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const raw = script.textContent || "";
        if (!raw.trim()) continue;
        const data = JSON.parse(raw);
        // direct
        if (isJobPosting(data)) return data;
        // array
        if (Array.isArray(data)) {
          const found = data.find(isJobPosting);
          if (found) return found;
        }
        // @graph
        if (data && Array.isArray(data["@graph"])) {
          const found = data["@graph"].find(isJobPosting);
          if (found) return found;
        }
      } catch (_) {
        // ignore
      }
    }
  } catch (_) {}
  return null;
}

function isJobPosting(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const t = data["@type"];
  if (typeof t === "string") return t === "JobPosting";
  if (Array.isArray(t)) return t.includes("JobPosting");
  return false;
}

function parseLocation(text: string) {
  const loc = { city: "", region: "", country: "", remote_policy: "" };
  const lower = text.toLowerCase();
  if (lower.includes("remote")) loc.remote_policy = "remote";
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length >= 1) loc.city = parts[0];
  if (parts.length >= 2) loc.region = parts[1];
  if (parts.length >= 3) loc.country = parts[2];
  return loc;
}

function normalizeCurrency(c: string) {
  const map: Record<string, string> = { "$": "USD", "€": "EUR", "£": "GBP", usd: "USD", eur: "EUR", gbp: "GBP" };
  const k = (c || "").toLowerCase();
  return map[k] || c?.toUpperCase() || "";
}

function normalizePeriod(p: string) {
  const s = (p || "").toLowerCase();
  if (s.includes("year") || s.includes("annual")) return "year";
  if (s.includes("month")) return "month";
  if (s.includes("hour")) return "hour";
  if (s.includes("day")) return "day";
  return s || "";
}

function mapJsonLdToJob(data: any) {
  const job: any = {};
  if (data.title) job.title = String(data.title);
  if (data.description) job.description_text = String(data.description);
  if (data.datePosted) job.posting_date = new Date(data.datePosted).toISOString();
  if (data.validThrough) job.application_deadline = new Date(data.validThrough).toISOString();

  const jl = data.jobLocation;
  if (jl) {
    job.location = { city: "", region: "", country: "", remote_policy: "" };
    const address = jl.address;
    if (address) {
      if (address.addressLocality) job.location.city = String(address.addressLocality);
      if (address.addressRegion) job.location.region = String(address.addressRegion);
      if (address.addressCountry) job.location.country = String(address.addressCountry);
    }
    const t = JSON.stringify(jl).toLowerCase();
    if (t.includes("remote") || t.includes("home")) {
      job.location.remote_policy = "remote";
      job.work_model = "remote";
    }
  }

  const bs = data.baseSalary;
  if (bs && bs.value) {
    const v = bs.value;
    const min = v.minValue ?? v.value ?? null;
    const max = v.maxValue ?? v.value ?? null;
    job.salary = {
      min: min != null ? Number(min) : null,
      max: max != null ? Number(max) : null,
      currency: normalizeCurrency(String(v.currency || "")),
      period: normalizePeriod(String(v.unitText || "year")),
    };
  }

  if (data.employmentType) job.contract_type = String(data.employmentType);
  if (data.jobLocationType) {
    const lt = String(data.jobLocationType).toLowerCase();
    if (lt.includes("telecommute") || lt.includes("remote")) job.work_model = "remote";
  }

  return job;
}

function extractText(doc: any, selectors: string[], minLen = 0) {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      const text = el?.textContent?.trim() || "";
      if (text && text.length >= minLen) return text;
    } catch (_) {}
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ error: "'url' is required" }, { status: 400 });
    }

    const apiKey = Deno.env.get("LIGHTPANDA_API_KEY") || Deno.env.get("LIGHTPANDA_TOKEN");
    if (!apiKey) {
      return json({ error: "Lightpanda API key not configured on server" }, { status: 500 });
    }

    const lpRes = await fetch("https://api.lightpanda.io/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "job-data-retriever/edge-1.0",
      },
      body: JSON.stringify({
        url,
        options: { waitTime: 3000, javascript: true },
      }),
    });

    if (!lpRes.ok) {
      const txt = await lpRes.text();
      return json({ error: `Lightpanda error ${lpRes.status}: ${txt}` }, { status: 502 });
    }

    const data: LightpandaResponse = await lpRes.json();
    const html = data.html || (data as any)?.data?.html || "";
    if (!html) {
      return json({ error: "No HTML received from Lightpanda" }, { status: 502 });
    }

    // Parse HTML using deno_dom
    const dom = new DOMParser().parseFromString(html, "text/html");
    if (!dom) {
      return json({ error: "Failed to parse HTML" }, { status: 500 });
    }

    const job: any = { source_url: url, raw_schema_org: {} };
    const company: any = {};

    const jsonLd = extractJsonLd(dom);
    if (jsonLd) {
      Object.assign(job, mapJsonLdToJob(jsonLd));
      job.raw_schema_org = jsonLd;
      if (jsonLd.hiringOrganization) {
        company.name = jsonLd.hiringOrganization.name || company.name || "";
        company.website = jsonLd.hiringOrganization.url || company.website || "";
      }
    }

    // Fallbacks
    if (!job.title) {
      job.title = extractText(dom, [
        'h1[data-testid*="job-title"]',
        'h1[class*="job-title"]',
        'h1[class*="position"]',
        ".job-title",
        '[data-test="job-title"]',
        "h1",
      ], 5);
    }

    if (!job.description_text) {
      job.description_text = extractText(dom, [
        '[data-testid*="job-description"]',
        '[class*="job-description"]',
        '[class*="description"]',
        '.job-details',
        '[data-test="job-description"]',
        '.content',
        '.body',
      ], 60);
    }

    if (!job.location || (!job.location.city && !job.location.country)) {
      const locText = extractText(dom, [
        '[data-testid*="location"]',
        '[class*="location"]',
        '.job-location',
        '[data-test="location"]',
      ], 3);
      if (locText) job.location = parseLocation(locText);
    }

    // Construct result
    const result = {
      job: {
        source_url: job.source_url || url,
        title: job.title || "",
        role_seniority: job.role_seniority || "",
        department_function: job.department_function || "",
        contract_type: job.contract_type || "",
        work_model: job.work_model || "",
        location: job.location || { city: "", region: "", country: "", remote_policy: "" },
        salary: job.salary || { min: null, max: null, currency: "", period: "" },
        required_experience: job.required_experience || { min_years: null, max_years: null },
        required_education: job.required_education || "",
        languages: job.languages || [],
        hard_skills: job.hard_skills || [],
        soft_skills: job.soft_skills || [],
        tech_stack: job.tech_stack || [],
        responsibilities: job.responsibilities || [],
        nice_to_have: job.nice_to_have || [],
        visa_sponsorship: job.visa_sponsorship ?? null,
        relocation: job.relocation ?? null,
        posting_date: job.posting_date || "",
        application_deadline: job.application_deadline || "",
        description_text: job.description_text || "",
        raw_schema_org: job.raw_schema_org || {},
        detected_duplicates: [],
      },
      company: {
        name: company.name || "",
        aka: [],
        website: company.website || "",
        linkedin_url: "",
        wikipedia_url: "",
        industry: "",
        company_type: "",
        founded_year: null,
        size_employees: { min: null, max: null },
        hq_location: { city: "", region: "", country: "" },
        locations: [],
        work_culture: { values: [], benefits: [], remote_policy: "" },
        funding: { status: "", latest_round: "", investors: [] },
        public_ticker: "",
        about_summary: "",
        data_sources: [],
      },
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: "lightpanda-cloud+edge",
        notes: [],
      },
    };

    return json(result);
  } catch (e: any) {
    console.error("job-retriever error:", e);
    return json({ error: e?.message || "Internal error" }, { status: 500 });
  }
});

