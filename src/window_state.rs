use serde::{Deserialize, Serialize};
use std::path::Path;
use tao::window::Window;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 40,
            y: 40,
            width: 1280,
            height: 680,
            maximized: false,
        }
    }
}

pub fn load(path: &Path) -> WindowState {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

// Monitor coordinates are physical pixels and may be negative. Reserve space
// for the window frame and taskbar, and move disconnected-monitor windows back.
pub fn fit(mut state: WindowState, monitors: &[(i32, i32, u32, u32)]) -> WindowState {
    let Some(&(x, y, width, height)) = monitors
        .iter()
        .find(|&&(x, y, w, h)| {
            i64::from(state.x) >= i64::from(x)
                && i64::from(state.x) < i64::from(x) + i64::from(w)
                && i64::from(state.y) >= i64::from(y)
                && i64::from(state.y) < i64::from(y) + i64::from(h)
        })
        .or_else(|| monitors.first())
    else {
        return WindowState::default();
    };
    let max_width = width.saturating_sub(16).max(1);
    let max_height = height.saturating_sub(80).max(1);
    state.width = state.width.clamp(960.min(max_width), max_width);
    state.height = state.height.clamp(540.min(max_height), max_height);
    let max_x = (i64::from(x) + i64::from(width) - i64::from(state.width) - 16).max(i64::from(x));
    let max_y = (i64::from(y) + i64::from(height) - i64::from(state.height) - 80).max(i64::from(y));
    state.x = i64::from(state.x).clamp(i64::from(x), max_x) as i32;
    state.y = i64::from(state.y).clamp(i64::from(y), max_y) as i32;
    state
}

pub fn capture(window: &Window, state: &mut WindowState) {
    // Fullscreen/minimized bounds must never replace the normal window bounds.
    if window.fullscreen().is_some() || window.is_minimized() {
        return;
    }
    state.maximized = window.is_maximized();
    if state.maximized {
        return;
    }
    if let Ok(position) = window.outer_position() {
        let size = window.inner_size();
        if size.width > 0 && size.height > 0 {
            state.x = position.x;
            state.y = position.y;
            state.width = size.width;
            state.height = size.height;
        }
    }
}

pub fn save(path: &Path, state: &WindowState) -> std::io::Result<()> {
    let bytes = serde_json::to_vec(state).map_err(std::io::Error::other)?;
    let temporary = path.with_extension("tmp");
    std::fs::write(&temporary, bytes)?;
    std::fs::rename(temporary, path)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_bounds_and_handles_missing_monitor() {
        let state = WindowState {
            x: 100,
            y: 80,
            width: 1100,
            height: 600,
            maximized: true,
        };
        assert_eq!(fit(state.clone(), &[(0, 0, 1366, 768)]), state);
        let moved = fit(
            WindowState {
                x: 3000,
                y: 4000,
                width: u32::MAX,
                height: u32::MAX,
                maximized: false,
            },
            &[(0, 0, 1366, 768)],
        );
        assert_eq!(
            (moved.x, moved.y, moved.width, moved.height),
            (0, 0, 1350, 688)
        );
        let negative = WindowState {
            x: -1800,
            y: 50,
            width: 1000,
            height: 600,
            maximized: false,
        };
        assert_eq!(
            fit(
                negative.clone(),
                &[(0, 0, 1920, 1080), (-1920, 0, 1920, 1080)]
            ),
            negative
        );
        let tiny = fit(WindowState::default(), &[(0, 0, 800, 600)]);
        assert_eq!((tiny.width, tiny.height), (784, 520));
    }
    #[test]
    fn settings_roundtrip_and_invalid_data() {
        let folder =
            std::env::temp_dir().join(format!("live-sport-window-test-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("window.json");
        let state = WindowState {
            x: -1400,
            y: 70,
            width: 1111,
            height: 666,
            maximized: true,
        };
        save(&path, &state).unwrap();
        assert_eq!(load(&path), state);
        save(&path, &WindowState::default()).unwrap();
        assert_eq!(load(&path), WindowState::default());
        std::fs::write(&path, b"invalid").unwrap();
        assert_eq!(load(&path), WindowState::default());
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(folder).unwrap();
    }
}
