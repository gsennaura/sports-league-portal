# Plano de Refatoração CSS — sports-league-portal

> Branch: `refactor/css-design-system`  
> Data: junho 2026

---

## 1. Diagnóstico atual

### Volume de estilos inline

| Métrica | Valor |
|---|---|
| Arquivos `.tsx` com `style={{...}}` | 67 |
| Ocorrências de propriedades CSS inline | **5.146** |
| Arquivos com objeto `S` local | 67 |
| Arquivo CSS global (`index.css`) | ~20 linhas úteis |

### Arquivos mais críticos (mais `style={{`)

| Arquivo | Ocorrências |
|---|---|
| `AdminChampionshipManagePage.tsx` | 99 |
| `ChampionshipDetailPage.tsx` | 89 |
| `TeamDetailPage.tsx` | 58 |
| `AdminTeamEditPage.tsx` | 45 |
| `AdminClubBulkImportPage.tsx` | 39 |
| `AdminTeamBulkRegistrationPage.tsx` | 36 |
| `AdminRegistrationsPage.tsx` | 35 |
| `MatchDetailPage.tsx` | 31 |
| `CadastroPage.tsx` | 30 |
| `AthleteDetailPage.tsx` | 29 |

### Problema central: S objects duplicados

Todos os 67 arquivos definem um objeto `const S: Record<string, React.CSSProperties>` **localmente**, com propriedades **idênticas** repetidas. Exemplos:

#### `S.input` — idêntico em ~40 arquivos:
```tsx
input: {
  backgroundColor: "#18265b",
  border: "1px solid #313244",
  borderRadius: "6px",
  color: "#cdd6f4",
  fontSize: "0.9rem",
  padding: "0.55rem 0.75rem",
  outline: "none",
  width: "100%",
}
```

#### `S.page` — idêntico em ~35 arquivos:
```tsx
page: {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "2.5rem 2rem 4rem",
  display: "flex",
  flexDirection: "column",
}
```

#### Outros S.* altamente duplicados:
`S.label`, `S.select`, `S.th`, `S.td`, `S.table`, `S.tableWrap`, `S.title`,
`S.hero`, `S.heroInner`, `S.card`, `S.back`, `S.sectionTitle`, `S.form`,
`S.fieldGroup`, `S.fieldset`, `S.legend`, `S.hint`, `S.errorText`, `S.actions`,
`S.btnCancel`, `S.btnSubmit`, `S.empty`, `S.subtitle`

---

## 2. Inconsistências de design tokens

### Cores (sem variáveis)

