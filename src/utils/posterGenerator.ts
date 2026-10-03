/**
 * Utility to generate clean, modern, professional vacancy posters
 * Renders directly via HTML5 Canvas into a high-resolution PNG data URL.
 */

export interface VacancyPosterOptions {
  title: string;
  company: string;
  category: string;
  location?: string;
  workplaceType?: string;
  compensation?: string;
  requirements?: string[];
  deadline?: string;
  theme?: 'dark' | 'light' | 'navy';
}

export function generateProfessionalVacancyPoster(options: VacancyPosterOptions): string {
  const {
    title,
    company,
    category,
    location = 'South Africa',
    workplaceType = 'On-site',
    compensation,
    requirements = [],
    deadline,
    theme = 'navy'
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Theme Colors
  const isLight = theme === 'light';
  const bgColor = isLight ? '#f8fafc' : theme === 'navy' ? '#0b1329' : '#0f172a';
  const cardBg = isLight ? '#ffffff' : '#131e3d';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const subtextColor = isLight ? '#475569' : '#94a3b8';
  const accentColor = '#2563eb'; // Orbit Blue
  const accentLight = '#3b82f6';
  const borderColor = isLight ? '#e2e8f0' : '#1e2d56';

  // 1. Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle top gradient glow
  if (!isLight) {
    const gradient = ctx.createRadialGradient(200, 100, 50, 400, 200, 600);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.18)');
    gradient.addColorStop(1, 'rgba(11, 19, 41, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Framed Container Card
  const margin = 36;
  const cardW = canvas.width - margin * 2;
  const cardH = canvas.height - margin * 2;
  const cardR = 24;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, cardR);
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
  ctx.restore();

  // Top Accent Stripe
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, 8, [cardR, cardR, 0, 0]);
  ctx.fillStyle = accentLight;
  ctx.fill();
  ctx.restore();

  // 3. Header Bar: Orbit Branding & Category Badge
  const headerY = margin + 50;
  
  // Brand mark
  ctx.fillStyle = isLight ? '#1e293b' : '#ffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('ORBIT', margin + 44, headerY);

  ctx.fillStyle = accentLight;
  ctx.beginPath();
  ctx.arc(margin + 124, headerY - 6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = subtextColor;
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('OPPORTUNITIES HUB', margin + 138, headerY);

  // Category Pill Badge (Right aligned)
  const catText = `${category.toUpperCase()} • ${workplaceType.toUpperCase()}`;
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  const catWidth = ctx.measureText(catText).width + 32;
  const catX = margin + cardW - catWidth - 44;
  const catY = headerY - 20;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(catX, catY, catWidth, 32, 16);
  ctx.fillStyle = isLight ? '#eff6ff' : 'rgba(37, 99, 235, 0.2)';
  ctx.fill();
  ctx.strokeStyle = isLight ? '#bfdbfe' : '#2563eb';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isLight ? '#1d4ed8' : '#60a5fa';
  ctx.fillText(catText, catX + 16, catY + 20);
  ctx.restore();

  // 4. Job / Vacancy Title
  let currentY = headerY + 70;
  ctx.fillStyle = textColor;
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';

  // Text wrap for long titles
  const maxTitleWidth = cardW - 90;
  const words = title.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxTitleWidth && n > 0) {
      ctx.fillText(line.trim(), margin + 44, currentY);
      line = words[n] + ' ';
      currentY += 54;
      lineCount++;
      if (lineCount >= 2) {
        line += '...';
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), margin + 44, currentY);

  // 5. Company Name & Location Meta
  currentY += 46;
  ctx.fillStyle = isLight ? '#1e40af' : '#93c5fd';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(company, margin + 44, currentY);

  // Location bullet
  const compMetrics = ctx.measureText(company);
  const locX = margin + 44 + compMetrics.width + 24;

  ctx.fillStyle = subtextColor;
  ctx.font = '500 17px system-ui, -apple-system, sans-serif';
  ctx.fillText(location, locX, currentY);

  // 6. Requirements Summary Box
  currentY += 34;
  const reqBoxY = currentY;
  const reqBoxH = 170;
  
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin + 44, reqBoxY, cardW - 88, reqBoxH, 16);
  ctx.fillStyle = isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.03)';
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Requirements Heading
  ctx.fillStyle = subtextColor;
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('KEY CANDIDATE REQUIREMENTS', margin + 68, reqBoxY + 32);

  // Requirement items (Up to 3)
  const displayReqs = requirements.length > 0
    ? requirements.slice(0, 3)
    : ['Matric / Grade 12 or equivalent', 'Relevant skills & dedication', 'South African ID / Valid Work Authorization'];

  displayReqs.forEach((req, idx) => {
    const itemY = reqBoxY + 68 + idx * 36;
    
    // Checkmark
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓', margin + 68, itemY);

    // Text (truncated if needed)
    ctx.fillStyle = textColor;
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    let truncatedReq = req;
    if (ctx.measureText(truncatedReq).width > cardW - 180) {
      while (ctx.measureText(truncatedReq + '...').width > cardW - 180 && truncatedReq.length > 10) {
        truncatedReq = truncatedReq.slice(0, -1);
      }
      truncatedReq += '...';
    }
    ctx.fillText(truncatedReq, margin + 94, itemY);
  });

  // 7. Footer Bar: Compensation, Deadline & Apply Callout
  const footerY = margin + cardH - 52;

  // Compensation
  if (compensation) {
    ctx.fillStyle = isLight ? '#047857' : '#34d399';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText(compensation, margin + 44, footerY);
  }

  // Deadline (Center-ish)
  if (deadline) {
    ctx.fillStyle = subtextColor;
    ctx.font = '500 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Closing: ${deadline}`, margin + (compensation ? 340 : 44), footerY);
  }

  // Verified Badge (Right)
  const badgeText = '✓ Official Orbit Vacancy';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const badgeW = ctx.measureText(badgeText).width;
  ctx.fillStyle = accentLight;
  ctx.fillText(badgeText, margin + cardW - badgeW - 44, footerY);

  return canvas.toDataURL('image/png');
}
