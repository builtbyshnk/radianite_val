use std::{
    fs::File,
    io::{BufRead, BufReader, Seek, SeekFrom},
    path::Path,
    time::SystemTime,
};

#[derive(Default)]
pub(super) struct RangeAgentLog {
    offset: u64,
    created_at: Option<SystemTime>,
    codename: Option<String>,
}

impl RangeAgentLog {
    pub fn read(&mut self) -> Option<&str> {
        let path = std::path::PathBuf::from(std::env::var_os("LOCALAPPDATA")?)
            .join("VALORANT/Saved/Logs/ShooterGame.log");
        self.read_path(&path)
    }

    fn read_path(&mut self, path: &Path) -> Option<&str> {
        let mut file = File::open(path).ok()?;
        let metadata = file.metadata().ok()?;
        let created_at = metadata.created().ok();
        if created_at != self.created_at || metadata.len() < self.offset {
            self.offset = 0;
            self.codename = None;
            self.created_at = created_at;
        }
        file.seek(SeekFrom::Start(self.offset)).ok()?;
        let mut reader = BufReader::new(file);
        let mut line = Vec::new();
        while reader.read_until(b'\n', &mut line).ok()? > 0 {
            // Leave an unfinished record for the next poll.
            if !line.ends_with(b"\n") {
                break;
            }
            self.offset += line.len() as u64;
            if let Ok(line) = std::str::from_utf8(&line) {
                if let Some(character) = local_character(line) {
                    self.codename = character.map(str::to_string);
                }
            }
            line.clear();
        }
        self.codename.as_deref()
    }
}

fn local_character(line: &str) -> Option<Option<&str>> {
    let character = if let Some((_, record)) = line.split_once("LogPlayerController:") {
        record.split_once("ClientRestart_Implementation('")?.1
    } else {
        let record = line
            .split_once("LogShooterPlayerController:")
            .or_else(|| line.split_once("LogBasePlayerController:"))?
            .1;
        let character = record.split_once("Current character: ")?.1.trim();
        if character == "None" {
            return Some(None);
        }
        character.strip_prefix("Default__")?
    };
    let (codename, _) = character.split_once("_PC_C")?;
    (!codename.is_empty() && codename.bytes().all(|byte| byte.is_ascii_alphanumeric()))
        .then_some(Some(codename))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, io::Write};

    #[test]
    fn reads_only_local_character_records_and_ignores_previous_pawns() {
        assert_eq!(local_character(
            "[2026.10.29-15.26.54:354][475]LogShooterPlayerController: Warning: Shooter Player Controller Reapplying Bindings. Current character: Default__Deadeye_PC_C"
        ), Some(Some("Deadeye")));
        assert_eq!(local_character(
            "[2026.10.29-15.27.16:422][919]LogPlayerController: Warning: [77476] ClientRestart_Implementation('Paprika_PC_C_2147304369') - AcknowledgePawn('Paprika_PC_C_2147304369') - PrevPawn('Deadeye_PC_C_2147305023')"
        ), Some(Some("Paprika")));
        assert_eq!(local_character("LogAbilitySystem: Paprika_PC_C_123"), None);
        assert_eq!(
            local_character("LogNet: Actor_Paprika_X_ForceModuleProxy_C"),
            None
        );
        assert_eq!(
            local_character("LogBasePlayerController: Current character: None"),
            Some(None)
        );
        assert_eq!(
            local_character(
                "LogShooterPlayerController: Current character: Default__Unknown/Path_PC_C"
            ),
            None
        );
    }

    #[test]
    fn follows_appends_partial_records_truncation_and_session_resets() {
        let root = std::env::temp_dir().join(format!(
            "radianite-range-log-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("ShooterGame.log");
        fs::write(&path, "LogShooterPlayerController: Current character: Default__Phoenix_PC_C\nLogPlayerController: ClientRestart_Implementation('Paprika_PC_C_1')").unwrap();
        let mut log = RangeAgentLog::default();
        assert_eq!(log.read_path(&path), Some("Phoenix"));
        let offset = log.offset;
        assert_eq!(log.read_path(&path), Some("Phoenix"));
        assert_eq!(log.offset, offset);
        fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .unwrap()
            .write_all(b"\n")
            .unwrap();
        assert_eq!(log.read_path(&path), Some("Paprika"));
        fs::write(&path, "LogBasePlayerController: Current character: None\n").unwrap();
        assert_eq!(log.read_path(&path), None);
        fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .unwrap()
            .write_all(b"LogShooterPlayerController: Current character: Default__Deadeye_PC_C\n")
            .unwrap();
        assert_eq!(log.read_path(&path), Some("Deadeye"));
        fs::rename(&path, root.join("ShooterGame-backup.log")).unwrap();
        fs::write(
            &path,
            "LogShooterPlayerController: Current character: Default__Paprika_PC_C\n",
        )
        .unwrap();
        assert_eq!(log.read_path(&path), Some("Paprika"));
        fs::remove_dir_all(root).unwrap();
        assert_eq!(log.read_path(&path), None);
    }
}
