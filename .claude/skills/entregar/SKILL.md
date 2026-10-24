---
name: entregar
description: Usar cuando una implementación está terminada y hay que cerrarla con revisión, changelog y pull request.
---

# Entregar

1. **NNN** (una vez, se reutiliza en todo): `n=$(ls changelog docs/prs 2>/dev/null | grep -o '^[0-9]\{3\}' | sort | tail -1); printf '%03d\n' $((10#${n:-0}+1))`
2. **Revisar**: skill `revisar` + `npm run lint` + `npx tsc --noEmit`. Si algo falla, parar y reportar.
3. **Changelog**: skill `changelog` → `changelog/NNN-<nombre>.md`.
4. **PR**: skill `plantilla-pr` → `docs/prs/NNN-<nombre>.md`.
5. **Publicar**: pedir confirmación. Con el sí: rama `NNN-<nombre>`, commit, push y `gh pr create --title "NNN-<nombre>" --body-file docs/prs/NNN-<nombre>.md`.

`<nombre>` = feature de la spec, o slug en inglés si no hay spec.
