const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('../config/adPolicy');

// Constructed lazily, on first actual use — not at module load. The SDK
// throws immediately if ANTHROPIC_API_KEY is unset, and this module is
// required at server startup (via advertController), so an eager
// `new Anthropic()` here would crash the entire backend on boot whenever
// the key is missing, not just skip vetting as intended.
let client = null;
const getClient = () => {
  if (!client) client = new Anthropic();
  return client;
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['accept', 'reject', 'tweak'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    flags: { type: 'array', items: { type: 'string' } },
    rewrite: { type: ['string', 'null'] }
  },
  required: ['verdict', 'confidence', 'reasoning', 'flags', 'rewrite'],
  additionalProperties: false
};

// Best-effort image fetch for vision review. Vetting still runs on text
// alone if this fails — a missing/unreachable image should never block
// an otherwise-scannable advert.
const fetchImageBlock = async (mediaUrl) => {
  if (!mediaUrl || typeof fetch !== 'function') return null;

  try {
    const res = await fetch(mediaUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) return null; // skip oversized images

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: contentType,
        data: buffer.toString('base64')
      }
    };
  } catch (err) {
    console.error('Vetting: could not fetch media_url for vision review:', err.message);
    return null;
  }
};

/**
 * Runs an advert through the vetting policy.
 * Never throws for content/network reasons — returns a result object with
 * status 'ok' or 'error' so callers can fail open (leave advert unscanned)
 * rather than blocking advert creation.
 */
const vetAdvert = async ({ category, clientName, adContent }, mediaUrl) => {
  try {
    const imageBlock = await fetchImageBlock(mediaUrl);

    const textBlock = {
      type: 'text',
      text: `Category: ${category}\nClient: ${clientName}\nAd content:\n${adContent}`
    };

    const response = await getClient().messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA }
      },
      messages: [
        {
          role: 'user',
          content: imageBlock ? [imageBlock, textBlock] : [textBlock]
        }
      ]
    });

    if (response.stop_reason === 'refusal') {
      return { status: 'error', error: 'Model declined to review this content' };
    }

    const textOut = response.content.find(b => b.type === 'text');
    const parsed = JSON.parse(textOut.text);

    return { status: 'ok', result: parsed };
  } catch (err) {
    console.error('Vetting error:', err.message);
    return { status: 'error', error: err.message };
  }
};

module.exports = { vetAdvert };
