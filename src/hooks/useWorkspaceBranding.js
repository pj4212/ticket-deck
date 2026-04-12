import { useMemo } from 'react';

/**
 * Generates inline style overrides from workspace branding settings.
 * Usage: const { brandStyles, buttonStyle, accentColor } = useWorkspaceBranding(workspace);
 */
export default function useWorkspaceBranding(workspace) {
  return useMemo(() => {
    if (!workspace) return { brandStyles: {}, buttonStyle: {}, accentColor: null, hasLogo: false };

    const primary = workspace.primary_color;
    const secondary = workspace.secondary_color;

    const buttonStyle = primary
      ? { backgroundColor: primary, color: '#fff', borderColor: primary }
      : {};

    const accentColor = primary || null;

    return {
      brandStyles: {},
      buttonStyle,
      accentColor,
      hasLogo: !!workspace.logo_url,
      primaryColor: primary,
      secondaryColor: secondary,
    };
  }, [workspace]);
}