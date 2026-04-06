# New Age Embalagens

Landing page comercial focada em conversao de pedidos de cotacao para empresas, com priorizacao de CRO, baixa friccao e captação de leads por formulario e WhatsApp.

## Estrategia completa do site

- objetivo principal: transformar visitas em pedidos de cotacao;
- foco comercial acima de institucional;
- CTA acima da dobra e repetido em toda a pagina;
- formulario rapido no hero para captar o lead antes da rolagem;
- formulario completo depois, para leads mais qualificados;
- botao flutuante de WhatsApp em todas as telas;
- microcopy para reduzir medo de enviar dados incompletos;
- prova de confianca logo no topo para acelerar decisao;
- estrutura mobile-first para captar demanda de celular;
- base pronta para anuncios no Google e campanhas segmentadas.

## Estrutura das secoes

1. Hero com headline forte, subtitulo, prova de confianca, CTA principal, CTA secundario e formulario rapido.
2. Faixa de confianca com velocidade, qualidade e foco B2B.
3. Bloco de diferenciais com linguagem comercial.
4. Produtos e solucoes com CTA individual por interesse.
5. Passo a passo comercial de compra.
6. CTA intermediario via WhatsApp.
7. Formulario completo de orcamento com opcao de pedir ajuda tecnica.
8. Prova social com logos, depoimentos e selos.
9. CTA final forte.

## Como o formulario funciona

O site funciona sem backend obrigatorio:

- valida campos essenciais;
- captura UTMs da URL;
- registra eventos em `localStorage`;
- prepara a mensagem do lead;
- abre um modal com CTA para WhatsApp ja preenchido.

Se quiser salvar o lead automaticamente, configure `formEndpoint` em [script.js](C:\Users\lucca\new-age-embalagens-site\script.js).

Sem `formEndpoint`, o site continua operando em qualquer hospedagem estática:

- valida os dados localmente;
- registra o lead no navegador;
- abre o handoff comercial por WhatsApp;
- não depende de Netlify Forms nem de backend obrigatório.

Destinos recomendados:

- webhook do Make;
- webhook do Zapier;
- endpoint proprio;
- Formspree ou servico equivalente.

## Configuracao inicial obrigatoria

Edite [script.js](C:\Users\lucca\new-age-embalagens-site\script.js):

```js
const SITE_CONFIG = {
  whatsappNumber: "551129378810",
  businessEmail: "vendas@newage.ind.br",
  formEndpoint: "",
  gaMeasurementId: "",
  metaPixelId: ""
};
```

Edite [index.html](C:\Users\lucca\new-age-embalagens-site\index.html):

- numero real de WhatsApp;
- email comercial;
- dominio final;
- cidade e estado para SEO local;
- schemas com dados reais;
- logos e depoimentos de clientes.

## SEO inicial entregue

- `title` comercial;
- `meta description`;
- `keywords`;
- canonical;
- Open Graph;
- Twitter Card;
- schema `Organization`;
- schema `Service`;
- [robots.txt](C:\Users\lucca\new-age-embalagens-site\robots.txt);
- [sitemap.xml](C:\Users\lucca\new-age-embalagens-site\sitemap.xml).

## Hospedagem recomendada fora do Netlify

O projeto está pronto para hospedagem estática simples, sem build obrigatório.

### Vercel

1. Subir a pasta para um repositório GitHub.
2. Criar um novo projeto na Vercel importando esse repositório.
3. Manter a raiz do projeto em `new-age-embalagens-site`.
4. Não configurar build command.
5. Publicar.

Arquivo já incluído:

- [vercel.json](C:\Users\lucca\new-age-embalagens-site\vercel.json)

### Cloudflare Pages

1. Criar conta.
2. Conectar repositório GitHub.
3. Escolher framework `None`.
4. Deixar `Build command` vazio.
5. Definir `Output directory` como `/`.
6. Publicar.

### GitHub Pages

1. Subir o projeto para um repositório.
2. Ativar GitHub Pages na branch principal.
3. Definir pasta raiz ou usar GitHub Actions para deploy estático.
4. Validar o domínio final e os caminhos relativos.

## Como conectar dominio proprio

1. Comprar o dominio em Registro.br ou outro registrador.
2. Adicionar o dominio na hospedagem escolhida.
3. Configurar os registros DNS pedidos pela plataforma.
4. Confirmar propagacao.
5. Validar certificado HTTPS.
6. Atualizar canonical, Open Graph e sitemap com o dominio final.

## Google Analytics e Meta Pixel

### Google Analytics 4

1. Criar propriedade GA4.
2. Inserir a tag global do GA4 no `head` da pagina.
3. Preencher `gaMeasurementId`.
4. Monitorar eventos `cta_click`, `lead_submit` e `lead_submit_fallback`.

### Meta Pixel

1. Criar Pixel no Gerenciador de Eventos.
2. Inserir o script base do Pixel no `head`.
3. Preencher `metaPixelId`.
4. Marcar clique em WhatsApp e envio de formulario como conversoes.

## Sugestoes praticas para aumentar ainda mais a conversao

- testar duas ou tres versoes da headline principal;
- exibir prazo medio de resposta comercial;
- incluir logos reais de clientes;
- adicionar prova numerica, como quantidade de empresas atendidas;
- criar landing pages especificas por segmento;
- registrar UTMs em planilha, CRM ou webhook;
- criar versao focada em Google Ads com menos distracoes;
- testar formulario ainda mais curto para trafego frio;
- inserir FAQ comercial com objecoes comuns;
- responder rapidamente no WhatsApp para aproveitar leads quentes.
