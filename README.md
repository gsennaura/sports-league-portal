# Sports Manager — Frontend

Frontend do projeto Sports Manager, desenvolvido em **React + TypeScript** seguindo os princípios de Clean Architecture, Clean Code e SOLID.

---

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Suba o backend antes (na pasta sports_manager_api)
make run   # inicia na porta 8000

# 3. Suba o frontend
npm run dev   # abre em http://localhost:5173
```

> O Vite redireciona automaticamente `/api/*` → `http://localhost:8000/*`, então não há problemas de CORS em desenvolvimento.

---

## Contexto: por que aplicar arquitetura em um frontend?

Frontends costumam começar simples e crescer em complexidade rapidamente. Sem estrutura:

- Componentes React passam a conhecer detalhes da API (`fetch`, URLs, formato JSON)
- Regras de negócio ficam espalhadas por componentes
- Trocar a origem dos dados (ex: REST → GraphQL, mock → real) exige mexer em muitos arquivos
- Testar componentes vira um pesadelo pela quantidade de dependências acopladas

A arquitetura resolve esses problemas separando **o que cada parte do código sabe e faz**.

---

## Estrutura de pastas

```
src/
├── domain/              ← O núcleo. Zero dependências externas.
│   ├── entities/        ← O que existe no negócio (tipos/interfaces)
│   └── repositories/    ← Contratos de acesso a dados (interfaces)
│
├── application/         ← O que o sistema faz (casos de uso)
│   └── use_cases/
│
├── infrastructure/      ← Como os dados chegam de verdade (HTTP, localStorage, mock)
│   ├── repositories/    ← Implementações concretas dos contratos do domínio
│   └── composition.ts   ← Onde tudo é montado (composition root)
│
└── presentation/        ← O que o usuário vê
    ├── pages/           ← Telas completas
    ← components/        ← Peças reutilizáveis da UI
    └── hooks/           ← Ponte entre casos de uso e componentes React
```

---

## As camadas explicadas

### 1. `domain/` — O que o negócio conhece

É o coração da aplicação. Não depende de nada externo — nem de React, nem de `fetch`, nem de qualquer biblioteca.

**`entities/Championship.ts`**
```typescript
export interface Championship {
  id: string;
  name: string;
}
```
Um campeonato, na visão do negócio, é simplesmente um objeto com `id` e `name`. Não sabe se veio de uma API REST, de um banco de dados ou de um arquivo JSON.

**`repositories/ChampionshipRepository.ts`**
```typescript
export interface ChampionshipRepository {
  listAll(): Promise<Championship[]>;
}
```
Este é um **contrato** (interface). Ele diz: *"quem quiser ser um repositório de campeonatos precisa saber listar todos"*. Não diz **como** — isso é responsabilidade de outra camada.

> **Princípio SOLID aplicado:** *Dependency Inversion Principle (DIP)* — camadas de alto nível (domínio, casos de uso) dependem de abstrações, não de implementações concretas.

---

### 2. `application/` — O que o sistema faz

Aqui ficam os **casos de uso**: ações específicas que o usuário ou o sistema pode executar. Cada caso de uso resolve **uma única responsabilidade**.

**`use_cases/ListChampionships.ts`**
```typescript
export class ListChampionships {
  constructor(private readonly repository: ChampionshipRepository) {}

  async execute(): Promise<Championship[]> {
    return this.repository.listAll();
  }
}
```

O caso de uso recebe um repositório no construtor, mas **não sabe qual implementação será usada**. Poderia ser a API real, um mock para testes, ou um arquivo local — o caso de uso não liga.

> **Princípio SOLID aplicado:** *Single Responsibility Principle (SRP)* — essa classe tem uma única razão para mudar: a regra de "como listar campeonatos".

> **Clean Architecture:** casos de uso orquestram o fluxo, mas não conhecem detalhes de infraestrutura (HTTP, banco, etc.).

---

### 3. `infrastructure/` — Como os dados chegam de verdade

Aqui estão as implementações concretas. Esta é a única camada que pode importar bibliotecas externas, fazer `fetch`, usar `localStorage`, etc.

**`repositories/ApiChampionshipRepository.ts`**
```typescript
export class ApiChampionshipRepository implements ChampionshipRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(): Promise<Championship[]> {
    const response = await fetch(`${this.baseUrl}/championships`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar campeonatos: ${response.status}`);
    }
    return response.json() as Promise<Championship[]>;
  }
}
```

Implementa a interface `ChampionshipRepository`. O mundo externo (caso de uso, hook) só enxerga a interface — nunca sabe que existe um `fetch` aqui.

Se amanhã a API mudar para GraphQL, você cria `GraphQLChampionshipRepository` e substitui no `composition.ts` — sem tocar em nenhum outro arquivo.

**`composition.ts` — o Composition Root**
```typescript
const championshipRepository = new ApiChampionshipRepository("/api");
export const listChampionships = new ListChampionships(championshipRepository);
```

Este arquivo é o **único lugar** onde as dependências são conectadas. Ele cria o repositório concreto e injeta dentro do caso de uso. É aqui que você decide: *"usar API de verdade, ou usar mock?"*.

> Este padrão chama-se **Composition Root** — existe exatamente um ponto na aplicação que monta todas as dependências. Facilita imensamente a troca de implementações e os testes.

---

### 4. `presentation/` — O que o usuário vê

A camada de apresentação é responsável pela interface. Ela só conhece o domínio (entities) e os casos de uso — nunca importa de `infrastructure`.

#### Hooks

**`hooks/useChampionships.ts`**
```typescript
export function useChampionships(useCase: ListChampionships): UseChampionshipsResult {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useCase.execute()
      .then(setChampionships)
      .catch(...)
      .finally(() => setLoading(false));
  }, []);

  return { championships, loading, error };
}
```

O hook recebe o caso de uso **como parâmetro** — não importa nada de `infrastructure`. Isso é injeção de dependência manual: quem chama o hook decide qual implementação usar.

Responsabilidade do hook: gerenciar o estado de `loading` / `error` / `data` da chamada assíncrona, traduzindo o caso de uso em algo que o React entende (estado).

#### Pages

**`pages/HomePage.tsx`**

Recebe o caso de uso via prop, passa para o hook, repassa o resultado para os componentes. A página orquestra — não sabe de HTTP nem de estado assíncrono (isso é o hook).

```typescript
export function HomePage({ listChampionships }: HomePageProps) {
  const { championships, loading, error } = useChampionships(listChampionships);
  // ...
}
```

#### Components

**`components/ChampionshipList.tsx`** e **`components/ChampionshipCard.tsx`**

Componentes puramente visuais. Recebem dados via props e renderizam. Zero lógica de negócio, zero chamadas de API. Fáceis de reutilizar e de testar.

---

### Ponto de entrada — `App.tsx`

```typescript
import { listChampionships } from "./infrastructure/composition";

export function App() {
  return <HomePage listChampionships={listChampionships} />;
}
```

`App.tsx` é quem conecta tudo: importa do `composition.ts` e injeta nas páginas. É o único componente React que conhece a infraestrutura — e ainda assim, de forma indireta.

---

## Fluxo completo de uma requisição

```
App.tsx
  └─ importa `listChampionships` do composition root
  └─ passa como prop para <HomePage>
       └─ HomePage chama useChampionships(listChampionships)
            └─ hook chama useCase.execute()
                 └─ ListChampionships chama repository.listAll()
                      └─ ApiChampionshipRepository faz fetch("/api/championships")
                           └─ Vite proxy redireciona para http://localhost:8000/championships
                                └─ Backend retorna JSON
                      └─ retorna Championship[]
                 └─ retorna Championship[]
            └─ hook atualiza estado { championships, loading, error }
       └─ HomePage passa championships para <ChampionshipList>
            └─ ChampionshipList renderiza um <ChampionshipCard> por item
```

---

## Regra de dependência — o mais importante

As setas de dependência apontam **sempre para dentro**:

```
presentation  →  application  →  domain
infrastructure  →  domain
```

- `domain` não sabe que existe React, HTTP ou qualquer outra coisa
- `application` não sabe que existe `fetch` ou componentes visuais
- `presentation` não sabe que a API usa REST
- `infrastructure` implementa os contratos do domínio, mas não é conhecida por ninguém além do `composition.ts`

Violar essa regra (ex: um hook importando de `infrastructure` diretamente) cria acoplamento que dificulta testes, manutenção e troca de implementações.

---

## Path aliases (atalhos de import)

Configurados no `tsconfig.json` e `vite.config.ts`:

```typescript
// Em vez de:
import { Championship } from "../../domain/entities/Championship";

// Você escreve:
import type { Championship } from "@domain/entities/Championship";
```

| Alias | Pasta |
|---|---|
| `@domain/*` | `src/domain/*` |
| `@application/*` | `src/application/*` |
| `@infrastructure/*` | `src/infrastructure/*` |
| `@presentation/*` | `src/presentation/*` |

---

## Proxy do Vite

```typescript
// vite.config.ts
proxy: {
  "/api": {
    target: "http://localhost:8000",
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
},
```

Em desenvolvimento, `fetch("/api/championships")` é interceptado pelo Vite e reescrito para `http://localhost:8000/championships`. Isso evita problemas de CORS sem precisar configurar o backend para aceitar origens do frontend.
