use std::path::{Path, PathBuf};

pub const BACKGROUND_SHORTCUT_NAME: &str = "Radianite Background.lnk";

pub async fn set_background_shortcut(
    desktop_dir: PathBuf,
    executable: PathBuf,
    enabled: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let shortcut = background_shortcut_path(&desktop_dir);
        if enabled {
            create_shortcut(&shortcut, &executable)
        } else {
            remove_shortcut(&shortcut)
        }
    })
    .await
    .map_err(|err| err.to_string())?
}

pub fn background_shortcut_path(desktop_dir: &Path) -> PathBuf {
    desktop_dir.join(BACKGROUND_SHORTCUT_NAME)
}

fn remove_shortcut(path: &Path) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(format!("failed to remove background shortcut: {err}")),
    }
}

#[cfg(windows)]
fn create_shortcut(path: &Path, executable: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        core::{Interface, PCWSTR},
        Win32::{
            System::Com::{
                CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile,
                CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
            },
            UI::Shell::{IShellLinkW, ShellLink},
        },
    };

    fn wide(value: &std::ffi::OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    let initialized = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    initialized
        .ok()
        .map_err(|err| format!("failed to initialize Windows shortcut support: {err}"))?;

    let result = (|| unsafe {
        let shell_link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
        let executable_wide = wide(executable.as_os_str());
        let arguments_wide = wide(std::ffi::OsStr::new(crate::lifecycle::BACKGROUND_ARG));
        let description_wide = wide(std::ffi::OsStr::new(
            "Run Radianite without loading the graphical interface",
        ));
        let working_dir = executable.parent().unwrap_or_else(|| Path::new("."));
        let working_dir_wide = wide(working_dir.as_os_str());
        let shortcut_wide = wide(path.as_os_str());

        shell_link.SetPath(PCWSTR(executable_wide.as_ptr()))?;
        shell_link.SetArguments(PCWSTR(arguments_wide.as_ptr()))?;
        shell_link.SetDescription(PCWSTR(description_wide.as_ptr()))?;
        shell_link.SetWorkingDirectory(PCWSTR(working_dir_wide.as_ptr()))?;
        shell_link.SetIconLocation(PCWSTR(executable_wide.as_ptr()), 0)?;

        let persist: IPersistFile = shell_link.cast()?;
        persist.Save(PCWSTR(shortcut_wide.as_ptr()), true)
    })();

    unsafe { CoUninitialize() };
    result
        .map_err(|err: windows::core::Error| format!("failed to create background shortcut: {err}"))
}

#[cfg(not(windows))]
fn create_shortcut(_path: &Path, _executable: &Path) -> Result<(), String> {
    Err("background shortcuts are only supported on Windows".to_string())
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{background_shortcut_path, BACKGROUND_SHORTCUT_NAME};

    #[test]
    fn uses_owned_shortcut_name_under_desktop() {
        assert_eq!(
            background_shortcut_path(Path::new(r"C:\Users\test\Desktop")),
            Path::new(r"C:\Users\test\Desktop").join(BACKGROUND_SHORTCUT_NAME)
        );
    }

    #[cfg(windows)]
    #[test]
    fn creates_and_removes_a_native_windows_shortcut() {
        let directory = std::env::temp_dir().join(format!(
            "radianite-shortcut-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let shortcut = super::background_shortcut_path(&directory);

        super::create_shortcut(&shortcut, &std::env::current_exe().unwrap()).unwrap();
        assert!(shortcut.is_file());
        super::remove_shortcut(&shortcut).unwrap();
        assert!(!shortcut.exists());

        std::fs::remove_dir_all(directory).unwrap();
    }
}
