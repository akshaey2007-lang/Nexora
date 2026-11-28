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

async function generateWithFallback({ aiState, promptPayload, temperature, maxTokens, onToken, fallbackFn }) {
  if (!shouldUseLocalAI(aiState)) {
    return {
      result: fallbackFn(),
      usedFallback: true,
      fallbackReason: aiState?.aiEnabled === false ? 'AI is disabled in Settings.' : aiState?.webgpu?.reason
    };
  }

  try {
    const raw = await webllmManager.generate({
      ...promptPayload,
      temperature,
      maxTokens,
      preferredModelId: aiState?.selectedModelId,
      onToken
    });
    return { raw, usedFallback: false };
  } catch (err) {
    return {
      result: fallbackFn(),
      usedFallback: true,
      fallbackReason: err?.message || 'Local WebGPU model unavailable.'
    };
  }
}

export async function generateAssistantEmail({
  instruction,
  conversationHistory = [],
  senderName = '[Your Name]',
  aiState,
  onToken
}) {
  const promptPayload = buildAssistantPrompt({ instruction, conversationHistory, senderName });
  const outcome = await generateWithFallback({
    aiState,
    promptPayload,
    temperature: 0.55,
    maxTokens: 700,
    onToken,
    fallbackFn: () => buildFallbackTemplate('email', { prompt: instruction, senderName })
  });

  if (outcome.usedFallback) {
    return { ...outcome.result, usedFallback: true, fallbackReason: outcome.fallbackReason };
  }
  return { ...parseSubjectAndBody(outcome.raw), usedFallback: false };
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

  const outcome = await generateWithFallback({
    aiState,
    promptPayload,
    temperature: 0.5,
    maxTokens: 750,
    onToken,
    fallbackFn: () =>
      buildFallbackTemplate('email', {
        prompt,
        style,
        recipientName,
        purpose,
        importantDetails,
        senderName
      })
  });

  if (outcome.usedFallback) {
    return { ...outcome.result, usedFallback: true, fallbackReason: outcome.fallbackReason };
  }
  return { ...parseSubjectAndBody(outcome.raw, purpose || prompt), usedFallback: false };
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
  const promptPayload = buildLetterPrompt({
    letterType,
    prompt,
    recipientName,
    recipientTitle,
    senderName,
    importantDetails
  });

  const outcome = await generateWithFallback({
    aiState,
    promptPayload,
    temperature: 0.45,
    maxTokens: 850,
    onToken,
    fallbackFn: () =>
      buildFallbackTemplate('letter', {
        letterType,
        prompt,
        recipientName,
        recipientTitle,
        senderName,
        importantDetails
      })
  });

  if (outcome.usedFallback) {
    return {
      letterText: outcome.result,
      usedFallback: true,
      fallbackReason: outcome.fallbackReason
    };
  }
  return { letterText: outcome.raw.trim(), usedFallback: false };
}

export async function runWritingTool({
  tool,
  text,
  subject,
  targetTone,
  aiState,
  onToken
}) {
  const promptPayload = buildWritingToolPrompt({ tool, text, subject, targetTone });

  const outcome = await generateWithFallback({
    aiState,
    promptPayload,
    temperature: tool === 'fix_grammar' ? 0.2 : 0.45,
    maxTokens: tool === 'generate_subject' ? 120 : 650,
    onToken,
    fallbackFn: () => buildFallbackTemplate('rewrite', { tool, text, subject, targetTone })
  });

  if (outcome.usedFallback) {
    return {
      text: outcome.result,
      suggestions: tool === 'generate_subject' ? [outcome.result] : undefined,
      usedFallback: true,
      fallbackReason: outcome.fallbackReason
    };
  }

  const cleaned = outcome.raw.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();

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

  return { text: cleaned, usedFallback: false };
}

export async function generateSmartReply({
  incomingEmail,
  style = 'Professional',
  senderName = '[Your Name]',
  aiState,
  onToken
}) {
  const replySubject = incomingEmail?.subject?.startsWith('Re:')
    ? incomingEmail.subject
    : `Re: ${incomingEmail?.subject || ''}`;

  const promptPayload = buildSmartReplyPrompt({ incomingEmail, style, senderName });

  const outcome = await generateWithFallback({
    aiState,
    promptPayload,
    temperature: 0.45,
    maxTokens: style === 'Short' ? 220 : 500,
    onToken,
    fallbackFn: () => buildFallbackTemplate('smart_reply', { incomingEmail, style, senderName })
  });

  if (outcome.usedFallback) {
    return {
      subject: replySubject,
      body: outcome.result,
      usedFallback: true,
      fallbackReason: outcome.fallbackReason
    };
  }

  return {
    subject: replySubject,
    body: outcome.raw.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim(),
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
