; Radianite NSIS lifecycle hooks.
; Keep these hooks safe for a current-user installation: do not write to HKLM,
; Program Files, or other machine-wide locations.

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Preparing Radianite for installation..."

  ; Release the executable before an upgrade replaces it. Tauri checks for a
  ; running app first; this also handles a process that lingered while closing.
  nsExec::ExecToLog 'taskkill /F /T /IM "radianite.exe"'

  ; Future pre-install work belongs here (for example, migrating legacy files).
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Radianite installation complete."

  ; Future post-install work belongs here. Keep it user-scoped and idempotent.
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Preparing Radianite for removal..."

  ; Ensure files are not locked while the uninstaller removes the application.
  nsExec::ExecToLog 'taskkill /F /T /IM "radianite.exe"'

  ; Do not delete user data here. Uninstalling the application should preserve
  ; preferences unless a future UI explicitly offers a data-removal option.
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "Radianite removal complete."

  ; Future cleanup of obsolete, non-user-data artifacts belongs here.
!macroend
