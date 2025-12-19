import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS = [
  {
    label: "Homeowner Rights",
    prompt: "What rights do homeowners have under the Davis-Stirling Act?",

  },
  {
    label: "Fines & Violations",
    prompt: "Can my HOA fine me, and what is the required process?",

  },
  {
    label: "Board Meetings",
    prompt: "What rules govern HOA board meetings under California law?",

  },
  {
    label: "Special Assessments",
    prompt: "When does an HOA need owner approval for a special assessment?",

  },
];

export const PLACEHOLDER_INPUT = "Input your question about HOA's....";

export const GREETING = "Welcome! I can help you find information from the Davis-Stirling Act and California HOA law. This is general reference only and not legal advice.";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: "#153D65", // Davis-Stirling blue
      level: 1
    }
  },
  radius: "round"
});
