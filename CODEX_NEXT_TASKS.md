# Finuvo v4 — Next Tasks for Codex

> Section 1 (bank logos) sudah selesai di commit `7581a28`.
> Berikut sisa 19 section yang belum, sudah dikelompokkan jadi **batch kecil** biar Codex gak capek di tengah jalan. Kasih batch satu per satu, jangan langsung semua.

---

## 📦 Batch A — Polish dasar (paling cepat, no schema change)
**Estimasi: 1 jam Codex.** Kasih semuanya sekaligus.

> **Kerjakan Section 6, 7, 10, 19, 20 dari `CODEX_PROMPT_V4.md`. Setelah selesai semua, jalankan `npm run build` + `npm run lint` lalu commit dengan message:** `feat(polish): undo toast, empty states, skeleton consistency, button loading, page transitions`

**Acceptance ringkas:**
- `lib/toast-undo.ts` ada dan dipakai di kategori-delete + recurring-delete (ganti `confirm()`)
- `components/shared/EmptyHint.tsx` ada dan dipakai di minimal 4 halaman kosong
- `components/shared/Skeleton.tsx` ada (`SkeletonCard`, `SkeletonRow`, `SkeletonHero`)
- Semua tombol modal yang trigger fetch async udah punya spinner loading
- Page transition pakai directional slide + respect `prefers-reduced-motion`

---

## 📦 Batch B — Receipt & Tags (fitur tx core)
**Estimasi: 1.5 jam Codex.** Kasih sekaligus.

> **Kerjakan Section 2 + Section 3 dari `CODEX_PROMPT_V4.md`. Wajib pakai pola Firebase Storage yang sama dengan `app/api/profile/avatar/route.ts` (signed URL + downloadToken). Setelah selesai, commit:** `feat(tx): receipt photo upload + tags input with autocomplete`

**Smoke test:**
- Add transaksi dengan foto struk dari kamera HP → reload → struk masih ada
- Add transaksi dengan tag `kerja` + `kopi` → filter list pakai tag → muncul
- Hapus transaksi → file struk di Firebase Storage juga ke-hapus

---

## 📦 Batch C — Bulk + Sort
**Estimasi: 1 jam Codex.**

> **Kerjakan Section 4 + Section 5. Bulk delete WAJIB optimistic UI dengan rollback kalau API error. Sort harus disimpen di localStorage `finuvo:tx-sort`. Commit:** `feat(tx): bulk select & re-categorize, sort options`

---

## 📦 Batch D — Templates + Heatmap
**Estimasi: 1.5 jam Codex.**

> **Kerjakan Section 11 + Section 8. Templates muncul di dashboard antara MonthlyCashflowCard dan StreakBanner. Heatmap collapsible di /transactions. Commit dipisah dua:**
> - `feat(dashboard): transaction templates / pintasan cepat`
> - `feat(tx): spending calendar heatmap`

---

## 📦 Batch E — Notification Center + Bills
**Estimasi: 2 jam Codex.** Yang terberat, kasih terakhir kalau Codex masih fresh.

> **Kerjakan Section 13 + Section 15. Notification center wajib persist di Firebase node `users/{uid}/notifications/`. Bills jadi tab baru di /goals (selain Goals & Budget). Hook ke cron yang udah ada untuk reminder. Commit dipisah:**
> - `feat(notifications): in-app activity feed with unread badge`
> - `feat(bills): one-off due dates with reminders`

---

## 📦 Batch F — Polish & UX flair (bisa terakhir)
**Estimasi: 2 jam Codex.**

> **Kerjakan Section 9, 12, 14, 17, 18 sekaligus. Semua self-contained, no DB change kecuali accent (preferences node). Commit dipisah per fitur:**
> - `feat: pull-to-refresh on dashboard, transactions, akun, portfolio`
> - `feat: command palette (cmd+k) with fuzzy search`
> - `feat: custom accent color picker`
> - `feat(insights): actionable proactive suggestions`
> - `feat: haptic feedback on key actions`

---

## 📦 Batch G — PDF Export
**Estimasi: 45 menit.** Bisa kapan aja, gak depend ke yang lain.

> **Kerjakan Section 16. Pakai `pdf-lib` (jangan headless chromium). Commit:** `feat: monthly PDF report`

---

## 🚦 Aturan main per batch

Setiap batch, suruh Codex:
1. Baca dulu `CODEX_PROMPT_V4.md` section yang relevan untuk konteks penuh.
2. Implement fitur sesuai spec.
3. Jalanin `npm run build` + `npm run lint` — wajib lulus, bukan optional.
4. Commit + push.
5. Lapor ke kamu apa yang berubah, file mana aja, dan smoke test apa yang udah dilewatin.

Kalau Codex bilang "ada beberapa file yang belum ke-commit" kayak terakhir kali, jangan dikasih batch baru — suruh dia cleanup dulu, atau kamu cek manual `git status` dulu.

---

## 📊 Progress tracker

Centang sambil jalan:

- [x] Section 1 — Bank logos (commit 7581a28)
- [ ] Section 2 — Receipt attachment
- [ ] Section 3 — Tags UI
- [ ] Section 4 — Bulk actions
- [ ] Section 5 — Sort options
- [ ] Section 6 — Undo toast
- [ ] Section 7 — Empty states
- [ ] Section 8 — Heatmap
- [ ] Section 9 — Pull-to-refresh
- [ ] Section 10 — Skeleton consistency
- [ ] Section 11 — Templates
- [ ] Section 12 — Command palette
- [ ] Section 13 — Notification center
- [ ] Section 14 — Custom accent
- [ ] Section 15 — Bills
- [ ] Section 16 — PDF report
- [ ] Section 17 — Proactive insights
- [ ] Section 18 — Haptics
- [ ] Section 19 — Loading state audit
- [ ] Section 20 — Page transitions
