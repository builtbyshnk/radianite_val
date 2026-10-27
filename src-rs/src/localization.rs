use serde::Deserialize;

pub const SYSTEM_LOCALE: &str = "system";
const FALLBACK_LOCALE: &str = "en-US";

#[derive(Deserialize)]
struct LocaleRegistry {
    locales: Vec<Locale>,
}

#[derive(Deserialize)]
struct Locale {
    tag: String,
    ui: bool,
}

fn ui_locales() -> impl Iterator<Item = String> {
    serde_json::from_str::<LocaleRegistry>(include_str!("../../locale-registry.json"))
        .expect("locale registry must be valid")
        .locales
        .into_iter()
        .filter(|locale| locale.ui)
        .map(|locale| locale.tag)
}

pub fn ensure_ui_locale(preference: &str) -> Result<(), String> {
    if preference == SYSTEM_LOCALE || ui_locales().any(|tag| tag == preference) {
        Ok(())
    } else {
        Err(format!("unsupported UI locale: {preference}"))
    }
}

pub fn resolve_ui_locale(preference: &str) -> String {
    let candidate = if preference == SYSTEM_LOCALE {
        system_ui_locale().unwrap_or_default()
    } else {
        preference.to_string()
    };
    match_ui_locale(&candidate)
}

fn match_ui_locale(candidate: &str) -> String {
    ui_locales()
        .find(|tag| tag.eq_ignore_ascii_case(candidate))
        .or_else(|| {
            let language = candidate.split('-').next().unwrap_or_default();
            ui_locales().find(|tag| {
                tag.split('-')
                    .next()
                    .is_some_and(|value| value.eq_ignore_ascii_case(language))
            })
        })
        .unwrap_or_else(|| FALLBACK_LOCALE.to_string())
}

#[cfg(windows)]
fn system_ui_locale() -> Option<String> {
    use windows_sys::Win32::Globalization::{GetUserDefaultUILanguage, LCIDToLocaleName};

    // LOCALE_NAME_MAX_LENGTH includes the terminating null character.
    let mut name = [0_u16; 85];
    // The buffer is valid for its full length. A LANGID with the default sort
    // order is also an LCID; use the display language, not regional formatting.
    let length = unsafe {
        LCIDToLocaleName(
            u32::from(GetUserDefaultUILanguage()),
            name.as_mut_ptr(),
            name.len() as i32,
            0,
        )
    };
    (length > 1).then(|| String::from_utf16_lossy(&name[..length as usize - 1]))
}

#[cfg(not(windows))]
fn system_ui_locale() -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_supported_display_languages_and_regional_variants() {
        for tag in ui_locales() {
            assert_eq!(match_ui_locale(&tag), tag);
        }
        assert_eq!(match_ui_locale("de-AT"), "de-DE");
        assert_eq!(match_ui_locale("es-MX"), "es-ES");
        assert_eq!(match_ui_locale("pt-PT"), "pt-BR");
        assert_eq!(match_ui_locale("ar-SA"), "ar-AE");
        assert_eq!(match_ui_locale("zh-Hans-CN"), "zh-CN");
        assert_eq!(match_ui_locale("fr-ca"), "fr-FR");
    }

    #[test]
    fn unsupported_display_languages_fall_back_to_english() {
        assert_eq!(match_ui_locale("it-IT"), FALLBACK_LOCALE);
        assert_eq!(match_ui_locale(""), FALLBACK_LOCALE);
        assert!(ensure_ui_locale("it-IT").is_err());
        assert!(ensure_ui_locale(SYSTEM_LOCALE).is_ok());
    }

    #[cfg(windows)]
    #[test]
    fn reads_windows_display_language() {
        assert!(system_ui_locale().is_some_and(|tag| !tag.is_empty()));
        assert!(ensure_ui_locale(&resolve_ui_locale(SYSTEM_LOCALE)).is_ok());
    }
}
