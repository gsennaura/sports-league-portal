# Plano de Refatoração CSS — sports-league-portal

> Branch: `refactor/css-design-system`  
> Data: junho 2026 · Revisão 2 (paleta reduzida + hierarquia tipográfica)

---

## 1. Diagnóstico atual (scanner completo)

| Métrica | Valor |
|---|---|
| Arquivos `.tsx` com inline `style={{}}` | 67 |
| Ocorrências de propriedades CSS inline | **5.146** |
| Arquivos com objeto `S` local duplicado | 67 |
| Cores hardcoded distintas no projeto | **14** |
| Tamanhos de fonte distintos | **19** |
| Valores de border-radius distintos | **10** |
| Arquivo CSS global (`index.css`) | ~20 linhas úteis |

---

## 2. Paleta de 6 cores base (thematic)

Toda cor do projeto será derivada de **6 variáveis base**. Para criar um seletor de temas no futuro, basta trocar essas 6 linhas e o site inteiro muda.

### As 6 variáveis

| Variável | Valor atual | Papel semântico |
|---|---|---|
| `--c-brand` | `#18265b` | Superfícies primárias (nav, hero, inputs, fundo admin) |
| `--c-text` | `#cdd6f4` | Texto primário sobre fundos escuros |
| `--c-border` | `#313244` | Bordas, separadores, divisórias |
| `--c-action` | `#cba6f7` | Ação principal (CTA, btnSubmit, badges de destaque) |
| `--c-positive` | `#a6e3a1` | Sucesso, confirmação, ação positiva |
| `--c-negative` | `#f38ba8` | Erro, perigo, ação destrutiva |

### Tokens derivados (fixos, não thematic)

Esses não mudam com o tema — são derivações matemáticas ou semânticas das 6 bases:

| Token | Valor | Derivado de |
|---|---|---|
| `--c-bg` | `#11111b` | Fundo profundo (fora do card) |
| `--c-brand-hover` | `#2a3a7a` | `--c-brand` + 15% mais claro |
| `--c-text-muted` | `#45475a` | `--c-text` com 50% opacidade sobre `--c-brand` |
| `--c-text-inverse` | `#11111b` | Texto escuro sobre fundos claros |
| `--c-link` | `#89b4fa` | Links, back buttons, foco interativo |
| `--c-card-bg` | `#ffffff` | Fundo do pageCard público |
| `--c-warning` | `#f9e2af` | Avisos (fixo — amarelo semântico) |
| `--c-surface-2` | `#1a1a2e` | Superfície secundária (hover de cards) |

### Mapeamento: todas as cores atuais → 6 variáveis

| Cor hardcoded atual | Contagem | → Substituir por |
|---|---|---|
| `#cdd6f4` | 587x | `var(--c-text)` |
| `#313244` | 431x | `var(--c-border)` |
| `#18265b` | 428x | `var(--c-brand)` |
| `#ffffff` | 384x | `var(--c-card-bg)` ou `var(--c-text-inverse)` conforme contexto |
| `#89b4fa` | 267x | `var(--c-link)` |
| `#f38ba8` | 190x | `var(--c-negative)` |
| `#a6e3a1` | 186x | `var(--c-positive)` |
| `#45475a` | 176x | `var(--c-text-muted)` |
| `#cba6f7` | 152x | `var(--c-action)` |
| `#11111b` | 54x | `var(--c-bg)` ou `var(--c-text-inverse)` conforme contexto |
| `#f9e2af` | 50x | `var(--c-warning)` |
| `#dc2626` | 5x | `var(--c-negative)` (inconsistente — unificar) |
| `#1a1a2e` | ~10x | `var(--c-surface-2)` |
| outras (`#5a2a30`, `#2a1a1f` etc.) | ~30x | `color-mix` de `--c-negative` com transparência |

### Mapeamento: cores RGB/RGBA inline → `color-mix()`

O projeto também usa ~60 ocorrências de `rgba()` hardcoded — todas são versões com alpha das **mesmas 6 cores base**. Com CSS moderno (`color-mix`), essas também somem do código React.

