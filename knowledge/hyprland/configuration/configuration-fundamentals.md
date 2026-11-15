---
id: "22222222-2222-2222-2222-222222222222"
title: "Hyprland Configuration Fundamentals"
ecosystem: "hyprland"
category: "configuration"
versions: ["0.35", "0.40", "0.45"]
sources:
  - url: "https://wiki.hypr.land/Configuring/Configuring-Hyprland/"
    title: "Hyprland Wiki - Configuring Hyprland"
    ecosystem: "hyprland"
    versionApplicability: ">=0.35"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://wiki.hypr.land/Configuring/Variables/"
    title: "Hyprland Wiki - Variables"
    ecosystem: "hyprland"
    versionApplicability: ">=0.35"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://github.com/hyprwm/Hyprland/tree/main/docs"
    title: "Hyprland Source Repository - Docs"
    ecosystem: "hyprland"
    versionApplicability: ">=0.35"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
status: "verified"
lastVerified: "2026-11-15T00:00:00Z"
tags: ["configuration", "hyprland.conf", "variables", "includes", "categories"]
checksum: "sha256:placeholder"
---

# Hyprland Configuration Fundamentals

## Explanation

Hyprland uses a single configuration file (`hyprland.conf`) located at `~/.config/hypr/hyprland.conf` (or `$XDG_CONFIG_HOME/hypr/hyprland.conf`). The configuration uses a custom declarative syntax (Hyprlang) with categories, variables, and key-value assignments.

**Configuration structure:**
- **Categories**: Top-level sections (e.g., `monitor`, `input`, `general`, `animations`, `windowrule`)
- **Variables**: User-defined values with `$` prefix (e.g., `$myColor = rgb(ff0000)`)
- **Keywords**: Category-specific settings (e.g., `monitor=`, `bind=`, `windowrulev2=`)
- **Includes**: Modular config via `source = ~/.config/hypr/colors.conf`

**Loading order**: Main config → included files → environment variables (highest priority for variables).

## Patterns

### Basic Configuration Structure

Context: Complete minimal hyprland.conf with all essential sections
```hyprland
# ~/.config/hypr/hyprland.conf

# User-defined variables (must be defined before use)
$terminal = kitty
$menu = rofi -show drun
$mod = SUPER

# Monitor configuration
monitor=,preferred,auto,1

# Input configuration
input {
    kb_layout = us
    kb_variant = 
    kb_model = 
    kb_options = 
    kb_rules = 
    follow_mouse = 1
    touchpad {
        natural_scroll = true
    }
}

# General behavior
general {
    gaps_in = 5
    gaps_out = 10
    border_size = 2
    col.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg
    col.inactive_border = rgba(595959aa)
    layout = dwindle
    allow_tearing = false
}

# Key bindings
bind = $mod, RETURN, exec, $terminal
bind = $mod, D, exec, $menu
bind = $mod, Q, killactive,
bind = $mod, M, exit,
bind = $mod, E, exec, dolphin

# Window rules (v2 syntax - introduced in 0.35)
windowrulev2 = float, class:^(pavucontrol)$
windowrulev2 = size 800 600, class:^(calculator)$
windowrulev2 = workspace 2, class:^(firefox)$

# Animations
animations {
    enabled = true
    bezier = myBezier, 0.05, 0.9, 0.1, 1.05
    animation = windows, 1, 7, myBezier
    animation = windowsOut, 1, 7, myBezier, popin 80%
    animation = border, 1, 10, linear
    animation = borderangle, 1, 8, linear
    animation = fade, 1, 7, linear
    animation = workspaces, 1, 6, myBezier
}
```

### Modular Configuration with Includes

Context: Recommended file organization for maintainable configs
```
~/.config/hypr/
├── hyprland.conf          # Main config (sources others)
├── colors.conf            # Color definitions
├── keybinds.conf          # Key bindings
├── windowrules.conf       # Window rules
├── monitors.conf          # Monitor setup
├── animations.conf        # Animation definitions
└── env.conf               # Environment variables
```

