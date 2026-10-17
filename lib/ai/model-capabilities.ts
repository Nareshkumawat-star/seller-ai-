/** Heuristics used only when Ollama's /api/show does not report a capability list. */
const VISION_NAME_HINTS = [
  "llava",
  "vision",
  "minicpm-v",
  "moondream",
  "llama3.2-vision",
  "qwen2.5vl",
  "qwen2.5-vl",
  "qwen2.5.7vl",
  "gemma3",
  "pixtral",
  "granite3.2-vision",
];

export function modelNameMatches(installed: string, wanted: string): boolean {
  const a = installed.toLowerCase().trim();
  let b = wanted.toLowerCase().trim();
  if (a === b) return true;
  if (!b.includes(":")) b = `${b}:latest`;
  return a === b;
}

export function guessVisionSupport(modelName: string): boolean {
  const name = modelName.toLowerCase();
  return VISION_NAME_HINTS.some((hint) => name.includes(hint));
}

export type VisionCapability = {
  supported: boolean;
  model: string | null;
  source: "ollama-capabilities" | "name-heuristic" | "none";
  reason: string;
};

export function resolveVisionCapability(params: {
  configuredVisionModel?: string;
  showCapabilities?: string[] | null;
}): VisionCapability {
  const model = params.configuredVisionModel?.trim() || null;
  if (!model) {
    return {
      supported: false,
      model: null,
      source: "none",
      reason:
        "No vision model is configured. Set OLLAMA_VISION_MODEL to a compatible model (for example a Qwen2.5-VL or LLaVA tag) to enable image analysis.",
    };
  }

  if (params.showCapabilities?.includes("vision")) {
    return {
      supported: true,
      model,
      source: "ollama-capabilities",
      reason: `${model} reports vision support.`,
    };
  }

  if (params.showCapabilities && params.showCapabilities.length > 0) {
    return {
      supported: false,
      model,
      source: "ollama-capabilities",
      reason: `${model} is installed but does not advertise vision support.`,
    };
  }

  const guessed = guessVisionSupport(model);
  return {
    supported: guessed,
    model,
    source: "name-heuristic",
    reason: guessed
      ? `${model} looks like a vision model, but the runtime did not confirm it. Analysis may fail; text generation is unaffected.`
      : `${model} does not look like a vision model and the runtime did not confirm vision support.`,
  };
}
