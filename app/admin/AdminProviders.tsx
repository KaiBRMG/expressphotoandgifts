"use client";

import {
  Badge,
  Button,
  createTheme,
  MantineProvider,
  MultiSelect,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  Select,
  TagsInput,
  Textarea,
  TextInput,
  Tooltip,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

/**
 * Mantine, dressed in the shop's own tokens: Archivo, brand blue as the
 * primary and as the ink, the shop's radii, and shadows tinted by the blue
 * that casts them. Amber is left to the admin stylesheet, which spends it on
 * one thing only: changes not yet saved.
 */

/** Brand blue at index 6, with tints and shades of the same hue around it. */
const brand: MantineColorsTuple = [
  "#e9edfb",
  "#d0d8f6",
  "#a1b1ed",
  "#6d86e3",
  "#4161da",
  "#2346d1",
  "#0126ba",
  "#011f9c",
  "#01197e",
  "#011361",
];

const md = { defaultProps: { size: "md" } };

const theme = createTheme({
  fontFamily: "var(--font-archivo), system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-mono), ui-monospace, monospace",
  headings: { fontFamily: "var(--font-archivo), system-ui, sans-serif", fontWeight: "600", textWrap: "balance" },
  primaryColor: "brand",
  primaryShade: 6,
  colors: { brand },
  white: "#ffffff",
  black: "#0126ba",
  radius: { xs: "12px", sm: "12px", md: "12px", lg: "18px", xl: "22px" },
  defaultRadius: "md",
  shadows: {
    xs: "0 4px 12px -8px rgb(1 38 186 / 0.35)",
    sm: "0 10px 24px -16px rgb(1 38 186 / 0.4)",
    md: "0 22px 44px -32px rgb(1 38 186 / 0.4)",
    lg: "0 30px 54px -30px rgb(1 38 186 / 0.5)",
    xl: "0 40px 70px -34px rgb(1 38 186 / 0.55)",
  },
  cursorType: "pointer",
  respectReducedMotion: true,
  components: {
    TextInput: TextInput.extend(md),
    PasswordInput: PasswordInput.extend(md),
    Textarea: Textarea.extend(md),
    NumberInput: NumberInput.extend(md),
    Select: Select.extend(md),
    MultiSelect: MultiSelect.extend(md),
    TagsInput: TagsInput.extend(md),
    SegmentedControl: SegmentedControl.extend(md),
    Button: Button.extend({ defaultProps: { size: "md", radius: "xl" } }),
    Badge: Badge.extend({ defaultProps: { radius: "xl", size: "lg", variant: "light" } }),
    // Tooltips here explain a control in a sentence, so they wrap at one width.
    Tooltip: Tooltip.extend({ defaultProps: { multiline: true, w: 260, withArrow: true } }),
  },
});

/** Secondary text is the blue let through to the white, never a grey. */
const resolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-text": "var(--ink)",
    "--mantine-color-body": "var(--paper)",
    "--mantine-color-dimmed": "var(--ink-soft)",
    "--mantine-color-placeholder": "var(--ink-faint)",
    "--mantine-color-default-border": "var(--rule-hair)",
    "--mantine-color-default-hover": "rgb(1 38 186 / 0.05)",
  },
  dark: {},
});

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light" cssVariablesResolver={resolver}>
      {children}
    </MantineProvider>
  );
}
