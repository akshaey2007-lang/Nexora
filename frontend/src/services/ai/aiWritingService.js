import webllmManager from './webllmService.js';
import {
  buildAssistantPrompt,
  buildEmailWriterPrompt,
  buildFallbackTemplate,
  buildLetterPrompt,
  buildNaturalSchedulePrompt,
  buildSmartReplyPrompt,
  buildWritingToolPrompt,
  neutralizeUntrustedEmailText
} from './aiPromptService.js';
import { parseNaturalScheduleText } from './nlDateParser.js';

/**
 * Escapes plain text and preserves line breaks as clean, XSS-safe HTML paragraphs for ComposeModal.
 */
export function plainTextToSafeHtml(text = '') {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Converts HTML from Compose editor back into clean plain text before passing to LLM.
 */
export function htmlToPlainText(html = '') {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses LLM output into clean { subject, body }.
 */
export function parseSubjectAndBody(rawOutput = '', fallbackSubject = '') {
  const cleaned = String(rawOutput || '')
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();

  const subjectMatch = cleaned.match(/^(?:\*\*)?Subject\s*:\s*(?:\*\*)?\s*(.+)$/im);
  let subject = fallbackSubject || '';
  let body = cleaned;

  if (subjectMatch) {
    subject = subjectMatch[1].replace(/^["']|["']$/g, '').trim();
    const lines = cleaned.split(/\r?\n/);
    const idx = lines.findIndex((l) => /subject\s*:/i.test(l));
    if (idx !== -1) {
      lines.splice(idx, 1);
      body = lines.join('\n').trim();
    }
  }

  return {
    subject: subject || 'Follow-up',
    body
  };
}

function shouldUseLocalAI(aiState) {
  return Boolean(aiState?.aiEnabled !== false && aiState?.webgpu?.supported !== false);
}

export async function generateAssistantEmail({
  instruction,
  conversationHistory = [],
  senderName = '[Your Name]',
  aiState,
  onToken
}) {
  if (!shouldUseLocalAI(aiState)) {
    const fallback = buildFallbackTemplate('email', {
      prompt: instruction,
      senderName
    });
    return {
      ...fallback,
      usedFallback: true,
      fallbackReason: aiState?.aiEnabled === false ? 'AI is disabled in Settings.' : aiState?.webgpu?.reason
    };
  }

  const prompt = buildAssistantPrompt({ instruction, conversationHistory, senderName });
  const raw = await webllmManager.generate({
    ...prompt,
    temperature: 0.55,
    maxTokens: 700,
    preferredModelId: aiState?.selectedModelId,
    onToken
  });

  return {
    ...parseSubjectAndBody(raw),
    usedFallback: false
  };
}

export async function generateStructuredEmail({
  prompt,
  style,
  recipientName,
  recipientRole,
  purpose,
  importantDetails,
  tone,
  additionalInstructions,
  senderName,
  aiState,
  onToken
}) {
  if (!shouldUseLocalAI(aiState)) {
    const fallback = buildFallbackTemplate('email', {
      prompt,
      style,
      recipientName,
      purpose,
      importantDetails,
      senderName
    });
    return {
      ...fallback,
      usedFallback: true,
      fallbackReason: aiState?.aiEnabled === false ? 'AI is disabled in Settings.' : aiState?.webgpu?.reason
    };
  }

  const promptPayload = buildEmailWriterPrompt({
    prompt,
    style,
    recipientName,
    recipientRole,
    purpose,
    importantDetails,
    tone,
    additionalInstructions,
    senderName
  });

  const raw = await webllmManager.generate({
    ...promptPayload,
    temperature: 0.5,
    maxTokens: 750,
    preferredModelId: aiState?.selectedModelId,
    onToken
  });

  return {
    ...parseSubjectAndBody(raw, purpose || prompt),
    usedFallback: false
  };
}

export async function generateLetter({
  letterType,
  prompt,
  recipientName,
  recipientTitle,
  senderName,
  importantDetails,
  aiState,
  onToken
}) {
  if (!shouldUseLocalAI(aiState)) {
    return {
      letterText: buildFallbackTemplate('letter', {
        letterType,
        prompt,
        recipientName,
        recipientTitle,
        senderName,
        importantDetails
      }),
      usedFallback: true,
      fallbackReason: aiState?.aiEnabled === false ? 'AI is disabled in Settings.' : aiState?.webgpu?.reason
    };
  }

  const promptPayload = buildLetterPrompt({
    letterType,
    prompt,
    recipientName,
    recipientTitle,
    senderName,
    importantDetails
  });

  const raw = await webllmManager.generate({
    ...promptPayload,
    temperature: 0.45,
    maxTokens: 850,
    preferredModelId: aiState?.selectedModelId,
    onToken
  });

  return {
    letterText: raw.trim(),
    usedFallback: false
  };
}

export async function runWritingTool({
  tool,
  text,
  subject,
  targetTone,
  aiState,
  onToken
}) {
  if (!shouldUseLocalAI(aiState)) {
    const result = buildFallbackTemplate('rewrite', { tool, text, subject, targetTone });
    return {
      text: result,
      suggestions: tool === 'generate_subject' ? [result] : undefined,
      usedFallback: true
    };
  }

  const promptPayload = buildWritingToolPrompt({ tool, text, subject, targetTone });
  const raw = await webllmManager.generate({
    ...promptPayload,
    temperature: tool === 'fix_grammar' ? 0.2 : 0.45,
    maxTokens: tool === 'generate_subject' ? 120 : 650,
    preferredModelId: aiState?.selectedModelId,
    onToken
  });

  const cleaned = raw.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();

  if (tool === 'generate_subject') {
    const suggestions = cleaned
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+[\).\-\s]+|^[-*]\s+|^Subject:\s*/i, '').replace(/^["']|["']$/g, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return {
      text: suggestions[0] || 'Follow-up',
      suggestions,
      usedFallback: false
    };
  }

  return {
    text: cleaned,
    usedFallback: false
  };
}

export async function generateSmartReply({
  incomingEmail,
  style = 'Professional',
  senderName = '[Your Name]',
  aiState,
  onToken
}) {
  if (!shouldUseLocalAI(aiState)) {
    return {
      subject: incomingEmail?.subject?.startsWith('Re:')
        ? incomingEmail.subject
        : `Re: ${incomingEmail?.subject || ''}`,
      body: buildFallbackTemplate('smart_reply', { incomingEmail, style, senderName }),
      usedFallback: true,
      fallbackReason: aiState?.aiEnabled === false ? 'AI is disabled in Settings.' : aiState?.webgpu?.reason
    };
  }

  const promptPayload = buildSmartReplyPrompt({ incomingEmail, style, senderName });
  const raw = await webllmManager.generate({
    ...promptPayload,
    temperature: 0.45,
    maxTokens: style === 'Short' ? 220 : 500,
    preferredModelId: aiState?.selectedModelId,
    onToken
  });

  return {
    subject: incomingEmail?.subject?.startsWith('Re:')
      ? incomingEmail.subject
      : `Re: ${incomingEmail?.subject || ''}`,
    body: raw.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim(),
    usedFallback: false
  };
}

/**
 * Combines optional local AI extraction with strict deterministic date/email parsing.
 */
export async function interpretNaturalScheduleInstruction({
  instruction,
  timezone = 'UTC',
  existingDraft = {},
  aiState,
  useModelIfReady = true
}) {
  const emailMatch = String(instruction || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  let extracted = {
    recipientEmail: existingDraft.to || (emailMatch ? emailMatch[0] : ''),
    subject: existingDraft.subject || '',
    body: existingDraft.body || '',
    schedulePhrase: instruction
  };

  let aiUsed = false;

  if (
    useModelIfReady &&
    shouldUseLocalAI(aiState) &&
    aiState?.status === 'ready'
  ) {
    try {
      const promptPayload = buildNaturalSchedulePrompt({ instruction });
      const raw = await webllmManager.generate({
        ...promptPayload,
        temperature: 0.1,
        maxTokens: 320,
        preferredModelId: aiState?.selectedModelId
      });
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        extracted = {
          recipientEmail: parsedJson.recipientEmail || extracted.recipientEmail,
          subject: parsedJson.subject || extracted.subject,
          body: parsedJson.body || extracted.body,
          schedulePhrase: parsedJson.schedulePhrase || instruction
        };
        aiUsed = true;
      }
    } catch {
      // Deterministic fallback runs seamlessly below
    }
  }

  // Deterministic parsing ALWAYS controls actual date/time resolution
  let deterministic = parseNaturalScheduleText(extracted.schedulePhrase, { timezone });
  if (!deterministic.success && extracted.schedulePhrase !== instruction) {
    deterministic = parseNaturalScheduleText(instruction, { timezone });
  }

  return {
    extracted: {
      ...extracted,
      subject: neutralizeUntrustedEmailText(extracted.subject, 300)
    },
    schedule: deterministic,
    aiUsed
  };
}