| rgba hardcoded (exemplos) | Cor base | → Substituir por |
|---|---|---|
| `rgba(243,139,168,.1)` | `--c-negative` (#f38ba8) | `color-mix(in srgb, var(--c-negative) 10%, transparent)` |
| `rgba(243,139,168,.3)` | `--c-negative` | `color-mix(in srgb, var(--c-negative) 30%, transparent)` |
| `rgba(243,139,168,0.5)` | `--c-negative` | `color-mix(in srgb, var(--c-negative) 50%, transparent)` |
| `rgba(137,180,250,0.07)` | `--c-link` (#89b4fa) | `color-mix(in srgb, var(--c-link) 7%, transparent)` |
| `rgba(137,180,250,0.25)` | `--c-link` | `color-mix(in srgb, var(--c-link) 25%, transparent)` |
| `rgba(137,180,250,0.3)` | `--c-link` | `color-mix(in srgb, var(--c-link) 30%, transparent)` |
| `rgba(166,227,161,.1)` | `--c-positive` (#a6e3a1) | `color-mix(in srgb, var(--c-positive) 10%, transparent)` |
| `rgba(166,227,161,.3)` | `--c-positive` | `color-mix(in srgb, var(--c-positive) 30%, transparent)` |
| `rgba(166,227,161,0.4)` | `--c-positive` | `color-mix(in srgb, var(--c-positive) 40%, transparent)` |
| `rgba(203,166,247,0.08)` | `--c-action` (#cba6f7) | `color-mix(in srgb, var(--c-action) 8%, transparent)` |
| `rgba(249,226,175,.1)` | `--c-warning` (#f9e2af) | `color-mix(in srgb, var(--c-warning) 10%, transparent)` |
| `rgba(249,226,175,0.25)` | `--c-warning` | `color-mix(in srgb, var(--c-warning) 25%, transparent)` |
| `rgba(0,0,0,0.5)` a `rgba(0,0,0,0.8)` | black overlay | `color-mix(in srgb, black XX%, transparent)` |
| `rgba(255,255,255,0.08)` | white overlay | `color-mix(in srgb, white 8%, transparent)` |

> Na prática, essas `rgba` aparecem em `background`, `boxShadow` e `border` de elementos com efeito de transparência (hover states, overlays, badges). Ao mover para classes CSS, elas viram `color-mix()` referenciando as variáveis — assim também respondem à troca de tema.

**Convenção de nomenclatura para alpha tokens** (opcional, para os mais usados):
```css
:root {
  --c-negative-10: color-mix(in srgb, var(--c-negative) 10%, transparent);
  --c-negative-30: color-mix(in srgb, var(--c-negative) 30%, transparent);
  --c-positive-10: color-mix(in srgb, var(--c-positive) 10%, transparent);
  --c-positive-30: color-mix(in srgb, var(--c-positive) 30%, transparent);
  --c-link-10:     color-mix(in srgb, var(--c-link) 10%, transparent);
  --c-link-25:     color-mix(in srgb, var(--c-link) 25%, transparent);
  --c-action-10:   color-mix(in srgb, var(--c-action) 10%, transparent);
  --c-black-60:    color-mix(in srgb, black 60%, transparent);
}
```

---

## 3. Hierarquia tipográfica padronizada

### Escala de tamanhos (de 19 → 7 steps)

| Token | Valor | Uso |
|---|---|---|
| `--text-xs` | `0.72rem` | Badges tiny, labels secundárias, timestamps |
| `--text-sm` | `0.82rem` | Hints, texto muted, meta info, cabeçalhos de tabela |
| `--text-base` | `0.9rem` | Corpo padrão, inputs, botões |
| `--text-md` | `1rem` | Parágrafos normais, texto destacado |
| `--text-lg` | `1.25rem` | Sub-headers, títulos de card |
| `--text-xl` | `1.5rem` | Títulos de página (admin) |
| `--text-2xl` | `2.2rem` | Títulos de página (portal público), heroes |

> Valores `0.75 / 0.78 / 0.8 / 0.84 / 0.85 / 0.875 / 0.88rem` → unificados em `--text-sm` ou `--text-base`.

### Escala de pesos (de 7 → 4)

| Token | Valor | Uso |
|---|---|---|
| `--fw-normal` | `400` | Texto corrido |
| `--fw-medium` | `500` | Labels, hints |
| `--fw-bold` | `700` | Títulos, botões, campos destacados |
| `--fw-black` | `900` | Títulos grandes de página/hero |

---

## 4. Inventário de padrões tipográficos encontrados

Estes padrões existem **idênticos** em dezenas de arquivos. Cada um vira uma classe CSS:

### `.page-title` e `.page-title--hero`
**Admin** (`S.title` em ~30 arquivos): `fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0`  
**Portal** (`ChampionshipsPage`, `ClubsPage`, etc.): `fontSize: "2.2rem", fontWeight: 900`

```css
.page-title       { font-size: var(--text-xl);  font-weight: var(--fw-bold);  color: var(--c-text); margin: 0; }
.page-title--hero { font-size: var(--text-2xl); font-weight: var(--fw-black); }
```

---

### `.page-subtitle`
`S.subtitle` em ~20 arquivos: `fontSize: "0.875rem", color: "#cdd6f4", margin: "0.2rem 0 0"`

```css
.page-subtitle { font-size: var(--text-sm); color: var(--c-text-muted); margin: 0.2rem 0 0; }
```

---

### `.section-heading`
`S.legend` e `S.sectionTitle` em ~50 arquivos: uppercase small-caps, letra espaçada

```css
.section-heading {
  font-size: var(--text-sm);
  font-weight: var(--fw-bold);
  color: var(--c-text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0 0.5rem;
}
```

---

### `.section-divider`
165 ocorrências de `borderBottom: "1px solid"`. Componente já existe em `HomePage.tsx` mas é recriado inline nas demais páginas:

```css
.section-divider         { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--c-border); padding-bottom: 0.6rem; }
.section-divider__bar    { width: 4px; height: 1.1rem; border-radius: 2px; flex-shrink: 0; }
.section-divider__label  { font-size: var(--text-sm); font-weight: var(--fw-black); letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-brand); white-space: nowrap; }
.section-divider__rule   { flex: 1; height: 1px; background: linear-gradient(90deg, var(--c-border) 0%, transparent 100%); }
```

---

### `.hero` / `.hero__inner` / `.hero__accent`
`S.hero + S.heroAccent + S.heroInner` — **IDÊNTICO** em pelo menos 20 arquivos:

```css
.hero          { background-color: var(--c-brand); border-bottom: 1px solid var(--c-border); position: relative; overflow: hidden; }
.hero__accent  { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c-action), var(--c-link)); }
.hero__inner   { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1.5rem 1.25rem; }
.hero__row     { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
```

---

### `.back-link`
`S.back` em ~25 arquivos: `color: "#89b4fa", fontSize: "0.85rem", textDecoration: "none"`

```css
.back-link       { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--c-link); text-decoration: none; font-size: var(--text-sm); margin-bottom: 0.75rem; }
.back-link:hover { text-decoration: underline; }
```

---

### `.muted` / `.error-inline` / `.empty-state`

```css
.muted       { color: var(--c-text-muted); font-size: var(--text-sm); }
.error-text  { color: var(--c-negative);  font-size: var(--text-sm); }
.empty-state { color: var(--c-text-muted); font-size: var(--text-base); text-align: center; padding: 2rem; }
```

---

## 5. Inventário de padrões de componentes

### Formulários (`forms.css`)

```css
/* S.input — idêntico em ~40 arquivos */
.form-input {
  background: var(--c-brand); border: 1px solid var(--c-border);
  border-radius: var(--radius-md); color: var(--c-text);
  font-size: var(--text-base); padding: 0.55rem 0.75rem;
  outline: none; width: 100%; transition: border-color 0.15s;
}
.form-input:focus { border-color: var(--c-link); }
.form-select  { cursor: pointer; appearance: auto; }

/* S.label — idêntico em ~40 arquivos */
.form-label   { font-size: var(--text-sm); font-weight: var(--fw-medium); color: var(--c-text); display: block; margin-bottom: 0.25rem; }

/* S.fieldset + S.legend — idênticos em ~30 arquivos */
.form-fieldset { border: 1px solid var(--c-border); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin: 0; }
.form-legend   { font-size: var(--text-sm); font-weight: var(--fw-bold); color: var(--c-text); text-transform: uppercase; letter-spacing: 0.07em; padding: 0 0.5rem; }
.form-hint     { color: var(--c-text-muted); font-size: var(--text-xs); margin-top: 0.25rem; }
.form-field    { display: flex; flex-direction: column; gap: 0.25rem; }
.form-field-group { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.form-actions  { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }

/* Mensagens de feedback */
.form-error   { color: var(--c-negative); background: color-mix(in srgb, var(--c-negative) 10%, transparent); border: 1px solid color-mix(in srgb, var(--c-negative) 35%, transparent); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: var(--text-sm); }
.form-success { color: var(--c-positive); background: color-mix(in srgb, var(--c-positive) 10%, transparent); border: 1px solid color-mix(in srgb, var(--c-positive) 35%, transparent); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: var(--text-sm); }
.form-warning { color: var(--c-warning);  background: color-mix(in srgb, var(--c-warning) 10%, transparent);  border: 1px solid color-mix(in srgb, var(--c-warning) 35%, transparent);  border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: var(--text-sm); }
```

### Botões (`components.css`)

```css
.btn         { border-radius: var(--radius-md); font-size: var(--text-base); padding: 0.6rem 1.25rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; border: none; font-weight: var(--fw-bold); transition: opacity 0.15s; white-space: nowrap; text-decoration: none; }
.btn:hover   { opacity: 0.85; }
.btn-sm      { font-size: var(--text-sm); padding: 0.35rem 0.75rem; }
.btn-primary   { background: var(--c-action);   color: var(--c-text-inverse); }
.btn-secondary { background: transparent; border: 1px solid var(--c-border); color: var(--c-text); }
.btn-success   { background: var(--c-positive); color: var(--c-text-inverse); }
.btn-danger    { background: var(--c-negative); color: var(--c-text-inverse); }
.btn-link      { background: none; border: none; color: var(--c-link); font-size: var(--text-sm); cursor: pointer; padding: 0; }
```

### Tabelas (`admin.css`)

```css
/* S.table + S.th + S.td — idênticos em ~30 arquivos admin */
.data-table    { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.data-table th { text-align: left; padding: 0.6rem 0.75rem; font-size: var(--text-xs); font-weight: var(--fw-black); letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-text-muted); border-bottom: 1px solid var(--c-border); white-space: nowrap; }
.data-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--c-border); color: var(--c-text); vertical-align: middle; }
.data-table td.muted { color: var(--c-text-muted); font-size: var(--text-xs); }
.table-wrap    { overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--c-border); }
```

### Badges (`components.css`)

```css
.badge         { display: inline-flex; align-items: center; border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: var(--text-xs); font-weight: var(--fw-bold); white-space: nowrap; }
.badge-action  { color: var(--c-action);   background: color-mix(in srgb, var(--c-action) 12%, transparent);   border: 1px solid color-mix(in srgb, var(--c-action) 40%, transparent); }
.badge-info    { color: var(--c-link);     background: color-mix(in srgb, var(--c-link) 12%, transparent);     border: 1px solid color-mix(in srgb, var(--c-link) 40%, transparent); }
.badge-success { color: var(--c-positive); background: color-mix(in srgb, var(--c-positive) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-positive) 40%, transparent); }
.badge-warning { color: var(--c-warning);  background: color-mix(in srgb, var(--c-warning) 12%, transparent);  border: 1px solid color-mix(in srgb, var(--c-warning) 40%, transparent); }
.badge-danger  { color: var(--c-negative); background: color-mix(in srgb, var(--c-negative) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-negative) 40%, transparent); }
```

---

## 6. Estrutura de arquivos proposta

```
src/
├── styles/
│   ├── tokens.css        ← 6 vars base + derivadas + escala tipográfica
│   ├── typography.css    ← .page-title, .page-subtitle, .section-heading, .muted...
│   ├── layout.css        ← .page-container, .hero, .section-divider, .page-card...
│   ├── components.css    ← .btn, .badge, .card, .back-link, .empty-state...
│   ├── forms.css         ← .form-input, .form-label, .form-fieldset, .form-actions...
│   └── admin.css         ← .data-table, .table-wrap (específico do painel)
└── index.css             ← @import de todos + reset + body
```

---

## 7. `tokens.css` completo

```css
/* ═══════════════════════════════════════════════════
   6 CORES BASE — troque aqui para mudar o tema todo
   ═══════════════════════════════════════════════════ */
:root {
  --c-brand:    #18265b;  /* superfícies: nav, hero, inputs, admin bg  */
  --c-text:     #cdd6f4;  /* texto primário sobre fundos escuros        */
  --c-border:   #313244;  /* bordas, separadores, tabelas               */
  --c-action:   #cba6f7;  /* CTA, btnSubmit, badges de destaque         */
  --c-positive: #a6e3a1;  /* sucesso, confirmação, ação positiva        */
  --c-negative: #f38ba8;  /* erro, perigo, ação destrutiva              */
}

/* ═══════════════════════════════════════════════════
   TOKENS DERIVADOS
   ═══════════════════════════════════════════════════ */
:root {
  --c-bg:           #11111b;
  --c-brand-hover:  #2a3a7a;
  --c-text-muted:   #45475a;
  --c-text-inverse: #11111b;
  --c-link:         #89b4fa;
  --c-warning:      #f9e2af;
  --c-card-bg:      #ffffff;
  --c-surface-2:    #1a1a2e;
}

/* ═══════════════════════════════════════════════════
   ESCALA TIPOGRÁFICA
   ═══════════════════════════════════════════════════ */
:root {
  --text-xs:   0.72rem;
  --text-sm:   0.82rem;
  --text-base: 0.9rem;
  --text-md:   1rem;
  --text-lg:   1.25rem;
  --text-xl:   1.5rem;
  --text-2xl:  2.2rem;

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-bold:   700;
  --fw-black:  900;
}

/* ═══════════════════════════════════════════════════
   ESPAÇAMENTO E BORDAS
   ═══════════════════════════════════════════════════ */
:root {
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   10px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  --shadow-card: 0 8px 56px rgba(0,0,0,0.5);
  --shadow-sm:   0 2px 8px rgba(0,0,0,0.15);
}
```

---

## 8. Tema alternativo (exemplo futuro — 6 linhas)

```css
/* theme-green.css */
:root {
  --c-brand:    #1a4731;
  --c-text:     #d4ede8;
  --c-border:   #2d4a3e;
  --c-action:   #6ee7b7;
  --c-positive: #a7f3d0;
  --c-negative: #fca5a5;
}
```

Zero mudança no código React. Apenas um novo arquivo CSS com 6 linhas.

---

## 9. Plano de migração (5 fases)

### Fase 1 — Criar arquivos CSS (zero risco)
- [ ] `src/styles/tokens.css`
- [ ] `src/styles/typography.css`
- [ ] `src/styles/layout.css`
- [ ] `src/styles/components.css`
- [ ] `src/styles/forms.css`
- [ ] `src/styles/admin.css`
- [ ] `src/index.css` — adicionar `@import` dos 6 arquivos

### Fase 2 — Componentes compartilhados
- [ ] `TopNav.tsx` · `Footer.tsx` · `App.tsx` (LeagueTopBanner)
- [ ] `MatchesByDay.tsx` · `NewsCarousel.tsx` · `PageLoader.tsx`

### Fase 3 — Páginas públicas
- [ ] `HomePage.tsx`
- [ ] `ChampionshipsPage.tsx` · `ChampionshipDetailPage.tsx`
- [ ] `ClubsPage.tsx` · `ClubDetailPage.tsx`
- [ ] `TeamDetailPage.tsx` · `MatchDetailPage.tsx`
- [ ] `NewsPage.tsx` · `NewsDetailPage.tsx`
- [ ] `DocumentsPage.tsx` · `EmendasPage.tsx`
- [ ] `VenuesPage.tsx` · `VenueDetailPage.tsx`
- [ ] `RefereesPage.tsx` · `RefereeDetailPage.tsx`
- [ ] `LiveMatchesPage.tsx`

### Fase 4 — Autenticação e perfil
- [ ] `LoginPage.tsx` · `CadastroPage.tsx`
- [ ] `MyProfilePage.tsx` · `SolicitarVinculoPage.tsx` · `DirigentePage.tsx`

### Fase 5 — Painel Admin (prioridade por volume)
- [ ] `AdminChampionshipManagePage.tsx` (99 ocorrências)
- [ ] `AdminTeamEditPage.tsx` (45) · `AdminClubBulkImportPage.tsx` (39)
- [ ] `AdminTeamBulkRegistrationPage.tsx` (36) · `AdminRegistrationsPage.tsx` (35)
- [ ] demais ~35 arquivos admin

---

## 10. Regra de ouro — o que fica no S object

```tsx
// ✅ S object correto após migração — só o que é único desta página
const S = {
  champGrid: { gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" },
};

// ❌ Errado — duplicado de outros 40 arquivos
const S = {
  title:  { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4" }, // → className="page-title"
  input:  { backgroundColor: "#18265b", border: "1px solid #313244" }, // → className="form-input"
  back:   { color: "#89b4fa", fontSize: "0.85rem" }, // → className="back-link"
};
```

---

## 11. Resultado esperado

| | Antes | Depois |
|---|---|---|
| Propriedades CSS inline | 5.146 | ~600 |
| Cores hardcoded (hex) | 14 | **0** |
| Cores hardcoded (rgba) | ~60 ocorrências | **0** (viram `color-mix()`) |
| Para mudar cor primária | editar 428 linhas | editar **1 linha** |
| Para criar tema alternativo | impossível | **6 linhas** em novo arquivo |
| Escala tipográfica | 19 valores | **7 steps** |
| Border-radius distintos | 10 valores | **5 tokens** |
| Tamanho médio do S object | ~30 props | **~5 props** |