| Cor | Uso atual | Papel |
|---|---|---|
| `#18265b` | 428x | Brand primary / fundos escuros |
| `#cdd6f4` | 587x | Texto principal |
| `#313244` | 431x | Bordas, separadores |
| `#ffffff` | 384x | Texto branco / bg card |
| `#89b4fa` | 267x | Accent azul |
| `#f38ba8` | 190x | Erro / vermelho |
| `#a6e3a1` | 186x | Sucesso / verde |
| `#45475a` | 176x | Texto secundário / muted |
| `#cba6f7` | 152x | Accent roxo / destaque |
| `#f9e2af` | 50x | Accent amarelo / aviso |
| `#11111b` | 54x | Fundo profundo |
| `#dc2626` | 5x | Erro (inconsistente com #f38ba8) |

**Problema**: nenhuma cor usa `var(--color-*)`. Mudar uma cor = `sed` em centenas de arquivos.

### Tamanhos de fonte (15+ valores diferentes)

```
0.65 / 0.68 / 0.7 / 0.72 / 0.75 / 0.78 / 0.8 / 0.82 / 0.83 / 0.84
0.85 / 0.875 / 0.88 / 0.9 / 0.95 / 1.0 / 1.1 / 1.4 / 1.5 rem
```

Deveriam ser **6 a 8 steps** de uma escala tipográfica.

### Border radius (8 valores diferentes)

```
4px / 5px / 6px / 7px / 8px / 10px / 12px / 14px / 20px / 50%
```

Deveriam ser **4 tokens** (sm/md/lg/full).

### Font weights
`300 / 400 / 500 / 600 / 700 / 800 / 900` — todos usados, sem semântica clara.

---

## 3. Arquitetura proposta

```
src/
├── styles/
│   ├── tokens.css          ← CSS custom properties (vars)
│   ├── base.css            ← reset + body + tipografia base
│   ├── components.css      ← classes reutilizáveis (.btn, .card, .badge...)
│   ├── forms.css           ← .form-input, .form-label, .form-select...
│   ├── layout.css          ← .page-container, .hero, .grid...
│   └── admin.css           ← classes específicas do painel admin
├── index.css               ← @import de todos os arquivos acima
└── ...
```

Cada página ainda pode ter um `S` object local para estilos **verdadeiramente únicos**, mas importando variáveis de `tokens.css` via `getComputedStyle` ou usando `className` para os padrões comuns.

---

## 4. Design tokens propostos (`tokens.css`)

### Cores
```css
:root {
  /* Brand */
  --color-brand:        #18265b;
  --color-brand-light:  #2a3a7a;

  /* Text */
  --color-text:         #cdd6f4;
  --color-text-muted:   #45475a;
  --color-text-white:   #ffffff;
  --color-text-inverse: #11111b;

  /* Surface / Background */
  --color-bg:           #11111b;
  --color-surface:      #18265b;
  --color-surface-2:    #1e1e2e;
  --color-border:       #313244;

  /* Accents */
  --color-accent-blue:   #89b4fa;
  --color-accent-purple: #cba6f7;
  --color-accent-green:  #a6e3a1;
  --color-accent-yellow: #f9e2af;
  --color-accent-red:    #f38ba8;

  /* Semantic */
  --color-success:  #a6e3a1;
  --color-error:    #f38ba8;
  --color-warning:  #f9e2af;
  --color-info:     #89b4fa;

  /* Card (portal) */
  --color-card-bg: #ffffff;
}
```

### Tipografia
```css
:root {
  --font-size-xs:   0.72rem;   /* labels secundários, badges tiny */
  --font-size-sm:   0.8rem;    /* hints, datas, meta */
  --font-size-md:   0.9rem;    /* corpo padrão, inputs */
  --font-size-lg:   1rem;      /* parágrafo normal */
  --font-size-xl:   1.25rem;   /* subtítulos */
  --font-size-2xl:  1.5rem;    /* títulos de seção */
  --font-size-3xl:  2.2rem;    /* títulos de página */

  --font-weight-normal:    400;
  --font-weight-medium:    500;
  --font-weight-semibold:  600;
  --font-weight-bold:      700;
  --font-weight-extrabold: 800;
  --font-weight-black:     900;
}
```

### Espaçamento e bordas
```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

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

## 5. Classes CSS propostas

### Tipografia (`components.css`)

```css
.page-title { font-size: var(--font-size-3xl); font-weight: var(--font-weight-black); color: var(--color-text); margin: 0; }
.page-subtitle { font-size: var(--font-size-lg); color: var(--color-text-muted); margin: 0; }
.section-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-extrabold); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-brand); }
.label-text { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-1); display: block; }
.muted-text { color: var(--color-text-muted); font-size: var(--font-size-sm); }
.error-text { color: var(--color-error); font-size: var(--font-size-sm); }
.hint-text { color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: var(--space-1); }
```

### Layout (`layout.css`)

```css
.page-container { max-width: 1100px; margin: 0 auto; padding: 2.5rem 2rem 4rem; display: flex; flex-direction: column; gap: var(--space-6); }
.hero { display: flex; align-items: center; gap: var(--space-4); padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); }
.page-card { background: var(--color-card-bg); border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-card); max-width: 1100px; margin: 1rem auto 0; min-height: calc(100vh - 8rem); }
.section-divider { display: flex; align-items: center; gap: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid; margin-bottom: var(--space-5); }
.data-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
```

### Formulários (`forms.css`)

```css
.form-input { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); font-size: var(--font-size-md); padding: 0.55rem 0.75rem; outline: none; width: 100%; transition: border-color 0.15s; }
.form-input:focus { border-color: var(--color-accent-blue); }
.form-select { cursor: pointer; appearance: auto; }
.form-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-1); display: block; }
.form-hint { color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: var(--space-1); }
.form-field { display: flex; flex-direction: column; gap: var(--space-1); }
.form-field-group { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-4); }
.form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); padding-top: var(--space-2); }
.form-error { color: var(--color-error); background: #2a1a1f; border: 1px solid #5a2a30; border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: var(--font-size-sm); }
.form-success { color: var(--color-success); background: #1a2a1f; border: 1px solid #2a5a30; border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: var(--font-size-sm); }
```

### Botões (`components.css`)

```css
.btn { border-radius: var(--radius-md); font-size: var(--font-size-md); padding: 0.6rem 1.25rem; cursor: pointer; display: inline-flex; align-items: center; gap: var(--space-2); border: none; font-weight: var(--font-weight-semibold); transition: opacity 0.15s; }
.btn:hover { opacity: 0.85; }
.btn-primary { background: var(--color-accent-purple); color: var(--color-text-inverse); font-weight: var(--font-weight-bold); }
.btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-danger { background: var(--color-error); color: var(--color-text-inverse); }
.btn-success { background: var(--color-success); color: var(--color-text-inverse); }
.btn-sm { font-size: var(--font-size-sm); padding: 0.35rem 0.75rem; }
.btn-link { background: none; border: none; color: var(--color-accent-blue); font-size: var(--font-size-sm); cursor: pointer; padding: 0; text-decoration: underline; }
.back-link { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-text-muted); font-size: var(--font-size-sm); text-decoration: none; margin-bottom: var(--space-4); }
.back-link:hover { color: var(--color-text); }
```

### Tabelas (`admin.css`)

```css
.data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.data-table th { text-align: left; padding: 0.6rem 0.75rem; font-size: var(--font-size-xs); font-weight: var(--font-weight-extrabold); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
.data-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); vertical-align: middle; }
.data-table td.muted { color: var(--color-text-muted); font-size: var(--font-size-xs); }
.table-wrap { overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
```

### Cards e badges (`components.css`)

```css
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }
.badge { display: inline-flex; align-items: center; border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); letter-spacing: 0.05em; white-space: nowrap; }
.badge-blue   { color: var(--color-accent-blue);   background: #1a1f3a; border: 1px solid #2a3a6a; }
.badge-purple { color: var(--color-accent-purple); background: #201a2a; border: 1px solid #4a2a6a; }
.badge-green  { color: var(--color-accent-green);  background: #1a2e1f; border: 1px solid #2a4a2f; }
.badge-yellow { color: var(--color-accent-yellow); background: #2e2a1a; border: 1px solid #4a3a2a; }
.badge-red    { color: var(--color-accent-red);    background: #2a1a1f; border: 1px solid #5a2a30; }
.empty-state { color: var(--color-text-muted); font-size: var(--font-size-md); text-align: center; padding: var(--space-8); }
```

---

## 6. Plano de migração por fases

### Fase 1 — Tokens e base (sem quebrar nada)
> Estimativa: 1 sessão. Zero risco.

- [ ] Criar `src/styles/tokens.css`
- [ ] Criar `src/styles/base.css` (mover body/reset do index.css)
- [ ] Criar `src/styles/components.css` (tipografia, btns, cards, badges)
- [ ] Criar `src/styles/forms.css` (inputs, selects, labels, hints, errors)
- [ ] Criar `src/styles/layout.css` (page-container, hero, grid, dividers)
- [ ] Criar `src/styles/admin.css` (tabelas, painel admin)
- [ ] Atualizar `src/index.css` para importar todos os arquivos acima

### Fase 2 — Componentes compartilhados (maior impacto)
> Estimativa: 2-3 sessões. Foco nos componentes usados em todo o site.

- [ ] `TopNav.tsx` → CSS classes (nav, links, dropdown, mobile)
- [ ] `Footer.tsx` → CSS classes
- [ ] `MatchesByDay.tsx` → CSS classes
- [ ] `NewsCarousel.tsx` → CSS classes
- [ ] `PageLoader.tsx` → CSS class
- [ ] `App.tsx` — `LeagueTopBanner` e `PublicLayout` → CSS classes

### Fase 3 — Páginas públicas (visível ao usuário final)
> Estimativa: 2 sessões.

- [ ] `HomePage.tsx`
- [ ] `ChampionshipsPage.tsx` + `ChampionshipDetailPage.tsx`
- [ ] `ClubsPage.tsx` + `ClubDetailPage.tsx`
- [ ] `TeamDetailPage.tsx`
- [ ] `MatchDetailPage.tsx`
- [ ] `NewsPage.tsx` + `NewsDetailPage.tsx`
- [ ] `DocumentsPage.tsx` + `EmendasPage.tsx`
- [ ] `VenuesPage.tsx` + `VenueDetailPage.tsx`
- [ ] `RefereesPage.tsx` + `RefereeDetailPage.tsx`
- [ ] `AthleteDetailPage.tsx`
- [ ] `LiveMatchesPage.tsx`

### Fase 4 — Formulários de autenticação e perfil
- [ ] `LoginPage.tsx`
- [ ] `CadastroPage.tsx`
- [ ] `MyProfilePage.tsx`
- [ ] `SolicitarVinculoPage.tsx`
- [ ] `DirigentePage.tsx`

### Fase 5 — Painel Admin (maior volume, menor impacto público)
> Estimativa: 3-4 sessões. ~40 arquivos.

- [ ] Todos os `Admin*Page.tsx` — priorizar os com mais ocorrências:
  - `AdminChampionshipManagePage.tsx` (99)
  - `AdminTeamEditPage.tsx` (45)
  - `AdminClubBulkImportPage.tsx` (39)
  - `AdminTeamBulkRegistrationPage.tsx` (36)
  - `AdminRegistrationsPage.tsx` (35)
  - demais admin pages

---

## 7. Estratégia de migração por arquivo

Para cada arquivo a migrar:

1. **Identificar** quais propriedades do `S` object local são idênticas ao padrão global
2. **Substituir** `style={S.input}` → `className="form-input"` etc.
3. **Manter** no `S` object local apenas o que for **realmente único** daquela página
4. **Testar** visualmente antes de commitar

Exemplo antes/depois para um campo de formulário:

```tsx
// ANTES
<label style={S.label}>Nome</label>
<input style={S.input} />
<span style={S.hint}>Máx. 60 caracteres</span>

// DEPOIS
<label className="form-label">Nome</label>
<input className="form-input" />
<span className="hint-text">Máx. 60 caracteres</span>
```

---

## 8. Impacto esperado

| Antes | Depois |
|---|---|
| 5.146 ocorrências de CSS inline | ~500–800 (apenas estilos únicos) |
| 67 `S` objects com conteúdo duplicado | 67 `S` objects enxutos ou removidos |
| Mudar cor = `sed` em 100+ arquivos | Mudar cor = 1 linha em `tokens.css` |
| Sem escala tipográfica | 7 steps definidos |
| 8 valores de border-radius | 5 tokens |
| 0 classes reutilizáveis | ~50 classes utilitárias |