**hyprland.conf:**
```hyprland
source = ~/.config/hypr/colors.conf
source = ~/.config/hypr/keybinds.conf
source = ~/.config/hypr/windowrules.conf
source = ~/.config/hypr/monitors.conf
source = ~/.config/hypr/animations.conf
source = ~/.config/hypr/env.conf

# Core settings that reference variables from includes
general {
    gaps_in = 5
    gaps_out = 10
    border_size = 2
    col.active_border = $accentColor
    col.inactive_border = $inactiveColor
}
```

**colors.conf:**
```hyprland
$accentColor = rgba(33ccffee)
$accentColorDim = rgba(33ccff88)
$inactiveColor = rgba(595959aa)
$backgroundColor = rgba(1e1e2eff)
$textColor = rgba(cdd6f4ff)
```

### Environment Variables and Runtime Configuration

Context: Setting environment variables and startup commands
```hyprland
# Environment variables (loaded before config)
env = QT_QPA_PLATFORM,wayland
env = QT_WAYLAND_DISABLE_WINDOWDECORATION,1
env = XCURSOR_SIZE,24
env = XCURSOR_THEME,Bibata-Modern-Classic

# Runtime commands (executed on startup)
exec-once = waybar &
exec-once = swaybg -i ~/Pictures/wallpaper.jpg &
exec-once = nm-applet --indicator &
exec-once = hypridle &

# Per-session commands
exec = hyprctl keyword misc:disable_soloreload 1
```

## Examples

### Minimal Working Configuration

Runnable: false
```hyprland
# ~/.config/hypr/hyprland.conf
$mod = SUPER
$terminal = foot

monitor=,preferred,auto,1

input {
    kb_layout = us
}

general {
    gaps_in = 5
    gaps_out = 10
    border_size = 2
    layout = dwindle
}

bind = $mod, RETURN, exec, $terminal
bind = $mod, Q, killactive,
bind = $mod, M, exit,
bind = $mod, SHIFT, R, reload,

# Basic window rules
windowrulev2 = float, class:^(pavucontrol)$
```

### Multi-Monitor Configuration

Runnable: false
```hyprland
# monitors.conf
# Internal laptop display
monitor=eDP-1,1920x1080@60,0x0,1

# External monitor (HDMI)
monitor=HDMI-A-1,2560x1440@144,1920x0,1.5

# Workspace assignment
workspace = 1, monitor:eDP-1
workspace = 2, monitor:eDP-1
workspace = 3, monitor:HDMI-A-1
workspace = 4, monitor:HDMI-A-1
workspace = 5, monitor:HDMI-A-1
```

### Advanced Variable Usage

Runnable: false
```hyprland
# Define colors once, use everywhere
$bg = rgba(1e1e2eff)
$fg = rgba(cdd6f4ff)
$accent = rgba(89b4faff)
$red = rgba(f38ba8ff)

# Computed values (Hyprlang supports basic math)
$gaps = 10
$outerGaps = $gaps * 2

general {
    gaps_in = $gaps
    gaps_out = $outerGaps
    col.active_border = $accent
    col.inactive_border = $bg
}

# Use in window rules
windowrulev2 = bordercolor $accent, class:^(kitty)$
```

## Mistakes

### Missing Dollar Prefix on Variables
Problem: Variable not recognized, treated as literal string
Solution: Always prefix user variables with `$` (e.g., `$myVar = value`)
Severity: error

### Using windowrule Instead of windowrulev2
Problem: Deprecated syntax, limited matching
Solution: Use `windowrulev2` with regex matchers (since 0.35)
Severity: error

### Incorrect Monitor Syntax
Problem: Monitor not configured, wrong resolution/position
Solution: Use `monitor=NAME,RESOLUTION@REFRESH,POSITION,SCALE` format
Severity: error

### Forgetting exec-once for Daemons
Problem: Multiple instances started on reload
Solution: Use `exec-once` for waybar, swaybg, hypridle, etc.
Severity: warning

