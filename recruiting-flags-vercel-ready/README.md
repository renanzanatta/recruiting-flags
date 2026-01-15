# Recruiting Flags (Vercel) — pronto para teste

Este pacote contém:
- `index.html` (landing page)
- `api/search.js` (função serverless que consulta o Google Custom Search JSON API)

## 1) Pré-requisitos (Google)
Você precisa de 2 coisas:
1. **GOOGLE_API_KEY** (Custom Search JSON API)
2. **GOOGLE_CX** (ID do seu Programmable Search Engine / Custom Search Engine)

> Dica: No Programmable Search Engine, restrinja para pesquisar no LinkedIn (linkedin.com).
> Mesmo assim, este projeto já adiciona `site:linkedin.com/in` na query por padrão.

## 2) Rodar na Vercel (mais fácil)
1. Crie uma conta na Vercel (se precisar)
2. Crie um novo projeto e faça upload desta pasta (ou conecte via Git)
3. Em **Project Settings → Environment Variables**, adicione:
   - `GOOGLE_API_KEY`
   - `GOOGLE_CX`
4. Deploy

Abra a URL do seu projeto e teste a busca.

## 3) Como funciona o filtro por emojis afirmativos
A landing filtra os resultados **apenas com base no que o Google retorna** em `title` e `snippet`.
Isso significa que:
- pode funcionar para alguns perfis
- não cobre 100% (se o emoji não aparecer no snippet/título do Google)

Emojis considerados "afirmativos" no filtro:
🏳️‍🌈 🏳️‍⚧️ ⚧️ ✊ (todos os tons) 🖤 🤎

## Ajustes rápidos
- Quer buscar também /pub? Edite a linha da query em `api/search.js`.
- Quer mais resultados? Ajuste `num` (limite da API e do plano).

---
