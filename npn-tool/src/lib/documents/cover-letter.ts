import { askClaude } from "../ai/claude";

interface CoverLetterInput {
  companyName: string;
  dbaName: string;
  companyCode: string;
  seniorOfficial: string;
  seniorTitle: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  productName: string;
  applicationClass: string;
  ingredientSummary: string;
  claimsSummary: string;
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<string> {
  const prompt = `Generate a professional cover letter for a Health Canada Natural Health Product (NHP) Product Licence Application (PLA).

Company Information:
- Legal Name: ${input.companyName} (DBA ${input.dbaName})
- Company Code: ${input.companyCode}
- Senior Official: ${input.seniorOfficial}, ${input.seniorTitle}
- Address: ${input.address}, ${input.city}, ${input.province} ${input.postalCode}
- Email: ${input.email} | Phone: ${input.phone}

Product: ${input.productName}
Application Class: ${input.applicationClass}
Ingredients: ${input.ingredientSummary}
Claims: ${input.claimsSummary}

Requirements:
- Formal business letter format
- Address to: Natural and Non-prescription Health Products Directorate (NNHPD)
- Include: RE: line with product name and class
- Include: Brief product description, ingredients summary, submission type
- Include: Contact person for correspondence
- Include: Signature block for ${input.seniorOfficial}
- Keep concise (1 page max)
- Professional tone, no marketing language

Return the letter in clean HTML format with inline styles for printing.`;

  return askClaude(
    "You are a Health Canada regulatory correspondence expert. Write professional, concise cover letters for NHP applications.",
    prompt,
    { maxTokens: 2048 }
  );
}
