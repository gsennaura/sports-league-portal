# Deploy: Frontend no Vercel

## Pré-requisitos

- Repositório do frontend no GitHub
- API do backend rodando no Railway (`https://sports-manager-api-production.up.railway.app`)
- Conta no [vercel.com](https://vercel.com) (login com GitHub)

---

## O que já está pronto no código

| Arquivo | O que faz |
|---|---|
| `src/infrastructure/composition.ts` | Lê `VITE_API_BASE_URL` do ambiente; fallback para `/api` (proxy local) |
| `.env.production` | Define `VITE_API_BASE_URL` para a URL da API no Railway |
| `.env.local` | Aponta para a API de produção durante `vite dev` local (não vai pro git) |

---

## Passo 1 — Fazer o commit das alterações

```bash
cd sports_manager_frontend/

git add src/infrastructure/composition.ts .env.production
git commit -m "feat: configure VITE_API_BASE_URL for production (Railway)"
git push
```

---

## Passo 2 — Criar o projeto no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project**
2. Selecione o repositório do frontend no GitHub
3. Se o projeto for monorepo (frontend e backend juntos), configure o **Root Directory** para `sports_manager_frontend/`
4. O Vercel detecta o Vite automaticamente — **não precisa alterar** os campos de build:
   - **Build Command:** `vite build` (ou `npm run build`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

---

## Passo 3 — Configurar a variável de ambiente no Vercel

Mesmo com `.env.production` commitado, é boa prática também configurar no dashboard do Vercel — facilita alterar a URL sem precisar de um commit:

1. Na tela de configuração do projeto (antes de fazer o deploy), clique em **Environment Variables**
2. Adicione:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://sports-manager-api-production.up.railway.app`
   - **Environments:** Production (e Preview se quiser)
3. Clique em **Add**

> A variável do Vercel tem prioridade sobre o `.env.production` do repositório.

---

## Passo 4 — Deploy

Clique em **Deploy**. O Vercel vai:
1. Clonar o repositório
2. Rodar `npm install`
3. Rodar `vite build` (carregando `.env.production` com a URL da API)
4. Servir o `dist/` na CDN global

Aguarde ~1 min. Você verá um preview da URL ao final.

---

## Passo 5 — Atualizar o CORS na API (Railway)

Após o deploy, o Vercel gera uma URL como:
```
https://sports-manager-frontend.vercel.app
```

Para evitar erros de CORS, adicione essa URL no Railway:

1. Railway → serviço **sports-manager-api** → aba **Variables**
2. Adicione: `FRONTEND_URL = https://sports-manager-frontend.vercel.app`
3. O Railway faz redeploy automático

---

## Passo 6 — Testar

Acesse a URL gerada pelo Vercel e verifique se os dados carregam (campeonatos, partidas, etc.).

---

## Deploys futuros

A cada `git push` na branch `main`, o Vercel faz rebuild e redeploy automaticamente.

---

## Resumo

| O que muda localmente | O que muda em produção |
|---|---|
| `.env.local` → aponta para Railway (não vai no git) | Vercel usa `VITE_API_BASE_URL` do dashboard ou do `.env.production` |
| `vite dev` → usa `.env.local` | `vite build` → usa variável do Vercel (ou `.env.production`) |