### Hardcoded Key Codes
Problem: Config not portable across keyboards
Solution: Use key names (RETURN, SPACE, A-Z) not keycodes
Severity: warning

### No source for Modular Config
Problem: Monolithic config hard to maintain
Solution: Split into `colors.conf`, `keybinds.conf`, etc.
Severity: warning

### Missing kb_layout in input
Problem: Keyboard layout not set
Solution: Always define `input { kb_layout = us }`
Severity: error

## Compatibility

### windowrulev2
Introduced: 0.35
Notes: Regex-based matching, replaces windowrule

### windowrule
Introduced: 0.1
Deprecated: 0.35
Replacement: windowrulev2
Notes: Legacy syntax

### bindm (mouse binds)
Introduced: 0.40
Notes: Mouse button binds

### bindel (lock binds)
Introduced: 0.40
Notes: Binds active in lock screen

### animation bezier
Introduced: 0.40
Notes: Custom bezier curves

### monitor scale
Introduced: 0.35
Notes: Fractional scaling support

### env
Introduced: 0.30
Notes: Environment variables

### exec-once
Introduced: 0.30
Notes: Run once per session

### general:layout
Introduced: 0.30
Notes: `dwindle` or `master`

### input:follow_mouse
Introduced: 0.35
Notes: Focus follows mouse

### decoration:blur
Introduced: 0.40
Notes: Background blur

### misc:disable_soloreload
Introduced: 0.45
Notes: Disable solo reload

## Performance

### Config reload time
Impact: low
Description: Large configs with many includes reload slower
Mitigation: Keep main config minimal; use includes judiciously

### Window rules
Impact: medium
Description: Complex regex in windowrulev2 on many windows can impact performance
Mitigation: Use specific class/title matchers; avoid overly broad patterns

### Animations
Impact: medium
Description: Animations consume GPU resources
Mitigation: Disable animations on low-end hardware (`animations { enabled = false }`)

### Blur
Impact: high
Description: Background blur is GPU-intensive
Mitigation: Use sparingly or disable for performance (`decoration { blur { enabled = false } }`)

### Gaps
Impact: low
Description: Large gaps_out values reduce usable screen space
Mitigation: Balance aesthetics vs utility

## Debugging

### Config not loading
Cause: Syntax error in hyprland.conf
Diagnosis: Run `hyprctl reload`; check stderr
Resolution: Fix syntax; validate with `hyprctl -j`
Tools: hyprctl reload

### Keybinds not working
Cause: Wrong modifier or key name
Diagnosis: Check `hyprctl binds` for loaded binds
Resolution: Use correct key names (XKB key names)
Tools: hyprctl binds

### Monitor not detected
Cause: Wrong monitor name or syntax
Diagnosis: Run `hyprctl monitors`
Resolution: Use exact name from `hyprctl monitors`
Tools: hyprctl monitors

### Window rules not applying
Cause: Regex doesn't match window class
Diagnosis: Check `hyprctl clients` for class/title
Resolution: Use exact class from `hyprctl clients`
Tools: hyprctl clients

### Animations stuttering
Cause: GPU/driver issue or too complex
Diagnosis: Check `hyprctl animation` status
Resolution: Simplify bezier; disable per-window
Tools: hyprctl animation

### Colors not applied
Cause: Variable not defined or typo
Diagnosis: Check `hyprctl getoption general:col.active_border`
Resolution: Verify variable defined before use
Tools: hyprctl getoption

## References

- [Hyprland Wiki - Configuring](https://wiki.hypr.land/Configuring/Configuring-Hyprland/) (official)
- [Hyprland Wiki - Variables](https://wiki.hypr.land/Configuring/Variables/) (official)
- [Hyprland Wiki - Window Rules](https://wiki.hypr.land/Configuring/Window-Rules/) (official)
- [Hyprland Wiki - Animations](https://wiki.hypr.land/Configuring/Animations/) (official)
- [Hyprland GitHub Repository](https://github.com/hyprwm/Hyprland) (official)