export interface GuideArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  publishedDate: string;
  updatedDate: string;
  author: {
    name: string;
    role: string;
  };
  readTime: string;
  summary: string;
  sections: {
    heading: string;
    subheading?: string;
    paragraphs: string[];
    callout?: {
      title: string;
      content: string;
      type: 'tip' | 'warning' | 'framework';
    };
    listItems?: string[];
    templateCode?: string;
  }[];
  keyTakeaways: string[];
}

export const ORBIT_GUIDES: GuideArticle[] = [
  {
    id: "guide-prompt-engineering",
    slug: "prompt-engineering-workflows-small-business",
    title: "Practical Prompt Engineering & AI Workflows for Small Businesses",
    subtitle: "A step-by-step framework for automating customer service, proposals, and commercial correspondence without technical overhead.",
    description: "Learn how to structure multi-turn prompts using the Persona-Task-Context-Format-Constraint (PTCFC) model to eliminate generic AI responses and streamline daily operations.",
    category: "AI Workflows",
    publishedDate: "October 10, 2026",
    updatedDate: "October 12, 2026",
    author: {
      name: "Ndamulelo Makushu Glen",
      role: "Founder & Lead Engineer, Orbit AI"
    },
    readTime: "9 min read",
    summary: "Generic instructions generate mediocre business copy. This guide demonstrates how South African entrepreneurs and freelancers can write structured, deterministic prompts for customer dispute resolution, formal quotations, and cold outreach.",
    sections: [
      {
        heading: "1. The Anatomy of Commercial Prompts: Moving Beyond Single-Sentence Queries",
        paragraphs: [
          "When business owners first interact with large language models, the most common pitfall is treating the prompt input like a standard search engine. Submitting a prompt such as 'write an email to an unhappy client' yields boilerplate copy that sounds synthetic, apologetic to a fault, and unmoored from the commercial reality of your business.",
          "High-performance prompt engineering relies on explicit cognitive framing. Modern reasoning models operate as probabilistic completion engines. When given high-dimensional context, clear persona guardrails, and deterministic formatting rules, their utility transitions from novelty to high-precision business automation.",
          "At Orbit AI, we teach the PTCFC (Persona, Task, Context, Format, Constraints) framework for every enterprise interaction. By standardising your internal prompt library around this architecture, you eliminate variability and empower non-technical team members to generate consistent client deliverables."
        ],
        callout: {
          title: "The PTCFC Framework Rulebook",
          content: "Always specify: (1) Persona: Who the AI is acting as; (2) Task: Exactly what must be generated; (3) Context: Background details, client history, and regional nuances; (4) Format: Markdown headers, bullet points, or email layout; (5) Constraints: Tone rules, banned phrases, and length limits.",
          type: "framework"
        }
      },
      {
        heading: "2. The PTCFC Model in Action: Resolving Supply Chain Disputes",
        paragraphs: [
          "Consider a frequent scenario in South African commerce: a logistics carrier has delayed a delivery to one of your retail clients by four business days, threatening client goodwill. Rather than drafting an emotionally reactive or overly generic apology, apply structured parameters:",
          "Notice how the constraints explicitly ban vague passive language such as 'we apologize for any inconvenience caused'—a phrase universally perceived by corporate procurement teams as insincere. Instead, the prompt instructs the model to anchor on verifiable remediation steps and commercial accountability.",
          "Executing this structured prompt produces an email ready for executive sign-off in under thirty seconds, protecting relationships that might otherwise unravel over unresolved operational hiccups."
        ],
        templateCode: `### PROMPT TEMPLATE: COMMERCIAL DISPUTE & REMEDIATION
[PERSONA]: You are a Senior Customer Relations Manager at an established South African industrial supply company.
[TASK]: Draft a formal dispute response and remediation email to an institutional client whose shipment is delayed by 4 days due to provincial freight disruptions.
[CONTEXT]:
- Client: Apex Retail Distribution (Gauteng branch)
- Order ID: ORD-2026-8812
- Reason: Unscheduled freight rail maintenance between Durban port and City Deep inland terminal.
- Remediation: We have rerouted the remaining inventory via private expedited road courier arriving Thursday morning at 09:00 SAST.
- Commercial Adjustment: We are crediting the full R1,450 handling charge to their monthly statement.
[FORMAT]:
1. Subject line: Clear, referencing Purchase Order number.
2. Executive acknowledgment (no defensive justifications).
3. Chronological tracking breakdown.
4. Corrective commercial concession.
5. Direct contact details for dedicated logistics coordinator.
[CONSTRAINTS]:
- Tone: Composed, accountable, institutional.
- Do NOT use passive cliches like "we apologize for any inconvenience caused".
- Use South African Rand (ZAR) formatting and SAST timezone.
- Maximum 250 words.`
      },
      {
        heading: "3. Multi-Turn Chaining for Comprehensive Document Creation",
        paragraphs: [
          "Complex business deliverables—such as formal tender proposals, service level agreements (SLAs), or quarterly commercial reviews—should never be requested in a single monolithic prompt. Single prompts often exceed context reasoning budgets, causing the model to abbreviate critical sections or hallucinate statutory clauses.",
          "Instead, implement prompt chaining across multiple conversational turns. Step 1 should always focus on information extraction and outline validation. Step 2 drafts individual sections against explicit rubrics. Step 3 acts as an adversarial review phase, prompting the model to critique its own draft for ambiguity, missing edge cases, or non-compliant commitments.",
          "For example, when constructing an SLA for freelance software engineering or digital marketing, instruct the model in Turn 1 to list all mandatory scope boundaries (revision limits, payment milestones, IP transfer upon final payment). Only proceed to drafting once you have audited and agreed with the structural outline."
        ],
        listItems: [
          "Turn 1 (Architecture): 'Extract key deliverables and draft a table of contents with scope exclusions.'",
          "Turn 2 (Drafting): 'Expand Section 3 (Payment Terms and Milestones) using statutory Consumer Protection Act rules.'",
          "Turn 3 (Adversarial Audit): 'Review the drafted clauses above as opposing counsel. Identify three areas of contractual ambiguity.'"
        ]
      },
      {
        heading: "4. Building an Institutional Prompt Library for Your Team",
        paragraphs: [
          "The greatest return on investment from generative AI occurs when workflows become repeatable across an entire organisation. Individual mastery means little if colleagues continue to paste raw, unstructured queries into chat consoles.",
          "We recommend documenting a centralised, shared repository containing tested prompts for: (1) First-response client triage; (2) Formal price quotation transmittals; (3) Weekly project milestone summaries; and (4) Vendor negotiation letters. Review and refine your prompts monthly based on team feedback and real client outcomes."
        ]
      }
    ],
    keyTakeaways: [
      "Replace conversational vagueness with the 5-point PTCFC framework: Persona, Task, Context, Format, and Constraints.",
      "Ban robotic cliches and generic apologies by defining negative constraints in your prompt header.",
      "Employ multi-turn prompt chaining for legally binding or commercially sensitive documents rather than single-shot prompts.",
      "Treat your prompt collection as an intellectual property asset that compounds team productivity over time."
    ]
  },
  {
    id: "guide-popia-data-privacy",
    slug: "popia-data-privacy-generative-ai-south-africa",
    title: "POPIA, Data Privacy & Generative AI: Compliance Playbook for South African Professionals",
    subtitle: "How to safely leverage cloud inference models without violating the Protection of Personal Information Act (POPIA).",
    description: "An operational guide detailing statutory duties under POPIA, identifying Special Personal Information (SPI), anonymising client records, and maintaining legal compliance in AI workflows.",
    category: "Legal & Compliance",
    publishedDate: "October 08, 2026",
    updatedDate: "October 12, 2026",
    author: {
      name: "Ndamulelo Makushu Glen",
      role: "Founder & Lead Engineer, Orbit AI"
    },
    readTime: "11 min read",
    summary: "Generative AI tools process massive context windows, but pasting client emails, identity numbers, or medical records into public models creates severe regulatory exposure. This guide explains how South African firms can remain fully POPIA-compliant.",
    sections: [
      {
        heading: "1. The Intersection of POPIA and Generative AI Inference",
        paragraphs: [
          "The rapid integration of AI assistants into corporate workflows has outpaced traditional compliance training. Across South Africa, thousands of employees routinely paste client contracts, medical aid disputes, salary schedules, and customer correspondence into commercial AI interfaces without considering the regulatory consequences.",
          "The Protection of Personal Information Act, 2013 (Act No. 4 of 2013) ('POPIA') establishes eight foundational conditions for the lawful processing of personal information. Under Section 1 of POPIA, 'processing' includes the collection, receipt, recording, retrieval, dissemination, or merging of personal data.",
          "When you transmit client data into an AI tool, that transmission constitutes data processing. If that data contains identifiable information belonging to an individual or registered juristic person, your business remains strictly accountable as the 'Responsible Party' under the law."
        ],
        callout: {
          title: "Statutory Liability Under POPIA",
          content: "Under Section 107 of POPIA, administrative fines for unlawful processing and data breaches can reach up to R10 million, in addition to potential civil liability for damages suffered by data subjects. Ignorance of AI model data handling policies is not a legal defence.",
          type: "warning"
        }
      },
      {
        heading: "2. Identifying Personal vs Special Personal Information",
        paragraphs: [
          "Compliance begins with rigorous data classification. South African law establishes heightened protections for specific categories of information. While ordinary personal information (names, work emails, job titles) requires lawful justification, Special Personal Information ('SPI') under Section 26 is subject to an outright prohibition on processing unless specific statutory exceptions or express consent apply.",
          "Special Personal Information encompasses religious or philosophical beliefs, race or ethnic origin, trade union membership, political persuasion, health or sex life, and biometric information. Criminal behaviour allegations or proceedings are likewise strictly protected under Section 33."
        ],
        listItems: [
          "Category A (Prohibited from AI input): South African ID numbers, biometric scans, bank card CVVs, payroll ledgers, disciplinary hearing transcripts.",
          "Category B (Permitted ONLY with full tokenisation/anonymisation): Customer dispute narratives, commercial contracts with redacted entity names, marketing performance data.",
          "Category C (Safe for direct AI processing): General industry research, open-source code snippets, publicly available market reports, drafted templates with fictional placeholders."
        ]
      },
      {
        heading: "3. A Practical Tokenisation & Scrubbing Protocol",
        paragraphs: [
          "Before any real-world document is uploaded or pasted into an AI assistant, team members should follow a mandatory 3-step scrubbing protocol: Entity Masking, Value Rounding, and Identifier Removal.",
          "Entity Masking replaces real names and corporate brands with consistent synthetic labels (e.g., replacing 'Standard Bank Johannesburg Branch' with 'Bank_Alpha', and replacing 'Thabo Mokoena' with 'Client_A').",
          "Identifier Removal strips out physical street addresses, telephone digits, vehicle registration plates, and South African 13-digit identity numbers. Value Rounding alters exact transactional values to proportional ratios, preserving analytical insight while destroying confidential financial records."
        ],
        templateCode: `### POPIA SANITISATION EXAMPLE:
BEFORE (Non-compliant):
"Client Sipho Khumalo, ID 8804125088081, residing at 42 Jan Smuts Avenue, Rosebank, has an overdue home loan balance of R1,248,312.45 at Absa Bank. Write a final demand letter."

AFTER (POPIA-Compliant & Anonymised):
"Client_A (individual borrower residing in Gauteng) has an overdue residential mortgage balance of approximately R1.25M with a major commercial lender. Draft a formal notice of default in terms of Section 129 of the National Credit Act, maintaining a professional legal tone with placeholders for statutory dates and account codes."`
      },
      {
        heading: "4. Cloud Transborder Information Flows (Section 72)",
        paragraphs: [
          "Most frontier AI models operate data centres located in North America or Western Europe. Section 72 of POPIA strictly regulates the transfer of personal information outside the Republic.",
          "To transfer data lawfully to offshore cloud servers, the recipient country must offer an adequate level of data protection substantially similar to POPIA, or the data subject must have explicitly consented to the transfer, or the transfer must be necessary for the performance of a contract. By scrubbing personal identifiers entirely prior to inference, you eliminate transborder data transfer exposure at the root."
        ]
      }
    ],
    keyTakeaways: [
      "Any submission of client data to an AI model constitutes 'processing' under Section 1 of POPIA.",
      "Never input 13-digit South African identity numbers, banking credentials, or disciplinary records into AI prompts.",
      "Enforce the Entity Masking and Tokenisation Protocol before analyzing contracts, disputes, or correspondence.",
      "Anonymisation before inference neutralises Section 72 transborder data transfer liabilities."
    ]
  },
  {
    id: "guide-ats-cv-optimization",
    slug: "ats-cv-optimisation-ethical-ai-job-seekers",
    title: "Mastering Applicant Tracking Systems (ATS): Ethical AI Workflows for Resumes & Cover Letters",
    subtitle: "How modern hiring algorithms parse career documents and how job seekers can build high-impact, ATS-compliant profiles.",
    description: "An evidence-based guide to beating recruitment algorithms ethically. Learn document formatting best practices, keyword alignment without keyword stuffing, and the STAR storytelling framework.",
    category: "Career & Employment",
    publishedDate: "October 05, 2026",
    updatedDate: "October 12, 2026",
    author: {
      name: "Ndamulelo Makushu Glen",
      role: "Founder & Lead Engineer, Orbit AI"
    },
    readTime: "8 min read",
    summary: "Over 75% of job applications are filtered out by automated Applicant Tracking Systems before a human hiring manager ever reads them. This guide reveals how to format career documents for maximum parsing accuracy while using AI ethically.",
    sections: [
      {
        heading: "1. Demystifying the Applicant Tracking System (ATS)",
        paragraphs: [
          "In South Africa's fiercely competitive job market, corporate employers and recruitment agencies receive hundreds of CVs for every junior and mid-level opening. To manage this volume, organizations deploy Applicant Tracking Systems (such as Taleo, Workday, BambooHR, and Greenhouse) to ingest, parse, and score incoming applications.",
          "An ATS does not 'read' a CV the way a human recruiter does. Instead, a document parser converts PDF or DOCX files into raw text strings, categorises text into semantic buckets (Work History, Education, Skills, Certifications), and calculates a semantic match score against the employer's published job specification.",
          "Understanding this mechanical reality is essential: if your document formatting confuses the parser, your credentials will be discarded regardless of your real-world competence."
        ],
        callout: {
          title: "The Golden Rule of ATS Formatting",
          content: "Never use multi-column tables, visual progress bars, icon fonts, text boxes, or embedded images for critical career details. Standard single-column typography with clean linear headings (e.g., Professional Experience, Education, Skills) scores highest in all modern parsing engines.",
          type: "tip"
        }
      },
      {
        heading: "2. The Ethics and Hazards of AI CV Generation",
        paragraphs: [
          "Generative AI has made CV creation deceptively easy. However, uncritical reliance on AI produces distinct warning signs that seasoned hiring managers instantly recognize: excessive buzzwords ('visionary leader', 'spearheaded synergies'), uniform sentence cadence, and fabricated accomplishments.",
          "Even worse is the unethical practice of 'white font keyword stuffing'—pasting the entire job description in tiny white text to fool the parser. Modern ATS software flags this instantly as malicious code manipulation, permanently blacklisting the applicant's profile from the agency's database.",
          "The ethical and effective role of AI in career development is that of a collaborative biographer: you supply the factual events, dates, and quantitative outcomes, while the AI helps structure the narrative according to institutional recruiting standards."
        ]
      },
      {
        heading: "3. The STAR Framework for Bullet Proof Career Achievements",
        paragraphs: [
          "A weak resume bullet merely lists tasks: 'Responsible for managing inventory and handling customer queries.' This tells the recruiter what your job description was, but reveals nothing about how well you performed it.",
          "Transform every work history item into an accomplishment statement using the STAR (Situation, Task, Action, Result) methodology. When prompted correctly, Orbit AI's Task Mode formats your career milestones with measurable outcomes."
        ],
        templateCode: `### WEAK VS STRONG RESUME BULLET POINTS:
- WEAK: "Worked as a junior frontend developer fixing website bugs."
+ STRONG (ATS-Optimised): "Identified and resolved 40+ responsive viewport defects across mobile checkout flows, reducing cart abandonment by 18% over a 3-month deployment cycle."

- WEAK: "Assisted customers with sales inquiries at retail store in Polokwane."
+ STRONG (ATS-Optimised): "Managed retail point-of-sale operations for 150+ daily customers, exceeding monthly regional up-sell targets by 14% while maintaining a 98% positive satisfaction rating."`
      },
      {
        heading: "4. Tailoring Cover Letters Without Generic Flattery",
        paragraphs: [
          "A tailored cover letter should never be an abridged recitation of your CV. Its sole purpose is to connect the dots between your unique background and the company's specific commercial objectives.",
          "Structure your cover letter in three distinct beats: (1) The Hook: Acknowledge a specific public initiative, product launch, or industry challenge the company is currently navigating; (2) The Proof: Detail two concrete career accomplishments directly applicable to that challenge; and (3) The Vision: State clearly how your addition to the team will de-risk their current sprint or operational targets."
        ]
      }
    ],
    keyTakeaways: [
      "Keep CV formatting strictly single-column without floating text frames or graphical proficiency bars.",
      "Never fabricate credentials or use invisible keyword stuffing—parsers flag manipulative techniques.",
      "Frame all professional experience using the STAR framework with concrete, verifiable metrics.",
      "Use AI as an editor and structural guide, never as an unverified author of your career narrative."
    ]
  },
  {
    id: "guide-township-enterprise-digitisation",
    slug: "township-enterprise-digitisation-practical-ai",
    title: "Digitising the Township & Local Enterprise: A Low-Cost AI Playbook for Solopreneurs",
    subtitle: "Actionable strategies for spaza shops, salons, logistics operators, and local caterers to modernize without expensive software subscriptions.",
    description: "How informal and micro-enterprises across South Africa can harness accessible AI tools for inventory forecasting, WhatsApp automated replies, formal quotations, and funding proposals.",
    category: "Small Business & Entrepreneurship",
    publishedDate: "October 03, 2026",
    updatedDate: "October 12, 2026",
    author: {
      name: "Ndamulelo Makushu Glen",
      role: "Founder & Lead Engineer, Orbit AI"
    },
    readTime: "10 min read",
    summary: "Micro and informal enterprises account for over 30% of South Africa's national employment, yet struggle to access enterprise-grade digital tools. This practical playbook details how small business owners can automate invoicing, client communications, and funding bids using zero-cost AI methods.",
    sections: [
      {
        heading: "1. The Reality of South Africa's Informal Commercial Landscape",
        paragraphs: [
          "The township economy in South Africa represents hundreds of billions of Rands in annual commercial activity, spanning local retail (spaza shops), fast-food outlets (kotas and braai stands), hair salons, automotive repair, logistics, and event staging.",
          "Despite their vitality, these enterprises face unique headwinds: high transaction costs, reliance on cash or manual paper ledgers, fragmented supplier networks, and difficulty accessing bank loans or governmental development grants (such as SEFA or NEF funding) due to a lack of formalised financial records.",
          "Generative AI, when delivered through lightweight, mobile-first web applications, removes the barrier to entry. Solopreneurs no longer need expensive enterprise consultants to draft bankable business plans or professional client quotes."
        ]
      },
      {
        heading: "2. Automating WhatsApp Business Messaging with Structured AI Templates",
        paragraphs: [
          "In South Africa, WhatsApp is the undisputed operating system of commerce. Over 90% of micro-enterprise customer interactions occur directly inside WhatsApp chat threads. However, single-operator businesses lose thousands of Rands every month because they cannot reply to inbound inquiries while actively serving clients or managing inventory.",
          "By employing structured prompt frameworks, business owners can create a standardised FAQ and order-taking response matrix to copy and paste directly into WhatsApp Business quick replies.",
          "Standardising answers to common inquiries—pricing, operating hours, delivery radius, banking details for EFT payments, and deposit policies—immediately elevates the professional credibility of a micro-enterprise."
        ],
        callout: {
          title: "The 3-Minute WhatsApp Business Automation Playbook",
          content: "Prompt Orbit AI: 'Generate 5 concise WhatsApp Business Quick Replies for a catering business based in Soweto: (1) Pricing brochure link & menu options; (2) 50% deposit policy & payment confirmation; (3) Delivery radius & vehicle surcharge; (4) Dietary requirement inquiry; (5) Order completion thank-you.'",
          type: "tip"
        }
      },
      {
        heading: "3. Generating Formal Invoices & Quotations to Unlock Corporate Tenders",
        paragraphs: [
          "One of the largest obstacles micro-enterprises face when pitching corporate or municipal clients is document presentation. Corporate supply chain managers cannot issue purchase orders against informal handwritten receipts or unformatted text messages.",
          "Using AI assistance, any artisan, plumber, or caterer can convert rough job notes into an institutional-grade quotation complete with itemised material breakdowns, labor hours, tax clearance disclaimers, and payment terms in South African Rand.",
          "Presenting clean, professionally formatted documentation signals reliability and allows local businesses to compete effectively for corporate social investment (CSI) tenders and local supplier development contracts."
        ],
        templateCode: `### PROMPT TEMPLATE: INSTITUTIONAL QUOTATION GENERATOR
[TASK]: Convert informal job notes into a professional commercial quotation.
[RAW DATA]:
- Business: Khaya Electrical & Solar Solutions (Katlehong)
- Client: Mdlalose Commercial Properties (Bedfordview)
- Scope: Inverter and backup battery installation for 4 commercial office suites
- Materials: 1x 8kW Sunsynk Hybrid Inverter (R28,500), 2x 5.12kWh Lithium Batteries (R36,000 total), AC/DC changeover switches & surge protection (R4,200), Cabling & trunking (R1,800)
- Labor: 2 certified wiremen for 2 days (R6,000 total)
- Terms: 60% deposit upon material delivery, 40% balance upon Certificate of Compliance (CoC) handover.
[FORMAT]: Structured markdown quotation with subtotal, terms, validity period (14 days), and banking instructions.`
      },
      {
        heading: "4. Packaging Bankable Grant and Loan Applications",
        paragraphs: [
          "Development finance institutions like the Small Enterprise Development Agency (SEDA) and commercial banks require structured business plans covering market opportunity, competitive advantage, management capability, and financial projections.",
          "Too often, promising entrepreneurs are rejected not because their underlying business is unviable, but because they struggle to articulate their unit economics and market positioning in institutional business language. With guided tools like Orbit AI's Business Mode, founders can systematically articulate their value proposition and compile ready-to-submit funding dossiers."
        ]
      }
    ],
    keyTakeaways: [
      "WhatsApp is the operational core of South African micro-commerce—automate quick replies to capture leads instantly.",
      "Never submit handwritten receipts to corporate clients; professional quotations unlock supplier development contracts.",
      "Use AI document formatting to bridge the gap between street-level excellence and institutional procurement requirements.",
      "Clear articulation of unit economics is the key to securing local small-business development grants."
    ]
  },
  {
    id: "guide-fact-checking-ai-hallucinations",
    slug: "evaluating-ai-hallucinations-fact-checking-methodology",
    title: "Evaluating AI Hallucinations & Fact-Checking Workflows for Students and Researchers",
    subtitle: "A rigorous 4-step verification methodology to detect synthetic citations, logical fallacies, and probabilistic falsehoods.",
    description: "Understand why large language models hallucinate plausible-sounding errors and master systematic techniques to verify legal citations, academic papers, and statistical claims.",
    category: "Research & Academic",
    publishedDate: "October 01, 2026",
    updatedDate: "October 12, 2026",
    author: {
      name: "Ndamulelo Makushu Glen",
      role: "Founder & Lead Engineer, Orbit AI"
    },
    readTime: "9 min read",
    summary: "Large language models generate text by predicting the next most probable token, not by consulting an immutable repository of ground truth. This guide equips students, researchers, and legal professionals with battle-tested workflows to detect synthetic citations and verify factual claims.",
    sections: [
      {
        heading: "1. The Probabilistic Engine: Why Models Generate False Realities",
        paragraphs: [
          "To use artificial intelligence responsibly in academic or legal research, one must understand its foundational architecture. Large Language Models (LLMs) are autoregressive neural networks trained to calculate the probability distribution of words across vast textual corpora.",
          "Crucially, a language model does not possess a conceptual mental model of truth or falsehood. When an LLM asserts that 'the South African Constitutional Court held in Smith v Minister of Police (2019) that...', it is not recalling a historical court record from memory; it is generating words that sound structurally consistent with South African jurisprudence.",
          "Because legal and academic writing follows rigorous stylistic patterns, hallucinations in these domains are extraordinarily seductive: they cite real judges, plausible case numbers, and authoritative-sounding ratio decidendi that never actually occurred."
        ],
        callout: {
          title: "The Hallucination Trap",
          content: "The more authoritative an AI response sounds, the more vigilance it demands. Fluency is an index of grammatical coherence, NOT factual veracity.",
          type: "warning"
        }
      },
      {
        heading: "2. The 4-Step Triangulation Protocol for Academic Research",
        paragraphs: [
          "Never submit an academic paper, research dissertation, or legal opinion containing an unverified AI claim. Implement the 4-Step Triangulation Protocol for every material statement of fact:",
          "Step 1: Isolate the Primary Anchor. Extract the specific names, dates, statutory sections, or percentage figures generated by the model.",
          "Step 2: Require Source Grounding. Prompt the model to provide the exact title of the legislative gazette, journal DOI, or publication year where the claim originates.",
          "Step 3: External Repository Verification. Search independent authoritative databases (such as SAFLII for South African case law, Google Scholar, PubMed, or official government portals) to locate the primary document.",
          "Step 4: Citation Integrity Check. If an academic paper or court ruling cannot be located in independent indexers, treat it as synthetic fiction and excise it immediately."
        ]
      },
      {
        heading: "3. Grounding Prompts with Retrieval Constraints",
        paragraphs: [
          "You can dramatically suppress hallucination rates by altering how you structure your research queries. By default, open-ended prompts invite the model to generate creative completions. Adding strict retrieval grounding constraints forces the model into a conservative evaluation mode.",
          "Always instruct the model that if it does not have high-certainty knowledge of a specific statutory clause or factual statistic, it must explicitly output 'INSUFFICIENT_DATA' rather than formulating an educated guess."
        ],
        templateCode: `### PROMPT TEMPLATE: HIGH-RIGOR RESEARCH INQUIRY
[TASK]: Analyze the statutory requirements for registering an external foreign company in South Africa.
[CONSTRAINTS]:
- Only cite specific sections from the Companies Act, 2008 (Act No. 71 of 2008).
- For every cited requirement, provide the exact Section number and sub-clause.
- If you are uncertain of a specific filing deadline or statutory fee under CIPC regulations, state "VERIFICATION_REQUIRED" rather than estimating.
- Do NOT generate hypothetical case citations or fictitious precedent.`
      },
      {
        heading: "4. The Responsibility of the Human Researcher",
        paragraphs: [
          "Generative AI is a force multiplier for intellectual exploration, brainstorming, and initial synthesis. It excels at explaining dense philosophical arguments in plain language, generating coding algorithms, and organizing scattered research notes.",
          "However, intellectual authorship and ethical responsibility cannot be delegated to an algorithmic model. When you put your name on a research paper, commercial briefing, or client report, you are asserting personal responsibility for every factual assertion it contains."
        ]
      }
    ],
    keyTakeaways: [
      "Language models optimize for linguistic plausibility, not factual accuracy.",
      "Synthetic citations are common in law and medicine because the model mimics stylistic authority.",
      "Execute the 4-Step Triangulation Protocol against independent databases like SAFLII or Google Scholar.",
      "Enforce explicit 'INSUFFICIENT_DATA' constraints to prevent probabilistic guessing."
    ]
  }
];
